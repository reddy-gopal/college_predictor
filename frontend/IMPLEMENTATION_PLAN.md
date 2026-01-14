# Frontend Implementation Plan

## Current State Analysis

### Backend APIs Available

#### Mock Test APIs (`/mocktest/`)
- `GET /mocktest/mock-tests/` - List all mock tests
- `GET /mocktest/mock-tests/{id}/` - Get test details
- `GET /mocktest/mock-tests/{id}/questions/` - Get questions for a test
- `POST /mocktest/test-attempts/` - Create test attempt
- `POST /mocktest/test-attempts/{id}/submit_answer/` - Submit/update answer
- `POST /mocktest/test-attempts/{id}/submit/` - Submit test and calculate score
- `GET /mocktest/test-attempts/{id}/answers/` - Get all answers
- `GET /mocktest/test-attempts/` - List user's attempts

#### College Predictor APIs (`/`)
- `POST /predict-college/` - Predict colleges
  - Body: `{ input_rank, exam, category, state?, branch_list? }`
- `GET /exams/` - List exams
- `GET /get-categories/` - Get categories

#### Rank Predictor APIs (`/`)
- `POST /get-rank-from-score/` - Get rank from score/percentile
  - Body: `{ exam, category, year, score? OR percentile? }`

### Current Frontend
- Vite + React (needs migration to Next.js App Router)
- Basic College Predictor and Rank Predictor components exist
- Missing Mock Test functionality
- Needs redesign with specified color palette

## Implementation Plan

### Phase 1: Next.js Setup & Migration
1. Initialize Next.js with App Router
2. Set up Tailwind CSS with custom color palette
3. Create folder structure
4. Set up API client utilities

### Phase 2: Core Layout & Navigation
1. Global layout with sticky navbar
2. Footer component
3. Navigation menu with all routes

### Phase 3: Home Page
1. Hero section with CTAs
2. Feature cards
3. Why Choose Us section
4. Call-to-action banner

### Phase 4: Mock Test Module
1. Mock Test listing page
2. Test attempt page with timer
3. Result page with score visualization

### Phase 5: College Predictor
1. Form-based input page
2. Results page with filters
3. College cards/table layout

### Phase 6: Rank Predictor
1. Form-based input page
2. Results with rank range visualization

### Phase 7: Scholarships Placeholder
1. Coming soon page with consistent styling

## Color Palette
- Primary: #3d348b (Indigo Velvet)
- Secondary: #7678ed (Medium Slate Blue)
- Accent 1: #f7b801 (Amber Flame)
- Accent 2: #f18701 (Tiger Orange)
- Accent 3: #f35b04 (Cayenne Red)

## Technology Stack
- Next.js 14+ (App Router)
- React 19
- Tailwind CSS
- TypeScript (optional but recommended)
- React Query or SWR for data fetching

