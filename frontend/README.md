# College Predictor Frontend

A modern, production-ready Next.js frontend for the College Predictor platform.

## Features

- 🎯 **Mock Tests** - Comprehensive mock test platform with real-time scoring
- 🎓 **College Predictor** - Find eligible colleges based on rank and category
- 📊 **Rank Predictor** - Estimate your rank from scores or percentiles
- 💰 **Scholarships** - Coming soon placeholder
- 📱 **Mobile-First** - Fully responsive design
- 🎨 **Modern UI** - Clean, engaging, student-friendly interface

## Tech Stack

- **Next.js 14** (App Router)
- **React 19**
- **Tailwind CSS**
- **Axios** for API calls

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Backend Django server running on `http://127.0.0.1:8000`

### Installation

1. **Install dependencies:**
```bash
npm install
   # or
   yarn install
```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` and set your API URL if different from default.

3. **Run development server:**
```bash
npm run dev
   # or
   yarn dev
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── layout.jsx          # Root layout
│   │   ├── page.jsx            # Home page
│   │   ├── mock-tests/         # Mock test pages
│   │   ├── predict-college/    # College predictor
│   │   ├── predict-rank/       # Rank predictor
│   │   └── scholarships/       # Scholarships placeholder
│   ├── components/             # Reusable components
│   │   ├── layout/            # Layout components (Navbar, Footer)
│   │   └── ...                # Other components
│   └── lib/                    # Utilities
│       └── api.js              # API client
├── public/                     # Static assets
├── next.config.js              # Next.js configuration
├── tailwind.config.js          # Tailwind CSS configuration
└── package.json
```

## API Integration

The frontend connects to Django REST Framework APIs:

- **Mock Tests**: `/mocktest/mock-tests/`
- **College Predictor**: `/predict-college/`
- **Rank Predictor**: `/get-rank-from-score/`

API configuration is in `src/lib/api.js` and uses the base URL from environment variables.

## Color Palette

- **Primary**: Indigo Velvet (#3d348b)
- **Secondary**: Medium Slate Blue (#7678ed)
- **Accent 1**: Amber Flame (#f7b801)
- **Accent 2**: Tiger Orange (#f18701)
- **Accent 3**: Cayenne Red (#f35b04)

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Building for Production

```bash
npm run build
npm run start
```

## Features Overview

### Home Page
- Hero section with CTAs
- Feature cards
- Benefits section
- Call-to-action banner

### Mock Tests
- Test listing page
- Test attempt page with timer
- Question navigation
- Results page with detailed analysis

### College Predictor
- Form-based input
- Real-time college matching
- Filterable results
- College cards with details

### Rank Predictor
- Score/Percentile input
- Rank range prediction
- Confidence indicators
- Visual feedback

## Notes

- The frontend is configured to proxy API requests through Next.js rewrites (see `next.config.js`)
- All pages are server-side rendered where possible for better performance
- Client components are used only where interactivity is required
- The design is mobile-first and fully responsive

## Troubleshooting

### API Connection Issues
- Ensure the Django backend is running on `http://127.0.0.1:8000`
- Check CORS settings in Django if accessing from different origin
- Verify API endpoints match the backend routes

### Build Issues
- Clear `.next` folder and rebuild: `rm -rf .next && npm run build`
- Check Node.js version (requires 18+)

## License

This project is part of the College Predictor platform.
