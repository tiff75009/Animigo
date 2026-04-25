"use client";

import React, { useEffect } from "react";
import { Home, MapPin, Check } from "lucide-react";
import { motion } from "framer-motion";

interface ServiceLocationSelectorProps {
  serviceLocation: "announcer_home" | "client_home" | "both";
  selectedLocation: "announcer_home" | "client_home" | null;
  onSelect: (location: "announcer_home" | "client_home") => void;
  isRangeMode?: boolean;
  announcerFirstName?: string;
}

export default function ServiceLocationSelector({
  serviceLocation,
  selectedLocation,
  onSelect,
  isRangeMode: _isRangeMode = false,
  announcerFirstName,
}: ServiceLocationSelectorProps) {
  // Auto-sélection si un seul lieu possible
  useEffect(() => {
    if (serviceLocation === "announcer_home" && selectedLocation !== "announcer_home") {
      onSelect("announcer_home");
    } else if (serviceLocation === "client_home" && selectedLocation !== "client_home") {
      onSelect("client_home");
    }
  }, [serviceLocation, selectedLocation, onSelect]);

  if (serviceLocation !== "both") {
    const isAnnouncerHome = serviceLocation === "announcer_home";
    return (
      <div
        className="flex items-center gap-3 p-3"
        style={{
          borderRadius: 12,
          border: "1px solid #1f3a33",
          background: "#f5f9f6",
        }}
      >
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "#fff", border: "1px solid #cfdbd3" }}
        >
          {isAnnouncerHome ? (
            <Home className="w-4 h-4" style={{ color: "#1f3a33" }} />
          ) : (
            <MapPin className="w-4 h-4" style={{ color: "#1f3a33" }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13.5px] font-semibold text-[#1f3a33] tracking-[-0.01em]">
            {isAnnouncerHome
              ? `Chez ${announcerFirstName || "le pet-sitter"}`
              : "À mon domicile"}
          </p>
          <p className="text-[11px] text-[#6d6d68] mt-0.5">
            {isAnnouncerHome ? "Vous déposez votre animal" : "Le pet-sitter se déplace"}
          </p>
        </div>
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "#1f3a33" }}
        >
          <Check className="w-3 h-3 text-white" />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      <LocationOption
        icon={<Home className="w-4 h-4" />}
        title={`Chez ${announcerFirstName || "le pet-sitter"}`}
        description="Vous déposez votre animal"
        isSelected={selectedLocation === "announcer_home"}
        onClick={() => onSelect("announcer_home")}
      />
      <LocationOption
        icon={<MapPin className="w-4 h-4" />}
        title="À mon domicile"
        description="Le pet-sitter se déplace"
        isSelected={selectedLocation === "client_home"}
        onClick={() => onSelect("client_home")}
      />
    </div>
  );
}

function LocationOption({
  icon,
  title,
  description,
  isSelected,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.005 }}
      whileTap={{ scale: 0.995 }}
      onClick={onClick}
      className="p-3 text-left transition-all relative"
      style={{
        borderRadius: 12,
        border: `1px solid ${isSelected ? "#1f3a33" : "#ece9e1"}`,
        background: isSelected ? "#f5f9f6" : "#fff",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            background: isSelected ? "#fff" : "#f7f5ef",
            border: `1px solid ${isSelected ? "#cfdbd3" : "#ece9e1"}`,
            color: isSelected ? "#1f3a33" : "#6d6d68",
          }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="text-[13.5px] font-semibold tracking-[-0.01em] truncate"
            style={{ color: isSelected ? "#1f3a33" : "#1f1f1d" }}
          >
            {title}
          </p>
          <p className="text-[11px] text-[#6d6d68] mt-0.5 truncate">
            {description}
          </p>
        </div>
        {isSelected && (
          <div
            className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "#1f3a33" }}
          >
            <Check className="w-2.5 h-2.5 text-white" />
          </div>
        )}
      </div>
    </motion.button>
  );
}
