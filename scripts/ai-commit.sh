#!/bin/bash

# AI Commit Script - Utilise Claude Code pour générer des messages de commit intelligents
# Usage: ./scripts/ai-commit.sh [--no-push]

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Options
PUSH=true
if [[ "$1" == "--no-push" ]]; then
    PUSH=false
fi

echo -e "${BLUE}🔍 Vérification des modifications...${NC}"

# Vérifier s'il y a des modifications
if [[ -z $(git status --porcelain) ]]; then
    echo -e "${YELLOW}⚠️  Aucune modification à commiter.${NC}"
    exit 0
fi

# Afficher le résumé des modifications
echo -e "${BLUE}📋 Résumé des modifications:${NC}"
git status --short

echo ""
echo -e "${BLUE}📊 Statistiques:${NC}"
git diff --stat 2>/dev/null || true
git diff --cached --stat 2>/dev/null || true

# Ajouter tous les fichiers
echo ""
echo -e "${GREEN}➕ Ajout de toutes les modifications (git add -A)...${NC}"
git add -A

# Générer le message de commit avec Claude
echo ""
echo -e "${BLUE}🤖 Génération du message de commit avec Claude...${NC}"

# Récupérer le diff pour l'analyse
DIFF=$(git diff --cached --stat)
FILES_CHANGED=$(git diff --cached --name-only | head -20)

# Créer un prompt pour Claude
PROMPT="Analyse ce diff git et génère UN SEUL message de commit concis en français.

Fichiers modifiés:
$FILES_CHANGED

Statistiques:
$DIFF

Règles:
- Format: type(scope): description courte
- Types: feat, fix, refactor, style, docs, chore, perf
- Maximum 72 caractères pour la première ligne
- En français
- Pas de guillemets autour du message
- Réponds UNIQUEMENT avec le message de commit, rien d'autre"

# Appeler Claude pour générer le message
COMMIT_MSG=$(echo "$PROMPT" | claude --print 2>/dev/null || echo "")

# Si Claude échoue, utiliser un message par défaut basé sur les fichiers
if [[ -z "$COMMIT_MSG" ]] || [[ "$COMMIT_MSG" == *"error"* ]]; then
    echo -e "${YELLOW}⚠️  Claude non disponible, génération d'un message basique...${NC}"

    # Compter les types de modifications
    ADDED=$(git diff --cached --numstat | wc -l | tr -d ' ')

    # Détecter le type principal de modification
    if echo "$FILES_CHANGED" | grep -q "fix\|bug\|error"; then
        TYPE="fix"
    elif echo "$FILES_CHANGED" | grep -q "test"; then
        TYPE="test"
    elif echo "$FILES_CHANGED" | grep -q "doc\|readme\|md"; then
        TYPE="docs"
    else
        TYPE="feat"
    fi

    # Détecter le scope
    if echo "$FILES_CHANGED" | grep -q "^convex/"; then
        SCOPE="backend"
    elif echo "$FILES_CHANGED" | grep -q "^app/"; then
        SCOPE="frontend"
    elif echo "$FILES_CHANGED" | grep -q "^components/"; then
        SCOPE="ui"
    else
        SCOPE="app"
    fi

    COMMIT_MSG="$TYPE($SCOPE): mise à jour de $ADDED fichier(s)"
fi

# Nettoyer le message (enlever les guillemets et espaces)
COMMIT_MSG=$(echo "$COMMIT_MSG" | tr -d '"' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | head -1)

echo ""
echo -e "${GREEN}📝 Message de commit:${NC}"
echo -e "   ${YELLOW}$COMMIT_MSG${NC}"
echo ""

# Demander confirmation
read -p "Confirmer ce commit? (Y/n/e pour éditer): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Ee]$ ]]; then
    # Mode édition
    read -p "Nouveau message: " COMMIT_MSG
elif [[ $REPLY =~ ^[Nn]$ ]]; then
    echo -e "${RED}❌ Commit annulé.${NC}"
    git reset HEAD . > /dev/null 2>&1
    exit 1
fi

# Effectuer le commit
echo -e "${GREEN}✅ Commit en cours...${NC}"
git commit -m "$COMMIT_MSG

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push si demandé
if [[ "$PUSH" == true ]]; then
    echo ""
    echo -e "${BLUE}🚀 Push vers origin...${NC}"

    BRANCH=$(git rev-parse --abbrev-ref HEAD)
    git push origin "$BRANCH"

    echo ""
    echo -e "${GREEN}✅ Commit et push effectués avec succès!${NC}"
else
    echo ""
    echo -e "${GREEN}✅ Commit effectué! (--no-push: pas de push)${NC}"
fi

# Afficher le résultat
echo ""
echo -e "${BLUE}📋 Dernier commit:${NC}"
git log -1 --oneline
