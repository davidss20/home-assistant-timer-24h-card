#!/bin/bash

# Timer 24H Card Release Script
# Usage: ./release.sh [stable|beta|dev] [version]

set -e

CHANNEL=${1:-"dev"}
VERSION=${2:-""}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Timer 24H Card Release Script${NC}"
echo -e "${BLUE}================================${NC}"

# Validate channel
case $CHANNEL in
  "stable"|"beta"|"dev")
    echo -e "${GREEN}✅ Channel: ${CHANNEL}${NC}"
    ;;
  *)
    echo -e "${RED}❌ Invalid channel. Use: stable, beta, or dev${NC}"
    exit 1
    ;;
esac

# Generate version if not provided
if [ -z "$VERSION" ]; then
  case $CHANNEL in
    "stable")
      echo -e "${YELLOW}⚠️  Please provide version for stable release${NC}"
      echo -e "${YELLOW}Usage: ./release.sh stable v1.2.0${NC}"
      exit 1
      ;;
    "beta")
      VERSION="v$(date +'%Y.%m.%d')-beta.$(git rev-parse --short HEAD)"
      ;;
    "dev")
      VERSION="v$(date +'%Y.%m.%d')-dev.$(git rev-parse --short HEAD)"
      ;;
  esac
fi

echo -e "${GREEN}📦 Version: ${VERSION}${NC}"

# Update version in files
echo -e "${BLUE}🔧 Updating version in files...${NC}"

# Update timer-24h-card.js
sed -i.bak "s/Version [0-9.]*/Version ${VERSION}/g" timer-24h-card.js && rm timer-24h-card.js.bak
echo -e "${GREEN}  ✅ Updated timer-24h-card.js${NC}"

# Update package.json if exists
if [ -f package.json ]; then
  sed -i.bak "s/\"version\": \"[^\"]*\"/\"version\": \"${VERSION}\"/g" package.json && rm package.json.bak
  echo -e "${GREEN}  ✅ Updated package.json${NC}"
fi

# Create ZIP archive
echo -e "${BLUE}📦 Creating ZIP archive...${NC}"
ZIP_NAME="timer-24h-card-${VERSION}.zip"

zip -r "$ZIP_NAME" \
  timer-24h-card.js \
  timer-24h-card-editor.js \
  hacs.json \
  README.md \
  info.md \
  CHANNELS.md \
  images/ \
  -x "*.git*" "node_modules/*" "*.log" "*.bak"

echo -e "${GREEN}✅ Created: ${ZIP_NAME}${NC}"

# Git operations
echo -e "${BLUE}📝 Git operations...${NC}"

# Check if we have uncommitted changes
if ! git diff-index --quiet HEAD --; then
  echo -e "${YELLOW}⚠️  You have uncommitted changes. Commit them first.${NC}"
  git status --short
  exit 1
fi

# Create and push tag
case $CHANNEL in
  "stable")
    echo -e "${BLUE}🏷️  Creating stable release tag...${NC}"
    git tag "$VERSION"
    git push origin "$VERSION"
    echo -e "${GREEN}✅ Stable release tagged and pushed${NC}"
    ;;
  "beta")
    echo -e "${BLUE}🏷️  Creating beta release tag...${NC}"
    git tag "$VERSION"
    git push origin "$VERSION"
    
    # Also push to beta branch if it exists
    if git show-ref --verify --quiet refs/heads/beta; then
      git push origin beta
      echo -e "${GREEN}✅ Beta release tagged and beta branch updated${NC}"
    else
      echo -e "${YELLOW}⚠️  Beta branch doesn't exist, creating it...${NC}"
      git checkout -b beta
      git push -u origin beta
      git checkout main
      echo -e "${GREEN}✅ Beta branch created and pushed${NC}"
    fi
    ;;
  "dev")
    echo -e "${BLUE}🏷️  Creating development tag...${NC}"
    git tag "$VERSION"
    git push origin "$VERSION"
    echo -e "${GREEN}✅ Development build tagged${NC}"
    ;;
esac

# Summary
echo -e "${BLUE}📋 Release Summary${NC}"
echo -e "${BLUE}=================${NC}"
echo -e "${GREEN}Channel: ${CHANNEL}${NC}"
echo -e "${GREEN}Version: ${VERSION}${NC}"
echo -e "${GREEN}Archive: ${ZIP_NAME}${NC}"
echo -e "${GREEN}Tag: Pushed to GitHub${NC}"

case $CHANNEL in
  "stable")
    echo -e "${BLUE}🎉 Stable release complete!${NC}"
    echo -e "${YELLOW}📝 Don't forget to create a GitHub release with the ZIP file${NC}"
    ;;
  "beta")
    echo -e "${BLUE}🧪 Beta release complete!${NC}"
    echo -e "${YELLOW}📝 Beta users will receive this update automatically${NC}"
    ;;
  "dev")
    echo -e "${BLUE}🔧 Development build complete!${NC}"
    echo -e "${YELLOW}📝 This is for testing purposes only${NC}"
    ;;
esac

echo -e "${BLUE}🔗 GitHub Actions will automatically create the release${NC}"
echo -e "${GREEN}✨ Done!${NC}"
