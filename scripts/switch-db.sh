#!/bin/bash
# Switch Prisma schema between SQLite (local) and PostgreSQL (Vercel)
# Usage: ./scripts/switch-db.sh [sqlite|postgresql]

set -e

TARGET=${1:-sqlite}
SCHEMA_DIR="prisma"

if [ "$TARGET" = "sqlite" ]; then
  echo "🔄 Switching to SQLite for local development..."
  cp "$SCHEMA_DIR/schema.sqlite.prisma" "$SCHEMA_DIR/schema.prisma"
  # Update .env for SQLite
  cat > .env << 'EOF'
DATABASE_URL="file:/home/z/my-project/db/custom.db"
EOF
elif [ "$TARGET" = "postgresql" ]; then
  echo "🔄 Switching to PostgreSQL for Vercel deployment..."
  cp "$SCHEMA_DIR/schema.postgresql.prisma" "$SCHEMA_DIR/schema.prisma"
  # Update .env for PostgreSQL
  source .env.local 2>/dev/null || true
else
  echo "Usage: $0 [sqlite|postgresql]"
  exit 1
fi

echo "✅ Schema switched to $TARGET"
echo "📝 Run 'npx prisma generate' to regenerate the client"
