@echo off
chcp 65001 >nul
title 考研英语单词主动回忆与智能复习系统
cd /d "%~dp0"
echo ========================================================
echo   正在启动考研英语单词主动回忆与智能复习系统...
echo ========================================================
echo.
echo 正在打开浏览器访问 http://localhost:3000 ...
start http://localhost:3000
npm.cmd run dev -- --host --port 3000
pause
