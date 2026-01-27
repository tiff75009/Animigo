# Stripe Connect - Animigo

## Vue d'ensemble

Animigo utilise **Stripe Connect Express** pour gérer les paiements entre clients et annonceurs.
La plateforme agit comme intermédiaire : elle encaisse le client, retient sa commission, puis verse l'annonceur une fois la mission terminée.

---

## Les 3 acteurs

| Acteur | Rôle | Compte Stripe |
|--------|------|---------------|
| **Animigo** | Plateforme (intermédiaire) | Compte Stripe standard (principal) |
| **Annonceur** | Prestataire de services | Compte Connect Express (créé via onboarding) |
| **Client** | Réserve et paye | Pas de compte Stripe, juste sa CB |

---

## Stripe Connect Express

### Pourquoi Express ?

- Onboarding hébergé par Stripe (KYC, IBAN, identité) → pas de dev custom
- Dashboard simplifié pour l'annonceur (optionnel, tout peut être dans notre UI)
- La plateforme garde le contrôle total via l'API
- Transferts et payouts gérés par Stripe
- Conforme réglementation EU/FR

### Onboarding annonceur (une seule fois)

1. L'annonceur clique "Configurer mes paiements" dans son dashboard
2. On crée un Connected Account via l'API Stripe
3. Stripe génère un lien d'onboarding (page hébergée Stripe, personnalisable avec nos couleurs)
4. L'annonceur renseigne : identité, IBAN, infos légales
5. Stripe vérifie (KYC) et active le compte
6. Retour sur Animigo → compte prêt à recevoir des paiements

**L'annonceur ne crée jamais de compte Stripe lui-même.** Tout est transparent.

### Après l'onboarding

Tout est géré dans notre UI :
- Voir ses gains → `/dashboard/paiements`
- Historique des versements → notre page via API Stripe
- Prochain virement → notre page via API Stripe
- Statut du compte → notre page via API Stripe

L'annonceur n'a **jamais besoin** d'aller sur Stripe.

---

## Flux de paiement

```
1. Client réserve une mission
   → Débit immédiat (PaymentIntent, capture directe)
   → L'argent arrive sur le compte plateforme Animigo

2. Mission en cours
   → L'argent reste sur le compte Animigo
   → En cas de litige/annulation, on peut rembourser facilement

3. Mission terminée (status: completed)
   → L'argent reste chez Animigo jusqu'au cycle de paiement

4. Cycle de paiement mensuel (le 25 de chaque mois)
   → Toutes les missions terminées AVANT le 20 du mois
   → Transfer groupé vers le compte Connect de l'annonceur
   → Montant = somme des missions - commission annonceur (3%)
   → Mission terminée après le 20 = reportée au 25 du mois suivant

5. Payout automatique
   → Stripe verse l'annonceur sur son IBAN (J+2 à J+7 après le transfert)
   → Aucune action requise
```

### Pourquoi débit immédiat (pas d'empreinte) ?

- Pas de souci d'expiration d'autorisation (7 jours max sinon)
- Fonctionne pour toute durée de mission (1 jour ou 3 semaines)
- Le client est débité une seule fois, c'est clair
- On garde l'argent = sécurité en cas de litige

### Règle de versement mensuel

| Règle | Détail |
|-------|--------|
| Date de virement | **Le 25 de chaque mois** |
| Éligibilité | Mission terminée **avant le 20** du mois en cours |
| Cutoff | Mission terminée **le 20 ou après** → reportée au 25 du mois suivant |
| Délai max | 35 jours (mission terminée le 21) |
| Délai min | 5 jours (mission terminée le 20 du mois précédent) |
| Regroupement | Un seul transfert par annonceur (somme de toutes ses missions éligibles) |

**Avantages** :
- Trésorerie : l'argent reste chez Animigo jusqu'au 25
- Litiges : temps large pour gérer les réclamations avant versement
- Comptabilité : un seul batch mensuel, simple à auditer
- Technique : un CRON job le 25, pas de logique temps réel

---

## Calcul des frais

### Frais Stripe (France, cartes EU)

| Opération | Coût |
|-----------|------|
| Paiement carte EU | 1.5% + 0.25€ |
| Paiement carte UK | 2.5% + 0.25€ |
| Paiement carte hors EU | 2.9% + 0.25€ |
| Transfert vers compte Connect | Gratuit |
| Virement IBAN annonceur (payout) | Gratuit |

### Notre structure de frais

| Frais | Taux | Payé par | Justification affichée |
|-------|------|----------|----------------------|
| Frais de service | **15%** | Client | "Frais de service Animigo" |
| Frais de virement | **3%** | Annonceur | "Frais de traitement et virement" |
| **Total brut plateforme** | **18%** | — | Avant frais Stripe |

### Exemples détaillés

#### Mission à 50€

```
Prix du service (fixé par l'annonceur)  :  50.00€

CLIENT
  Prix service                          :  50.00€
  + Frais de service (15%)              :   7.50€
  = Total payé                          :  57.50€

STRIPE
  Prélèvement (1.5% × 57.50 + 0.25)    :   1.11€

ANNONCEUR
  Prix service                          :  50.00€
  - Frais de virement (3%)              :   1.50€
  = Reçoit sur son compte               :  48.50€

ANIMIGO
  Frais client                          :   7.50€
  + Frais annonceur                     :   1.50€
  - Frais Stripe                        :   1.11€
  = Bénéfice net                        :   7.89€  → 15.8% net
```

#### Mission à 100€

```
CLIENT
  100 + 15€ (15%)                       : 115.00€

STRIPE
  1.5% × 115 + 0.25                    :   1.98€

ANNONCEUR
  100 - 3€ (3%)                         :  97.00€

ANIMIGO
  15 + 3 - 1.98                         :  16.02€  → 16.0% net
```

#### Mission à 20€

```
CLIENT
  20 + 3€ (15%)                         :  23.00€

STRIPE
  1.5% × 23 + 0.25                     :   0.60€

ANNONCEUR
  20 - 0.60€ (3%)                       :  19.40€

ANIMIGO
  3 + 0.60 - 0.60                       :   3.00€  → 15.0% net
```

#### Mission à 10€

```
CLIENT
  10 + 1.50€ (15%)                      :  11.50€

STRIPE
  1.5% × 11.50 + 0.25                  :   0.42€

ANNONCEUR
  10 - 0.30€ (3%)                       :   9.70€

ANIMIGO
  1.50 + 0.30 - 0.42                    :   1.38€  → 13.8% net ⚠️
```

### Seuil de rentabilité à 15%

| Prix mission | % net Animigo | Rentable ? |
|-------------|--------------|------------|
| 10€ | 13.8% | Non |
| 15€ | 14.5% | Non |
| **20€** | **15.0%** | **Seuil** |
| 30€ | 15.4% | Oui |
| 50€ | 15.8% | Oui |
| 100€ | 16.0% | Oui |
| 200€ | 16.1% | Oui |

> **Recommandation** : C'est pas grave pour la rentabilité des petites missions, de toute manière il y en aura très peu. 

### Formule générale

```
P = prix du service (fixé par l'annonceur)

Client paye      = P × 1.15
Stripe prélève   = P × 1.15 × 0.015 + 0.25
Annonceur reçoit = P × 0.97
Animigo net      = P × 0.18 - (P × 1.15 × 0.015 + 0.25)
                 = P × 16.275% - 0.25€
```

---

## Schéma base de données (tables à ajouter/modifier)

### Table : `stripeAccounts`

Stocke le compte Connect de chaque annonceur.

| Champ | Type | Description |
|-------|------|-------------|
| userId | `id("users")` | Référence vers l'annonceur |
| stripeAccountId | `string` | ID du compte Connect (`acct_xxx`) |
| onboardingComplete | `boolean` | KYC terminé et validé |
| chargesEnabled | `boolean` | Peut recevoir des paiements |
| payoutsEnabled | `boolean` | Peut recevoir des virements IBAN |
| createdAt | `number` | Date de création |
| updatedAt | `number` | Dernière mise à jour |

Index : `by_user` (userId), `by_stripe_account` (stripeAccountId)

### Table : `payments`

Chaque paiement d'un client pour une mission.

| Champ | Type | Description |
|-------|------|-------------|
| missionId | `id("missions")` | Référence vers la mission |
| clientId | `id("users")` | Client qui paye |
| announcerId | `id("users")` | Annonceur qui reçoit |
| servicePrice | `number` | Prix du service en centimes (ex: 5000 = 50€) |
| serviceFee | `number` | Frais de service client en centimes (15%) |
| totalCharged | `number` | Total débité au client en centimes |
| stripeFee | `number` | Frais Stripe estimés en centimes |
| transferFee | `number` | Frais de virement annonceur en centimes (3%) |
| announcerPayout | `number` | Montant versé à l'annonceur en centimes |
| platformRevenue | `number` | Bénéfice net plateforme en centimes |
| stripePaymentIntentId | `string` | ID PaymentIntent (`pi_xxx`) |
| stripeTransferId | `string` ou `null` | ID Transfer (`tr_xxx`), null si pas encore transféré |
| payoutBatchId | `id("payoutBatches")` ou `null` | Batch de virement mensuel associé |
| status | `string` | `pending` / `paid` / `transferred` / `refunded` / `failed` |
| paidAt | `number` ou `null` | Date du paiement client |
| transferredAt | `number` ou `null` | Date du transfert à l'annonceur |
| createdAt | `number` | Date de création |

Index : `by_mission`, `by_client`, `by_announcer`, `by_status`, `by_payment_intent`, `by_payout_batch`

### Table : `payoutBatches`

Chaque batch mensuel de virement (exécuté le 25 de chaque mois).

| Champ | Type | Description |
|-------|------|-------------|
| announcerId | `id("users")` | Annonceur concerné |
| month | `string` | Mois du batch (`2026-01`) |
| totalGross | `number` | Total brut des missions en centimes |
| totalTransferFee | `number` | Total frais de virement (3%) en centimes |
| totalNet | `number` | Montant net transféré en centimes |
| missionsCount | `number` | Nombre de missions incluses |
| stripeTransferId | `string` ou `null` | ID Transfer Stripe (`tr_xxx`) |
| status | `string` | `pending` / `processing` / `transferred` / `failed` |
| scheduledAt | `number` | Date prévue (le 25 du mois) |
| executedAt | `number` ou `null` | Date d'exécution réelle |
| createdAt | `number` | Date de création |

Index : `by_announcer`, `by_month`, `by_status`, `by_announcer_month`

### Table : `payouts` (optionnel, pour historique)

Historique des virements IBAN vers les annonceurs (sync depuis Stripe webhooks).

| Champ | Type | Description |
|-------|------|-------------|
| announcerId | `id("users")` | Annonceur concerné |
| stripePayoutId | `string` | ID Payout Stripe (`po_xxx`) |
| amount | `number` | Montant en centimes |
| status | `string` | `pending` / `in_transit` / `paid` / `failed` |
| arrivedAt | `number` ou `null` | Date d'arrivée sur le compte bancaire |
| createdAt | `number` | Date de création |

Index : `by_announcer`, `by_status`

### Modifications table existante : `missions`

Ajouter les champs :

| Champ | Type | Description |
|-------|------|-------------|
| paymentStatus | `string` | `unpaid` / `paid` / `transferred` / `refunded` |
| paymentId | `id("payments")` ou `null` | Référence vers le paiement |

---

## Workflow complet mission + paiement

```
1. RÉSERVATION
   Client sélectionne un service → choisit date/heure → valide
   → Création mission (status: pending_acceptance)
   → Pas encore de paiement

2. ACCEPTATION ANNONCEUR
   Annonceur accepte la mission (status: pending_confirmation)
   → Le client est invité à payer

3. PAIEMENT CLIENT
   Client paye (PaymentIntent capture immédiate)
   → Mission (status: upcoming, paymentStatus: paid)
   → Payment créé (status: paid)
   → Argent sur le compte Animigo

4. MISSION EN COURS
   → status: in_progress
   → L'argent reste chez Animigo

5. MISSION TERMINÉE
   → status: completed
   → paymentStatus reste "paid"
   → L'argent reste chez Animigo en attente du cycle

6. CYCLE DE PAIEMENT (le 25 de chaque mois)
   → CRON job le 25 : récupère toutes les missions completed avant le 20
   → Regroupe par annonceur
   → Crée un Transfer par annonceur (somme missions - 3% par mission)
   → Payment de chaque mission → status: transferred
   → Mission terminée après le 20 → reportée au 25 du mois suivant

   Exemples :
   - Mission terminée le 5 janvier  → transfert le 25 janvier ✓
   - Mission terminée le 19 janvier → transfert le 25 janvier ✓
   - Mission terminée le 21 janvier → transfert le 25 février (mois suivant)
   - Mission terminée le 20 janvier → transfert le 25 février (mois suivant)

7. VIREMENT IBAN
   → Stripe verse automatiquement sur l'IBAN (J+2 à J+7 après le transfert du 25)
   → L'annonceur reçoit sur son compte bancaire entre le 27 et le 1er du mois suivant
   → Payout sync via webhook

8. CAS ANNULATION / LITIGE
   → Si avant mission : remboursement total client
   → Si pendant mission : remboursement partiel possible
   → L'argent est toujours chez nous jusqu'au 25 = contrôle total
```

---

## Ce que voit l'utilisateur

### Client (page de paiement)

```
Garde de chien - 3 jours
Prix du service             50.00€
Frais de service (15%)       7.50€
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total                       57.50€
```

### Annonceur (dashboard paiements)

```
Prochain virement : 25 janvier 2026
Missions incluses : 3

Mission #1234 - Garde de chien        48.50€
Mission #1267 - Promenade             19.40€
Mission #1289 - Toilettage            29.10€
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total virement                        97.00€

Détail par mission :
  Revenu brut                 50.00€
  Frais de virement (3%)      -1.50€
  = Revenu net                48.50€
```

---

## Webhooks Stripe à écouter

| Événement | Action |
|-----------|--------|
| `payment_intent.succeeded` | Marquer payment comme `paid`, mission comme `upcoming` |
| `payment_intent.payment_failed` | Marquer payment comme `failed`, notifier client |
| `transfer.created` | Marquer payment comme `transferred` |
| `payout.paid` | Mettre à jour le payout dans notre BDD |
| `payout.failed` | Alerter annonceur + admin |
| `account.updated` | Mettre à jour statut compte Connect (onboarding, chargesEnabled...) |
| `charge.refunded` | Marquer payment comme `refunded`, gérer la mission |
