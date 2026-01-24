"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Clock } from "lucide-react";
import { cn } from "@/app/lib/utils";

interface MobileTimePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (time: string) => void;
  selectedTime: string | null;
  availableTimes: string[];
  disabledTimes?: string[];
  title?: string;
  accentColor?: "primary" | "secondary";
}

// Individual wheel column component
function WheelColumn({
  items,
  selectedIndex,
  onSelect,
  disabledItems = [],
  accentColor = "primary",
}: {
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  disabledItems?: string[];
  accentColor?: "primary" | "secondary";
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemHeight = 48;
  const visibleItems = 5;
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll to selected item on mount and when selectedIndex changes
  useEffect(() => {
    if (containerRef.current && !isScrolling) {
      const targetScroll = selectedIndex * itemHeight;
      containerRef.current.scrollTo({
        top: targetScroll,
        behavior: "smooth",
      });
    }
  }, [selectedIndex, isScrolling]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;

    // Clear previous timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    setIsScrolling(true);

    // Set timeout to detect scroll end
    scrollTimeoutRef.current = setTimeout(() => {
      if (!containerRef.current) return;

      const scrollTop = containerRef.current.scrollTop;
      const newIndex = Math.round(scrollTop / itemHeight);
      const clampedIndex = Math.max(0, Math.min(newIndex, items.length - 1));

      // Snap to nearest item
      containerRef.current.scrollTo({
        top: clampedIndex * itemHeight,
        behavior: "smooth",
      });

      // Only select if not disabled
      if (!disabledItems.includes(items[clampedIndex])) {
        onSelect(clampedIndex);
      }

      setIsScrolling(false);
    }, 100);
  }, [items, itemHeight, onSelect, disabledItems]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const accentClasses = accentColor === "primary"
    ? "text-primary"
    : "text-secondary";

  return (
    <div className="relative h-[240px] flex-1">
      {/* Gradient overlays */}
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white to-transparent z-10 pointer-events-none" />

      {/* Selection indicator */}
      <div
        className={cn(
          "absolute inset-x-2 top-1/2 -translate-y-1/2 h-12 rounded-xl z-0",
          accentColor === "primary" ? "bg-primary/10" : "bg-secondary/10"
        )}
      />

      {/* Scrollable container */}
      <div
        ref={containerRef}
        className="h-full overflow-y-auto scrollbar-hide snap-y snap-mandatory"
        onScroll={handleScroll}
        style={{
          paddingTop: itemHeight * 2,
          paddingBottom: itemHeight * 2,
        }}
      >
        {items.map((item, index) => {
          const isSelected = index === selectedIndex;
          const isDisabled = disabledItems.includes(item);

          return (
            <div
              key={item}
              className={cn(
                "h-12 flex items-center justify-center snap-center transition-all duration-200",
                isSelected && !isDisabled && `font-bold text-xl ${accentClasses}`,
                !isSelected && !isDisabled && "text-gray-400 text-lg",
                isDisabled && "text-gray-300 line-through"
              )}
              onClick={() => {
                if (!isDisabled) {
                  onSelect(index);
                }
              }}
            >
              {item}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MobileTimePicker({
  isOpen,
  onClose,
  onSelect,
  selectedTime,
  availableTimes,
  disabledTimes = [],
  title = "Choisir l'heure",
  accentColor = "primary",
}: MobileTimePickerProps) {
  // Parse available times into hours and minutes
  const hours = [...new Set(availableTimes.map((t) => t.split(":")[0]))];
  const getMinutesForHour = (hour: string) =>
    availableTimes
      .filter((t) => t.startsWith(hour + ":"))
      .map((t) => t.split(":")[1]);

  // State for selected hour and minute
  const [selectedHour, setSelectedHour] = useState<string>(() => {
    if (selectedTime) {
      return selectedTime.split(":")[0];
    }
    return hours[0] || "08";
  });

  const [selectedMinute, setSelectedMinute] = useState<string>(() => {
    if (selectedTime) {
      return selectedTime.split(":")[1];
    }
    const mins = getMinutesForHour(hours[0] || "08");
    return mins[0] || "00";
  });

  // Get available minutes for selected hour
  const availableMinutes = getMinutesForHour(selectedHour);

  // Update minute when hour changes if current minute is not available
  useEffect(() => {
    if (!availableMinutes.includes(selectedMinute)) {
      setSelectedMinute(availableMinutes[0] || "00");
    }
  }, [selectedHour, availableMinutes, selectedMinute]);

  // Check if current selection is disabled
  const currentTime = `${selectedHour}:${selectedMinute}`;
  const isCurrentDisabled = disabledTimes.includes(currentTime);

  const handleConfirm = () => {
    if (!isCurrentDisabled) {
      onSelect(currentTime);
      onClose();
    }
  };

  // Get disabled hours (all minutes disabled)
  const disabledHours = hours.filter((hour) => {
    const mins = getMinutesForHour(hour);
    return mins.every((min) => disabledTimes.includes(`${hour}:${min}`));
  });

  // Get disabled minutes for selected hour
  const disabledMinutes = availableMinutes.filter((min) =>
    disabledTimes.includes(`${selectedHour}:${min}`)
  );

  if (typeof document === "undefined") return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-[9998]"
          />

          {/* Picker Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-[9999] max-h-[60vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <button
                onClick={onClose}
                className="p-2 -m-2 text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <Clock className={cn(
                  "w-5 h-5",
                  accentColor === "primary" ? "text-primary" : "text-secondary"
                )} />
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              </div>
              <button
                onClick={handleConfirm}
                disabled={isCurrentDisabled}
                className={cn(
                  "p-2 -m-2 font-semibold",
                  isCurrentDisabled
                    ? "text-gray-300"
                    : accentColor === "primary"
                    ? "text-primary"
                    : "text-secondary"
                )}
              >
                <Check className="w-5 h-5" />
              </button>
            </div>

            {/* Wheels container */}
            <div className="flex items-center px-8 py-4">
              {/* Hours wheel */}
              <WheelColumn
                items={hours}
                selectedIndex={hours.indexOf(selectedHour)}
                onSelect={(index) => setSelectedHour(hours[index])}
                disabledItems={disabledHours}
                accentColor={accentColor}
              />

              {/* Separator */}
              <div className={cn(
                "text-3xl font-bold mx-2",
                accentColor === "primary" ? "text-primary" : "text-secondary"
              )}>
                :
              </div>

              {/* Minutes wheel */}
              <WheelColumn
                items={availableMinutes}
                selectedIndex={availableMinutes.indexOf(selectedMinute)}
                onSelect={(index) => setSelectedMinute(availableMinutes[index])}
                disabledItems={disabledMinutes}
                accentColor={accentColor}
              />
            </div>

            {/* Current selection display */}
            <div className="px-4 pb-4">
              <div
                className={cn(
                  "p-4 rounded-xl text-center",
                  isCurrentDisabled
                    ? "bg-red-50 text-red-600"
                    : accentColor === "primary"
                    ? "bg-primary/10 text-primary"
                    : "bg-secondary/10 text-secondary"
                )}
              >
                <p className="text-2xl font-bold">{currentTime}</p>
                {isCurrentDisabled && (
                  <p className="text-sm mt-1">Ce créneau n'est pas disponible</p>
                )}
              </div>
            </div>

            {/* Confirm button */}
            <div className="p-4 pt-0">
              <button
                onClick={handleConfirm}
                disabled={isCurrentDisabled}
                className={cn(
                  "w-full py-3.5 font-semibold rounded-xl transition-colors",
                  isCurrentDisabled
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : accentColor === "primary"
                    ? "bg-primary text-white"
                    : "bg-secondary text-white"
                )}
              >
                Confirmer {currentTime}
              </button>
            </div>

            {/* Safe area */}
            <div className="h-4" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
