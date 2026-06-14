import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided, authorization denied" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    req.user = await User.findById(decoded.id).select("-password -verificationToken");
    
    if (req.user && req.user.isblocked) {
      return res.status(403).json({ message: "Your account is blocked by an admin. Please contact support" });
    }

    next();
  } catch (error) {
    return res.status(401).json({ message: "Token is not valid or expired" });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "You do not have permission to perform this action" });
    }
    next();
  };
};