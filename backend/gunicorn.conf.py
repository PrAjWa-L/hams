import multiprocessing
import os

# ── Server socket ─────────────────────────────────────────────
bind = f"0.0.0.0:{os.getenv('PORT', '8000')}"
backlog = 2048

# ── Workers ───────────────────────────────────────────────────
# Use uvicorn workers for ASGI / async support
worker_class = "uvicorn.workers.UvicornWorker"
workers = int(os.getenv("GUNICORN_WORKERS", multiprocessing.cpu_count() * 2 + 1))
worker_connections = 1000
threads = 1

# ── Timeouts ─────────────────────────────────────────────────
timeout = 120
keepalive = 5
graceful_timeout = 30

# ── Logging ──────────────────────────────────────────────────
accesslog = "-"
errorlog = "-"
loglevel = os.getenv("LOG_LEVEL", "info").lower()
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)sµs'

# ── Process naming ────────────────────────────────────────────
proc_name = "hams-api"

# ── SSL (terminate at Nginx in prod — leave off here) ─────────
# keyfile = ""
# certfile = ""

# ── Lifecycle hooks ───────────────────────────────────────────
def on_starting(server):
    server.log.info("HAMS API server starting")

def on_exit(server):
    server.log.info("HAMS API server stopped")

def worker_abort(worker):
    worker.log.warning("Worker aborted (timeout?)")
