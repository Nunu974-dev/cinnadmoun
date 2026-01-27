#!/bin/bash

# Script pour incrémenter la version des fichiers JS/CSS
# Usage: ./bump-version.sh

# Couleurs pour le terminal
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 Mise à jour de la version des assets...${NC}"

# Trouver la version actuelle dans index.html
CURRENT_VERSION=$(grep -o 'script.js?v=[0-9.]*' index.html | grep -o '[0-9.]*' | head -1)

if [ -z "$CURRENT_VERSION" ]; then
    echo "❌ Version non trouvée, utilisation de 1.0"
    CURRENT_VERSION="1.0"
fi

# Incrémenter la version
IFS='.' read -ra VERSION_PARTS <<< "$CURRENT_VERSION"
MAJOR=${VERSION_PARTS[0]:-1}
MINOR=${VERSION_PARTS[1]:-0}
NEW_MINOR=$((MINOR + 1))
NEW_VERSION="$MAJOR.$NEW_MINOR"

echo -e "Version actuelle : ${BLUE}v$CURRENT_VERSION${NC}"
echo -e "Nouvelle version : ${GREEN}v$NEW_VERSION${NC}"

# Remplacer dans index.html
sed -i '' "s/script.js?v=$CURRENT_VERSION/script.js?v=$NEW_VERSION/g" index.html
sed -i '' "s/styles.css?v=$CURRENT_VERSION/styles.css?v=$NEW_VERSION/g" index.html
sed -i '' "s/config.js?v=$CURRENT_VERSION/config.js?v=$NEW_VERSION/g" index.html

echo -e "${GREEN}✅ Versions mises à jour vers v$NEW_VERSION${NC}"
echo ""
echo -e "${BLUE}📝 N'oubliez pas de :${NC}"
echo "   1. git add ."
echo "   2. git commit -m 'Bump version to v$NEW_VERSION'"
echo "   3. git push"
echo "   4. Uploader index.html en FTP"
