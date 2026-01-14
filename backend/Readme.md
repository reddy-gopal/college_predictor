# College Predictor Backend

A Django REST API backend for college prediction and mock test management system.

## Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Apps](#apps)
  - [Predictor App](#predictor-app)
  - [Mocktest App](#mocktest-app)
- [Database Models](#database-models)
- [API Endpoints](#api-endpoints)
- [Management Commands](#management-commands)
- [Setup & Installation](#setup--installation)
- [Configuration](#configuration)
- [Development](#development)

## Overview

This backend provides two main functionalities:

1. **College Predictor**: Predicts colleges and courses based on JEE/NEET ranks, categories, and states using historical cutoff data.
2. **Mock Test System**: Complete mock test platform with user authentication, test management, scoring, leaderboards, and gamification features.

## Technology Stack

- **Framework**: Django 5.1.6
- **API**: Django REST Framework 3.14.0+
- **Database**: SQLite3 (development)
- **CORS**: django-cors-headers 4.0.0+
- **ML Libraries**: 
  - scikit-learn 1.0.0+
  - numpy 1.21.0+
- **Python**: 3.13+

## Project Structure

```
backend/
├── backend/              # Main project settings
│   ├── settings.py      # Django settings
│   ├── urls.py          # Root URL configuration
│   ├── wsgi.py          # WSGI configuration
│   └── asgi.py          # ASGI configuration
├── predictor/           # College prediction app
│   ├── models.py        # Data models
│   ├── views.py         # API views
│   ├── serializers.py   # DRF serializers
│   ├── urls.py          # URL routing
│   ├── admin.py         # Admin configuration
│   └── management/
│       └── commands/    # Custom management commands
├── mocktest/            # Mock test app
│   ├── models.py        # Data models
│   ├── views.py         # API views
│   └── admin.py         # Admin configuration
├── db.sqlite3           # SQLite database
├── manage.py           # Django management script
└── requirements.txt     # Python dependencies
```

## Apps

### Predictor App

The predictor app handles college and course predictions based on exam ranks.

#### Models

1. **ExamModel**
   - `name`: Exam name (e.g., JEE Main, NEET)

2. **CollegeModel**
   - `name`: College name
   - `location`: College location
   - `college_type`: Private or Government

3. **CourseModel**
   - `name`: Course name
   - `college`: ForeignKey to CollegeModel
   - `duration`: Course duration in years
   - `degree`: B.Tech, M.Tech, B.Sc, M.Sc, B.A, M.A
   - `branch`: CSE, ECE, EEE, ME, CE
   - `total_seats`: Total available seats

4. **CutoffModel**
   - `exam`: ForeignKey to ExamModel
   - `course`: ForeignKey to CourseModel
   - `year`: Year of cutoff data
   - `category`: General, SC, ST, OBC, EWS, etc.
   - `quota`: State, AIQ, AI, AP, GO, HS, JK, LA, OS
   - `state`: State name (default: 'All')
   - `opening_rank`: Opening rank for the cutoff
   - `closing_rank`: Closing rank for the cutoff
   - `seat_type`: OPEN, OBC-NCL, SC, ST, EWS (with PwD variants)

5. **Prediction**
   - `input_rank`: User's input rank
   - `exam`: ForeignKey to ExamModel
   - `category`: General, SC, ST, OBC
   - `state`: State name
   - `branch_list`: JSONField for preferred branches
   - `timestamp`: Prediction timestamp
   - `predicted_result`: JSONField storing prediction results

6. **ScoreToRankModel**
   - `exam`: ForeignKey to ExamModel
   - `score_low`: Lower score bound
   - `score_high`: Upper score bound
   - `percentile_low`: Lower percentile bound
   - `percentile_high`: Upper percentile bound
   - `rank_low`: Lower rank bound
   - `rank_high`: Upper rank bound
   - `year`: Year of data
   - `category`: General, SC, ST, OBC

#### API Endpoints

**Base URL**: `/`

All endpoints use Django REST Framework ViewSets:

- `GET/POST /exams/` - List/Create exams
- `GET/PUT/DELETE /exams/{id}/` - Retrieve/Update/Delete exam
- `GET/POST /colleges/` - List/Create colleges
- `GET/PUT/DELETE /colleges/{id}/` - Retrieve/Update/Delete college
- `GET/POST /courses/` - List/Create courses
- `GET/PUT/DELETE /courses/{id}/` - Retrieve/Update/Delete course
- `GET/POST /cutoffs/` - List/Create cutoffs
- `GET/PUT/DELETE /cutoffs/{id}/` - Retrieve/Update/Delete cutoff
- `GET/POST /predictions/` - List/Create predictions
- `GET/PUT/DELETE /predictions/{id}/` - Retrieve/Update/Delete prediction
- `GET/POST /score-to-rank/` - List/Create score-to-rank mappings
- `GET/PUT/DELETE /score-to-rank/{id}/` - Retrieve/Update/Delete mapping

**Custom Endpoints**:

- `POST /predict-college/` - Predict colleges based on rank
  - Request body:
    ```json
    {
      "input_rank": 1000,
      "exam": 1,
      "category": "General",
      "state": "Andhra Pradesh",
      "branch_list": ["CSE", "ECE"]
    }
    ```
  - Returns: List of matching colleges with courses

- `POST /get-rank-from-score/` - Convert score to rank
  - Request body:
    ```json
    {
      "score": 250,
      "exam": 1,
      "category": "General",
      "year": 2024
    }
    ```
  - Returns: Estimated rank range

- `GET /get-categories/` - Get available categories for an exam
  - Query params: `exam_id`
  - Returns: List of categories

### Mocktest App

The mocktest app provides a complete mock test platform with user management, test creation, scoring, and gamification.

#### Models

1. **CustomUser** (extends AbstractUser)
   - Custom user model with email as USERNAME_FIELD
   - `phone`: Unique phone number (optional)
   - `is_phone_verified`: Phone verification status
   - `google_id`: Google OAuth ID
   - `google_email`: Google email
   - `google_picture`: Google profile picture URL
   - Overrides `groups` and `user_permissions` with custom `related_name` to avoid conflicts

2. **PhoneOTP**
   - `user`: ForeignKey to CustomUser
   - `otp_code`: 6-digit OTP code
   - `created_at`: OTP creation timestamp
   - `is_used`: Whether OTP has been used

3. **DifficultyLevel**
   - `level`: Easy, Medium, Hard, Difficult (unique)

4. **TestCategory**
   - `name`: Category name (e.g., "Full Length", "Practice")
   - `description`: Category description

5. **MockTest**
   - `title`: Test title
   - `category`: ForeignKey to TestCategory
   - `test_type`: Full Length or Practice
   - `total_questions`: Number of questions
   - `marks_per_question`: Marks per question (default: 4.0)
   - `negative_marks`: Negative marking (default: 1.0)
   - `total_marks`: Auto-calculated total marks
   - `duration_minutes`: Test duration (default: 180)
   - `difficulty`: ForeignKey to DifficultyLevel (optional)
   - `is_vip`: VIP test flag
   - `created_at`: Creation timestamp

6. **Question**
   - `mock_test`: ForeignKey to MockTest
   - `question_type`: MCQ or Blank
   - `text`: Question text
   - `subject`: Subject name
   - `option_a`, `option_b`, `option_c`, `option_d`: Answer options
   - `correct_option`: Correct answer (A, B, C, or D)
   - `difficulty_level`: ForeignKey to DifficultyLevel
   - `topic`: Topic name (optional)
   - `explanation`: Answer explanation (optional)

7. **StudentProfile**
   - `user`: OneToOneField to CustomUser
   - `class_level`: 11, 12, or Dropper
   - `exam_target`: JEE, NEET, EAPCET
   - `total_xp`: Total experience points

8. **TestAttempt**
   - `student`: ForeignKey to StudentProfile
   - `mock_test`: ForeignKey to MockTest
   - `score`: Test score
   - `percentile`: Percentile rank
   - `started_at`: Test start time
   - `completed_at`: Test completion time
   - `is_completed`: Completion status

9. **StudentAnswer**
   - `attempt`: ForeignKey to TestAttempt
   - `question`: ForeignKey to Question
   - `selected_option`: Selected answer (A, B, C, D, or blank)
   - `is_correct`: Whether answer is correct
   - `time_taken`: Time taken in seconds

10. **MistakeNotebook**
    - `student`: ForeignKey to StudentProfile
    - `question`: ForeignKey to Question
    - `logged_at`: Log timestamp
    - `error_type`: Conceptual, Silly, or Time Pressure

11. **StudyGuild**
    - `name`: Guild name
    - `leader`: ForeignKey to StudentProfile (guild leader)
    - `members`: ManyToManyField to StudentProfile
    - `created_at`: Creation timestamp
    - `is_unlocked()`: Method to check if guild has 4+ members

12. **XPLog**
    - `student`: ForeignKey to StudentProfile
    - `action`: Action description
    - `xp_amount`: XP points earned
    - `logged_at`: Log timestamp

13. **Leaderboard**
    - `student`: ForeignKey to StudentProfile
    - `total_score`: Total score
    - `rank`: Current rank
    - `updated_at`: Last update timestamp

#### API Endpoints

Currently, the mocktest app views are empty. The models are registered in Django admin for management.

## Database Models

### Relationships

**Predictor App**:
- CollegeModel → CourseModel (One-to-Many)
- ExamModel → CutoffModel (One-to-Many)
- CourseModel → CutoffModel (One-to-Many)
- ExamModel → Prediction (One-to-Many)
- ExamModel → ScoreToRankModel (One-to-Many)

**Mocktest App**:
- CustomUser → StudentProfile (One-to-One)
- CustomUser → PhoneOTP (One-to-Many)
- TestCategory → MockTest (One-to-Many)
- DifficultyLevel → MockTest (One-to-Many, optional)
- MockTest → Question (One-to-Many)
- DifficultyLevel → Question (One-to-Many)
- StudentProfile → TestAttempt (One-to-Many)
- MockTest → TestAttempt (One-to-Many)
- TestAttempt → StudentAnswer (One-to-Many)
- Question → StudentAnswer (One-to-Many)
- StudentProfile → MistakeNotebook (One-to-Many)
- Question → MistakeNotebook (One-to-Many)
- StudentProfile → StudyGuild (Many-to-Many, as members)
- StudentProfile → StudyGuild (One-to-Many, as leader)
- StudentProfile → XPLog (One-to-Many)
- StudentProfile → Leaderboard (One-to-One)

## Management Commands

Located in `predictor/management/commands/`:

1. **seed_data.py** - Seed initial data (exams, colleges, courses)
2. **seed_iit_nit.py** - Seed IIT/NIT specific data
3. **seed_ranks.py** - Seed rank/score conversion data
4. **clear_cutoffs.py** - Clear all cutoff data
   - Usage: `python manage.py clear_cutoffs --confirm`

## Setup & Installation

### Prerequisites

- Python 3.13+
- pip
- virtualenv (recommended)

### Steps

1. **Clone the repository**
   ```bash
   cd backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv env
   ```

3. **Activate virtual environment**
   - Windows:
     ```bash
     env\Scripts\activate
     ```
   - Linux/Mac:
     ```bash
     source env/bin/activate
     ```

4. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

5. **Configure settings**
   - Update `backend/settings.py` if needed
   - Set `AUTH_USER_MODEL = 'mocktest.CustomUser'` (already configured)

6. **Run migrations**
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

7. **Create superuser**
   ```bash
   python manage.py createsuperuser
   ```

8. **Run development server**
   ```bash
   python manage.py runserver
   ```

The API will be available at `http://127.0.0.1:8000/`

## Configuration

### Settings (backend/settings.py)

Key configurations:

- **INSTALLED_APPS**: Includes `predictor`, `mocktest`, `rest_framework`, `corsheaders`
- **AUTH_USER_MODEL**: `'mocktest.CustomUser'` (custom user model)
- **CORS_ALLOW_ALL_ORIGINS**: `True` (for development)
- **DATABASE**: SQLite3 (default)
- **DEFAULT_AUTO_FIELD**: `BigAutoField`

### Custom User Model

The project uses a custom user model (`CustomUser`) instead of Django's default User model:

- **USERNAME_FIELD**: `email`
- **REQUIRED_FIELDS**: `[]` (no required fields beyond email)
- **Features**: Phone authentication, Google OAuth support
- **Groups/Permissions**: Custom `related_name` to avoid conflicts

## Development

### Running Tests

```bash
python manage.py test
```

### Accessing Admin Panel

1. Navigate to `http://127.0.0.1:8000/admin/`
2. Login with superuser credentials
3. All models from both apps are registered and available

### Seeding Data

```bash
# Seed basic data
python manage.py seed_data

# Seed IIT/NIT data
python manage.py seed_iit_nit

# Seed rank/score data
python manage.py seed_ranks
```

### API Documentation

The API uses Django REST Framework. You can access the browsable API at:
- `http://127.0.0.1:8000/exams/`
- `http://127.0.0.1:8000/colleges/`
- etc.

### CORS Configuration

Currently, CORS is configured to allow all origins (`CORS_ALLOW_ALL_ORIGINS = True`). For production, update this to specific allowed origins.

## Notes

- The database uses SQLite3 for development. For production, consider PostgreSQL or MySQL.
- The custom user model requires proper migration handling. Ensure `AUTH_USER_MODEL` is set before running initial migrations.
- Mock test API endpoints are not yet implemented in views.py - models are ready for implementation.

## Future Enhancements

- Implement mock test API endpoints
- Add authentication endpoints (phone OTP, Google OAuth)
- Add test taking functionality
- Implement scoring and percentile calculation
- Add leaderboard API
- Add XP/gamification API endpoints
- Add study guild management APIs
