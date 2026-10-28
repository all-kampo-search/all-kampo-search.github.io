@echo off
chcp 65001 > nul
echo 漢方薬 医薬品検索システムを起動中...
cd /d "%~dp0"

:: 既にサーバーが動いているかチェックして起動
powershell -Command "try { (Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing -TimeoutSec 1).StatusCode } catch { Start-Process -WindowStyle Hidden node -ArgumentList 'scripts\serve.js' }"

:: ブラウザで開く
start http://localhost:3000/
exit
