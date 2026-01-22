"use client";

interface OvernightStaySectionProps {
  allowRangeBooking: boolean;
  allowOvernightStay: boolean;
  onRangeBookingChange: (value: boolean) => void;
  onOvernightStayChange: (value: boolean) => void;
}

export default function OvernightStaySection({
  allowRangeBooking,
  allowOvernightStay,
  onRangeBookingChange,
  onOvernightStayChange,
}: OvernightStaySectionProps) {
  return (
    <>
      {/* Réservation par plage */}
      <div className="mb-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={allowRangeBooking}
            onChange={(e) => onRangeBookingChange(e.target.checked)}
            className="mt-1 w-5 h-5 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900"
          />
          <div>
            <span className="font-medium text-white">Réservation par plage</span>
            <p className="text-xs text-slate-400 mt-1">
              Permet au client de sélectionner une plage de dates (ex: du 15 au
              18 janvier) ou une plage d&apos;heures sur un même jour (ex: de
              10h à 14h).
            </p>
          </div>
        </label>
      </div>

      {/* Autoriser la garde de nuit */}
      <div className="mb-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={allowOvernightStay}
            onChange={(e) => onOvernightStayChange(e.target.checked)}
            className="mt-1 w-5 h-5 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-900"
          />
          <div>
            <span className="font-medium text-white">
              Autoriser la garde de nuit
            </span>
            <p className="text-xs text-slate-400 mt-1">
              Permet aux annonceurs de proposer la garde de nuit pour cette
              catégorie. Le client pourra choisir de laisser l&apos;animal la
              nuit lors d&apos;une réservation multi-jours.
            </p>
          </div>
        </label>
      </div>
    </>
  );
}
