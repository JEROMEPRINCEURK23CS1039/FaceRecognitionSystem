# ==========================================
# Stage 1: Build the React frontend
# ==========================================
FROM node:20-slim AS frontend-builder
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# ==========================================
# Stage 2: Python Backend & Final Server
# ==========================================
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies (including compiler tools to compile llama-cpp-python)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    build-essential \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies for cloud mode (uses requirements-cloud.txt)
COPY backend/requirements-cloud.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements-cloud.txt

# Copy backend files
COPY backend/ ./backend/

# Copy built frontend assets to the backend's static directory
COPY --from=frontend-builder /frontend/dist ./backend/static

# Expose the port Hugging Face expects
EXPOSE 7860

# Set environment variables
ENV PORT=7860

# Set workdir to backend folder so uvicorn runs in correct context
WORKDIR /app/backend

# Run uvicorn server on port 7860
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
