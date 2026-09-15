# Corre el frontend de BankIn en local (modo desarrollo -- usa
# .env.development, así que apunta al backend en http://localhost:8000).
#
# Uso normal (doble click o desde PowerShell):
#   .\run-frontend.ps1
#
# Si Windows se queja de que la ejecución de scripts está deshabilitada,
# corre esto una vez en esa terminal y vuelve a intentar:
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force

# Se ubica siempre en la carpeta donde vive este script (la raíz del
# frontend), sin importar desde dónde lo hayas ejecutado.
Set-Location $PSScriptRoot

if (-not (Test-Path ".\node_modules")) {
    Write-Host "No existen node_modules, instalando dependencias (puede tardar un momento)..." -ForegroundColor Yellow
    npm install
}

Write-Host ""
Write-Host "Frontend disponible en  http://localhost:5173" -ForegroundColor Green
Write-Host "Asegúrate de que el backend esté corriendo en http://localhost:8000" -ForegroundColor Yellow
Write-Host "(en otra terminal: cd ..\Bankin y luego .\run-backend.ps1)" -ForegroundColor DarkGray
Write-Host ""
Write-Host "(Ctrl+C para detenerlo)" -ForegroundColor DarkGray
Write-Host ""

npm run dev
