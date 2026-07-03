export async function sendWhatsAppMessage(to: string, message: string, mediaUrl?: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromPhone = process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886"; // Default Twilio sandbox number
  
  const formattedTo = to.startsWith("whatsapp:") ? to : `whatsapp:+91${to.replace(/\D/g, "")}`;

  console.log(`\n[WhatsApp] 🚀 Sending message to ${formattedTo}...`);
  console.log(`[WhatsApp] Content: ${message}`);
  if (mediaUrl) console.log(`[WhatsApp] Media: ${mediaUrl}`);

  // If credentials are not set, run in simulation mode
  if (!accountSid || !authToken) {
    console.log(`[WhatsApp] ⚠️ Twilio credentials missing. Running in SIMULATION MODE.`);
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    console.log(`[WhatsApp] ✅ SIMULATED: Message successfully delivered to ${formattedTo}\n`);
    return { success: true, simulated: true };
  }

  // Real Twilio Integration
  try {
    const params = new URLSearchParams();
    params.append("To", formattedTo);
    params.append("From", fromPhone);
    params.append("Body", message);
    if (mediaUrl) {
      params.append("MediaUrl", mediaUrl);
    }

    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        "Authorization": "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("[WhatsApp] ❌ Twilio Error:", data.message || data);
      return { success: false, error: data.message };
    }

    console.log(`[WhatsApp] ✅ DELIVERED: Message sent successfully! SID: ${data.sid}\n`);
    return { success: true, sid: data.sid };
  } catch (error) {
    console.error("[WhatsApp] ❌ Network/Unknown Error:", error);
    return { success: false, error: String(error) };
  }
}
