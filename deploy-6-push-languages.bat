@echo off
rem Commits the patient-language + ElevenLabs feature and pushes (Render redeploys).
rem Run only AFTER the database change (deploy-1 diff reviewed, deploy-2 applied).
cd /d "%~dp0"
git add Backend/prisma/schema.prisma Backend/src Backend/.env.example frontend/src render.yaml README.md deploy-6-push-languages.bat > "%~dp0logs\deploy-6.log" 2>&1
git commit -q -F "%~dp0logs\commit-message-6.txt" >> "%~dp0logs\deploy-6.log" 2>&1
echo Commit exit code %ERRORLEVEL% >> "%~dp0logs\deploy-6.log"
git push origin main >> "%~dp0logs\deploy-6.log" 2>&1
echo Push exit code %ERRORLEVEL% >> "%~dp0logs\deploy-6.log"
git log --oneline -1 >> "%~dp0logs\deploy-6.log" 2>&1
