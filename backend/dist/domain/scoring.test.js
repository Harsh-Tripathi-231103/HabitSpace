import { describe, expect, it } from "vitest";
import { evaluateHabitChallenge, evaluateTrackerTask } from "./scoring.js";
describe("evaluateHabitChallenge", () => {
    it("returns WIN for 21 consecutive check-ins", () => {
        const start = new Date("2026-01-01T00:00:00.000Z");
        const checkIns = Array.from({ length: 21 }, (_, i) => new Date(`2026-01-${String(i + 1).padStart(2, "0")}T00:00:00.000Z`));
        const result = evaluateHabitChallenge({ startDate: start, checkIns, now: new Date("2026-01-21T10:00:00.000Z") });
        expect(result.status).toBe("WIN");
        expect(result.streak).toBe(21);
    });
    it("returns LOSE after day 22 if streak not completed", () => {
        const start = new Date("2026-01-01T00:00:00.000Z");
        const checkIns = [new Date("2026-01-01T00:00:00.000Z"), new Date("2026-01-02T00:00:00.000Z")];
        const result = evaluateHabitChallenge({ startDate: start, checkIns, now: new Date("2026-01-22T10:00:00.000Z") });
        expect(result.status).toBe("LOSE");
    });
});
describe("evaluateTrackerTask", () => {
    it("returns WIN if daily completion is within day window", () => {
        const result = evaluateTrackerTask({
            cadence: "DAILY",
            dueDate: new Date("2026-02-08T00:00:00.000Z"),
            completions: [new Date("2026-02-08T10:00:00.000Z")],
            now: new Date("2026-02-08T11:00:00.000Z"),
        });
        expect(result.status).toBe("WIN");
    });
    it("returns LOSE when window has passed without completion", () => {
        const result = evaluateTrackerTask({
            cadence: "WEEKLY",
            dueDate: new Date("2026-02-02T00:00:00.000Z"),
            completions: [],
            now: new Date("2026-02-10T00:00:00.000Z"),
        });
        expect(result.status).toBe("LOSE");
    });
});
