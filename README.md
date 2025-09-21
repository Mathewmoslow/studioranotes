# StudiOra Notes - Premium Academic Platform

## 🚀 Overview

StudiOra Notes is a revolutionary academic platform that combines intelligent scheduling (from StudentLife) with AI-powered note generation (from NotesAI) to create the ultimate study companion for students.

## ✨ Features

### From NotesAI
- 🤖 **AI-Powered Note Generation** - Create comprehensive notes from any source material
- 📚 **Smart Organization** - Automatic categorization by course and module
- 🗺️ **Concept Maps** - Visual learning with interactive concept maps
- ☁️ **Cloud Backup** - Google Drive integration for data safety
- 🎨 **Multiple Note Styles** - Comprehensive, concise, guided, flexible, exploratory

### From StudentLife
- 📅 **DynaSchedule™** - Adaptive scheduling that evolves with your progress
- ⏰ **Smart Study Blocks** - Automatically scheduled based on task complexity and energy levels
- 📊 **Canvas LMS Integration** - Auto-import assignments and deadlines
- 📈 **Progress Tracking** - Real-time analytics and performance metrics
- 🎯 **Task Management** - Priority-based task organization with buffer time

### Unified Features
- 🎯 **Unified Dashboard** - All academic data in one beautiful interface
- 🔄 **Seamless Sync** - Notes automatically linked to scheduled study blocks
- 📱 **Mobile Responsive** - Works perfectly on all devices
- 🔐 **Google Authentication** - Secure sign-in with Google
- 💎 **Premium Tiers** - Free, Premium ($9.99/mo), and Pro ($19.99/mo) plans

## 🛠️ Tech Stack

- **Framework**: Next.js 15 with App Router
- **UI**: Material-UI v7 + Tailwind CSS
- **State**: Zustand with persistence
- **Auth**: NextAuth.js with Google OAuth
- **Database**: Local storage (upgrading to Supabase)
- **AI**: OpenAI GPT-4 API
- **Calendar**: date-fns + custom scheduler
- **Monorepo**: Turborepo for package management

## 📦 Project Structure

```
studioranotes/
├── apps/
│   ├── web/          # Main Next.js application
│   └── api/          # API endpoints (future)
├── packages/
│   ├── ui/           # Shared UI components
│   ├── types/        # TypeScript type definitions
│   ├── shared/       # Shared utilities
│   └── database/     # Database models (future)
└── turbo.json        # Turborepo configuration
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- Google OAuth credentials
- OpenAI API key

### Environment Variables

Create a `.env.local` file in `apps/web/`:

```bash
# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# Canvas LMS (optional)
CANVAS_API_TOKEN=your-canvas-token
CANVAS_API_URL=https://your-school.instructure.com/api/v1
```

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

## 🎯 Development Roadmap

### Phase 1: Foundation ✅
- [x] Monorepo setup with Turborepo
- [x] Unified type definitions
- [x] Authentication system
- [x] Basic dashboard integration

### Phase 2: Core Features (In Progress)
- [ ] Canvas API integration
- [ ] Unified data store
- [ ] Note-task linking
- [ ] Smart study session generation

### Phase 3: Advanced Features
- [ ] AI study coach
- [ ] Collaborative features
- [ ] Mobile app
- [ ] Offline mode

### Phase 4: Monetization
- [ ] Stripe payment integration
- [ ] Subscription management
- [ ] Premium feature gates
- [ ] Usage analytics

## 📱 Features by Plan

### Free Tier
- 5 courses maximum
- 10 AI notes per month
- Basic scheduling
- Local storage only

### Premium Tier ($9.99/month)
- Unlimited courses
- Unlimited AI notes
- Canvas integration
- Cloud sync
- Priority support

### Pro Tier ($19.99/month)
- Everything in Premium
- Advanced AI features
- Team collaboration
- API access
- Custom integrations

## 🤝 Contributing

This is a private project, but if you have access:

1. Create a feature branch
2. Make your changes
3. Submit a pull request
4. Wait for review

## 📄 License

Proprietary - All rights reserved

## 🆘 Support

For issues or questions, contact support@studiora.io

---

Built with ❤️ for students by students