# 🌟 Smart Daily Planner Frontend

Modern, mobile-first React app for Smart Daily Planner — AI-powered daily planning, task management, and productivity.

---

## 🚀 v1 Status

- **v1 Complete as of 2025-06-07**
- All core flows, authentication, profile, tasks, daily planning, and Danger Zone are live and stable.

---

## ✨ Features

- **Authentication:** Google OAuth, email/password, secure session management
- **Profile:** Avatar upload, working hours, preferences as tags, Danger Zone (account deletion)
- **Task Management:** Add/edit/delete, real-time updates, optimistic UI, mobile/desktop layouts
- **Daily Planning:** AI-powered plan generation, timeline view, missed tasks modal
- **Check-ins:** Energy/notes tracking, history, mobile-friendly
- **Danger Zone:** Account deletion with confirmation modal
- **Responsive Design:** Fully mobile-optimized, modern UI
- **Memory Bank:** Project context and progress tracking

---

## 🏗️ App Structure

```
frontend/
├── src/
│   ├── pages/        # Main user-facing pages (Dashboard, DailyPlan, Profile, Settings, etc.)
│   ├── components/   # Reusable UI components (Sidebar, Modals, Layout, etc.)
│   ├── context/      # React context providers (Auth, Task)
│   ├── services/     # API service modules (users, tasks, dailyPlan, auth)
│   ├── hooks/        # Custom React hooks
│   ├── utils/        # Utility functions
│   └── lib/          # Supabase client, theme provider, etc.
├── public/           # Static assets
├── tailwind.config.ts
├── package.json
└── README.md
```

---

## ⚡ Setup & Local Development

1. **Clone the repo**
   ```bash
   git clone <your_repo_url>
   cd smart_daily_planner/frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   - Copy `.env.example` to `.env`
   - Set:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`
     - `VITE_API_URL` (backend base URL)

4. **Run the app**
   ```bash
   npm run dev
   ```

---

## 🧑‍💻 Main Pages

- **Welcome.tsx:** Landing, registration, and login
- **Dashboard.tsx:** Main user dashboard
- **DailyPlan.tsx:** AI-powered daily planning
- **Profile.tsx:** User profile, avatar, preferences
- **Settings.tsx:** Theme, notifications, Danger Zone
- **CompletedTasks.tsx:** View completed tasks
- **TaskInput.tsx:** Add/edit tasks
- **OAuthCallback.tsx:** Handles OAuth redirects

---

## 🎨 Theming & Accessibility

- **Dark/light mode** via theme provider
- **Accessible UI:** Keyboard navigation, screen reader support (in progress)
- **Mobile-first:** Responsive layouts, touch-friendly

---

## 🗺️ v2 Roadmap

- **Notifications:** Push/email reminders, missed task alerts
- **Recurring Tasks:** Daily/weekly/monthly
- **Calendar Integration:** Google/iCal sync
- **Collaboration:** Shared plans, team/family support
- **Custom AI Models:** User-selectable planning styles
- **Offline Mode, Accessibility, Localization, Premium Features**

---

## 🤝 Contributing

- Fork, branch, and PR as usual.
- Keep the Memory Bank up to date!

---

# Smart Daily Planner — Frontend
