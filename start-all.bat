@echo off
title UniBite Launcher
echo Starting MySQL / MariaDB Server...
start "UniBite MySQL Server" /min "%~dp0.tools\mariadb\bin\mysqld.exe" --datadir="%~dp0.tools\mariadb\data" --port=3306 --console
timeout /t 2 /nobreak >nul

echo Starting Node.js Backend Server...
set "PATH=%~dp0.tools\node;%PATH%"
start "UniBite Node Server" "%~dp0.tools\node\node.exe" "%~dp0server.js"

echo UniBite is running!
timeout /t 3 >nul
