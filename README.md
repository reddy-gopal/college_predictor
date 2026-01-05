# College Predictor & Rank Predictor

A comprehensive web application that helps students predict eligible colleges based on their exam rank and estimate their rank from exam scores or percentiles. The application features a modern, intuitive interface with advanced prediction algorithms for accurate results.

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Why This Project Is Useful](#why-this-project-is-useful)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Installation & Setup](#installation--setup)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [Algorithms](#algorithms)
- [Data Management](#data-management)
- [Future Plans](#future-plans)
- [Contributing](#contributing)
- [License & Contact](#license--contact)

---

## 🎯 Project Overview

**College Predictor & Rank Predictor** is a full-stack web application designed to assist students in making informed decisions about college admissions. The application provides two main functionalities:

1. **College Prediction**: Predicts eligible colleges and courses based on exam rank, category, and optional state filter
2. **Rank Prediction**: Estimates exam rank from score or percentile using an advanced weighted algorithm

The application is built with a React frontend and Django REST Framework backend, providing a seamless user experience with real-time predictions.

---

## 💡 Why This Project Is Useful

- **Saves Time**: Students can quickly identify eligible colleges without manually checking multiple cutoff lists
- **Data-Driven Decisions**: Provides accurate predictions based on historical admission data
- **Accessibility**: Supports multiple categories (General, SC, ST, OBC, EWS, PwD variants) and quotas
- **Comprehensive Coverage**: Supports IIT, NIT, and other colleges with detailed course information
- **Intelligent Algorithms**: Uses Inverse Distance Weighting (IDW) for accurate rank estimation from overlapping data bands
- **User-Friendly Interface**: Clean, modern UI with smooth animations and intuitive navigation

---

## ✨ Key Features

### 🎓 Predict College
- Predict colleges based on exam rank
- Filter by exam type, category, and optional state
- View detailed college information:
  - College name and location
  - Course name and branch
  - Degree type (B.Tech, M.Tech, etc.)
  - Branch list summary
- Support for multiple categories (General, SC, ST, OBC, EWS, PwD variants)
- Support for various quotas (State, AIQ, AI, AP, GO, HS, JK, LA, OS)

### 📊 Predict Rank
- Estimate rank from exam score or percentile
- Support for multiple exam types and categories
- Advanced **Inverse Distance Weighting (IDW)** algorithm
- Handles overlapping rank bands intelligently
- Returns rank range and estimated rank
- Supports both score and percentile inputs

### 🎨 User Interface
- Clean white background with black text for optimal readability
- Smooth tab-based navigation
- Animated transitions and interactions
- Responsive design
- User-friendly error messages
- Real-time form validation

---

## 🛠 Tech Stack

### Frontend
- **React 19.2.0** - Modern UI library
- **Vite 7.2.4** - Fast build tool and dev server
- **React Hook Form 7.69.0** - Efficient form management
- **Axios 1.13.2** - HTTP client for API calls
- **CSS3** - Styling with animations and transitions

### Backend
- **Django 6.0** - High-level Python web framework
- **Django REST Framework 3.16.1** - Powerful API framework
- **SQLite** - Lightweight database (default, can be switched to PostgreSQL/MySQL)
- **django-cors-headers 4.9.0** - CORS support for frontend integration
- **scikit-learn 1.0.0** - Machine learning utilities (for future enhancements)
- **numpy 1.21.0** - Numerical computing

### Development Tools
- **ESLint** - Code linting
- **Git** - Version control

---

## 🏗 System Architecture

### Component Interaction

```
┌─────────────────┐
│   React Frontend │
│  (Port 5173)     │
└────────┬─────────┘
         │ HTTP Requests
         │ (Axios)
         ▼
┌─────────────────┐
│  Django Backend  │
│  (Port 8000)     │
│  REST API        │
└────────┬─────────┘
         │
         ▼
┌─────────────────┐
│   SQLite DB      │
│  (Models)        │
└─────────────────┘
```

### Data Flow

#### College Prediction Flow:
1. **User Input** → Frontend form (rank, exam, category, state)
2. **API Request** → `POST /predict-college/`
3. **Backend Processing**:
   - Validates input parameters
   - Queries `CutoffModel` with filters
   - Finds colleges where `opening_rank <= input_rank <= closing_rank`
   - Aggregates course and college information
4. **Response** → JSON with college list and details
5. **Display** → Frontend renders results in a formatted list

#### Rank Prediction Flow:
1. **User Input** → Frontend form (exam, category, year, score/percentile)
2. **API Request** → `POST /get-rank-from-score/`
3. **Backend Processing**:
   - Validates input (exactly one of score or percentile)
   - Queries `ScoreToRankModel` for matching bands
   - Applies **IDW Algorithm**:
     - Finds all bands containing the input value
     - Calculates distance to each band's midpoint
     - Selects K=5 nearest bands
     - Computes weighted average rank
   - Returns rank range and estimated rank
4. **Response** → JSON with rank prediction details
5. **Display** → Frontend shows estimated rank and range

---

## 📦 Installation & Setup

### Prerequisites

- **Python 3.8+** (for backend)
- **Node.js 16+** (for frontend)
- **pip** (Python package manager)
- **npm** or **yarn** (Node package manager)

### Backend Setup

1. **Clone the repository**:
```bash
git clone <repository-url>
cd CollegePredictor
```

2. **Navigate to backend directory**:
```bash
cd backend
```

3. **Create virtual environment**:
```bash
# Windows
python -m venv env
env\Scripts\activate

# Linux/Mac
python3 -m venv env
source env/bin/activate
```

4. **Install dependencies**:
```bash
pip install -r requirements.txt
```

5. **Run migrations**:
```bash
python manage.py migrate
```

6. **Create superuser (optional, for admin access)**:
```bash
python manage.py createsuperuser
```

7. **Start development server**:
```bash
python manage.py runserver
```

The backend API will be available at `http://127.0.0.1:8000`

### Frontend Setup

1. **Navigate to frontend directory** (in a new terminal):
```bash
cd frontend
```

2. **Install dependencies**:
```bash
npm install
```

3. **Start development server**:
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

### Verify Installation

1. Backend: Visit `http://127.0.0.1:8000/admin/` (if superuser created)
2. Frontend: Visit `http://localhost:5173` and verify the UI loads
3. API: Test endpoints using Postman or curl (see [API Endpoints](#api-endpoints))

---

## 🚀 Usage

### Predict College

1. Open the application in your browser (`http://localhost:5173`)
2. Ensure you're on the **"Predict College"** tab (default)
3. Fill in the form:
   - **Rank**: Enter your exam rank (e.g., 5000)
   - **Exam**: Select exam type from dropdown (e.g., JEE, NAT)
   - **Category**: Choose your category (General, SC, ST, OBC, etc.)
   - **State** (Optional): Filter by state (e.g., Telangana)
4. Click **"Predict Colleges"**
5. View the results showing all eligible colleges with:
   - College name and location
   - Course name and branch
   - Degree type
   - Branch list summary

### Predict Rank

1. Click on the **"Predict Rank"** tab
2. Fill in the form:
   - **Exam**: Select exam type
   - **Category**: Choose your category
   - **Year**: Enter the exam year (e.g., 2025)
   - **Input Type**: Select either "Score" or "Percentile"
   - **Value**: Enter your score or percentile
3. Click **"Get Rank from Score"**
4. View the results showing:
   - Estimated rank
   - Rank range (min to max)
   - Number of bands used
   - Algorithm details (IDW method)

### Example User Flow

**Scenario**: A student scored 120 marks in NAT exam (General category, 2025) and wants to know their rank.

1. Navigate to "Predict Rank" tab
2. Select: Exam = "NAT", Category = "General", Year = 2025
3. Select input type: "Score"
4. Enter: 120
5. Click "Get Rank from Score"
6. Result: Estimated rank = 25, Range = 1-50

**Next Step**: Use the estimated rank (25) in "Predict College" to find eligible colleges.

---

## 📁 Project Structure

```
CollegePredictor/
├── backend/                          # Django backend
│   ├── backend/                       # Django project settings
│   │   ├── __init__.py
│   │   ├── settings.py               # Project configuration, CORS, installed apps
│   │   ├── urls.py                   # Root URL configuration
│   │   ├── wsgi.py                   # WSGI configuration
│   │   └── asgi.py                   # ASGI configuration
│   ├── predictor/                     # Main Django app
│   │   ├── __init__.py
│   │   ├── models.py                 # Database models (Exam, College, Course, Cutoff, etc.)
│   │   ├── views.py                  # API views and prediction logic
│   │   ├── serializers.py            # DRF serializers
│   │   ├── urls.py                   # App URL routing
│   │   ├── admin.py                  # Django admin configuration
│   │   ├── management/
│   │   │   └── commands/             # Django management commands
│   │   │       ├── seed_iit_nit.py  # Seed IIT/NIT data from CSV
│   │   │       └── clear_cutoffs.py # Clear cutoff data
│   │   └── migrations/               # Database migrations
│   ├── db.sqlite3                    # SQLite database (default)
│   ├── manage.py                     # Django management script
│   ├── requirements.txt              # Python dependencies
│   ├── Readme.md                     # Backend-specific documentation
│   └── iit-and-nit-colleges-admission-criteria-version-2.csv  # Data source
│
├── frontend/                          # React frontend
│   ├── src/
│   │   ├── api/                      # API client modules
│   │   │   ├── apiClient.js         # Axios instance configuration
│   │   │   ├── examsApi.js          # Fetch exams endpoint
│   │   │   ├── predictionApi.js     # College prediction endpoint
│   │   │   ├── getRankFromScoreApi.js  # Rank prediction endpoint
│   │   │   └── categoriesApi.js     # Fetch categories endpoint
│   │   ├── components/              # React components
│   │   │   ├── Navbar.jsx           # Top navigation bar
│   │   │   ├── Navbar.css           # Navbar styles
│   │   │   ├── Tabs.jsx             # Tab switching component
│   │   │   ├── Tabs.css             # Tabs styles
│   │   │   ├── PredictCollegeForm.jsx  # College prediction form
│   │   │   ├── PredictRank.jsx      # Rank prediction form
│   │   │   └── Form.css             # Shared form styles
│   │   ├── App.jsx                  # Main application component
│   │   ├── App.css                  # Application styles
│   │   ├── index.css                # Global styles
│   │   └── main.jsx                 # Application entry point
│   ├── package.json                 # Node.js dependencies and scripts
│   ├── vite.config.js               # Vite configuration
│   ├── eslint.config.js             # ESLint configuration
│   └── README.md                    # Frontend-specific documentation
│
└── README.md                         # This file (main project documentation)
```

### Key Directories

- **`backend/predictor/models.py`**: Defines all database models (ExamModel, CollegeModel, CourseModel, CutoffModel, ScoreToRankModel, Prediction)
- **`backend/predictor/views.py`**: Contains API endpoints and prediction algorithms
- **`backend/predictor/management/commands/`**: Django management commands for data seeding
- **`frontend/src/api/`**: API client functions for backend communication
- **`frontend/src/components/`**: Reusable React components

---

## 🔌 API Endpoints

### Base URL
```
http://127.0.0.1:8000
```

### ViewSets (CRUD Operations)

All ViewSets support standard REST operations (GET, POST, PUT, PATCH, DELETE):

- **`GET/POST /exams/`** - List/create exams
- **`GET/POST /colleges/`** - List/create colleges
- **`GET/POST /courses/`** - List/create courses
- **`GET/POST /cutoffs/`** - List/create cutoffs
- **`GET/POST /predictions/`** - List/create predictions
- **`GET/POST /score-to-rank/`** - List/create score-to-rank mappings

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

**Response (200 OK):**
```json
{
    "message": "Colleges predicted successfully",
    "predicted_result": {
        "colleges": [
            {
                "college_name": "IIT Hyderabad",
                "course_name": "Computer Science and Engineering",
                "branch": "Computer Science and Engineering",
                "degree": "Bachelor of Technology",
                "location": "IIT"
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

**Error Responses:**
- `400 Bad Request`: Missing or invalid parameters
- `404 Not Found`: Exam not found or no colleges match criteria

#### 2. Get Rank from Score/Percentile
**Endpoint:** `POST /get-rank-from-score/`

**Request Body (Score):**
```json
{
    "exam": "NAT",
    "category": "General",
    "year": 2025,
    "score": 120
}
```

**Request Body (Percentile):**
```json
{
    "exam": "NAT",
    "category": "General",
    "year": 2025,
    "percentile": 85.5
}
```

**Response (200 OK):**
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

**Error Responses:**
- `400 Bad Request`: Missing fields, invalid data types, or both score and percentile provided
- `404 Not Found`: Exam not found or no rank mapping found

#### 3. Get Categories
**Endpoint:** `GET /get-categories/`

**Response (200 OK):**
```json
{
    "categories": [
        "General",
        "SC",
        "ST",
        "OBC",
        "EWS",
        "GEN-EWS",
        "GEN-EWS-PWD",
        "GEN-PWD",
        "OBC-NCL",
        "OBC-NCL-PWD",
        "SC-PWD",
        "ST-PWD",
        "EWS-PWD"
    ]
}
```

### API Usage Examples

**Using cURL:**

```bash
# Predict College
curl -X POST http://127.0.0.1:8000/predict-college/ \
  -H "Content-Type: application/json" \
  -d '{
    "input_rank": 5000,
    "exam": 1,
    "category": "General",
    "state": "Telangana"
  }'

# Get Rank from Score
curl -X POST http://127.0.0.1:8000/get-rank-from-score/ \
  -H "Content-Type: application/json" \
  -d '{
    "exam": "NAT",
    "category": "General",
    "year": 2025,
    "score": 120
  }'
```

---

## 🧮 Algorithms

### College Prediction Algorithm

The college prediction uses a straightforward filtering approach:

1. **Input Validation**: Validates rank, exam ID, and category
2. **Database Query**: Filters `CutoffModel` by:
   - Exam
   - Category
   - Optional state filter
3. **Rank Matching**: Finds all cutoffs where:
   ```
   opening_rank <= input_rank <= closing_rank
   ```
4. **Result Aggregation**: Collects unique colleges and courses
5. **Response**: Returns formatted list with college details

**Time Complexity**: O(n) where n is the number of cutoff entries
**Space Complexity**: O(m) where m is the number of matching colleges

### Rank Prediction Algorithm: Inverse Distance Weighting (IDW)

The rank prediction uses an advanced **Inverse Distance Weighting (IDW)** algorithm to handle overlapping rank bands intelligently.

#### What is a Band?

A **band** is a single entry in `ScoreToRankModel` representing a range mapping:
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

This means: *"If your score is between 100-150, your rank is likely between 1-50"*

#### Algorithm Steps

**Scenario**: User inputs score = 120

**Step 1: Filter Matching Bands**
Find all bands where the input value falls within the range:
- Band A: Score 100-150 → Rank 1-50 ✅ (120 is in range)
- Band B: Score 95-110 → Rank 30-100 ❌ (120 is NOT in range)
- Band C: Score 80-130 → Rank 51-200 ✅ (120 is in range)
- Band D: Score 115-125 → Rank 25-75 ✅ (120 is in range)

**Result**: Bands A, C, and D match

**Step 2: Calculate Distance to Each Band's Midpoint**
For each matching band, calculate distance from input (120) to band's midpoint:
- **Band A**: Midpoint = (100+150)/2 = 125, Distance = |120-125| = 5
- **Band C**: Midpoint = (80+130)/2 = 105, Distance = |120-105| = 15
- **Band D**: Midpoint = (115+125)/2 = 120, Distance = |120-120| = 0

**Step 3: Select Nearest K Bands (K=5)**
Sort by distance and select the nearest K bands:
1. Band D (distance=0) - closest
2. Band A (distance=5)
3. Band C (distance=15)

**Step 4: Calculate Weighted Average**
Use IDW formula: `weight = 1 / (distance^p + ε)` where p=2, ε=1e-9

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

#### Why IDW?

- **Handles Overlaps**: When multiple bands overlap, it intelligently combines them
- **Prioritizes Accuracy**: Bands closer to your input get much higher weight
- **Robust**: Works even when bands have gaps or overlaps
- **Adaptive**: Automatically adjusts to data density

**Parameters:**
- **K = 5**: Number of nearest bands to consider
- **p = 2**: Power parameter (higher = stronger preference for closer bands)
- **ε = 1e-9**: Small epsilon to prevent division by zero

**Time Complexity**: O(n log n) where n is the number of matching bands (due to sorting)
**Space Complexity**: O(K) where K is the number of selected bands

---

## 💾 Data Management

### Database Models

#### Core Models

1. **ExamModel**: Stores exam types (JEE, NAT, etc.)
2. **CollegeModel**: College information (name, location, type)
3. **CourseModel**: Course details (name, branch, degree, duration, total_seats)
4. **CutoffModel**: Cutoff ranks for college admissions
   - Fields: exam, course, year, category, quota, state, opening_rank, closing_rank, seat_type
   - Supports multiple categories and quotas (IIT/NIT specific)
5. **ScoreToRankModel**: Score/percentile to rank mappings
   - Fields: exam, score_low, score_high, percentile_low, percentile_high, rank_low, rank_high, year, category
6. **Prediction**: Historical prediction records (stores prediction history)

### Seeding Data

#### Seed IIT/NIT Data

Import IIT and NIT college admission data from CSV:

```bash
python manage.py seed_iit_nit --exam-id 2
```

**Options:**
- `--exam-id`: Exam ID to use for all cutoffs (default: 2)
- `--csv-file`: Path to CSV file (default: `iit-and-nit-colleges-admission-criteria-version-2.csv`)

**Features:**
- Automatically creates colleges and courses
- Maps categories and quotas correctly
- Handles PwD variants
- Cleans rank values (removes 'P' suffix)
- Maps state-specific quotas to appropriate states

#### Clear Cutoff Data

Delete all cutoff entries:

```bash
# Dry run (shows count)
python manage.py clear_cutoffs

# Actual deletion
python manage.py clear_cutoffs --confirm
```

### Admin Interface

Access Django admin at `http://127.0.0.1:8000/admin/` to:
- Manage exams, colleges, courses
- View and edit cutoffs
- Manage score-to-rank mappings
- View prediction history

---

## 🔮 Future Plans

### Short-term Enhancements
- [ ] Add more exam types and categories
- [ ] Implement user authentication and personalized predictions
- [ ] Add comparison feature (compare multiple colleges side-by-side)
- [ ] Export results to PDF/CSV
- [ ] Add college details page with more information

### Medium-term Features
- [ ] Machine learning model integration for improved predictions
- [ ] Historical trend analysis (rank trends over years)
- [ ] Recommendation system based on user preferences
- [ ] Mobile app (React Native)
- [ ] Multi-language support

### Long-term Vision
- [ ] Integration with official exam result APIs
- [ ] Real-time cutoff updates
- [ ] Community features (reviews, discussions)
- [ ] Advanced analytics dashboard
- [ ] Integration with scholarship databases

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### How to Contribute

1. **Fork the repository**
2. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**:
   - Follow code style guidelines
   - Write/update tests if applicable
   - Update documentation
4. **Commit your changes**:
   ```bash
   git commit -m "Add: Description of your feature"
   ```
5. **Push to the branch**:
   ```bash
   git push origin feature/your-feature-name
   ```
6. **Open a Pull Request**

### Code Style

- **Python**: Follow PEP 8 guidelines
- **JavaScript/React**: Follow ESLint configuration
- **Commit Messages**: Use clear, descriptive messages
- **Documentation**: Update README and code comments

### Reporting Issues

If you find a bug or have a feature request:
1. Check existing issues first
2. Create a new issue with:
   - Clear description
   - Steps to reproduce (for bugs)
   - Expected vs actual behavior
   - Environment details

---

## 📄 License & Contact

### License

This project is open source. Please check the repository for specific license details.

### Contact

For questions, suggestions, or support:
- **Repository**: [GitHub Repository URL]
- **Issues**: [GitHub Issues URL]
- **Email**: [Your Email]

### Acknowledgments

- Django and Django REST Framework communities
- React and Vite teams
- All contributors and users of this project

---

## 📚 Additional Resources

### Documentation
- [Django Documentation](https://docs.djangoproject.com/)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)

### Related Files
- `backend/Readme.md` - Backend-specific documentation
- `frontend/README.md` - Frontend-specific documentation

---

**Last Updated**: 2025

**Version**: 1.0.0

---

*Made with ❤️ for students seeking better college admission guidance*

