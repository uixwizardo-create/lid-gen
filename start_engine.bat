@echo off
title Lid-Gen Local High-Speed Engine ^& Tunnel
cd /d "%~dp0"
echo Starting Lid-Gen Engine...
backend\.venv\Scripts\python.exe start_local_tunnel.py
pause
