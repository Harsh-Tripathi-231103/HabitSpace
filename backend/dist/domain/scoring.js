import { addDays, endOfDay, endOfIsoWeek, endOfMonth, startOfDay, startOfIsoWeek, startOfMonth, toYmd } from "../utils/date.js";
export function evaluateHabitChallenge(input) {
    const now = input.now ?? new Date();
    const start = startOfDay(input.startDate);
    const set = new Set(input.checkIns.map((d) => toYmd(startOfDay(d))));
    let streak = 0;
    for (let i = 0; i < 21; i += 1) {
        const current = toYmd(addDays(start, i));
        if (set.has(current)) {
            streak += 1;
        }
        else {
            break;
        }
    }
    const msPerDay = 24 * 60 * 60 * 1000;
    const dayNumber = Math.floor((startOfDay(now).getTime() - start.getTime()) / msPerDay) + 1;
    if (streak >= 21) {
        return { streak, status: "WIN", dayNumber };
    }
    if (dayNumber >= 22) {
        return { streak, status: "LOSE", dayNumber };
    }
    return { streak, status: "IN_PROGRESS", dayNumber };
}
export function cadenceWindow(cadence, dueDate) {
    if (cadence === "DAILY") {
        return { windowStart: startOfDay(dueDate), windowEnd: endOfDay(dueDate) };
    }
    if (cadence === "WEEKLY") {
        return { windowStart: startOfIsoWeek(dueDate), windowEnd: endOfIsoWeek(dueDate) };
    }
    return { windowStart: startOfMonth(dueDate), windowEnd: endOfMonth(dueDate) };
}
export function evaluateTrackerTask(input) {
    const now = input.now ?? new Date();
    const { windowStart, windowEnd } = cadenceWindow(input.cadence, input.dueDate);
    const won = input.completions.some((d) => d >= windowStart && d <= windowEnd);
    if (won) {
        return { status: "WIN", windowStart, windowEnd };
    }
    if (now > windowEnd) {
        return { status: "LOSE", windowStart, windowEnd };
    }
    return { status: "IN_PROGRESS", windowStart, windowEnd };
}
