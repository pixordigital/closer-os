#!/bin/sh
set -e
# Runs as nextjs user; prisma files are chowned to nextjs in Dockerfile.
# Retry migrate with exponential backoff if db not yet ready.
echo "[entrypoint] prisma migrate deploy..."
for i in 1 2 3; do
  prisma migrate deploy && break
  echo "[entrypoint] migrate failed — retry $i/3 in ${i}s..."
  sleep $i
done
echo "[entrypoint] starting server..."
exec node server.js
