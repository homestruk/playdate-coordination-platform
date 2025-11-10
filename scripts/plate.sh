#!/usr/bin/env bash
set -euo pipefail

PROJECT_REF="${PROJECT_REF:-}"
APP_URL="${APP_URL:-http://localhost:3000}"

if ! command -v supabase >/dev/null 2>&1; then
  echo "supabase CLI not found. Install: https://supabase.com/docs/guides/cli" >&2
  exit 1
fi

if [[ -z "${NEXT_PUBLIC_SUPABASE_URL:-}" || -z "${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}" || -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
  echo "Missing required env: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY" >&2
  exit 1
fi

echo "== Supabase Update Plate =="

if [[ -n "$PROJECT_REF" ]]; then
  echo "Linking to project $PROJECT_REF"
  supabase link --project-ref "$PROJECT_REF"
else
  echo "PROJECT_REF not set; skipping supabase link (assumes already linked)"
fi

echo "Backup database"
supabase db dump -f "backup_$(date +%F).sql"

echo "Apply migrations"
supabase db push

echo "Backfill profiles and creator memberships"
curl -s -X POST "$APP_URL/api/admin/backfill" | jq . || true

if [[ -n "${SUPERADMIN_EMAILS:-}" ]]; then
  echo "Elevate super admins from SUPERADMIN_EMAILS"
  curl -s -X POST "$APP_URL/api/admin/elevate" | jq . || true
else
  echo "SUPERADMIN_EMAILS not set; skipping elevation"
fi

if [[ "${SEED_DEMO:-0}" == "1" ]]; then
  echo "Seeding demo data"
  curl -s -X POST "$APP_URL/api/admin/seed-demo" | jq . || true
fi

echo "Plate completed. Validate with supabase/plate/validate.sql and verify UI flows."


