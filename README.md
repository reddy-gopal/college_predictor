# College Predictor & Rank Predictor

A comprehensive web application that helps students predict eligible colleges based on their exam rank and estimate their rank from exam scores or percentiles. The application features a modern, intuitive interface with advanced prediction algorithms for accurate results.

---

## 🎯 What is This Project?

**College Predictor & Rank Predictor** is a full-stack web application designed to assist students in making informed decisions about college admissions. The application provides two main functionalities:

1. **College Prediction**: Predicts eligible colleges and courses based on exam rank, category, and optional state filter
2. **Rank Prediction**: Estimates exam rank from score or percentile using an advanced weighted algorithm

The application is built with a React frontend and Django REST Framework backend, providing a seamless user experience with real-time predictions.

---

## ✨ Key Features

### 🎓 Predict College
- Predict colleges based on exam rank
- Filter by exam type, category, and optional state
- View detailed college information (name, location, course, branch, degree type)
- Support for multiple categories (General, SC, ST, OBC, EWS, PwD variants)
- Support for various quotas (State, AIQ, AI, AP, GO, HS, JK, LA, OS)

### 📊 Predict Rank
- Estimate rank from exam score or percentile
- Support for multiple exam types and categories
- Advanced **Inverse Distance Weighting (IDW)** algorithm
- Handles overlapping rank bands intelligently
- Returns rank range and estimated rank

### 🎨 User Interface
- Clean, modern UI with smooth animations
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

1. **Backend**: Visit `http://127.0.0.1:8000/admin/` (if superuser created)
2. **Frontend**: Visit `http://localhost:5173` and verify the UI loads
3. **API**: Test endpoints using Postman or curl

---

## 🚀 Basic Usage

### Predict College

1. Open the application in your browser (`http://localhost:5173`)
2. Ensure you're on the **"Predict College"** tab (default)
3. Fill in the form:
   - **Rank**: Enter your exam rank (e.g., 5000)
   - **Exam**: Select exam type from dropdown (e.g., JEE, NAT)
   - **Category**: Choose your category (General, SC, ST, OBC, etc.)
   - **State** (Optional): Filter by state (e.g., Telangana)
4. Click **"Predict Colleges"**
5. View the results showing all eligible colleges with details

### Predict Rank

1. Click on the **"Predict Rank"** tab
2. Fill in the form:
   - **Exam**: Select exam type
   - **Category**: Choose your category
   - **Year**: Enter the exam year (e.g., 2025)
   - **Input Type**: Select either "Score" or "Percentile"
   - **Value**: Enter your score or percentile
3. Click **"Get Rank from Score"**
4. View the results showing estimated rank and rank range

---

## 📁 Project Structure

```
CollegePredictor/
├── backend/                          # Django backend
│   ├── backend/                      # Django project settings
│   ├── predictor/                    # Main Django app
│   ├── mocktest/                     # Mock test app
│   ├── manage.py                     # Django management script
│   └── requirements.txt              # Python dependencies
│
├── frontend/                          # React frontend
│   ├── src/                          # Source code
│   ├── package.json                  # Node.js dependencies
│   └── vite.config.js                # Vite configuration
│
└── README.md                         # This file
```

---

**Last Updated**: 2025

*Made with ❤️ for students seeking better college admission guidance*
