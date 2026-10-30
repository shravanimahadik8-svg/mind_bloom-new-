@echo off
title Mind Bloom - MVP Server
echo ========================================================
echo    🌸 Starting Mind Bloom - Student Wellness MVP
echo ========================================================
echo.

set NODE_CMD=node
where node >nul 2>nul
if %errorlevel% neq 0 (
    if exist "C:\Users\LAB-02-PC-06\AppData\Local\Programs\RStudio\resources\app\bin\node\node.exe" (
        set "NODE_CMD=C:\Users\LAB-02-PC-06\AppData\Local\Programs\RStudio\resources\app\bin\node\node.exe"
    ) else (
        echo [ERROR] Node.js was not found in PATH or standard install paths.
        pause
        exit /b 1
    )
)

echo Starting Mind Bloom server...
start "" http://localhost:3000
"%NODE_CMD%" "%~dp0server.js"

pause
