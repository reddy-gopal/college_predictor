# Dashboard, Profile & MistakeNotebook Implementation Guide

## 📊 Dashboard Implementation (`DashboardHome.jsx`)

### Overview
The Dashboard is the main landing page for logged-in users. It displays personalized information, progress tracking, daily tasks, and quick access to key features.

### Location
- **File:** `frontend/src/components/home/DashboardHome.jsx`
- **Route:** `/` (home page) - shown when user is logged in and has completed onboarding

---

## 🏗️ Dashboard Structure

### 1. **Greeting Header**
- **Component:** Inline component in `DashboardHome.jsx`
- **Content:**
  - Student's name with 👋 emoji
  - Exam target (e.g., "JEE Main", "NEET")
- **Styling:** Gradient card (primary to secondary colors)
- **Buttons:** None

---

### 2. **Progress Snapshot** (`ProgressSnapshot.jsx`)
- **Location:** `frontend/src/components/home/ProgressSnapshot.jsx`
- **Layout:** 2x2 grid on desktop (4 cards)
- **Cards:**
  1. **Latest Score** 📊
     - Shows the most recent test score
     - **No button/redirect** - Display only
  2. **Best Percentile** 🏆
     - Shows the highest percentile achieved
     - **No button/redirect** - Display only
  3. **Exam Target & Target Rank** 🎯
     - Shows exam target (e.g., "JEE Main")
     - Shows target rank (e.g., "Rank 5,000")
     - **No button/redirect** - Display only
  4. **XP Progress**
     - Shows current XP, level, and progress bar
     - **No button/redirect** - Display only

---

### 3. **Daily Focus** (`DailyFocus.jsx`)
- **Location:** `frontend/src/components/home/DailyFocus.jsx`
- **Content:**
  - Today's attendance status
  - Monthly calendar view
  - Present days count
  - Max streak
- **Buttons:** None - Display only

---

### 4. **Today's Focus** (`TodaysFocus.jsx`)
- **Location:** `frontend/src/components/home/TodaysFocus.jsx`
- **Purpose:** Displays dynamic daily tasks with XP rewards
- **Tasks Generated From:** Backend API (`/mocktest/tasks/`)

#### Task Types & Button Redirects:

| Task ID | Task Title | Description | Button Text | Redirects To | XP Reward |
|---------|-----------|-------------|-------------|--------------|-----------|
| `take-test` | Take Test | Complete a mock test | "Start" | `/mock-tests` | +50 XP |
| `weekly-goal` | Complete weekly goal | Complete X tests this week | "Start" | `/mock-tests` | +30 XP |
| `review-questions` | Review weak questions | Review mistakes in notebook | "Start" | `/mistake-notebook` | +20 XP |

**Button Behavior:**
- Clicking a task button navigates to the appropriate page
- For `review-questions`: Calls `completeTask` API, then navigates
- For `take-test` and `weekly-goal`: Navigates directly (XP awarded on test submission)

---

### 5. **Recent Performance** (`ProgressInsights` - inline component)
- **Location:** Inline component in `DashboardHome.jsx`
- **Content:** List of recent test attempts with scores and percentiles
- **Empty State Button:**
  - **Button:** "Attempt a Test"
  - **Redirects To:** `/mock-tests`
  - **Shown When:** No test attempts exist

---

### 6. **Gamification Summary** (`GamificationSummary.jsx`)
- **Location:** `frontend/src/components/home/GamificationSummary.jsx`
- **Content:**
  - XP progress
  - Current streak
  - Weekly goal progress
- **Buttons:** None - Display only

---

### 7. **Quick Actions** (`QuickActions.jsx`)
- **Location:** `frontend/src/components/home/QuickActions.jsx`
- **Layout:** 2x2 grid on mobile, 4 columns on desktop
- **Action Cards:**

| Card Title | Icon | Redirects To | Color |
|------------|------|--------------|-------|
| Mock Tests | 📝 | `/mock-tests` | Primary |
| Rank Predictor | 📊 | `/predict-rank` | Secondary |
| College Predictor | 🎓 | `/predict-college` | Accent-1 |
| Scholarships | 💰 | `/scholarships` | Accent-2 |

**Button Behavior:**
- Each card is a clickable `Link` component
- Hover effect: Scale up (105%)
- All cards redirect to their respective pages

---

### 8. **Recommendations** (`Recommendations.jsx`)
- **Location:** `frontend/src/components/home/Recommendations.jsx`
- **Purpose:** Personalized recommendations based on user activity

#### Recommendation Cards:

**1. Test Recommendation Card:**
- **Dynamic Content:**
  - 0 tests: "Practice Test" → `/mock-tests`
  - 1-2 tests: "Full Length Test" → `/mock-tests`
  - 3+ tests: "Sectional Test" → `/mock-tests`
- **Button:** "Explore Tests"
- **Redirects To:** `/mock-tests`

**2. Scholarship Recommendation Card:**
- **Shown When:** User profile exists
- **Button:** "View Scholarships"
- **Redirects To:** `/scholarships`

---

## 👤 Profile Implementation (`profile/page.jsx`)

### Overview
The Profile page provides a comprehensive view of the student's performance, achievements, and activity. It includes detailed analytics, test history, and mistake insights.

### Location
- **File:** `frontend/src/app/profile/page.jsx`
- **Route:** `/profile`
- **Edit Route:** `/profile/edit`

---

## 🏗️ Profile Structure

### 1. **Profile Header** (`ProfileHeader.jsx`)
- **Location:** `frontend/src/components/profile/ProfileHeader.jsx`
- **Content:**
  - Profile picture (Google picture or initial avatar)
  - Full name
  - Email address
  - Exam target (formatted display)
  - Target rank (if set)
- **Button:**
  - **"Edit Profile"** → Redirects to `/profile/edit`
- **Styling:** Card layout with flex arrangement

---

### 2. **Performance Overview** (`PerformanceOverview.jsx`)
- **Location:** `frontend/src/components/profile/PerformanceOverview.jsx`
- **Content:**
  - Circular progress ring showing:
    - Total tests attempted
    - Tests completed
    - Tests in progress
    - Tests abandoned
  - Breakdown toggle (Difficulty / Section)
  - Performance breakdown by:
    - **Difficulty:** Easy, Medium, Hard
    - **Section:** Physics, Chemistry, Mathematics
  - Each breakdown shows:
    - Attempted count
    - Completed count
    - Accuracy percentage
    - Progress bar
- **API:** `GET /mocktest/student-profiles/me/` (for overview data)
- **Buttons:** Toggle buttons for Difficulty/Section view
- **No Navigation Buttons** - Display only

---

### 3. **Badges & Achievements** (`BadgesAndAchievements.jsx`)
- **Location:** `frontend/src/components/profile/BadgesAndAchievements.jsx`
- **Content:**
  - Achievement badges
  - XP milestones
  - Streak achievements
- **Buttons:** None - Display only

---

### 4. **Activity Heatmap** (`ActivityHeatmap.jsx`)
- **Location:** `frontend/src/components/profile/ActivityHeatmap.jsx`
- **Content:**
  - Visual calendar heatmap
  - Daily activity intensity
  - Test completion dates
- **Buttons:** None - Display only

---

### 5. **Test Attempts Summary** (`TestAttemptsSummary.jsx`)
- **Location:** `frontend/src/components/profile/TestAttemptsSummary.jsx`
- **Content:**
  - **4 Summary Cards:**
    1. **Total Tests** 📊 - Total number of test attempts
    2. **Average Score** 📈 - Average score across all tests
    3. **Best Score** 🏆 - Highest score achieved
    4. **Avg Percentile** 📉 - Average percentile across all tests
- **Button:**
  - **"View All Attempts"** → Redirects to `/profile/test-attempts` (if implemented)
- **API:** `GET /mocktest/test-attempts/` - Fetches user's test attempts
- **Calculation:** Computed from test attempts data

---

### 6. **Performance Analytics** (`PerformanceAnalytics.jsx`)
- **Location:** `frontend/src/components/profile/PerformanceAnalytics.jsx`
- **Content:**
  - Score trends over time
  - Performance charts
  - Improvement metrics
- **Buttons:** None - Display only

---

### 7. **Mistake Insights** (`MistakeInsights.jsx`)
- **Location:** `frontend/src/components/profile/MistakeInsights.jsx`
- **Content:**
  - Error type distribution
  - Common mistake patterns
  - Subject-wise mistake analysis
- **Buttons:** None - Display only

---

## ✏️ Profile Edit Page (`profile/edit/page.jsx`)

### Overview
Allows users to edit their profile information including name, exam target, target rank, and phone number.

### Location
- **File:** `frontend/src/app/profile/edit/page.jsx`
- **Route:** `/profile/edit`

### Form Fields:
1. **First Name** - Text input
2. **Last Name** - Text input
3. **Phone Number** - Tel input
4. **Target Exam** - Dropdown select:
   - JEE Main
   - JEE Advanced
   - NEET
   - EAPCET
   - BITSAT
   - Other
5. **Target Rank** - Number input

### Buttons:
- **"Cancel"** → Redirects to `/profile`
- **"Back to Profile"** (header) → Redirects to `/profile`
- **"Save Changes"** → Submits form and redirects to `/profile` on success

### API Integration:
- **Update:** `PATCH /accounts/profile/` via `authApi.updateProfile()`
- **Refresh:** Calls `refreshUser()` after successful update
- **Success Message:** Shows success notification before redirect

---

## 📝 MistakeNotebook Implementation (`mistake-notebook/page.jsx`)

### Overview
The MistakeNotebook page allows students to review questions they got wrong, categorize errors, add notes, and generate practice tests from their mistakes.

### Location
- **File:** `frontend/src/app/mistake-notebook/page.jsx`
- **Route:** `/mistake-notebook`

---

## 🏗️ MistakeNotebook Structure

### 1. **Header Section**
- **Title:** "Mistake Notebook"
- **Description:** "Review and learn from your mistakes to improve your performance."

#### Header Button:
- **Button:** "Practice These Mistakes" (with clipboard icon)
- **Shown When:** Mistakes exist and not loading
- **Redirects To:** `/mock-tests/{test_id}` (dynamically generated test)
- **Behavior:**
  - Calls `generateTestFromMistakes` API
  - Creates a custom test from current mistakes (filtered by selected error type)
  - Navigates to the generated test page
  - **Note:** Successfully generated mistakes are removed from the notebook

---

### 2. **Filter Buttons**
- **Layout:** Horizontal row of filter buttons
- **Filter Options:**

| Filter Value | Label | Behavior |
|--------------|-------|----------|
| `all` | All Mistakes | Shows all mistakes (default) |
| `conceptual` | Conceptual Errors | Filters to conceptual errors only |
| `calculation` | Calculation Errors | Filters to calculation errors only |
| `silly` | Silly Mistakes | Filters to silly mistakes only |
| `time_pressure` | Time Pressure | Filters to time pressure mistakes only |
| `not_attempted` | Not Attempted | Filters to unanswered questions only |

**Button Behavior:**
- Clicking a filter button updates the displayed mistakes
- Active filter has primary color background
- Inactive filters have white background with border

---

### 3. **Empty State**
- **Shown When:** No mistakes exist (or filtered list is empty)
- **Content:**
  - 📝 emoji
  - "No Mistakes Yet" heading
  - Contextual message based on filter
- **Button:** "Take a Mock Test"
- **Redirects To:** `/mock-tests`

---

### 4. **Mistake Cards**
Each mistake is displayed as a card with:

#### Card Content:
- **Question Number:** Q1, Q2, etc.
- **Error Type Badge:** Color-coded badge showing error type
- **Test Title:** Source test name
- **Subject & Chapter:** Question metadata
- **Question Text:** HTML-rendered question
- **Options:** All options displayed with correct answer highlighted in green
- **Solution Toggle:** Collapsible solution section
- **Notes:** Personal notes (if added)
- **Date:** When mistake was logged

#### Interactive Elements:

**1. Solution Toggle Button:**
- **Text:** "Show Solution" / "Hide Solution"
- **Behavior:** Toggles visibility of:
  - Correct answer (highlighted in green)
  - Explanation (if available)
- **Redirects To:** None (inline toggle)

**2. No Direct Navigation Buttons:**
- Mistake cards don't have navigation buttons
- Users can use the "Practice These Mistakes" button in the header to generate a test

---

## 🔄 Data Flow

### Dashboard Data Flow:
1. **On Load:**
   - Fetches user's test attempts from `/mocktest/test-attempts/`
   - Filters to completed attempts only
   - Sorts by completion date (newest first)

2. **Real-time Updates:**
   - Refreshes when `user.total_xp` changes (indicates test completion)
   - Refreshes on page visibility change
   - Refreshes on window focus

3. **Task Generation:**
   - Fetches tasks from `/mocktest/tasks/`
   - Tasks are dynamically generated based on:
     - Test completion status
     - Weekly goal progress
     - Mistake review status

### Profile Data Flow:
1. **On Load:**
   - Uses `user` from `AuthContext` (no additional fetch needed)
   - Fetches performance overview from `/mocktest/student-profiles/me/` (if API exists)
   - Fetches test attempts from `/mocktest/test-attempts/` for summary calculations
   - Fetches mistakes from `/mocktest/mistake-notebook/` for insights

2. **On Edit:**
   - Loads current user data into form
   - Validates form inputs
   - Submits to `/accounts/profile/` via `authApi.updateProfile()`
   - Refreshes user context after successful update
   - Redirects to profile page

### MistakeNotebook Data Flow:
1. **On Load:**
   - Fetches mistakes from `/mocktest/mistake-notebook/`
   - Filters by selected error type (if not "all")

2. **On Filter Change:**
   - Re-fetches mistakes with new filter
   - Updates displayed list

3. **On Test Generation:**
   - Calls `/mocktest/mistake-notebook/generate-test/`
   - Backend creates a new MockTest with questions from mistakes
   - Successfully used mistakes are removed from notebook
   - Redirects to generated test page

---

## 📋 Complete Button Redirect Summary

### Dashboard Buttons:

| Component | Button/Link | Redirects To | Condition |
|-----------|-------------|--------------|-----------|
| ProgressInsights | "Attempt a Test" | `/mock-tests` | When no tests exist |
| TodaysFocus | Task button (Take Test) | `/mock-tests` | Always |
| TodaysFocus | Task button (Weekly Goal) | `/mock-tests` | Always |
| TodaysFocus | Task button (Review Questions) | `/mistake-notebook` | Always |
| QuickActions | Mock Tests card | `/mock-tests` | Always |
| QuickActions | Rank Predictor card | `/predict-rank` | Always |
| QuickActions | College Predictor card | `/predict-college` | Always |
| QuickActions | Scholarships card | `/scholarships` | Always |
| Recommendations | "Explore Tests" | `/mock-tests` | Always |
| Recommendations | "View Scholarships" | `/scholarships` | When profile exists |

### Profile Buttons:

| Component | Button/Link | Redirects To | Condition |
|-----------|-------------|--------------|-----------|
| ProfileHeader | "Edit Profile" | `/profile/edit` | Always |
| TestAttemptsSummary | "View All Attempts" | `/profile/test-attempts` | Always (if route exists) |
| ProfileEditPage | "Cancel" | `/profile` | Always |
| ProfileEditPage | "Back to Profile" | `/profile` | Always |
| ProfileEditPage | "Save Changes" | `/profile` | After successful save |

### MistakeNotebook Buttons:

| Element | Button/Link | Redirects To | Condition |
|---------|-------------|--------------|-----------|
| Header | "Practice These Mistakes" | `/mock-tests/{test_id}` | When mistakes exist |
| Empty State | "Take a Mock Test" | `/mock-tests` | When no mistakes exist |
| Filter Buttons | Filter options | None (filters list) | Always |
| Solution Toggle | "Show/Hide Solution" | None (toggles display) | Always |

---

## 🎨 Styling & UX Features

### Dashboard:
- **Responsive Design:** Mobile-first, adapts to desktop
- **Real-time Updates:** Auto-refreshes on data changes
- **Loading States:** Spinner animations during data fetch
- **Empty States:** Helpful messages with CTAs
- **Hover Effects:** Cards scale on hover (Quick Actions)

### Profile:
- **Card-based Layout:** Each section in its own card
- **Responsive Grid:** Adapts to mobile/tablet/desktop
- **Loading States:** Skeleton loaders for async data
- **Error Handling:** Error messages with retry buttons
- **Dark Mode Support:** Full dark mode compatibility
- **Circular Progress:** Visual progress indicators

### MistakeNotebook:
- **Color-coded Error Types:** Visual distinction for error categories
- **Collapsible Solutions:** Clean, organized display
- **HTML Rendering:** Questions and options support rich formatting
- **Filter Persistence:** Filter state maintained during navigation
- **Loading States:** Spinner during test generation

---

## 🔐 Authentication & Access

### Dashboard:
- **Access:** Requires authentication
- **Redirect:** Non-logged-in users see `PublicHome`
- **Data:** All data filtered by logged-in user

### Profile:
- **Access:** Requires authentication
- **Redirect:** Non-logged-in users redirected to `/login`
- **Data:** Only shows data for logged-in user
- **Edit Access:** Users can only edit their own profile

### MistakeNotebook:
- **Access:** Requires authentication
- **Empty State:** Shows login prompt if not authenticated
- **Data:** Only shows mistakes for logged-in user

---

## 📊 API Endpoints Used

### Dashboard:
- `GET /mocktest/test-attempts/` - Fetch user's test attempts
- `GET /mocktest/tasks/` - Fetch today's tasks
- `GET /mocktest/gamification/summary/` - Fetch gamification stats
- `GET /mocktest/daily-focus/today/` - Fetch today's attendance
- `GET /mocktest/daily-focus/monthly/` - Fetch monthly calendar
- `POST /mocktest/tasks/complete/` - Complete a task (review-questions)

### Profile:
- `GET /accounts/profile/` - Fetch user profile (via AuthContext)
- `PATCH /accounts/profile/` - Update user profile
- `GET /mocktest/student-profiles/me/` - Fetch student profile details (if implemented)
- `GET /mocktest/test-attempts/` - Fetch test attempts for summary
- `GET /mocktest/mistake-notebook/` - Fetch mistakes for insights

### Profile Edit:
- `PATCH /accounts/profile/` - Update profile information
  - Fields: `first_name`, `last_name`, `exam_target`, `target_rank`, `phone`

### MistakeNotebook:
- `GET /mocktest/mistake-notebook/` - Fetch mistakes
- `PATCH /mocktest/mistake-notebook/{id}/` - Update mistake (error_type, notes)
- `POST /mocktest/mistake-notebook/generate-test/` - Generate test from mistakes

---

## 🗄️ Backend Models

### StudentProfile Model:
```python
class StudentProfile(models.Model):
    user = OneToOneField(CustomUser)
    class_level = CharField(choices: Class_11, Class_12, Dropper, Graduate)
    exam_target = CharField(choices: JEE_Main, JEE_Advanced, NEET, EAPCET, BITSAT, Other)
    target_rank = PositiveIntegerField(null=True, blank=True)
    tests_per_week = CharField(null=True, blank=True)
    onboarding_completed = BooleanField(default=False)
    total_xp = PositiveIntegerField(default=0)
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)
```

### API Endpoints (Backend):
- `GET /mocktest/student-profiles/` - List profiles (staff only or own)
- `GET /mocktest/student-profiles/{id}/` - Get profile details
- `GET /mocktest/student-profiles/me/` - Get current user's profile
- `POST /mocktest/student-profiles/` - Create profile
- `PATCH /mocktest/student-profiles/{id}/` - Update profile
- `DELETE /mocktest/student-profiles/{id}/` - Delete profile

**Note:** Profile editing in frontend uses `/accounts/profile/` endpoint (from accounts app), not the mocktest endpoint.

---

## 🚀 Key Features

### Dashboard:
✅ Real-time progress tracking  
✅ Dynamic task generation  
✅ Gamification integration  
✅ Quick access to all features  
✅ Personalized recommendations  
✅ Attendance tracking  

### Profile:
✅ Comprehensive performance overview  
✅ Visual analytics and charts  
✅ Test history summary  
✅ Mistake insights  
✅ Achievement tracking  
✅ Activity visualization  
✅ Profile editing  

### MistakeNotebook:
✅ Error categorization  
✅ Solution review  
✅ Practice test generation  
✅ Filter by error type  
✅ Personal notes  
✅ Automatic mistake removal after practice  

---

## 📝 Notes

1. **XP Awards:** XP for tasks is awarded automatically via backend signals when tests are completed, not on button click
2. **Test Generation:** Generated tests from mistakes use a fixed 4 minutes per question
3. **Mistake Removal:** Mistakes are removed from notebook only after successful test generation
4. **Real-time Sync:** Dashboard updates automatically when user completes activities
5. **Navigation Protection:** Test pages prevent navigation during active tests (separate feature)
6. **Profile Data:** Profile page uses `user` from `AuthContext` - no separate API call needed for basic info
7. **Profile Edit:** Updates both `CustomUser` (name, phone) and `StudentProfile` (exam_target, target_rank) models
8. **Performance Overview:** Currently uses mock data fallback if API endpoint not available
9. **Test Attempts Summary:** Calculated client-side from test attempts data
10. **Activity Heatmap:** Implementation depends on backend API availability

---

## 🔗 Related Documentation

- **Mocktest & Guild Implementation:** See `backend/MOCKTEST_AND_GUILD_IMPLEMENTATION.md`
- **Gamification:** See `frontend/GAMIFICATION_IMPLEMENTATION.md`
- **Authentication Flow:** See `frontend/AUTHENTICATION_FLOW.md`

---

*Last Updated: January 2026*
*Version: 2.0 (Post QuestionBank Migration)*
