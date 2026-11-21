@echo off
rem Commits the Brevo prescription-email feature and pushes (Render redeploys).
cd /d "%~dp0"
git add Backend/src/controllers/doctorController.ts Backend/src/utils/emailService.ts Backend/.env.example render.yaml README.md deploy-5-push-email.bat > "%~dp0logs\deploy-5.log" 2>&1
git commit -q -F "%~dp0logs\commit-message-5.txt" >> "%~dp0logs\deploy-5.log" 2>&1
echo Commit exit code %ERRORLEVEL% >> "%~dp0logs\deploy-5.log"
git push origin main >> "%~dp0logs\deploy-5.log" 2>&1
echo Push exit code %ERRORLEVEL% >> "%~dp0logs\deploy-5.log"
git log --oneline -1 >> "%~dp0logs\deploy-5.log" 2>&1
