import axios from "axios";
import * as cheerio from "cheerio";
import { db } from "../db/client";
import { sendRiskAlert } from "../services/notification"; 

const RISK_MAP: Record<string, number> = {
  "guns": 40,
  "weapons": 40,
  "explosives": 50,
  "drugs": 30,
  "narcotics": 40,
  "cannabis": 10, 
  "buy": 15,      
  "telegram": 20  
};

const RISK_THRESHOLD = 60; 

export async function analyzeWebsite(executionId: string, monitorId: string, url: string) {
  try {
    console.log(`\n[Worker] Starting analysis for ${url} (Exec: ${executionId})`);

    await db.query(`UPDATE executions SET status = 'running', started_at = NOW() WHERE id = $1`, [executionId]);

    const response = await axios.get(url, { 
        timeout: 10000,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });
    const $ = cheerio.load(response.data);

    const findings: { risky_text: string[]; risky_images: string[] } = {
      risky_text: [],
      risky_images: []
    };

    let totalScore = 0;

    const bodyText = $('body').text().toLowerCase();
    
    Object.entries(RISK_MAP).forEach(([kw, weight]) => {
      const fuzzyPattern = new RegExp(kw.split('').join('[\\s\\._\\-]*'), 'gi');
      
      if (fuzzyPattern.test(bodyText)) {
        findings.risky_text.push(kw);
        totalScore += weight;
      }
    });

    $('img').each((_, el) => {
      const alt = $(el).attr('alt')?.toLowerCase() || "";
      const src = $(el).attr('src')?.toLowerCase() || "";
      const title = $(el).attr('title')?.toLowerCase() || "";
      const combinedImageText = `${alt} ${src} ${title}`;
      
      Object.entries(RISK_MAP).forEach(([kw, weight]) => {
        if (combinedImageText.includes(kw) && !findings.risky_images.includes(src)) {
           findings.risky_images.push(src);
           totalScore += (weight * 0.5); 
        }
      });
    });

    const finalRiskScore = Math.min(totalScore, 100);

    if (finalRiskScore >= RISK_THRESHOLD) {
        console.log(`[Worker] ⚠️ ALERT: High risk detected (${finalRiskScore}pts) on ${url}`);

        await db.query(
          `INSERT INTO alerts (execution_id, monitor_id, severity, message, metadata) 
           VALUES ($1, $2, 'high', 'Automated risk score exceeded threshold', $3)`,
          [executionId, monitorId, JSON.stringify({ ...findings, score: finalRiskScore })]
        );

        const monitorRes = await db.query(`SELECT customer_email FROM monitors WHERE id = $1`, [monitorId]);
        const email = monitorRes.rows[0].customer_email;

        if (email) await sendRiskAlert(email, url, findings.risky_text.length);
    } else {
      console.log(`[Worker] ✅ ${url} passed (Score: ${finalRiskScore}).`);
    }

    await db.query(
      `UPDATE executions 
       SET status = 'completed', completed_at = NOW(), risk_score = $1, findings = $2 
       WHERE id = $3`,
      [finalRiskScore, JSON.stringify(findings), executionId]
    );

  } catch (error: any) {
    console.error(`[Worker] Failed to analyze ${url}:`, error.message);
    
    await db.query(
      `UPDATE executions 
       SET status = 'failed', completed_at = NOW(), error_message = $1 
       WHERE id = $2`,
      [error.message, executionId]
    );
  }
}