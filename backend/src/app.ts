import cors from "cors";
import express from "express";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { habitRoutes } from "./modules/habits/habits.routes.js";
import { trackerRoutes } from "./modules/tracker/tracker.routes.js";
import { analyticsRoutes } from "./modules/analytics/analytics.routes.js";
import { suggestionsRoutes } from "./modules/suggestions/suggestions.routes.js";

export const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/habits", habitRoutes);
app.use("/api/tracker", trackerRoutes);
app.use("/api/dashboard", analyticsRoutes);
app.use("/api/suggestions", suggestionsRoutes);

app.use((_req, res) => {
  res.status(404).json({ message: "Not found" });
});
