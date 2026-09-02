#!/usr/bin/env bash
set -euo pipefail
# Closer OS — pg_dump backup (§122). No new deps.
# Usage:
#   DATABASE_URL=postgresql://... ./scripts/backup.sh            # writes ./backups/closer_os_YYYYmmdd_HHMMSS.sql.gz
#   CRON: 0 3 * * * DATABASE_URL=... /app/scripts/backup.sh >> /var/log/backup.log 2>&1
# Optional R2/S3 upload if STORAGE_* set: uses `aws s3 cp` if aws cli present, else skips.

STAMP="$(date +%Y%m%d_%H%M%S)"
OUT_DIR="${BACKUP_DIR:-./backups}"
OUT_FILE="$OUT_DIR/closer_os_${STAMP}.sql.gz"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[backup] DATABASE_URL not set" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"

echo "[backup] dumping to $OUT_FILE ..."
# pg_dump via DATABASE_URL; requires pg_dump in PATH (postgres:16-alpine image has it)
if command -v pg_dump >/dev/null 2>&1; then
  pg_dump "$DATABASE_URL" | gzip -9 > "$OUT_FILE"
elif command -v docker >/dev/null 2>&1 && docker compose ps db 2>/dev/null | grep -q db; then
  docker compose exec -T db pg_dump -U closer closer_os | gzip -9 > "$OUT_FILE"
else
  echo "[backup] pg_dump not found and no compose db available" >&2
  exit 1
fi

echo "[backup] wrote $OUT_FILE ($(du -h "$OUT_FILE" | cut -f1))"

# Retention prune
# shellcheck disable=SC2016
find "$OUT_DIR" -name 'closer_os_*.sql.gz' -mtime +"$RETENTION_DAYS" -print -delete 2>/dev/null || true

# Optional R2/S3 upload
if [ -n "${STORAGE_BUCKET:-}" ] && [ -n "${STORAGE_ENDPOINT:-}" ] && command -v aws >/dev/null 2>&1; then
  KEY="backups/closer_os_${STAMP}.sql.gz"
  echo "[backup] uploading to s3://$STORAGE_BUCKET/$KEY ..."
  aws s3 cp "$OUT_FILE" "s3://$STORAGE_BUCKET/$KEY" --endpoint-url "$STORAGE_ENDPOINT" ${STORAGE_REGION:+--region "$STORAGE_REGION"} || echo "[backup] S3 upload failed (non-fatal)" >&2
elif [ -n "${STORAGE_BUCKET:-}" ]; then
  echo "[backup] STORAGE_BUCKET set but aws cli not available — skipping upload" >&2
fi

echo "[backup] done. Coolify alternative: use Coolify PG automated backups (see docs/DEPLOYMENT.md)."
