import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import sendEmail from "../utils/sendEmail.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";

/**-----------------------------------------------
 * @desc    Register New User
 * @route   /api/auth/register
 * @method  POST
 * @access  public
 ------------------------------------------------*/
export const register = async (req, res) => {
  try {
    const { name, email, password, phone, profilePic, address, role } = req.body;

    const isUserExists = await User.findOne({ email });
    if (isUserExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, salt);

    const verificationToken = crypto.randomBytes(32).toString("hex");

    await User.create({
      name,
      email,
      password: hashPassword,
      phone,
      profilePic,
      address,
      role,
      verificationToken,
      isVerified: false,
      isApproved: role === "seller" ? false : true,
    });

    const verificationUrl = `${process.env.BASE_URL}/verify-email?token=${verificationToken}`;

    await sendEmail({
      email,
      subject: "Verify Your Email - Real Estate Platform",
      html: `
        <h1>Welcome to Our Real Estate Platform!</h1>
        <p>Hi ${name},</p>
        <p>Please click the link below to verify your email address:</p>
        <a href="${verificationUrl}" style="padding: 10px 20px; background-color: #10b981; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email</a>
      `,
    });

    res.status(201).json({
      message: "Registration successful! Please check your email to verify your account.",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**-----------------------------------------------
 * @desc    Verify User Account
 * @route   /api/auth/verify-email
 * @method  GET
 * @access  public
 ------------------------------------------------*/
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ message: "Verification token is required" });
    }

    const user = await User.findOne({ verificationToken: token });
    if (!user) {
      return res.status(400).json({ message: "Invalid or expired verification token" });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.status(200).json({ message: "Email verified successfully! You can now log in." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**-----------------------------------------------
 * @desc    Login User
 * @route   /api/auth/login
 * @method  POST
 * @access  public
 ------------------------------------------------*/
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: "Please verify your email first" });
    }

    if (user.isblocked) {
      return res.status(403).json({
        message: "Your account is blocked by an admin. Please contact support",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    const UserRes = await User.findById(user._id).select("-password -verificationToken");

    res.status(200).json({
      message: "Login successful",
      token,
      user: UserRes,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**-----------------------------------------------
 * @desc    Get Current User
 * @route   /api/auth/me
 * @method  GET
 * @access  private
 ------------------------------------------------*/
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password -verificationToken");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**-----------------------------------------------
 * @desc    Forgot Password
 * @route   /api/auth/forgot-password
 * @method  POST
 * @access  public
 ------------------------------------------------*/
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "No user found with that email address", success: false });
    }

    const resetToken = crypto.randomBytes(20).toString("hex");
    const resetPasswordExpire = Date.now() + 15 * 60 * 1000;

    user.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    user.resetPasswordExpires = resetPasswordExpire;
    await user.save();

    const clientUrl = process.env.BASE_URL;
    const resetUrl = `${clientUrl}/reset-password/${resetToken}`;

    const htmlMessage = `
      <h2>Password Reset Request</h2>
      <p>You requested a password reset. Please click on the link below to reset your password:</p>
      <a href="${resetUrl}" target="_blank" style="padding: 10px 20px; background-color: #10b981; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
      <p>This link will expire in 15 minutes.</p>
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: "Password Reset - Real Estate Platform",
        html: htmlMessage,
      });

      res.status(200).json({ message: "Password reset email sent", success: true });
    } catch (error) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      return res.status(500).json({ message: "Could not send email", success: false });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**-----------------------------------------------
 * @desc    Reset Password
 * @route   /api/auth/reset-password/:token
 * @method  POST
 * @access  public
 ------------------------------------------------*/
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    const resetPasswordToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};