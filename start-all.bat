@echo off
title MediTrack Launcher
echo ==============================================
echo   Starting MediTrack Full-Stack Application
echo ==============================================

echo [1/3] Launching Backend API on Port 3000...
start "MediTrack Backend (:3000)" cmd /k "cd Backend && npm start"

echo [2/3] Launching Frontend Portal on Port 5173...
start "MediTrack Frontend (:5173)" cmd /k "cd Frontend && npx vite --port 5173"

echo [3/3] Launching Admin Portal on Port 5174...
start "MediTrack Admin (:5174)" cmd /k "cd admin && npx vite --port 5174"

echo.
echo ==============================================
echo MediTrack services launched:
echo  - Main Web App:   http://localhost:5173
echo  - Admin Portal:   http://localhost:5174
echo  - Backend API:    http://localhost:3000
echo.
echo Default Logins (Password: password123):
echo  - Doctor:  urvishbhardwaj7@gmail.com
echo  - Admin:   admin@meditrack.com
echo  - Patient: patient@meditrack.com
echo ==============================================

