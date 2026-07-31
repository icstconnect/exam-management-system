# 🚀 Setup Guide: Exam Management System

This guide provides simple, step-by-step instructions to set up and run the **Exam Management System** from scratch on your local machine or local network (LAN).

---

## 📋 Prerequisites

Before starting, ensure you have the following software installed:

1. **Node.js** (v18.x or later) – [Download Node.js](https://nodejs.org/)
2. **Docker & Docker Desktop** – [Download Docker Desktop](https://www.docker.com/products/docker-desktop/)
3. **Git** (optional, for cloning) – [Download Git](https://git-scm.com/)

---

## 🛠️ Step 1: Start the PostgreSQL Database

The project includes a `docker-compose.yml` file that provisions PostgreSQL 15 on port `5433`.

1. Open your terminal or PowerShell in the project root directory.
2. Run Docker Compose to start the database container in the background:

```bash
docker compose up -d
```

3. Verify that the container is running:

```bash
docker ps
```
> You should see a container named `exam-management-system-db-1` running on port `5433->5432`.

---

## 💾 Step 2: Database Initialization / Restore

Choose **ONE** of the following methods:

### Option A: Restore Existing Full Database Backup (Recommended)

If you want to restore all pre-existing exams, student records, and questions from `backup_exam_db.sql`:

* **Windows (PowerShell or CMD):**
  ```powershell
  cmd /c "type backup_exam_db.sql | docker exec -i exam-management-system-db-1 psql -U postgres -d exam_db"
  ```

* **Linux / macOS:**
  ```bash
  cat backup_exam_db.sql | docker exec -i exam-management-system-db-1 psql -U postgres -d exam_db
  ```

---

### Option B: Fresh Setup with Sample Mock Data

If you want a clean database with basic sample students and mock exams:

```bash
cd backend
npm install
npm run db:setup
```

---

## ⚙️ Step 3: Install & Start the Backend Server

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```

2. Install dependencies (if not done in Step 2):
   ```bash
   npm install
   ```

3. Start the backend server in development mode:
   ```bash
   npm run dev
   ```

> 🟢 **Backend Server Running:** `http://localhost:3001`

---

## 💻 Step 4: Install & Start the Frontend

1. Open a **new terminal tab or window** and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```

> 🟢 **Frontend App Running:** `http://localhost:5173` (or `http://localhost:5174`)

---

## 🔐 System Access & Credentials

| Role | Access URL | Credentials / Passwords |
| :--- | :--- | :--- |
| **Student Login** | `http://localhost:5173/` | Student ID (e.g. `001`, `067`) + Phone Number |
| **Teacher Dashboard** | `http://localhost:5173/teacher` | Master Password: **`ICST`** |
| **Database (PostgreSQL)** | `localhost:5433` | User: `postgres`, Password: `postgres`, DB: `exam_db` |

---

## 🌐 Setting Up for LAN / Multi-Computer Exam Sessions

To allow student computers on the same Wi-Fi or LAN network to connect to the teacher server:

1. **Find the Host Computer's Local IP Address:**
   * **Windows:** Open CMD/PowerShell and run `ipconfig` (Look for *IPv4 Address*, e.g., `192.168.1.50`).
   * **Linux/macOS:** Run `ifconfig` or `ip a`.

2. **Access from Student PCs:**
   Students can open their browser and navigate to:
   ```text
   http://<HOST_IP>:5173
   ```
   *(e.g., `http://192.168.1.50:5173`)*

---

## 🗄️ Database Backup & Maintenance

* **Create a New Backup:**
  ```powershell
  cmd /c "docker exec exam-management-system-db-1 pg_dump -U postgres --clean --if-exists exam_db > backup_exam_db.sql"
  ```

* **Stop Database Container:**
  ```bash
  docker compose down
  ```

---

## ❓ Troubleshooting

* **Port `5433` is already in use:**
  If another PostgreSQL instance is running on port 5433, change the left port in `docker-compose.yml` (e.g., `"5434:5432"`) and update `DB_PORT` in your backend configuration.

* **Backend cannot connect to Database:**
  Ensure Docker Desktop is open and `docker ps` shows the database container running.
