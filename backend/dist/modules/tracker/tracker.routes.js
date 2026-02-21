import { TrackerCadence } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { evaluateTrackerTask } from "../../domain/scoring.js";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/auth.js";
const router = Router();
router.use(requireAuth);
const createTaskSchema = z.object({
    title: z.string().min(1).max(140),
    description: z.string().max(500).optional(),
    cadence: z.nativeEnum(TrackerCadence),
    dueDate: z.coerce.date(),
});
router.get("/tasks", async (req, res) => {
    const userId = req.userId;
    const tasks = await prisma.trackerTask.findMany({
        where: { userId },
        include: { completions: true },
        orderBy: { createdAt: "desc" },
    });
    const payload = tasks.map((task) => {
        const evaluation = evaluateTrackerTask({
            cadence: task.cadence,
            dueDate: task.dueDate,
            completions: task.completions.map((c) => c.completedAt),
        });
        return { ...task, evaluation };
    });
    res.json(payload);
});
router.post("/tasks", async (req, res) => {
    const parsed = createTaskSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ message: "Invalid input", issues: parsed.error.issues });
        return;
    }
    const userId = req.userId;
    const task = await prisma.trackerTask.create({
        data: { userId, ...parsed.data },
    });
    res.status(201).json(task);
});
router.patch("/tasks/:taskId", async (req, res) => {
    const parsed = createTaskSchema.partial().safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ message: "Invalid input", issues: parsed.error.issues });
        return;
    }
    const userId = req.userId;
    const task = await prisma.trackerTask.findFirst({
        where: { id: req.params.taskId, userId },
    });
    if (!task) {
        res.status(404).json({ message: "Task not found" });
        return;
    }
    const updated = await prisma.trackerTask.update({
        where: { id: task.id },
        data: parsed.data,
    });
    res.json(updated);
});
router.delete("/tasks/:taskId", async (req, res) => {
    const userId = req.userId;
    const task = await prisma.trackerTask.findFirst({
        where: { id: req.params.taskId, userId },
    });
    if (!task) {
        res.status(404).json({ message: "Task not found" });
        return;
    }
    await prisma.trackerTask.delete({ where: { id: task.id } });
    res.status(204).send();
});
router.post("/tasks/:taskId/completions", async (req, res) => {
    const body = z.object({ completedAt: z.coerce.date().optional() }).safeParse(req.body);
    if (!body.success) {
        res.status(400).json({ message: "Invalid input", issues: body.error.issues });
        return;
    }
    const userId = req.userId;
    const task = await prisma.trackerTask.findFirst({
        where: { id: req.params.taskId, userId },
    });
    if (!task) {
        res.status(404).json({ message: "Task not found" });
        return;
    }
    const completion = await prisma.trackerCompletion.create({
        data: {
            trackerTaskId: task.id,
            userId,
            completedAt: body.data.completedAt ?? new Date(),
        },
    });
    res.status(201).json(completion);
});
export const trackerRoutes = router;
