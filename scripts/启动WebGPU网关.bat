@echo off
chcp 65001 > nul
cd /d %~dp0

rem 只需改这一行：Unity 工程根目录，也就是里面有 Assets 的那一层。
set UNITY_PROJECT=D:\UnityProject\jtyf-dts-webgpu

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0createUnityWebDevCertificate.ps1"
if errorlevel 1 (
  echo 证书创建失败
  pause
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0startUnityWebDevGateway.ps1" -UnityProject "%UNITY_PROJECT%"
echo 网关已退出
pause
