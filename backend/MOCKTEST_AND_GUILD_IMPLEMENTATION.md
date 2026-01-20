# Mocktest and Guild Implementation Documentation

This document provides a comprehensive overview of the current implementation of Mocktest and Guild (StudyGuild) features in the CollegePredictor backend.

## Table of Contents
1. [Mocktest Implementation](#mocktest-implementation)
2. [Guild (StudyGuild) Implementation](#guild-studyguild-implementation)
3. [API Endpoints](#api-endpoints)
4. [Data Models](#data-models)
5. [Usage Examples](#usage-examples)

---

## Mocktest Implementation

### Overview
The Mocktest system allows students to take practice tests, track their performance, and review mistakes. The system uses a **QuestionBank** architecture where questions are stored once and reused across multiple tests via the `MockTestQuestion` junction table.

### Key Features
- **Test Types**: Full Length, Practice, Sectional, Custom
- **Question Bank**: Centralized question storage with duplicate prevention
- **Test Attempts**: Track student performance with scoring and analytics
- **Mistake Notebook**: Automatically log incorrect answers for review
- **Dynamic Test Generation**: Generate tests from mistakes or based on filters

### Architecture

#### QuestionBank System
- **QuestionBank**: Stores unique questions (no duplicates)
- **MockTestQuestion**: Junction table linking tests to questions with question numbers
- **Question Hash**: SHA256 hash prevents duplicate questions

#### Test Flow
1. Student selects/creates a test
2. Test attempt is created
3. Student answers questions (stored in `StudentAnswer`)
4. Test is completed and scored
5. Mistakes are automatically logged to `MistakeNotebook`

---

## Guild (StudyGuild) Implementation

### Overview
StudyGuild allows students to form study groups, compete on leaderboards, and collaborate on learning.

### Key Features
- **Guild Creation**: Students can create study guilds
- **Membership Management**: Join/leave guilds
- **Leaderboard**: Track guild performance
- **Leader Management**: Transfer leadership

---

## API Endpoints

### Mocktest Endpoints

#### Base URL: `/mocktest/`

#### 1. List Mock Tests
```
GET /mocktest/mock-tests/
```
**Query Parameters:**
- `exam` (int): Filter by exam ID
- `year` (int): Filter by year
- `test_type` (str): Filter by test type (full_length, practice, sectional, custom)
- `include_inactive` (bool): Include inactive tests

**Response:**
```json
[
  {
    "id": 1,
    "title": "JEE Main 2023 Full Length Test",
    "exam": 1,
    "exam_name": "JEE Main",
    "test_type": "full_length",
    "test_type_display": "Full Length",
    "total_questions": 90,
    "questions_count": 90,
    "total_marks": 360.0,
    "duration_minutes": 180,
    "difficulty": 2,
    "difficulty_level": "medium",
    "is_vip": false,
    "is_active": true,
    "created_at": "2024-01-15T10:00:00Z"
  }
]
```

#### 2. Get Mock Test Details
```
GET /mocktest/mock-tests/{id}/
```
**Response:**
```json
{
  "id": 1,
  "title": "JEE Main 2023 Full Length Test",
  "exam": 1,
  "test_type": "full_length",
  "total_questions": 90,
  "total_marks": 360.0,
  "duration_minutes": 180,
  "marks_per_question": 4.0,
  "negative_marks": 1.0,
  "difficulty": {
    "id": 2,
    "level": "medium",
    "level_display": "Medium",
    "order": 2
  },
  "instructions": "Test instructions...",
  "is_vip": false,
  "is_active": true,
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-15T10:00:00Z"
}
```

#### 3. Get Test Questions
```
GET /mocktest/mock-tests/{id}/questions/
```
**Response:**
```json
[
  {
    "id": 1,
    "question_type": "mcq",
    "question_type_display": "Multiple Choice Question",
    "text": "What is the value of x?",
    "subject": "Physics",
    "exam": 1,
    "year": 2023,
    "option_a": "Option A",
    "option_b": "Option B",
    "option_c": "Option C",
    "option_d": "Option D",
    "correct_option": "A",
    "difficulty_level": {
      "id": 2,
      "level": "medium",
      "level_display": "Medium"
    },
    "topic": "Mechanics",
    "explanation": "Explanation text...",
    "marks": 4.0,
    "negative_marks": 1.0,
    "question_number": 1,
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-15T10:00:00Z"
  }
]
```

#### 4. Create Test Attempt
```
POST /mocktest/test-attempts/
```
**Request Body:**
```json
{
  "mock_test_id": 1
}
```
**Response:**
```json
{
  "id": 1,
  "student": 1,
  "mock_test": 1,
  "test_mode": "preset",
  "score": 0.0,
  "percentage": 0.0,
  "percentile": null,
  "is_completed": false,
  "started_at": "2024-01-20T10:00:00Z",
  "completed_at": null,
  "time_taken_seconds": 0,
  "correct_count": 0,
  "wrong_count": 0,
  "unanswered_count": 0
}
```

#### 5. Submit Answer
```
POST /mocktest/test-attempts/{id}/submit_answer/
```
**Request Body:**
```json
{
  "question_bank": 1,
  "selected_option": "A",
  "time_taken_seconds": 120
}
```

#### 6. Complete Test
```
POST /mocktest/test-attempts/{id}/complete/
```
**Response:**
```json
{
  "id": 1,
  "score": 320.0,
  "percentage": 88.89,
  "percentile": 85.5,
  "is_completed": true,
  "completed_at": "2024-01-20T11:30:00Z",
  "time_taken_seconds": 5400,
  "correct_count": 80,
  "wrong_count": 8,
  "unanswered_count": 2
}
```

#### 7. Get Test Answers
```
GET /mocktest/test-attempts/{id}/answers/
```
**Response:**
```json
[
  {
    "id": 1,
    "question": {
      "id": 1,
      "question_type": "mcq",
      "text": "What is the value of x?",
      "subject": "Physics",
      "correct_option": "A",
      "marks": 4.0,
      "negative_marks": 1.0
    },
    "selected_option": "A",
    "is_correct": true,
    "marks_obtained": 4.0,
    "time_taken_seconds": 120
  }
]
```

#### 8. Generate Test from Mistakes
```
POST /mocktest/mistake-notebook/generate-test/
```
**Request Body:**
```json
{
  "error_types": ["conceptual", "calculation"],
  "question_count": 30
}
```

#### 9. Generate Custom Test
```
POST /mocktest/generate-test/
```
**Request Body:**
```json
{
  "exam": 1,
  "years": [2022, 2023],
  "test_type": "practice",
  "subjects": ["Physics", "Chemistry"],
  "difficulty": ["medium", "hard"],
  "question_count": 30,
  "time_per_question": 2
}
```

#### 10. Get Available Questions Count
```
GET /mocktest/available-questions-count/
```
**Query Parameters:**
- `exam` (int): Required
- `years` (list): Array of years
- `subjects` (list): Array of subjects
- `difficulty` (list): Array of difficulty levels

**Response:**
```json
{
  "count": 150
}
```

#### 11. Get Exam Years
```
GET /mocktest/exam-years/?exam_id=1
```
**Response:**
```json
{
  "years": [2020, 2021, 2022, 2023, 2024]
}
```

---

### Guild (StudyGuild) Endpoints

#### Base URL: `/mocktest/`

#### 1. List Study Guilds
```
GET /mocktest/study-guilds/
```
**Response:**
```json
[
  {
    "id": 1,
    "name": "Physics Masters",
    "description": "Study group for physics enthusiasts",
    "leader": {
      "id": 1,
      "user": {
        "id": 1,
        "email": "leader@example.com"
      }
    },
    "members": [
      {
        "id": 2,
        "user": {
          "id": 2,
          "email": "member@example.com"
        }
      }
    ],
    "member_count": 5,
    "is_active": true,
    "created_at": "2024-01-15T10:00:00Z"
  }
]
```

#### 2. Create Study Guild
```
POST /mocktest/study-guilds/
```
**Request Body:**
```json
{
  "name": "Physics Masters",
  "description": "Study group for physics enthusiasts"
}
```
**Note:** Current user automatically becomes the leader.

#### 3. Join Guild
```
POST /mocktest/study-guilds/{id}/join/
```

#### 4. Leave Guild
```
POST /mocktest/study-guilds/{id}/leave/
```

#### 5. Transfer Leadership
```
POST /mocktest/study-guilds/{id}/transfer-leadership/
```
**Request Body:**
```json
{
  "new_leader_id": 2
}
```

---

## Data Models

### MockTest Model
```python
class MockTest(models.Model):
    title = models.CharField(max_length=200)
    exam = models.ForeignKey(Exam, on_delete=models.PROTECT)
    test_type = models.CharField(
        choices=[
            ('full_length', 'Full Length'),
            ('practice', 'Practice'),
            ('sectional', 'Sectional'),
            ('custom', 'Custom')
        ]
    )
    total_questions = models.PositiveIntegerField()
    total_marks = models.FloatField()
    duration_minutes = models.PositiveIntegerField()
    marks_per_question = models.FloatField(default=4.0)
    negative_marks = models.FloatField(default=1.0)
    difficulty = models.ForeignKey(DifficultyLevel, on_delete=models.PROTECT)
    instructions = models.TextField(blank=True)
    is_vip = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

### QuestionBank Model
```python
class QuestionBank(models.Model):
    question_type = models.CharField(
        choices=[
            ('mcq', 'Multiple Choice Question'),
            ('integer', 'Integer Type'),
            ('numerical', 'Numerical Value')
        ]
    )
    text = models.TextField()
    subject = models.CharField(max_length=50)
    exam = models.ForeignKey(Exam, on_delete=models.PROTECT, null=True, blank=True)
    year = models.PositiveIntegerField(null=True, blank=True)
    option_a = models.CharField(max_length=500, blank=True)
    option_b = models.CharField(max_length=500, blank=True)
    option_c = models.CharField(max_length=500, blank=True)
    option_d = models.CharField(max_length=500, blank=True)
    correct_option = models.CharField(max_length=10)
    difficulty_level = models.ForeignKey(DifficultyLevel, on_delete=models.PROTECT)
    topic = models.CharField(max_length=100, blank=True)
    explanation = models.TextField(blank=True)
    marks = models.FloatField(default=4.0)
    negative_marks = models.FloatField(default=1.0)
    is_active = models.BooleanField(default=True)
    question_hash = models.CharField(max_length=64, unique=True)  # SHA256 hash
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

### MockTestQuestion Model (Junction Table)
```python
class MockTestQuestion(models.Model):
    mock_test = models.ForeignKey(MockTest, on_delete=models.CASCADE)
    question = models.ForeignKey(QuestionBank, on_delete=models.CASCADE)
    question_number = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = [
            ('mock_test', 'question_number'),
            ('mock_test', 'question')
        ]
```

### TestAttempt Model
```python
class TestAttempt(models.Model):
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE)
    mock_test = models.ForeignKey(MockTest, on_delete=models.PROTECT)
    test_mode = models.CharField(
        choices=[
            ('preset', 'Preset Test'),
            ('custom', 'Custom Test')
        ],
        default='preset'
    )
    score = models.FloatField(default=0.0)
    percentage = models.FloatField(default=0.0)
    percentile = models.FloatField(null=True, blank=True)
    is_completed = models.BooleanField(default=False)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    time_taken_seconds = models.PositiveIntegerField(default=0)
    correct_count = models.PositiveIntegerField(default=0)
    wrong_count = models.PositiveIntegerField(default=0)
    unanswered_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

### StudentAnswer Model
```python
class StudentAnswer(models.Model):
    attempt = models.ForeignKey(TestAttempt, on_delete=models.CASCADE)
    question_bank = models.ForeignKey(QuestionBank, on_delete=models.PROTECT)
    selected_option = models.CharField(max_length=50, blank=True)
    is_correct = models.BooleanField(default=False)
    marks_obtained = models.FloatField(default=0.0)
    time_taken_seconds = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = [('attempt', 'question_bank')]
```

### MistakeNotebook Model
```python
class MistakeNotebook(models.Model):
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE)
    question_bank = models.ForeignKey(QuestionBank, on_delete=models.CASCADE)
    attempt = models.ForeignKey(TestAttempt, on_delete=models.CASCADE, null=True, blank=True)
    error_type = models.CharField(
        choices=[
            ('conceptual', 'Conceptual Error'),
            ('calculation', 'Calculation Error'),
            ('silly', 'Silly Mistake'),
            ('time_pressure', 'Time Pressure'),
            ('not_attempted', 'Not Attempted')
        ]
    )
    notes = models.TextField(blank=True)
    logged_at = models.DateTimeField(auto_now_add=True)
```

### StudyGuild Model
```python
class StudyGuild(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    leader = models.ForeignKey(
        StudentProfile,
        on_delete=models.PROTECT,
        related_name='led_guilds'
    )
    members = models.ManyToManyField(
        StudentProfile,
        related_name='guilds',
        blank=True
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

---

## Usage Examples

### Example 1: Take a Full Length Test

```javascript
// 1. List available tests
const response = await fetch('/mocktest/mock-tests/?exam=1&test_type=full_length', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const tests = await response.json();

// 2. Create test attempt
const attemptResponse = await fetch('/mocktest/test-attempts/', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    mock_test_id: tests[0].id
  })
});
const attempt = await attemptResponse.json();

// 3. Get questions
const questionsResponse = await fetch(`/mocktest/mock-tests/${tests[0].id}/questions/`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const questions = await questionsResponse.json();

// 4. Submit answers
for (const question of questions) {
  await fetch(`/mocktest/test-attempts/${attempt.id}/submit_answer/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      question_bank: question.id,
      selected_option: 'A',
      time_taken_seconds: 120
    })
  });
}

// 5. Complete test
const completeResponse = await fetch(`/mocktest/test-attempts/${attempt.id}/complete/`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const completedAttempt = await completeResponse.json();
```

### Example 2: Generate Test from Mistakes

```javascript
const response = await fetch('/mocktest/mistake-notebook/generate-test/', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    error_types: ['conceptual', 'calculation'],
    question_count: 30
  })
});
const newTest = await response.json();
```

### Example 3: Create and Join a Guild

```javascript
// 1. Create guild
const createResponse = await fetch('/mocktest/study-guilds/', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Physics Masters',
    description: 'Study group for physics enthusiasts'
  })
});
const guild = await createResponse.json();

// 2. Another user joins
const joinResponse = await fetch(`/mocktest/study-guilds/${guild.id}/join/`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${otherUserToken}`
  }
});
```

### Example 4: Get Test Results and Review Mistakes

```javascript
// 1. Get test attempt details
const attemptResponse = await fetch(`/mocktest/test-attempts/${attemptId}/`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const attempt = await attemptResponse.json();

// 2. Get answers
const answersResponse = await fetch(`/mocktest/test-attempts/${attemptId}/answers/`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const answers = await answersResponse.json();

// 3. Get mistakes from mistake notebook
const mistakesResponse = await fetch('/mocktest/mistake-notebook/', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const mistakes = await mistakesResponse.json();
```

---

## Key Implementation Details

### Question Bank Architecture
- **No Duplicates**: Questions are stored once in `QuestionBank` with a unique `question_hash`
- **Reusability**: Same question can be used in multiple tests via `MockTestQuestion`
- **Efficiency**: Reduces database size and ensures consistency

### Test Generation
- **From Mistakes**: Generate tests using questions from `MistakeNotebook`
- **Custom Filters**: Generate tests based on exam, year, subject, difficulty
- **Dynamic**: Tests are created on-demand and linked via `MockTestQuestion`

### Scoring System
- **Automatic Calculation**: Scores calculated when test is completed
- **Negative Marking**: Wrong answers deduct marks
- **Percentile Calculation**: Based on all attempts for the same test

### Mistake Tracking
- **Automatic Logging**: Mistakes logged automatically when test is completed
- **Error Types**: Categorized by error type (conceptual, calculation, etc.)
- **Review System**: Students can review and update mistake notes

### Guild System
- **Leadership**: One leader per guild
- **Membership**: Many-to-many relationship with students
- **Active Status**: Guilds can be deactivated

---

## Authentication

All endpoints require authentication except:
- `GET /mocktest/exams/` (read-only)
- `GET /mocktest/difficulty-levels/` (read-only)
- `GET /mocktest/mock-tests/` (read-only, filtered by active status)

Use JWT token in Authorization header:
```
Authorization: Bearer <token>
```

---

## Error Responses

All endpoints return standard HTTP status codes:
- `200 OK`: Success
- `201 Created`: Resource created
- `400 Bad Request`: Validation error
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Permission denied
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

Error response format:
```json
{
  "detail": "Error message here"
}
```

Validation errors:
```json
{
  "field_name": ["Error message"],
  "non_field_errors": ["General error message"]
}
```

---

## Notes

1. **Question Model Removed**: The old `Question` model has been completely removed. All questions now use `QuestionBank`.

2. **Migration Complete**: All existing questions have been migrated to `QuestionBank` and linked via `MockTestQuestion`.

3. **Backward Compatibility**: The API maintains backward compatibility - all endpoints work the same way, but now use `QuestionBank` internally.

4. **Performance**: The QuestionBank architecture improves performance by eliminating duplicate questions and reducing database size.

---

## Future Enhancements

Potential improvements:
- Question difficulty adjustment based on performance
- Adaptive test generation
- Guild competitions and challenges
- Advanced analytics and insights
- Question tagging and categorization

---

*Last Updated: January 2026*
*Version: 2.0 (Post QuestionBank Migration)*

