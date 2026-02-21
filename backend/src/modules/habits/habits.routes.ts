import { Router } from "express";
import { z } from "zod";
import { evaluateHabitChallenge } from "../../domain/scoring.js";
import { requireAuth } from "../../middleware/auth.js";
import { prisma } from "../../lib/prisma.js";
import { startOfDay } from "../../utils/date.js";

const router = Router();
router.use(requireAuth);

const habitSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  startDate: z.coerce.date(),
});

const habitTaskSchema = z.object({
  title: z.string().min(1).max(140),
  description: z.string().max(500).optional(),
});

const habitTaskPatchSchema = z.object({
  title: z.string().min(1).max(140).optional(),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

router.get("/", async (req, res) => {
  const userId = req.userId!;
  const habits = await prisma.habit.findMany({
    where: { userId },
    include: { tasks: true, checkIns: { orderBy: { checkDate: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  const withStatus = habits.map((h) => {
    const evaluation = evaluateHabitChallenge({
      startDate: h.startDate,
      checkIns: h.checkIns.map((c) => c.checkDate),
    });
    return { ...h, evaluation };
  });
  res.json(withStatus);
});

router.post("/", async (req, res) => {
  const parsed = habitSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid input", issues: parsed.error.issues });
    return;
  }
  const userId = req.userId!;
  const habit = await prisma.habit.create({
    data: { userId, ...parsed.data },
  });
  res.status(201).json(habit);
});

router.patch("/:habitId", async (req, res) => {
  const parsed = habitSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid input", issues: parsed.error.issues });
    return;
  }
  const userId = req.userId!;
  const habit = await prisma.habit.findFirst({
    where: { id: req.params.habitId, userId },
  });
  if (!habit) {
    res.status(404).json({ message: "Habit not found" });
    return;
  }
  const updated = await prisma.habit.update({
    where: { id: habit.id },
    data: parsed.data,
  });
  res.json(updated);
});

router.delete("/:habitId", async (req, res) => {
  const userId = req.userId!;
  const habit = await prisma.habit.findFirst({
    where: { id: req.params.habitId, userId },
  });
  if (!habit) {
    res.status(404).json({ message: "Habit not found" });
    return;
  }
  await prisma.habit.delete({ where: { id: habit.id } });
  res.status(204).send();
});

router.post("/:habitId/tasks", async (req, res) => {
  const parsed = habitTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid input", issues: parsed.error.issues });
    return;
  }
  const userId = req.userId!;
  const habit = await prisma.habit.findFirst({
    where: { id: req.params.habitId, userId },
  });
  if (!habit) {
    res.status(404).json({ message: "Habit not found" });
    return;
  }
  const task = await prisma.habitTask.create({
    data: { habitId: habit.id, ...parsed.data },
  });
  res.status(201).json(task);
});

router.patch("/:habitId/tasks/:taskId", async (req, res) => {
  const parsed = habitTaskPatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid input", issues: parsed.error.issues });
    return;
  }
  const userId = req.userId!;
  const habit = await prisma.habit.findFirst({
    where: { id: req.params.habitId, userId },
  });
  if (!habit) {
    res.status(404).json({ message: "Habit not found" });
    return;
  }
  const task = await prisma.habitTask.findFirst({
    where: { id: req.params.taskId, habitId: habit.id },
  });
  if (!task) {
    res.status(404).json({ message: "Task not found" });
    return;
  }
  const updated = await prisma.habitTask.update({
    where: { id: task.id },
    data: parsed.data,
  });
  res.json(updated);
});

router.delete("/:habitId/tasks/:taskId", async (req, res) => {
  const userId = req.userId!;
  const habit = await prisma.habit.findFirst({
    where: { id: req.params.habitId, userId },
  });
  if (!habit) {
    res.status(404).json({ message: "Habit not found" });
    return;
  }
  const task = await prisma.habitTask.findFirst({
    where: { id: req.params.taskId, habitId: habit.id },
  });
  if (!task) {
    res.status(404).json({ message: "Task not found" });
    return;
  }
  await prisma.habitTask.delete({ where: { id: task.id } });
  res.status(204).send();
});

router.post("/:habitId/checkins", async (req, res) => {
  const body = z
    .object({ checkDate: z.coerce.date().optional() })
    .safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: "Invalid input", issues: body.error.issues });
    return;
  }
  const userId = req.userId!;
  const habit = await prisma.habit.findFirst({
    where: { id: req.params.habitId, userId },
  });
  if (!habit) {
    res.status(404).json({ message: "Habit not found" });
    return;
  }
  const checkDate = startOfDay(body.data.checkDate ?? new Date());
  const created = await prisma.habitCheckIn.upsert({
    where: { habitId_checkDate: { habitId: habit.id, checkDate } },
    create: { habitId: habit.id, checkDate },
    update: {},
  });
  res.status(201).json(created);
});

export const habitRoutes = router;
