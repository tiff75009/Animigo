# Feature: Affichage et copie des clés développeur

Cette documentation décrit les modifications apportées à la page `/admin/dev-keys` pour permettre de voir et copier les clés existantes.

## Résumé des fonctionnalités

- **Oeil** pour afficher/masquer la clé (masquée par défaut avec `••••••••••••••••`)
- **Bouton copier** qui copie `NEXT_PUBLIC_DEV_KEY=xxx` dans le presse-papier avec feedback visuel

---

## 1. Modification Backend (Convex)

### Fichier: `convex/admin/devPresence.ts`

Dans la query `getAllDevKeys`, ajouter le champ `key` dans le return:

```typescript
// Ligne ~94-110 dans getAllDevKeys
return devKeys.map((dk) => {
  const presence = presenceMap.get(dk._id.toString());
  const isOnline =
    presence && now - presence.lastHeartbeat < OFFLINE_THRESHOLD_MS;

  return {
    id: dk._id,
    name: dk.name,
    key: dk.key,  // <-- AJOUTER CETTE LIGNE
    isActive: dk.isActive,
    createdAt: dk.createdAt,
    revokedAt: dk.revokedAt,
    isOnline: isOnline ?? false,
    onlineSince: isOnline ? presence.onlineSince : null,
    lastSeen: presence?.lastHeartbeat ?? null,
  };
});
```

---

## 2. Modification Frontend

### Fichier: `app/admin/(dashboard)/dev-keys/page.tsx`

### 2.1 Imports

Ajouter `Eye` et `EyeOff` aux imports lucide-react:

```typescript
import { Key, Plus, Trash2, Copy, Check, Circle, Code, Eye, EyeOff } from "lucide-react";
```

### 2.2 Interface DevKey

Ajouter le champ `key`:

```typescript
interface DevKey {
  id: Id<"devKeys">;
  name: string;
  key: string;  // <-- AJOUTER
  isActive: boolean;
  createdAt: number;
  revokedAt: number | null;
  isOnline: boolean;
  onlineSince: number | null;
  lastSeen: number | null;
}
```

### 2.3 États

Ajouter ces états dans le composant:

```typescript
const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
```

### 2.4 Fonctions

Ajouter ces fonctions après `handleRevoke`:

```typescript
const toggleKeyVisibility = (keyId: Id<"devKeys">) => {
  const id = String(keyId);
  setVisibleKeys((prev) => {
    const newSet = new Set(prev);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    return newSet;
  });
};

const handleCopyExistingKey = async (key: string, keyId: Id<"devKeys">) => {
  await navigator.clipboard.writeText(`NEXT_PUBLIC_DEV_KEY=${key}`);
  setCopiedKeyId(String(keyId));
  setTimeout(() => setCopiedKeyId(null), 2000);
};

const isKeyVisible = (keyId: Id<"devKeys">) => visibleKeys.has(String(keyId));
```

### 2.5 Header du tableau

Ajouter la colonne "Clé" dans le `<thead>`:

```tsx
<thead className="bg-slate-800/50">
  <tr>
    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
      Statut
    </th>
    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
      Développeur
    </th>
    {/* NOUVELLE COLONNE */}
    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
      Clé
    </th>
    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
      Créée le
    </th>
    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
      Session / Dernière activité
    </th>
    <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
      Actions
    </th>
  </tr>
</thead>
```

### 2.6 Cellule de la clé dans chaque ligne

Ajouter après la cellule "Développeur" (`dk.name`):

```tsx
<td className="px-6 py-4">
  <div className="flex items-center gap-2">
    <code className="text-xs text-slate-400 font-mono bg-slate-800 px-2 py-1 rounded max-w-[200px] truncate">
      {isKeyVisible(dk.id) ? (dk.key || "Clé non disponible") : "••••••••••••••••"}
    </code>
    <button
      onClick={() => toggleKeyVisibility(dk.id)}
      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
      title={isKeyVisible(dk.id) ? "Masquer la clé" : "Afficher la clé"}
    >
      {isKeyVisible(dk.id) ? (
        <EyeOff className="w-4 h-4" />
      ) : (
        <Eye className="w-4 h-4" />
      )}
    </button>
    <button
      onClick={() => handleCopyExistingKey(dk.key, dk.id)}
      className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10 rounded transition-colors"
      title="Copier la clé"
    >
      {copiedKeyId === String(dk.id) ? (
        <Check className="w-4 h-4 text-emerald-400" />
      ) : (
        <Copy className="w-4 h-4" />
      )}
    </button>
  </div>
</td>
```

### 2.7 Mettre à jour le colSpan

Dans l'état vide du tableau, changer `colSpan={5}` en `colSpan={6}`:

```tsx
{devKeys?.length === 0 && (
  <tr>
    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
      Aucune clé créée. Générez une première clé pour commencer.
    </td>
  </tr>
)}
```

---

## Notes importantes

1. **Conversion ID en String**: Les `Id<"devKeys">` de Convex doivent être convertis en `String()` pour fonctionner avec les `Set` JavaScript.

2. **Sécurité**: Cette feature expose les clés aux admins uniquement (la query `getAllDevKeys` vérifie `requireAdmin`).

3. **Feedback utilisateur**: Le bouton copier affiche une coche verte pendant 2 secondes après la copie.
