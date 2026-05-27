# SIMPLIDORO — DOCUMENTATION PACK
# BATCH B: FEATURE CONTRACT
# Sections 5–6

---

PROJECT: Simplidoro
VERSION: 1.0 — Documentation Pack
GENERATED: 2025-07-14
STACK: React + TypeScript + Vite (frontend) | Node.js + Express (backend) |
       postgres.js + Neon PostgreSQL (database) | passport.js + Google OAuth
       (auth) | express-session + connect-pg-simple (sessions) |
       Cloudflare R2 (audio assets)
DEPLOYMENT TARGET: Vercel (frontend) + Railway (backend) + Neon (database)
DOCUMENTATION STATUS: DRAFT — Pending author review
CODING MODEL INSTRUCTIONS: Read all batches before implementing. Treat every
MUST as a hard constraint. Treat every SHOULD as a strong default. Never
implement a feature not in Batch B. Never introduce a library not confirmed
in Batch D. Flag any ambiguity before writing code.

---

## CODING MODEL CONTEXT — BATCH B

This batch is the core specification contract. Every feature the coding model
implements must appear in Section 5 under MUST-HAVE or SHOULD-HAVE. Every
implementation detail must satisfy the acceptance criteria in Section 6.

Prior batch constraints that apply here:
- All users are non-technical. UI text, errors, and empty states must use
  plain English at all times. [Batch A, Section 3.3]
- Demo mode must never write to the database. Guest users get timer (all 3
  modes), session-only to-do list, and music player only. [Batch A, UC-08]
- The admin role must never appear in any UI element. [Batch A, Section 3.4]
- No feature outside this batch may be implemented without explicit owner
  approval. [Batch A, Section 2.3]

---

## SECTION 5: FEATURE LIST BY PRIORITY

### 5.1 MUST-HAVE (V1 — App cannot ship without these)

| ID    | Feature                                      | Primary Persona       |
|-------|----------------------------------------------|-----------------------|
| F-01  | Timer mode (countdown, no breaks)            | All users             |
| F-02  | Pomodoro mode (work/short break/long break)  | All users             |
| F-03  | Freestyle mode (ratio-based break earning)   | All users             |
| F-04  | Pause and resume in all timer modes          | All users             |
| F-05  | Abandon/reset period in all modes            | All users             |
| F-06  | Alarm: sound + visual + browser notification | All users             |
| F-07  | Per-period reflection prompt system          | Authenticated users   |
| F-08  | End-of-session reflection prompt             | Authenticated users   |
| F-09  | Reflection toggle (on/off, all modes)        | Authenticated users   |
| F-10  | Reflection log viewer (filter by day/week/   | Authenticated users   |
|       | month/task/focus rating)                     |                       |
| F-11  | User-customizable reflection prompts         | Authenticated users   |
| F-12  | Reflection prompt reset to defaults          | Authenticated users   |
| F-13  | To-do list CRUD (max 20 tasks)               | All users             |
| F-14  | Task drag-and-drop reordering                | All users             |
| F-15  | Task check-off during work period            | Authenticated users   |
| F-16  | Break activity list CRUD (max 10, up to 30)  | Authenticated users   |
| F-17  | Break activity popup on break start          | Authenticated users   |
| F-18  | Break activity log page (per day)            | Authenticated users   |
| F-19  | Google OAuth authentication                  | All users             |
| F-20  | HTTP-only cookie session management          | Authenticated users   |
| F-21  | Account deletion (full cascade)              | Authenticated users   |
| F-22  | Demo mode (logged-out)                       | Guest users           |
| F-23  | Session resume prompt after browser close    | Authenticated users   |
| F-24  | Two-tab conflict detection (BroadcastChannel)| Authenticated users   |
| F-25  | Theme system (8-slot palette + 3 semantic)   | All users             |
| F-26  | Font selector (7 Google Fonts)               | All users             |
| F-27  | Built-in ambient sound player (Option D)     | All users             |
| F-28  | Reports tab (streak, focus graph, time)      | Authenticated users   |
| F-29  | Hidden admin role (data clear by user)       | Admin only            |
| F-30  | Settings page (all configurable options)     | Authenticated users   |
| F-31  | Keyboard shortcuts with reference in settings| All users             |
| F-32  | 12-hour session hard cap                     | All users             |
| F-33  | GDPR account data deletion                   | Authenticated users   |

### 5.2 SHOULD-HAVE (V1 — Strong defaults, include unless blocked)

| ID    | Feature                                          | Notes                        |
|-------|--------------------------------------------------|------------------------------|
| F-34  | Mobile responsive layout (vertical linear scroll)| Desktop-first, mobile-second |
| F-35  | Tablet landscape layout (desktop-equivalent)     | CSS breakpoint only          |
| F-36  | Reasonable accessibility (contrast, ARIA labels, | WCAG AA contrast ratios      |
|       | focus indicators, keyboard navigation)           | enforced by theme system     |
| F-37  | Rate limiting on all API endpoints               | Per Batch E specification    |
| F-38  | Session expiry cleanup job                       | Prevents session table bloat |
| F-39  | Reflection prompt config file                    | reflection-prompts.config.ts |
| F-40  | Default prompts seeded to DB on first deploy     | Per user on account creation |

### 5.3 NICE-TO-HAVE (V1 — Include if time permits, no regressions)

| ID    | Feature                                      | Notes                            |
|-------|----------------------------------------------|----------------------------------|
| F-41  | Smooth drag-and-drop animation on task list  | UX polish only                   |
| F-42  | Transition animations between timer states   | Must not affect timer accuracy   |
| F-43  | Keyboard shortcut for start/pause timer      | Space bar as default             |

### 5.4 LATER (V2+ — Must not be implemented in V1)

| ID    | Feature                                      | Reason Deferred                  |
|-------|----------------------------------------------|----------------------------------|
| F-50  | YouTube iframe embedded player               | Complexity, deferred to v2       |
| F-51  | Spotify OAuth integration                    | Permanently out of scope         |
| F-52  | Task auto-completion by elapsed periods      | Hook in code only, no UI in v1   |
| F-53  | Reflection data export                       | Out of scope                     |
| F-54  | In-app admin dashboard                       | Server logs sufficient for v1    |
| F-55  | Third-party error tracking (Sentry)          | Out of scope                     |
| F-56  | Third-party analytics (PostHog, Plausible)   | Out of scope                     |
| F-57  | Email/password authentication                | Out of scope                     |
| F-58  | Social features or shared task lists         | Out of scope                     |
| F-59  | Native mobile app or PWA offline support     | Out of scope                     |

---

## SECTION 6: DETAILED FEATURE SPECIFICATIONS

---

### F-01: Timer Mode

**Description:** A simple countdown timer for a single work period with no
break periods.

**User Value:** Allows users who want a fixed-duration focus block without
any Pomodoro cycling.

**Preconditions:**
- Timer mode is selected.
- User has set a duration (any valid positive integer in minutes).

**Main Flow:**
1. User selects Timer mode.
2. User sets duration via structured input.
3. User presses Start.
4. Countdown begins using datetime difference calculation (not setInterval
   alone — see F-04 for timing accuracy spec).
5. Timer reaches zero.
6. Alarm fires (sound + visual + browser notification per user settings).
7. If reflection toggle is ON: reflection prompt appears (F-07).
8. If reflection toggle is OFF: session ends. No further action.

**Alternate Flows:**
- User pauses mid-period: timer freezes. Elapsed time is preserved.
  Resume continues from frozen point.
- User abandons period: timer resets. No reflection prompt fires.
- Browser closed mid-period: session state is saved. Resume prompt on
  return (F-23).

**Error States:**
- User sets duration to zero or negative: input is rejected. Display
  inline validation message: "Please enter a time greater than 0 minutes."
- User sets duration exceeding 12 hours (720 minutes): input is rejected.
  Display: "Maximum session length is 12 hours."

**Acceptance Criteria:**
- [ ] Timer counts down from set duration to zero.
- [ ] Timer uses datetime difference for accuracy, not setInterval alone.
- [ ] Alarm fires on zero (per F-06).
- [ ] Reflection fires on zero if toggle is ON (per F-07).
- [ ] Pause preserves elapsed time with no drift on resume.
- [ ] Abandon clears timer state and skips reflection.
- [ ] Duration input rejects zero, negative, and values over 720 minutes.
- [ ] No break period exists in Timer mode under any condition.

**Dependencies:** F-04 (pause), F-05 (abandon), F-06 (alarm), F-07
(reflection), F-23 (session resume)

---

### F-02: Pomodoro Mode

**Description:** Alternates between work periods and break periods. After a
configurable number of work periods, a long break is substituted for the
short break.

**User Value:** Structured work-break cycling for users who want a proven
focus methodology with customizable intervals.

**Preconditions:**
- Pomodoro mode is selected.
- Settings are configured (or defaults are loaded).

**Default Values:**
| Setting                  | Default Value |
|--------------------------|---------------|
| Work period duration     | 25 minutes    |
| Short break duration     | 5 minutes     |
| Long break duration      | 20 minutes    |
| Long break frequency     | Every 4 work periods |
| Auto Start Breaks        | OFF           |
| Auto Start Pomodoros     | OFF           |

**Main Flow:**
1. User selects Pomodoro mode.
2. User optionally customizes settings.
3. User optionally adds tasks to to-do list.
4. User presses Start. Work period countdown begins.
5. Work period ends. Alarm fires.
6. If reflection toggle is ON: reflection prompt appears. Break does NOT
   start until reflection is submitted or skipped.
7. If Auto Start Breaks is OFF: break timer displays full break duration
   frozen at start value with a "Start" button. User presses Start to begin.
8. If Auto Start Breaks is ON: break begins immediately after reflection
   is resolved.
9. Break period ends. Alarm fires.
10. If Auto Start Pomodoros is OFF: work timer displays with "Start" button.
11. If Auto Start Pomodoros is ON: next work period begins immediately.
12. After the configured number of work periods (default 4), a long break
    substitutes for the short break.
13. [C-06] When the user has marked every to-do list task complete
    (requires at least one task was added during the session), OR when
    the user clicks End Session: end-of-session reflection fires (F-08).
    Sessions with no tasks added never auto-end; they continue until
    manual End Session or the 12-hour period cap (F-32).
14. User can end session early at any time via an "End Session" button.
    End-of-session reflection fires on early end.

**Alternate Flows:**
- User abandons a work period: period resets, no reflection fires,
  Pomodoro count does not increment.
- User abandons a break period: break ends, next work period is queued.
- Browser closed mid-period: session state saved, resume prompt on return.

**Error States:**
- Any duration field set to zero or negative: rejected with inline message.
- Any duration field set above 720 minutes: rejected with inline message.
- Long break frequency set to zero: rejected. Minimum value is 1.

**Acceptance Criteria:**
- [ ] Work period counts down from configured work duration.
- [ ] Short break fires after each work period except at long break interval.
- [ ] Long break fires at the configured frequency interval.
- [ ] Reflection fires before break starts if toggle is ON.
- [ ] Auto Start Breaks OFF shows frozen break timer with "Start" button.
- [ ] Auto Start Pomodoros OFF shows frozen work timer with "Start" button.
- [ ] End session early button is always visible during a session.
- [ ] End-of-session reflection fires when all periods complete OR when
    user ends early.
- [ ] Abandoning a work period does not increment the Pomodoro count.
- [ ] All default values match the table above on first load.

**Dependencies:** F-04, F-05, F-06, F-07, F-08, F-23, F-30

---

### F-03: Freestyle Mode

**Description:** User sets a work duration and a work-to-break ratio. Break
time is earned in real time as work time elapses. Optionally, unspent break
time accumulates across periods.

**User Value:** Allows users to define their own work-break ratio rather than
using fixed intervals.

**Preconditions:**
- Freestyle mode is selected.
- User has set a work duration and a ratio.

**Ratio Definition:**
- The ratio is expressed as: X minutes of work earns Y minutes of break.
- Example: 5:1 means every 5 minutes worked earns 1 minute of break.
- Decimal precision is supported in the ratio input.
- Earned break time is rounded to the nearest 15 seconds in both the
  displayed value and the actual break timer.

**Accumulation:**
- Accumulation toggle defaults to ON.
- When ON: unspent break time from a previous period is added to the next
  period's earned break time.
- When OFF: unspent break time is silently discarded at the end of each
  break period. No notification shown to user.

**Work Duration Editing:**
- The work duration is pre-defined before starting.
- The user may edit the work duration mid-session (add or remove time).
- This interaction must be intuitive and simple — modeled on Google Timer's
  "+1 min / -1 min" style controls.
- Editing duration mid-session must not reset or interrupt the current
  countdown. It adjusts the remaining time only.

**Main Flow:**
1. User selects Freestyle mode.
2. User sets work duration and ratio.
3. User presses Start. Work period begins.
4. As work time elapses, earned break time is calculated in real time and
   displayed.
5. User manually ends work period (or duration reaches zero).
6. If reflection toggle is ON: reflection fires before break begins.
7. Break begins with earned time (+ accumulated banked time if ON).
8. Break timer counts down.
9. Break ends. Any unspent time is banked (if ON) or discarded (if OFF).
10. Next work period begins on user action or automatically.
11. User ends session. End-of-session reflection fires (F-08).

**Alternate Flows:**
- User takes no break (skips break): earned time is banked if ON, discarded
  if OFF.
- User abandons work period: no reflection fires, no break time is earned
  for that period.

**Error States:**
- Ratio set to zero or negative: rejected. Display: "Please enter a valid
  ratio greater than zero."
- Work duration set to zero or negative: rejected.
- Work duration set above 720 minutes: rejected.

**Acceptance Criteria:**
- [ ] Earned break time is calculated in real time using the configured ratio.
- [ ] Earned break time is rounded to nearest 15 seconds in display and timer.
- [ ] Accumulation toggle defaults to ON.
- [ ] Unspent break time banks correctly when accumulation is ON.
- [ ] Unspent break time is silently discarded when accumulation is OFF.
- [ ] Work duration is editable mid-session without resetting the timer.
- [ ] Editing duration adjusts remaining time only — does not restart period.
- [ ] Reflection fires before break if toggle is ON.
- [ ] End-of-session reflection fires when user ends session.

**Dependencies:** F-04, F-05, F-06, F-07, F-08, F-23, F-30

---

### F-04: Pause and Resume

**Description:** The user can pause the active timer in any mode. The timer
freezes at the current remaining time. Resume continues from the exact frozen
point.

**Timing Accuracy Requirement:**
- The app must NOT use setInterval alone for timing.
- The app MUST calculate remaining time as:
  remainingTime = totalDuration - (Date.now() - startTimestamp)
- On pause: the elapsed time is recorded as a snapshot.
- On resume: a new startTimestamp is set. Elapsed time continues from
  the snapshot.
- On tab visibility change (tab hidden/shown): the timer must recalculate
  from timestamps, not from interval ticks.

**Acceptance Criteria:**
- [ ] Pause button is visible and accessible during any active timer period.
- [ ] Timer freezes immediately on pause with no drift.
- [ ] Resume continues from exact paused value.
- [ ] Timer accuracy is maintained after tab switching.
- [ ] Timer accuracy is maintained after system sleep and wake.
- [ ] Remaining time never displays a negative value.

---

### F-05: Abandon and Reset

**Description:** The user can abandon the current work or break period at any
time. The timer resets. No reflection fires on abandon.

**Acceptance Criteria:**
- [ ] Abandon/reset button is visible during any active timer period.
- [ ] On abandon: timer resets to the full period duration.
- [ ] On abandon of a work period: no reflection prompt fires under any
    condition.
- [ ] On abandon: Pomodoro period count does not increment.
- [ ] On abandon: no break activity is logged for that period.

---

### F-06: Alarm System

**Description:** When a timer period ends (work or break), the app fires a
multi-channel alert.

**Alert Channels:**
1. Alarm sound (configurable — see F-30 settings).
2. Visual change on screen (reflection prompt appears, or next period
   start screen appears).
3. Browser/OS notification (requires user permission grant).

**Configurability (via Settings F-30):**
| Setting             | Type     | Options                              | Default  |
|---------------------|----------|--------------------------------------|----------|
| Alarm sound         | Dropdown | Bell, Bird, Digital, Kitchen         | Bell     |
| Alarm volume        | Slider   | 0–100                                | 80       |
| Times alarm repeats | Number   | 1–5                                  | 1        |
| Browser notification| Toggle   | On / Off                             | Off      |

**Acceptance Criteria:**
- [ ] Alarm sound plays on period end.
- [ ] Alarm sound matches user's selected sound from settings.
- [ ] Alarm volume matches user's slider value.
- [ ] Alarm repeats the configured number of times.
- [ ] Browser notification fires if permission is granted and toggle is ON.
- [ ] If notification permission is denied: alarm still fires via sound
    and visual. No error shown to user.
- [ ] Visual change occurs regardless of sound/notification settings.
- [ ] Alarm does not fire on abandon/reset.

# SIMPLIDORO — DOCUMENTATION PACK
# BATCH B: FEATURE CONTRACT (CONTINUED)
# Sections 5–6 (Continued from cut-off point)

## CORRECTIONS APPLIED IN THIS CONTINUATION

The following corrections from owner review are applied throughout this
continuation. They supersede any conflicting statement in the prior Batch B
output:

C-01: Settings are accessible to ALL users including guests. Guest settings
      are stored in browser cookies only. Authenticated user settings are
      stored in the database and take precedence over cookies on login.

C-02: Guest user preferences are stored in browser cookies. Cookies must
      never contain PII. Only timer state, settings preferences, and
      session-only task data may be stored in guest cookies.

C-03: Long break frequency minimum value is 0 (zero = long breaks disabled).
      When set to 0, only short breaks fire after every work period.
      Previous spec stating minimum of 1 is VOID.

C-04: Freestyle ratio input accepts decimals limited to a maximum of 2
      decimal places. Enforced at both client (input field) and server
      (API validation). Previous spec allowing unlimited decimal precision
      is VOID.

C-05: Alarm settings include a custom audio URL input. URL is loaded
      client-side only via <audio> element. Server must never fetch or
      process this URL. Constraints apply — see F-06 for full spec.

C-06: F-02 step 13 ("planned work periods complete") clarified. The
      Pomodoro session auto-ends and triggers end-of-session reflection
      when the user has added at least one to-do list task AND marked
      every added task complete. If no tasks were added, the session
      continues indefinitely until the user clicks End Session or the
      per-period 12-hour cap (F-32) ends the current period. The phrase
      "planned work periods" in the original F-02 wording is hereby
      superseded.

C-07: F-32 retitled from "12-Hour Session Hard Cap" to "12-Hour Period
      Hard Cap." The 12-hour ceiling applies to any single work or break
      period (input-capped at 720 minutes). Sessions may legitimately sum
      to longer durations across multiple shorter periods. The server-side
      auto-end of session rows older than 12 hours remains, but is now
      framed as stale-session housekeeping (not a session-length cap).

C-08: F-13 guest-task persistence revised. Guest tasks are stored in
      sessionStorage (not in-memory React state) so they persist across
      page refreshes within the same browser tab. They are lost on tab
      close. The original wording "session-only and are lost on page
      refresh" is hereby superseded by "persist in sessionStorage and are
      lost on tab close."

---

## SECTION 6 (CONTINUED): DETAILED FEATURE SPECIFICATIONS

---
### F-07: Per-Period Reflection Prompt (COMPLETE SPEC)

**Description:** After each work period ends normally (not abandoned), an
optional structured reflection prompt is shown before the break begins. All
individual questions are optional. The entire prompt can be skipped.

**Trigger Conditions:**
- Work period has ended normally (not abandoned).
- Reflection toggle is ON (F-09).
- Applies to all three timer modes: Timer, Pomodoro, and Freestyle.
- Break does NOT begin until reflection is submitted or skipped.

**Default Prompt Structure:**

| Step | Prompt                                   | Type         | Condition              |
|------|------------------------------------------|--------------|------------------------|
| 1    | Task review and check-off                | Checklist    | Always shown           |
| 2    | How focused were you?                    | 1–4 scale    | Always shown           |
| 3    | What hindered your focus?                | Multi-select | Only if rating 1 or 2  |
| 3a   | What specifically caused it / how to     | Free text    | Only if Distractions   |
|      | avoid it                                 |              | selected in step 3     |
| 3b   | How can you structure your tasks better? | Free text    | Only if Unclear Tasks  |
|      |                                          |              | selected in step 3     |
| 4    | What did you do well?                    | Free text    | Always shown           |
| 5    | What can you do better?                  | Free text    | Always shown           |

**Focus Rating Scale:**

| Value | Label           |
|-------|-----------------|
| 4     | Very Focused    |
| 3     | Focused         |
| 2     | Somewhat Focused|
| 1     | Not Focused     |

**Hindrance Options (Step 3 — multi-select):**

| Option         | Triggers Follow-up |
|----------------|--------------------|
| Distractions   | Yes — free text    |
| Unclear Tasks  | Yes — free text    |
| Environment    | No                 |

**Task Review Behavior (Step 1):**
- The prompt displays all tasks the user interacted with (checked or
  unchecked) during the work period.
- The user may additionally check off tasks inside the prompt if not
  done during the period.
- Task check-off inside the prompt updates the task's completion state
  in the to-do list immediately.

**Skip Behavior:**
- User can skip individual questions. Skipped fields are saved as NULL.
- User can skip the entire reflection. No database entry is created.
- A "Skip All" / "Skip Reflection" button must be clearly visible at
  all times during the prompt.

**Prompt Customization:**
- Default prompts are defined in reflection-prompts.config.ts.
- Default prompts are seeded into the database per user on account creation.
- Authenticated users can edit prompt text from Settings.
- Authenticated users can reset all prompts to defaults from Settings.
- Custom prompt text has a maximum length of 1,280 characters per prompt.
- The config file is the source of truth for default values.

**Character Limits on Free Text Fields:**

| Field                              | Max Characters |
|------------------------------------|----------------|
| What specifically caused distraction| 500            |
| How to avoid distraction           | 500            |
| How to structure tasks better      | 500            |
| What did you do well               | 500            |
| What can you do better             | 500            |

**Save Behavior:**
- If user answers at least one question and submits: entry saved to DB
  with NULL values for unanswered fields.
- If user skips entire reflection: no DB entry created.
- If DB is unavailable on save: show friendly error message. Allow manual
  retry. Data is not cached locally in v1.

**Acceptance Criteria:**
- [ ] Reflection fires after work period ends normally, before break starts.
- [ ] Reflection does not fire after abandon/reset.
- [ ] All steps are individually skippable.
- [ ] "Skip Reflection" button dismisses entire prompt with no DB write.
- [ ] Focus rating conditional logic fires correctly for ratings 1 and 2 only.
- [ ] Hindrance multi-select shows correct follow-ups per selected options.
- [ ] Task check-offs inside prompt update to-do list state immediately.
- [ ] Partial submission saves NULL for unanswered fields.
- [ ] Free text fields enforce 500 character limit.
- [ ] Custom prompts display correctly when set by user.
- [ ] Reset to defaults restores config file values from DB seed.
- [ ] Break does not begin until reflection is submitted or skipped.

**Dependencies:** F-02, F-03, F-01, F-09, F-11, F-12, F-15

---

### F-08: End-of-Session Reflection

**Description:** When a full session ends — either all planned work periods
are complete or the user ends the session early — a separate, more extensive
reflection prompt appears. This is distinct from the per-period prompt.

**Trigger Conditions:**
- All planned work periods in a Pomodoro session complete, OR
- User presses "End Session" early in any mode, OR
- Timer mode completes (if reflection toggle is ON).
- Reflection toggle must be ON.

**Difference from Per-Period Prompt:**
- The end-of-session prompt covers the entire session, not just the last
  work period.
- Prompts are broader and more summary-oriented.
- The per-period prompt still fires for the final work period as normal.
  The end-of-session prompt fires after that per-period prompt is resolved.

**Default End-of-Session Prompt Structure:**

| Step | Prompt                                        | Type      |
|------|-----------------------------------------------|-----------|
| 1    | Full task review for the session              | Checklist |
| 2    | Overall session focus rating (1–4 scale)      | Scale     |
| 3    | What was your biggest accomplishment today?   | Free text |
| 4    | What was your biggest obstacle today?         | Free text |
| 5    | What will you do differently next session?    | Free text |

**Character Limits:**

| Field                                 | Max Characters |
|---------------------------------------|----------------|
| Biggest accomplishment                | 500            |
| Biggest obstacle                      | 500            |
| What to do differently                | 500            |

**Skip Behavior:** Identical to F-07 — all questions optional, full skip
creates no DB entry.

**Acceptance Criteria:**
- [ ] End-of-session prompt fires after the final per-period prompt is
    resolved, not instead of it.
- [ ] End-of-session prompt fires on early session end.
- [ ] All questions are individually optional.
- [ ] Full skip creates no DB entry.
- [ ] Task review covers all tasks interacted with during entire session.
- [ ] Free text fields enforce 500 character limit.
- [ ] End-of-session prompts are separately customizable from per-period
    prompts in Settings.

**Dependencies:** F-07, F-09, F-11, F-12

---

### F-09: Reflection Toggle

**Description:** A single toggle that enables or disables the reflection
prompt system for all timer modes.

**Behavior:**
- When OFF: no reflection prompt fires at end of any work period. No
  end-of-session reflection fires.
- When ON: both per-period (F-07) and end-of-session (F-08) reflections
  fire as specified.
- Toggle is available in Settings (F-30).
- Available to all users including guests. Guest setting stored in cookie.

**Default Value:** ON

**Acceptance Criteria:**
- [ ] Toggle OFF suppresses all reflection prompts across all modes.
- [ ] Toggle ON restores all reflection behavior.
- [ ] Toggle state persists in DB for authenticated users.
- [ ] Toggle state persists in cookie for guest users.
- [ ] Default value is ON for all new users and new guest sessions.

**Dependencies:** F-07, F-08, F-30

---

### F-10: Reflection Log Viewer

**Description:** A dedicated screen where authenticated users can review all
past reflection entries, grouped and filterable.

**Grouping:** Entries are grouped by day by default.

**Filter Options:**
- Day view
- Week view
- Month view
- By task name (filter to entries where a specific task was checked)
- By focus rating (filter to entries where rating equals selected value)

**Display Requirements:**
- Each entry shows: date, time, mode used, focus rating, task list
  snapshot, all answered questions and their responses.
- Unanswered (NULL) fields are not displayed — they are simply omitted.
- Filters must be minimal and uncluttered — no more than one filter bar
  with dropdowns.
- End-of-session entries are visually distinguished from per-period entries.

**Edit Behavior:**
- Users can edit any past reflection entry.
- Editing updates the DB record directly.
- No audit log of edits in v1.

**Acceptance Criteria:**
- [ ] All past reflection entries for the authenticated user are displayed.
- [ ] Entries are grouped by day by default.
- [ ] Week and month view groupings work correctly.
- [ ] Task name filter returns all entries where that task appears.
- [ ] Focus rating filter returns all entries with that exact rating.
- [ ] NULL fields are omitted from display, not shown as empty.
- [ ] End-of-session entries are visually distinct from per-period entries.
- [ ] Edit saves correctly to DB.
- [ ] No other user's reflection data is ever accessible.

**Dependencies:** F-07, F-08

---

### F-11: User-Customizable Reflection Prompts

**Description:** Authenticated users can edit the text of any default
reflection prompt from within Settings.

**Behavior:**
- Each prompt field is individually editable.
- Changes are saved to the user's DB record (not the config file).
- The config file (reflection-prompts.config.ts) is never modified at
  runtime.
- Custom prompt text max: 1,280 characters per prompt.
- Changes take effect on the next reflection prompt that fires.

**Acceptance Criteria:**
- [ ] All default prompts are editable from Settings.
- [ ] Edited prompts are saved per user in DB.
- [ ] Edited prompts appear correctly in subsequent reflection prompts.
- [ ] Character limit of 1,280 per prompt is enforced client and server.
- [ ] Config file is never written to at runtime.

**Dependencies:** F-07, F-08, F-12, F-30

---

### F-12: Reflection Prompt Reset to Defaults

**Description:** A reset button in Settings restores all reflection prompts
to their default values from the config file.

**Behavior:**
- Reset overwrites all user-customized prompt text in DB with the values
  from reflection-prompts.config.ts.
- A confirmation dialog must appear before reset executes.
- Confirmation dialog text: "This will reset all your custom prompts to
  their original defaults. This cannot be undone."
- Reset affects all prompts simultaneously — there is no per-prompt reset
  in v1.

**Acceptance Criteria:**
- [ ] Reset button is present in Settings alongside prompt customization.
- [ ] Confirmation dialog appears before reset executes.
- [ ] After reset, all prompts match the values in reflection-prompts.config.ts
    exactly.
- [ ] Reset cannot be undone — no undo mechanism in v1.

**Dependencies:** F-11, F-30

---

### F-13: To-Do List CRUD

**Description:** A persistent per-user task list displayed below the timer.
Full create, read, update, and delete functionality.

**Task Fields:**

| Field         | Type    | Constraints                        |
|---------------|---------|------------------------------------|
| name          | string  | Required. Max 64 characters.       |
| time_estimate | integer | Required. Positive integer.        |
|               |         | Unit: minutes only.                |
|               |         | Min: 1. Max: 1440 (24 hours).      |
| is_complete   | boolean | Defaults to false.                 |
| sort_order    | integer | Managed by drag-and-drop (F-14).   |

**Limits:**
- Maximum 20 tasks per authenticated user at any time.
- Guest users: maximum 20 tasks per session (session-only, not saved).
- Attempting to add a 21st task: show inline message:
  "You've reached the maximum of 20 tasks."

**Persistence:**
- Authenticated users: tasks saved to DB, persist across sessions.
- Guest users: tasks stored in browser sessionStorage. Persist across page
  refreshes within the same tab. Lost when the tab is closed. [C-08]

**Empty State:** No placeholder text, no onboarding prompt. Empty list
area is shown with no content.

**Acceptance Criteria:**
- [ ] User can create a task with name and time estimate.
- [ ] User can edit a task's name and time estimate.
- [ ] User can delete a task.
- [ ] User can mark a task complete/incomplete.
- [ ] Maximum of 20 tasks enforced with inline message on violation.
- [ ] Tasks persist in DB for authenticated users.
- [ ] Guest tasks persist across page refreshes in the same tab; are lost on tab close. [C-08]
- [ ] Empty state shows no content.
- [ ] Name field enforces 64 character limit.
- [ ] Time estimate field accepts integers only, min 1, max 1440.
- [ ] Starting a timer with zero tasks is fully allowed.

**Dependencies:** F-14, F-15

---

### F-14: Task Drag-and-Drop Reordering

**Description:** Users can reorder tasks in the to-do list via drag-and-drop.
Modeled on Pomofocus interaction pattern.

**Behavior:**
- Drag handle is visible on each task row.
- Dropping a task updates its sort_order value in DB immediately.
- Reorder is available during active timer sessions as well as idle.
- Applies to both authenticated (DB-persisted) and guest (session-only)
  task lists.

**Acceptance Criteria:**
- [ ] Drag handle is visible and accessible on all task rows.
- [ ] Dragging and dropping reorders tasks visually immediately.
- [ ] New sort order is persisted to DB for authenticated users.
- [ ] New sort order persists in session for guest users.
- [ ] Reorder works during an active timer session.

**Dependencies:** F-13

---

### F-15: Task Check-Off During Work Period

**Description:** During an active work period, users can mark tasks as
complete or incomplete directly from the to-do list visible on the main screen.

**Behavior:**
- Checked tasks are visually distinguished (e.g., strikethrough + muted
  color using --color-text-secondary).
- Checked tasks are recorded and displayed in the reflection prompt at
  the end of the work period.
- Unchecking a task during the period removes it from the reflection's
  completed list.
- Task completion state persists in DB for authenticated users.

**Acceptance Criteria:**
- [ ] Tasks can be checked and unchecked during an active work period.
- [ ] Checked tasks appear visually distinct from unchecked tasks.
- [ ] Reflection prompt shows only tasks checked during that period.
- [ ] Unchecking a task before reflection removes it from the prompt.
- [ ] Task completion state is saved to DB immediately on check.

**Dependencies:** F-07, F-13

---

### F-16: Break Activity List CRUD

**Description:** A per-user persistent list of named activities with
associated time estimates. Used by the break activity popup (F-17).

**Activity Fields:**

| Field         | Type    | Constraints                          |
|---------------|---------|--------------------------------------|
| name          | string  | Required. Max 64 characters.         |
| time_estimate | integer | Required. Positive integer. Minutes. |
|               |         | Min: 1. Max: 1440.                   |

**Limits:**
- Default maximum: 10 activities per user.
- User-configurable maximum: up to 30 activities.
- Attempting to exceed configured maximum: show inline message:
  "You've reached your activity limit. You can increase this in Settings
  (maximum 30)."

**Persistence:** Per user, permanent until deleted. Not session-specific.

**Acceptance Criteria:**
- [ ] User can create, read, update, and delete break activities.
- [ ] Name field enforces 64 character maximum.
- [ ] Time estimate accepts integers only, min 1, max 1440.
- [ ] Default limit of 10 enforced with inline message on violation.
- [ ] User can increase limit up to 30 in Settings.
- [ ] Activities persist across sessions.
- [ ] Available to authenticated users only.

**Dependencies:** F-17, F-30

### F-17: Break Activity Popup (COMPLETION)

...(all prior F-17 content confirmed above)...

**Acceptance Criteria (complete):**
- [ ] Popup appears automatically when a break period begins.
- [ ] All user break activities are listed.
- [ ] Activities exceeding break duration appear in --color-warning.
- [ ] Warning color is informational only — activity remains selectable.
- [ ] Selecting an activity closes the popup and logs the activity.
- [ ] Skip/dismiss button is always visible and functional.
- [ ] Dismissing logs nothing for that break.
- [ ] Break timer starts regardless of whether activity is selected.
- [ ] Popup is available in Pomodoro and Freestyle modes only.
- [ ] Popup does NOT appear in Timer mode under any condition.
- [ ] No "break debt" concept exists anywhere in the codebase.

**Dependencies:** F-02, F-03, F-16, F-18

---

### F-18: Break Activity Log Page

**Description:** A dedicated page where authenticated users can review a
chronological log of all break activities they have selected, organized
by day.

**User Value:** Allows users to review how they are spending their breaks
over time and whether break habits are consistent.

**Preconditions:**
- User is authenticated.
- At least one break activity has been selected and logged.

**Display Fields Per Log Entry:**

| Field          | Description                                      |
|----------------|--------------------------------------------------|
| Date           | Date the break occurred                          |
| Activity name  | Name of the selected break activity              |
| Start time     | Timestamp when the break period began            |
| End time       | Timestamp when the break period ended            |
| Duration       | Calculated: end time minus start time (minutes)  |

**Grouping:** Entries are grouped by day. Most recent day shown first.

**Empty State:** If no break activities have been logged, display:
"No break activities logged yet."

**Scope:** This log page is entirely separate from the Reflection Log
(F-10) and the Reports Tab (F-28). It must not be merged with either.

**Acceptance Criteria:**
- [ ] All logged break activities are displayed for the authenticated user.
- [ ] Entries are grouped by day, most recent first.
- [ ] Each entry shows: activity name, start time, end time, duration.
- [ ] Breaks where no activity was selected are not logged and do not
    appear.
- [ ] No other user's break log data is ever accessible.
- [ ] Empty state message displays when no entries exist.
- [ ] Page is accessible only to authenticated users.

**Dependencies:** F-16, F-17

---

### F-19: Google OAuth Authentication

**Description:** The only authentication method. Users sign in via Google.
No email/password alternative exists in v1. [1]

**Library:** passport.js with passport-google-oauth20 strategy.

**Flow:**
1. User clicks "Sign in with Google" button.
2. App redirects to Google OAuth consent screen.
3. User grants permissions.
4. Google redirects to app callback URL.
5. passport.js validates the response.
6. On first login: user record is created in DB. Default settings are
   seeded. Default reflection prompts are seeded from
   reflection-prompts.config.ts.
7. On subsequent logins: existing user record is loaded.
8. HTTP-only session cookie is set (F-20).
9. User is redirected to main app screen.

**Data Collected from Google:**

| Field          | Used For                    | Stored |
|----------------|-----------------------------|--------|
| Google ID      | Unique user identifier      | Yes    |
| Email address  | Display, admin lookup       | Yes    |
| Display name   | UI greeting                 | Yes    |
| Profile picture| Avatar display (optional)   | Yes    |

**No other Google data is requested or stored.**

**Failure States:**

| Failure Scenario         | User-Facing Message                              |
|--------------------------|--------------------------------------------------|
| Google is unreachable    | "We couldn't connect to Google. Please try       |
|                          |  again in a moment."                             |
| User denies permissions  | "Sign-in was cancelled. Please try again and     |
|                          |  allow the required permissions."                |
| OAuth callback error     | "Something went wrong during sign-in. Please     |
|                          |  try again."                                     |

**Rules:**
- Never display raw error codes, stack traces, or HTTP status codes to
  the user.
- OAuth callback endpoint must be rate-limited: 10 attempts per IP
  per hour.
- If user revokes Google access from Google's account settings: user's
  app account and all data are preserved. Account persists until the
  user explicitly deletes it from within the app.

**Acceptance Criteria:**
- [ ] Google OAuth flow completes and creates a session on success.
- [ ] First login creates user record and seeds settings + prompts.
- [ ] Subsequent logins load existing user record.
- [ ] All three failure states show correct friendly messages.
- [ ] No technical error details are ever shown to the user.
- [ ] OAuth callback endpoint is rate-limited.
- [ ] Revoking Google access does not delete app account or data.

**Dependencies:** F-20, F-30

---

### F-20: HTTP-Only Cookie Session Management

**Description:** After authentication, the user's session is maintained
via an HTTP-only cookie. The session record is stored server-side in the
Neon PostgreSQL database via connect-pg-simple.

**Library:** express-session + connect-pg-simple.

**Session Configuration Rules:**

| Setting         | Value                                             |
|-----------------|---------------------------------------------------|
| Cookie type     | HTTP-only                                         |
| Secure flag     | true (HTTPS only in production)                   |
| SameSite        | lax                                               |
| Session store   | connect-pg-simple (Neon DB sessions table)        |
| Session expiry  | 7 days of inactivity                              |
| Max session age | 30 days absolute maximum                          |

**Session Expiry Cleanup:**
- A scheduled cleanup job must run periodically to delete expired session
  rows from the sessions table.
- connect-pg-simple provides a built-in pruning interval. This must be
  configured and enabled. It must not be left at default (disabled).
- [ASSUMPTION] Cleanup interval is set to every 24 hours.

**Session Expiry During Active Timer:**
- If a user's session expires while the timer is running:
  1. Timer pauses.
  2. User sees prompt: "Your session has expired. Please sign in again
     to continue."
  3. User re-authenticates via Google OAuth.
  4. Timer state is restored from local state.
  5. Session continues.

**Acceptance Criteria:**
- [ ] Session cookie is HTTP-only and Secure in production.
- [ ] Session is stored server-side in Neon DB.
- [ ] Session expires after 7 days of inactivity.
- [ ] Session expires after 30 days absolute maximum.
- [ ] Expired session during active timer pauses timer and prompts
    re-authentication.
- [ ] Session cleanup job runs on configured interval.
- [ ] Session is destroyed immediately on logout.
- [ ] Session is destroyed immediately on account deletion (F-21).

**Dependencies:** F-19, F-21

---

### F-21: Account Deletion

**Description:** Authenticated users can permanently delete their account
and all associated data from within the app. This action is irreversible. [1]

**Location:** Account settings page.

**Deletion Cascade — All of the following must be deleted:**

| Table / Data           | Deletion Type  |
|------------------------|----------------|
| User record            | Hard delete    |
| All tasks              | Cascade delete |
| All reflections        | Cascade delete |
| All break activities   | Cascade delete |
| All break activity logs| Cascade delete |
| All session records    | Cascade delete |
| All settings records   | Cascade delete |
| All custom prompts     | Cascade delete |

**Flow:**
1. User navigates to account settings.
2. User clicks "Delete Account".
3. Confirmation dialog appears with text: "This will permanently delete
   your account and all your data. This cannot be undone."
4. User must type "DELETE" in a confirmation input field to proceed.
5. User clicks confirm.
6. All user data is deleted via cascade.
7. Active session is destroyed server-side immediately.
8. User is redirected to logged-out landing screen.

**Rules:**
- No soft delete. No recovery mechanism in v1.
- Session must be destroyed server-side before the response is returned
  to the client.
- Deletion must be atomic — either all data is deleted or none is.
  Use a database transaction.

**Acceptance Criteria:**
- [ ] Delete Account option is accessible from account settings.
- [ ] Confirmation dialog appears with correct warning text.
- [ ] User must type "DELETE" to confirm — button is disabled until
    input matches exactly.
- [ ] All associated data is deleted via cascade on confirmation.
- [ ] Deletion executes within a single database transaction.
- [ ] Session is destroyed server-side immediately after deletion.
- [ ] User is redirected to logged-out screen after deletion.
- [ ] No data recovery is possible after deletion.

**Dependencies:** F-20, F-33

---

### F-22: Demo Mode (Logged-Out Experience)

**Description:** Unauthenticated visitors can use a functional subset of
the app without creating an account. [1]

**Available in Demo Mode:**

| Feature               | Available | Notes                              |
|-----------------------|-----------|------------------------------------|
| Timer (all 3 modes)   | Yes       | Fully functional                   |
| To-do list            | Yes       | Session-only. Lost on page refresh.|
| Music player          | Yes       | Fully functional                   |
| Reflection prompt     | No        | Hidden entirely                     |
| Break activity popup  | No        | Hidden entirely                     |
| Settings              | Yes       | Stored in cookie only (C-01, C-02) |
| Reports tab           | No        | Hidden entirely                     |
| Break activity log    | No        | Hidden entirely                     |
| Reflection log        | No        | Hidden entirely                     |

**Rules:**
- Demo mode must never write to the database under any condition.
- Demo to-do list is stored in session memory only. It resets on page
  refresh.
- No implicit account creation occurs from demo mode.
- A persistent "Sign in with Google" button must be visible at all times
  in demo mode.
- Settings in demo mode are stored in a browser cookie (non-PII only).
- Cookie must not store any personally identifiable information.

**Acceptance Criteria:**
- [ ] Timer (all 3 modes) is fully functional without login.
- [ ] To-do list is functional but resets on page refresh.
- [ ] Music player is functional without login.
- [ ] Reflection, break activity popup, Reports, and logs are not visible
    or accessible to guests.
- [ ] No database writes occur during any guest interaction.
- [ ] "Sign in with Google" button is persistently visible in demo mode.
- [ ] Guest settings are stored in cookie and persist across page loads
    on the same device.
- [ ] Guest cookie contains no PII.

**Dependencies:** F-01, F-02, F-03, F-13, F-27, F-30

---

### F-23: Session Resume Prompt After Browser Close

**Description:** If a user closes the browser or tab mid-session, the
app saves the current session state. On return, the user is prompted to
resume or start fresh.

**State Persisted:**
- Current timer mode.
- Current period type (work/break).
- Remaining time at the moment of close (calculated via timestamps).
- Current Pomodoro count (Pomodoro mode).
- Accumulated break time (Freestyle mode, if accumulation is ON).
- Current to-do list state.

**Staleness Cutoff:** 7 days. If the user returns more than 7 days after
closing, no resume prompt is shown. The app starts fresh silently.

**Resume Prompt Text:**
"It looks like you have an unfinished session. Would you like to pick up
where you left off, or start a new session?"

**Options:**
- "Resume Session" — restores timer state from saved timestamps.
- "Start New Session" — clears saved state and starts fresh.

**Resume Behavior:**
- Remaining time is recalculated from the saved close timestamp.
- The period is NOT treated as if the full period elapsed while the
  browser was closed.
- Timer is restored in a PAUSED state. User must press Start to resume.

**Acceptance Criteria:**
- [ ] Session state is saved to DB when browser/tab is closed.
- [ ] Resume prompt appears on return if state is less than 7 days old.
- [ ] No resume prompt appears if state is older than 7 days.
- [ ] "Resume Session" restores timer in paused state with correct
    remaining time.
- [ ] "Start New Session" clears saved state completely.
- [ ] Remaining time is recalculated from timestamps, not assumed elapsed.
- [ ] Feature applies to authenticated users only. Guests get no resume
    prompt.

**Dependencies:** F-01, F-02, F-03, F-04, F-20

---

### F-24: Two-Tab Conflict Detection

**Description:** If an authenticated user opens the app in two browser
tabs and starts the timer in both, the second tab must detect the conflict
and warn the user.

**Implementation:** Native browser BroadcastChannel API. No server
involvement required.

**Behavior:**
- When Tab 1 starts a timer: it broadcasts a "session_started" message
  on a named channel (e.g., "simplidoro_timer").
- Tab 2 listens on the same channel.
- If Tab 2 receives "session_started" while its own timer is running
  or is about to start: Tab 2 displays a non-blocking warning banner:
  "Simplidoro is already running in another tab. Please use that tab
  to avoid conflicts."
- Tab 1 continues uninterrupted.
- Tab 2's timer is blocked from starting while the warning is displayed.
- If Tab 1's session ends: it broadcasts "session_ended". Tab 2 clears
  the warning and allows normal use.

**Acceptance Criteria:**
- [ ] Starting timer in Tab 1 broadcasts session_started.
- [ ] Tab 2 detects session_started and shows warning banner.
- [ ] Tab 2 timer is blocked while warning is active.
- [ ] Ending session in Tab 1 broadcasts session_ended.
- [ ] Tab 2 clears warning on session_ended.
- [ ] Warning is non-blocking — Tab 2 remains usable for non-timer
    features.
- [ ] No server calls are made for this feature.
- [ ] BroadcastChannel is used exclusively — no localStorage polling.

**Dependencies:** F-01, F-02, F-03

---

### F-25: Theme System

**Description:** The app supports multiple visual themes. Each theme
defines an 8-slot color palette. Three semantic colors are fixed across
all themes.

**8-Slot Theme Palette:**

| Slot                  | Purpose                                      |
|-----------------------|----------------------------------------------|
| --color-bg-primary    | Main background                              |
| --color-bg-secondary  | Cards, panels, modals                        |
| --color-bg-tertiary   | Hover states, subtle surfaces                |
| --color-text-primary  | Main readable text                           |
| --color-text-secondary| Subdued text, labels, captions               |
| --color-accent        | Buttons, active states, highlights           |
| --color-border        | Dividers, input borders                      |
| --color-timer         | Timer digit display specifically             |

**3 Fixed Semantic Colors (identical across all themes):**

| Slot              | Purpose                                 | Value    |
|-------------------|-----------------------------------------|----------|
| --color-error     | Error messages, destructive actions     | #e05252  |
| --color-warning   | Break activity time warnings            | #d4a017  |
| --color-success   | Save confirmations, completed tasks     | #4caf82  |

**Default Theme — Black and White Dark Mode:**

| Slot                   | Value   |
|------------------------|---------|
| --color-bg-primary     | #0a0a0a |
| --color-bg-secondary   | #141414 |
| --color-bg-tertiary    | #1f1f1f |
| --color-text-primary   | #f5f5f5 |
| --color-text-secondary | #a0a0a0 |
| --color-accent         | #ffffff |
| --color-border         | #2e2e2e |
| --color-timer          | #ffffff |

**Additional Themes:**
- Additional custom themes will be provided by the project owner after
  initial build.
- The theme system must be architected so that adding a new theme requires
  only adding a new entry to a themes configuration object. No component
  changes should be required to add a theme.

**Theme Persistence:**
- Authenticated users: selected theme saved in DB settings record.
- Guest users: selected theme saved in cookie.

**Acceptance Criteria:**
- [ ] All 8 color slots are applied consistently across all components.
- [ ] Semantic colors are fixed and do not change between themes.
- [ ] Default theme is Black and White Dark Mode.
- [ ] Adding a new theme requires only a config object change.
- [ ] Theme selection persists in DB for authenticated users.
- [ ] Theme selection persists in cookie for guest users.
- [ ] No hardcoded color values exist anywhere in component styles —
    all colors reference CSS custom properties only.

**Dependencies:** F-30

---

### F-26: Font Selector

**Description:** Users can select their preferred font from a curated
list of 7 Google Fonts. The selected font is applied globally across
the entire app.

**Available Fonts:**

| Font         | Style              | Source       |
|--------------|--------------------|--------------|
| Inter        | Modern sans-serif  | Google Fonts |
| Open Sans    | Clean sans-serif   | Google Fonts |
| DM Mono      | Monospace          | Google Fonts |
| Merriweather | Serif              | Google Fonts |
| Lora         | Literary serif     | Google Fonts |
| EB Garamond  | Classical serif    | Google Fonts |
| Caveat       | Handwritten        | Google Fonts |

**Default Font:** Inter.

**Implementation:**
- Fonts are loaded from Google Fonts via <link> tags in the document head.
- Only the selected font's weights need to be loaded at any time to
  minimize network requests.
- Font swap must use font-display: swap to prevent invisible text during
  load.

**Persistence:**
- Authenticated users: saved in DB settings record.
- Guest users: saved in cookie.

**Acceptance Criteria:**
- [ ] All 7 fonts are available in the font selector in Settings.
- [ ] Selecting a font applies it globally and immediately (no page reload).
- [ ] Default font is Inter.
- [ ] Font selection persists in DB for authenticated users.
- [ ] Font selection persists in cookie for guest users.
- [ ] font-display: swap is set for all Google Font loads.
- [ ] Only the active font is loaded — unused fonts are not prefetched.

**Dependencies:** F-30

---

### F-27: Built-In Ambient Sound Player

**Description:** A toggleable mini music player that plays looping ambient
sounds hosted on Cloudflare R2. Available to all users including guests. [1]

**Sound Categories:**

| ID | Name                        | Description                          |
|----|-----------------------------|--------------------------------------|
| S1 | Lofi Beats                  | Lo-fi hip hop style study music      |
| S2 | Jazz                        | Soft background jazz                 |
| S3 | White Noise                 | Continuous white noise               |
| S4 | Rain / Nature               | Rain and nature ambient sounds       |
| S5 | Brown Noise / Brainwave     | Brown noise with focus frequencies  |
| S6 | Cafe / Background Chatter   | Coffee shop ambient noise            |
| S7 | Silence                     | No audio — mutes player              |

**Audio File Requirements:**
- All audio files must be hosted on Cloudflare R2.
- All audio files must loop seamlessly with no audible gap at loop point.
- Supported format: .mp3 (primary), .ogg (fallback for browser
  compatibility).
- Files must be served via Cloudflare R2's public CDN URL.
- Vercel deployment must never include audio files — they are never
  bundled with the frontend build.

**Mini Player UI:**
- The player is a toggleable mini element — always accessible but
  unobtrusive.
- Position: [ASSUMPTION] bottom-right corner of the main screen.
- Player must not obscure any timer controls or to-do list items.
- Mini player contains:
  - Sound category selector (dropdown or icon grid).
  - Play / Pause button.
  - Volume slider (separate from alarm volume — see F-06).
  - A toggle to show/hide the player entirely.

**Auto-Play Behavior:**
- An optional setting controls whether music auto-plays when a work
  period starts and auto-pauses when a break begins.
- This setting defaults to OFF.
- When OFF: music is entirely manual — user controls playback themselves.
- When ON: music starts on work period start, pauses on break start,
  resumes on next work period start.
- Auto-play requires prior user interaction with the page (timer Start
  button counts as valid interaction). [1]

**Volume:**
- Music volume is controlled by a dedicated slider in the mini player.
- Music volume is stored separately from alarm volume in user settings.
- Range: 0–100. Default: 50.

**Persistence:**
- Authenticated users: last selected sound and volume saved in DB
  settings record.
- Guest users: last selected sound and volume saved in cookie.

**Acceptance Criteria:**
- [ ] All 7 sound categories are available in the player.
- [ ] Audio files are served from Cloudflare R2, never bundled locally.
- [ ] Audio loops seamlessly with no audible gap.
- [ ] Mini player is visible and accessible without obscuring timer
    controls.
- [ ] Play/pause, sound selector, and volume slider are present in player.
- [ ] Auto-play setting defaults to OFF.
- [ ] When auto-play is ON: music starts with work period, pauses on
    break, resumes on next work period.
- [ ] Music volume is independent of alarm volume.
- [ ] Sound selection and volume persist in DB for authenticated users.
- [ ] Sound selection and volume persist in cookie for guest users.
- [ ] Player is functional in demo mode (guests).
- [ ] .ogg fallback is served if browser does not support .mp3.

**Dependencies:** F-22, F-30

---

### F-28: Reports Tab

**Description:** A dedicated tab in the main navigation where authenticated
users can review their productivity statistics over time.

**Navigation:** The Reports tab must be a top-level navigation element
styled similarly to Pomofocus's tab button pattern — visible at all times
when authenticated. [1]

**V1 Metrics:**

#### Metric 1 — Streak Counter

| Property     | Detail                                              |
|--------------|-----------------------------------------------------|
| Definition   | Consecutive calendar days on which the user         |
|              | completed at least one full work period             |
| Display      | Prominent number with label: "Day Streak"           |
| Reset rule   | Streak resets to 0 if user completes no work period |
|              | on a calendar day (midnight in user's local time)   |
| Freeze rule  | Current day in progress does not break streak even  |
|              | if no session completed yet                         |

#### Metric 2 — Average Focus Rating Graph

| Property     | Detail                                              |
|--------------|-----------------------------------------------------|
| Definition   | Average of all per-period focus ratings (1–4) per   |
|              | day or per week                                     |
| Display      | Line or bar graph (engineer's discretion within     |
|              | minimal aesthetic)                                  |
| Toggle       | User can switch between daily view and weekly view  |
| Y-axis range | 1–4 fixed. Labels: Not Focused / Somewhat Focused / |
|              | Focused / Very Focused                              |
| Empty state  | "No focus data yet. Complete a session with         |
|              | reflection enabled to see your ratings."            |

#### Metric 3 — Total Focused Time

| Property     | Detail                                              |
|--------------|-----------------------------------------------------|
| Definition   | Total minutes of completed work periods per day     |
|              | and per week                                        |
| Display      | Bar graph or summary cards (engineer's discretion)  |
| Toggle       | User can switch between daily view and weekly view  |
| Unit         | Display in hours and minutes (e.g., "2h 35m")       |
| Empty state  | "No sessions recorded yet."                         |

**General Rules:**
- All data on Reports tab is scoped strictly to the authenticated user.
- No user can access another user's report data under any condition.
- Reports tab is not accessible in demo mode.
- Graphs must be readable on mobile (vertically scrollable if needed).
- No third-party charting library may be introduced without owner
  approval. [OPEN] Owner must confirm charting library preference before
  implementation. Recommended: Recharts (lightweight, React-native,
  no additional bundle overhead concern at this scale).

**Acceptance Criteria:**
- [ ] Reports tab is visible in main navigation for authenticated users.
- [ ] Reports tab is hidden entirely for guest users.
- [ ] Streak counter displays correct consecutive day count.
- [ ] Streak resets correctly at midnight on a missed day.
- [ ] Focus rating graph renders correctly for daily and weekly views.
- [ ] Focus rating graph Y-axis is fixed 1–4.
- [ ] Total focused time graph renders correctly for daily and weekly
    views.
- [ ] All time displays use hours and minutes format.
- [ ] All empty states display correct messages.
- [ ] No other user's data is ever rendered on this screen.
- [ ] All graphs are readable on mobile viewport.

**Dependencies:** F-07, F-08, F-02, F-03

---

### F-29: Hidden Admin Role

**Description:** A special user role that grants elevated data management
capabilities. The admin role must never be visible anywhere in the
application UI. [1]

**Admin Capabilities in V1:**
- Clear (permanently delete) any user's complete data by username or email.
- This is the only admin capability in v1.

**Admin Promotion:**
- Admin status is granted by directly updating the user's role column
  in the database.
- There is no in-app mechanism to grant or view admin status.
- Only the project owner holds admin status in v1.

**Admin Interface:**
- There is NO admin dashboard UI in v1.
- Admin operations are performed via direct database access or a
  separate, undocumented internal API endpoint that is:
  - Protected by admin role check on every request.
  - Not linked from any UI element.
  - Not documented in any user-facing context.

**Admin API Endpoint Specification:**

| Property   | Value                                              |
|------------|----------------------------------------------------|
| Endpoint   | POST /internal/admin/clear-user                    |
| Auth       | Requires valid session + role === 'admin'          |
| Body       | { identifier: string } (email or username)         |
| Action     | Deletes all data for matched user (same cascade    |
|            | as F-21 account deletion)                          |
| Response   | 200 on success. 403 if not admin. 404 if user      |
|            | not found.                                         |

**Security Rules:**
- Every request to /internal/admin/* must verify role === 'admin'
  server-side. Client-side role checks are insufficient and must never
  be used as the sole guard.
- Admin endpoints must be rate-limited independently.
- Admin actions must be logged server-side with timestamp, admin user
  ID, and target user identifier.
- The existence of admin endpoints must never be referenced in frontend
  code, API documentation, or error messages visible to users.

**Acceptance Criteria:**
- [ ] Admin role column exists on user table with default value 'user'.
- [ ] Admin endpoint rejects all requests where role !== 'admin'.
- [ ] Admin endpoint clears target user data using same cascade as F-21.
- [ ] Admin endpoint returns correct status codes per spec above.
- [ ] No UI element references or reveals the admin role.
- [ ] Admin actions are logged server-side.
- [ ] Admin endpoint is rate-limited.

**Dependencies:** F-21

---

### F-30: Settings Page

**Description:** A dedicated settings screen accessible to all users
including guests. [1] Guest settings are stored in browser cookies.
Authenticated user settings are stored in the database and override
cookie values on login.

**Settings Groups and Options:**

#### Group 1: Timer Settings

| Setting                  | Type     | Options / Range          | Default  | Modes     |
|--------------------------|----------|--------------------------|----------|-----------|
| Work period duration     | Number   | 1–720 minutes            | 25       | Pomodoro  |
| Short break duration     | Number   | 1–720 minutes            | 5        | Pomodoro  |
| Long break duration      | Number   | 1–720 minutes            | 20       | Pomodoro  |
| Long break frequency     | Number   | 0–99 work periods        | 4        | Pomodoro  |
|                          |          | (0 = disabled)           |          |           |
| Auto Start Breaks        | Toggle   | On / Off                 | Off      | Pomodoro  |
| Auto Start Pomodoros     | Toggle   | On / Off                 | Off      | Pomodoro  |
| Freestyle ratio          | Decimal  | > 0, max 2 decimal       | 5:1      | Freestyle |
|                          |          | places                   |          |           |
| Freestyle accumulation   | Toggle   | On / Off                 | On       | Freestyle |

#### Group 2: Alarm Settings

| Setting                  | Type     | Options / Range          | Default  |
|--------------------------|----------|--------------------------|----------|
| Alarm sound              | Dropdown | Bell, Bird, Digital,     | Bell     |
|                          |          | Kitchen, Custom URL      |          |
| Custom alarm URL         | Text     | https:// only. Must end  | Empty    |
|                          |          | in .mp3/.ogg/.wav/       |          |
|                          |          | .m4a/.webm. Max 2048     |          |
|                          |          | chars. Client-side load  |          |
|                          |          | only. Never server-side. |          |
| Alarm volume             | Slider   | 0–100                    | 80       |
| Times alarm repeats      | Number   | 1–5                      | 1        |
| Browser notifications    | Toggle   | On / Off                 | Off      |

#### Group 3: Reflection Settings

| Setting                  | Type     | Options / Range          | Default  |
|--------------------------|----------|--------------------------|----------|
| Reflection enabled       | Toggle   | On / Off                 | On       |
| Customize prompts        | Button   | Opens prompt editor      | —        |
| Reset prompts to default | Button   | Confirmation required    | —        |

#### Group 4: Music Settings

| Setting                  | Type     | Options / Range          | Default  |
|--------------------------|----------|--------------------------|----------|
| Auto-play with timer     | Toggle   | On / Off                 | Off      |
| Music volume             | Slider   | 0–100                    | 50       |
| Break activity limit     | Number   | 1–30                     | 10       |

#### Group 5: Appearance Settings

| Setting                  | Type     | Options / Range          | Default      |
|--------------------------|----------|--------------------------|--------------|
| Theme                    | Selector | All available themes     | BW Dark Mode |
| Font                     | Selector | 7 Google Fonts           | Inter        |
| Hour format              | Dropdown | 12-hour / 24-hour        | 12-hour      |

#### Group 6: Account Settings (Authenticated Only)

| Setting                  | Type     | Notes                              |
|--------------------------|----------|------------------------------------|
| View keyboard shortcuts  | Button   | Opens shortcut reference panel     |
| Delete account           | Button   | Triggers F-21 flow                 |

**Cookie Storage for Guests:**
- Cookie name: simplidoro_settings
- Cookie must be non-PII, non-sensitive data only.
- Cookie expiry: 365 days.
- Cookie must be set with SameSite=Lax and Secure in production.
- Cookie must never contain session tokens, user IDs, or any
  authentication data.

**Settings Sync on Login:**
- When a guest logs in, their cookie settings are compared to their
  DB settings record.
- [ASSUMPTION] DB settings take precedence over cookie settings on
  login conflict. Cookie is then overwritten with DB values.

**Acceptance Criteria:**
- [ ] All settings listed in the table above are present and functional.
- [ ] Settings page is accessible to both guests and authenticated users.
- [ ] Guest settings are stored in cookie with correct attributes.
- [ ] Authenticated user settings are stored in DB.
- [ ] DB settings override cookie on login.
- [ ] Long break frequency of 0 disables long breaks correctly.
- [ ] Custom alarm URL validates https:// and known audio extension.
- [ ] Custom alarm URL is never sent to or processed by server.
- [ ] Custom alarm URL falls back to default Bell if load fails.
- [ ] All number inputs enforce their min/max ranges.
- [ ] Decimal inputs enforce max 2 decimal places.
- [ ] Account settings group is hidden entirely from guests.

**Dependencies:** F-01, F-02, F-03, F-06, F-09, F-11, F-12, F-16,
                  F-25, F-26, F-27, F-31

---

### F-31: Keyboard Shortcuts

**Description:** The app supports keyboard shortcuts for core actions.
A reference list of all shortcuts is accessible from Settings.

**V1 Keyboard Shortcuts:**

| Action                   | Shortcut         |
|--------------------------|------------------|
| Start / Pause timer      | Space            |
| Abandon / Reset period   | R                |
| Skip to next period      | N                |
| Toggle music play/pause  | M                |
| Open settings            | S                |
| Open reports tab         | T                |
| Close modal / popup      | Escape           |

**Reference Panel:**
- Accessible via a "Keyboard Shortcuts" button in Settings (Group 6).
- Opens as a modal overlay listing all shortcuts in a clean table.
- Must be accessible via keyboard itself (Escape to close).

**Rules:**
- Keyboard shortcuts must not fire when a text input field is focused
  to prevent input interference.
- Shortcuts must be documented in the reference panel — no undocumented
  shortcuts in v1.

**Acceptance Criteria:**
- [ ] All shortcuts in the table above are functional.
- [ ] Shortcuts do not fire when text input is focused.
- [ ] Shortcut reference panel opens from Settings.
- [ ] Reference panel closes on Escape.
- [ ] Reference panel is keyboard-navigable.

**Dependencies:** F-30

---

### F-32: 12-Hour Period Hard Cap [C-07]

**Description:** No single work or break period — in any mode — may exceed
12 hours (720 minutes). Sessions may sum to longer total durations across
multiple shorter periods; the cap is per-period, not per-session.

**Enforcement:**
- Any single timer period duration input is capped at 720 minutes at
  the input level (see F-01, F-02, F-03 error states).
- Client-side: if a running period reaches the 12-hour mark while the
  user is active, the period auto-ends. The user sees: "This period
  has reached the maximum of 12 hours and has been ended automatically."
- End-of-session reflection fires normally on auto-end if reflection
  toggle is ON and the session-end criteria (per F-02 C-06) are met.
- Server-side housekeeping (separate from the period cap): session
  records with a start timestamp older than 12 hours and no recent
  activity are marked as ended to prevent stale rows accumulating.
  This is a cleanup mechanism only, not a session-length limit.

**Acceptance Criteria:**
- [ ] No timer duration input accepts a value above 720 minutes.
- [ ] Single periods exceeding 12 hours are auto-ended client-side.
- [ ] User is notified when a period is auto-ended by the cap.
- [ ] End-of-session reflection fires on period auto-end if toggle is ON
    AND session-end criteria (per F-02 C-06) are otherwise satisfied.
- [ ] Server-side stale-session cleanup runs independently and does not
    interrupt active periods within the 12-hour window.

**Dependencies:** F-01, F-02, F-03, F-08

---

### F-33: GDPR Compliance and Data Deletion

**Description:** The app collects and stores personal data from EU-based
users. Minimum GDPR compliance requirements must be met in v1.

**Data Collected and Stored:**

| Data Item             | Purpose                         | Sensitive |
|-----------------------|---------------------------------|-----------|
| Google ID             | Authentication                  | Yes       |
| Email address         | Identity, admin lookup          | Yes       |
| Display name          | UI greeting                     | No        |
| Profile picture URL   | Avatar display                  | No        |
| Reflection entries    | Productivity feedback           | Yes       |
| Task names            | Productivity tracking           | No        |
| Break activity logs   | Habit tracking                  | No        |
| Session timestamps    | Reports and streaks             | No        |
| Focus ratings         | Reports and reflection logs     | No        |
| Settings              | App preferences                 | No        |

**V1 GDPR Requirements:**

1. Privacy Policy: A privacy policy page must exist at /privacy. It
   must disclose what data is collected, why, and how to delete it.
   [ASSUMPTION] Privacy policy text will be authored by the project
   owner before launch. The engineering task is to create the page
   and link it from the login screen and footer.

2. Right to Erasure: Users can permanently delete all their data via
   F-21 (Account Deletion). This satisfies the GDPR right to erasure.
   Deletion must be complete and irreversible.

3. Data Disclosure: The app must not collect any Google profile data
   beyond what is listed in F-19. No additional scopes may be
   requested from Google OAuth.

4. Cookie Disclosure: A cookie notice must appear on first visit for
   guests informing them that the app uses cookies for settings
   preferences. Notice must include a link to /privacy.

**Extensive Developer Notes for GDPR:**

The following actions must be taken before launch to achieve minimum
GDPR compliance:

Step 1: Author a privacy policy. Include:
  - What data is collected (reference the table above).
  - Why it is collected (app functionality only).
  - Where it is stored (Neon PostgreSQL, Railway, Vercel).
  - How users can delete their data (account deletion in settings).
  - Contact information for the data controller (project owner).
  - Date the policy was last updated.

Step 2: Create /privacy route in the app.
  - Static page. No authentication required to view it.
  - Linked from: login screen, app footer, cookie notice.

Step 3: Implement cookie consent notice.
  - Appears on first visit for all users.
  - Non-blocking — app is usable without dismissing it.
  - "OK" button dismisses it and sets a cookie: simplidoro_cookie_consent
    = true, expires 365 days.
  - Links to /privacy.

Step 4: Verify deletion cascade.
  - Test that F-21 account deletion removes every row associated with
    the user across every table.
  - Use a database transaction for atomicity.
  - Log the deletion event server-side (without logging the deleted
    content itself).

Step 5: Verify OAuth scope is minimal.
  - Confirm Google OAuth only requests: profile, email.
  - Do not request calendar, drive, or any other Google scope.

**Acceptance Criteria:**
- [ ] /privacy page exists and is publicly accessible.
- [ ] Privacy policy is linked from login screen and footer.
- [ ] Cookie consent notice appears on first visit.
- [ ] Cookie consent

### F-33: GDPR Compliance and Data Deletion (CONTINUED)

**Acceptance Criteria (complete):**
- [ ] /privacy page exists and is publicly accessible.
- [ ] Privacy policy is linked from login screen and footer.
- [ ] Cookie consent notice appears on first visit for all users.
- [ ] Cookie consent notice links to /privacy.
- [ ] Cookie consent dismissal sets simplidoro_cookie_consent cookie.
- [ ] Cookie consent notice does not block app usage.
- [ ] Account deletion (F-21) removes every row associated with the
    user across every table — verified by test.
- [ ] Deletion executes in a single database transaction.
- [ ] Google OAuth requests only profile and email scopes.
- [ ] No additional Google scopes are ever requested.
- [ ] Deletion event is logged server-side without logging content.

**Dependencies:** F-19, F-21, F-30

---

## SECTION 6 COMPLETE

All 33 features have now been fully specified. The table below confirms
completion status for every feature in this batch.

---

## BATCH B — COMPLETION CHECKLIST

### Confirmed and Fully Specified in This Batch

| ID   | Feature                              | Status   |
|------|--------------------------------------|----------|
| F-01 | Timer Mode                           | ✅ Done  |
| F-02 | Pomodoro Mode                        | ✅ Done  |
| F-03 | Freestyle Mode                       | ✅ Done  |
| F-04 | Pause and Resume                     | ✅ Done  |
| F-05 | Abandon and Reset                    | ✅ Done  |
| F-06 | Alarm System                         | ✅ Done  |
| F-07 | Per-Period Reflection Prompt         | ✅ Done  |
| F-08 | End-of-Session Reflection            | ✅ Done  |
| F-09 | Reflection Toggle                    | ✅ Done  |
| F-10 | Reflection Log Viewer                | ✅ Done  |
| F-11 | User-Customizable Prompts            | ✅ Done  |
| F-12 | Prompt Reset to Defaults             | ✅ Done  |
| F-13 | To-Do List CRUD                      | ✅ Done  |
| F-14 | Task Drag-and-Drop Reordering        | ✅ Done  |
| F-15 | Task Check-Off During Work Period    | ✅ Done  |
| F-16 | Break Activity List CRUD             | ✅ Done  |
| F-17 | Break Activity Popup                 | ✅ Done  |
| F-18 | Break Activity Log Page              | ✅ Done  |
| F-19 | Google OAuth Authentication          | ✅ Done  |
| F-20 | HTTP-Only Cookie Session Management  | ✅ Done  |
| F-21 | Account Deletion                     | ✅ Done  |
| F-22 | Demo Mode                            | ✅ Done  |
| F-23 | Session Resume Prompt                | ✅ Done  |
| F-24 | Two-Tab Conflict Detection           | ✅ Done  |
| F-25 | Theme System                         | ✅ Done  |
| F-26 | Font Selector                        | ✅ Done  |
| F-27 | Built-In Ambient Sound Player        | ✅ Done  |
| F-28 | Reports Tab                          | ✅ Done  |
| F-29 | Hidden Admin Role                    | ✅ Done  |
| F-30 | Settings Page                        | ✅ Done  |
| F-31 | Keyboard Shortcuts                   | ✅ Done  |
| F-32 | 12-Hour Session Hard Cap             | ✅ Done  |
| F-33 | GDPR Compliance and Data Deletion    | ✅ Done  |

### Corrections Applied in This Batch
- C-01: Settings accessible to all users including guests. ✅
- C-02: Guest settings stored in browser cookie (non-PII only). ✅
- C-03: Long break frequency minimum is 0 (disabled). ✅
- C-04: Freestyle ratio max 2 decimal places, enforced client + server. ✅
- C-05: Custom alarm URL added with client-side-only security rules. ✅

### Open Questions Carried Forward
- [OPEN] Charting library for Reports tab not confirmed. Recommended:
  Recharts. Owner must approve before implementation begins on F-28.
- [OPEN] Privacy policy text must be authored by project owner before
  launch. Engineering creates the page; owner fills the content.
- [OPEN] Additional custom themes beyond Black and White Dark Mode will
  be provided by the project owner after initial build.
- [OPEN] Logo asset to be provided by project owner before launch.

### Deliberately Deferred to Later Batches
- [ ] Full user flows and screen map → Batch C
- [ ] Complete data model with all tables and columns → Batch D
- [ ] API endpoint list → Batch D
- [ ] Security rules and banned patterns → Batch E
- [ ] Rate limiting specifics → Batch E
- [ ] Edge cases and failure states → Batch F
- [ ] Testing checklist → Batch F
- [ ] Deployment instructions → Batch F
- [ ] Phased implementation roadmap → Batch F

### Features Deferred to V2 or Out of Scope
- F-50: YouTube iframe embedded player → V2
- F-51: Spotify OAuth → Permanently out of scope
- F-52: Task auto-completion by elapsed periods → Hook only in V1
- F-53: Reflection data export → Out of scope
- F-54: In-app admin dashboard → Out of scope
- F-55: Third-party error tracking → Out of scope
- F-56: Third-party analytics → Out of scope
- F-57: Email/password authentication → Out of scope
- F-58: Social features → Out of scope
- F-59: Native mobile app or PWA → Out of scope

---

END OF BATCH B