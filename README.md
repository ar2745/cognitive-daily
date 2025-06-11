# Cognitive Daily

---

## 🚀 v1 Status

- **v1 Complete as of 2025-06-07**
- All core features (auth, profile, tasks, daily planning, check-ins, Danger Zone, deployment/monitoring) are live and stable.

---

# Cognitive Daily

**An intelligent, energy-aware daily planning and task management system powered by AI and real-time data.**

---

## 🚀 Vision

Help knowledge workers, students, and neurodiverse users optimize their productivity by planning their day in harmony with their energy levels, task complexity, and available time.

---

## ✨ Key Features

- **AI-powered task analysis and scheduling**
- **Energy-aware daily planning**
- **Google OAuth and email/password authentication**
- **Real-time updates and offline support**
- **Visual progress tracking and check-ins**
- **Responsive, accessible UI**

---

## ✨ Unified Features (Backend + Frontend + AI)

- **AI-powered task analysis and scheduling** (GPT-4-turbo)
- **Energy-aware daily planning**
- **Google OAuth and email/password authentication**
- **Real-time updates and offline support**
- **Visual progress tracking and check-ins**
- **Danger Zone:** Full account deletion (Supabase Auth + DB cascade)
- **Memory Bank:** Project context, progress, and rules for AI/agent continuity
- **Mobile-first, modern UI**
- **Monitoring, logging, and automated DB backup**

---

## 👤 User Personas

- **Knowledge Workers:** Reduce cognitive overload, manage complex task lists.
- **Students:** Balance assignments, deadlines, and energy.
- **ADHD/Neurodiverse Users:** Externalize executive function, support focus.

---

## 🧭 User Workflows

- **Daily Planning:** Check in, input energy, review tasks, generate plan, adjust as needed.
- **Task Management:** Add tasks, AI analysis, prioritize, complete, track progress.
- **Energy Management:** Regular check-ins, reorder tasks, schedule breaks, track progress.

---

## 🗂️ Project Structure

### backend/
```
backend/
├── api/
│   └── v1/
│       ├── users.py         # User endpoints (profile, Danger Zone, etc.)
│       ├── tasks.py         # Task CRUD endpoints
│       ├── daily_plan.py    # Daily planning endpoints (AI integration)
│       └── checkin.py       # Check-in endpoints
├── core/
│   ├── config.py            # App configuration
│   ├── database.py          # DB connection/session
│   ├── logging.py           # Logging setup
│   ├── monitoring.py        # Health checks, monitoring
│   └── repository.py        # Base repository pattern
├── models/                  # SQLAlchemy models (User, Task, DailyPlan, CheckIn, etc.)
├── schemas/                 # Pydantic schemas for API validation
├── services/
│   ├── user.py              # User business logic
│   ├── task.py              # Task business logic
│   ├── daily_plan.py        # Daily plan business logic
│   ├── daily_plan_ai.py     # AI planning integration
│   ├── ai_prompts.py        # Prompt engineering for AI
│   └── checkin.py           # Check-in business logic
├── utils/                   # JWT, cache, helpers
├── tests/                   # Pytest-based test suite
├── logs/                    # Backend and test logs
├── backup_db.py             # DB backup script
├── main.py                  # FastAPI app entrypoint
└── requirements.txt         # Python dependencies
```

### frontend/
```
frontend/
├── src/
│   ├── pages/
│   │   ├── Dashboard.tsx        # Main dashboard
│   │   ├── DailyPlan.tsx        # AI-powered daily planning
│   │   ├── Profile.tsx          # User profile, avatar, preferences
│   │   ├── Settings.tsx         # Theme, notifications, Danger Zone
│   │   ├── CompletedTasks.tsx   # View completed tasks
│   │   ├── TaskInput.tsx        # Add/edit tasks
│   │   ├── Login.tsx, Welcome.tsx, OAuthCallback.tsx, Splash.tsx, NotFound.tsx, etc.
│   ├── components/
│   │   ├── Sidebar.tsx, Layout.tsx, CheckInModal.tsx, ProfileDropdown.tsx, ProtectedRoute.tsx
│   │   └── ui/                  # Reusable UI primitives (buttons, dialogs, etc.)
│   ├── context/
│   │   ├── AuthContext.tsx      # Auth provider
│   │   └── TaskContext.tsx      # Task provider
│   ├── services/
│   │   └── api/                 # API service modules (users, tasks, dailyPlan, auth)
│   ├── hooks/                   # Custom React hooks
│   ├── utils/                   # Utility functions
│   └── lib/                     # Supabase client, theme provider, etc.
├── public/                      # Static assets
├── tailwind.config.ts           # Tailwind CSS config
├── package.json                 # NPM dependencies
├── vercel.json, tsconfig*.json, etc.
└── README.md                    # Frontend documentation
```

---

## 🛠️ Technology Stack

| Layer      | Tech/Service         | Purpose/Notes                                 |
|------------|----------------------|-----------------------------------------------|
| Frontend   | React, Vite, Tailwind| UI, state, routing, styling                   |
| Backend    | FastAPI, Python      | API, business logic                           |
| Database   | Supabase (PostgreSQL)| Data storage, RLS, auth, real-time            |
| Auth       | Supabase Auth        | Google OAuth, email/password                  |
| AI         | GPT-4-turbo (OpenAI) | Task analysis, planning                       |
| Hosting    | Vercel, Railway      | Frontend/backend deployment                   |
| CI/CD      | GitHub Actions       | Automated testing, deployment                 |

---

## 📝 Project Status

- **Frontend:** Core flows, authentication, and UI are implemented.
- **Backend:** FastAPI structure and endpoints in progress.
- **AI Integration:** GPT-4-turbo for planning (to be integrated).
- **Memory Bank:** All project context, progress, and patterns are tracked in `/memory-bank/`.

---

## 📈 Success Criteria

- API response time < 200ms
- 99.9% uptime
- Zero data loss
- Real-time updates < 500ms
- Authentication success rate > 99.9%
- Query response time < 100ms

---

## 🗺️ v2 Roadmap

- **Notifications:** Push/email reminders, missed task alerts
- **Recurring Tasks:** Daily/weekly/monthly
- **Calendar Integration:** Google/iCal sync
- **Collaboration:** Shared plans, team/family support
- **Custom AI Models:** User-selectable planning styles
- **Offline Mode, Accessibility, Localization, Premium Features**

---

## ⚡ Quickstart

1. **Clone the repo**
   ```bash
   git clone <your_repo_url>
   cd smart_daily_planner
   ```

2. **Setup Backend**
   - See [`backend/README.md`](./backend/README.md) for full instructions
   - Configure Supabase, DB, JWT, and run:
     ```bash
     cd backend
     python -m venv venv
     source venv/bin/activate
     pip install -r requirements.txt
     uvicorn main:app --reload
     ```

3. **Setup Frontend**
   - See [`frontend/README.md`](./frontend/README.md) for full instructions
   - Configure `.env` with Supabase and API URL, then run:
     ```bash
     cd frontend
     npm install
     npm run dev
     ```

---

## 📚 Documentation

- [Backend README](./backend/README.md)
- [Frontend README](./frontend/README.md)

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch
3. Commit your changes
4. Open a pull request

---

## 🛡️ License

[MIT](LICENSE)

---

## 🙏 Acknowledgements

- Supabase for backend infrastructure
- OpenAI for AI planning
- Vercel and Railway for hosting 
