import Razorpay from "razorpay";
import crypto from "crypto";

const keyId = process.env.RAZORPAY_KEY_ID || "";
const keySecret = process.env.RAZORPAY_KEY_SECRET || "";

export const razorpay = new Razorpay({
  key_id: keyId,
  key_secret: keySecret,
});

export function createRazorpayOrder(amountInPaise: number, receipt: string) {
  return razorpay.orders.create({
    amount: amountInPaise,
    currency: "INR",
    receipt,
    notes: { platform: "micro-hub" },
  });
}

export function verifySignature({
  orderId,
  paymentId,
  signature,
}: {
  orderId: string;
  paymentId: string;
  signature: string;
}) {
  const body = `${orderId}|${paymentId}`;
  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(body)
    .digest("hex");
  return expected === signature;
}

export const isSandboxConfigured =
  Boolean(keyId) && Boolean(keySecret) && !keyId.includes("your_test");
