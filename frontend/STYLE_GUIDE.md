# Style Guide - College Predictor & Rank Predictor

## Design System

### Colors

**Primary Colors:**
- **Primary Black**: `#1a1a1a` - Main text, buttons, borders
- **Secondary Black**: `#333333` - Hover states, gradients
- **Light Gray**: `#e5e5e5` - Borders, dividers
- **Background Gray**: `#f5f5f5` - Subtle backgrounds
- **Background Light**: `#f8f9fa` - Hero section backgrounds

**Text Colors:**
- **Primary Text**: `#1a1a1a` - Headings, important text
- **Secondary Text**: `#666` - Body text, labels
- **Tertiary Text**: `#999` - Subtle text, placeholders

**Status Colors:**
- **Success/Green**: `#2e7d32` - Eligibility badges
- **Success Background**: `#e8f5e9` - Success badge background

**White:**
- **Pure White**: `#ffffff` - Cards, backgrounds

### Typography

**Font Family:**
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
  'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
```

**Font Sizes:**
- Hero Title: `3rem` (48px) - Desktop, `2rem` (32px) - Mobile
- Section Title: `1.75rem` (28px)
- Card Title: `1.25rem` (20px)
- Body Text: `1rem` (16px)
- Small Text: `0.875rem` (14px)
- Tiny Text: `0.75rem` (12px)

**Font Weights:**
- Light: `400`
- Medium: `500`
- Semi-bold: `600`
- Bold: `700`

**Line Heights:**
- Headings: `1.2` - `1.3`
- Body: `1.6` - `1.7`

### Spacing

**Base Unit:** `1rem` (16px)

**Spacing Scale:**
- `0.25rem` (4px) - Tiny gaps
- `0.5rem` (8px) - Small gaps
- `0.75rem` (12px) - Medium-small gaps
- `1rem` (16px) - Base spacing
- `1.5rem` (24px) - Medium spacing
- `2rem` (32px) - Large spacing
- `3rem` (48px) - Extra large spacing
- `4rem` (64px) - Section spacing

### Border Radius

- Small: `6px` - Inputs, small buttons
- Medium: `8px` - Buttons, form containers
- Large: `12px` - Cards, large containers
- Extra Large: `16px` - Hero sections, result cards
- Pill: `20px` - Badges, tags

### Shadows

**Elevation Levels:**
```css
/* Level 1 - Subtle */
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

/* Level 2 - Medium */
box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);

/* Level 3 - Prominent */
box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
```

### Animations

**Timing Functions:**
- `ease-out` - Most common (smooth deceleration)
- `cubic-bezier(0.4, 0, 0.2, 1)` - Material Design easing
- `ease-in-out` - Symmetric animations

**Duration:**
- Fast: `0.2s` - Hover states
- Medium: `0.3s` - Transitions
- Slow: `0.4s` - `0.6s` - Page transitions, complex animations

**Common Animations:**
- `fadeIn` - Opacity 0 to 1
- `slideUp` - Translate Y from 20-30px to 0
- `slideDown` - Translate Y from -100% to 0
- `fadeInUp` - Combined fade and slide up

### Components

#### Buttons

**Primary Button:**
```css
padding: 1rem 2.5rem;
background: linear-gradient(135deg, #1a1a1a 0%, #333333 100%);
color: #ffffff;
border-radius: 8px;
font-weight: 600;
```

**Secondary Button:**
```css
padding: 0.625rem 1.25rem;
background: transparent;
border: 1.5px solid #1a1a1a;
color: #1a1a1a;
border-radius: 6px;
```

#### Cards

**Standard Card:**
```css
background: #ffffff;
border-radius: 12px;
padding: 1.5rem;
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
border: 1px solid #e5e5e5;
```

#### Form Inputs

**Input Field:**
```css
padding: 0.875rem 1.25rem;
border: 2px solid #e5e5e5;
border-radius: 8px;
font-size: 1rem;
```

**Focus State:**
```css
border-color: #1a1a1a;
box-shadow: 0 0 0 3px rgba(26, 26, 26, 0.1);
```

### Responsive Breakpoints

```css
/* Mobile */
@media (max-width: 640px) { }

/* Tablet */
@media (max-width: 968px) { }

/* Desktop */
@media (min-width: 969px) { }
```

### Grid System

**College Grid:**
```css
display: grid;
grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
gap: 1.5rem;
```

**Responsive:**
- Desktop: 3-4 columns
- Tablet: 2 columns
- Mobile: 1 column

### Icons

Icons are represented using emoji for simplicity:
- 🎓 - Education/College
- 📊 - Analytics/Rank
- ✅ - Success/Eligible
- 📍 - Location
- 📝 - Exam
- 🏷️ - Category
- 📅 - Date/Year
- → - Arrow/Next

### Accessibility

- All interactive elements have focus states
- Color contrast meets WCAG AA standards
- Semantic HTML structure
- Keyboard navigation support
- Screen reader friendly labels

### Best Practices

1. **Consistency**: Use the same spacing, colors, and typography throughout
2. **Hierarchy**: Clear visual hierarchy with font sizes and weights
3. **Whitespace**: Generous whitespace for breathing room
4. **Feedback**: Visual feedback for all interactions (hover, focus, active)
5. **Performance**: Smooth 60fps animations
6. **Responsive**: Mobile-first approach

