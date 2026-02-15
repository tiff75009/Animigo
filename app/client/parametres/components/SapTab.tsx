"use client";

import { useState, useEffect } from "react";
import { Info, Check, AlertCircle, Loader2 } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/app/lib/utils";

interface SapTabProps {
  token: string | null;
}

export function SapTab({ token }: SapTabProps) {
  const sapEligibility = useQuery(
    api.sap.eligibility.getClientSapEligibility,
    token ? { sessionToken: token } : "skip"
  );
  const updateEligibility = useMutation(api.sap.eligibility.updateClientSapEligibility);

  const [eligibility, setEligibility] = useState<"none" | "elderly_dependent" | "disabled">("none");
  const [attested, setAttested] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (sapEligibility) {
      setEligibility((sapEligibility.sapEligibility as "none" | "elderly_dependent" | "disabled") ?? "none");
      setAttested(sapEligibility.sapEligibilityAttested ?? false);
    }
  }, [sapEligibility]);

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    setErrorMsg("");
    try {
      await updateEligibility({
        sessionToken: token,
        sapEligibility: eligibility,
        sapEligibilityAttested: attested,
      });
      setSuccessMsg("Éligibilité SAP mise à jour");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Erreur lors de la sauvegarde");
      setTimeout(() => setErrorMsg(""), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Éligibilité SAP</h2>
        <p className="text-sm text-gray-500 mt-1">Services à la Personne - Avantage fiscal</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-700 space-y-2">
            <p className="font-medium">Qu&apos;est-ce que l&apos;éligibilité SAP ?</p>
            <p>
              Si vous êtes une <strong>personne âgée dépendante</strong> ou une <strong>personne en situation de handicap</strong>, vous pouvez bénéficier d&apos;un taux de TVA réduit à <strong>10%</strong> (au lieu de 20%) sur les services de garde et promenade d&apos;animaux réalisés par un prestataire déclaré SAP.
            </p>
            <p>
              Vous bénéficiez également d&apos;un <strong>crédit d&apos;impôt de 50%</strong> sur ces prestations.
            </p>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Votre situation
        </label>
        <div className="space-y-3">
          <label className={cn(
            "flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-colors",
            eligibility === "none" ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"
          )}>
            <input
              type="radio"
              name="sap-eligibility"
              checked={eligibility === "none"}
              onChange={() => { setEligibility("none"); setAttested(false); }}
              className="w-4 h-4 text-primary focus:ring-primary"
            />
            <div>
              <p className="font-medium text-gray-800">Non éligible</p>
              <p className="text-sm text-gray-500">Je ne suis pas dans une situation de dépendance</p>
            </div>
          </label>

          <label className={cn(
            "flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-colors",
            eligibility === "elderly_dependent" ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"
          )}>
            <input
              type="radio"
              name="sap-eligibility"
              checked={eligibility === "elderly_dependent"}
              onChange={() => setEligibility("elderly_dependent")}
              className="w-4 h-4 text-primary focus:ring-primary"
            />
            <div>
              <p className="font-medium text-gray-800">Personne âgée dépendante</p>
              <p className="text-sm text-gray-500">Bénéficiaire de l&apos;APA ou en perte d&apos;autonomie</p>
            </div>
          </label>

          <label className={cn(
            "flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-colors",
            eligibility === "disabled" ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"
          )}>
            <input
              type="radio"
              name="sap-eligibility"
              checked={eligibility === "disabled"}
              onChange={() => setEligibility("disabled")}
              className="w-4 h-4 text-primary focus:ring-primary"
            />
            <div>
              <p className="font-medium text-gray-800">Personne en situation de handicap</p>
              <p className="text-sm text-gray-500">Titulaire d&apos;une carte d&apos;invalidité ou de la PCH</p>
            </div>
          </label>
        </div>
      </div>

      {eligibility !== "none" && (
        <div className="border-t pt-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={attested}
              onChange={(e) => setAttested(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-gray-700">
              J&apos;atteste sur l&apos;honneur être dans la situation déclarée ci-dessus. Je comprends que cette déclaration engage ma responsabilité et que toute fausse déclaration pourra entraîner des poursuites.
            </span>
          </label>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
          <Check className="w-4 h-4" /> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle className="w-4 h-4" /> {errorMsg}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving || (eligibility !== "none" && !attested)}
        className="px-6 py-3 bg-primary text-white rounded-full font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null}
        Sauvegarder
      </button>
    </div>
  );
}
