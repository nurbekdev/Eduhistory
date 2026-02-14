#!/bin/sh
set -e
cd /app
mkdir -p public/uploads/avatars public/uploads/general public/uploads/covers public/uploads/certificate-logo public/uploads/certificate-signature
npx prisma generate
npx prisma migrate deploy 2>/dev/null || npx prisma db push --accept-data-loss 2>/dev/null || true
exec "$@"
