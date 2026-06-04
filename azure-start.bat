@echo off
echo =======================================
echo   BIOMETRIC VAULT - START ALL SERVICES
echo =======================================
echo.

set PATH=C:\Program Files\Microsoft SDKs\Azure\CLI2\wbin;%PATH%

echo Starting jeromeprince777 (Portfolio)...
az webapp start --name jeromeprince777 --resource-group rgjrnqy
echo.

echo Starting biometric-vault-api-jancy (Backend API)...
az webapp start --name biometric-vault-api-jancy --resource-group rgjrnqy
echo.

echo =======================================
echo   ALL SERVICES STARTED!
echo =======================================
echo   Portfolio:  https://jeromeprince777.azurewebsites.net
echo   Vault UI:   https://jolly-ground-09e74b200.7.azurestaticapps.net
echo   Vault API:  https://biometric-vault-api-jancy.azurewebsites.net
echo =======================================
pause
