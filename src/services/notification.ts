// src/services/notification.ts
export async function sendRiskAlert(
  email: string, 
  url: string, 
  textCount: number, 
  imageCount: number
) {
  const totalCount = textCount + imageCount;
  
  // Pluralization helpers
  const totalLabel = totalCount === 1 ? "risk" : "risks";
  const keywordLabel = textCount === 1 ? "keyword" : "keywords";
  const imageLabel = imageCount === 1 ? "image" : "images";

  console.log(`\n📧 [NOTIFICATION SENT] To: ${email}`);
  console.log(` > Subject: Action Required: Risk Found on ${url}`);
  console.log(` > Message: Our system identified ${totalCount} potential ${totalLabel} on your site ` +
              `(${textCount} ${keywordLabel} and ${imageCount} ${imageLabel}). Please check your dashboard.\n`);
}