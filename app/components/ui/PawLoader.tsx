"use client";

import { motion } from "framer-motion";

interface PawLoaderProps {
  message?: string;
  submessage?: string;
  size?: "sm" | "md" | "lg";
}

function PawPrint({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      viewBox="0 0 532 491"
      className={className}
      style={style}
      fill="none"
    >
      {/* Fond patte (forme principale sombre) */}
      <g>
        {/* Coussinet principal */}
        <path
          d="M175.431,460.69c-12.576,2.088 -30.001,-5.33 -40.414,-12.145c-11.565,-7.57 -18.096,-18.188 -22.558,-28.898c-3.3,-8.294 -5.181,-16.821 -4.987,-25.688c0.07,-7.914 1.006,-15.664 4.274,-22.97c0.904,-6.405 2.578,-12.66 4.987,-18.771c15.515,-29.962 32.47,-58.827 51.054,-86.448c15.565,-17.78 32.048,-34.196 50.341,-47.917c5.927,-3.785 12.507,-6.987 19.709,-9.633c7.854,-3.005 15.605,-4.744 23.271,-5.434c12.069,0.369 22.483,2.043 31.345,4.94c12.743,4.817 23.847,11.379 33.244,19.76c17.125,14.863 32.351,30.81 45.118,48.163c9.218,12.716 17.23,25.532 23.033,38.531c7.053,11.181 13.163,22.459 18.285,33.839c1.321,3.485 2.832,7.692 4.987,14.325c3.508,12.792 5.153,23.845 4.749,27.995c-0.598,8.363 -1.116,11.608 -8.311,29.555c-2.977,8.245 -7.66,16.229 -14.011,23.958c-11.133,11.064 -12.635,14.266 -22.796,16.302c-12.103,2.425 -36.984,-1.647 -37.993,-1.976c-5.774,-1.884 -31.905,-11.293 -32.017,-10.663c-10.667,-5.094 -23.29,-9.742 -41.833,-8.603c-13.297,0.817 -14.821,1.218 -37.565,7.069c-6.189,1.592 -17.095,5.165 -30.919,10.184"
          fill="currentColor"
        />
        {/* Coussinets doigts — haut gauche */}
        <ellipse cx="180" cy="105" rx="70" ry="85" fill="currentColor" />
        {/* Coussinets doigts — haut droit */}
        <ellipse cx="343" cy="102" rx="70" ry="85" fill="currentColor" />
        {/* Coussinets doigts — gauche */}
        <ellipse cx="73" cy="233" rx="65" ry="78" fill="currentColor" />
        {/* Coussinets doigts — droit */}
        <ellipse cx="459" cy="230" rx="65" ry="78" fill="currentColor" />
      </g>
    </svg>
  );
}

const sizeConfig = {
  sm: { paw: "w-6 h-6", gap: "gap-3", text: "text-sm", subtext: "text-xs", container: "py-8" },
  md: { paw: "w-8 h-8", gap: "gap-4", text: "text-base", subtext: "text-sm", container: "py-16" },
  lg: { paw: "w-10 h-10", gap: "gap-5", text: "text-lg", subtext: "text-sm", container: "py-24" },
};

// Positions des 6 empreintes qui "marchent" — alternance gauche/droite
const pawPositions = [
  { x: -28, y: 60, rotate: -25 },
  { x: 28, y: 40, rotate: 20 },
  { x: -20, y: 20, rotate: -15 },
  { x: 32, y: 0, rotate: 25 },
  { x: -24, y: -20, rotate: -20 },
  { x: 30, y: -40, rotate: 15 },
];

export default function PawLoader({
  message = "Chargement en cours...",
  submessage,
  size = "md",
}: PawLoaderProps) {
  const cfg = sizeConfig[size];

  return (
    <div className={`flex flex-col items-center justify-center ${cfg.container}`}>
      {/* Empreintes de pattes qui marchent */}
      <div className="relative w-24 h-32 mb-6">
        {pawPositions.map((pos, i) => (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/2"
            style={{
              x: pos.x,
              y: pos.y,
            }}
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{
              opacity: [0, 1, 1, 0],
              scale: [0.3, 1, 1, 0.5],
            }}
            transition={{
              duration: 2,
              delay: i * 0.3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <PawPrint
              className={`${cfg.paw} -translate-x-1/2 -translate-y-1/2`}
              style={{
                transform: `translate(-50%, -50%) rotate(${pos.rotate}deg)`,
                color: i % 2 === 0 ? "#FF6B6B" : "#4ECDC4",
              }}
            />
          </motion.div>
        ))}
      </div>

      {/* Message */}
      <motion.p
        className={`${cfg.text} font-semibold text-gray-700`}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        {message}
      </motion.p>

      {submessage && (
        <p className={`${cfg.subtext} text-gray-400 mt-1.5`}>
          {submessage}
        </p>
      )}

      {/* Barre de progression subtle */}
      <div className="w-48 h-1 bg-gray-100 rounded-full mt-4 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-primary via-secondary to-primary"
          style={{ backgroundSize: "200% 100%" }}
          animate={{
            backgroundPosition: ["0% 0%", "200% 0%"],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear",
          }}
          initial={{ width: "100%" }}
        />
      </div>
    </div>
  );
}
