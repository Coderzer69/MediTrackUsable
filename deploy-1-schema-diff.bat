@echo off
rem Step 1 of the Render deployment: show which SQL the new schema needs.
rem READ-ONLY: compares the live database with prisma/schema.prisma and writes
rem the SQL to logs\schema-diff.sql. Nothing is changed in the database.
cd /d "%~dp0"
if not exist logs mkdir logs
for /f "tokens=5" %%A in ('netstat -ano ^| findstr /R /C:":3000 .*LISTENING"') do taskkill /PID %%A /F >nul 2>&1
cd /d "%~dp0Backend"
echo Generating Prisma client... > "%~dp0logs\deploy-1.log"
call npx prisma generate >> "%~dp0logs\deploy-1.log" 2>&1
echo Computing schema diff... >> "%~dp0logs\deploy-1.log"
call npx prisma migrate diff --from-schema-datasource prisma\schema.prisma --to-schema-datamodel prisma\schema.prisma --script > "%~dp0logs\schema-diff.sql" 2>> "%~dp0logs\deploy-1.log"
echo Exit code %ERRORLEVEL% >> "%~dp0logs\deploy-1.log"
