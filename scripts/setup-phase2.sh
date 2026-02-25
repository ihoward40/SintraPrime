#!/bin/bash
# SintraPrime Phase 2 Setup Script
# Guides you through setting up the 3 required cloud services for Phase 2
# Run: bash scripts/setup-phase2.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   SintraPrime Phase 2 Setup — Service Validator    ${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

ENV_FILE=".env"
if [ ! -f "$ENV_FILE" ]; then
  echo -e "${YELLOW}No .env file found. Copying from .env.example...${NC}"
  cp .env.example .env
  echo -e "${GREEN}✓ Created .env from .env.example${NC}"
fi

check_var() {
  local var_name=$1
  local value=$(grep "^${var_name}=" .env | cut -d'=' -f2-)
  if [ -z "$value" ] || [ "$value" = "your_${var_name,,}_here" ] || [[ "$value" == *"REPLACE"* ]]; then
    echo -e "${RED}✗ $var_name is not set${NC}"
    return 1
  else
    echo -e "${GREEN}✓ $var_name is configured${NC}"
    return 0
  fi
}

echo -e "\n${BLUE}── Checking Phase 2 Service Variables ──${NC}\n"

MISSING=0

echo -e "${YELLOW}Redis (Upstash or Redis Cloud):${NC}"
check_var "REDIS_URL" || MISSING=$((MISSING+1))

echo ""
echo -e "${YELLOW}Qdrant Vector Search (Qdrant Cloud):${NC}"
check_var "QDRANT_URL" || MISSING=$((MISSING+1))
check_var "QDRANT_API_KEY" || MISSING=$((MISSING+1))

echo ""
echo -e "${YELLOW}Object Storage (Cloudflare R2 / Backblaze B2 / MinIO):${NC}"
check_var "S3_ENDPOINT" || MISSING=$((MISSING+1))
check_var "S3_ACCESS_KEY" || MISSING=$((MISSING+1))
check_var "S3_SECRET_KEY" || MISSING=$((MISSING+1))
check_var "S3_BUCKET" || MISSING=$((MISSING+1))

echo ""
echo -e "${YELLOW}Integrations (Optional but recommended):${NC}"
check_var "NOTION_TOKEN" || true
check_var "SLACK_WEBHOOK_URL_DEFAULT" || true

echo ""
echo -e "${BLUE}── Summary ──${NC}"
if [ $MISSING -eq 0 ]; then
  echo -e "${GREEN}✓ All Phase 2 services are configured! You're ready to deploy.${NC}"
else
  echo -e "${RED}✗ $MISSING required variable(s) missing. Instructions:${NC}"
  echo ""
  echo -e "  ${YELLOW}Redis (FREE):${NC}"
  echo "  1. Go to https://upstash.com → Create Database"
  echo "  2. Copy the Redis URL → add to .env:"
  echo "     REDIS_URL=rediss://default:xxx@xxx.upstash.io:6379"
  echo ""
  echo -e "  ${YELLOW}Qdrant (FREE 1GB):${NC}"
  echo "  1. Go to https://cloud.qdrant.io → Create Cluster"
  echo "  2. Copy Cluster URL + API Key → add to .env:"
  echo "     QDRANT_URL=https://xxx.aws.cloud.qdrant.io"
  echo "     QDRANT_API_KEY=your_api_key_here"
  echo ""
  echo -e "  ${YELLOW}Object Storage (FREE 10GB):${NC}"
  echo "  Option A — Cloudflare R2:"
  echo "  1. Go to https://dash.cloudflare.com → R2 → Create bucket"
  echo "  2. Create API token with R2 permissions"
  echo "  3. Add to .env:"
  echo "     S3_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com"
  echo "     S3_ACCESS_KEY=your_access_key"
  echo "     S3_SECRET_KEY=your_secret_key"
  echo "     S3_BUCKET=sintraprime-uploads"
  echo ""
  echo -e "  ${YELLOW}After filling in .env, re-run this script to verify.${NC}"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
