@echo off
setlocal

cd /d C:\Apps\Louvor
if errorlevel 1 exit /b %errorlevel%

call npm run android:sync
if errorlevel 1 exit /b %errorlevel%

call powershell -NoProfile -ExecutionPolicy Bypass -File scripts\generate-android-assets.ps1
if errorlevel 1 exit /b %errorlevel%

cd /d C:\Apps\Louvor\android
if errorlevel 1 exit /b %errorlevel%

set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
set "Path=%JAVA_HOME%\bin;%Path%"

call gradlew.bat installDebug
if errorlevel 1 exit /b %errorlevel%

echo.
echo APK instalado com sucesso no dispositivo conectado.
pause
