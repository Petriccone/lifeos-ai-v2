#!/bin/bash

# ===========================================
# LifeOS AI - Deployment Script
# ===========================================
# Deploys frontend and backend to Vercel
# ===========================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  LifeOS AI - Deployment Script${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Check for required environment variables
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
    echo -e "${YELLOW}⚠️  Warning: Some environment variables may not be set.${NC}"
    echo -e "    Ensure you have a .env file with SUPABASE credentials."
fi

# ===========================================
# STEP 1: Build Frontend
# ===========================================
echo -e "\n${GREEN}→ Building frontend...${NC}"

if [ ! -d "frontend" ]; then
    echo -e "${YELLOW}  No frontend directory found, skipping build.${NC}"
else
    cd frontend
    npm install
    npm run build
    cd ..
    echo -e "${GREEN}  ✓ Frontend built successfully${NC}"
fi

# ===========================================
# STEP 2: Deploy to Vercel
# ===========================================
echo -e "\n${GREEN}→ Deploying to Vercel...${NC}"

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}  Installing Vercel CLI...${NC}"
    npm install -g vercel
fi

# Deploy frontend
echo -e "${GREEN}  → Deploying frontend...${NC}"
cd frontend
vercel --prod --yes
cd ..

# ===========================================
# STEP 3: Deploy Backend (API)
# ===========================================
if [ -d "backend" ]; then
    echo -e "${GREEN}  → Deploying backend API...${NC}"
    cd backend
    vercel --prod --yes
    cd ..
else
    echo -e "${YELLOW}  → No backend directory found, skipping API deployment.${NC}"
fi

# ===========================================
# STEP 4: Summary
# ===========================================
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Deployment Complete!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "\n${GREEN}→ Frontend:${NC} https://lifeos-ai.vercel.app"
echo -e "${GREEN}→ Backend:${NC}  https://lifeos-api.vercel.app"
echo -e "\n${YELLOW}Note: Update your .env with the actual deployed URLs.${NC}"
echo ""