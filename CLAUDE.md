# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React-based note-taking application called "Playful Data Lab" that combines manual note creation with AI-powered content generation. The app uses browser-based storage via Fireproof database and features a colorful, playful design with drag-and-drop file attachments.

## Architecture

**Single-file application**: The entire app is contained in `app.jsx` with multiple React components:
- `App` (main component): Manages global state, database queries, and layout
- `GeneratorForm`: Handles AI prompt input and generation triggers  
- `DetailEditor`: Provides inline editing for individual notes
- `TagEditor`: Manages tag addition/removal within the detail editor

**Key dependencies:**
- `dexie`: IndexedDB wrapper for browser-based data persistence
- `dexie-react-hooks`: React hooks for live queries and reactive database operations
- `dexie-cloud-addon`: Cloud sync capabilities with real-time collaboration
- `call-ai`: Handles streaming AI responses with structured JSON schema validation
- `use-vibes`: Provides the `ImgGen` component for image generation

**Database architecture**: 
- Uses Dexie.js with Dexie Cloud addon for sync capabilities
- Two IndexedDB tables: `notes` and `images` with `@id` for sync-compatible auto-generated IDs
- `database.js` exports database instance and helper functions (`noteHelpers`, `imageHelpers`, `syncHelpers`)
- Notes: `@id`, `type`, `title`, `details`, `tags[]`, `priority`, `_files{}`, `createdAt`, `owner`
- Images: `@id`, `type`, `createdAt`, `prompt`, `imageUrl`, `_files{}`, `owner`

**Cloud sync features**:
- Real-time synchronization across devices
- Offline-first with automatic sync when reconnected  
- Email-based passwordless authentication (OTP)
- Per-user data isolation with owner field
- Automatic conflict resolution

**State management**: Uses `useLiveQuery` from dexie-react-hooks for real-time database updates, React hooks for UI state, and derived state via `useMemo` for filtering and search.

## Development Commands

- `npm run dev` - Start development server on http://localhost:3000
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## Cloud Sync Setup

To enable real-time synchronization across devices:

1. **Create Dexie Cloud database**: `npx dexie-cloud create`
2. **Whitelist origins**: `npx dexie-cloud whitelist http://localhost:3000`
3. **Configure environment**: Copy `.env.example` to `.env` and update `DEXIE_CLOUD_URL`
4. **Update database config**: Replace demo URL in `database.js` with your actual database URL

See `setup-cloud.md` for detailed setup instructions.

## Development Notes

**Build system**: Uses Vite with React plugin for fast development and bundling. Tailwind CSS is configured for styling.

**AI Integration**: The `generateFromPrompt` function streams responses from an AI service, parsing JSON to create multiple notes in batches. It includes error handling for malformed JSON responses.

**File handling**: Implements drag-and-drop file attachment using native browser File API, storing files in document `_files` objects.

**Styling**: Uses Tailwind CSS classes with a distinctive color palette (yellow, blue, pink, orange accents) and bold black borders throughout for a "brutalist" design aesthetic.