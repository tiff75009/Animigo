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
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-white rounded-2xl shadow-sm overflow-hidden"
    >
      <div className="bg-gradient-to-r from-secondary to-secondary/80 px-6 py-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <PawPrint className="w-5 h-5" />
          {isCollectiveFormula ? "Vos animaux" : "Votre animal"}
        </h2>
      </div>
      <div className="p-6">
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
            ) : (
              <>
                <AnimalSelector
                  token={token}
                  selectedAnimalId={selectedAnimalId}
                  onSelect={setSelectedAnimalId}
                  compact
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
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-sm text-amber-800 flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  En tant que nouvel utilisateur, vous pouvez inscrire <strong>un seul animal</strong> pour cette réservation.
                  {isCollectiveFormula && (
                    <span className="block mt-1 text-amber-700">
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
