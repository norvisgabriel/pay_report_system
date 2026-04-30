import twilio from "twilio";

function getClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  return twilio(sid, token);
}

export async function sendSMS(to: string, body: string): Promise<void> {
  const client = getClient();
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!client || !from || !to) return;

  await client.messages.create({ body, from, to });
}

export async function sendPaymentApprovedSMS(phone: string, reference: string | undefined | null, receiptUrl: string) {
  const ref = reference ? ` (ref: ${reference})` : "";
  await sendSMS(
    phone,
    `✓ Tu pago${ref} ha sido aprobado. Ver recibo: ${receiptUrl}`
  );
}
