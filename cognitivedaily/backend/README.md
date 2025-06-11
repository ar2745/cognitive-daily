# 🧠 Smart Daily Planner Backend

FastAPI backend powering the Smart Daily Planner app — an AI-driven, energy-aware daily planning and productivity platform.

---

## 🚀 v1 Status

- **v1 Complete as of 2025-06-07**
- All core APIs, authentication, cascade deletion, and AI integration are live and stable.

---

## ✨ Features

- **User Authentication:** JWT-secured endpoints, Supabase Auth integration (Google, email/password)
- **User Profile:** Preferences, working hours, avatar, Danger Zone (account deletion)
- **Task Management:** CRUD, filtering, real-time updates, cascade deletion
- **Daily Planning:** AI-powered plan generation (GPT-4-turbo), timeline logic, conflict resolution
- **Check-ins:** Energy/notes tracking, history, time-zone aware
- **Cascade Deletion:** Danger Zone endpoint removes user and all related data (tasks, plans, check-ins) in one atomic operation
- **Monitoring & Backups:** Health checks, logging, automated DB backup script
- **Memory Bank:** Project context, progress, and rules tracked for AI/agent continuity

---

## 🏗️ Project Structure

```
backend/
├── api/v1/           # API endpoints (users, tasks, daily_plan, checkin)
├── core/             # Config, DB, logging, monitoring
├── models/           # SQLAlchemy models (User, Task, DailyPlan, CheckIn, etc.)
├── schemas/          # Pydantic schemas for API validation
├── services/         # Business logic (AI, user, task, plan, checkin)
├── utils/            # JWT, cache, helpers
├── tests/            # Pytest-based test suite
├── backup_db.py      # DB backup script
└── main.py           # FastAPI app entrypoint
```

---

## ⚡ Setup & Local Development

1. **Clone the repo**
   ```bash
   git clone <your_repo_url>
   cd smart_daily_planner/backend
   ```

2. **Create a virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**
   - Copy `core/config.py.example` to `.env` or set variables directly in `core/config.py`.
   - Required:
     - `SUPABASE_PROJECT_ID`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `POSTGRES_*` (DB connection)
     - `JWT_SECRET_KEY`, `JWT_ALGORITHM`
     - See `core/config.py` for all options.

5. **Run the server**
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

---

## 🔑 API Authentication

- All protected endpoints require a valid JWT (issued by Supabase Auth).
- Use the `/users/me` endpoints for profile management.
- Danger Zone: `DELETE /api/v1/users/me` — deletes user from Supabase Auth and cascades all related data.

---

## 🧪 Testing

- Run all tests:
  ```bash
  pytest
  ```
- Coverage reports and logs are in `tests/` and `logs/`.

---

## 📈 API Documentation

- Swagger UI: [http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs)
- ReDoc: [http://localhost:8000/api/v1/redoc](http://localhost:8000/api/v1/redoc)

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
- See `/tests` for test patterns.
- Keep the Memory Bank up to date!

---

# Smart Daily Planner — Backend 