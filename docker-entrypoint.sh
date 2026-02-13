#!/bin/sh
set -e
cd /app
npx prisma generate
npx prisma migrate deploy 2>/dev/null || npx prisma db push --accept-data-loss 2>/dev/null || true
exec "$@"
