Fais un commit git intelligent avec push automatique.

**IMPORTANT : Tu DOIS suivre ces étapes EXACTEMENT, pas de cas par cas !**

1. `git status` pour voir les modifications
2. `git diff --stat` pour analyser les changements
3. **`git add -A`** - Ajoute TOUS les fichiers, SANS EXCEPTION (sauf submodules git)
4. Génère un message de commit en français : `type(scope): description`
   - Types : feat, fix, refactor, style, docs, chore, perf
   - Scope : déduit des fichiers (backend, frontend, ui, etc.)
5. Commit avec `Co-Authored-By: Claude <noreply@anthropic.com>`
6. `git push origin <branche-courante>`
7. `git log -1 --oneline` pour confirmer
