/**
 * Mock email service for OTP delivery.
 * In a production environment, this should be swapped out with Resend, SendGrid, or AWS SES.
 */
export const emailService = {
  async sendOTP(email: string, code: string): Promise<boolean> {
    // Simulate network latency
    await new Promise((resolve) => setTimeout(resolve, 800));

    console.log("\n" + "=".repeat(60));
    console.log(`[MOCK EMAIL SERVICE] OTP Request`);
    console.log(`To: ${email}`);
    console.log(`Code: ${code}`);
    console.log("=".repeat(60) + "\n");

    return true; // Simulate success
  },
};
