@echo off
rem Step 3: commit the deployment changes and push to GitHub (Render deploys from main).
cd /d "%~dp0"
echo Committing... > "%~dp0logs\deploy-3.log"
git rm -r -q --cached Backend/dist Backend/uploads >> "%~dp0logs\deploy-3.log" 2>&1
git add render.yaml Backend/.gitignore Backend/prisma/schema.prisma Backend/src Backend/scripts frontend/src/lib/api.ts deploy-1-schema-diff.bat deploy-2-apply-schema-and-import.bat deploy-3-git-push.bat README.md CLAUDE.md >> "%~dp0logs\deploy-3.log" 2>&1
git commit -q -F "%~dp0logs\commit-message.txt" >> "%~dp0logs\deploy-3.log" 2>&1
echo Commit exit code %ERRORLEVEL% >> "%~dp0logs\deploy-3.log"
git push origin main >> "%~dp0logs\deploy-3.log" 2>&1
echo Push exit code %ERRORLEVEL% >> "%~dp0logs\deploy-3.log"
git log --oneline -1 >> "%~dp0logs\deploy-3.log" 2>&1
