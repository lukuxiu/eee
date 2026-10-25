@echo off
chcp 65001 >nul
title 考研英语单词主动回忆与智能复习系统 (生产预览版)
cd /d "%~dp0"
echo 正在打开浏览器 http://localhost:4173 ...
start http://localhost:4173
npm.cmd run preview -- --port 4173
pause
