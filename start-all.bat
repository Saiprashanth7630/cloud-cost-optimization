@echo off
echo ===================================================
echo   Starting CloudCost AI: All 3 Services
echo ===================================================

echo [1/3] Starting Python ML Microservice (Port 5001)...
start "CloudCost - ML Service (Port 5001)" cmd /k "cd /d %~dp0ml-service && .\venv\Scripts\activate && python app.py"

timeout /t 3 /nobreak > nul

echo [2/3] Starting Node.js Backend API (Port 5000)...
start "CloudCost - Backend API (Port 5000)" cmd /k "cd /d %~dp0backend && npm start"

timeout /t 3 /nobreak > nul

echo [3/3] Starting React Frontend (Port 3000)...
start "CloudCost - React Frontend (Port 3000)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ===================================================
echo   All 3 services are launching in separate windows!
echo   - Frontend: http://localhost:3000
echo   - Backend:  http://localhost:5000
echo   - ML Service: http://localhost:5001
echo ===================================================
pause
