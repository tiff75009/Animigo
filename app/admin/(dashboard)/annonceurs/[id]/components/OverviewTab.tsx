"use client";

import {
  User,
  Mail,
  Phone,
  MapPin,
  Building2,
  Home,
  Trees,
  Car,
  Dog,
  Cat,
  BadgeCheck,
  CreditCard,
  Calendar,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";

interface OverviewTabProps {
  user: {
    _id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    accountType: string;
    companyName?: string;
    siret?: string;
    slug?: string;
    isActive: boolean;
    emailVerified: boolean;
    stripeAccountId?: string;
    stripeChargesEnabled?: boolean;
    stripePayoutsEnabled?: boolean;
    stripeDetailsSubmitted?: boolean;
    createdAt: number;
  };
  profile: {
    profileImageUrl?: string;
    coverImageUrl?: string;
    bio?: string;
    description?: string;
    experience?: string;
    location?: string;
    city?: string;
    postalCode?: string;
    department?: string;
    coordinates?: { lat: number; lng: number };
    acceptedAnimals?: string[];
    housingType?: string;
    hasGarden?: boolean;
    ownedAnimals?: Array<{
      name: string;
      type: string;
      breed?: string;
    }>;
    isIdentityVerified?: boolean;
    identityVerifiedAt?: number;
  } | null;
  verification: {
    status: string;
    submittedAt?: number;
    reviewedAt?: number;
    rejectionReason?: string;
    aiVerificationResult?: {
      codeMatch: boolean;
      faceMatch: boolean;
      autoApproved: boolean;
    };
  } | null;
  stripeAccount: {
    id: string;
    chargesEnabled?: boolean;
    payoutsEnabled?: boolean;
    detailsSubmitted?: boolean;
  } | null;
}

export function OverviewTab({ user, profile, verification, stripeAccount }: OverviewTabProps) {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Informations personnelles */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-slate-400" />
          Informations personnelles
        </h3>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-slate-500">Nom complet</label>
            <p className="text-white">{user.firstName} {user.lastName}</p>
          </div>

          <div>
            <label className="text-sm text-slate-500">Email</label>
            <p className="text-white flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-400" />
              {user.email}
              {user.emailVerified && (
                <CheckCircle2 className="w-4 h-4 text-green-400" />
              )}
            </p>
          </div>

          <div>
            <label className="text-sm text-slate-500">Téléphone</label>
            <p className="text-white flex items-center gap-2">
              <Phone className="w-4 h-4 text-slate-400" />
              {user.phone}
            </p>
          </div>

          {user.companyName && (
            <div>
              <label className="text-sm text-slate-500">Entreprise</label>
              <p className="text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-400" />
                {user.companyName}
              </p>
            </div>
          )}

          {user.siret && (
            <div>
              <label className="text-sm text-slate-500">SIRET</label>
              <p className="text-white font-mono">{user.siret}</p>
            </div>
          )}

          <div>
            <label className="text-sm text-slate-500">Inscription</label>
            <p className="text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              {formatDate(user.createdAt)}
            </p>
          </div>
        </div>
      </div>

      {/* Profil / Bio */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-slate-400" />
          Profil
        </h3>

        <div className="space-y-4">
          {profile?.bio && (
            <div>
              <label className="text-sm text-slate-500">Bio</label>
              <p className="text-white">{profile.bio}</p>
            </div>
          )}

          {profile?.description && (
            <div>
              <label className="text-sm text-slate-500">Description</label>
              <p className="text-white text-sm">{profile.description}</p>
            </div>
          )}

          {profile?.experience && (
            <div>
              <label className="text-sm text-slate-500">Expérience</label>
              <p className="text-white">{profile.experience}</p>
            </div>
          )}

          {(profile?.location || profile?.city) && (
            <div>
              <label className="text-sm text-slate-500">Localisation</label>
              <p className="text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400" />
                {profile.location || `${profile.city} ${profile.postalCode || ""}`}
              </p>
            </div>
          )}

          {!profile?.bio && !profile?.description && (
            <p className="text-slate-500 italic">Profil non renseigné</p>
          )}
        </div>
      </div>

      {/* Conditions de garde */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Home className="w-5 h-5 text-slate-400" />
          Conditions de garde
        </h3>

        <div className="grid grid-cols-2 gap-4">
          {profile?.housingType && (
            <div className="p-3 bg-slate-800 rounded-lg">
              <p className="text-xs text-slate-500 mb-1">Logement</p>
              <p className="text-white capitalize">
                {profile.housingType === "house" ? "Maison" : "Appartement"}
              </p>
            </div>
          )}

          <div className="p-3 bg-slate-800 rounded-lg">
            <p className="text-xs text-slate-500 mb-1">Jardin</p>
            <p className="text-white flex items-center gap-2">
              {profile?.hasGarden ? (
                <>
                  <Trees className="w-4 h-4 text-green-400" />
                  Oui
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-slate-400" />
                  Non
                </>
              )}
            </p>
          </div>

          {profile?.acceptedAnimals && profile.acceptedAnimals.length > 0 && (
            <div className="col-span-2 p-3 bg-slate-800 rounded-lg">
              <p className="text-xs text-slate-500 mb-2">Animaux acceptés</p>
              <div className="flex flex-wrap gap-2">
                {profile.acceptedAnimals.map((animal) => (
                  <span
                    key={animal}
                    className="px-2 py-1 bg-slate-700 rounded text-sm text-white capitalize"
                  >
                    {animal}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Animaux de l'annonceur */}
        {profile?.ownedAnimals && profile.ownedAnimals.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-slate-500 mb-2">Animaux de l'annonceur</p>
            <div className="space-y-2">
              {profile.ownedAnimals.map((animal, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-2 bg-slate-800 rounded-lg"
                >
                  {animal.type === "chien" ? (
                    <Dog className="w-5 h-5 text-amber-400" />
                  ) : animal.type === "chat" ? (
                    <Cat className="w-5 h-5 text-purple-400" />
                  ) : (
                    <span className="text-lg">🐾</span>
                  )}
                  <div>
                    <p className="text-white text-sm font-medium">{animal.name}</p>
                    <p className="text-xs text-slate-400 capitalize">
                      {animal.type} {animal.breed && `- ${animal.breed}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Vérification */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <BadgeCheck className="w-5 h-5 text-slate-400" />
          Vérification d'identité
        </h3>

        {profile?.isIdentityVerified ? (
          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-400" />
              <div>
                <p className="text-green-400 font-medium">Identité vérifiée</p>
                {profile.identityVerifiedAt && (
                  <p className="text-sm text-green-400/70">
                    Vérifiée le {formatDate(profile.identityVerifiedAt)}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : verification ? (
          <div
            className={`p-4 rounded-lg border ${
              verification.status === "submitted"
                ? "bg-amber-500/10 border-amber-500/30"
                : verification.status === "rejected"
                ? "bg-red-500/10 border-red-500/30"
                : "bg-slate-800 border-slate-700"
            }`}
          >
            <div className="flex items-center gap-3">
              {verification.status === "submitted" ? (
                <Clock className="w-6 h-6 text-amber-400" />
              ) : verification.status === "rejected" ? (
                <XCircle className="w-6 h-6 text-red-400" />
              ) : (
                <Clock className="w-6 h-6 text-slate-400" />
              )}
              <div>
                <p
                  className={`font-medium ${
                    verification.status === "submitted"
                      ? "text-amber-400"
                      : verification.status === "rejected"
                      ? "text-red-400"
                      : "text-slate-400"
                  }`}
                >
                  {verification.status === "submitted"
                    ? "En attente de vérification"
                    : verification.status === "rejected"
                    ? "Vérification rejetée"
                    : "En cours de soumission"}
                </p>
                {verification.rejectionReason && (
                  <p className="text-sm text-red-400/70 mt-1">
                    {verification.rejectionReason}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-800 border border-slate-700 rounded-lg">
            <p className="text-slate-400">Aucune demande de vérification</p>
          </div>
        )}

        {/* Stripe */}
        <div className="mt-6">
          <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-slate-400" />
            Compte Stripe Connect
          </h4>

          {stripeAccount ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                <span className="text-slate-400 text-sm">ID du compte</span>
                <code className="text-xs text-white bg-slate-700 px-2 py-1 rounded">
                  {stripeAccount.id}
                </code>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                <span className="text-slate-400 text-sm">Peut recevoir des paiements</span>
                {stripeAccount.chargesEnabled ? (
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400" />
                )}
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                <span className="text-slate-400 text-sm">Peut recevoir des virements</span>
                {stripeAccount.payoutsEnabled ? (
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400" />
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-800 border border-slate-700 rounded-lg">
              <p className="text-slate-400">Compte Stripe non connecté</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
