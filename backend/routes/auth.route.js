import express from "express";
import { 
  register, 
  verifyEmail, 
  login, 
  getMe, 
  forgotPassword, 
  resetPassword 
} from "../controllers/auth.controller.js"; 
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/register", register);
router.get("/verify-email", verifyEmail);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);


router.get("/me", verifyToken, getMe);

export default router;