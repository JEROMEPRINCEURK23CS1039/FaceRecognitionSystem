---
title: Face Recognition System
emoji: 🔐
colorFrom: indigo
colorTo: blue
sdk: docker
app_port: 7860
---

# Face detection System — Setup


This document shows how to install Python and Node.js and configure the project on Windows (PowerShell) and Unix-like systems.

**Files added:** [README.md](README.md), [package.json](package.json), [scripts/setup.ps1](scripts/setup.ps1), [scripts/setup.sh](scripts/setup.sh)

**Windows (PowerShell)**

1. Install Python and Node.js (using winget):

```powershell
winget install --id Python.Python.3 -e --source winget
winget install --id OpenJS.NodeJS.LTS -e --source winget
```

2. Verify installations:

```powershell
python --version
node --version
npm --version
```

3. Create and activate a virtual environment, then install Python requirements:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
```

4. Install Node dependencies and start the Node app:

```powershell
npm install
npm start
```

**Unix / macOS**

1. Install Python and Node via system package manager (example for macOS Homebrew):

```bash
brew install python node
```

2. Create and activate venv and install requirements:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

3. Install Node deps and run:

```bash
npm install
npm start
```

**Notes & next steps**
- The project main Node entry is `app.js` (root). `npm start` runs `node app.js`.
- Backend Python requirements are in `backend/requirements.txt`.
- For Windows, use the script [scripts/setup.ps1](scripts/setup.ps1) to automate steps.
- For Unix, use [scripts/setup.sh](scripts/setup.sh).

If you want, I can run quick checks or add a `requirements.txt` lockfile / `package-lock.json` after you install.
