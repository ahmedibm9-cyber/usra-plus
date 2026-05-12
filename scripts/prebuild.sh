#!/bin/bash
# USRA PLUS — Prebuild Script
# Swaps Prisma schema based on DATABASE_PROVIDER env var

set -e

SCHEMA_DIR="prisma"
PROVIDER="${DATABASE_PROVIDER:-sqlite}"

echo "🔧 DATABASE_PROVIDER=$PROVIDER"

if [ "$PROVIDER" = "postgresql" ]; then
  echo "📦 Using PostgreSQL schema..."
  if [ -f "$SCHEMA_DIR/schema.postgresql.prisma" ]; then
    cp "$SCHEMA_DIR/schema.postgresql.prisma" "$SCHEMA_DIR/schema.prisma"
    echo "✅ Copied schema.postgresql.prisma → schema.prisma"
  else
    echo "⚠️  schema.postgresql.prisma not found, using default schema"
  fi
else
  echo "📦 Using SQLite schema (default)..."
fi

echo "🔄 Generating Prisma Client..."
npx prisma generate

echo "✅ Prebuild complete"
