@echo off
title UniBite Node.js Server
set "PATH=%~dp0.tools\node;%PATH%"
"%~dp0.tools\node\node.exe" "%~dp0server.js"
