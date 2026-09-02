#!/bin/sh
set -e
# Runs as nextjs user; prisma files are chowned to nextjs in Dockerfile.
# Retry migrate briefly if db not yet ready (compose healthcheck covers most).
echo "[entrypoint] prisma migrate deploy..."
npx prisma migrate deploy || {
  echo "[entrypoint] migrate failed — retry in 3s..."
  sleep 3
  npx prisma migrate deploy
}
echo "[entrypoint] starting server..."
exec node server.js
