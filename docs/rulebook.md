# HabitSpace Rulebook (MVP)

## 1. Product Scope
- User authentication: signup, login.
- Habit management: create, read, update, delete habits.
- Habit tasks: create, read, update, delete tasks under a habit.
- Separate task tracker: tasks not tied to habits.
- Win/Lose engine:
- Habit challenge logic based on 21-day consecutive check-ins.
- Tracker logic based on cadence window (daily/weekly/monthly).
- Dashboard analytics and rule-based suggestions.

## 2. User Stories
- As a user, I want to sign up and log in so that my data is private.
- As a user, I want to create habits and sub-tasks so I can structure behavior change.
- As a user, I want to check in daily against a habit so I can build a streak.
- As a user, I want to track separate daily/weekly/monthly tasks so I can manage deadlines.
- As a user, I want wins and losses so I can measure consistency.
- As a user, I want analytics and suggestions so I can improve outcomes.

## 3. Habit Win/Lose Rules
- A habit has a `startDate` and daily check-ins.
- A check-in is one completion for a calendar day.
- Win condition: 21 consecutive completed days from start date.
- Lose condition: on day 22 or later, if 21-day consecutive streak has not been achieved.
- Otherwise status is in-progress.

### Habit edge cases
- Duplicate check-in on same day is blocked.
- If start date is changed, streak and status are recalculated from new start date.
- If user misses any day in the first 21-day window, streak breaks.

## 4. Tracker Win/Lose Rules
- Tracker tasks are independent of habits.
- Each tracker task has cadence: `DAILY | WEEKLY | MONTHLY`.
- A task instance is win if completed within its cadence window.
- If cadence window ends with no valid completion, result is loss.
- If window not ended and no completion yet, status is in-progress.

### Tracker edge cases
- Weekly uses ISO week (Monday start).
- Monthly uses calendar month boundaries.
- Completion after window end does not convert a loss to win for that past window.

## 5. Acceptance Criteria (MVP)
- User can sign up and login with secure password hashing.
- User can create/edit/delete habits and see them in a list.
- User can create/edit/delete tasks inside a habit.
- User can create one habit check-in per day per habit.
- User can create tracker tasks and mark completion.
- Dashboard returns:
- Habit win/lose/in-progress counts.
- Tracker win/lose/in-progress counts.
- Current habit streaks.
- Suggestions endpoint returns rule-based recommendations.

## 6. Non-Goals (MVP)
- Social features.
- Notifications and reminders (planned later).
- ML-based suggestions (rule-based only for now).
