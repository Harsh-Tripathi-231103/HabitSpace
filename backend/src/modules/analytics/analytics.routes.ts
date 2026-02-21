import { Router } from "express";
import { evaluateHabitChallenge, evaluateTrackerTask } from "../../domain/scoring.js";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/summary", async (req, res) => {
  const userId = req.userId!;

  const [habits, trackerTasks] = await Promise.all([
    prisma.habit.findMany({
      where: { userId },
      include: { checkIns: { orderBy: { checkDate: "asc" } } },
    }),
    prisma.trackerTask.findMany({
      where: { userId },
      include: { completions: true },
    }),
  ]);

  const habitStatuses = habits.map((habit) =>
    evaluateHabitChallenge({
      startDate: habit.startDate,
      checkIns: habit.checkIns.map((c) => c.checkDate),
    }),
  );
  const trackerStatuses = trackerTasks.map((task) =>
    evaluateTrackerTask({
      cadence: task.cadence,
      dueDate: task.dueDate,
      completions: task.completions.map((c) => c.completedAt),
    }),
  );

  const habitSummary = {
    win: habitStatuses.filter((s) => s.status === "WIN").length,
    lose: habitStatuses.filter((s) => s.status === "LOSE").length,
    inProgress: habitStatuses.filter((s) => s.status === "IN_PROGRESS").length,
    averageStreak:
      habitStatuses.length === 0
        ? 0
        : Number((habitStatuses.reduce((acc, s) => acc + s.streak, 0) / habitStatuses.length).toFixed(2)),
  };

  const trackerSummary = {
    win: trackerStatuses.filter((s) => s.status === "WIN").length,
    lose: trackerStatuses.filter((s) => s.status === "LOSE").length,
    inProgress: trackerStatuses.filter((s) => s.status === "IN_PROGRESS").length,
  };

  res.json({
    habits: habitSummary,
    tracker: trackerSummary,
    totals: {
      habits: habits.length,
      trackerTasks: trackerTasks.length,
    },
  });
});

export const analyticsRoutes = router;
