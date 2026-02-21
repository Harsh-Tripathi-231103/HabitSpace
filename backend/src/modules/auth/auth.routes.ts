import { Router } from "express";
import { randomUUID } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { z } from "zod";
import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { signToken } from "../../utils/jwt.js";
import { hashPassword, verifyPassword } from "../../utils/password.js";

const router = Router();
const googleClient = env.GOOGLE_CLIENT_ID ? new OAuth2Client(env.GOOGLE_CLIENT_ID) : null;

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const googleAuthSchema = z.object({
  token: z.string().min(1),
});

const updateCredentialsSchema = z
  .object({
    email: z.string().email().optional(),
    newPassword: z.string().min(8).optional(),
    currentPassword: z.string().min(8),
  })
  .refine((data) => Boolean(data.email || data.newPassword), {
    message: "Provide at least one field to update",
    path: ["email"],
  });

router.post("/signup", async (req, res) => {
  const parsed = authSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid input", issues: parsed.error.issues });
    return;
  }

  const { email, password } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ message: "Email already exists" });
    return;
  }

  const user = await prisma.user.create({
    data: { email, passwordHash: await hashPassword(password) },
  });
  const token = signToken({ userId: user.id });
  res.status(201).json({ token, user: { id: user.id, email: user.email } });
});

router.post("/login", async (req, res) => {
  const parsed = authSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid input", issues: parsed.error.issues });
    return;
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(401).json({ message: "Invalid credentials" });
    return;
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    res.status(401).json({ message: "Invalid credentials" });
    return;
  }

  const token = signToken({ userId: user.id });
  res.json({ token, user: { id: user.id, email: user.email } });
});

router.post("/google", async (req, res) => {
  if (!googleClient || !env.GOOGLE_CLIENT_ID) {
    res.status(500).json({ message: "Google auth is not configured" });
    return;
  }

  const parsed = googleAuthSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid input", issues: parsed.error.issues });
    return;
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: parsed.data.token,
      audience: env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const email = payload?.email?.toLowerCase();
    if (!payload || !email || !payload.email_verified) {
      res.status(401).json({ message: "Invalid Google account" });
      return;
    }

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          passwordHash: await hashPassword(randomUUID()),
        },
      });
    }

    const token = signToken({ userId: user.id });
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch {
    res.status(401).json({ message: "Google authentication failed" });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });
  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }
  res.json({ user });
});

router.patch("/me", requireAuth, async (req, res) => {
  const parsed = updateCredentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid input", issues: parsed.error.issues });
    return;
  }

  const userId = req.userId!;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  const passwordOk = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!passwordOk) {
    res.status(401).json({ message: "Current password is incorrect" });
    return;
  }

  const nextEmail = parsed.data.email?.trim().toLowerCase();
  if (nextEmail && nextEmail !== user.email) {
    const existing = await prisma.user.findUnique({ where: { email: nextEmail } });
    if (existing) {
      res.status(409).json({ message: "Email already exists" });
      return;
    }
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(nextEmail ? { email: nextEmail } : {}),
      ...(parsed.data.newPassword ? { passwordHash: await hashPassword(parsed.data.newPassword) } : {}),
    },
    select: { id: true, email: true },
  });

  res.json({ user: updated });
});

export const authRoutes = router;
