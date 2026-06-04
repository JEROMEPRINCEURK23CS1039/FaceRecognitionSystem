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

# Install system dependencies for OpenCV, MediaPipe, and compiling llama-cpp-python
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    git \
    curl \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir "https://github.com/abetlen/llama-cpp-python/releases/download/v0.2.79/llama_cpp_python-0.2.79-cp311-cp311-linux_x86_64.whl" && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend files
COPY backend/ ./backend/

# Copy built frontend assets to the backend's static directory
COPY --from=frontend-builder /frontend/dist ./backend/static

# Create models directory and download Qwen GGUF model (1.1GB Q5_K_M quantization)
RUN mkdir -p backend/models && \
    curl -L -o backend/models/qwen.gguf "https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q5_k_m.gguf"

# Expose the port Hugging Face expects
EXPOSE 7860

# Set environment variables
ENV PORT=7860
ENV LLM_MODEL_PATH=models/qwen.gguf

# Set workdir to backend folder so uvicorn runs in correct context
WORKDIR /app/backend

# Run uvicorn server on port 7860
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
