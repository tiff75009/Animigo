Fais un commit git intelligent avec push automatique.

**IMPORTANT : Tu DOIS suivre ces étapes EXACTEMENT, sans exception !**

## Étape 1 : Analyse complète des changements
Exécute ces commandes pour comprendre TOUS les changements :
- `git status` → fichiers modifiés/ajoutés/supprimés
- `git diff` → contenu EXACT des modifications (lis attentivement chaque ligne !)
- `git diff --stat` → résumé statistique

## Étape 2 : Staging
**`git add -A`** → Ajoute TOUT, sans exception. Ne JAMAIS faire du cas par cas.

## Étape 3 : Message de commit parfait
Génère un message en français basé sur ton analyse du diff :
- Format : `type(scope): description concise`
- Types : feat, fix, refactor, style, docs, chore, perf
- Scope : déduit des fichiers (ui, backend, auth, booking, etc.)
- Description : résume le QUOI et le POURQUOI, pas le comment
- Si plusieurs changements distincts, liste-les dans le body du commit

## Étape 4 : Commit et Push
```bash
git commit -m "message"
# Ajoute toujours : Co-Authored-By: Claude <noreply@anthropic.com>
git push origin <branche-courante>
git log -1 --oneline
```

## Règles
- JAMAIS de commit vide
- JAMAIS oublier le push
- TOUJOURS lire le diff avant de rédiger le message
