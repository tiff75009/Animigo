# Système de Paiement Animigo

## Vue d'ensemble

```
CLIENT                          PLATEFORME                       ANNONCEUR
   │                                │                                │
   │  Paye la réservation           │                                │
   │  ─────────────────────────────>│                                │
   │                                │                                │
   │                                │  Montant encaissé              │
   │                                │  (commission 15% prélevée)     │
   │                                │                                │
   │                                │  Mission terminée              │
   │                                │  ─────────────────────────────>│
   │                                │                                │
   │                                │         Solde encaissable      │
   │                                │         s'accumule             │
   │                                │                                │
   │                                │  LE 25 DU MOIS (automatique)   │
   │                                │  Stripe Connect transfert      │
   │                                │  ─────────────────────────────>│
```

---

## 1. Paiement Client → Plateforme

### Déclencheur
L'annonceur accepte la demande de réservation.

### Flux
1. Annonceur clique "Accepter la mission"
2. Email envoyé au client avec lien de paiement (Stripe)
3. Client paye via Stripe Checkout
4. Paiement confirmé → Mission passe en statut `upcoming`

### Montants
| Élément | Calcul |
|---------|--------|
| Montant total | Prix affiché au client |
| Commission plateforme | 15% du total |
| Gains annonceur | 85% du total |

**Exemple :** Réservation à 100€
- Client paye : 100€
- Commission Animigo : 15€
- Gains annonceur : 85€

---

## 2. Mission → Solde Encaissable

### Déclencheur
La mission passe en statut `completed` (terminée).

### Règle
```
Solde encaissable = Somme des gains annonceur des missions terminées non versées
```

### Exemple
| Mission | Statut | Gains | Versé ? | Dans le solde ? |
|---------|--------|-------|---------|-----------------|
| Mission A | completed | 42,50€ | Non | ✅ Oui |
| Mission B | completed | 85,00€ | Non | ✅ Oui |
| Mission C | completed | 25,50€ | Oui | ❌ Non |
| Mission D | upcoming | 60,00€ | - | ❌ Non (pas terminée) |

**Solde encaissable = 42,50€ + 85,00€ = 127,50€**

---

## 3. Versement Automatique (le 25 du mois)

### Fonctionnement
Chaque **25 du mois**, un cron job automatique :

1. Récupère tous les annonceurs avec un solde encaissable > 0
2. Pour chaque annonceur :
   - Crée un Transfer Stripe Connect vers son compte connecté
   - Enregistre le versement dans `announcerPayouts`
   - Marque les missions comme versées
3. Envoie une notification à chaque annonceur

### Prérequis Annonceur
- Compte Stripe Connect activé et vérifié
- Au moins une mission terminée non versée

### Pas de montant minimum
Tout solde > 0€ est versé automatiquement.

---

## 4. Stripe Connect

### Onboarding Annonceur
Lors de l'inscription ou première réservation :
1. L'annonceur est redirigé vers Stripe Connect Onboarding
2. Il renseigne ses infos (identité, IBAN, etc.)
3. Stripe vérifie et active le compte
4. L'annonceur peut recevoir des versements

### Transfert automatique
```
Animigo (compte Stripe principal)
         │
         │  Stripe Transfer API
         │  le 25 du mois
         ▼
Annonceur (compte Stripe Connect)
         │
         │  Payout automatique Stripe
         ▼
    Compte bancaire annonceur
```

---

## 5. Statuts des versements

| Statut | Description |
|--------|-------------|
| `pending` | En attente du 25 du mois |
| `processing` | Transfert Stripe en cours |
| `completed` | Versé avec succès |
| `failed` | Échec (compte non vérifié, etc.) |

### En cas d'échec
- L'annonceur est notifié
- Le solde reste encaissable
- Nouvelle tentative le 25 du mois suivant
- L'annonceur doit vérifier son compte Stripe Connect

---

## 6. Interface Annonceur

### Page `/dashboard/paiements`

**Solde actuel**
```
┌────────────────────────────────────────┐
│  Solde encaissable                     │
│  127,50 €                              │
│                                        │
│  Prochain versement : 25 février 2025  │
└────────────────────────────────────────┘
```

**Compte Stripe Connect**
```
┌────────────────────────────────────────┐
│  Statut : ✅ Vérifié                   │
│  IBAN : FR76 •••• •••• 4521            │
│                                        │
│  [Gérer mon compte Stripe]             │
└────────────────────────────────────────┘
```

**Historique des versements**
```
┌────────────────────────────────────────┐
│ 25/01/2025  │  253,00 €  │  ✅ Versé   │
│ 25/12/2024  │  180,50 €  │  ✅ Versé   │
│ 25/11/2024  │   95,00 €  │  ✅ Versé   │
└────────────────────────────────────────┘
```

**Détail d'un versement** (au clic)
```
Versement du 25/01/2025
Montant : 253,00 €
Statut : Versé
Référence Stripe : tr_xxxxx

Missions incluses :
- Garde de Luna (12-15 janv.) : 127,50 €
- Promenade de Rex (8 janv.) : 45,00 €
- Visite de Mochi (5-7 janv.) : 80,50 €
```

---

## 7. Cas particuliers

### Compte Stripe Connect non vérifié
- L'annonceur voit un message d'alerte
- Il doit compléter son onboarding Stripe
- Le solde s'accumule mais n'est pas versé tant que le compte n'est pas vérifié

### Litige / Chargeback
Si un client conteste un paiement après versement :
- Stripe débite automatiquement le compte Connect de l'annonceur
- Ou le montant est déduit du prochain versement

### Premier mois
Si l'annonceur s'inscrit après le 25 du mois, son premier versement sera le 25 du mois suivant.

---

## 8. Schéma Base de Données

### Table `announcerPayouts`
| Champ | Type | Description |
|-------|------|-------------|
| announcerId | ID | Annonceur concerné |
| amount | number | Montant en centimes |
| missionIds | ID[] | Missions incluses |
| status | string | pending/processing/completed/failed |
| stripeTransferId | string? | ID du Transfer Stripe |
| scheduledFor | number | Date prévue (le 25) |
| processedAt | number? | Date de traitement |
| completedAt | number? | Date de versement |
| failureReason | string? | Raison de l'échec |

### Champs ajoutés à `missions`
| Champ | Type | Description |
|-------|------|-------------|
| announcerPayoutId | ID? | Référence au versement |
| announcerPaidAt | number? | Date du versement |

### Champs sur `users` (annonceur)
| Champ | Type | Description |
|-------|------|-------------|
| stripeConnectId | string? | ID compte Stripe Connect |
| stripeConnectStatus | string? | pending/verified/restricted |

---

## 9. Cron Job (le 25 du mois)

### Déclencheur
Cron Convex programmé pour le 25 de chaque mois à 10h00.

### Étapes
```
1. Récupérer tous les annonceurs avec :
   - stripeConnectStatus = "verified"
   - Au moins 1 mission completed sans announcerPayoutId

2. Pour chaque annonceur :
   a. Calculer le solde (somme des announcerEarnings)
   b. Créer un enregistrement announcerPayouts (status: processing)
   c. Appeler Stripe Transfer API
   d. Si succès :
      - Mettre à jour payout (status: completed)
      - Marquer les missions (announcerPayoutId, announcerPaidAt)
      - Notifier l'annonceur
   e. Si échec :
      - Mettre à jour payout (status: failed, failureReason)
      - Notifier l'annonceur du problème

3. Log du traitement pour audit
```

---

## 10. Notifications

| Événement | Destinataire | Message |
|-----------|--------------|---------|
| Versement effectué | Annonceur | "Versement de [Montant] effectué sur votre compte" |
| Versement échoué | Annonceur | "Échec du versement, vérifiez votre compte Stripe" |
| Compte non vérifié | Annonceur | "Complétez votre compte Stripe pour recevoir vos gains" |
| Rappel avant versement | Annonceur | "Versement prévu le 25 : [Montant]" (optionnel, le 20)

---

## 11. Résumé

| Quoi | Quand | Comment |
|------|-------|---------|
| Paiement client | À la réservation | Stripe Checkout |
| Solde encaissable | Mission terminée | Automatique |
| Versement annonceur | Le 25 du mois | Stripe Connect Transfer (auto) |
