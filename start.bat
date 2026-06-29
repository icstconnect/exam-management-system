@echo off
echo ==============================================
echo   Starting Exam Management System...
echo ==============================================
echo.

echo [1/3] Starting Database...
docker-compose up -d
echo Database is ready!
echo.

echo [2/3] Starting Backend Server...
start "Backend Server" cmd /k "cd backend && npx ts-node src/index.ts"
echo Backend started in a new window.
echo.

echo [3/3] Starting Frontend Server...
start "Frontend Server" cmd /k "cd frontend && npm run dev -- --host"
echo Frontend started in a new window.
echo.

echo ==============================================
echo   All systems are booting up!
echo   Close the newly opened windows to stop the servers.
echo ==============================================
pause
