import axios from "axios";
import * as cheerio from "cheerio";
import { db } from "../db/client";

const RISKY_KEYWORDS = ["guns", "drugs", "weapons", "narcotics", "explosives"];

export async function analyzeWebsite(executionId: string, monitorId: string, url: string) {
  try {
    console.log(`\n[Worker] Starting analysis for ${url} (Exec: ${executionId})`);

    await db.query(`UPDATE executions SET status = 'running', started_at = NOW() WHERE id = $1`, [executionId]);

    // Fetch HTML
    const response = await axios.get(url, { 
        timeout: 10000,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });
    const html = response.data;
    const $ = cheerio.load(html);

    const findings: { risky_text: string[]; risky_images: string[] } = {
      risky_text: [],
      risky_images: []
    };

    // --- 1. ANALYZE TEXT ---
    const textContent = $('body').text().toLowerCase();
    RISKY_KEYWORDS.forEach(kw => {
      if (textContent.includes(kw)) findings.risky_text.push(kw);
    });

    // --- 2. ANALYZE IMAGES ---
    $('img').each((_, el) => {
      const alt = $(el).attr('alt')?.toLowerCase() || "";
      const src = $(el).attr('src')?.toLowerCase() || "";
      const title = $(el).attr('title')?.toLowerCase() || "";
      
      const combinedImageText = `${alt} ${src} ${title}`;
      
      RISKY_KEYWORDS.forEach(kw => {
        if (combinedImageText.includes(kw) && !findings.risky_images.includes(src)) {
           findings.risky_images.push(src); // Save the URL of the risky image
        }
      });
    });

    // --- 3. CALCULATE RISK & SAVE ---
    const totalRisks = findings.risky_text.length + findings.risky_images.length;
    let riskScore = Math.min(totalRisks * 20, 100); 

    if (totalRisks > 0) {
      console.log(`[Worker] ⚠️ ALERT: Found risks on ${url}!`, findings);
      
      await db.query(
        `INSERT INTO alerts (execution_id, monitor_id, severity, message, metadata) 
         VALUES ($1, $2, 'high', 'Risky content found', $3)`,
        [executionId, monitorId, JSON.stringify(findings)]
      );
    } else {
      console.log(`[Worker] ✅ ${url} looks safe.`);
    }

    await db.query(
      `UPDATE executions 
       SET status = 'completed', completed_at = NOW(), risk_score = $1, findings = $2 
       WHERE id = $3`,
      [riskScore, JSON.stringify(findings), executionId]
    );

  } catch (error: any) {
    console.error(`[Worker] ❌ Failed to analyze ${url}:`, error.message);
    await db.query(
      `UPDATE executions SET status = 'failed', completed_at = NOW(), error_message = $1 WHERE id = $2`,
      [error.message, executionId]
    );
  }
}