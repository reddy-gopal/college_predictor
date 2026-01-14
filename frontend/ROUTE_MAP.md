# Frontend Route Map

## 🗺️ Complete Route Structure

```
/ (Home)
├── Public landing page
├── Hero section with CTAs
├── Feature cards
└── Benefits section

/onboarding
├── 3-screen carousel
├── Skip button
└── Progress indicators

/login
├── Phone number input
├── OTP verification screen
├── Google login button
└── Link to registration

/register
├── Full name
├── Phone (pre-filled)
├── Class level
├── Exam target
├── Preferred branches
└── Privacy acknowledgment

/onboarding-preferences
├── Step 1: Target exam
├── Step 2: Target rank
├── Step 3: Tests per week
└── Progress bar

/dashboard
├── Status bar (greeting, exam, days left)
├── Snapshot cards (4 cards)
├── Progress graphs (3 charts)
├── Today's focus tasks
└── Quick links (4 cards)

/mock-tests
├── Test listing grid
├── Test cards with details
└── "Start Test" buttons

/mock-tests/[id]
├── Timer countdown
├── Question navigation sidebar
├── Question display
├── Answer selection
├── Auto-save answers
└── Submit button

/mock-tests/[id]/results
├── Score summary (3 cards)
├── Performance breakdown
├── Answer review
├── Explanations
└── Action buttons

/predict-college
├── Form (rank, exam, category, state, branches)
├── Results grid
└── College cards

/predict-rank
├── Input type toggle (Score/Percentile)
├── Form (exam, category, year, value)
└── Results card with confidence

/scholarships
├── Coming soon message
├── Feature preview cards
└── Navigation links
```

## 📊 Component Hierarchy

```
RootLayout
├── AuthProvider
│   ├── Navbar
│   │   ├── Logo
│   │   ├── Navigation Links
│   │   ├── Login/Dashboard Button
│   │   └── Mobile Menu
│   │
│   ├── Main Content (Routes)
│   │   ├── HomePage
│   │   ├── OnboardingCarousel
│   │   ├── LoginPage
│   │   ├── RegisterPage
│   │   ├── OnboardingPreferencesPage
│   │   ├── DashboardPage
│   │   ├── MockTestsPage
│   │   ├── MockTestAttemptPage
│   │   ├── MockTestResultsPage
│   │   ├── PredictCollegePage
│   │   ├── PredictRankPage
│   │   └── ScholarshipsPage
│   │
│   └── Footer
│       ├── Brand
│       ├── Quick Links
│       └── Support Links
```

## 🔑 Key Components

### Layout Components
- **Navbar**: Sticky, responsive, context-aware (shows Login/Dashboard)
- **Footer**: Links, brand info, support

### Auth Components
- **OnboardingCarousel**: 3 screens with transitions
- **AuthContext**: Global state management

### Feature Components
- **CollegeCard**: Displays college results
- **RankResultCard**: Shows rank prediction results

### Page Components
- All pages are self-contained with their own logic
- Server components where possible
- Client components for interactivity

## 🎨 Styling System

### Tailwind Utilities
- `btn-primary` - Primary button style
- `btn-secondary` - Secondary button style
- `btn-accent` - Accent button style
- `card` - Card container
- `input-field` - Form input
- `section-container` - Page container
- `section-title` - Section heading
- `text-gradient` - Gradient text

### Color Usage
- **Primary** (#3d348b): Main actions, active states
- **Secondary** (#7678ed): Secondary actions, accents
- **Accent 1** (#f7b801): Highlights, CTAs
- **Accent 2** (#f18701): Warm accents
- **Accent 3** (#f35b04): Urgent/important items

## 📱 Responsive Breakpoints

- **Mobile**: < 640px (default, mobile-first)
- **Tablet**: 640px - 768px (sm)
- **Desktop**: 768px+ (md)
- **Large Desktop**: 1024px+ (lg)

## 🔄 Data Flow

### Authentication Flow
```
User Action → AuthContext → localStorage → API (future) → Backend
```

### Mock Test Flow
```
List Tests → Select Test → Create Attempt → Answer Questions → Submit → View Results
```

### Prediction Flow
```
Fill Form → Submit → API Call → Display Results
```

## 🚀 Running the Frontend

```bash
cd frontend
npm install
npm run dev
```

Visit: `http://localhost:3000`

## 📝 Current Status Summary

✅ **Completed:**
- All pages implemented
- Authentication UI flow
- Dashboard with all sections
- Mock test flow (UI complete)
- College & Rank predictors
- Responsive design
- Brand colors applied

⚠️ **Needs Backend Integration:**
- OTP authentication
- User registration API
- Dashboard data APIs
- Test attempt APIs
- XP/Leaderboard APIs

