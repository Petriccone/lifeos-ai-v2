# LifeOS AI - Frontend

Next.js 14 frontend for LifeOS AI with dark mode UI and neon accents.

## Setup

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **UI**: React + TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Charts**: Recharts

## Pages

- `/` - Main dashboard with health score, metrics, tasks
- `/workouts` - Workout logging page
- `/chat` - AI chat interface

## Design System

- Dark mode only (`#0a0a0f` background)
- Neon accent colors (purple, pink, green, blue, orange)
- Circular gauges with gradient strokes
- Rounded cards (16px radius)

## Components

- `CircularGauge` - Main health score display
- `MetricRing` - Mini metric indicators
- `CategoryTile` - Category navigation buttons
- `TaskItem` - Task list items
- `AIChatBubble` - Chat messages
