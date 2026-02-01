#!/bin/bash

# Script d'installation de l'alias global 'gac' (Git Add Commit)
# Usage: source ./scripts/setup-alias.sh

SHELL_RC=""

# Détecter le shell
if [[ "$SHELL" == *"zsh"* ]]; then
    SHELL_RC="$HOME/.zshrc"
elif [[ "$SHELL" == *"bash"* ]]; then
    SHELL_RC="$HOME/.bashrc"
fi

if [[ -z "$SHELL_RC" ]]; then
    echo "Shell non reconnu. Ajoute manuellement l'alias."
    exit 1
fi

# Vérifier si l'alias existe déjà
if grep -q "alias gac=" "$SHELL_RC" 2>/dev/null; then
    echo "✅ L'alias 'gac' existe déjà dans $SHELL_RC"
else
    echo "" >> "$SHELL_RC"
    echo "# Alias AI Commit avec Claude" >> "$SHELL_RC"
    echo "alias gac='claude \"git add -A && génère un message de commit précis en français pour toutes les modifications, puis commit et push\"'" >> "$SHELL_RC"
    echo "✅ Alias 'gac' ajouté à $SHELL_RC"
fi

echo ""
echo "Pour activer maintenant, exécute:"
echo "  source $SHELL_RC"
echo ""
echo "Utilisation:"
echo "  gac    → commit et push toutes les modifications avec message IA"
