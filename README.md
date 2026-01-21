# Collab Hub

A collaborative platform built with React, TypeScript, Vite, and Supabase. Connect with others, create groups, and collaborate seamlessly.

## Features

- 🔐 User Authentication with Supabase
- 👥 Group Management and Collaboration
- 💬 Real-time Chat Functionality
- 🎨 Modern UI with Tailwind CSS
- 📱 Responsive Design
- 🛡️ Protected Routes and Authorization

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui
- **Backend**: Supabase (PostgreSQL)
- **State Management**: React Context API
- **Form Handling**: React Hook Form

## Prerequisites

- Node.js (v16 or higher)
- npm or bun package manager
- Supabase account

## Local Development Setup

1. **Clone the repository**
   ```bash
   git clone <YOUR_GIT_URL>
   cd collab-hub
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or with bun
   bun install
   ```

3. **Environment Variables**
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start development server**
   ```bash
   npm run dev
   # or with bun
   bun run dev
   ```
   Server runs on `http://localhost:5173`

## Available Scripts

```bash
# Development server
npm run dev

# Build for production
npm run build

# Build for development
npm run build:dev

# Preview production build
npm run preview

# Run linting
npm run lint
```

---


## Supabase Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Get your project URL and API key from **Settings** → **API**
3. Create tables according to your schema
4. Add environment variables to `.env` file

---

## Project Structure

```
collab-hub/
├── src/
│   ├── components/       # React components
│   ├── pages/           # Page components
│   ├── contexts/        # React Context providers
│   ├── hooks/           # Custom React hooks
│   ├── integrations/    # Supabase integration
│   ├── lib/             # Utility functions
│   ├── App.tsx          # Main app component
│   └── main.tsx         # Entry point
├── supabase/            # Supabase migrations
├── public/              # Static assets
└── vite.config.ts       # Vite configuration
```

