Fais un commit git intelligent avec push automatique :

1. Exécute `git status` pour voir toutes les modifications
2. Exécute `git diff --stat` pour analyser les changements
3. Fais `git add -A` pour ajouter TOUS les fichiers modifiés
4. Génère un message de commit précis en français avec le format : `type(scope): description`
   - Types : feat, fix, refactor, style, docs, chore, perf
   - Scope : déduit des fichiers modifiés (backend, frontend, ui, app, etc.)
   - Description : résumé concis des modifications
5. Effectue le commit avec le message généré et ajoute `Co-Authored-By: Claude <noreply@anthropic.com>`
6. Push vers origin sur la branche courante
7. Affiche le résultat final avec `git log -1 --oneline`
