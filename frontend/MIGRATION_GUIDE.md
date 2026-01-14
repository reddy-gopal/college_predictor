# Migration Guide: Vite to Next.js

This guide helps you migrate from the existing Vite setup to the new Next.js App Router structure.

## What Changed

1. **Framework**: Migrated from Vite + React Router to Next.js 14 (App Router)
2. **Routing**: File-based routing instead of React Router
3. **Styling**: Added Tailwind CSS with custom color palette
4. **Structure**: New folder structure following Next.js conventions

## Migration Steps

### 1. Backup Current Setup (Optional)

```bash
# Create a backup of your current src folder
cp -r src src.backup
```

### 2. Install Dependencies

```bash
# Remove old dependencies
rm -rf node_modules package-lock.json

# Install new dependencies
npm install
```

### 3. Update Environment Variables

Create `.env.local`:
```bash
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

### 4. Test the Application

```bash
npm run dev
```

Visit `http://localhost:3000` to see the new frontend.

## Key Differences

### Routing

**Before (Vite + React Router):**
```jsx
<Route path="/predict-college" element={<PredictCollegeForm />} />
```

**After (Next.js App Router):**
- File: `src/app/predict-college/page.jsx`
- Automatic routing based on file structure

### API Calls

**Before:**
```jsx
import api from './api/apiClient';
api.post('/predict-college/', data);
```

**After:**
```jsx
import { collegePredictorApi } from '@/lib/api';
collegePredictorApi.predict(data);
```

### Styling

**Before:** Custom CSS files
**After:** Tailwind CSS with utility classes

## Component Migration

Most components have been rewritten to:
- Use Next.js `Link` instead of React Router `Link`
- Use Tailwind CSS instead of custom CSS
- Follow Next.js patterns (server/client components)

## Old Files to Remove (After Testing)

Once you've verified everything works:
- `vite.config.js`
- `src/main.jsx` (if exists)
- Old `src/App.jsx` (replaced by `src/app/page.jsx`)
- Old component CSS files (now using Tailwind)

## Troubleshooting

### Port Conflicts
If port 3000 is in use:
```bash
# Next.js will automatically use the next available port
# Or specify: PORT=3001 npm run dev
```

### API Connection
If APIs don't work:
1. Check `.env.local` has correct API URL
2. Verify Django backend is running
3. Check CORS settings in Django

### Build Errors
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

## Need Help?

- Check `README.md` for detailed setup instructions
- Review Next.js docs: https://nextjs.org/docs
- Check Tailwind docs: https://tailwindcss.com/docs

