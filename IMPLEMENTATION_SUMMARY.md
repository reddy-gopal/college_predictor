# Complete Implementation Summary

## Overview
The application is a full-stack college predictor platform with real-time backend data management. All user data, XP points, test results, and gamification features are stored in the database and fetched from the backend API. The system includes authentication, mock tests, mistake tracking, leaderboards, study guilds, and comprehensive dashboard analytics.

---

## Backend Implementation

### 1. Authentication System (`backend/accounts/`)

#### Models

**CustomUser** (`backend/accounts/models.py`)
- Extends Django's `AbstractUser`
- Fields:
  - `email`, `phone`, `first_name`, `last_name`
  - `google_id`, `google_email`, `google_picture` (for Google OAuth)
  - `is_google_user` (BooleanField)
  - `preferred_branches` (CharField)
  - `class_level`, `exam_target` (CharField, optional)
- Relationship: OneToOne with `StudentProfile`

#### Endpoints (`backend/accounts/views.py`)

**`POST /api/auth/google-login/`**
- **Purpose**: Google OAuth login using Google Identity Services
- **Flow**:
  1. Verifies Google ID token server-side using `google-auth`
  2. Extracts user info: `email`, `sub` (google_id), `name`, `picture`
  3. Finds user by `google_id` or `email`
  4. Creates new `CustomUser` if not found:
     - Sets `is_google_user=True`
     - Splits `name` into `first_name` and `last_name`
     - Populates Google-specific fields
  5. **Creates `StudentProfile` for new users** with default values
  6. Generates JWT `access_token` and `refresh_token`
  7. Returns user data including `StudentProfile` and `is_new_user` flag
- **Response**: `{ token, refresh, user: {...}, is_new_user }`
- **Security**: Server-side token verification, rejects invalid/expired tokens

**`POST /api/auth/update-profile/`**
- **Purpose**: Update user profile and StudentProfile
- **Authentication**: Required (`IsAuthenticated`)
- **Flow**:
  1. Updates `CustomUser` fields: `first_name`, `last_name`, `phone`, `preferred_branches`
  2. Validates phone uniqueness (prevents duplicate phone numbers)
  3. **Creates or updates `StudentProfile`**:
     - `class_level`, `exam_target`
     - `target_rank`, `tests_per_week`
     - Sets `onboarding_completed=True` if `class_level` and `exam_target` provided
  4. Returns updated user data with `StudentProfile` fields
- **Response**: `{ message, user: {...} }`
- **StudentProfile**: Created if doesn't exist, updated if exists

**`GET /api/auth/me/`**
- **Purpose**: Get current authenticated user with real-time data
- **Authentication**: Required (`IsAuthenticated`)
- **Flow**:
  1. Gets `CustomUser` from JWT token
  2. Fetches associated `StudentProfile` (if exists)
  3. Returns combined user data with all profile fields
- **Response**: `{ user: {...} }`
- **Use Case**: Fetch fresh data from database on every page load

#### JWT Configuration (`backend/backend/settings.py`)
- **Library**: `rest_framework_simplejwt`
- **Token Lifetime**: 
  - Access Token: 1 day
  - Refresh Token: 7 days
- **Token Rotation**: Enabled
- **Header Format**: `Bearer <token>`

---

### 2. Mock Test System (`backend/mocktest/`)

#### Models

**MockTest** (`backend/mocktest/models.py`)
- Test metadata: `title`, `exam`, `test_type`, `total_questions`, `total_marks`
- Settings: `marks_per_question`, `negative_marks`, `duration_minutes`
- Status: `is_active`, `is_vip`

**Question** (`backend/mocktest/models.py`)
- Fields: `text`, `question_type`, `subject`, `chapter`, `topic`
- Options: `option_a`, `option_b`, `option_c`, `option_d`
- Answer: `correct_option`, `explanation`
- Scoring: `marks`, `negative_marks`
- Relationship: ForeignKey to `MockTest` (nullable for question bank)

**TestAttempt** (`backend/mocktest/models.py`)
- Links: `student` (FK to StudentProfile), `mock_test` (FK to MockTest)
- Scores: `score`, `percentage`, `percentile`
- Counts: `correct_count`, `wrong_count`, `unanswered_count`
- Timing: `started_at`, `completed_at`, `time_taken_seconds`
- Status: `is_completed`, `test_mode` (preset/custom)

**StudentAnswer** (`backend/mocktest/models.py`)
- Links: `attempt` (FK to TestAttempt), `question` (FK to Question)
- Answer: `selected_option`, `is_correct`
- Scoring: `marks_obtained` (positive for correct, negative for wrong, 0 for unanswered)
- Timing: `time_taken_seconds`

**MistakeNotebook** (`backend/mocktest/models.py`)
- **Purpose**: Track mistakes made by students for review
- Fields:
  - `student` (FK to StudentProfile)
  - `question` (FK to Question)
  - `attempt` (FK to TestAttempt, nullable)
  - `error_type` (Conceptual, Calculation, Silly, Time Pressure, Not Attempted)
  - `notes` (TextField for student notes)
  - `logged_at` (DateTimeField)
- **Auto-logging**: Mistakes are automatically logged when test is submitted
- **Error Types**: 
  - `NOT_ATTEMPTED` for unanswered questions
  - `CONCEPTUAL` (default) for wrong answers (editable later)

**StudentProfile** (`backend/mocktest/models.py`)
- **Purpose**: Extended profile for students with academic and gamification data
- Fields:
  - `user` (OneToOne with CustomUser)
  - `class_level` (Class 11, 12, Dropper)
  - `exam_target` (JEE Main, JEE Advanced, NEET, etc.)
  - `target_rank` (PositiveIntegerField)
  - `tests_per_week` (CharField)
  - `total_xp` (PositiveIntegerField) - **Current total XP**
  - `onboarding_completed` (BooleanField)
- **Creation**: Automatically created during Google login or profile update

**XPLog** (`backend/mocktest/models.py`)
- **Purpose**: Track individual XP transactions (history)
- Fields:
  - `student` (FK to StudentProfile)
  - `action` (CharField) - Description of action
  - `xp_amount` (PositiveIntegerField)
  - `source_type` (CharField) - Type of source (test_completed, referral, etc.)
  - `source_id` (BigIntegerField, nullable) - ID of source object
  - `logged_at` (DateTimeField)
- **Relationship**: Many XPLog entries per StudentProfile

**Leaderboard** (`backend/mocktest/models.py`)
- **Purpose**: Leaderboard entries for competitive rankings
- Fields:
  - `student` (FK to StudentProfile)
  - `leaderboard_type` (Overall, Monthly, Weekly, Daily, Exam Specific)
  - `period_start`, `period_end` (DateField, nullable for period-based leaderboards)
  - `total_score` (FloatField)
  - `total_tests` (PositiveIntegerField)
  - `average_score` (FloatField)
  - `rank` (PositiveIntegerField)
  - `updated_at` (DateTimeField)
- **Types**: Supports multiple leaderboard types for different time periods

**StudyGuild** (`backend/mocktest/models.py`)
- **Purpose**: Study groups/guilds for collaborative learning
- Fields:
  - `name` (CharField)
  - `leader` (FK to StudentProfile) - Guild leader
  - `members` (ManyToMany to StudentProfile)
  - `description` (TextField)
  - `is_active` (BooleanField)
  - `created_at`, `updated_at` (DateTimeField)
- **Methods**:
  - `is_unlocked()`: Returns True if guild has 4+ members (unlocks features)

#### API Endpoints (`backend/mocktest/views.py`)

**TestAttemptViewSet**
- **Base URL**: `/mocktest/test-attempts/`
- **Endpoints**:
  - `GET /mocktest/test-attempts/` - List user's attempts (filtered by authenticated user)
  - `GET /mocktest/test-attempts/{id}/` - Get attempt details
  - `POST /mocktest/test-attempts/` - Create new attempt
  - `POST /mocktest/test-attempts/{id}/submit_answer/` - Submit/update answer
  - `POST /mocktest/test-attempts/{id}/submit/` - Submit test and calculate score
  - `GET /mocktest/test-attempts/{id}/answers/` - Get all answers for attempt
- **Security**: `IsAuthenticated` - Users can only see their own attempts
- **Auto-logging**: When test is submitted, incorrect answers are automatically logged to `MistakeNotebook`

**MistakeNotebookViewSet**
- **Base URL**: `/mocktest/mistake-notebook/`
- **Endpoints**:
  - `GET /mocktest/mistake-notebook/` - List user's mistakes
  - `GET /mocktest/mistake-notebook/{id}/` - Get mistake details
  - `PATCH /mocktest/mistake-notebook/{id}/` - Update mistake (error_type, notes)
- **Security**: `IsAuthenticated` - Users can only see/edit their own mistakes
- **Serializer**: Includes question text, options, correct answer, explanation, test title

**XPLogViewSet**
- **Base URL**: `/mocktest/xp-logs/`
- **Endpoints**:
  - `GET /mocktest/xp-logs/` - List user's XP history
- **Security**: `IsAuthenticated` - Users can only see their own XP logs
- **Read-only**: No create/update/delete (XP is awarded by system)

**LeaderboardViewSet**
- **Base URL**: `/mocktest/leaderboard/`
- **Endpoints**:
  - `GET /mocktest/leaderboard/` - List leaderboard entries
  - `GET /mocktest/leaderboard/?type=overall` - Filter by leaderboard type
- **Security**: `IsAuthenticatedOrReadOnly` - Public read access
- **Filtering**: Supports filtering by `leaderboard_type` query parameter

**StudyGuildViewSet**
- **Base URL**: `/mocktest/study-guilds/`
- **Endpoints**:
  - `GET /mocktest/study-guilds/` - List active guilds
  - `POST /mocktest/study-guilds/` - Create new guild (user becomes leader)
  - `GET /mocktest/study-guilds/{id}/` - Get guild details
  - `POST /mocktest/study-guilds/{id}/join/` - Join a guild
  - `POST /mocktest/study-guilds/{id}/leave/` - Leave a guild
- **Security**: `IsAuthenticatedOrReadOnly` - Authenticated users can create/join
- **Features**: Guild leader cannot leave (must transfer leadership first)

---

## Frontend Implementation

### 1. Authentication Context (`frontend/src/contexts/AuthContext.jsx`)

#### Key Features:
- **No localStorage**: All user data fetched from backend
- **Token Storage**: In-memory + sessionStorage (temporary, for page refresh)
- **Real-time Data**: Always fetches fresh data from `/api/auth/me/`

#### Functions:
- `login(userData, token)`: Login with phone OTP (when implemented)
- `loginWithGoogle(userData, token)`: Google login
  - Stores token in memory
  - Sets user data from response
  - Calls `fetchCurrentUser()` to get full user object
- `logout()`: Clears token, user data, and sessionStorage
- `updateUser(updates)`: Optimistic update + backend refresh
- `refreshUser()`: Explicitly fetch fresh data from `/api/auth/me/`
- `fetchCurrentUser()`: Fetches current user from backend

#### Data Flow:
1. User logs in → Token stored in memory
2. User data fetched from `/api/auth/me/`
3. All subsequent requests use token from memory
4. On page refresh: Token retrieved from sessionStorage, user data fetched from backend

### 2. API Client (`frontend/src/lib/api.js`)

#### Token Management:
- In-memory token storage (`authToken` variable)
- `setAuthToken(token)`: Set token (called from AuthContext)
- `getAuthToken()`: Get token
- Axios interceptor: Automatically adds `Authorization: Bearer <token>` header

#### API Modules:

**`mockTestApi`**
- `getExams()`, `getAll()`, `getById()`
- `createAttempt()`, `getAttempt()`, `getUserAttempts()`
- `submitAnswer()`, `submitTest()`, `getAttemptAnswers()`
- `getMistakes()`, `updateMistake()` - **Mistake Notebook**
- `generateTest()`, `generateCustomTest()`

**`authApi`**
- `googleLogin(token)`
- `updateProfile(data)`
- `getCurrentUser()`

### 3. Dashboard (`frontend/src/components/home/DashboardHome.jsx`)

#### Components:

**Greeting Header**
- Displays user's full name (from `user.full_name`)
- Shows exam target (formatted)
- Gradient background with primary/secondary colors

**ProgressSnapshot** (`frontend/src/components/home/ProgressSnapshot.jsx`)
- **Latest Score**: From most recent completed test attempt
- **Best Percentile**: Maximum percentile from all test attempts
- **Rank Category**: Calculated based on `target_rank` and latest score
  - Safe: score >= 90% of target
  - Target: score >= 70% of target
  - Dream: score < 70% of target
- **XP Progress**: Shows current level, XP progress bar, XP needed for next level

**TodaysFocus** (`frontend/src/components/home/TodaysFocus.jsx`)
- Displays today's recommended tasks
- Based on user profile, stats, and activity
- Includes test recommendations, weak subject practice

**ProgressInsights** (within DashboardHome)
- **Recent Performance**: Shows last 5 completed test attempts
  - Test title, date, score, percentile
  - Trend analysis (improving/declining/stable)
- **Empty State**: Shows "Attempt a Test" CTA if no tests completed

**GamificationSummary** (`frontend/src/components/home/GamificationSummary.jsx`)
- **XP Progress**: 
  - Total XP and current level
  - Progress bar showing XP to next level
  - Uses `getXPProgress()` from `gamification.js`
- **Current Streak**: Days of consecutive activity (TODO: backend implementation)
- **Weekly Goal**: 
  - Progress bar showing tests completed vs goal
  - Goal from `user.tests_per_week` or default
  - Shows achievement message when goal met

**QuickActions** (`frontend/src/components/home/QuickActions.jsx`)
- Quick links to: Mock Tests, Profile, Mistake Notebook, etc.

**Recommendations** (`frontend/src/components/home/Recommendations.jsx`)
- Personalized recommendations based on user activity
- Test suggestions, scholarship opportunities

#### Data Sources:
- **User Data**: From `AuthContext` (real-time from backend)
- **Test Attempts**: Fetched from `GET /mocktest/test-attempts/` (filtered by user)
- **XP Points**: From `user.total_xp` (from StudentProfile)
- **Stats**: Calculated from test attempts and user profile

### 4. Mistake Notebook (`frontend/src/app/mistake-notebook/page.jsx`)

#### Features:
- **Filtering**: Filter mistakes by error type (All, Conceptual, Calculation, Silly, Time Pressure, Not Attempted)
- **Question Display**: 
  - Question text with HTML rendering (`dangerouslySetInnerHTML`)
  - Question number, subject, chapter
  - Test title (from attempt)
- **Options Display**: 
  - Shows all 4 options (A, B, C, D) with HTML rendering
  - Correct option highlighted in green with "Correct" badge
  - Other options in gray
- **Solution Toggle**: 
  - "Show Solution" button (hidden by default)
  - When shown: Displays correct answer and explanation
  - Explanation supports HTML rendering
- **Empty State**: Shows "Take a Mock Test" CTA if no mistakes

#### API Integration:
- `GET /mocktest/mistake-notebook/` - Fetch mistakes
- `PATCH /mocktest/mistake-notebook/{id}/` - Update mistake (error_type, notes)

### 5. Profile Page (`frontend/src/app/profile/page.jsx`)

#### Features:
- **Display**: Shows user's full name, email, exam target, profile picture
- **Edit Mode**: 
  - Edit full name (first_name, last_name)
  - Edit exam target
  - Updates via `authApi.updateProfile()`
- **Real-time Updates**: Calls `refreshUser()` after update to get latest data

### 6. Navigation (`frontend/src/components/layout/Navbar.jsx`)

#### Profile Dropdown:
- **Profile**: Link to `/profile`
- **Mistake Notebook**: Link to `/mistake-notebook`
- **Update Profile**: Link to `/profile` (above Logout)
- **Logout**: Logs out user

---

## Data Flow Diagrams

### Authentication Flow
```
┌─────────────┐
│   User      │
│  (Browser)  │
└──────┬──────┘
       │
       │ 1. Login (Google/Phone)
       ▼
┌─────────────────┐
│  AuthContext     │
│  (Frontend)      │
└──────┬───────────┘
       │
       │ 2. Store token in memory
       │ 3. Fetch from /api/auth/me/
       ▼
┌─────────────────┐
│  Backend API    │
│  /api/auth/me/  │
└──────┬───────────┘
       │
       │ 4. Query Database
       ▼
┌─────────────────────────────┐
│  Database                    │
│  - CustomUser                │
│  - StudentProfile (total_xp) │
└─────────────────────────────┘
```

### Test Submission Flow
```
┌─────────────┐
│   User      │
│  Submits    │
│   Test      │
└──────┬──────┘
       │
       │ POST /mocktest/test-attempts/{id}/submit/
       ▼
┌─────────────────┐
│  Backend        │
│  TestAttempt    │
│  ViewSet        │
└──────┬───────────┘
       │
       │ 1. Calculate score
       │ 2. Update TestAttempt
       │ 3. Log mistakes to MistakeNotebook
       ▼
┌─────────────────────────────┐
│  Database                    │
│  - TestAttempt (updated)     │
│  - StudentAnswer (existing)   │
│  - MistakeNotebook (created)  │
│  - XPLog (created, if XP)     │
│  - StudentProfile.total_xp    │
│    (updated, if XP)           │
└─────────────────────────────┘
```

### Dashboard Data Flow
```
┌─────────────┐
│  Dashboard  │
│  Component  │
└──────┬──────┘
       │
       │ 1. Get user from AuthContext
       │ 2. Fetch test attempts
       │    GET /mocktest/test-attempts/
       ▼
┌─────────────────┐
│  Backend API    │
└──────┬───────────┘
       │
       │ 3. Query Database
       │    (filtered by user)
       ▼
┌─────────────────────────────┐
│  Database                    │
│  - TestAttempt (user's)      │
│  - StudentProfile (user's)   │
│  - XPLog (user's)            │
└─────────────────────────────┘
       │
       │ 4. Return data
       ▼
┌─────────────────┐
│  Dashboard      │
│  (Display)      │
│  - Stats        │
│  - Recent Tests │
│  - XP Progress  │
└─────────────────┘
```

---

## XP Points System

### Storage:
1. **StudentProfile.total_xp**: Current total XP (aggregated, real-time)
2. **XPLog**: Individual XP transactions (history, audit trail)

### XP Calculation:
- **Level Formula**: `level = floor(total_xp / 500) + 1`
- **Progress**: `xpInCurrentLevel = total_xp % 500`
- **Next Level**: 500 XP per level

### XP Sources (TODO - Backend Implementation):
- Test completion
- Daily login streak
- Referrals
- Achievements

### Frontend Display:
- **GamificationSummary**: Shows total XP, level, progress bar
- **ProgressSnapshot**: Shows XP card with level and progress
- **XP Progress**: Calculated using `getXPProgress()` from `gamification.js`

---

## Leaderboard System

### Types:
- **Overall**: All-time leaderboard
- **Monthly**: Current month
- **Weekly**: Current week
- **Daily**: Today
- **Exam Specific**: Filtered by exam type

### Data:
- **Total Score**: Sum of all test scores
- **Total Tests**: Number of completed tests
- **Average Score**: `total_score / total_tests`
- **Rank**: Position in leaderboard (updated periodically)

### API:
- `GET /mocktest/leaderboard/` - List all leaderboard entries
- `GET /mocktest/leaderboard/?type=overall` - Filter by type

---

## Study Guilds System

### Features:
- **Creation**: Users can create guilds (become leader)
- **Joining**: Users can join existing active guilds
- **Leaving**: Users can leave guilds (leader cannot leave)
- **Unlocking**: Guild features unlock when 4+ members join

### API:
- `GET /mocktest/study-guilds/` - List active guilds
- `POST /mocktest/study-guilds/` - Create guild
- `POST /mocktest/study-guilds/{id}/join/` - Join guild
- `POST /mocktest/study-guilds/{id}/leave/` - Leave guild

---

## Key Features Summary

### ✅ Real-Time Data
- All user data fetched from backend
- Fresh data on every page load
- Consistent across tabs/devices
- No localStorage for user data

### ✅ Authentication
- Google OAuth with server-side verification
- JWT token-based authentication
- Token stored in memory + sessionStorage (temporary)
- Automatic token refresh handling

### ✅ StudentProfile Management
- Automatically created for new Google users
- Created during profile update if missing
- Always synced with CustomUser
- Stores: class_level, exam_target, target_rank, tests_per_week, total_xp

### ✅ Test System
- Create test attempts
- Submit answers in real-time
- Auto-calculate scores and percentiles
- Store all answers and results
- Filter attempts by authenticated user

### ✅ Mistake Notebook
- Automatic mistake logging on test submission
- Filter by error type
- Display question with HTML rendering
- Show all options with correct answer highlighted
- Toggle solution/explanation
- User can update error_type and notes

### ✅ Dashboard
- Personalized greeting with user's name
- Real-time stats from test attempts
- Recent performance with trend analysis
- XP progress and level display
- Weekly goal tracking
- Quick actions and recommendations

### ✅ XP & Gamification
- XP stored in StudentProfile.total_xp
- XP history in XPLog
- Level calculation (500 XP per level)
- Progress bars and visual indicators
- Streak tracking (TODO: backend)

### ✅ Leaderboard
- Multiple leaderboard types
- Rank-based ordering
- Filter by type
- Public read access

### ✅ Study Guilds
- Create and join guilds
- Member management
- Feature unlocking (4+ members)
- Guild leader protection

---

## API Endpoints Summary

### Authentication (`/api/auth/`)
- `POST /api/auth/google-login/` - Google OAuth login
- `POST /api/auth/update-profile/` - Update profile
- `GET /api/auth/me/` - Get current user (real-time)

### Mock Tests (`/mocktest/`)
- `GET /mocktest/mock-tests/` - List tests
- `GET /mocktest/mock-tests/{id}/` - Get test details
- `GET /mocktest/mock-tests/{id}/questions/` - Get test questions
- `POST /mocktest/test-attempts/` - Create attempt
- `GET /mocktest/test-attempts/` - List user's attempts
- `GET /mocktest/test-attempts/{id}/` - Get attempt details
- `POST /mocktest/test-attempts/{id}/submit_answer/` - Submit answer
- `POST /mocktest/test-attempts/{id}/submit/` - Submit test
- `GET /mocktest/test-attempts/{id}/answers/` - Get attempt answers

### Mistake Notebook (`/mocktest/mistake-notebook/`)
- `GET /mocktest/mistake-notebook/` - List user's mistakes
- `GET /mocktest/mistake-notebook/{id}/` - Get mistake details
- `PATCH /mocktest/mistake-notebook/{id}/` - Update mistake

### XP & Leaderboard (`/mocktest/`)
- `GET /mocktest/xp-logs/` - Get user's XP history
- `GET /mocktest/leaderboard/` - Get leaderboard
- `GET /mocktest/leaderboard/?type=overall` - Filter leaderboard by type

### Study Guilds (`/mocktest/study-guilds/`)
- `GET /mocktest/study-guilds/` - List active guilds
- `POST /mocktest/study-guilds/` - Create guild
- `GET /mocktest/study-guilds/{id}/` - Get guild details
- `POST /mocktest/study-guilds/{id}/join/` - Join guild
- `POST /mocktest/study-guilds/{id}/leave/` - Leave guild

---

## Next Steps / TODO

### Backend:
1. **XP Award System**: Implement automatic XP awarding on test completion
2. **Streak Tracking**: Add streak calculation to backend
3. **Weekly Goal Calculation**: Calculate weekly completed tests from TestAttempt
4. **Leaderboard Updates**: Implement periodic leaderboard ranking updates
5. **Phone OTP Login**: Add OTP send/verify endpoints
6. **Registration API**: Create user registration endpoint

### Frontend:
1. **Leaderboard Page**: Create dedicated leaderboard page with filtering
2. **Study Guilds Page**: Create page to view/join/create guilds
3. **XP History Page**: Create page to view detailed XP log
4. **Token Refresh**: Implement automatic JWT token refresh
5. **Error Handling**: Better error messages and retry logic
6. **Loading States**: Show loading indicators during data fetch

---

## Notes

- **Token Storage**: Currently in memory + sessionStorage (temporary). Should use httpOnly cookies in production.
- **Real-Time Data**: All user data is fetched from backend on every page load.
- **StudentProfile**: Automatically created for new users during Google login or profile update.
- **Mistake Logging**: Automatic on test submission. Users can update error_type and notes later.
- **XP System**: Currently stored but not automatically awarded. Backend implementation needed.
- **Leaderboard**: Data model exists but ranking updates need periodic background tasks.
- **Study Guilds**: Basic CRUD implemented. Advanced features (chat, competitions) can be added.

---

## Database Schema Summary

### Core Models:
- **CustomUser** → **StudentProfile** (OneToOne)
- **StudentProfile** → **TestAttempt** (OneToMany)
- **TestAttempt** → **StudentAnswer** (OneToMany)
- **TestAttempt** → **MistakeNotebook** (OneToMany)
- **StudentProfile** → **XPLog** (OneToMany)
- **StudentProfile** → **Leaderboard** (OneToMany)
- **StudentProfile** → **StudyGuild** (ManyToMany, as members)
- **StudentProfile** → **StudyGuild** (OneToMany, as leader)

### Key Relationships:
- All test data linked to StudentProfile
- All gamification data (XP, Leaderboard) linked to StudentProfile
- Mistakes linked to Question, TestAttempt, and StudentProfile
- Study Guilds have leader and members (both StudentProfile)

---

*Last Updated: January 2026*
