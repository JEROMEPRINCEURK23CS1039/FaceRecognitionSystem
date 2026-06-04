param(
    [switch]$StartAfter = $false
)

Write-Host "Checking for winget..."
if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    Write-Warning "winget not found. Install Python and Node.js manually or use your package manager."
} else {
    Write-Host "Installing Python and Node.js (if missing)..."
    winget install --id Python.Python.3 -e --source winget
    winget install --id OpenJS.NodeJS.LTS -e --source winget
}

Write-Host "Verifying Python and Node versions..."
python --version
node --version
npm --version

Write-Host "Creating Python virtual environment..."
python -m venv .venv
Write-Host "Activate it with: .\\.venv\\Scripts\\Activate.ps1"

if (Test-Path backend\requirements.txt) {
    Write-Host "Installing Python requirements..."
    .\.venv\Scripts\Activate.ps1; pip install -r backend\requirements.txt
} else {
    Write-Warning "No backend\requirements.txt found. Skipping pip install."
}

if (Test-Path package.json) {
    Write-Host "Installing Node dependencies..."
    npm install
} else {
    Write-Warning "No package.json found. Skipping npm install."
}

if ($StartAfter -or ($PSBoundParameters.ContainsKey('StartAfter'))) {
    Write-Host "Starting Node app..."
    npm start
}
