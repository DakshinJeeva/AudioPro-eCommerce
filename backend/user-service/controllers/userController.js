// backend/controllers/userController.js
import asyncHandler from "express-async-handler";
import User from "../models/userModel.js";
import generateToken from "../../utils-service/generateToken.js";
import generateVerificationToken from "../../utils-service/generateVerificationToken.js";
import { sendVerificationEmail } from "../../utils-service/sendEmail.js";
import crypto from "crypto";
import twilio from "twilio";

// Register
export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Please provide name, email, and password");
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    // If user exists but email is not verified, resend verification email
    if (!userExists.isEmailVerified) {
      const verificationToken = generateVerificationToken();
      const hashedToken = crypto
        .createHash("sha256")
        .update(verificationToken)
        .digest("hex");

      userExists.emailVerificationToken = hashedToken;
      userExists.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
      await userExists.save({ validateBeforeSave: false });

      try {
        await sendVerificationEmail(userExists.email, verificationToken);
        return res.status(200).json({
          message: "A verification mail is sent. Please verify your email.",
          email: userExists.email,
          verificationToken:
            process.env.NODE_ENV === "development" ? verificationToken : undefined,
        });
      } catch (emailError) {
        console.error("Error sending verification email:", emailError);
        res.status(500);
        throw new Error(
          "User exists but we couldn't resend the verification email. Please try again later."
        );
      }
    }

    // If email is already verified, block registration
    res.status(400);
    throw new Error("User already exists");
  }

  // Generate email verification token
  const verificationToken = generateVerificationToken();
  const hashedToken = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");

  const user = await User.create({
    name,
    email,
    password,
    emailVerificationToken: hashedToken,
    emailVerificationExpire: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    isEmailVerified: false,
  });

  if (user) {
    try {
      // Send verification email
      await sendVerificationEmail(user.email, verificationToken);

      res.status(201).json({
        message: "Registration successful! Please check your email to verify your account.",
        _id: user._id,
        name: user.name,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
        // In development, return token for testing (remove in production)
        verificationToken: process.env.NODE_ENV === "development" ? verificationToken : undefined,
      });
    } catch (emailError) {
      console.error("Error sending verification email:", emailError);
      // Still create user but log error
      // In production, you might want to handle this differently
      res.status(201).json({
        message: "Registration successful! However, we couldn't send the verification email. Please contact support.",
        _id: user._id,
        name: user.name,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
        verificationToken: process.env.NODE_ENV === "development" ? verificationToken : undefined,
      });
    }
  } else {
    res.status(400);
    throw new Error("Invalid user data");
  }
});


export const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user by email
  const user = await User.findOne({ email });

  // Check if user exists and password is correct
  if (user && (await user.matchPassword(password))) {
    // If email is NOT verified, resend verification and stop
    if (!user.isEmailVerified) {
      const verificationToken = generateVerificationToken();
      const hashedToken = crypto
        .createHash("sha256")
        .update(verificationToken)
        .digest("hex");

      user.emailVerificationToken = hashedToken;
      user.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000;
      await user.save({ validateBeforeSave: false });

      try {
        await sendVerificationEmail(user.email, verificationToken);
        return res.status(403).json({
          message: "Your email is not verified. A new verification link has been sent to your inbox.",
          email: user.email,
          verificationToken: process.env.NODE_ENV === "development" ? verificationToken : undefined,
        });
      } catch (emailError) {
        console.error("Error sending verification email:", emailError);
        res.status(500);
        throw new Error("Your email is not verified, and we couldn’t resend the verification email. Please try again later.");
      }
    }

    // Email verified → issue token and normalized user
    const token = generateToken(user._id);
    return res.status(200).json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
        isAdmin: user.isAdmin,
        phoneNumber: user.phoneNumber,
        isPhoneVerified: user.isPhoneVerified,
      },
    });

  } else {
    // ❌ Invalid credentials
    res.status(401);
    throw new Error("Invalid email or password");
  }
});

// Profile
export const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");
  if (user) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      isEmailVerified: user.isEmailVerified,
      phoneNumber: user.phoneNumber,
      isPhoneVerified: user.isPhoneVerified,
      addresses: user.addresses,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } else {
    res.status(404).json({ message: "User not found" });
  }
});

// Verify Email
export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;

  if (!token) {
    res.status(400);
    throw new Error("Verification token is required");
  }

  // Hash the token to compare with stored hash
  const hashedToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  // Find user with matching token and check if token hasn't expired
  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpire: { $gt: Date.now() },
  });

  if (!user) {
    res.status(400);
    throw new Error("Invalid or expired verification token");
  }

  // Verify email
  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpire = undefined;

  await user.save();

  // Generate JWT token for automatic login
  const jwtToken = generateToken(user._id);

  res.json({
    message: "Email verified successfully!",
    token: jwtToken,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
    },
  });
});

// Resend Verification Email
export const resendVerificationEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400);
    throw new Error("Email is required");
  }

  const user = await User.findOne({ email });

  if (!user) {
    // Don't reveal if user exists for security
    res.json({
      message: "If an account with that email exists and is not verified, a verification email has been sent.",
    });
    return;
  }

  if (user.isEmailVerified) {
    res.status(400);
    throw new Error("Email is already verified");
  }

  // Generate new verification token
  const verificationToken = generateVerificationToken();
  const hashedToken = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");

  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

  await user.save({ validateBeforeSave: false });

  try {
    await sendVerificationEmail(user.email, verificationToken);
    res.json({
      message: "Verification email sent successfully!",
      verificationToken: process.env.NODE_ENV === "development" ? verificationToken : undefined,
    });
  } catch (emailError) {
    console.error("Error sending verification email:", emailError);
    res.status(500);
    throw new Error("Failed to send verification email. Please try again later.");
  }
});

// Start phone verification (send OTP)
export const startPhoneVerification = asyncHandler(async (req, res) => {
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    res.status(400);
    throw new Error("Phone number is required");
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // If phone is already verified, do not allow changing it
  if (user.isPhoneVerified && user.phoneNumber) {
    res.status(400);
    throw new Error("Phone number is already verified and cannot be changed");
  }

  // Normalize to +91 prefix always
  let normalizedPhone = String(phoneNumber).trim();
  // remove spaces
  normalizedPhone = normalizedPhone.replace(/\s+/g, "");
  // strip leading + and zeros for safety before adding +91
  normalizedPhone = normalizedPhone.replace(/^\+/, "");
  normalizedPhone = normalizedPhone.replace(/^0+/, "");
  normalizedPhone = "+91" + normalizedPhone;

  const code = Math.floor(100000 + Math.random() * 900000).toString();

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    res.status(500);
    throw new Error("Twilio is not configured on the server");
  }

  const client = twilio(accountSid, authToken);

  await client.messages.create({
    body: `Your verification code is ${code}`,
    from: fromNumber,
    to: normalizedPhone,
  });

  user.phoneNumber = normalizedPhone;
  user.isPhoneVerified = false;
  user.phoneVerificationCode = code;
  user.phoneVerificationExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
  await user.save();

  res.json({ message: "Verification code sent" });
});

// Verify phone with OTP
export const verifyPhone = asyncHandler(async (req, res) => {
  const { code } = req.body;

  if (!code) {
    res.status(400);
    throw new Error("Verification code is required");
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (
    !user.phoneVerificationCode ||
    !user.phoneVerificationExpire ||
    user.phoneVerificationExpire < Date.now() ||
    user.phoneVerificationCode !== code
  ) {
    res.status(400);
    throw new Error("Invalid or expired verification code");
  }

  user.isPhoneVerified = true;
  user.phoneVerificationCode = undefined;
  user.phoneVerificationExpire = undefined;
  await user.save();

  res.json({
    message: "Phone number verified successfully",
    phoneNumber: user.phoneNumber,
    isPhoneVerified: user.isPhoneVerified,
  });
});

// Add a new address to the user's addresses array
export const addAddress = asyncHandler(async (req, res) => {
  const { street, city, state, zipCode, country } = req.body;

  if (!street || !city || !state || !zipCode || !country) {
    res.status(400);
    throw new Error("All address fields are required");
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  user.addresses.push({ street, city, state, zipCode, country });
  await user.save();

  res.json({ addresses: user.addresses });
});

// Remove an address from the user's addresses array by its _id
export const removeAddress = asyncHandler(async (req, res) => {
  const { addressId } = req.params;

  const user = await User.findById(req.user.id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const beforeCount = user.addresses.length;
  user.addresses = user.addresses.filter((addr) => {
    // Some addresses may not have _id if they were created differently
    if (!addr._id) return true;
    return addr._id.toString() !== addressId;
  });

  if (user.addresses.length === beforeCount) {
    res.status(404);
    throw new Error("Address not found");
  }

  await user.save();

  res.json({ addresses: user.addresses });
});
