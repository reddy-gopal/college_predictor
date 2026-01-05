# College Predictor - Frontend

A modern React application for predicting college admissions and rank estimation based on exam scores. This frontend provides an intuitive interface with tab-based navigation for two main features: **Predict College** and **Predict Rank**.

## Features

### 🎓 Predict College
- Predict colleges based on rank, exam, category, and optional state filter
- View detailed results including college name, course, branch, degree, and location
- Filter results by state (optional)

### 📊 Predict Rank
- Estimate rank from exam score or percentile
- Support for multiple exam types and categories
- Weighted rank prediction using Inverse Distance Weighting (IDW) algorithm
- Displays rank range and estimated rank

## Tech Stack

- **React 19.2.0** - UI library
- **Vite 7.2.4** - Build tool and dev server
- **React Hook Form 7.69.0** - Form management
- **Axios 1.13.2** - HTTP client
- **CSS3** - Styling with animations

## Project Structure

```
frontend/
├── src/
│   ├── api/                    # API client and endpoints
│   │   ├── apiClient.js        # Axios instance configuration
│   │   ├── examsApi.js         # Fetch available exams
│   │   ├── getRankFromScoreApi.js  # Rank prediction API
│   │   └── predictionApi.js    # College prediction API
│   ├── components/             # React components
│   │   ├── Navbar.jsx          # Top navigation bar
│   │   ├── Tabs.jsx            # Tab switching component
│   │   ├── PredictCollegeForm.jsx  # College prediction form
│   │   ├── PredictRank.jsx     # Rank prediction form
│   │   ├── Form.css            # Form styling
│   │   ├── Navbar.css          # Navbar styling
│   │   └── Tabs.css            # Tabs styling
│   ├── App.jsx                 # Main application component
│   ├── App.css                 # Application styles
│   ├── index.css               # Global styles
│   └── main.jsx               # Application entry point
└── package.json               # Dependencies and scripts
```

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

### Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Usage

### Predict College

1. Select the **Predict College** tab
2. Enter your rank
3. Select the exam type
4. Choose your category (General, SC, ST, OBC)
5. Optionally select a state
6. Click **Predict Colleges**
7. View the list of matching colleges with course details

### Predict Rank

1. Select the **Predict Rank** tab
2. Select the exam type
3. Choose your category
4. Enter the year
5. Select input type (Score or Percentile)
6. Enter your score or percentile value
7. Click **Get Rank from Score**
8. View the estimated rank range and predicted rank

## API Endpoints

The frontend communicates with the backend API at `http://127.0.0.1:8000`:

- `GET /exams/` - Fetch all available exams
- `POST /predict-college/` - Predict colleges based on rank
- `POST /get-rank-from-score/` - Estimate rank from score/percentile

## Features & Design

### UI/UX
- **Clean white background** with black text for optimal readability
- **Smooth animations** for tab switching and form interactions
- **Responsive design** with modern styling
- **User-friendly error messages** with clear feedback

### Form Validation
- Required field validation
- Input type validation (numbers for scores/ranks)
- Real-time error messages

### State Management
- Separate state for each tab's results
- Form state managed by React Hook Form
- Loading states for async operations

## Development

### Available Scripts

- `npm run dev` - Start development server with HMR
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Code Style

- ESLint configuration for code quality
- React Hooks best practices
- Component-based architecture

## Backend Integration

Make sure the Django backend is running on `http://127.0.0.1:8000` before using the application. The API client is configured in `src/api/apiClient.js`.

## License

This project is part of the College Predictor application.
