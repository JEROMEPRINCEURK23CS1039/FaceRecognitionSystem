@echo off
echo =======================================
echo   BIOMETRIC VAULT - STOP ALL SERVICES
echo   (saves your Azure student credits!)
echo =======================================
echo.

set PATH=C:\Program Files\Microsoft SDKs\Azure\CLI2\wbin;%PATH%

echo Stopping jeromeprince777 (Portfolio)...
az webapp stop --name jeromeprince777 --resource-group rgjrnqy
echo.

echo Stopping biometric-vault-api-jancy (Backend API)...
az webapp stop --name biometric-vault-api-jancy --resource-group rgjrnqy
echo.

echo =======================================
echo   ALL SERVICES STOPPED!
echo   Credits are no longer being consumed.
echo   Frontend (Static Web App) stays live
echo   for free at all times.
echo =======================================
pause
