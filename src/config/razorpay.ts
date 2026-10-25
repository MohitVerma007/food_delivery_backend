import Razorpay from "razorpay";
import { env } from "./env.js"; // Aapka environment variables config file

export const razorpayClient = new Razorpay({
  key_id: env.razorpayKey,
  key_secret: env.razorpaySecret,
});