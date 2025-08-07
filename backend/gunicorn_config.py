import os
import multiprocessing

# Configuración del servidor
bind = f"0.0.0.0:{os.getenv('PORT', '5000')}"
workers = min(multiprocessing.cpu_count() * 2 + 1, 3)  # Limitar a 3 workers máximo para free tier
worker_class = 'sync'  # Usar sync worker class (no gevent/eventlet)
worker_connections = 1000

# Timeouts
timeout = 120  # Aumentar timeout a 120 segundos
graceful_timeout = 30
keepalive = 5

# Límites
max_requests = 1000
max_requests_jitter = 50

# Logging
accesslog = '-'
errorlog = '-'
loglevel = 'info'
capture_output = True
enable_stdio_inheritance = True

# Preload
preload_app = True

# Server mechanics
daemon = False
pidfile = None
user = None
group = None
tmp_upload_dir = None

# SSL (si es necesario)
keyfile = None
certfile = None

def when_ready(server):
    server.log.info("Server is ready. Spawning workers")

def worker_int(worker):
    worker.log.info("worker received INT or QUIT signal")

def pre_fork(server, worker):
    server.log.info("Worker spawned (pid: %s)", worker.pid)

def pre_exec(server):
    server.log.info("Forked child, re-executing.")

def on_starting(server):
    server.log.info("Starting Gunicorn server")

def on_reload(server):
    server.log.info("Reloading Gunicorn server")