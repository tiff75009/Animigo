"use client";

interface PriceDisplayProps {
  /** Prix en centimes (TTC si assujetti TVA, prix unique sinon) */
  priceInCents: number;
  /** L'annonceur est-il assujetti à la TVA */
  isVatSubject: boolean;
  /** Taux de TVA en % (défaut: 20) */
  vatRate?: number;
  /** Afficher le détail HT/TVA */
  showDetails?: boolean;
  /** Unité de prix à afficher après le montant (ex: "/h", "/jour") */
  unitLabel?: string;
  /** Taille d'affichage */
  size?: "sm" | "md" | "lg";
  /** Classes CSS additionnelles */
  className?: string;
}

function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",") + " €";
}

export default function PriceDisplay({
  priceInCents,
  isVatSubject,
  vatRate = 20,
  showDetails = true,
  unitLabel = "",
  size = "md",
  className = "",
}: PriceDisplayProps) {
  const priceTTC = priceInCents;
  const priceHT = Math.round(priceTTC / (1 + vatRate / 100));
  const tvaAmount = priceTTC - priceHT;

  const sizeClasses = {
    sm: { main: "text-sm", sub: "text-[10px]" },
    md: { main: "text-base", sub: "text-xs" },
    lg: { main: "text-lg", sub: "text-xs" },
  };

  const s = sizeClasses[size];

  if (isVatSubject) {
    return (
      <div className={className}>
        <span className={`font-bold text-foreground ${s.main}`}>
          {formatPrice(priceTTC)}
          {unitLabel && <span className="font-normal text-text-light">{unitLabel}</span>}
          <span className={`font-normal text-text-light ml-1 ${s.sub}`}>TTC</span>
        </span>
        {showDetails && (
          <p className={`text-text-light ${s.sub}`}>
            {formatPrice(priceHT)} HT
            {" + "}
            {formatPrice(tvaAmount)} TVA ({vatRate}%)
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      <span className={`font-bold text-foreground ${s.main}`}>
        {formatPrice(priceTTC)}
        {unitLabel && <span className="font-normal text-text-light">{unitLabel}</span>}
      </span>
      {showDetails && (
        <p className={`text-text-light italic ${s.sub}`}>
          TVA non applicable, art. 293B du CGI
        </p>
      )}
    </div>
  );
}
