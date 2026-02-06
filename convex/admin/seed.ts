import { mutation } from "../_generated/server";
import { hashPassword, generateUniqueSlug } from "../auth/utils";

// À exécuter UNE SEULE FOIS pour créer l'admin par défaut
export const createDefaultAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    // Vérifier si admin existe déjà
    const existingAdmin = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", "admin@admin.com"))
      .first();

    if (existingAdmin) {
      // Mettre à jour le rôle si nécessaire
      if (existingAdmin.role !== "admin") {
        await ctx.db.patch(existingAdmin._id, { role: "admin" });
        return { success: true, message: "Admin role updated" };
      }
      return { success: false, message: "Admin already exists" };
    }

    const now = Date.now();
    const passwordHash = await hashPassword("password");
    const slug = await generateUniqueSlug(ctx.db, "Admin");

    await ctx.db.insert("users", {
      email: "admin@admin.com",
      passwordHash,
      slug,
      accountType: "utilisateur",
      firstName: "Admin",
      lastName: "Animigo",
      phone: "0600000000",
      role: "admin",
      cguAcceptedAt: now,
      createdAt: now,
      updatedAt: now,
      emailVerified: true,
      isActive: true,
    });

    return { success: true, message: "Default admin created: admin@admin.com / password" };
  },
});

// Seed FAQ : catégories + articles
export const seedFaqData = mutation({
  args: {},
  handler: async (ctx) => {
    // Supprimer les données FAQ existantes
    const existingArticles = await ctx.db.query("faqArticles").collect();
    for (const article of existingArticles) {
      await ctx.db.delete(article._id);
    }
    const existingCategories = await ctx.db.query("faqCategories").collect();
    for (const cat of existingCategories) {
      await ctx.db.delete(cat._id);
    }

    const now = Date.now();

    type CategoryDef = {
      name: string;
      slug: string;
      icon: string;
      targetAudience: "all" | "client" | "annonceur";
      articles: { title: string; slug: string; content: string }[];
    };

    const categories: CategoryDef[] = [
      // ── TOUS ──
      {
        name: "Premiers pas",
        slug: "premiers-pas",
        icon: "Rocket",
        targetAudience: "all",
        articles: [
          {
            title: "Comment créer un compte sur Animigo ?",
            slug: "creer-un-compte",
            content: `Pour créer un compte sur Animigo :\n\n1. Cliquez sur **"S'inscrire"** en haut à droite\n2. Choisissez votre type de compte :\n   - **Propriétaire** : vous cherchez un garde pour votre animal\n   - **Pet-sitter** : vous proposez vos services\n3. Remplissez le formulaire avec vos informations\n4. Confirmez votre adresse email via le lien reçu\n5. Complétez votre profil\n\nVotre compte est prêt !`,
          },
          {
            title: "Comment modifier mes informations personnelles ?",
            slug: "modifier-informations",
            content: `Rendez-vous dans votre **espace personnel** :\n\n1. Cliquez sur votre avatar en haut à droite\n2. Accédez à **"Mon profil"**\n3. Modifiez les champs souhaités (nom, email, téléphone, adresse...)\n4. Cliquez sur **"Enregistrer"**\n\nCertaines modifications (email) nécessitent une re-vérification.`,
          },
          {
            title: "Comment fonctionne la vérification d'identité ?",
            slug: "verification-identite",
            content: `La vérification d'identité renforce la confiance entre les membres :\n\n1. Accédez à votre profil → **"Vérifier mon identité"**\n2. Envoyez une **photo de votre pièce d'identité** (recto/verso)\n3. Prenez un **selfie** pour confirmer que c'est bien vous\n4. Notre système vérifie automatiquement vos documents\n5. Vous obtenez le **badge "Vérifié"** sur votre profil\n\nLa vérification prend généralement **quelques minutes**. Vos documents sont traités de manière confidentielle conformément au RGPD.`,
          },
          {
            title: "Comment contacter le support Animigo ?",
            slug: "contacter-support",
            content: `Plusieurs moyens de nous contacter :\n\n- **Tickets de support** : depuis votre espace personnel → "Aide"\n- **Email** : contact@animigo.fr\n- **FAQ** : consultez les réponses aux questions fréquentes\n\nNotre équipe répond sous **24h ouvrées**.`,
          },
        ],
      },
      {
        name: "Paiements & Facturation",
        slug: "paiements-facturation",
        icon: "CreditCard",
        targetAudience: "all",
        articles: [
          {
            title: "Quels sont les moyens de paiement acceptés ?",
            slug: "moyens-de-paiement",
            content: `Animigo accepte les paiements par **carte bancaire** (Visa, Mastercard, CB) via notre partenaire sécurisé **Stripe**.\n\nLe paiement s'effectue en ligne au moment de la confirmation de la réservation. Aucun espèce n'est échangé entre le client et le prestataire.\n\nVos informations bancaires sont **chiffrées** et ne sont jamais stockées sur nos serveurs.`,
          },
          {
            title: "Comment fonctionne la facturation ?",
            slug: "fonctionnement-facturation",
            content: `Voici le processus de facturation :\n\n1. **Lors de la réservation** : le montant total est encaissé (prix du service + frais de service)\n2. **Après la prestation** : vous confirmez la fin du service\n3. **Le 25 du mois** : l'annonceur reçoit son versement\n\nVous recevez un **email de confirmation** à chaque étape. Un récapitulatif fiscal annuel est disponible dans votre espace.`,
          },
          {
            title: "Comment obtenir un remboursement ?",
            slug: "obtenir-remboursement",
            content: `Le remboursement dépend de la **politique d'annulation** :\n\n- **1ère annulation** : remboursement intégral\n- **2ème annulation** : remboursement partiel (selon le % configuré par l'annonceur)\n- **3ème annulation et +** : non remboursable\n\n**Conditions** :\n- Annulation **plus de 48h avant** la prestation : conditions normales\n- Annulation **moins de 48h avant** : selon la politique de l'annonceur\n- **Période de grâce** : 24h après la réservation, annulation toujours gratuite\n\nLe remboursement est crédité sous **5 à 10 jours ouvrés** sur votre carte.`,
          },
        ],
      },
      {
        name: "Sécurité & Confiance",
        slug: "securite-confiance",
        icon: "ShieldCheck",
        targetAudience: "all",
        articles: [
          {
            title: "Comment Animigo garantit la sécurité des animaux ?",
            slug: "securite-animaux",
            content: `Animigo met en place plusieurs mesures :\n\n- **Vérification d'identité** obligatoire pour les annonceurs\n- **Système d'avis** après chaque prestation\n- **Modération** de tous les profils et services avant publication\n- **Assurance responsabilité civile** recommandée pour les prestataires pros\n- **Système de réclamation** avec médiation en cas de litige\n- **Paiement sécurisé** avec blocage possible en cas de problème\n\nNous vérifions également les numéros SIRET des professionnels via l'API INSEE.`,
          },
          {
            title: "Comment signaler un comportement inapproprié ?",
            slug: "signaler-comportement",
            content: `Si vous constatez un problème :\n\n1. **Pendant la prestation** : contactez-nous immédiatement via le support\n2. **Après la prestation** : ouvrez une **réclamation** depuis votre réservation\n3. **Sur un profil** : utilisez le bouton **"Signaler"** sur la page de l'annonceur\n\nChaque signalement est examiné par notre équipe. Les comportements graves entraînent une **suspension immédiate** du compte.`,
          },
          {
            title: "Comment fonctionnent les avis ?",
            slug: "fonctionnement-avis",
            content: `Après chaque prestation terminée, le client peut noter l'annonceur sur 3 critères :\n\n- **Qualité du service** (1 à 5 étoiles)\n- **Communication** (1 à 5 étoiles)\n- **Recommandation** (1 à 5 étoiles)\n\nUn **commentaire** optionnel peut être ajouté. L'annonceur peut **répondre** à chaque avis.\n\nLes avis sont publics et ne peuvent pas être supprimés (sauf contenu abusif signalé à la modération).`,
          },
        ],
      },
      {
        name: "Annulations",
        slug: "annulations",
        icon: "Ban",
        targetAudience: "all",
        articles: [
          {
            title: "Quelle est la politique d'annulation ?",
            slug: "politique-annulation",
            content: `Animigo applique une politique d'annulation progressive :\n\n| Situation | Remboursement |\n|---|---|\n| 1ère annulation | 100% remboursé |\n| 2ème annulation (dans la période) | Partiel (selon l'annonceur) |\n| 3ème annulation et + | Non remboursable |\n\n**Règles temporelles** :\n- **Période de grâce** : 24h après la réservation = annulation gratuite\n- **Plus de 48h avant** la prestation : conditions normales\n- **Moins de 48h avant** : selon la politique de l'annonceur\n\nChaque annonceur peut personnaliser sa commission d'annulation dans ses paramètres.`,
          },
          {
            title: "Comment annuler une réservation ?",
            slug: "comment-annuler",
            content: `Pour annuler une réservation :\n\n1. Allez dans **"Mes réservations"**\n2. Cliquez sur la réservation concernée\n3. Cliquez sur **"Annuler la réservation"**\n4. Confirmez l'annulation\n\nLe montant du remboursement est affiché **avant** la confirmation. Vous recevrez un email de confirmation avec le détail du remboursement.`,
          },
          {
            title: "Que se passe-t-il si l'annonceur annule ?",
            slug: "annonceur-annule",
            content: `Si un annonceur annule votre réservation :\n\n- Vous êtes **remboursé intégralement** (100%)\n- Vous recevez une **notification** immédiatement\n- L'annulation est comptabilisée dans le profil de l'annonceur\n- Nous vous proposons des **alternatives** similaires\n\nLes annulations répétées par un annonceur peuvent entraîner une baisse de visibilité sur la plateforme.`,
          },
        ],
      },

      // ── CLIENTS ──
      {
        name: "Réserver un service",
        slug: "reserver-service",
        icon: "CalendarCheck",
        targetAudience: "client",
        articles: [
          {
            title: "Comment trouver un pet-sitter près de chez moi ?",
            slug: "trouver-pet-sitter",
            content: `Pour trouver un pet-sitter :\n\n1. Cliquez sur **"Trouver un service"** dans le menu\n2. Sélectionnez le **type de service** (garde, promenade, toilettage...)\n3. Indiquez votre **localisation**\n4. Utilisez les **filtres** pour affiner :\n   - Type d'annonceur (particulier, pro, micro-entrepreneur)\n   - Budget (fourchette de prix)\n   - Disponibilité\n   - Équipements (jardin, véhicule...)\n   - Profil vérifié\n5. Consultez les **avis** et **tarifs** de chaque annonceur\n\nLa carte interactive vous montre les annonceurs à proximité.`,
          },
          {
            title: "Comment réserver une prestation ?",
            slug: "comment-reserver",
            content: `Le processus de réservation en 4 étapes :\n\n**Étape 1 — Formule** : Choisissez la formule qui vous convient parmi celles proposées par l'annonceur\n\n**Étape 2 — Date & Heure** : Sélectionnez vos dates et horaires dans le calendrier (seules les disponibilités de l'annonceur sont affichées)\n\n**Étape 3 — Lieu & Options** : Indiquez l'adresse de la prestation et ajoutez des options si souhaité\n\n**Étape 4 — Récapitulatif** : Vérifiez le détail, acceptez la politique d'annulation et confirmez\n\nL'annonceur reçoit votre demande et dispose d'un délai pour **accepter ou refuser**. Le paiement n'est encaissé qu'à l'acceptation.`,
          },
          {
            title: "Puis-je réserver sans créer de compte ?",
            slug: "reserver-sans-compte",
            content: `Oui, Animigo propose le **guest checkout** :\n\n1. Parcourez la plateforme librement\n2. Au moment de la réservation, remplissez vos informations\n3. Un compte sera **créé automatiquement** avec vos données\n4. Vous recevrez un email pour **définir votre mot de passe**\n\nNous recommandons toutefois de créer un compte pour profiter de toutes les fonctionnalités (historique, animaux enregistrés, messages...).`,
          },
          {
            title: "Comment suivre l'état de ma réservation ?",
            slug: "suivre-reservation",
            content: `Dans **"Mes réservations"**, chaque réservation affiche son statut :\n\n- **En attente** : l'annonceur n'a pas encore répondu\n- **Confirmée** : l'annonceur a accepté, paiement encaissé\n- **En cours** : la prestation est en cours\n- **Terminée** : la prestation est finie, en attente de confirmation\n- **Annulée** : la réservation a été annulée\n\nVous recevez une **notification** à chaque changement de statut.`,
          },
        ],
      },
      {
        name: "Mon animal",
        slug: "mon-animal",
        icon: "PawPrint",
        targetAudience: "client",
        articles: [
          {
            title: "Comment ajouter mon animal sur Animigo ?",
            slug: "ajouter-animal",
            content: `Pour ajouter votre animal :\n\n1. Rendez-vous dans votre **espace client**\n2. Accédez à la section **"Mes animaux"**\n3. Cliquez sur **"Ajouter un animal"**\n4. Remplissez sa fiche :\n   - **Type** (chien, chat, NAC...)\n   - **Race**\n   - **Nom, âge, poids**\n   - **Photo**\n   - **Besoins spécifiques** (régime alimentaire, médicaments, comportement...)\n5. Enregistrez\n\nVous pouvez ajouter **plusieurs animaux** sur votre compte. Lors d'une réservation, vous sélectionnerez l'animal concerné.`,
          },
          {
            title: "Pourquoi renseigner les besoins spécifiques de mon animal ?",
            slug: "besoins-specifiques-animal",
            content: `Les informations sur votre animal sont essentielles :\n\n- **Alimentation** : le pet-sitter saura quoi donner à manger\n- **Médicaments** : traitements à administrer pendant la garde\n- **Comportement** : peurs, réactivité, habitudes\n- **Santé** : allergies, problèmes de santé à surveiller\n\nPlus votre fiche est complète, **mieux votre animal sera pris en charge**. L'annonceur consulte ces informations avant d'accepter la réservation.`,
          },
        ],
      },
      {
        name: "Suivi de prestation",
        slug: "suivi-prestation",
        icon: "Eye",
        targetAudience: "client",
        articles: [
          {
            title: "Comment confirmer la fin d'une prestation ?",
            slug: "confirmer-fin-prestation",
            content: `Après la prestation :\n\n1. Un bandeau apparaît sur votre réservation : **"Confirmer la fin du service"**\n2. Cliquez pour valider que tout s'est bien passé\n3. Vous pourrez ensuite **noter l'annonceur** (qualité, communication, recommandation)\n\n**Important** : si vous ne confirmez pas, la prestation est **automatiquement validée après 48h** et le paiement est libéré à l'annonceur.\n\nSi un problème est survenu, ouvrez une **réclamation** avant de confirmer.`,
          },
          {
            title: "Comment ouvrir une réclamation ?",
            slug: "ouvrir-reclamation",
            content: `En cas de problème avec une prestation :\n\n1. Allez sur la page de votre réservation\n2. Cliquez sur **"Signaler un problème"**\n3. Sélectionnez un **motif** parmi la liste proposée\n4. Décrivez la situation en détail\n5. Validez\n\nSelon le motif, le **paiement à l'annonceur peut être suspendu** le temps de l'investigation. Notre équipe examine chaque réclamation et prend contact avec les deux parties pour trouver une solution.`,
          },
        ],
      },

      // ── ANNONCEURS ──
      {
        name: "Créer mes services",
        slug: "creer-services",
        icon: "Briefcase",
        targetAudience: "annonceur",
        articles: [
          {
            title: "Comment créer un service sur Animigo ?",
            slug: "creer-un-service",
            content: `Pour créer un service :\n\n1. Rendez-vous dans votre **Dashboard** → **"Services"**\n2. Cliquez sur **"Ajouter un service"**\n3. Suivez l'assistant en **4 étapes** :\n   - **Prestation** : choisissez la catégorie (garde, promenade, toilettage...)\n   - **Animaux acceptés** : sélectionnez les types d'animaux\n   - **Formules** : définissez vos tarifs, durées et avantages\n   - **Options** : ajoutez des suppléments optionnels\n4. Votre service passe en **modération** avant publication\n\nVous pouvez créer **plusieurs services** avec différentes formules.`,
          },
          {
            title: "Comment définir mes tarifs ?",
            slug: "definir-tarifs",
            content: `Pour chaque formule de service, vous définissez :\n\n- **Prix horaire** ou **prix journalier** (selon le type de service)\n- **Durée** de la prestation\n- **Nombre de séances** (pour les forfaits)\n- **Options payantes** (supplément transport, nourriture premium...)\n\n**Bon à savoir** :\n- Vous percevez **100% de votre tarif**\n- Les frais de service sont payés par le client en supplément\n- La commission varie selon votre statut : particulier (15%), micro-entrepreneur (12%), professionnel (10%)\n- Le tarif horaire est plafonné au tarif journalier (le client ne paie jamais plus pour moins d'heures)`,
          },
          {
            title: "Comment ajouter des photos à mes services ?",
            slug: "ajouter-photos-services",
            content: `Les photos sont essentielles pour attirer les clients :\n\n1. Allez dans **Dashboard** → **Services** → onglet **"Photos"**\n2. Ajoutez vos photos (formats acceptés : JPG, PNG, WebP)\n3. La **première photo** sera votre photo de couverture\n\n**Conseils** :\n- Montrez-vous avec des animaux\n- Photographiez vos installations (jardin, espace de garde...)\n- Privilégiez la lumière naturelle\n- Minimum 3 photos recommandé`,
          },
        ],
      },
      {
        name: "Gérer mes réservations",
        slug: "gerer-reservations",
        icon: "Calendar",
        targetAudience: "annonceur",
        articles: [
          {
            title: "Comment accepter ou refuser une réservation ?",
            slug: "accepter-refuser-reservation",
            content: `Lorsqu'un client vous envoie une demande :\n\n1. Vous recevez une **notification** et un **email**\n2. Rendez-vous dans **Dashboard** → **"Missions"**\n3. Consultez les détails : client, animal, dates, lieu, prix\n4. Cliquez sur **"Accepter"** ou **"Refuser"**\n\n**Attention** : vous avez un **délai limité** pour répondre (configuré par l'admin). Passé ce délai, la demande est automatiquement refusée et le client est remboursé.`,
          },
          {
            title: "Comment gérer mes disponibilités ?",
            slug: "gerer-disponibilites",
            content: `Votre calendrier de disponibilités est accessible dans **Dashboard** → **"Planning"** :\n\n- **Vue jour / semaine / mois / année**\n- Cliquez sur un créneau pour vous rendre **disponible** ou **indisponible**\n- Chaque **type de service** a ses propres disponibilités (vous pouvez être disponible pour "Garde" mais pas "Promenade" le même jour)\n- Utilisez la **duplication de semaine type** pour gagner du temps\n\n**Par défaut**, vous êtes **indisponible**. Pensez à mettre à jour régulièrement votre planning.`,
          },
          {
            title: "Quel est le délai pour répondre à une demande ?",
            slug: "delai-reponse-demande",
            content: `Le délai de réponse est configuré par la plateforme :\n\n- Vous recevez une **notification** dès qu'une demande arrive\n- Un **compte à rebours** est affiché sur la demande\n- Si vous ne répondez pas à temps, la demande est **automatiquement refusée**\n- Le client est intégralement **remboursé**\n\n**Conseil** : activez les notifications pour ne manquer aucune demande. Un taux de réponse élevé améliore votre visibilité sur la plateforme.`,
          },
        ],
      },
      {
        name: "Mes revenus",
        slug: "mes-revenus",
        icon: "Wallet",
        targetAudience: "annonceur",
        articles: [
          {
            title: "Comment sont calculées les commissions ?",
            slug: "calcul-commissions",
            content: `La commission Animigo dépend de votre **statut** :\n\n| Statut | Commission |\n|---|---|\n| Particulier | 15% |\n| Micro-entrepreneur | 12% |\n| Professionnel (SIRET) | 10% |\n\n**Important** : la commission est payée **par le client** en plus de votre tarif. Vous percevez **100% du prix que vous avez fixé**.\n\nExemple : vous fixez 20€/heure → le client paie 23€ (20€ + 15% commission) → vous recevez 20€.`,
          },
          {
            title: "Quand est-ce que je reçois mes paiements ?",
            slug: "quand-paiement",
            content: `Les versements fonctionnent ainsi :\n\n1. Le client paie à la **confirmation de la réservation**\n2. Le montant est **conservé** jusqu'à la fin de la prestation\n3. Le client **confirme** la fin du service (ou auto-confirmation après 48h)\n4. Votre paiement est **libéré**\n5. Le virement est effectué le **25 du mois**\n\n**Conditions** :\n- Un **seuil minimum** peut être requis pour déclencher le virement\n- En cas de **réclamation**, le paiement peut être suspendu temporairement`,
          },
          {
            title: "Où trouver mon récapitulatif fiscal ?",
            slug: "recapitulatif-fiscal",
            content: `Pour votre déclaration de revenus :\n\n1. Allez dans **Dashboard** → **"Fiscalité"**\n2. Sélectionnez l'**année fiscale**\n3. Consultez le récapitulatif : revenus bruts, commissions, net perçu\n4. Téléchargez le **PDF** pour votre comptable ou votre déclaration\n\nLe récapitulatif est disponible dès le **1er janvier** pour l'année précédente.`,
          },
        ],
      },
      {
        name: "Développer mon activité",
        slug: "developper-activite",
        icon: "TrendingUp",
        targetAudience: "annonceur",
        articles: [
          {
            title: "Comment améliorer ma visibilité sur Animigo ?",
            slug: "ameliorer-visibilite",
            content: `Pour apparaître en haut des résultats de recherche :\n\n- **Complétez votre profil** à 100% (photo, bio, diplômes...)\n- **Faites vérifier votre identité** (badge vérifié)\n- **Ajoutez plusieurs photos** de qualité\n- **Répondez rapidement** aux demandes de réservation\n- **Collectez des avis positifs** après chaque prestation\n- **Mettez à jour vos disponibilités** régulièrement\n- **Proposez des tarifs compétitifs** pour démarrer\n\nUn profil complet avec de bons avis et des disponibilités à jour sera **naturellement mieux classé**.`,
          },
          {
            title: "Comment répondre aux avis de mes clients ?",
            slug: "repondre-avis",
            content: `Répondre aux avis montre votre professionnalisme :\n\n1. Allez dans **Dashboard** → **"Avis"**\n2. Les avis en attente de réponse sont mis en avant\n3. Cliquez sur **"Répondre"** sous l'avis\n4. Rédigez votre réponse (visible publiquement)\n\n**Conseils** :\n- Remerciez toujours pour les avis positifs\n- Pour les avis négatifs, restez courtois et professionnel\n- Proposez une solution si un problème est soulevé\n- Répondez dans les **48h** pour montrer votre réactivité`,
          },
          {
            title: "Quels sont les avantages du statut professionnel ?",
            slug: "avantages-statut-pro",
            content: `Le statut professionnel (avec SIRET vérifié) offre :\n\n- **Commission réduite** : 10% au lieu de 15%\n- **Badge "Pro"** sur votre profil\n- **Priorité** dans les résultats de recherche\n- **Confiance accrue** des clients\n- **Facturation simplifiée** avec récapitulatif fiscal détaillé\n\nPour passer en statut pro, renseignez votre **numéro SIRET** dans votre profil. Il est vérifié automatiquement via l'API INSEE.`,
          },
        ],
      },
    ];

    let categoryCount = 0;
    let articleCount = 0;

    for (let i = 0; i < categories.length; i++) {
      const cat = categories[i];
      const categoryId = await ctx.db.insert("faqCategories", {
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        order: i,
        isActive: true,
        targetAudience: cat.targetAudience,
        createdAt: now,
        updatedAt: now,
      });
      categoryCount++;

      for (let j = 0; j < cat.articles.length; j++) {
        const article = cat.articles[j];
        await ctx.db.insert("faqArticles", {
          categoryId,
          title: article.title,
          content: article.content,
          slug: article.slug,
          order: j,
          isActive: true,
          viewCount: 0,
          helpfulCount: 0,
          notHelpfulCount: 0,
          targetAudience: cat.targetAudience,
          createdAt: now,
          updatedAt: now,
        });
        articleCount++;
      }
    }

    return {
      success: true,
      message: `FAQ initialisée : ${categoryCount} catégories et ${articleCount} articles créés.`,
    };
  },
});
