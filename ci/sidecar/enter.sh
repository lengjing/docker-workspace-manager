#!/bin/bash
set -e

PORT=$(echo $SSH_CONNECTION | awk '{print $2}')
CONTAINER_ID=$(sqlite3 /opt/sqlite.db "SELECT container_id FROM port_map WHERE port=$PORT")

if [ -z "$CONTAINER_ID" ]; then
  echo "No container bound to port $PORT"
  exit 1
fi

PID=$(docker inspect -f '{{.State.Pid}}' "$CONTAINER_ID" 2>/dev/null)

if [ -z "$PID" ]; then
  echo "Container $CONTAINER_ID not found or not running"
  exit 1
fi

exec nsenter -t "$PID" -m -u -i -n -p -- su -l root \
jupyter lab --ip=0.0.0.0 --port=8888 --no-browser --allow-root --NotebookApp.token=''
