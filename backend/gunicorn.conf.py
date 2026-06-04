import os

# Gunicorn configuration for Azure App Service FastAPI deployment
bind = "0.0.0.0:" + os.getenv("PORT", "8000")
workers = 4
worker_class = "uvicorn.workers.UvicornWorker"
keepalive = 120
timeout = 120
loglevel = "info"
