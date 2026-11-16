@echo off
title Momentum Desktop Widget
cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Start-Momentum-Widget.ps1"

