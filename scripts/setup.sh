#!/usr/bin/env bash
set -e

echo "Creating Python venv..."
python3 -m venv .venv || python -m venv .venv
echo "Activate with: source .venv/bin/activate"

if [ -f backend/requirements.txt ]; then
  echo "Installing Python requirements..."
  source .venv/bin/activate
  pip install -r backend/requirements.txt
else
  echo "No backend/requirements.txt found. Skipping pip install."
fi

if [ -f package.json ]; then
  echo "Installing Node dependencies..."
  npm install
else
  echo "No package.json found. Skipping npm install."
fi

echo "Done."
