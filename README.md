# Local Area Network (LAN) Exam Management System

A robust, real-time examination system designed to run on a local network, allowing a teacher to create, manage, and monitor exams while students take them from their own devices.

---

## 🚀 Prerequisites

Before you begin, ensure you have the following installed on your machine:
- **Node.js** (v18 or higher recommended)
- **Docker** and **Docker Compose** (for running the PostgreSQL database)
- **Git** (optional, but recommended)

---

## 🛠️ Initial Setup Instructions

If you are setting up the project for the very first time, follow these steps:

### 1. Database Setup
The system uses a PostgreSQL database running inside a Docker container.
1. Open a terminal in the root directory (`exam-management-system`).
2. Start the database container in the background:
   ```bash
   docker-compose up -d
   ```
3. *(Optional)* If the database schema isn't automatically initialized, you can manually run the SQL schema:
   ```bash
   docker exec -i exam-management-system-db-1 psql -U postgres -d exam_db < backend/src/db/schema.sql
   ```

### 2. Backend Setup
1. Open a new terminal and navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install the necessary dependencies:
   ```bash
   npm install
   ```

### 3. Frontend Setup
1. Open a new terminal and navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install the necessary dependencies:
   ```bash
   npm install
   ```

---

## 🟢 How to Turn On the System (Daily Usage)

Whenever you want to start the exam system, you need to run both the database, the backend, and the frontend.

### Step 1: Ensure Database is Running
Open a terminal in the root folder and run:
```bash
docker-compose start
```
*(Note: If Docker Desktop is open, it usually starts automatically).*

### Step 2: Start the Backend Server
Open a terminal, go to the `backend` folder, and run:
```bash
cd backend
npx ts-node src/index.ts
```
*Wait until you see `Server listening on http://0.0.0.0:3001 (LAN ready)`.*

### Step 3: Start the Frontend App
Open a terminal, go to the `frontend` folder, and run:
```bash
cd frontend
npm run dev -- --host
```
*The `--host` flag is crucial! It allows students on your local Wi-Fi/LAN network to connect to the exam.*

---

## 🔄 How to Restart the Server

If you make changes to the backend code, or if the server encounters an issue (e.g., scoring logic needs a refresh), you must restart it.

**To Restart the Backend:**
1. Go to the terminal window where the backend is currently running (`npx ts-node src/index.ts`).
2. Press `Ctrl + C` on your keyboard to stop the server.
3. Press the `Up Arrow` key to bring back the last command (`npx ts-node src/index.ts`), and press `Enter` to start it again.

**To Restart the Frontend:**
1. Go to the terminal window where the frontend is running (`npm run dev -- --host`).
2. Press `Ctrl + C` to stop it.
3. Run `npm run dev -- --host` again.

---

## 🌐 Connecting Students

1. Find your computer's local IP Address (e.g., `192.168.1.5`).
   - *On Windows: Open Command Prompt and type `ipconfig`. Look for "IPv4 Address".*
2. Tell your students to connect to your IP address on port `5173`.
   - **Example URL for students to type in their browser:** `http://192.168.1.5:5173`

---

## 🛑 Useful Commands

- **Stop Database completely:** `docker-compose down`
- **View Database Logs:** `docker-compose logs -f db`
- **Access Database Directly:** `docker exec -it exam-management-system-db-1 psql -U postgres -d exam_db`
