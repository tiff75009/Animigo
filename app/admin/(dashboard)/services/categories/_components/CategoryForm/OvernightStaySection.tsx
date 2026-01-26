"use client";

import { CalendarRange, Moon } from "lucide-react";

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
    <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <CalendarRange className="w-5 h-5 text-blue-400" />
        <h4 className="font-medium text-white">Options de réservation</h4>
      </div>

      {/* Réservation par plage */}
      <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-600">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={allowRangeBooking}
            onChange={(e) => onRangeBookingChange(e.target.checked)}
            className="mt-0.5 w-5 h-5 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900"
          />
          <div>
            <span className="font-medium text-white text-sm">Réservation par plage</span>
            <p className="text-xs text-slate-400 mt-0.5">
              Permet au client de sélectionner une plage de dates ou d&apos;heures.
            </p>
          </div>
        </label>
      </div>

      {/* Autoriser la garde de nuit */}
      <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-600">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={allowOvernightStay}
            onChange={(e) => onOvernightStayChange(e.target.checked)}
            className="mt-0.5 w-5 h-5 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-900"
          />
          <div>
            <span className="font-medium text-white text-sm flex items-center gap-2">
              <Moon className="w-4 h-4 text-indigo-400" />
              Autoriser la garde de nuit
            </span>
            <p className="text-xs text-slate-400 mt-0.5">
              Le client pourra laisser l&apos;animal la nuit lors d&apos;une réservation multi-jours.
            </p>
          </div>
        </label>
      </div>
    </div>
  );
}
