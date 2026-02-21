import { Router } from "express";
import { evaluateHabitChallenge, evaluateTrackerTask } from "../../domain/scoring.js";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const userId = req.userId!;
  const [habits, trackerTasks] = await Promise.all([
    prisma.habit.findMany({ where: { userId }, include: { checkIns: true } }),
    prisma.trackerTask.findMany({ where: { userId }, include: { completions: true } }),
  ]);

  const suggestions = new Set<string>();

  for (const habit of habits) {
    const result = evaluateHabitChallenge({
      startDate: habit.startDate,
      checkIns: habit.checkIns.map((c) => c.checkDate),
    });
    if (result.status === "LOSE") {
      suggestions.add(`Habit "${habit.name}": break it into a smaller 2-minute version for the first week.`);
      suggestions.add(`Habit "${habit.name}": schedule the same time daily to protect streak consistency.`);
    }
    if (result.streak >= 3 && result.streak < 21) {
      suggestions.add(`Habit "${habit.name}": keep the current routine and avoid changing start time.`);
    }
  }

  for (const task of trackerTasks) {
    const result = evaluateTrackerTask({
      cadence: task.cadence,
      dueDate: task.dueDate,
      completions: task.completions.map((c) => c.completedAt),
    });
    if (result.status === "LOSE" && task.cadence === "MONTHLY") {
      suggestions.add(`Tracker "${task.title}": add a mid-month checkpoint to avoid end-month rush.`);
    }
    if (result.status === "LOSE" && task.cadence === "WEEKLY") {
      suggestions.add(`Tracker "${task.title}": split this into two smaller weekly subtasks.`);
    }
  }

  if (suggestions.size === 0) {
    suggestions.add("You are consistent. Increase one goal slightly to keep growth momentum.");
  }

  res.json({ suggestions: [...suggestions] });
});

export const suggestionsRoutes = router;
