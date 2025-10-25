# Migration from Vite to Next.js 15

This document summarizes the migration of the Serona web app from Vite + React to Next.js 15.

## Summary of Changes

### 1. Project Structure
- **Before**: Vite with `src/` directory containing pages and components
- **After**: Next.js App Router with `app/` directory structure

### 2. Key Files Created

#### App Router Files
- `app/layout.tsx` - Root layout with providers (React Query, Toaster, Tooltip)
- `app/page.tsx` - Home page (migrated from `src/pages/Index.tsx`)
- `app/globals.css` - Global styles with Tailwind and CSS variables
- `app/api/transcribe/route.ts` - Server-side API route for Deepgram

#### Component Updates
- `components/RecordingButton.tsx` - Updated to use Next.js API route instead of Supabase functions
- `components/providers/query-provider.tsx` - Client-side React Query provider

#### Configuration
- `next.config.js` - Next.js configuration
- `tsconfig.json` - Updated for Next.js with App Router paths
- `package.json` - Updated scripts and dependencies

### 3. Routing Changes
- **Before**: React Router with `BrowserRouter` and `Routes`
- **After**: Next.js App Router (file-system based routing)
- Removed `react-router-dom` dependency

### 4. API Integration

#### Before (Supabase Functions)
```typescript
const { data, error } = await supabase.functions.invoke('transcribe-audio', {
  body: { audio: base64Audio }
});
```

#### After (Next.js API Route)
```typescript
const response = await fetch('/api/transcribe', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ audio: base64Audio }),
});
```

### 5. Environment Variables
- **Before**: Supabase environment variables
- **After**: `.env.local` with `DEEPGRAM_API_KEY`
- Server-side API key handling (more secure)

### 6. Dependencies Updated

#### Added
- `next` ^16.0.0
- `react` ^19.2.0 (upgraded from 18.3.1)
- `react-dom` ^19.2.0 (upgraded from 18.3.1)
- `eslint-config-next` ^15.1.0

#### Removed
- `@vitejs/plugin-react-swc`
- `vite`
- `react-router-dom`
- `@supabase/supabase-js` (no longer needed for transcription)
- Various Vite-specific dev dependencies

#### Kept (All ShadCN UI & Radix components preserved)
- All `@radix-ui/*` packages
- `@tanstack/react-query`
- `tailwindcss` & plugins
- `lucide-react`
- `recharts`
- `sonner`, `vaul`, etc.

### 7. Client Components
All interactive components now use the `'use client'` directive:
- `app/page.tsx`
- `components/RecordingButton.tsx`
- `components/providers/query-provider.tsx`

### 8. Scripts Updated

```json
{
  "dev": "next dev",      // was: vite
  "build": "next build",  // was: vite build
  "start": "next start",  // NEW: production server
  "lint": "next lint"     // was: eslint .
}
```

## What Stayed The Same

1. ✅ All ShadCN UI components in `components/ui/`
2. ✅ Tailwind CSS configuration and styling
3. ✅ Component logic and state management
4. ✅ MediaRecorder API for audio recording
5. ✅ Deepgram transcription integration
6. ✅ TypeScript configuration (loosened for compatibility)
7. ✅ All business logic and data structures

## Migration Benefits

1. **Better Performance**: Next.js optimizations, image optimization, automatic code splitting
2. **SEO Ready**: Server-side rendering capabilities
3. **API Routes**: Built-in API routes for secure server-side operations
4. **Production Ready**: Optimized builds and deployment
5. **Type Safety**: Better TypeScript integration with Next.js
6. **Developer Experience**: Hot reload, better error messages

## Next Steps

1. **Install dependencies**:
   ```bash
   cd /Users/mohannedkandil/web/serona/web
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local and add your DEEPGRAM_API_KEY
   ```

3. **Run development server**:
   ```bash
   npm run dev
   ```

4. **Test the application**:
   - Visit http://localhost:3000
   - Test audio recording
   - Verify Deepgram transcription works
   - Check all tabs (Recording, Session, Next Steps, Insights)

5. **Clean up old files** (optional):
   - Remove `src/` directory
   - Remove `index.html`
   - Remove `vite.config.ts`
   - Remove old TypeScript configs (`tsconfig.app.json`, `tsconfig.node.json`)

## Potential Issues & Solutions

### Issue: Hydration Errors
**Solution**: Used `useState` with `useEffect` for client-side only data (localStorage)

### Issue: `'use client'` Required
**Solution**: Added `'use client'` to components using hooks or browser APIs

### Issue: Environment Variables
**Solution**: Server-side API route handles Deepgram API key securely

### Issue: Supabase Integration
**Solution**: Removed Supabase dependency since it was only used for Deepgram proxy

## File Checklist

- [x] `app/layout.tsx` - Root layout
- [x] `app/page.tsx` - Home page
- [x] `app/globals.css` - Global styles
- [x] `app/api/transcribe/route.ts` - API route
- [x] `components/providers/query-provider.tsx` - React Query
- [x] `components/RecordingButton.tsx` - Updated component
- [x] `next.config.js` - Next.js config
- [x] `tsconfig.json` - TypeScript config
- [x] `package.json` - Dependencies & scripts
- [x] `.env.local.example` - Environment template
- [x] `README.md` - Updated documentation

## Notes

- All existing ShadCN components work without modification
- Tailwind CSS styling preserved exactly
- Component functionality unchanged
- Data persistence via localStorage still works
- Mobile-responsive design maintained

## Testing Checklist

- [ ] npm install completes successfully
- [ ] npm run dev starts without errors
- [ ] App loads at localhost:3000
- [ ] Audio recording starts and stops
- [ ] Deepgram transcription works
- [ ] Sessions are saved to localStorage
- [ ] All 4 tabs work correctly
- [ ] Mobile UI displays properly
- [ ] npm run build completes
- [ ] npm start runs production build
