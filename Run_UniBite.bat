@echo off
title UniBite Launcher
cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\launcher.ps1"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Launcher exited with code %ERRORLEVEL%.
    pause
)
