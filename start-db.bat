@echo off
title UniBite MySQL Server
"%~dp0.tools\mariadb\bin\mysqld.exe" --datadir="%~dp0.tools\mariadb\data" --port=3306 --console
