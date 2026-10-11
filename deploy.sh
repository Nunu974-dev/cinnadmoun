#!/bin/bash
# ============================================
# 🚀 DEPLOY FTP DIRECT - Cinnad'moun
# Usage:
#   ./deploy.sh                     → envoie les fichiers du dernier commit
#   ./deploy.sh fichier1 fichier2   → envoie des fichiers spécifiques
#   ./deploy.sh --all               → envoie TOUT le projet
# ============================================

# Charger les credentials
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env.ftp"

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Fichier .env.ftp introuvable !"
    echo "   Crée-le en copiant .env.ftp.example et remplis tes credentials Hostinger."
    exit 1
fi
source "$ENV_FILE"

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}🎂 ============================================${NC}"
echo -e "${CYAN}🚀 DEPLOY FTP DIRECT - Cinnad'moun${NC}"
echo -e "${CYAN}🎂 ============================================${NC}"
echo -e "   Serveur : ${FTP_HOST}:${FTP_PORT}"
echo -e "   Dossier : ${FTP_REMOTE}"
echo ""

# Vérifier que lftp est installé
if ! command -v lftp &> /dev/null; then
    echo -e "${RED}❌ lftp n'est pas installé.${NC}"
    echo "   Installe-le avec : brew install lftp"
    exit 1
fi

# ── Déterminer les fichiers à envoyer ──────────────────────────
if [ "$1" == "--all" ]; then
    # Tous les fichiers (sauf exclusions)
    FILES=()
    while IFS= read -r -d '' f; do
        FILES+=("${f#./}")
    done < <(find . -maxdepth 2 -type f \
        ! -path './.git/*' \
        ! -path './.github/*' \
        ! -path './backend/*' \
        ! -path './node_modules/*' \
        ! -name '.env*' \
        ! -name '*.sh' \
        ! -name '.DS_Store' \
        ! -name '.gitignore' \
        ! -path './api/config.php' \
        ! -name 'Procfile' \
        ! -name 'railway.json' \
        ! -name '*.backup' \
        ! -name 'README*' \
        ! -name 'GUIDE*' \
        ! -name 'STRIPE*' \
        ! -name 'DEPLOIEMENT*' \
        -print0)
    echo -e "${YELLOW}📦 Mode TOUT le projet (${#FILES[@]} fichiers)${NC}"

elif [ $# -gt 0 ]; then
    # Fichiers passés en argument
    FILES=("$@")
    echo -e "${YELLOW}📦 Fichiers spécifiques : ${FILES[*]}${NC}"

else
    # Fichiers du dernier commit git
    FILES=()
    while IFS= read -r line; do [ -n "$line" ] && FILES+=("$line"); done < <(git -C "$SCRIPT_DIR" diff --name-only HEAD~1 HEAD 2>/dev/null)

    if [ ${#FILES[@]} -eq 0 ]; then
        echo -e "${YELLOW}⚠️  Aucun fichier trouvé dans le dernier commit.${NC}"
        exit 0
    fi
    echo -e "${YELLOW}📦 Fichiers du dernier commit (${#FILES[@]} fichiers)${NC}"
fi

if [ ${#FILES[@]} -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Aucun fichier à déployer.${NC}"
    exit 0
fi

# ── Afficher la liste ──────────────────────────────────────────
echo ""
echo "📋 Fichiers à envoyer :"
for f in "${FILES[@]}"; do
    echo "   • $f"
done
echo ""

# ── Confirmation ───────────────────────────────────────────────
read -r -p "👉 Envoyer ces fichiers sur Hostinger ? (o/N) " confirm
if [[ ! "$confirm" =~ ^[oOyY]$ ]]; then
    echo "Annulé."
    exit 0
fi
echo ""

# ── Construire le script lftp ──────────────────────────────────
LFTP_CMDS="set ftp:ssl-allow no; set ssl:verify-certificate no; set net:timeout 30; set net:max-retries 3;"
LFTP_CMDS+=" open -u \"${FTP_USER}\",\"${FTP_PASS}\" ftp://${FTP_HOST}:${FTP_PORT};"

OK=0
FAIL=0
for f in "${FILES[@]}"; do
    # Ignorer les fichiers sensibles ou exclus
    case "$f" in
        .env*|*.sh|.gitignore|Procfile|railway.json|*.backup|README*|GUIDE*|STRIPE*|DEPLOIEMENT*) continue ;;
        backend/*|.github/*|.git/*|node_modules/*) continue ;;
        .DS_Store) continue ;;
    esac

    LOCAL="$SCRIPT_DIR/$f"
    DIR=$(dirname "$f")
    if [ "$DIR" == "." ]; then
        REMOTE_DIR="$FTP_REMOTE"
    else
        REMOTE_DIR="$FTP_REMOTE/$DIR"
    fi

    if [ -f "$LOCAL" ]; then
        LFTP_CMDS+=" mkdir -p \"$REMOTE_DIR\" 2>/dev/null; put \"$LOCAL\" -o \"$REMOTE_DIR/$(basename "$f")\";"
        ((OK++))
    else
        echo -e "${YELLOW}⚠️  Fichier local introuvable : $f${NC}"
        ((FAIL++))
    fi
done

LFTP_CMDS+=" bye;"

# ── Exécuter ──────────────────────────────────────────────────
echo -e "⏳ Envoi en cours..."
echo ""

if lftp -c "$LFTP_CMDS" 2>&1; then
    echo ""
    echo -e "${GREEN}✅ ============================================${NC}"
    echo -e "${GREEN}✅ Déploiement terminé ! ($OK fichier(s) envoyé(s))${NC}"
    echo -e "${GREEN}✅ ============================================${NC}"
    echo -e "   🌐 https://cinnadmoun.re"
else
    echo ""
    echo -e "${RED}❌ Erreur lors du déploiement FTP.${NC}"
    echo "   Vérifie les credentials dans .env.ftp"
    exit 1
fi
