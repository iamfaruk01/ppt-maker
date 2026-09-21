@echo off
setlocal
echo Installing Banikanta Font for Microsoft PowerPoint...

set FONT_NAME=Banikanta.ttf
set SCRIPT_DIR=%~dp0
set FONT_SRC=%SCRIPT_DIR%%FONT_NAME%

if not exist "%FONT_SRC%" (
    echo [ERROR] %FONT_SRC% not found!
    exit /b 1
)

:: Copy to Windows Fonts folder
copy /y "%FONT_SRC%" "%WINDIR%\Fonts\%FONT_NAME%" >nul

:: Register in Registry for Current User and Local Machine
reg add "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts" /v "Banikanta (TrueType)" /t REG_SZ /d "%FONT_NAME%" /f >nul 2>&1
reg add "HKCU\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts" /v "Banikanta (TrueType)" /t REG_SZ /d "%FONT_NAME%" /f >nul 2>&1

echo Banikanta font installed successfully!
exit /b 0
