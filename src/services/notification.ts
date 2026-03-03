export async function sendRiskAlert(email: string, url: string, riskCount: number) {
    console.log(`\n📧 [NOTIFICATION SENT] To: ${email}`);
    console.log(` > Subject: Action Required: Risk Found on ${url}`);
    console.log(` > Message: We found ${riskCount} risky items on your site. Please check your dashboard.\n`);
  }