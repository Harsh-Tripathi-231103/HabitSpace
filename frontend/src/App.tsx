import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, SVGProps } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import habitLogo from "./assets/habit-cropped.png";
import "./App.css";

type HabitTaskItem = {
  id: string;
  title: string;
  description?: string;
  isActive: boolean;
};

type Habit = {
  id: string;
  name: string;
  startDate: string;
  tasks?: HabitTaskItem[];
  evaluation?: { streak: number; status: "WIN" | "LOSE" | "IN_PROGRESS"; dayNumber?: number };
};

type TrackerTask = {
  id: string;
  title: string;
  cadence: "DAILY" | "WEEKLY" | "MONTHLY";
  dueDate: string;
  createdAt?: string;
  evaluation?: { status: "WIN" | "LOSE" | "IN_PROGRESS" };
};

type Dashboard = {
  habits: { win: number; lose: number; inProgress: number; averageStreak: number };
  tracker: { win: number; lose: number; inProgress: number };
  totals: { habits: number; trackerTasks: number };
};

type View = "habits" | "tracker" | "dashboard" | "suggestions";

const API_BASE = "http://localhost:4000/api";
const TOKEN_STORAGE_KEY = "habitspace_token";
const EMAIL_STORAGE_KEY = "habitspace_email";
const PAGE_SIZE = 10;
const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const MONTH_LABELS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] as const;

function toLocalDateKey(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function IconChart(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="M4 19V5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M4 19H20" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M8 16V11" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M12 16V8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M16 16V6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function IconHabit(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="M8.5 5.5L12 3L15.5 5.5V10L12 12.5L8.5 10V5.5Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M5 13H19V20H5V13Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M9 16H15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function IconTask(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <rect x="5" y="4" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M9 9H15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M9 13H13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M9.2 17L10.6 18.3L13.2 15.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconSpark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="M12 3L13.8 8.2L19 10L13.8 11.8L12 17L10.2 11.8L5 10L10.2 8.2L12 3Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M18.5 4.5L19.2 6.1L20.8 6.8L19.2 7.5L18.5 9.1L17.8 7.5L16.2 6.8L17.8 6.1L18.5 4.5Z" fill="currentColor" />
    </svg>
  );
}

function IconFilter(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="M4 6H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M7 12H17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M10 18H14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconGoogle(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="M21.8 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.5c-.2 1.2-.9 2.2-1.9 2.9v2.4h3.1c1.8-1.7 3.1-4.1 3.1-7.1Z" fill="#4285F4" />
      <path d="M12 22c2.7 0 5-.9 6.7-2.6l-3.1-2.4c-.9.6-2 .9-3.6.9-2.7 0-4.9-1.8-5.7-4.3H3.1V16c1.7 3.5 5.1 6 8.9 6Z" fill="#34A853" />
      <path d="M6.3 13.6c-.2-.6-.3-1.1-.3-1.7s.1-1.2.3-1.7V7.9H3.1c-.7 1.3-1.1 2.7-1.1 4.1s.4 2.9 1.1 4.1l3.2-2.5Z" fill="#FBBC05" />
      <path d="M12 6.1c1.5 0 2.9.5 3.9 1.5l2.9-2.9C17 2.9 14.8 2 12 2 8.2 2 4.8 4.2 3.1 7.9l3.2 2.5c.8-2.5 3-4.3 5.7-4.3Z" fill="#EA4335" />
    </svg>
  );
}

function IconEmptyBox(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" {...props}>
      <rect x="12" y="18" width="40" height="30" rx="6" stroke="currentColor" strokeWidth="2.2" />
      <path d="M20 26H44" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M20 33H38" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="48" cy="14" r="5" fill="currentColor" opacity="0.25" />
    </svg>
  );
}

function IconPencil(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="M4 20H8L18.5 9.5C19.3 8.7 19.3 7.3 18.5 6.5L17.5 5.5C16.7 4.7 15.3 4.7 14.5 5.5L4 16V20Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M13.5 6.5L17.5 10.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconTrash(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="M5 7H19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9 7V5.5C9 4.7 9.7 4 10.5 4H13.5C14.3 4 15 4.7 15 5.5V7" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 7L8.7 18.2C8.8 19.2 9.6 20 10.6 20H13.4C14.4 20 15.2 19.2 15.3 18.2L16 7" stroke="currentColor" strokeWidth="1.8" />
      <path d="M10 10.5V16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M14 10.5V16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

type TaskFilterMode = "default" | "weekly" | "monthly" | "pending" | "custom";
type TrackerCalendarMode = "day" | "week" | "month";

function App() {
  const [token, setToken] = useState<string>(() => {
    try {
      return window.localStorage.getItem(TOKEN_STORAGE_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [currentUserEmail, setCurrentUserEmail] = useState(() => {
    try {
      return window.localStorage.getItem(EMAIL_STORAGE_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const [authError, setAuthError] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileEmail, setProfileEmail] = useState("");
  const [profileCurrentPassword, setProfileCurrentPassword] = useState("");
  const [profileNewPassword, setProfileNewPassword] = useState("");
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [isCreateHabitModalOpen, setIsCreateHabitModalOpen] = useState(false);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [view, setView] = useState<View>("dashboard");
  const [habits, setHabits] = useState<Habit[]>([]);
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  const [tracker, setTracker] = useState<TrackerTask[]>([]);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [habitName, setHabitName] = useState("");
  const [habitStartDate, setHabitStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [habitTaskDraft, setHabitTaskDraft] = useState("");
  const [habitTaskList, setHabitTaskList] = useState<string[]>([]);
  const [trackerCadence, setTrackerCadence] = useState<"DAILY" | "WEEKLY" | "MONTHLY">("DAILY");
  const [trackerDueDate, setTrackerDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [trackerTaskDraft, setTrackerTaskDraft] = useState("");
  const [trackerTaskList, setTrackerTaskList] = useState<string[]>([]);
  const [habitsPage, setHabitsPage] = useState(1);
  const [trackerPage, setTrackerPage] = useState(1);
  const [isTaskFilterOpen, setIsTaskFilterOpen] = useState(false);
  const [taskFilterMode, setTaskFilterMode] = useState<TaskFilterMode>("default");
  const [customRangeStart, setCustomRangeStart] = useState("");
  const [customRangeEnd, setCustomRangeEnd] = useState("");
  const [isTrackerFilterOpen, setIsTrackerFilterOpen] = useState(false);
  const [trackerCalendarMode, setTrackerCalendarMode] = useState<TrackerCalendarMode>("month");
  const [trackerCalendarMonth, setTrackerCalendarMonth] = useState(() => new Date().getMonth());
  const [trackerCalendarYear, setTrackerCalendarYear] = useState(() => new Date().getFullYear());
  const pageTitle = useMemo(() => {
    if (view === "dashboard") return "Dashboard";
    if (view === "habits") return "Habits Build";
    if (view === "tracker") return "Task Tracker";
    return "Suggestions";
  }, [view]);

  const userInitials = useMemo(() => {
    if (!currentUserEmail) return "HS";
    const parts = currentUserEmail.split("@")[0].split(/[._-]+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return currentUserEmail.slice(0, 2).toUpperCase();
  }, [currentUserEmail]);

  const outcomeComparisonData = useMemo(() => {
    if (!dashboard) return [];
    return [
      { state: "Win", habits: dashboard.habits.win, tracker: dashboard.tracker.win },
      { state: "Loss", habits: dashboard.habits.lose, tracker: dashboard.tracker.lose },
      { state: "In Progress", habits: dashboard.habits.inProgress, tracker: dashboard.tracker.inProgress },
    ];
  }, [dashboard]);

  const habitMixData = useMemo(() => {
    if (!dashboard) return [];
    return [
      { name: "Win", value: dashboard.habits.win, color: "#38bdf8" },
      { name: "Loss", value: dashboard.habits.lose, color: "#f97316" },
      { name: "In Progress", value: dashboard.habits.inProgress, color: "#10b981" },
    ];
  }, [dashboard]);

  const trackerMixData = useMemo(() => {
    if (!dashboard) return [];
    return [
      { name: "Completed", value: dashboard.tracker.win, color: "#3b82f6" },
      { name: "Missed", value: dashboard.tracker.lose, color: "#ef4444" },
      { name: "Pending", value: dashboard.tracker.inProgress, color: "#14b8a6" },
    ];
  }, [dashboard]);

  const dashboardInsights = useMemo(() => {
    if (!dashboard) return [];
    const habitWinRate =
      dashboard.habits.win + dashboard.habits.lose === 0
        ? 0
        : Math.round((dashboard.habits.win / (dashboard.habits.win + dashboard.habits.lose)) * 100);
    const trackerRate =
      dashboard.tracker.win + dashboard.tracker.lose === 0
        ? 0
        : Math.round((dashboard.tracker.win / (dashboard.tracker.win + dashboard.tracker.lose)) * 100);
    return [
      `Habit execution is at ${habitWinRate}% with ${dashboard.habits.inProgress} habits still in progress.`,
      `Task completion is ${trackerRate}% across ${dashboard.totals.trackerTasks} tracked tasks.`,
      dashboard.habits.averageStreak >= 7
        ? `Strong consistency signal: average streak is ${dashboard.habits.averageStreak} days.`
        : `Streak baseline is ${dashboard.habits.averageStreak} days. Focus on small daily wins.`,
    ];
  }, [dashboard]);

  const runningHabits = useMemo(() => {
    return habits.filter((habit) => {
      if (habit.evaluation?.status !== "IN_PROGRESS") return false;
      const dayNumber =
        habit.evaluation?.dayNumber ??
        Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(habit.startDate).setHours(0, 0, 0, 0)) / (24 * 60 * 60 * 1000)) +
          1;
      return dayNumber >= 1 && dayNumber <= 21;
    });
  }, [habits]);

  const currentTasks = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const start = customRangeStart ? new Date(`${customRangeStart}T00:00:00`) : null;
    const end = customRangeEnd ? new Date(`${customRangeEnd}T23:59:59`) : null;

    const isSameDay = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

    return tracker.filter((task) => {
      const dueDate = new Date(task.dueDate);
      const createdAt = new Date(task.createdAt ?? task.dueDate);
      const isPending = (task.evaluation?.status ?? "IN_PROGRESS") === "IN_PROGRESS";
      const isTodayTask = isSameDay(dueDate, today);
      const isYesterdayPending = isSameDay(dueDate, yesterday) && isPending;

      if (taskFilterMode === "default") return isTodayTask || isYesterdayPending;
      if (taskFilterMode === "weekly") return task.cadence === "WEEKLY";
      if (taskFilterMode === "monthly") return task.cadence === "MONTHLY";
      if (taskFilterMode === "pending") return isPending;
      if (taskFilterMode === "custom") {
        if (!start && !end) return true;
        if (start && createdAt < start) return false;
        if (end && createdAt > end) return false;
        return true;
      }
      return true;
    });
  }, [customRangeEnd, customRangeStart, taskFilterMode, tracker]);

  const totalHabitPages = useMemo(() => Math.max(1, Math.ceil(habits.length / PAGE_SIZE)), [habits.length]);
  const totalTrackerPages = useMemo(() => Math.max(1, Math.ceil(tracker.length / PAGE_SIZE)), [tracker.length]);

  const pagedHabits = useMemo(
    () => habits.slice((habitsPage - 1) * PAGE_SIZE, habitsPage * PAGE_SIZE),
    [habits, habitsPage],
  );
  const pagedTracker = useMemo(
    () => tracker.slice((trackerPage - 1) * PAGE_SIZE, trackerPage * PAGE_SIZE),
    [tracker, trackerPage],
  );

  const trackerCalendar = useMemo(() => {
    const now = new Date();
    const year = trackerCalendarYear;
    const month = trackerCalendarMonth;
    const firstDate = new Date(year, month, 1);
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
    const currentDate = isCurrentMonth ? new Date(year, month, now.getDate()) : new Date(year, month, 1);
    const currentWeekStart = new Date(currentDate);
    currentWeekStart.setDate(currentDate.getDate() - ((currentDate.getDay() + 6) % 7));
    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekStart.getDate() + 6);

    let sourceDates: Date[] = [];
    if (trackerCalendarMode === "day") {
      sourceDates = [currentDate];
    } else if (trackerCalendarMode === "week") {
      sourceDates = Array.from({ length: 7 }, (_, index) => {
        const date = new Date(currentWeekStart);
        date.setDate(currentWeekStart.getDate() + index);
        return date;
      });
    } else {
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      sourceDates = Array.from({ length: daysInMonth }, (_, index) => new Date(year, month, index + 1));
    }

    const dayColumns = sourceDates.map((date, index) => {
      const weekdayMonFirst = (date.getDay() + 6) % 7;
      return {
        iso: toLocalDateKey(date),
        day: date.getDate(),
        weekdayMonFirst,
        weekdayLabel: WEEKDAY_LABELS[weekdayMonFirst],
        weekNumber:
          trackerCalendarMode === "month"
            ? Math.floor((((new Date(date.getFullYear(), date.getMonth(), 1).getDay() + 6) % 7) + date.getDate() - 1) / 7) + 1
            : 1,
        weekLabel: trackerCalendarMode === "day" ? "Today" : trackerCalendarMode === "week" ? "Current Week" : `Week ${
          Math.floor((((new Date(date.getFullYear(), date.getMonth(), 1).getDay() + 6) % 7) + date.getDate() - 1) / 7) + 1
        }`,
        sortKey: index,
      };
    });

    const weekGroups = dayColumns.reduce<Array<{ label: string; count: number; sortKey: number }>>((acc, day) => {
      const last = acc[acc.length - 1];
      if (last && last.label === day.weekLabel) {
        last.count += 1;
        return acc;
      }
      acc.push({ label: day.weekLabel, count: 1, sortKey: day.sortKey });
      return acc;
    }, []);

    const monthLabel =
      trackerCalendarMode === "day"
        ? `${isCurrentMonth ? "Today" : "Selected day"} - ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(currentDate)}`
        : trackerCalendarMode === "week"
          ? `${isCurrentMonth ? "Current Week" : "Selected Week"} - ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
              currentWeekStart,
            )} to ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(currentWeekEnd)}`
          : new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(firstDate);

    return {
      monthLabel,
      dayColumns,
      weekGroups,
      totalColumns: dayColumns.length,
    };
  }, [trackerCalendarMode, trackerCalendarMonth, trackerCalendarYear]);

  const trackerYearOptions = useMemo(() => {
    const base = new Date().getFullYear();
    return Array.from({ length: 11 }, (_, idx) => base - 5 + idx);
  }, []);

  const authHeaders = useMemo(
    () => ({
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token],
  );

  const loadAll = useCallback(async (): Promise<void> => {
    if (!token) return;
    const [habitRes, trackerRes, dashboardRes, suggestionsRes] = await Promise.all([
      fetch(`${API_BASE}/habits`, { headers: authHeaders }),
      fetch(`${API_BASE}/tracker/tasks`, { headers: authHeaders }),
      fetch(`${API_BASE}/dashboard/summary`, { headers: authHeaders }),
      fetch(`${API_BASE}/suggestions`, { headers: authHeaders }),
    ]);
    if (habitRes.ok) setHabits(await habitRes.json());
    if (trackerRes.ok) setTracker(await trackerRes.json());
    if (dashboardRes.ok) setDashboard(await dashboardRes.json());
    if (suggestionsRes.ok) {
      const data = await suggestionsRes.json();
      setSuggestions(data.suggestions ?? []);
    }
  }, [authHeaders, token]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadAll();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadAll]);

  useEffect(() => {
    if (!token) {
      setCurrentUserEmail("");
      return;
    }
    const timeoutId = window.setTimeout(() => {
      void (async () => {
        const res = await fetch(`${API_BASE}/auth/me`, { headers: authHeaders });
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        if (data?.user?.email) setCurrentUserEmail(data.user.email);
      })();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [authHeaders, token]);

  useEffect(() => {
    try {
      if (token) window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
      else window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      // Ignore storage failures and keep in-memory session.
    }
  }, [token]);

  useEffect(() => {
    try {
      if (currentUserEmail) window.localStorage.setItem(EMAIL_STORAGE_KEY, currentUserEmail);
      else window.localStorage.removeItem(EMAIL_STORAGE_KEY);
    } catch {
      // Ignore storage failures and keep in-memory profile.
    }
  }, [currentUserEmail]);

  useEffect(() => {
    setHabitsPage((prev) => Math.min(prev, totalHabitPages));
  }, [totalHabitPages]);

  useEffect(() => {
    setTrackerPage((prev) => Math.min(prev, totalTrackerPages));
  }, [totalTrackerPages]);

  useEffect(() => {
    if (view !== "tracker") return;
    const now = new Date();
    setTrackerCalendarMode("month");
    setTrackerCalendarMonth(now.getMonth());
    setTrackerCalendarYear(now.getFullYear());
  }, [view]);

  async function submitAuth(e: FormEvent): Promise<void> {
    e.preventDefault();
    setAuthError("");
    setIsAuthLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/${authMode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const message = typeof data?.message === "string" ? data.message : "Unable to authenticate. Please check your details.";
        setAuthError(message);
        return;
      }
      setToken(data.token);
      if (data?.user?.email) setCurrentUserEmail(data.user.email);
    } catch {
      setAuthError("Cannot reach server. Ensure backend is running on http://localhost:4000.");
    } finally {
      setIsAuthLoading(false);
    }
  }

  function openProfileEditor(): void {
    setIsProfileMenuOpen(false);
    setProfileError("");
    setProfileSuccess("");
    setProfileCurrentPassword("");
    setProfileNewPassword("");
    setProfileEmail(currentUserEmail);
    setIsProfileModalOpen(true);
  }

  function logout(): void {
    setToken("");
    setCurrentUserEmail("");
    setIsProfileMenuOpen(false);
    setIsProfileModalOpen(false);
    setHabits([]);
    setTracker([]);
    setDashboard(null);
    setSuggestions([]);
  }

  async function submitProfileUpdate(e: FormEvent): Promise<void> {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess("");
    setIsProfileSaving(true);
    try {
      const body: { email?: string; newPassword?: string; currentPassword: string } = {
        currentPassword: profileCurrentPassword,
      };
      const trimmedEmail = profileEmail.trim().toLowerCase();
      if (trimmedEmail && trimmedEmail !== currentUserEmail) body.email = trimmedEmail;
      if (profileNewPassword.trim()) body.newPassword = profileNewPassword;

      if (!body.email && !body.newPassword) {
        setProfileError("Update email or new password first.");
        return;
      }

      const res = await fetch(`${API_BASE}/auth/me`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setProfileError(typeof data?.message === "string" ? data.message : "Unable to update account.");
        return;
      }

      setCurrentUserEmail(data.user.email);
      setProfileSuccess("Account details updated.");
      setProfileCurrentPassword("");
      setProfileNewPassword("");
    } catch {
      setProfileError("Could not update account details.");
    } finally {
      setIsProfileSaving(false);
    }
  }

  async function createHabit(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (!habitName) return;
    const habitRes = await fetch(`${API_BASE}/habits`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        name: habitName,
        startDate: new Date(`${habitStartDate}T00:00:00`).toISOString(),
      }),
    });
    if (!habitRes.ok) return;
    const createdHabit = await habitRes.json().catch(() => null);
    if (createdHabit?.id && habitTaskList.length > 0) {
      await Promise.all(
        habitTaskList.map((title) =>
          fetch(`${API_BASE}/habits/${createdHabit.id}/tasks`, {
            method: "POST",
            headers: authHeaders,
            body: JSON.stringify({ title }),
          }),
        ),
      );
    }
    setHabitName("");
    setHabitStartDate(new Date().toISOString().slice(0, 10));
    setHabitTaskDraft("");
    setHabitTaskList([]);
    setIsCreateHabitModalOpen(false);
    await loadAll();
  }

  function addHabitTaskToList(): void {
    const nextTask = habitTaskDraft.trim();
    if (!nextTask) return;
    setHabitTaskList((prev) => [...prev, nextTask]);
    setHabitTaskDraft("");
  }

  async function checkIn(habitId: string): Promise<void> {
    await fetch(`${API_BASE}/habits/${habitId}/checkins`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({}),
    });
    await loadAll();
  }

  async function createTrackerTask(e: FormEvent): Promise<void> {
    e.preventDefault();
    const directEntry = trackerTaskDraft.trim();
    const taskTitles = directEntry ? [...trackerTaskList, directEntry] : [...trackerTaskList];
    if (taskTitles.length === 0) return;
    await Promise.all(
      taskTitles.map((title) =>
        fetch(`${API_BASE}/tracker/tasks`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({
            title,
            cadence: trackerCadence,
            dueDate: new Date(`${trackerDueDate}T00:00:00`).toISOString(),
          }),
        }),
      ),
    );
    setTrackerTaskDraft("");
    setTrackerTaskList([]);
    setTrackerCadence("DAILY");
    setTrackerDueDate(new Date().toISOString().slice(0, 10));
    setIsCreateTaskModalOpen(false);
    await loadAll();
  }

  function addTrackerTaskToList(): void {
    const nextTask = trackerTaskDraft.trim();
    if (!nextTask) return;
    setTrackerTaskList((prev) => [...prev, nextTask]);
    setTrackerTaskDraft("");
  }

  async function completeTracker(taskId: string): Promise<void> {
    await fetch(`${API_BASE}/tracker/tasks/${taskId}/completions`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({}),
    });
    await loadAll();
  }

  async function editHabit(habit: Habit): Promise<void> {
    const nextName = window.prompt("Edit habit name", habit.name)?.trim();
    if (!nextName || nextName === habit.name) return;
    await fetch(`${API_BASE}/habits/${habit.id}`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({ name: nextName }),
    });
    await loadAll();
  }

  async function deleteHabit(habit: Habit): Promise<void> {
    const ok = window.confirm(`Delete habit "${habit.name}"?`);
    if (!ok) return;
    await fetch(`${API_BASE}/habits/${habit.id}`, {
      method: "DELETE",
      headers: authHeaders,
    });
    if (selectedHabitId === habit.id) setSelectedHabitId(null);
    await loadAll();
  }

  async function toggleHabitTask(habitId: string, task: HabitTaskItem): Promise<void> {
    const nextCompleted = task.isActive;
    await fetch(`${API_BASE}/habits/${habitId}/tasks/${task.id}`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({ isActive: !nextCompleted }),
    });
    await loadAll();
  }

  if (!token) {
    return (
      <main className="app">
        <div className="auth-screen">
          <section className="panel auth-panel">
            <div className="title-row auth-title-row">
              <IconSpark className="title-icon" />
              <h1>HabitSpace</h1>
            </div>
            <p className="muted">Plan. Do. Track. Analyze. Improve.</p>
            <form onSubmit={submitAuth} className="form">
              <input
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (authError) setAuthError("");
                }}
                placeholder="Email"
                type="email"
                required
              />
              <input
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (authError) setAuthError("");
                }}
                type="password"
                placeholder="Password"
                minLength={8}
                required
              />
              {authError && <p className="auth-error">{authError}</p>}
              <button type="submit" disabled={isAuthLoading}>
                {isAuthLoading ? "Please wait..." : authMode === "signup" ? "Create Account" : "Login"}
              </button>
            </form>
            <div className="google-auth">
              <div className="or-divider">
                <span>or</span>
              </div>
              <div className="google-coming-soon" aria-label="Google login coming soon">
                <IconGoogle className="google-icon" />
                <span>Google Login</span>
                <em>Coming soon</em>
              </div>
            </div>
            <button
              className="link auth-switch-link"
              onClick={() => {
                setAuthMode(authMode === "signup" ? "login" : "signup");
                setAuthError("");
              }}
            >
              Switch to {authMode === "signup" ? "login" : "signup"}
            </button>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="app">
      <div className="workspace-shell">
        <aside className="sidebar">
          <nav className="side-nav">
            <button
              className={view === "dashboard" ? "side-active" : ""}
              onClick={() => setView("dashboard")}
              aria-label="Dashboard"
              title="Dashboard"
              data-label="Dashboard"
              type="button"
            >
              <span className="nav-icon-wrap">
                <IconChart className="nav-icon" />
              </span>
            </button>
            <button
              className={view === "habits" ? "side-active" : ""}
              onClick={() => setView("habits")}
              aria-label="Habits Build"
              title="Habits Build"
              data-label="Habits Build"
              type="button"
            >
              <span className="nav-icon-wrap">
                <IconHabit className="nav-icon" />
              </span>
            </button>
            <button
              className={view === "tracker" ? "side-active" : ""}
              onClick={() => setView("tracker")}
              aria-label="Task Tracker"
              title="Task Tracker"
              data-label="Task Tracker"
              type="button"
            >
              <span className="nav-icon-wrap">
                <IconTask className="nav-icon" />
              </span>
            </button>
          </nav>
          <div className="profile-wrap sidebar-profile">
            <button className="profile-trigger" onClick={() => setIsProfileMenuOpen((value) => !value)} type="button">
              <div className="avatar-group" aria-hidden="true">
                <span>{userInitials}</span>
              </div>
            </button>
            {isProfileMenuOpen && (
              <div className="profile-menu">
                <button type="button" onClick={openProfileEditor}>
                  Edit account
                </button>
                <button type="button" onClick={logout}>
                  Logout
                </button>
              </div>
            )}
          </div>
        </aside>

        <section className="workspace-main">
          <header className="topbar">
            <div className="brand topbar-brand">
              <h1>{pageTitle}</h1>
            </div>
            <div className="toolbar-right">
              <div className="top-logo-badge" aria-label="HabitSpace logo">
                <img src={habitLogo} alt="HabitSpace logo" className="top-logo" />
              </div>
            </div>
          </header>

          <section className="panel page-panel">
            {view === "dashboard" && dashboard && (
              <section className="dashboard-layout">
                <div className="dashboard-half dashboard-tables">
                  <article className="chart-card dashboard-table-card">
                    <h3>Current Habits</h3>
                    <div className="table-wrap dashboard-table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Habit</th>
                            <th>Status</th>
                            <th>Streak</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {runningHabits.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="empty-cell">
                                <div className="empty-state">
                                  <IconEmptyBox className="empty-graphic" />
                                  <p>No habits yet</p>
                                  <span>Add your first habit to begin the 21-day journey.</span>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            runningHabits.map((habit) => (
                              <tr key={habit.id}>
                                <td>{habit.name}</td>
                                <td>
                                  <span className={`status-chip status-${(habit.evaluation?.status ?? "IN_PROGRESS").toLowerCase()}`}>
                                    {habit.evaluation?.status ?? "IN_PROGRESS"}
                                  </span>
                                </td>
                                <td>{Math.min(21, habit.evaluation?.streak ?? 0)}/21</td>
                                <td>
                                  <div className="row-actions">
                                    <button type="button" className="row-icon-btn" title="Edit habit" onClick={() => void editHabit(habit)}>
                                      <IconPencil className="row-icon" />
                                    </button>
                                    <button type="button" className="row-icon-btn row-icon-danger" title="Delete habit" onClick={() => void deleteHabit(habit)}>
                                      <IconTrash className="row-icon" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </article>

                  <article className="chart-card dashboard-table-card">
                    <div className="card-head">
                      <h3>Current Tasks</h3>
                      <div className="task-filter-wrap">
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => setIsTaskFilterOpen((value) => !value)}
                          aria-label="Filter current tasks"
                          title="Filter current tasks"
                        >
                          <IconFilter className="filter-icon" />
                        </button>
                        {isTaskFilterOpen && (
                          <div className="filter-menu">
                            <label className="filter-option">
                              <input
                                type="radio"
                                name="task-filter-mode"
                                checked={taskFilterMode === "default"}
                                onChange={() => setTaskFilterMode("default")}
                              />
                              <span>Today + yesterday pending</span>
                            </label>
                            <label className="filter-option">
                              <input
                                type="radio"
                                name="task-filter-mode"
                                checked={taskFilterMode === "weekly"}
                                onChange={() => setTaskFilterMode("weekly")}
                              />
                              <span>Weekly tasks</span>
                            </label>
                            <label className="filter-option">
                              <input
                                type="radio"
                                name="task-filter-mode"
                                checked={taskFilterMode === "monthly"}
                                onChange={() => setTaskFilterMode("monthly")}
                              />
                              <span>Monthly tasks</span>
                            </label>
                            <label className="filter-option">
                              <input
                                type="radio"
                                name="task-filter-mode"
                                checked={taskFilterMode === "pending"}
                                onChange={() => setTaskFilterMode("pending")}
                              />
                              <span>Not completed / pending</span>
                            </label>
                            <label className="filter-option">
                              <input
                                type="radio"
                                name="task-filter-mode"
                                checked={taskFilterMode === "custom"}
                                onChange={() => setTaskFilterMode("custom")}
                              />
                              <span>Custom date range</span>
                            </label>
                            {taskFilterMode === "custom" && (
                              <div className="filter-range">
                                <input type="date" value={customRangeStart} onChange={(e) => setCustomRangeStart(e.target.value)} />
                                <input type="date" value={customRangeEnd} onChange={(e) => setCustomRangeEnd(e.target.value)} />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="table-wrap dashboard-table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Task</th>
                            <th>Category</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentTasks.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="empty-cell">
                                <div className="empty-state">
                                  <IconEmptyBox className="empty-graphic" />
                                  <p>No tasks yet</p>
                                  <span>Create a task or adjust filters to see current work.</span>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            currentTasks.map((task) => {
                              const dueDate = new Date(task.dueDate);
                              const now = new Date();
                              const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                              const yesterday = new Date(today);
                              yesterday.setDate(today.getDate() - 1);
                              const isPending = (task.evaluation?.status ?? "IN_PROGRESS") === "IN_PROGRESS";
                              const isToday =
                                dueDate.getFullYear() === today.getFullYear() &&
                                dueDate.getMonth() === today.getMonth() &&
                                dueDate.getDate() === today.getDate();
                              const isYesterdayPending =
                                dueDate.getFullYear() === yesterday.getFullYear() &&
                                dueDate.getMonth() === yesterday.getMonth() &&
                                dueDate.getDate() === yesterday.getDate() &&
                                isPending;
                              const category =
                                task.cadence === "WEEKLY"
                                  ? "Weekly"
                                  : task.cadence === "MONTHLY"
                                    ? "Monthly"
                                    : isToday
                                      ? "Today"
                                      : isYesterdayPending
                                        ? "Pending (Yesterday)"
                                        : "Current";
                              return (
                                <tr key={task.id}>
                                  <td>{task.title}</td>
                                  <td>{category}</td>
                                  <td>
                                    <span className={`status-chip status-${(task.evaluation?.status ?? "IN_PROGRESS").toLowerCase()}`}>
                                      {task.evaluation?.status ?? "IN_PROGRESS"}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </article>
                </div>
                <div className="dashboard-half">
                  <div className="charts-grid dashboard-charts-grid">
                    <article className="chart-card">
                      <h3>Outcome Comparison</h3>
                      <div className="chart-shell">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={outcomeComparisonData} barCategoryGap={22} margin={{ top: 10, right: 14, bottom: 8, left: 2 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#dbe6f5" />
                            <XAxis dataKey="state" tick={{ fill: "#4b6287", fontSize: 12 }} tickLine={false} axisLine={false} />
                            <YAxis tick={{ fill: "#4b6287", fontSize: 12 }} tickLine={false} axisLine={false} allowDecimals={false} />
                            <Tooltip
                              contentStyle={{
                                borderRadius: 10,
                                border: "1px solid #d7e2f1",
                                background: "rgba(255, 255, 255, 0.96)",
                                boxShadow: "0 8px 24px rgba(37, 65, 102, 0.16)",
                              }}
                            />
                            <Bar dataKey="habits" name="Habits" fill="#38bdf8" radius={[6, 6, 0, 0]} />
                            <Bar dataKey="tracker" name="Tracker" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </article>
                    <article className="chart-card">
                      <h3>Habit Distribution</h3>
                      <div className="chart-shell chart-shell-donut">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={habitMixData} dataKey="value" nameKey="name" cx="50%" cy="46%" innerRadius={46} outerRadius={76} paddingAngle={3}>
                              {habitMixData.map((entry) => (
                                <Cell key={entry.name} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                borderRadius: 10,
                                border: "1px solid #d7e2f1",
                                background: "rgba(255, 255, 255, 0.96)",
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="chart-legend">
                        {habitMixData.map((item) => (
                          <div key={item.name} className="legend-item">
                            <span className="legend-dot" style={{ backgroundColor: item.color }} />
                            <span>{item.name}</span>
                            <strong>{item.value}</strong>
                          </div>
                        ))}
                      </div>
                    </article>
                    <article className="chart-card">
                      <h3>Task Distribution</h3>
                      <div className="chart-shell chart-shell-donut">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={trackerMixData} dataKey="value" nameKey="name" cx="50%" cy="46%" innerRadius={46} outerRadius={76} paddingAngle={3}>
                              {trackerMixData.map((entry) => (
                                <Cell key={entry.name} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                borderRadius: 10,
                                border: "1px solid #d7e2f1",
                                background: "rgba(255, 255, 255, 0.96)",
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="chart-legend">
                        {trackerMixData.map((item) => (
                          <div key={item.name} className="legend-item">
                            <span className="legend-dot" style={{ backgroundColor: item.color }} />
                            <span>{item.name}</span>
                            <strong>{item.value}</strong>
                          </div>
                        ))}
                      </div>
                    </article>
                    <article className="chart-card insight-card">
                      <h3>Actionable Insights</h3>
                      <div className="insight-list">
                        {dashboardInsights.map((insight) => (
                          <p key={insight}>{insight}</p>
                        ))}
                      </div>
                    </article>
                  </div>
                </div>
              </section>
            )}

            {view === "habits" && (
              <section className="page-scroll habits-page">
                <div className="form-inline form-inline-end">
                  <button
                    type="button"
                    onClick={() => {
                      setHabitName("");
                      setHabitStartDate(new Date().toISOString().slice(0, 10));
                      setHabitTaskDraft("");
                      setHabitTaskList([]);
                      setIsCreateHabitModalOpen(true);
                    }}
                  >
                    + Create Habit
                  </button>
                </div>
                <div className="table-wrap table-wrap-fill">
                  <table>
                    <thead>
                      <tr>
                        <th>Task</th>
                        <th>Streak</th>
                        <th>Check-in</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {habits.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="empty-cell">
                            <div className="empty-state">
                              <IconEmptyBox className="empty-graphic" />
                              <p>No habits yet</p>
                              <span>Create your first habit to start tracking a 21-day cycle.</span>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        pagedHabits.map((h) => (
                          <Fragment key={h.id}>
                            <tr
                              className={selectedHabitId === h.id ? "table-row-selected" : ""}
                            onClick={() => setSelectedHabitId((prev) => (prev === h.id ? null : h.id))}
                          >
                            <td>{h.name}</td>
                            <td>{Math.min(21, h.evaluation?.streak ?? 0)}/21</td>
                            <td>
                              <label className="check-action" onClick={(e) => e.stopPropagation()}>
                                <input type="checkbox" checked={false} onChange={() => checkIn(h.id)} />
                                <span>Mark complete</span>
                                </label>
                              </td>
                              <td>
                                <div className="row-actions" onClick={(e) => e.stopPropagation()}>
                                  <button type="button" className="row-icon-btn" title="Edit habit" onClick={() => void editHabit(h)}>
                                    <IconPencil className="row-icon" />
                                  </button>
                                  <button type="button" className="row-icon-btn row-icon-danger" title="Delete habit" onClick={() => void deleteHabit(h)}>
                                    <IconTrash className="row-icon" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          {selectedHabitId === h.id && (
                            <tr className="drilldown-row">
                              <td colSpan={4} className="drilldown-cell">
                                <div className="drilldown-panel">
                                  <div className="habit-task-head">
                                    <h3>{h.name} Tasks</h3>
                                      <span>Check completed tasks</span>
                                    </div>
                                    {h.tasks && h.tasks.length > 0 ? (
                                      <div className="habit-task-list">
                                        {h.tasks.map((task) => (
                                          <label key={task.id} className="habit-task-item">
                                            <input
                                              type="checkbox"
                                              checked={!task.isActive}
                                              onChange={() => void toggleHabitTask(h.id, task)}
                                            />
                                            <span className={!task.isActive ? "task-done" : ""}>{task.title}</span>
                                          </label>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="empty-state compact-empty">
                                        <IconEmptyBox className="empty-graphic" />
                                        <p>No tasks to show</p>
                                        <span>This habit does not have task items yet.</span>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="pagination-row">
                  <button type="button" className="ghost pagination-btn" disabled={habitsPage <= 1} onClick={() => setHabitsPage((p) => Math.max(1, p - 1))}>
                    Previous
                  </button>
                  <span className="pagination-label">
                    Page {habitsPage} / {totalHabitPages}
                  </span>
                  <button
                    type="button"
                    className="ghost pagination-btn"
                    disabled={habitsPage >= totalHabitPages}
                    onClick={() => setHabitsPage((p) => Math.min(totalHabitPages, p + 1))}
                  >
                    Next
                  </button>
                </div>
              </section>
            )}

            {view === "tracker" && (
              <section className="page-scroll habits-page">
                <div className="form-inline form-inline-end">
                  <div className="task-filter-wrap">
                    <button
                      type="button"
                      className="icon-btn ghost"
                      aria-label="Filter tracker calendar"
                      onClick={() => setIsTrackerFilterOpen((prev) => !prev)}
                    >
                      <IconFilter className="filter-icon" />
                    </button>
                    {isTrackerFilterOpen && (
                      <div className="filter-menu">
                        <label className="filter-option">
                          <input
                            type="radio"
                            name="tracker-view"
                            checked={trackerCalendarMode === "day"}
                            onChange={() => {
                              setTrackerCalendarMode("day");
                            }}
                          />
                          Current day
                        </label>
                        <label className="filter-option">
                          <input
                            type="radio"
                            name="tracker-view"
                            checked={trackerCalendarMode === "week"}
                            onChange={() => {
                              setTrackerCalendarMode("week");
                            }}
                          />
                          Current week
                        </label>
                        <label className="filter-option">
                          <input
                            type="radio"
                            name="tracker-view"
                            checked={trackerCalendarMode === "month"}
                            onChange={() => {
                              setTrackerCalendarMode("month");
                            }}
                          />
                          Current month
                        </label>
                        <div className="filter-range tracker-filter-range">
                          <select value={trackerCalendarMonth} onChange={(e) => setTrackerCalendarMonth(Number(e.target.value))}>
                            {MONTH_LABELS.map((label, index) => (
                              <option key={label} value={index}>
                                {label}
                              </option>
                            ))}
                          </select>
                          <select value={trackerCalendarYear} onChange={(e) => setTrackerCalendarYear(Number(e.target.value))}>
                            {trackerYearOptions.map((yearOption) => (
                              <option key={yearOption} value={yearOption}>
                                {yearOption}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setTrackerCadence("DAILY");
                      setTrackerDueDate(new Date().toISOString().slice(0, 10));
                      setTrackerTaskDraft("");
                      setTrackerTaskList([]);
                      setIsCreateTaskModalOpen(true);
                    }}
                  >
                    + Create Task
                  </button>
                </div>
                <div className="table-wrap table-wrap-fill">
                  <table className="calendar-table">
                    <thead>
                      <tr>
                        <th colSpan={1 + trackerCalendar.totalColumns} className="calendar-month-head">
                          {trackerCalendar.monthLabel}
                        </th>
                      </tr>
                      <tr>
                        <th rowSpan={2} className="calendar-task-head">Task</th>
                        {trackerCalendar.weekGroups.map((week) => (
                          <th key={`week-${week.sortKey}`} colSpan={week.count} className={`calendar-week-head week-tone-${week.sortKey % 4}`}>
                            {week.label}
                          </th>
                        ))}
                      </tr>
                      <tr>
                        {trackerCalendar.dayColumns.map((day) => (
                          <th key={day.iso} className={`calendar-day-head weekday-${day.weekdayLabel.toLowerCase()}`}>
                            <span>{day.weekdayLabel}</span>
                            <strong>{day.day}</strong>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tracker.length === 0 ? (
                        <tr className="table-empty-row">
                          <td colSpan={1 + trackerCalendar.totalColumns} className="empty-cell">
                            <div className="empty-state">
                              <IconEmptyBox className="empty-graphic" />
                              <p>No tasks yet</p>
                              <span>Create a task to start tracking completion.</span>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        pagedTracker.map((task) => (
                          <tr key={task.id}>
                            <td className="calendar-task-cell">
                              <div className="calendar-task-content">
                                <span>{task.title}</span>
                                <small>{task.cadence}</small>
                              </div>
                            </td>
                            {trackerCalendar.dayColumns.map((day) => {
                              const dueDateKey = toLocalDateKey(task.dueDate);
                              const status = task.evaluation?.status ?? "IN_PROGRESS";
                              const isDueDay = dueDateKey === day.iso;
                              const isDone = isDueDay && status === "WIN";
                              const isMissed = isDueDay && status === "LOSE";
                              const canMarkComplete = isDueDay && status === "IN_PROGRESS";
                              return (
                                <td
                                  key={`${task.id}-${day.iso}`}
                                  className={`calendar-cell ${isDueDay ? "calendar-cell-due" : "calendar-cell-muted"} ${
                                    isDone ? "calendar-cell-win" : ""
                                  } ${isMissed ? "calendar-cell-lose" : ""}`}
                                  title={isDueDay ? `${task.title} due on ${day.iso}` : ""}
                                >
                                  <input
                                    className="calendar-check"
                                    type="checkbox"
                                    checked={isDone}
                                    disabled={!canMarkComplete}
                                    onChange={() => void completeTracker(task.id)}
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="pagination-row">
                  <button type="button" className="ghost pagination-btn" disabled={trackerPage <= 1} onClick={() => setTrackerPage((p) => Math.max(1, p - 1))}>
                    Previous
                  </button>
                  <span className="pagination-label">
                    Page {trackerPage} / {totalTrackerPages}
                  </span>
                  <button
                    type="button"
                    className="ghost pagination-btn"
                    disabled={trackerPage >= totalTrackerPages}
                    onClick={() => setTrackerPage((p) => Math.min(totalTrackerPages, p + 1))}
                  >
                    Next
                  </button>
                </div>
              </section>
            )}

            {view === "suggestions" && (
              <section className="page-scroll">
                <div className="suggestion-grid">
                  {suggestions.map((s) => (
                    <article key={s} className="suggestion-card">
                      <span className="mini-sticker">Action</span>
                      <p>{s}</p>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </section>
        </section>
      </div>
      {isProfileModalOpen && (
        <div className="modal-backdrop" role="presentation" onClick={() => setIsProfileModalOpen(false)}>
          <section className="modal-card" role="dialog" aria-modal="true" aria-label="Edit account" onClick={(e) => e.stopPropagation()}>
            <h3>Edit account</h3>
            <p className="muted">Update credentials for {currentUserEmail || "your account"}.</p>
            <form className="form" onSubmit={submitProfileUpdate}>
              <input type="email" value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} placeholder="Email" required />
              <input
                type="password"
                value={profileCurrentPassword}
                onChange={(e) => setProfileCurrentPassword(e.target.value)}
                placeholder="Current password"
                minLength={8}
                required
              />
              <input
                type="password"
                value={profileNewPassword}
                onChange={(e) => setProfileNewPassword(e.target.value)}
                placeholder="New password (optional)"
                minLength={8}
              />
              {profileError && <p className="auth-error">{profileError}</p>}
              {profileSuccess && <p className="profile-success">{profileSuccess}</p>}
              <div className="modal-actions">
                <button type="button" className="ghost" onClick={() => setIsProfileModalOpen(false)}>
                  Close
                </button>
                <button type="submit" disabled={isProfileSaving}>
                  {isProfileSaving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      {isCreateHabitModalOpen && (
        <div className="modal-backdrop" role="presentation" onClick={() => setIsCreateHabitModalOpen(false)}>
          <section className="modal-card" role="dialog" aria-modal="true" aria-label="Create habit" onClick={(e) => e.stopPropagation()}>
            <h3>Create Habit</h3>
            <p className="muted">Enter details to add a new habit challenge.</p>
            <form className="form" onSubmit={createHabit}>
              <input
                value={habitName}
                onChange={(e) => setHabitName(e.target.value)}
                placeholder="Habit name"
                minLength={1}
                required
              />
              <input type="date" value={habitStartDate} onChange={(e) => setHabitStartDate(e.target.value)} required />
              <div className="task-builder">
                <p className="task-builder-label">Tasks (optional)</p>
                <div className="task-entry-row">
                  <input
                    value={habitTaskDraft}
                    onChange={(e) => setHabitTaskDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      e.preventDefault();
                      addHabitTaskToList();
                    }}
                    placeholder="Add task item"
                  />
                  <button type="button" className="ghost" onClick={addHabitTaskToList}>
                    Add
                  </button>
                </div>
                {habitTaskList.length > 0 && (
                  <div className="task-entry-list">
                    {habitTaskList.map((task, index) => (
                      <div key={`${task}-${index}`} className="task-chip">
                        <span>{task}</span>
                        <button
                          type="button"
                          className="task-chip-remove"
                          onClick={() => setHabitTaskList((prev) => prev.filter((_, i) => i !== index))}
                          aria-label={`Remove task ${task}`}
                        >
                          x
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="modal-actions">
                <button type="button" className="ghost" onClick={() => setIsCreateHabitModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit">Create Habit</button>
              </div>
            </form>
          </section>
        </div>
      )}
      {isCreateTaskModalOpen && (
        <div className="modal-backdrop" role="presentation" onClick={() => setIsCreateTaskModalOpen(false)}>
          <section className="modal-card" role="dialog" aria-modal="true" aria-label="Create task" onClick={(e) => e.stopPropagation()}>
            <h3>Create Task</h3>
            <p className="muted">Choose category and date, then add one or more tasks.</p>
            <form className="form" onSubmit={createTrackerTask}>
              <select value={trackerCadence} onChange={(e) => setTrackerCadence(e.target.value as "DAILY" | "WEEKLY" | "MONTHLY")}>
                <option value="DAILY">Current day</option>
                <option value="WEEKLY">Current week</option>
                <option value="MONTHLY">Current month</option>
              </select>
              <input type="date" value={trackerDueDate} onChange={(e) => setTrackerDueDate(e.target.value)} required />
              <div className="task-builder">
                <p className="task-builder-label">Task list</p>
                <div className="task-entry-row">
                  <input
                    value={trackerTaskDraft}
                    onChange={(e) => setTrackerTaskDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      e.preventDefault();
                      addTrackerTaskToList();
                    }}
                    placeholder="Add task item"
                  />
                  <button type="button" className="ghost" onClick={addTrackerTaskToList}>
                    Add
                  </button>
                </div>
                {trackerTaskList.length > 0 && (
                  <div className="task-entry-list">
                    {trackerTaskList.map((task, index) => (
                      <div key={`${task}-${index}`} className="task-chip">
                        <span>{task}</span>
                        <button
                          type="button"
                          className="task-chip-remove"
                          onClick={() => setTrackerTaskList((prev) => prev.filter((_, i) => i !== index))}
                          aria-label={`Remove task ${task}`}
                        >
                          x
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="modal-actions">
                <button type="button" className="ghost" onClick={() => setIsCreateTaskModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={trackerTaskList.length === 0 && !trackerTaskDraft.trim()}>
                  Create Task
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

export default App;
