# Serona Web - Medical Assistant

Next.js web application for recording and transcribing patient discussions with Deepgram AI.

## Features

- **Audio Recording**: Browser-based audio recording using MediaRecorder API
- **AI Transcription**: Automatic transcription with Deepgram Nova-2 model
- **Session Management**: Track and verify patient discussion sessions
- **Insights Dashboard**: Analytics and visualizations of patient data
- **Modern UI**: Built with Next.js 15, React 19, and ShadCN UI components

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + ShadCN UI
- **State Management**: React Query (@tanstack/react-query)
- **Transcription**: Deepgram API
- **Icons**: Lucide React
- **Charts**: Recharts

## Getting Started

### Prerequisites

- Node.js 18+
- Deepgram API key

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.local.example .env.local
   ```

   Edit `.env.local` and add your Deepgram API key:
   ```
   DEEPGRAM_API_KEY=your_api_key_here
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
web/
├── app/
│   ├── api/
│   │   └── transcribe/
│   │       └── route.ts        # Deepgram API endpoint
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Home page
│   └── globals.css             # Global styles
├── components/
│   ├── providers/
│   │   └── query-provider.tsx  # React Query provider
│   ├── ui/                     # ShadCN UI components
│   ├── RecordingButton.tsx     # Audio recording component
│   ├── SessionDashboard.tsx    # Session management
│   ├── Dashboard.tsx           # Analytics dashboard
│   └── NextSteps.tsx           # Recommendations
├── lib/
│   └── utils.ts                # Utility functions
└── public/                     # Static assets
```

## Key Components

### RecordingButton
Uses the Web MediaRecorder API to capture audio, then sends it to the Deepgram API via the Next.js API route for transcription.

### API Route (/api/transcribe)
Server-side endpoint that securely handles Deepgram API calls, keeping your API key safe.

### Session Dashboard
Displays recorded sessions with transcriptions, allows verification and management of patient discussions.

## Browser Support

The MediaRecorder API requires:
- Modern browsers (Chrome, Firefox, Edge, Safari)
- HTTPS or localhost (for microphone access)
- User permission for microphone access

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DEEPGRAM_API_KEY` | Your Deepgram API key | Yes |

## Build for Production

```bash
npm run build
npm start
```

## Development

```bash
npm run dev       # Start dev server
npm run lint      # Run ESLint
npm run build     # Build for production
```

## Migration from Vite

This app was migrated from Vite + React to Next.js 15:

- Replaced React Router with Next.js App Router
- Converted client components to use `'use client'` directive
- Moved Deepgram API calls to server-side API routes
- Updated build configuration and dependencies
- Preserved all ShadCN UI components and styling

## License

Private - All rights reserved
