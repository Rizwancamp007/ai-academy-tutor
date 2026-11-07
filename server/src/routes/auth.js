import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { comparePassword, hashPassword, publicUser, signToken } from "../services/auth.js";
import { normalizeEmail } from "../store/users.js";

const ROLES = ["teacher", "student"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function createAuthRouter(store) {
  const router = express.Router();

  router.post("/register", asyncHandler(async (req, res) => {
    const { name, email, password, role = "student" } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "Name is required" });
    }
    if (!email || !EMAIL_RE.test(String(email))) {
      return res.status(400).json({ message: "A valid email is required" });
    }
    if (!password || String(password).length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }
    if (!ROLES.includes(role)) {
      return res.status(400).json({ message: "Role must be teacher or student" });
    }
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: "Server auth is not configured" });
    }
    const existing = await store.findByEmail(email);
    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }
    const user = await store.create({
      name: String(name).trim(),
      email: normalizeEmail(email),
      passwordHash: await hashPassword(String(password)),
      role,
    });
    const token = signToken(user, process.env.JWT_SECRET, process.env.JWT_EXPIRES_IN || "7d");
    return res.status(201).json({ user: publicUser(user), token });
  }));

  router.post("/login", asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: "Server auth is not configured" });
    }
    const user = await store.findByEmail(email);
    if (!user || !(await comparePassword(String(password), user.passwordHash))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    const token = signToken(user, process.env.JWT_SECRET, process.env.JWT_EXPIRES_IN || "7d");
    return res.json({ user: publicUser(user), token });
  }));

  router.get("/me", requireAuth, asyncHandler(async (req, res) => {
    const user = await store.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "Account not found" });
    }
    return res.json({ user: publicUser(user) });
  }));

  return router;
}
