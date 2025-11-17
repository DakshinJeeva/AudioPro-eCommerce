// backend/utils/generateVerificationToken.js
import crypto from "crypto";

export default function generateVerificationToken() {
  const verificationToken = crypto.randomBytes(32).toString("hex");
  return verificationToken;
}

