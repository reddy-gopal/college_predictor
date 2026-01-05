# College Predictor - Backend API

A Django REST Framework API for predicting college admissions and estimating ranks from exam scores. The backend provides two main prediction endpoints with intelligent algorithms for accurate results.

## Features

### 🎓 Predict College
Predicts eligible colleges based on rank, exam, category, and optional state filter. Returns detailed college information including course, branch, degree, and location.

### 📊 Predict Rank from Score/Percentile
Estimates rank using an advanced **Inverse Distance Weighting (IDW)** algorithm that handles overlapping rank bands intelligently. Supports both score and percentile inputs.

## Tech Stack

- **Django 6.0** - Web framework
- **Django REST Framework 3.16.1** - API framework
- **SQLite** - Database (default)
- **django-cors-headers 4.9.0** - CORS support

## Project Structure

```
backend/
├── backend/              # Django project settings
│   ├── settings.py      # Project configuration
│   ├── urls.py          # Root URL configuration
│   └── wsgi.py          # WSGI configuration
├── predictor/           # Main application
│   ├── models.py        # Database models
│   ├── views.py         # API views and logic
│   ├── serializers.py   # DRF serializers
│   ├── urls.py          # URL routing
│   └── admin.py         # Admin configuration
└── manage.py            # Django management script
```

## Database Models

### Core Models

1. **ExamModel** - Stores exam types (e.g., JEE, NAT, etc.)
2. **CollegeModel** - College information (name, location, type)
3. **CourseModel** - Course details (name, branch, degree, duration)
4. **CutoffModel** - Cutoff ranks for college admissions
5. **ScoreToRankModel** - Score/percentile to rank mappings
6. **Prediction** - Historical prediction records

### Key Relationships

- `CutoffModel` links exams, courses, and colleges
- `ScoreToRankModel` maps scores/percentiles to rank ranges
- `Prediction` stores prediction history

## API Endpoints

### ViewSets (CRUD Operations)

- `GET/POST /exams/` - List/create exams
- `GET/POST /colleges/` - List/create colleges
- `GET/POST /courses/` - List/create courses
- `GET/POST /cutoffs/` - List/create cutoffs
- `GET/POST /predictions/` - List/create predictions
- `GET/POST /score-to-rank/` - List/create score-to-rank mappings

### Prediction Endpoints

#### 1. Predict College
**Endpoint:** `POST /predict-college/`

**Request Body:**
```json
{
    "input_rank": 5000,
    "exam": 1,
    "category": "General",
    "state": "Telangana"  // Optional
}
```

**Response:**
```json
{
    "message": "Colleges predicted successfully",
    "predicted_result": {
        "colleges": [
            {
                "college_name": "ABC College",
                "course_name": "Computer Science",
                "branch": "CSE",
                "degree": "B.Tech",
                "location": "Hyderabad"
            }
        ],
        "input_rank": 5000,
        "exam": "JEE",
        "category": "General",
        "state": "Telangana",
        "branch_list": ["CSE", "ECE"]
    }
}
```

**Algorithm:**
- Filters cutoffs by exam, category, and optional state
- Finds colleges where `opening_rank <= input_rank <= closing_rank`
- Returns all matching colleges with course details

#### 2. Get Rank from Score/Percentile
**Endpoint:** `POST /get-rank-from-score/`

**Request Body:**
```json
{
    "exam": "NAT",
    "category": "General",
    "year": 2025,
    "score": 120  // OR "percentile": 85.5
}
```

**Response:**
```json
{
    "message": "Rank found successfully",
    "data": {
        "exam": "NAT",
        "year": 2025,
        "category": "General",
        "input_type": "score",
        "input_value": 120.0,
        "rank_low": 1,
        "rank_high": 50,
        "estimated_rank": 25,
        "bands_used": 3,
        "weighting": {
            "method": "IDW",
            "p": 2,
            "K": 5
        }
    }
}
```

**Algorithm: Inverse Distance Weighting (IDW)**

The rank prediction uses an advanced weighted algorithm. First, let's understand what a **"band"** is:

### What is a Band?

A **band** is a single entry in the `ScoreToRankModel` that represents a range mapping:
- **Score/Percentile Range**: e.g., Score 100-150 or Percentile 85.0-95.0
- **Rank Range**: e.g., Rank 1-50

**Example Band:**
```json
{
    "exam": "NAT",
    "year": 2025,
    "category": "General",
    "score_low": 100,
    "score_high": 150,
    "rank_low": 1,
    "rank_high": 50
}
```
This band means: "If your score is between 100-150, your rank is likely between 1-50"

### Algorithm Steps with Example

**Scenario:** User inputs score = 120

**Step 1: Filter Matching Bands**
Find all bands where the input score (120) falls within the score range:
- Band A: Score 100-150 → Rank 1-50 ✅ (120 is in range)
- Band B: Score 95-110 → Rank 30-100 ✅ (120 is NOT in range)
- Band C: Score 80-130 → Rank 51-200 ✅ (120 is in range)
- Band D: Score 115-125 → Rank 25-75 ✅ (120 is in range)

**Result:** Bands A, C, and D match

**Step 2: Calculate Distance to Each Band's Midpoint**
For each matching band, calculate the distance from input (120) to the band's midpoint:

- **Band A**: Midpoint = (100+150)/2 = 125, Distance = |120-125| = 5
- **Band C**: Midpoint = (80+130)/2 = 105, Distance = |120-105| = 15
- **Band D**: Midpoint = (115+125)/2 = 120, Distance = |120-120| = 0

**Step 3: Select Nearest K Bands (K=5)**
Sort by distance and select the nearest K bands:
1. Band D (distance=0) - closest
2. Band A (distance=5)
3. Band C (distance=15)

**Step 4: Calculate Weighted Average**
Use IDW formula: `weight = 1 / (distance^p + ε)` where p=2

- **Band D**: weight = 1/(0² + 1e-9) = 1,000,000,000 (very high)
- **Band A**: weight = 1/(5² + 1e-9) = 0.04
- **Band C**: weight = 1/(15² + 1e-9) = 0.0044

Calculate weighted rank:
- Band D mid_rank = (25+75)/2 = 50, weighted = 50 × 1,000,000,000
- Band A mid_rank = (1+50)/2 = 25.5, weighted = 25.5 × 0.04
- Band C mid_rank = (51+200)/2 = 125.5, weighted = 125.5 × 0.0044

**Predicted Rank** = Σ(weighted_rank) / Σ(weight) ≈ 50 (dominated by Band D)

**Step 5: Calculate Overall Range**
- min_rank_low = min(1, 51, 25) = 1
- max_rank_high = max(50, 200, 75) = 200
- Clamp predicted rank (50) within [1, 200] → 50

**Final Result:**
- Rank Range: 1-200
- Estimated Rank: 50
- Bands Used: 3

### Why This Algorithm?

- **Handles Overlaps**: When multiple bands overlap (like Band A and Band D), it intelligently combines them
- **Prioritizes Accuracy**: Bands closer to your input get much higher weight
- **Robust**: Works even when bands have gaps or overlaps

**Features:**
- Handles overlapping rank bands intelligently
- Prioritizes bands closer to input value
- Returns both rank range and estimated rank
- Supports both score and percentile inputs

## Getting Started

### Prerequisites

- Python 3.8+
- pip

### Installation

1. Navigate to backend directory:
```bash
cd backend
```

2. Create virtual environment (if not exists):
```bash
python -m venv env
```

3. Activate virtual environment:
```bash
# Windows
env\Scripts\activate

# Linux/Mac
source env/bin/activate
```

4. Install dependencies:
```bash
pip install django djangorestframework django-cors-headers
```

5. Run migrations:
```bash
python manage.py migrate
```

6. Create superuser (optional):
```bash
python manage.py createsuperuser
```

7. Start development server:
```bash
python manage.py runserver
```

The API will be available at `http://127.0.0.1:8000`

## API Usage Examples

### Using cURL

**Predict College:**
```bash
curl -X POST http://127.0.0.1:8000/predict-college/ \
  -H "Content-Type: application/json" \
  -d '{
    "input_rank": 5000,
    "exam": 1,
    "category": "General",
    "state": "Telangana"
  }'
```

**Get Rank from Score:**
```bash
curl -X POST http://127.0.0.1:8000/get-rank-from-score/ \
  -H "Content-Type: application/json" \
  -d '{
    "exam": "NAT",
    "category": "General",
    "year": 2025,
    "score": 120
  }'
```

**Get Rank from Percentile:**
```bash
curl -X POST http://127.0.0.1:8000/get-rank-from-score/ \
  -H "Content-Type: application/json" \
  -d '{
    "exam": "NAT",
    "category": "General",
    "year": 2025,
    "percentile": 85.5
  }'
```

## Data Models Details

### ScoreToRankModel

Stores score/percentile to rank mappings with ranges:

- `exam` - ForeignKey to ExamModel
- `score_low`, `score_high` - Score range (nullable)
- `percentile_low`, `percentile_high` - Percentile range (nullable)
- `rank_low`, `rank_high` - Corresponding rank range
- `year` - Year of the data
- `category` - Category (General, SC, ST, OBC)

**Note:** Either score range OR percentile range should be provided (both can be null, but at least one should have values).

### CutoffModel

Stores college admission cutoffs:

- `exam` - ForeignKey to ExamModel
- `course` - ForeignKey to CourseModel
- `year` - Year
- `category` - Category (General, SC, ST, OBC)
- `quota` - Quota type (State, AIQ)
- `state` - State filter (default: 'All')
- `opening_rank`, `closing_rank` - Rank range for admission

## Error Handling

The API returns appropriate HTTP status codes:

- **200 OK** - Successful prediction
- **400 Bad Request** - Missing/invalid parameters
- **404 Not Found** - No matching data found
- **500 Internal Server Error** - Server errors

Error responses include a `message` field with details:
```json
{
    "message": "Missing required fields: exam, category, year"
}
```

## CORS Configuration

CORS is enabled for frontend integration. Configure allowed origins in `settings.py`:

```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",  # Vite default
    "http://127.0.0.1:5173",
]
```

## Admin Interface

Access the Django admin at `http://127.0.0.1:8000/admin/` to manage:
- Exams
- Colleges
- Courses
- Cutoffs
- Score-to-Rank mappings
- Prediction history

## Testing

### Seed Test Data

Create a management command to seed test data for `ScoreToRankModel`:

```python
# Example: python manage.py seed_data
```

This will create sample entries for testing the rank prediction algorithm.

## Algorithm Details

### IDW Weighted Rank Prediction

The rank prediction algorithm uses **Inverse Distance Weighting (IDW)**:

1. **Distance Calculation**: For each matching band, calculate distance from input value to band midpoint
2. **Band Selection**: Select K=5 nearest bands by distance
3. **Weight Assignment**: `w = 1 / (distance^2 + ε)`
   - Power p=2 gives strong preference to closer bands
   - ε prevents division by zero
4. **Weighted Average**: `predicted_rank = Σ(mid_rank × weight) / Σ(weight)`
5. **Range Clamping**: Ensure result is within [min_rank_low, max_rank_high]

This approach:
- Handles overlapping rank bands
- Provides more accurate predictions for edge cases
- Adapts to data density automatically

## License

This project is part of the College Predictor application.

