"use client";

import { motion } from "framer-motion";
import { PawPrint, AlertCircle, Info } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { AnimalSelector, GuestAnimalForm, type GuestAnimalData } from "@/app/components/animals";
import CollectiveAnimalSelector from "./CollectiveAnimalSelector";
import type { CollectiveSlotData } from "../types";

interface AnimalSectionProps {
  isLoggedIn: boolean;
  token: string | null;
  isCollectiveFormula: boolean;
  selectedAnimalId: Id<"animals"> | null;
  setSelectedAnimalId: (id: Id<"animals"> | null) => void;
  selectedAnimalIds: Id<"animals">[];
  setSelectedAnimalIds: (ids: Id<"animals">[]) => void;
  preSelectedAnimalIds: string[];
  acceptedAnimalTypes: string[];
  collectiveSlots?: CollectiveSlotData[];
  guestAnimalData: GuestAnimalData;
  setGuestAnimalData: (data: GuestAnimalData) => void;
  fieldErrors: Record<string, string>;
}

export default function AnimalSection({
  isLoggedIn,
  token,
  isCollectiveFormula,
  selectedAnimalId,
  setSelectedAnimalId,
  selectedAnimalIds,
  setSelectedAnimalIds,
  preSelectedAnimalIds,
  acceptedAnimalTypes,
  collectiveSlots,
  guestAnimalData,
  setGuestAnimalData,
  fieldErrors,
}: AnimalSectionProps) {
  // Mode multi-sélection si plusieurs animaux pré-sélectionnés (même hors collectif)
  const isMultiAnimal = preSelectedAnimalIds.length > 1 && !isCollectiveFormula;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-white p-[18px]"
      style={{ borderRadius: 14, border: "1px solid #ece9e1" }}
    >
      <div className="mb-4 flex items-start gap-2.5">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "#f5f9f6", border: "1px solid #cfdbd3" }}
        >
          <PawPrint className="w-4 h-4" style={{ color: "#1f3a33" }} />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9c9484]">
            Section · {isCollectiveFormula || isMultiAnimal ? "Animaux concernés" : "Animal concerné"}
          </div>
          <h2 className="text-base font-semibold text-[#1f1f1d] tracking-[-0.01em] m-0">
            {isCollectiveFormula || isMultiAnimal ? "Vos animaux" : "Votre animal"}
          </h2>
        </div>
      </div>
      <div>
        {isLoggedIn && token ? (
          <>
            {isCollectiveFormula && collectiveSlots ? (
              <CollectiveAnimalSelector
                token={token}
                preSelectedAnimalIds={preSelectedAnimalIds}
                acceptedAnimalTypes={acceptedAnimalTypes}
                collectiveSlots={collectiveSlots}
                maxAnimalsPerSlot={10}
                onSelectionChange={(ids) => {
                  setSelectedAnimalIds(ids);
                  setSelectedAnimalId(ids.length > 0 ? ids[0] : null);
                }}
                error={fieldErrors.animal}
              />
            ) : isMultiAnimal ? (
              <>
                <AnimalSelector
                  token={token}
                  selectedAnimalId={selectedAnimalId}
                  onSelect={setSelectedAnimalId}
                  compact
                  multiSelect
                  selectedAnimalIds={selectedAnimalIds}
                  onMultiSelect={(ids) => {
                    setSelectedAnimalIds(ids);
                    setSelectedAnimalId(ids.length > 0 ? ids[0] : null);
                  }}
                  acceptedAnimalTypes={acceptedAnimalTypes}
                />
                {fieldErrors.animal && (
                  <p className="mt-3 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {fieldErrors.animal}
                  </p>
                )}
              </>
            ) : (
              <>
                <AnimalSelector
                  token={token}
                  selectedAnimalId={selectedAnimalId}
                  onSelect={setSelectedAnimalId}
                  compact
                  acceptedAnimalTypes={acceptedAnimalTypes}
                />
                {fieldErrors.animal && (
                  <p className="mt-3 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {fieldErrors.animal}
                  </p>
                )}
              </>
            )}
          </>
        ) : (
          <>
            <div
              className="mb-4 p-3"
              style={{
                borderRadius: 12,
                background: "#fdf8ec",
                border: "1px solid #f4e6c1",
              }}
            >
              <p className="text-[12px] flex items-start gap-2" style={{ color: "#7a5b1a" }}>
                <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>
                  En tant que nouvel utilisateur, vous pouvez inscrire <strong>un seul animal</strong> pour cette réservation.
                  {isCollectiveFormula && (
                    <span className="block mt-1 opacity-90">
                      Pour inscrire plusieurs animaux aux séances collectives, veuillez d&apos;abord créer un compte et vous connecter.
                    </span>
                  )}
                </span>
              </p>
            </div>
            <GuestAnimalForm
              data={guestAnimalData}
              onChange={setGuestAnimalData}
              acceptedAnimalTypes={acceptedAnimalTypes}
            />
            {(fieldErrors.animalName || fieldErrors.animalType) && (
              <p className="mt-3 text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {fieldErrors.animalName || fieldErrors.animalType}
              </p>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
