"use client";

import { motion, Variants, Transition } from "framer-motion";

type Props = { isHovered: boolean };

/*
 * ══════════════════════════════════════════════════════════════════════════
 * Hero illustrations — SVG narratifs, animations Framer Motion
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Principes :
 * - Chaque carte a une animation qui RACONTE la catégorie
 *   (le chien de promenade se promène, celui d'agilité saute, etc.)
 * - Les animations sont déclenchées par la prop `isHovered`
 *   (le parent gère l'état hover via onMouseEnter/Leave pour éviter les
 *   surprises liées aux conflits SVG transform vs CSS transform)
 * - framer-motion pilote les variants, évitant les problèmes de transform
 *   composé entre l'attribut SVG `transform` et une CSS transform
 */

// Courbes d'accélération — mouvement naturel et fluide
const smooth: [number, number, number, number] = [0.45, 0, 0.55, 1]; // sinusoïdal doux
const expressive: [number, number, number, number] = [0.22, 1, 0.36, 1]; // entrée forte, sortie douce

// Transitions réutilisables — toujours avec mirror pour des retours doux
const loopTransition = (duration: number, delay = 0): Transition => ({
  duration,
  delay,
  ease: smooth,
  repeat: Infinity,
  repeatType: "mirror",
});

const walkTransition = (duration: number): Transition => ({
  duration,
  ease: smooth,
  repeat: Infinity,
  repeatType: "mirror",
});

const expressiveLoop = (duration: number, delay = 0): Transition => ({
  duration,
  delay,
  ease: expressive,
  repeat: Infinity,
});

// ══════════════════════════════════════════════════════════════════════════
// Composants Bulldog — utilisant des SVG professionnels de SVGRepo.com
// ══════════════════════════════════════════════════════════════════════════

// Bulldog de face — SVG professionnel colorisé (viewBox 0 0 512 512)
// Rendu à l'échelle via la taille de la card
export function BulldogFront({ size = 130 }: { size?: number }) {
  return (
    <g transform={`scale(${size / 512})`}>
      {/* Oreilles (brun foncé) */}
      <path
        fill="#A06446"
        d="M171.709,53.046C148.003,56.343,115.5,16.045,64,16.045c-31.013,0-56,112-56,112c6,15,24,24,24,24"
      />
      <path
        fill="#A06446"
        d="M340.291,53.046C363.997,56.343,396.5,16.045,448,16.045c31.013,0,56,112,56,112c-6,15-24,24-24,24"
      />
      {/* Corps (tan foncé) */}
      <path
        fill="#BE7D55"
        d="M199.057,50.056C105.635,57.487,49.945,87.292,32,168.045c-10.024,45.111-24,71.144-24,120c0,108,91.333,134,95.272,168.667l83.942-224.611h-8.878c-1.302,0-2.338-1.079-2.302-2.38C177.707,170.019,235.94,83.576,200,50.882c-0.307-0.279-0.622-0.554-0.943-0.826z"
      />
      <path
        fill="#BE7D55"
        d="M298.147,49.082L312,49.986c0,0,0.207,0.598-0.216,1.021c-32.519,32.545,22.605,122.847,24.182,178.695c0.037,1.31-0.995,2.399-2.305,2.399h-8.875l83.942,224.611C412.667,422.045,504,396.045,504,288.045C504,239.189,490.024,213.157,480,168.045C461.127,83.117,400.503,54.544,298.147,49.082z"
      />
      {/* Museau/ventre (beige clair) */}
      <path
        fill="#FFDEB7"
        d="M335.966,229.702c-1.577-55.848-56.7-146.15-24.182-178.695c0.423-0.423,0.216-1.021,0.216-1.021l-13.853-0.904c-3.481-0.114-22.533-0.725-33.96-0.921c-2.139-0.036-4.018-0.059-5.468-0.061c-1.597-0.002-3.667,0.019-6.021,0.054c-9.581,0.143-24.023,0.539-32.057,0.771c-3.6,0.104-5.922,0.175-5.922,0.175l-14,1c0.019,0.016,0.037,0.033,0.056,0.049c0.321,0.271,0.637,0.546,0.943,0.826c35.94,32.693-22.293,119.136-23.966,178.838c-0.037,1.302,1,2.38,2.302,2.38h8.878h137.571h8.875C334.971,232.101,336.002,231.012,335.966,229.702z"
      />
      <path
        fill="#FFDEB7"
        d="M256,320.101H144v144c0,0,56,24,72,24s24-8,40-8s24,8,40,8s72-24,72-24v-144H256z"
      />
      {/* Corps inférieur / pattes (plus clair) */}
      <path
        fill="#FFEBD2"
        d="M256,200.045c-107,0-159,76-144,174.167c0,0-19.638,86.489,0,113.833c5.354,7.456,32,16.333,32-8c0-120,15.333-152,112-152"
      />
      <path
        fill="#FFEBD2"
        d="M256,200.045c107,0,159,76,144,174.167c0,0,19.638,86.489,0,113.833c-5.354,7.456-32,16.333-32-8c0-120-15.333-152-112-152"
      />
      {/* Museau sombre */}
      <path
        fill="#464655"
        d="M304,272.045c0,22.091-21.49,8-48,8s-48,14.091-48-8s21.49-40,48-40S304,249.954,304,272.045z"
      />
      {/* Bouche */}
      <path
        fill="none"
        stroke="#000000"
        strokeWidth="16"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeMiterlimit={10}
        d="M304,360.045c-22.667-8.667-48-8-48-8s-25.333-0.667-48,8"
      />
      {/* Yeux */}
      <path d="M120,184.045c-8.822,0-16,7.178-16,16c0,8.823,7.178,16,16,16s16-7.177,16-16C136,191.223,128.822,184.045,120,184.045z" />
      <path d="M392,184.045c-8.822,0-16,7.178-16,16c0,8.823,7.178,16,16,16s16-7.177,16-16C408,191.223,400.822,184.045,392,184.045z" />
      {/* Contour extérieur complet */}
      <path
        d="M497.774,204.084c-3.374-11.705-6.861-23.809-9.965-37.774c-0.628-2.825-1.308-5.591-2.031-8.312c5.536-3.194,19.894-12.592,25.649-26.981c0.599-1.497,0.731-3.14,0.38-4.713c-0.26-1.164-6.475-28.822-16.655-56.979C480.037,27.518,465.054,8.045,448,8.045c-31.4,0-55.721,13.704-75.262,24.714c-12.696,7.154-23.669,13.332-31.207,12.374c-24.149-3.45-52.271-5.088-85.531-5.088s-61.382,1.638-85.531,5.088c-7.538,0.957-18.51-5.22-31.207-12.374C119.72,21.75,95.4,8.045,64,8.045c-17.054,0-32.037,19.472-47.153,61.28C6.667,97.481,0.452,125.14,0.192,126.304c-0.351,1.573-0.218,3.216,0.38,4.713c5.756,14.39,20.113,23.787,25.649,26.981c-0.723,2.721-1.403,5.487-2.031,8.312c-3.104,13.965-6.591,26.069-9.965,37.774C6.91,229.469,0,253.447,0,288.045c0,32.699,7.883,61.088,24.099,86.791c13.758,21.806,31.245,37.871,45.296,50.781c13.356,12.27,24.891,22.866,25.929,31.999c0.075,0.663,0.237,1.294,0.46,1.892c1.086,13.267,3.955,25.18,9.719,33.205c4.399,6.125,14.95,11.243,24.819,11.242c2.547,0,5.05-0.342,7.389-1.094c4.297-1.383,14.291-6.375,14.291-22.815c0-5.328,0.029-10.5,0.094-15.521c19.427,11.253,46.277,23.209,72.663,23.208c8.578-0.001,17.109-1.265,25.317-4.227c3.877-1.399,7.976-1.399,11.853,0c8.21,2.963,16.737,4.227,25.317,4.227c26.384,0,53.236-11.956,72.663-23.208c0.064,5.021,0.094,10.193,0.094,15.521c0,16.44,9.994,21.432,14.291,22.815c2.339,0.753,4.841,1.094,7.389,1.094c9.869,0,20.42-5.118,24.819-11.242c5.764-8.025,8.633-19.938,9.719-33.205c0.223-0.598,0.385-1.229,0.46-1.892c1.038-9.132,12.572-19.729,25.928-31.999c14.051-12.91,31.539-28.975,45.296-50.781C504.117,349.134,512,320.744,512,288.045C512,253.447,505.09,229.469,497.774,204.084z M480.061,74.639c8.098,22.373,13.745,45.059,15.53,52.566c-3.553,6.813-10.286,12.084-14.751,15.037c-6.537-17.941-15.532-33.285-27.093-46.154c-0.037-0.051-0.067-0.104-0.104-0.154c-28.833-38.096-30.169-55.211-28.4-62.022c0.633-2.437,2.144-5.936,7.786-8.641c4.793-0.785,9.776-1.227,14.973-1.227C450.295,24.045,462.629,26.484,480.061,74.639z M380.592,46.699c8.884-5.006,18.328-10.326,28.679-14.551c-1.733,9.578,0.721,21.293,7.447,35.356c-1.722-0.911-3.462-1.806-5.244-2.665c-11.509-5.549-24.325-10.097-38.822-13.719C375.241,49.712,377.882,48.226,380.592,46.699z M139.349,51.12c-14.497,3.622-27.314,8.17-38.823,13.719c-1.782,0.859-3.522,1.754-5.244,2.665c6.727-14.063,9.18-25.778,7.447-35.356c10.351,4.226,19.794,9.545,28.679,14.551C134.118,48.226,136.759,49.712,139.349,51.12z M16.41,127.203c1.779-7.487,7.399-30.076,15.484-52.438C49.348,26.491,61.701,24.045,64,24.045c5.197,0,10.179,0.442,14.973,1.227c5.642,2.705,7.152,6.204,7.786,8.641c1.77,6.811,0.433,23.926-28.4,62.022c-0.038,0.05-0.068,0.103-0.104,0.154c-11.56,12.867-20.554,28.208-27.09,46.146C26.694,139.27,19.954,133.986,16.41,127.203z"
        fill="#000"
        opacity="0.9"
      />
    </g>
  );
}

// Bulldog profil — silhouette marron propre (sans overlays mal placés)
export function BulldogProfile({ size = 110 }: { size?: number }) {
  const scale = size / 482.741;
  return (
    <g transform={`scale(${scale})`}>
      {/* Corps principal — silhouette marron solide */}
      <path
        fill="#8B5A2B"
        fillRule="evenodd"
        d="M463.213,124.676l-5.563-21.845c-3.788-14.874-17.153-25.262-32.502-25.262h-40.136c-7.802,0-15.483,2.084-22.214,6.028l-77.755,45.554c-20.683,12.117-45.032,16.263-68.56,11.672l-49.462-9.651c-23.566-4.599-47.589-1.806-69.471,8.077c-1.501,0.678-2.978,1.397-4.444,2.136l-5.025-2.658c-13.009-6.882-28.742-4.513-39.148,5.893l-7.862,7.862c-6.705,6.705-10.244,15.98-9.708,25.448c0.42,7.423,3.324,14.439,8.131,19.973c-5.919,13.467-9.221,27.992-9.671,42.839l-0.704,23.233c-0.114,3.75-1.354,7.325-3.587,10.339l-18.555,25.05c-5.304,7.162-7.712,15.987-6.779,24.85l5.864,55.709c1.515,14.396,13.574,25.252,28.05,25.252h24.418c4.559,0,8.806-2.254,11.362-6.029c2.556-3.775,3.071-8.556,1.378-12.788c-3.556-8.89-10.995-15.302-19.936-17.622v-18.005c0-9.741,4.21-19.001,11.551-25.404l51.61-45.021l42.593,29.906c14.192,9.965,31.151,15.282,48.399,15.282c2.33,0,4.666-0.097,7-0.293l44.736-3.752l13.185,56.621c3.717,15.958,17.756,27.104,34.142,27.104h25.974c4.864,0,9.263-2.49,11.766-6.661c2.503-4.171,2.63-9.224,0.341-13.517l-0.837-1.57c-4.385-8.221-12.286-13.789-21.292-15.257l4.006-62.49c26.155-16.94,46.943-40.736,60.177-68.994l2.382-5.086c8.035,2.353,16.649,1.81,24.495-1.702l39.764-17.805c19.084-8.545,31.416-27.578,31.416-48.488v-16.486C482.741,135.685,474.23,126.204,463.213,124.676z"
      />
    </g>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// 1. IllusDogHug — Garde / Pension
//    Narration : chien qui attend à la fenêtre → au hover, queue qui bat
//    et apparition d'un cœur, puis main qui caresse.
// ══════════════════════════════════════════════════════════════════════════
export function IllusDogHug({ isHovered }: Props) {
  const state = isHovered ? "hover" : "rest";

  // Animations inspirées du brief user :
  // - Tête : scale 1.1 au survol
  // - Pattes avant : translateY -5 (lève les pattes)
  // - Queue : rotation joyeuse en boucle
  // - Yeux : clignent au survol (bonus Animigo)
  // - Bouche : sourit plus large au survol (bonus Animigo)
  const headVariants: Variants = {
    rest: { scale: 1 },
    hover: { scale: 1.1, transition: { duration: 0.4, ease: smooth } },
  };
  const frontPawsVariants: Variants = {
    rest: { y: 0 },
    hover: {
      y: [-5, 0, -5, 0],
      transition: { duration: 1.2, ease: smooth, repeat: Infinity },
    },
  };
  const tailVariants: Variants = {
    rest: { rotate: 0 },
    hover: {
      rotate: [-12, 22, -12, 22, -12],
      transition: { duration: 0.8, ease: smooth, repeat: Infinity },
    },
  };
  const eyeVariants: Variants = {
    rest: { scaleY: 1 },
    hover: {
      scaleY: [1, 1, 0.1, 1, 1, 0.1, 1],
      transition: { duration: 3.5, repeat: Infinity, ease: smooth, times: [0, 0.35, 0.4, 0.45, 0.7, 0.75, 1] },
    },
  };
  const mouthVariants: Variants = {
    rest: { d: "M -10 5 Q 0 12 10 5" },
    hover: { d: "M -12 4 Q 0 18 12 4", transition: { duration: 0.4, ease: smooth } },
  };
  const heartVariants: Variants = {
    rest: { opacity: 0, scale: 0, y: 0 },
    hover: {
      opacity: [0, 1, 1, 0],
      scale: [0.3, 1.2, 1, 0.7],
      y: [0, -20, -45, -75],
      transition: { duration: 2.8, ease: expressive, repeat: Infinity },
    },
  };
  const sunVariants: Variants = {
    rest: { rotate: 0 },
    hover: { rotate: 360, transition: { duration: 22, ease: "linear", repeat: Infinity } },
  };

  return (
    <div
      className="absolute inset-0"
      style={{ background: "radial-gradient(circle at 75% 25%, #FFF4D6 0%, #FFE0A0 50%, #FFC97A 100%)" }}
    >
      <svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" className="w-full h-full">
        {/* Sol pastel */}
        <path d="M 0 180 Q 200 168 400 180 L 400 220 L 0 220 Z" fill="#F5B860" opacity="0.4" />

        {/* Soleil décoratif en haut à droite */}
        <motion.g animate={state} variants={sunVariants} style={{ originX: "340px", originY: "40px" }}>
          <circle cx="340" cy="40" r="22" fill="#FFEEB8" opacity="0.85" />
          <circle cx="340" cy="40" r="13" fill="#FFF8E0" />
          <g stroke="#F5B860" strokeWidth="2" strokeLinecap="round">
            <line x1="340" y1="8" x2="340" y2="16" />
            <line x1="340" y1="64" x2="340" y2="72" />
            <line x1="308" y1="40" x2="316" y2="40" />
            <line x1="364" y1="40" x2="372" y2="40" />
            <line x1="318" y1="18" x2="322" y2="22" />
            <line x1="358" y1="58" x2="362" y2="62" />
          </g>
        </motion.g>

        {/* Chien stylisé jaune (#fccf55) — centré dans la card */}
        {/* Centre du chien : (200, 110) */}

        {/* Queue (sort du corps à droite, anime depuis sa base) */}
        <g transform="translate(244, 100)">
          <motion.g animate={state} variants={tailVariants} style={{ originX: 0, originY: 0 }}>
            <path
              d="M 0 0 Q 22 -8 36 -22"
              stroke="#fccf55"
              strokeWidth="9"
              strokeLinecap="round"
              fill="none"
            />
          </motion.g>
        </g>

        {/* Corps (rectangle arrondi central) */}
        <rect x="160" y="100" width="80" height="60" rx="14" ry="14" fill="#fccf55" />
        {/* Ventre crème */}
        <ellipse cx="200" cy="138" rx="28" ry="14" fill="#FFF1C8" opacity="0.7" />

        {/* Pattes arrière (statiques) */}
        <rect x="166" y="148" width="12" height="28" rx="5" ry="5" fill="#fccf55" />
        <rect x="222" y="148" width="12" height="28" rx="5" ry="5" fill="#fccf55" />

        {/* Pattes avant (animées : lèvent au hover) */}
        <motion.g animate={state} variants={frontPawsVariants}>
          <rect x="178" y="148" width="12" height="28" rx="5" ry="5" fill="#fccf55" />
          <rect x="210" y="148" width="12" height="28" rx="5" ry="5" fill="#fccf55" />
        </motion.g>

        {/* Tête (animée : scale 1.1 au hover, origine au centre du visage) */}
        <motion.g animate={state} variants={headVariants} style={{ originX: "200px", originY: "75px" }}>
          {/* Oreilles tombantes */}
          <ellipse cx="174" cy="60" rx="10" ry="18" fill="#E8B040" transform="rotate(-22 174 60)" />
          <ellipse cx="226" cy="60" rx="10" ry="18" fill="#E8B040" transform="rotate(22 226 60)" />

          {/* Visage (cercle principal) */}
          <circle cx="200" cy="75" r="32" fill="#fccf55" />

          {/* Joues roses */}
          <circle cx="178" cy="84" r="4.5" fill="#FF9CB0" opacity="0.55" />
          <circle cx="222" cy="84" r="4.5" fill="#FF9CB0" opacity="0.55" />

          {/* Yeux (clignent au hover) */}
          <motion.g animate={state} variants={eyeVariants} style={{ originX: "200px", originY: "70px" }}>
            <circle cx="190" cy="70" r="4.5" fill="#1B1108" />
            <circle cx="210" cy="70" r="4.5" fill="#1B1108" />
            {/* Reflets */}
            <circle cx="191.5" cy="68.5" r="1.3" fill="#FFFFFF" />
            <circle cx="211.5" cy="68.5" r="1.3" fill="#FFFFFF" />
          </motion.g>

          {/* Museau */}
          <ellipse cx="200" cy="86" rx="9" ry="6" fill="#FFE8C8" />
          {/* Truffe */}
          <ellipse cx="200" cy="83" rx="3.5" ry="2.5" fill="#1B1108" />

          {/* Bouche (sourit plus large au hover) */}
          <motion.path
            animate={state}
            variants={mouthVariants}
            transform="translate(200 90)"
            stroke="#1B1108"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />

          {/* Petit collier rose */}
          <path d="M 178 105 Q 200 110 222 105" stroke="#FF5D85" strokeWidth="3" fill="none" strokeLinecap="round" />
          <circle cx="200" cy="109" r="2.5" fill="#FFE066" />
        </motion.g>

        {/* Cœur qui monte (apparaît au hover) */}
        <motion.g animate={state} variants={heartVariants}>
          <g transform="translate(248, 60)">
            <path d="M 10 18 Q 0 6 10 2 Q 16 -1 18 7 Q 20 -1 26 2 Q 36 6 26 18 L 18 26 Z" fill="#FF4F74" />
          </g>
        </motion.g>
      </svg>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// 2. IllusCatCare — Chat / Visite chat
//    Narration : chat endormi → au hover, queue qui ondule + Zzz qui montent
// ══════════════════════════════════════════════════════════════════════════
export function IllusCatCare({ isHovered }: Props) {
  const state = isHovered ? "hover" : "rest";

  const tailVariants: Variants = {
    rest: { rotate: 0 },
    hover: {
      rotate: [-12, 14, -8, 14, -12],
      transition: { duration: 3.2, ease: smooth, repeat: Infinity },
    },
  };
  const bodyVariants: Variants = {
    rest: { scale: 1 },
    hover: { scale: [1, 1.022, 1], transition: loopTransition(2.6) },
  };
  const zVariants = (dur: number, delay: number): Variants => ({
    rest: { opacity: 0, y: 0, x: 0, rotate: 0, scale: 0.6 },
    hover: {
      opacity: [0, 1, 1, 0],
      y: [0, -18, -40, -65],
      x: [0, 6, -4, 10],
      scale: [0.6, 1, 1.1, 0.9],
      rotate: [0, -8, 6, 0],
      transition: { duration: dur, delay, repeat: Infinity, ease: expressive },
    },
  });
  const earVariants: Variants = {
    rest: { rotate: 0 },
    hover: { rotate: [0, 4, -3, 4, 0], transition: { duration: 2.8, ease: smooth, repeat: Infinity } },
  };

  return (
    <div
      className="absolute inset-0"
      style={{ background: "radial-gradient(circle at 30% 25%, #FFF0F5 0%, #FFC0D4 50%, #FF85A8 100%)" }}
    >
      <svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" className="w-full h-full">
        <defs>
          <linearGradient id="cc-fur" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#EDE8DD" />
            <stop offset="100%" stopColor="#8E877B" />
          </linearGradient>
        </defs>

        {/* Coussin rose */}
        <ellipse cx="200" cy="190" rx="160" ry="22" fill="#D65D80" opacity="0.55" />
        <ellipse cx="200" cy="196" rx="130" ry="12" fill="#9E3658" opacity="0.4" />

        {/* Chat roulé en boule — corps respirant */}
        <motion.g animate={state} variants={bodyVariants} style={{ originX: "205px", originY: "170px" }}>
          <g transform="translate(130, 70)">
          {/* Corps */}
          <ellipse cx="75" cy="108" rx="88" ry="46" fill="url(#cc-fur)" />
          <ellipse cx="75" cy="120" rx="65" ry="28" fill="#F8F3E9" opacity="0.7" />
          {/* Rayures tigrées */}
          <g opacity="0.35" stroke="#6B6356" strokeWidth="3.5" fill="none" strokeLinecap="round">
            <path d="M 35 92 Q 48 86 58 96" />
            <path d="M 65 82 Q 80 76 92 86" />
            <path d="M 100 90 Q 115 86 128 98" />
            <path d="M 48 118 Q 60 114 70 122" />
            <path d="M 95 118 Q 108 114 122 124" />
          </g>

          {/* Queue enroulée qui ondule */}
          <motion.g
            animate={state}
            variants={tailVariants}
            style={{ originX: "145px", originY: "100px" }}
          >
            <path d="M 145 100 Q 175 85 170 50 Q 160 30 140 40" stroke="url(#cc-fur)" strokeWidth="18" strokeLinecap="round" fill="none" />
          </motion.g>

          {/* Tête */}
          <circle cx="52" cy="58" r="36" fill="url(#cc-fur)" />
          {/* Oreilles qui frémissent */}
          <motion.g animate={state} variants={earVariants} style={{ originX: "33px", originY: "32px" }}>
            <path d="M 26 36 L 22 10 L 44 32 Z" fill="url(#cc-fur)" />
            <path d="M 28 32 L 26 18 L 38 30 Z" fill="#FF85A8" />
          </motion.g>
          <motion.g animate={state} variants={earVariants} style={{ originX: "71px", originY: "32px" }}>
            <path d="M 78 36 L 82 10 L 60 32 Z" fill="url(#cc-fur)" />
            <path d="M 76 32 L 78 18 L 66 30 Z" fill="#FF85A8" />
          </motion.g>

          {/* Yeux fermés de bien-être */}
          <path d="M 36 54 Q 42 49 48 54" stroke="#2A2520" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M 56 54 Q 62 49 68 54" stroke="#2A2520" strokeWidth="2.5" fill="none" strokeLinecap="round" />

          {/* Nez + bouche */}
          <path d="M 48 66 L 56 66 L 52 72 Z" fill="#E85F7C" />
          <path d="M 52 72 Q 48 77 44 75" stroke="#2A2520" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M 52 72 Q 56 77 60 75" stroke="#2A2520" strokeWidth="1.5" fill="none" strokeLinecap="round" />

          {/* Moustaches */}
          <g stroke="#8A857D" strokeWidth="1" strokeLinecap="round">
            <path d="M 28 68 L 8 64" />
            <path d="M 28 72 L 8 74" />
            <path d="M 76 68 L 96 64" />
            <path d="M 76 72 L 96 74" />
          </g>

          {/* Joues */}
          <circle cx="28" cy="70" r="5" fill="#FF9AB5" opacity="0.55" />
          <circle cx="76" cy="70" r="5" fill="#FF9AB5" opacity="0.55" />
          </g>
        </motion.g>

        {/* Zzzz qui s'envolent */}
        <motion.text x="240" y="95" fontSize="14" fill="#2A2520" opacity="0.8" style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontWeight: 700 }} animate={state} variants={zVariants(2.6, 0)}>
          z
        </motion.text>
        <motion.text x="255" y="80" fontSize="20" fill="#2A2520" opacity="0.8" style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontWeight: 700 }} animate={state} variants={zVariants(2.6, 0.5)}>
          z
        </motion.text>
        <motion.text x="275" y="60" fontSize="28" fill="#2A2520" opacity="0.8" style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontWeight: 700 }} animate={state} variants={zVariants(2.6, 1)}>
          Z
        </motion.text>
      </svg>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// 3. IllusPuppyWalk — Promenade / Balade
//    Narration : humain + chien dans un paysage → au hover ils avancent
//    ensemble de gauche à droite, queue qui bat, pattes qui bougent
// ══════════════════════════════════════════════════════════════════════════
export function IllusPuppyWalk({ isHovered }: Props) {
  const state = isHovered ? "hover" : "rest";

  const walkerVariants: Variants = {
    rest: { x: -40 },
    hover: {
      x: [-40, 180, -40],
      transition: { duration: 8, ease: smooth, repeat: Infinity },
    },
  };
  // Rebond léger du corps tout entier — simule le pas
  const bounceVariants: Variants = {
    rest: { y: 0 },
    hover: {
      y: [0, -4, 0, -4, 0],
      transition: { duration: 0.6, ease: smooth, repeat: Infinity },
    },
  };
  const tailVariants: Variants = {
    rest: { rotate: 0 },
    hover: {
      rotate: [-12, 18, -8, 18, -12],
      transition: { duration: 0.6, ease: smooth, repeat: Infinity },
    },
  };
  // Jambes : démarche diagonale (legA avec legB en phase opposée).
  // Pivot toujours à (0, 0) dans le repère local = parfaitement aligné avec
  // la hanche/épaule, donc PAS de dislocation.
  const legA: Variants = {
    rest: { rotate: 0 },
    hover: {
      rotate: [-16, 16, -16],
      transition: { duration: 0.6, ease: smooth, repeat: Infinity },
    },
  };
  const legB: Variants = {
    rest: { rotate: 0 },
    hover: {
      rotate: [16, -16, 16],
      transition: { duration: 0.6, ease: smooth, repeat: Infinity },
    },
  };
  const cloudVariants = (dx: number, dur: number): Variants => ({
    rest: { x: 0 },
    hover: {
      x: [0, -dx, 0],
      transition: { duration: dur, ease: smooth, repeat: Infinity },
    },
  });
  const sunVariants: Variants = {
    rest: { rotate: 0, scale: 1 },
    hover: {
      rotate: 360,
      scale: [1, 1.1, 1],
      transition: {
        rotate: { duration: 18, ease: "linear", repeat: Infinity },
        scale: loopTransition(3),
      },
    },
  };

  return (
    <div
      className="absolute inset-0"
      style={{ background: "linear-gradient(180deg, #B0E3F5 0%, #FFE49A 70%, #9DDFAA 100%)" }}
    >
      <svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" className="w-full h-full">
        <defs>
          {/* Bulldog anglais : pelage fauve clair avec taches blanches */}
          <linearGradient id="pw-dog" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#F5D2A0" />
            <stop offset="100%" stopColor="#C88A50" />
          </linearGradient>
          <linearGradient id="pw-dog-dark" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#A66A2F" />
            <stop offset="100%" stopColor="#6B3E1B" />
          </linearGradient>
          <linearGradient id="pw-human" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FF8AAE" />
            <stop offset="100%" stopColor="#C64070" />
          </linearGradient>
          <linearGradient id="pw-hill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#7ACE9E" />
            <stop offset="100%" stopColor="#3E9870" />
          </linearGradient>
        </defs>

        {/* Soleil — toujours en rotation douce */}
        <motion.g
          animate={{ rotate: 360 }}
          transition={{ duration: 40, ease: "linear", repeat: Infinity }}
          style={{ originX: "60px", originY: "40px" }}
        >
          <circle cx="60" cy="40" r="18" fill="#FFF5A8" />
          <g stroke="#FFC340" strokeWidth="2" strokeLinecap="round">
            <line x1="60" y1="12" x2="60" y2="20" />
            <line x1="60" y1="60" x2="60" y2="68" />
            <line x1="32" y1="40" x2="40" y2="40" />
            <line x1="80" y1="40" x2="88" y2="40" />
            <line x1="42" y1="22" x2="46" y2="26" />
            <line x1="74" y1="54" x2="78" y2="58" />
            <line x1="74" y1="22" x2="78" y2="18" />
            <line x1="42" y1="58" x2="46" y2="54" />
          </g>
        </motion.g>

        {/* Nuages — dérivent toujours, indépendamment du hover */}
        <motion.g
          animate={{ x: [0, -60, 0] }}
          transition={{ duration: 14, ease: smooth, repeat: Infinity }}
        >
          <g fill="#FFFFFF" opacity="0.9">
            <ellipse cx="280" cy="45" rx="28" ry="11" />
            <ellipse cx="270" cy="40" rx="15" ry="8" />
            <ellipse cx="292" cy="40" rx="12" ry="6" />
          </g>
        </motion.g>
        <motion.g
          animate={{ x: [0, -50, 0] }}
          transition={{ duration: 18, ease: smooth, repeat: Infinity }}
        >
          <g fill="#FFFFFF" opacity="0.75">
            <ellipse cx="340" cy="28" rx="22" ry="9" />
            <ellipse cx="330" cy="25" rx="12" ry="6" />
          </g>
        </motion.g>

        {/* Collines et paysage */}
        <path d="M 0 150 Q 80 130 160 140 Q 240 130 320 145 Q 360 152 400 145 L 400 165 L 0 165 Z" fill="url(#pw-hill)" opacity="0.65" />
        <path d="M 0 165 Q 100 155 200 162 Q 300 168 400 158 L 400 220 L 0 220 Z" fill="url(#pw-hill)" />

        {/* Arbres en arrière-plan */}
        <g>
          <ellipse cx="70" cy="148" rx="14" ry="20" fill="#2F9264" />
          <rect x="67" y="160" width="6" height="10" fill="#6B3E1B" />
          <ellipse cx="210" cy="152" rx="11" ry="16" fill="#2F9264" />
          <rect x="208" y="160" width="5" height="10" fill="#6B3E1B" />
          <ellipse cx="360" cy="148" rx="14" ry="20" fill="#2F9264" />
          <rect x="357" y="160" width="6" height="10" fill="#6B3E1B" />
        </g>

        {/* Chemin */}
        <path d="M 0 200 Q 200 185 400 200" stroke="#C8A06B" strokeWidth="14" fill="none" strokeLinecap="round" opacity="0.7" />
        <path d="M 0 200 Q 200 185 400 200" stroke="#E6C48A" strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray="4 8" />

        {/* Groupe humain + chien qui se promène */}
        <motion.g animate={state} variants={walkerVariants}>
          <motion.g animate={state} variants={bounceVariants}>
            {/* Humain de profil qui marche (face à droite, sens du mouvement) */}
            <g transform="translate(120, 110)">
              {/* Tête de profil */}
              <g>
                {/* Crâne — ovale plus large vers l'arrière */}
                <ellipse cx="-1" cy="-1" rx="11" ry="12" fill="#FFD9B5" />
                {/* Cheveux qui enrobent l'arrière du crâne */}
                <path d="M -12 -3 Q -13 -13 -2 -13 Q 10 -13 10 -5 L 8 -2 Q 6 -7 -2 -7 Q -9 -6 -11 -1 Z" fill="#6B3E1B" />
                {/* Mèche qui dépasse sur le front */}
                <path d="M 8 -4 Q 10 -8 6 -9 Q 4 -6 6 -3 Z" fill="#8B5A2B" />
                {/* Nez (profil) — petite bosse sur la droite */}
                <path d="M 9 -1 Q 12 1 9 3" fill="#FFD9B5" stroke="#E6A67F" strokeWidth="0.6" />
                {/* Œil (un seul visible, côté face) */}
                <ellipse cx="5" cy="-1" rx="1.6" ry="2" fill="#FFFFFF" />
                <circle cx="5" cy="-1" r="1.3" fill="#1B1108" />
                <circle cx="5.5" cy="-1.5" r="0.4" fill="#FFFFFF" />
                {/* Cil / sourcil */}
                <path d="M 3 -4 Q 5 -5 7 -4" stroke="#6B3E1B" strokeWidth="0.8" fill="none" strokeLinecap="round" />
                {/* Bouche (profil sourire) */}
                <path d="M 6 4 Q 9 5 10 3" stroke="#1B1108" strokeWidth="0.8" fill="none" strokeLinecap="round" />
                {/* Joue rosée */}
                <circle cx="3" cy="3" r="1.6" fill="#FF9CB0" opacity="0.5" />
                {/* Oreille (côté gauche, arrière du profil) */}
                <ellipse cx="-7" cy="1" rx="1.6" ry="2.8" fill="#FFC398" />
                <path d="M -7 -0.5 Q -8 1 -7 2.5" stroke="#D8936A" strokeWidth="0.5" fill="none" />
              </g>

              {/* Cou */}
              <rect x="-2" y="10" width="5" height="5" fill="#FFD9B5" />
              {/* Torse de profil — plus étroit en largeur */}
              <path d="M -6 15 Q -7 28 -6 44 L 7 44 Q 8 28 6 15 Z" fill="url(#pw-human)" />
              {/* Col en V */}
              <path d="M -2 15 Q 0 19 2 15 L 2 20 Q 0 22 -2 20 Z" fill="#D63F63" />
              {/* Ceinture */}
              <rect x="-7" y="42" width="15" height="3" fill="#2A1810" opacity="0.5" />

              {/* Bras arrière (épaule gauche) — pivot exact à l'épaule */}
              <g transform="translate(-3, 17)">
                <motion.g animate={state} variants={legB}>
                  <path d="M 0 0 Q -3 10 -4 22" stroke="#D63F63" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.85" />
                  <circle cx="-4" cy="24" r="3" fill="#FFD9B5" opacity="0.9" />
                </motion.g>
              </g>

              {/* Bras avant qui tient la laisse (épaule droite) */}
              <g transform="translate(3, 17)">
                <motion.g animate={state} variants={legA}>
                  <path d="M 0 0 Q 8 9 18 21" stroke="url(#pw-human)" strokeWidth="5" fill="none" strokeLinecap="round" />
                  <circle cx="8" cy="9" r="2.5" fill="url(#pw-human)" />
                  <circle cx="18" cy="23" r="3.5" fill="#FFD9B5" />
                  <ellipse cx="18" cy="21" rx="3" ry="1.2" fill="#E6A67F" opacity="0.6" />
                </motion.g>
              </g>

              {/* Jambes de profil — une avance, l'autre recule */}
              {/* Jambe avant (legA) — quand le bras avant avance aussi */}
              <g transform="translate(1, 44)">
                <motion.g animate={state} variants={legB}>
                  {/* Cuisse */}
                  <path d="M -3 0 L -4 14 L 3 14 L 4 0 Z" fill="#3E5A82" />
                  {/* Genou */}
                  <ellipse cx="0" cy="14" rx="4" ry="1.8" fill="#2E4564" />
                  {/* Tibia */}
                  <path d="M -3 14 L -4 26 L 3 26 L 4 14 Z" fill="#3E5A82" />
                  {/* Basket profil */}
                  <path d="M -4 25 L -4 29 Q -4 31 -2 31 L 8 31 Q 9 31 9 29 L 9 26 Z" fill="#FFFFFF" stroke="#2A1810" strokeWidth="0.8" />
                  <ellipse cx="3" cy="29" rx="5" ry="0.8" fill="#2A1810" opacity="0.4" />
                  <path d="M -4 29 L 9 29" stroke="#2A1810" strokeWidth="0.4" />
                  <path d="M 4 27 L 8 29" stroke="#FF5D85" strokeWidth="0.8" />
                  <path d="M 2 26 L 6 27" stroke="#FF5D85" strokeWidth="0.6" />
                </motion.g>
              </g>
              {/* Jambe arrière (legB) */}
              <g transform="translate(-1, 44)">
                <motion.g animate={state} variants={legA}>
                  <path d="M -3 0 L -4 14 L 3 14 L 4 0 Z" fill="#2E4564" />
                  <ellipse cx="0" cy="14" rx="4" ry="1.8" fill="#1E3554" />
                  <path d="M -3 14 L -4 26 L 3 26 L 4 14 Z" fill="#2E4564" />
                  <path d="M -4 25 L -4 29 Q -4 31 -2 31 L 8 31 Q 9 31 9 29 L 9 26 Z" fill="#E0E5EC" stroke="#2A1810" strokeWidth="0.8" />
                  <ellipse cx="3" cy="29" rx="5" ry="0.8" fill="#2A1810" opacity="0.4" />
                </motion.g>
              </g>
            </g>

            {/* Laisse */}
            {/* Laisse du bulldog */}
            <path d="M 148 146 Q 175 152 205 156" stroke="#FF5D85" strokeWidth="2" fill="none" strokeDasharray="4 3" />

            {/* BULLDOG de profil — marron avec taches blanches, anim marche */}
            <motion.g
              transform="translate(155, 128)"
              animate={state === "hover" ? { y: [0, -3, 0, -2, 0], rotate: [-1, 1.5, -1] } : { y: 0, rotate: 0 }}
              transition={state === "hover" ? {
                duration: 0.65,
                ease: smooth,
                repeat: Infinity,
              } : { duration: 0.4 }}
              style={{ originX: "50px", originY: "50px" }}
            >
              <BulldogProfile size={90} />
            </motion.g>
          </motion.g>
        </motion.g>
      </svg>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// 4. IllusGrooming — Toilettage
//    Narration : chien dans baignoire → au hover, bulles montent, ciseaux
//    s'activent, brillance apparaît
// ══════════════════════════════════════════════════════════════════════════
export function IllusGrooming({ isHovered }: Props) {
  const state = isHovered ? "hover" : "rest";

  const bubbleVariants = (dur: number, delay: number, drift: number): Variants => ({
    rest: { y: 0, opacity: 0, scale: 0.3, x: 0 },
    hover: {
      y: [0, -40, -80, -120],
      x: [0, drift, -drift, drift * 0.5],
      opacity: [0, 1, 1, 0],
      scale: [0.3, 1, 1.1, 0.8],
      transition: { duration: dur, delay, repeat: Infinity, ease: expressive },
    },
  });
  const scissorVariants: Variants = {
    rest: { rotate: -15 },
    hover: {
      rotate: [-25, 5, -25, 5, -25],
      transition: { duration: 0.75, ease: smooth, repeat: Infinity },
    },
  };
  const shineVariants: Variants = {
    rest: { opacity: 0, scale: 0, rotate: 0 },
    hover: {
      opacity: [0, 1, 0],
      scale: [0.3, 1.4, 0.8],
      rotate: [0, 180, 360],
      transition: { duration: 2, repeat: Infinity, ease: smooth },
    },
  };
  const bodyVariants: Variants = {
    rest: { scale: 1 },
    hover: { scale: [1, 1.025, 1], transition: loopTransition(2.4) },
  };
  const tubVariants: Variants = {
    rest: { rotate: 0 },
    hover: { rotate: [-0.6, 0.6, -0.6], transition: loopTransition(2.2) },
  };

  return (
    <div
      className="absolute inset-0"
      style={{ background: "radial-gradient(circle at 30% 30%, #FFF4DE 0%, #FFD5A2 55%, #FF9A5C 100%)" }}
    >
      <svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" className="w-full h-full">
        <defs>
          <linearGradient id="grm-tub" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#F4F9FF" />
            <stop offset="100%" stopColor="#A8C4FF" />
          </linearGradient>
          <linearGradient id="grm-dog" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFE7C8" />
            <stop offset="100%" stopColor="#D89D62" />
          </linearGradient>
          <linearGradient id="grm-water" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#BDDBFF" />
            <stop offset="100%" stopColor="#6AA1FF" />
          </linearGradient>
        </defs>

        {/* Sol carrelé */}
        <rect x="0" y="180" width="400" height="40" fill="#E6D5C0" />
        <g stroke="#BFA884" strokeWidth="0.5">
          <line x1="0" y1="190" x2="400" y2="190" />
          <line x1="0" y1="205" x2="400" y2="205" />
          {[40, 80, 120, 160, 200, 240, 280, 320, 360].map((x) => (
            <line key={x} x1={x} y1="180" x2={x} y2="220" />
          ))}
        </g>

        {/* Baignoire */}
        <g transform="translate(130, 100)">
          {/* Contour arrière */}
          <ellipse cx="70" cy="10" rx="75" ry="16" fill="#E0E5EC" />
          {/* Corps */}
          <path d="M -5 10 Q -5 80 70 85 Q 145 80 145 10 Z" fill="#F4F6FA" stroke="#B5BDCC" strokeWidth="1.5" />
          {/* Eau */}
          <ellipse cx="70" cy="30" rx="70" ry="12" fill="url(#grm-water)" opacity="0.65" />
          {/* Vagues */}
          <path d="M 10 30 Q 25 26 40 30 Q 55 34 70 30 Q 85 26 100 30 Q 115 34 130 30" stroke="#FFFFFF" strokeWidth="1.5" fill="none" opacity="0.7" />
          {/* Pieds baignoire */}
          <ellipse cx="10" cy="88" rx="6" ry="4" fill="#2A1810" />
          <ellipse cx="130" cy="88" rx="6" ry="4" fill="#2A1810" />
        </g>

        {/* Chien dans la baignoire */}
        <motion.g animate={state} variants={bodyVariants} style={{ originX: "200px", originY: "110px" }}>
        <g transform="translate(170, 60)">
          {/* Corps mouillé (un peu plus foncé) */}
          <ellipse cx="30" cy="50" rx="36" ry="20" fill="url(#grm-dog)" />
          {/* Tête */}
          <circle cx="8" cy="30" r="22" fill="url(#grm-dog)" />
          {/* Oreilles tombantes mouillées */}
          <ellipse cx="-6" cy="25" rx="6" ry="15" fill="#A66A2F" transform="rotate(-20 -6 25)" />
          <ellipse cx="22" cy="18" rx="5" ry="12" fill="#A66A2F" transform="rotate(20 22 18)" />
          {/* Museau */}
          <ellipse cx="8" cy="38" rx="8" ry="6" fill="#FFF0D4" />
          <ellipse cx="8" cy="34" rx="2.5" ry="2" fill="#2A1810" />
          <path d="M 4 42 Q 8 46 12 42" stroke="#2A1810" strokeWidth="1.3" fill="none" strokeLinecap="round" />
          {/* Yeux fermés bonheur */}
          <path d="M -2 28 Q 1 26 4 28" stroke="#2A1810" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M 12 28 Q 15 26 18 28" stroke="#2A1810" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          {/* Joues */}
          <circle cx="-6" cy="34" r="3" fill="#FF9CB0" opacity="0.6" />
          <circle cx="22" cy="34" r="3" fill="#FF9CB0" opacity="0.6" />

          {/* Brillance qui apparaît au hover */}
          <motion.g animate={state} variants={shineVariants} style={{ originX: "8px", originY: "30px" }}>
            <path d="M -4 18 L -2 10 L 0 18 L 8 20 L 0 22 L -2 30 L -4 22 L -12 20 Z" fill="#FFFFFF" opacity="0.85" />
          </motion.g>
        </g>
        </motion.g>

        {/* Bulles qui montent en dérivant */}
        <motion.circle cx="170" cy="130" r="8" fill="#FFFFFF" opacity="0.9" animate={state} variants={bubbleVariants(2.6, 0, 12)} style={{ originX: "170px", originY: "130px" }} />
        <motion.circle cx="195" cy="135" r="6" fill="#FFFFFF" opacity="0.9" animate={state} variants={bubbleVariants(3, 0.4, -10)} style={{ originX: "195px", originY: "135px" }} />
        <motion.circle cx="220" cy="130" r="10" fill="#FFFFFF" opacity="0.9" animate={state} variants={bubbleVariants(2.8, 0.8, 14)} style={{ originX: "220px", originY: "130px" }} />
        <motion.circle cx="245" cy="132" r="7" fill="#FFFFFF" opacity="0.9" animate={state} variants={bubbleVariants(3.2, 1.2, -12)} style={{ originX: "245px", originY: "132px" }} />
        <motion.circle cx="160" cy="125" r="5" fill="#FFFFFF" opacity="0.9" animate={state} variants={bubbleVariants(2.4, 1.6, 8)} style={{ originX: "160px", originY: "125px" }} />
        <motion.circle cx="270" cy="128" r="6" fill="#FFFFFF" opacity="0.9" animate={state} variants={bubbleVariants(3, 2, -8)} style={{ originX: "270px", originY: "128px" }} />

        {/* Ciseaux qui s'ouvrent / ferment */}
        <motion.g animate={state} variants={scissorVariants} style={{ originX: "320px", originY: "80px" }}>
          <g transform="translate(310, 70)">
            <circle cx="5" cy="14" r="7" fill="none" stroke="#2A1810" strokeWidth="2.5" />
            <circle cx="25" cy="14" r="7" fill="none" stroke="#2A1810" strokeWidth="2.5" />
            <path d="M 10 10 L 40 -8 L 44 -4 L 14 16 Z" fill="#C9CBD1" stroke="#2A1810" strokeWidth="1" />
            <path d="M 20 18 L 44 34 L 40 38 L 16 22 Z" fill="#C9CBD1" stroke="#2A1810" strokeWidth="1" />
            <circle cx="16" cy="14" r="2" fill="#FFE066" />
          </g>
        </motion.g>
      </svg>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// 5. IllusTraining — Dressage
//    Narration : chien debout → au hover, il s'assied, une étoile de
//    récompense apparaît, la main du dresseur lui fait signe
// ══════════════════════════════════════════════════════════════════════════
export function IllusTraining({ isHovered }: Props) {
  const state = isHovered ? "hover" : "rest";

  const dogVariants: Variants = {
    rest: { y: 0, scale: 1 },
    hover: {
      y: [0, 12, 12, 0, 0],
      scale: [1, 0.98, 0.98, 1, 1],
      transition: {
        duration: 4,
        times: [0, 0.25, 0.75, 0.85, 1],
        repeat: Infinity,
        ease: smooth,
      },
    },
  };
  const starVariants: Variants = {
    rest: { opacity: 0, scale: 0, rotate: 0 },
    hover: {
      opacity: [0, 1, 1, 0],
      scale: [0.2, 1.3, 1.1, 0.6],
      rotate: [0, 120, 240, 360],
      transition: { duration: 2.4, ease: expressive, repeat: Infinity },
    },
  };
  const handVariants: Variants = {
    rest: { rotate: 0, x: 0 },
    hover: {
      rotate: [-15, 18, -12, 18, -15],
      x: [0, -2, 2, -2, 0],
      transition: { duration: 1.4, ease: smooth, repeat: Infinity },
    },
  };
  const boneVariants: Variants = {
    rest: { rotate: 0, y: 0 },
    hover: {
      rotate: [-10, 10, -10],
      y: [0, -6, 0],
      transition: { duration: 2, ease: smooth, repeat: Infinity },
    },
  };

  return (
    <div
      className="absolute inset-0"
      style={{ background: "radial-gradient(circle at 70% 30%, #E9FCF6 0%, #A8E4CE 55%, #4ECDC4 100%)" }}
    >
      <svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" className="w-full h-full">
        <defs>
          <linearGradient id="trn-dog" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#F5C88C" />
            <stop offset="100%" stopColor="#C88A50" />
          </linearGradient>
          <linearGradient id="trn-skin" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFE0C4" />
            <stop offset="100%" stopColor="#F4BF96" />
          </linearGradient>
        </defs>

        {/* Sol */}
        <path d="M 0 180 Q 200 170 400 180 L 400 220 L 0 220 Z" fill="#3E9870" opacity="0.4" />
        <g stroke="#2F7A58" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.5">
          <path d="M 50 186 L 50 178 M 100 190 L 100 180 M 300 186 L 300 178 M 350 190 L 350 180" />
        </g>

        {/* Main du dresseur qui fait signe */}
        <motion.g animate={state} variants={handVariants} style={{ originX: "90px", originY: "120px" }}>
          <g transform="translate(60, 70)">
            {/* Bras */}
            <path d="M 0 50 Q 10 25 35 20" stroke="#FF5D85" strokeWidth="16" strokeLinecap="round" fill="none" />
            {/* Main */}
            <circle cx="40" cy="20" r="14" fill="url(#trn-skin)" />
            {/* Doigts levés */}
            <path d="M 30 8 Q 34 -4 42 -2 Q 48 2 44 14" fill="url(#trn-skin)" />
            <path d="M 42 4 Q 48 -6 54 -2 Q 58 6 52 14" fill="url(#trn-skin)" />
          </g>
        </motion.g>

        {/* Chien qui s'assied au hover */}
        <motion.g animate={state} variants={dogVariants}>
          <g transform="translate(180, 80)">
            {/* Queue */}
            <path d="M 70 70 Q 90 55 95 25" stroke="url(#trn-dog)" strokeWidth="10" strokeLinecap="round" fill="none" />
            {/* Corps debout/assis selon y */}
            <path d="M 20 90 Q 10 60 40 50 Q 70 50 70 80 L 65 98 Q 40 105 20 90 Z" fill="url(#trn-dog)" />
            {/* Pattes avant */}
            <rect x="32" y="82" width="8" height="26" rx="4" fill="url(#trn-dog)" />
            <rect x="46" y="82" width="8" height="26" rx="4" fill="url(#trn-dog)" />
            {/* Tête attentive */}
            <circle cx="28" cy="42" r="22" fill="url(#trn-dog)" />
            {/* Oreilles dressées */}
            <path d="M 14 28 Q 10 12 22 16 Q 26 26 24 38 Z" fill="#A66A2F" />
            <path d="M 42 28 Q 46 12 34 16 Q 30 26 32 38 Z" fill="#A66A2F" />
            {/* Museau */}
            <ellipse cx="28" cy="52" rx="9" ry="7" fill="#FFE8C8" />
            <ellipse cx="28" cy="47" rx="3" ry="2.5" fill="#2A1810" />
            <path d="M 24 56 Q 28 60 32 56" stroke="#2A1810" strokeWidth="1.3" fill="none" strokeLinecap="round" />
            {/* Yeux attentifs */}
            <circle cx="22" cy="38" r="3" fill="#1B1108" />
            <circle cx="34" cy="38" r="3" fill="#1B1108" />
            <circle cx="23" cy="37" r="1" fill="#FFFFFF" />
            <circle cx="35" cy="37" r="1" fill="#FFFFFF" />
            {/* Sourcils */}
            <path d="M 17 32 Q 22 30 27 32" stroke="#8B5526" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.6" />
            <path d="M 29 32 Q 34 30 39 32" stroke="#8B5526" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.6" />
          </g>
        </motion.g>

        {/* Étoile de récompense */}
        <motion.g animate={state} variants={starVariants} style={{ originX: "330px", originY: "50px" }}>
          <g transform="translate(315, 35)">
            <path d="M 16 0 L 20 12 L 32 12 L 22 20 L 26 32 L 16 24 L 6 32 L 10 20 L 0 12 L 12 12 Z" fill="#FFE066" stroke="#C0891C" strokeWidth="1.5" />
            <circle cx="16" cy="16" r="5" fill="#FFFBD6" />
          </g>
        </motion.g>
      </svg>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// 6. IllusTransport — Transport
//    Narration : voiture avec animal dans caisse → au hover, la voiture
//    traverse le décor (avec paysage qui défile)
// ══════════════════════════════════════════════════════════════════════════
export function IllusTransport({ isHovered }: Props) {
  const state = isHovered ? "hover" : "rest";

  // La voiture fait un aller-retour (rest → vers la droite, puis revient).
  // Mirror permet un retour fluide sans saut.
  const carVariants: Variants = {
    rest: { x: -80, y: 0 },
    hover: {
      x: [-80, 60, -80],
      y: [0, -2, 0, -2, 0, -2, 0],
      transition: {
        x: { duration: 7, ease: smooth, repeat: Infinity },
        y: { duration: 0.35, repeat: Infinity, ease: smooth },
      },
    },
  };
  const wheelVariants: Variants = {
    rest: { rotate: 0 },
    hover: { rotate: 360, transition: { duration: 0.6, ease: "linear", repeat: Infinity } },
  };
  // La route défile à la même vitesse apparente que la voiture
  const roadVariants: Variants = {
    rest: { x: 0 },
    hover: { x: [-40, 0], transition: { duration: 0.5, ease: "linear", repeat: Infinity } },
  };
  const cloudVariants = (dx: number, dur: number): Variants => ({
    rest: { x: 0 },
    hover: {
      x: [0, -dx, 0],
      transition: { duration: dur, ease: smooth, repeat: Infinity },
    },
  });
  const hillVariants = (dx: number, dur: number): Variants => ({
    rest: { x: 0 },
    hover: {
      x: [0, -dx, 0],
      transition: { duration: dur, ease: smooth, repeat: Infinity },
    },
  });

  return (
    <div
      className="absolute inset-0"
      style={{ background: "linear-gradient(180deg, #B0E3F5 0%, #E5EEFF 60%, #6A8FE0 100%)" }}
    >
      <svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" className="w-full h-full">
        <defs>
          <linearGradient id="trp-car" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FF8A9E" />
            <stop offset="100%" stopColor="#D63F63" />
          </linearGradient>
          <linearGradient id="trp-window" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#F4F9FF" />
            <stop offset="100%" stopColor="#A8C4FF" />
          </linearGradient>
        </defs>

        {/* Nuages qui défilent — toujours animés (indépendant du hover) */}
        <motion.g
          animate={{ x: [0, -420] }}
          transition={{ duration: 22, ease: "linear", repeat: Infinity }}
        >
          <g fill="#FFFFFF" opacity="0.9">
            <ellipse cx="60" cy="45" rx="26" ry="10" />
            <ellipse cx="48" cy="40" rx="14" ry="8" />
            <ellipse cx="72" cy="40" rx="11" ry="6" />
            <ellipse cx="420" cy="45" rx="26" ry="10" />
            <ellipse cx="408" cy="40" rx="14" ry="8" />
          </g>
        </motion.g>
        <motion.g
          animate={{ x: [0, -420] }}
          transition={{ duration: 28, ease: "linear", repeat: Infinity }}
        >
          <g fill="#FFFFFF" opacity="0.7">
            <ellipse cx="220" cy="30" rx="22" ry="9" />
            <ellipse cx="210" cy="26" rx="12" ry="6" />
            <ellipse cx="580" cy="30" rx="22" ry="9" />
          </g>
        </motion.g>

        {/* Collines lointaines */}
        <path d="M 0 150 Q 100 130 200 140 Q 300 150 400 135 L 400 175 L 0 175 Z" fill="#6D9FE0" opacity="0.45" />
        <path d="M 0 160 Q 120 145 240 155 Q 330 162 400 152 L 400 175 L 0 175 Z" fill="#4F7DC4" opacity="0.5" />

        {/* Route */}
        <rect x="0" y="160" width="400" height="40" fill="#2F3A55" />
        <rect x="0" y="160" width="400" height="3" fill="#1A2238" />
        <rect x="0" y="197" width="400" height="3" fill="#1A2238" />
        {/* Pointillés qui défilent */}
        <motion.g animate={state} variants={roadVariants}>
          <g stroke="#FFE066" strokeWidth="3">
            {[0, 36, 72, 108, 144, 180, 216, 252, 288, 324, 360, 396, 432].map((x) => (
              <line key={x} x1={x} y1="180" x2={x + 20} y2="180" />
            ))}
          </g>
        </motion.g>

        {/* Voiture + caisse de transport */}
        <motion.g animate={state} variants={carVariants}>
          <g transform="translate(80, 100)">
            {/* Carrosserie */}
            <path d="M 10 50 L 25 25 L 85 22 L 120 28 L 150 50 L 150 75 Q 150 82 140 82 L 20 82 Q 10 82 10 75 Z" fill="url(#trp-car)" />
            {/* Toit arrondi */}
            <path d="M 25 25 L 85 22 Q 105 22 120 28 L 85 28 Q 50 25 25 25 Z" fill="#FFFFFF" opacity="0.3" />
            {/* Vitres */}
            <path d="M 32 30 L 40 50 L 80 50 L 80 26 Z" fill="url(#trp-window)" stroke="#2A1810" strokeWidth="1" />
            <path d="M 90 26 L 90 50 L 130 50 L 122 30 Z" fill="url(#trp-window)" stroke="#2A1810" strokeWidth="1" />
            {/* Animal dans la vitre arrière (visible) */}
            <g transform="translate(98, 32)">
              <circle cx="0" cy="5" r="8" fill="#E9B070" />
              <ellipse cx="-5" cy="0" rx="3" ry="5" fill="#8B5526" transform="rotate(-20 -5 0)" />
              <ellipse cx="5" cy="0" rx="3" ry="5" fill="#8B5526" transform="rotate(20 5 0)" />
              <circle cx="-2" cy="5" r="1" fill="#1B1108" />
              <circle cx="2" cy="5" r="1" fill="#1B1108" />
              <ellipse cx="0" cy="9" rx="3" ry="2" fill="#FFE8C8" />
              <path d="M -2 10 Q 0 12 2 10" stroke="#2A1810" strokeWidth="0.7" fill="none" />
              {/* Langue qui pend */}
              <ellipse cx="1" cy="12" rx="1.2" ry="2" fill="#FF5D85" />
            </g>
            {/* Portière */}
            <line x1="80" y1="30" x2="80" y2="80" stroke="#2A1810" strokeWidth="1" />
            {/* Poignée */}
            <rect x="56" y="60" width="10" height="3" rx="1" fill="#2A1810" />
            {/* Phare avant */}
            <ellipse cx="147" cy="55" rx="3" ry="4" fill="#FFFBD6" />
          </g>

          {/* Roues */}
          <motion.g animate={state} variants={wheelVariants} style={{ originX: "110px", originY: "185px" }}>
            <circle cx="110" cy="185" r="14" fill="#1A1A1A" />
            <circle cx="110" cy="185" r="7" fill="#9DA4B5" />
            <g stroke="#1A1A1A" strokeWidth="1.2">
              <line x1="103" y1="185" x2="117" y2="185" />
              <line x1="110" y1="178" x2="110" y2="192" />
              <line x1="104.5" y1="179.5" x2="115.5" y2="190.5" />
              <line x1="115.5" y1="179.5" x2="104.5" y2="190.5" />
            </g>
          </motion.g>
          <motion.g animate={state} variants={wheelVariants} style={{ originX: "195px", originY: "185px" }}>
            <circle cx="195" cy="185" r="14" fill="#1A1A1A" />
            <circle cx="195" cy="185" r="7" fill="#9DA4B5" />
            <g stroke="#1A1A1A" strokeWidth="1.2">
              <line x1="188" y1="185" x2="202" y2="185" />
              <line x1="195" y1="178" x2="195" y2="192" />
              <line x1="189.5" y1="179.5" x2="200.5" y2="190.5" />
              <line x1="200.5" y1="179.5" x2="189.5" y2="190.5" />
            </g>
          </motion.g>
        </motion.g>
      </svg>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// 7. IllusOvernight — Pension / Garde de nuit
//    Narration : maison de nuit → au hover, la lune brille, étoiles qui
//    scintillent, Zzz qui s'envolent de la cheminée
// ══════════════════════════════════════════════════════════════════════════
export function IllusOvernight({ isHovered }: Props) {
  const state = isHovered ? "hover" : "rest";

  const moonVariants: Variants = {
    rest: { scale: 1, rotate: 0 },
    hover: {
      scale: [1, 1.1, 1],
      rotate: [0, 3, 0],
      transition: loopTransition(3),
    },
  };
  const starVariants = (delay: number): Variants => ({
    rest: { opacity: 0.4, scale: 1 },
    hover: {
      opacity: [0.3, 1, 0.3],
      scale: [0.8, 1.3, 0.8],
      transition: { duration: 2.2, delay, repeat: Infinity, ease: smooth },
    },
  });
  const smokeVariants = (dur: number, delay: number, drift: number): Variants => ({
    rest: { opacity: 0, y: 0, x: 0, scale: 0.6 },
    hover: {
      opacity: [0, 0.8, 0],
      y: [0, -25, -55, -85],
      x: [0, drift, drift * 1.5, drift * 2],
      scale: [0.6, 1, 1.3, 1.6],
      transition: { duration: dur, delay, repeat: Infinity, ease: expressive },
    },
  });
  const zVariants = (dur: number, delay: number): Variants => ({
    rest: { opacity: 0, y: 0, x: 0, scale: 0.5, rotate: 0 },
    hover: {
      opacity: [0, 1, 1, 0],
      y: [0, -25, -55, -85],
      x: [0, 8, -4, 20],
      scale: [0.5, 1, 1.2, 0.9],
      rotate: [0, -10, 8, 0],
      transition: { duration: dur, delay, repeat: Infinity, ease: expressive },
    },
  });
  const catVariants: Variants = {
    rest: { scale: 1 },
    hover: { scale: [1, 1.02, 1], transition: loopTransition(2.6) },
  };
  const catTailVariants: Variants = {
    rest: { rotate: 0 },
    hover: { rotate: [-8, 12, -8], transition: { duration: 2.4, ease: smooth, repeat: Infinity } },
  };
  const windowVariants: Variants = {
    rest: { opacity: 0.12 },
    hover: { opacity: [0.12, 0.25, 0.12], transition: loopTransition(2) },
  };

  return (
    <div
      className="absolute inset-0"
      style={{ background: "radial-gradient(circle at 85% 20%, #241B54 0%, #433784 55%, #8472D2 100%)" }}
    >
      <svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" className="w-full h-full">
        {/* Lune */}
        <motion.g animate={state} variants={moonVariants} style={{ originX: "330px", originY: "45px" }}>
          <circle cx="330" cy="45" r="32" fill="#FFEEB8" opacity="0.4" />
          <circle cx="330" cy="45" r="22" fill="#FFFBD6" />
          <circle cx="338" cy="39" r="18" fill="#433784" opacity="0.9" />
          <circle cx="322" cy="50" r="2.5" fill="#E8C65C" opacity="0.55" />
          <circle cx="332" cy="56" r="1.8" fill="#E8C65C" opacity="0.45" />
        </motion.g>

        {/* Étoiles */}
        <motion.circle cx="80" cy="35" r="2.5" fill="#FFE066" animate={state} variants={starVariants(0)} />
        <motion.circle cx="140" cy="55" r="2" fill="#FFE066" animate={state} variants={starVariants(0.4)} />
        <motion.circle cx="50" cy="90" r="1.8" fill="#FFE066" animate={state} variants={starVariants(0.8)} />
        <motion.circle cx="250" cy="45" r="2.2" fill="#FFE066" animate={state} variants={starVariants(0.2)} />
        <motion.circle cx="200" cy="28" r="1.4" fill="#FFE066" animate={state} variants={starVariants(1)} />
        <motion.path
          d="M 175 30 L 177 24 L 179 30 L 185 32 L 179 34 L 177 40 L 175 34 L 169 32 Z"
          fill="#FFFFFF"
          animate={state}
          variants={starVariants(0.6)}
        />

        {/* Sol */}
        <path d="M 0 180 Q 200 170 400 180 L 400 220 L 0 220 Z" fill="#1E1645" />

        {/* Maison */}
        <g transform="translate(110, 90)">
          {/* Corps */}
          <rect x="0" y="50" width="95" height="68" fill="#FAEBE1" stroke="#2A1810" strokeWidth="1.5" />
          {/* Planches horizontales */}
          <line x1="0" y1="65" x2="95" y2="65" stroke="#C9A489" strokeWidth="0.8" />
          <line x1="0" y1="82" x2="95" y2="82" stroke="#C9A489" strokeWidth="0.8" />
          <line x1="0" y1="99" x2="95" y2="99" stroke="#C9A489" strokeWidth="0.8" />
          {/* Toit */}
          <path d="M -12 55 L 48 -2 L 108 55 Z" fill="#FF7D9C" stroke="#2A1810" strokeWidth="1.5" />
          <line x1="-6" y1="42" x2="104" y2="42" stroke="#B33660" strokeWidth="0.6" />
          <line x1="0" y1="30" x2="96" y2="30" stroke="#B33660" strokeWidth="0.6" />
          {/* Cheminée */}
          <rect x="70" y="10" width="12" height="20" fill="#8B5A2B" stroke="#2A1810" strokeWidth="1" />
          {/* Fumée qui monte en dérivant */}
          <motion.circle cx="76" cy="2" r="4" fill="#FFFFFF" animate={state} variants={smokeVariants(3, 0, 6)} style={{ originX: "76px", originY: "2px" }} />
          <motion.circle cx="80" cy="0" r="5" fill="#FFFFFF" animate={state} variants={smokeVariants(3.4, 0.6, -4)} style={{ originX: "80px", originY: "0px" }} />
          <motion.circle cx="74" cy="-6" r="6" fill="#FFFFFF" animate={state} variants={smokeVariants(3.8, 1.2, 5)} style={{ originX: "74px", originY: "-6px" }} />
          <motion.circle cx="78" cy="-10" r="4" fill="#FFFFFF" animate={state} variants={smokeVariants(3.2, 1.8, -3)} style={{ originX: "78px", originY: "-10px" }} />
          {/* Porte */}
          <rect x="38" y="72" width="22" height="46" fill="#6B3E1B" stroke="#2A1810" strokeWidth="1.3" />
          <circle cx="55" cy="94" r="1.5" fill="#FFE066" />
          {/* Fenêtre éclairée */}
          <rect x="12" y="62" width="18" height="16" fill="#FFE066" stroke="#2A1810" strokeWidth="1.3" />
          <line x1="21" y1="62" x2="21" y2="78" stroke="#2A1810" strokeWidth="0.8" />
          <line x1="12" y1="70" x2="30" y2="70" stroke="#2A1810" strokeWidth="0.8" />
          {/* Halo fenêtre pulsant */}
          <motion.circle cx="21" cy="70" r="30" fill="#FFE066" animate={state} variants={windowVariants} />
        </g>

        {/* Chat sur le paillasson */}
        <motion.g animate={state} variants={catVariants} style={{ originX: "240px", originY: "183px" }}>
          <g transform="translate(220, 165)">
            <ellipse cx="20" cy="20" rx="30" ry="8" fill="#8A857D" />
            <ellipse cx="10" cy="16" rx="12" ry="8" fill="#D4D1CC" />
            <path d="M 4 14 L 2 6 L 9 12 Z" fill="#D4D1CC" />
            <path d="M 14 12 L 14 4 L 19 12 Z" fill="#D4D1CC" />
            {/* Yeux fermés */}
            <path d="M 6 16 Q 8 14 10 16" stroke="#2A2520" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            <path d="M 12 16 Q 14 14 16 16" stroke="#2A2520" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            {/* Queue qui s'enroule */}
            <motion.g animate={state} variants={catTailVariants} style={{ originX: "48px", originY: "20px" }}>
              <path d="M 48 20 Q 60 12 55 0" stroke="#8A857D" strokeWidth="7" strokeLinecap="round" fill="none" />
            </motion.g>
          </g>
        </motion.g>

        {/* Z qui s'échappent de la maison */}
        <motion.text
          x="150"
          y="80"
          fontSize="16"
          fill="#FFFFFF"
          opacity="0"
          style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontWeight: 700 }}
          animate={state}
          variants={zVariants(3, 0)}
        >
          z
        </motion.text>
        <motion.text
          x="160"
          y="70"
          fontSize="22"
          fill="#FFFFFF"
          opacity="0"
          style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontWeight: 700 }}
          animate={state}
          variants={zVariants(3, 1)}
        >
          Z
        </motion.text>
      </svg>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// 8. IllusHealth — Santé / Vétérinaire
//    Narration : patte avec stéthoscope → au hover, cœur ECG bat
// ══════════════════════════════════════════════════════════════════════════
export function IllusHealth({ isHovered }: Props) {
  const state = isHovered ? "hover" : "rest";

  const heartVariants: Variants = {
    rest: { scale: 1 },
    hover: { scale: [1, 1.15, 1, 1.1, 1], transition: { duration: 1.2, repeat: Infinity, ease: "easeInOut" } },
  };
  const ecgVariants: Variants = {
    rest: { pathLength: 0 },
    hover: { pathLength: [0, 1, 1], transition: { duration: 2.4, repeat: Infinity, ease: "easeInOut", times: [0, 0.7, 1] } },
  };
  const stethoVariants: Variants = {
    rest: { rotate: 0 },
    hover: { rotate: [0, -5, 5, 0], transition: loopTransition(2) },
  };
  const crossVariants: Variants = {
    rest: { scale: 1 },
    hover: { scale: [1, 1.06, 1], transition: loopTransition(1.6) },
  };

  return (
    <div
      className="absolute inset-0"
      style={{ background: "radial-gradient(circle at 28% 22%, #FFEFF4 0%, #FFBFD1 55%, #FF85A8 100%)" }}
    >
      <svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" className="w-full h-full">
        <defs>
          <linearGradient id="hl-heart" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FF7A9A" />
            <stop offset="100%" stopColor="#D63F63" />
          </linearGradient>
        </defs>

        {/* Sol */}
        <path d="M 0 180 Q 200 170 400 180 L 400 220 L 0 220 Z" fill="#C54A6A" opacity="0.3" />

        {/* Courbe ECG en arrière-plan */}
        <motion.path
          d="M 20 130 L 80 130 L 90 110 L 100 150 L 110 100 L 120 130 L 180 130 L 190 110 L 200 150 L 210 100 L 220 130 L 380 130"
          stroke="#D63F63"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          animate={state}
          variants={ecgVariants}
          opacity="0.5"
        />

        {/* Croix médicale */}
        <motion.g animate={state} variants={crossVariants} style={{ originX: "100px", originY: "90px" }}>
          <g transform="translate(70, 50)">
            <rect x="22" y="0" width="22" height="80" rx="6" fill="#FFFFFF" stroke="#E5869B" strokeWidth="1.5" />
            <rect x="0" y="29" width="66" height="22" rx="6" fill="#FFFFFF" stroke="#E5869B" strokeWidth="1.5" />
            <path d="M 22 29 L 44 29 L 44 51 L 22 51 Z" fill="#FFA1B4" opacity="0.35" />
          </g>
        </motion.g>

        {/* Cœur-patte qui bat */}
        <motion.g animate={state} variants={heartVariants} style={{ originX: "230px", originY: "115px" }}>
          <g transform="translate(200, 85)">
            <path d="M 30 44 Q 6 44 6 22 Q 6 2 30 2 Q 54 2 54 22 Q 54 44 30 44 Z" fill="url(#hl-heart)" />
            <g fill="url(#hl-heart)">
              <ellipse cx="14" cy="8" rx="7" ry="8" />
              <ellipse cx="30" cy="2" rx="7" ry="8" />
              <ellipse cx="46" cy="8" rx="7" ry="8" />
              <ellipse cx="54" cy="22" rx="6" ry="7" />
            </g>
            <g fill="#FFFFFF" opacity="0.7">
              <ellipse cx="18" cy="28" rx="5" ry="4" />
              <ellipse cx="30" cy="32" rx="5" ry="4" />
              <ellipse cx="42" cy="28" rx="5" ry="4" />
            </g>
          </g>
        </motion.g>

        {/* Stéthoscope qui oscille */}
        <motion.g animate={state} variants={stethoVariants} style={{ originX: "290px", originY: "55px" }}>
          <g transform="translate(275, 50)">
            <circle cx="0" cy="0" r="5" fill="#2A1810" />
            <circle cx="0" cy="0" r="2" fill="#8894AD" />
            <path d="M 0 0 Q 0 40 30 40 Q 55 40 55 80" stroke="#2A1810" strokeWidth="3.5" fill="none" strokeLinecap="round" />
            <circle cx="55" cy="95" r="12" fill="#2A1810" />
            <circle cx="55" cy="95" r="7" fill="#FFE066" />
            <circle cx="55" cy="95" r="4" fill="#FFFBD6" />
          </g>
        </motion.g>
      </svg>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// 9. IllusAgility — Agilité
//    Narration : parcours d'obstacles → au hover, le chien traverse le
//    parcours en sautant les haies
// ══════════════════════════════════════════════════════════════════════════
export function IllusAgility({ isHovered }: Props) {
  const state = isHovered ? "hover" : "rest";

  // Le chien part du bord gauche, saute une haie au milieu, termine à droite
  const dogVariants: Variants = {
    rest: { x: 0 },
    hover: {
      x: [0, 110, 230, 340],
      transition: { duration: 3.6, times: [0, 0.33, 0.66, 1], ease: "linear", repeat: Infinity },
    },
  };
  const jumpVariants: Variants = {
    rest: { y: 0 },
    hover: {
      y: [0, 0, -30, 0, 0, -30, 0, 0, -30, 0],
      transition: { duration: 3.6, ease: "easeOut", repeat: Infinity, times: [0, 0.1, 0.16, 0.22, 0.42, 0.48, 0.54, 0.75, 0.82, 0.88] },
    },
  };
  const tailVariants: Variants = {
    rest: { rotate: 0 },
    hover: { rotate: [0, 25, -5, 25, 0], transition: loopTransition(0.5) },
  };
  const trophyVariants: Variants = {
    rest: { opacity: 0.3, rotate: 0 },
    hover: { opacity: 1, rotate: [0, -8, 8, 0], transition: loopTransition(2) },
  };

  return (
    <div
      className="absolute inset-0"
      style={{ background: "linear-gradient(180deg, #E9F5FF 0%, #ACDDF5 60%, #7CC3E0 100%)" }}
    >
      <svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" className="w-full h-full">
        <defs>
          <linearGradient id="ag-dog" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#F7DFA0" />
            <stop offset="100%" stopColor="#D8954E" />
          </linearGradient>
          <linearGradient id="ag-grass" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#7ACE9E" />
            <stop offset="100%" stopColor="#3E9870" />
          </linearGradient>
          <linearGradient id="ag-pole" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FF8A85" />
            <stop offset="100%" stopColor="#D93F4C" />
          </linearGradient>
        </defs>

        {/* Nuages qui dérivent toujours */}
        <motion.g
          animate={{ x: [0, -30, 0] }}
          transition={{ duration: 16, ease: smooth, repeat: Infinity }}
        >
          <ellipse cx="320" cy="40" r="14" fill="#FFFFFF" opacity="0.85" />
          <ellipse cx="306" cy="38" rx="8" ry="5" fill="#FFFFFF" opacity="0.8" />
        </motion.g>
        <motion.g
          animate={{ x: [0, 25, 0] }}
          transition={{ duration: 20, ease: smooth, repeat: Infinity }}
        >
          <ellipse cx="180" cy="50" rx="14" ry="6" fill="#FFFFFF" opacity="0.75" />
          <ellipse cx="172" cy="47" rx="8" ry="4" fill="#FFFFFF" opacity="0.7" />
        </motion.g>

        {/* Soleil — tourne toujours */}
        <motion.g
          animate={{ rotate: 360 }}
          transition={{ duration: 50, ease: "linear", repeat: Infinity }}
          style={{ originX: "60px", originY: "32px" }}
        >
          <circle cx="60" cy="32" r="14" fill="#FFE066" />
          <circle cx="60" cy="32" r="9" fill="#FFF8B0" />
          <g stroke="#FFC340" strokeWidth="1.5" strokeLinecap="round">
            <line x1="60" y1="12" x2="60" y2="16" />
            <line x1="60" y1="48" x2="60" y2="52" />
            <line x1="40" y1="32" x2="44" y2="32" />
            <line x1="76" y1="32" x2="80" y2="32" />
            <line x1="46" y1="18" x2="48" y2="20" />
            <line x1="72" y1="44" x2="74" y2="46" />
            <line x1="72" y1="18" x2="74" y2="20" />
            <line x1="46" y1="44" x2="48" y2="46" />
          </g>
        </motion.g>

        {/* Terrain d'entraînement */}
        <path d="M 0 175 Q 200 160 400 175 L 400 220 L 0 220 Z" fill="url(#ag-grass)" />
        {/* Brins d'herbe */}
        <g stroke="#1F7A52" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.5">
          <path d="M 20 180 L 20 173" />
          <path d="M 50 182 L 50 173" />
          <path d="M 90 180 L 90 173" />
          <path d="M 350 180 L 350 173" />
          <path d="M 380 182 L 380 173" />
        </g>

        {/* Obstacle 1 — Haie basse */}
        <g transform="translate(80, 120)">
          <rect x="0" y="0" width="8" height="55" rx="2" fill="#FFFFFF" stroke="#2A1810" strokeWidth="1.2" />
          <rect x="72" y="0" width="8" height="55" rx="2" fill="#FFFFFF" stroke="#2A1810" strokeWidth="1.2" />
          <rect x="4" y="10" width="76" height="6" rx="2" fill="url(#ag-pole)" />
          <rect x="4" y="30" width="76" height="6" rx="2" fill="url(#ag-pole)" />
          <rect x="22" y="10" width="10" height="6" fill="#FFFFFF" />
          <rect x="50" y="10" width="10" height="6" fill="#FFFFFF" />
          <rect x="22" y="30" width="10" height="6" fill="#FFFFFF" />
          <rect x="50" y="30" width="10" height="6" fill="#FFFFFF" />
        </g>

        {/* Obstacle 2 — Tunnel */}
        <g transform="translate(200, 135)">
          <path d="M 0 40 Q 0 0 40 0 L 70 0 Q 110 0 110 40 L 100 40 Q 100 10 70 10 L 40 10 Q 10 10 10 40 Z" fill="#4ECDC4" />
          <ellipse cx="55" cy="5" rx="30" ry="3" fill="#2EA39B" opacity="0.5" />
          <path d="M 10 40 L 100 40" stroke="#2A1810" strokeWidth="0.8" />
          {/* Bandes */}
          <path d="M 20 10 L 20 40" stroke="#2EA39B" strokeWidth="1.5" opacity="0.4" />
          <path d="M 55 5 L 55 40" stroke="#2EA39B" strokeWidth="1.5" opacity="0.4" />
          <path d="M 90 10 L 90 40" stroke="#2EA39B" strokeWidth="1.5" opacity="0.4" />
        </g>

        {/* Slalom — poteaux */}
        <g transform="translate(335, 130)">
          <rect x="0" y="0" width="4" height="45" rx="1" fill="#FF5D85" />
          <rect x="12" y="0" width="4" height="45" rx="1" fill="#FF5D85" />
          <rect x="24" y="0" width="4" height="45" rx="1" fill="#FF5D85" />
          <rect x="36" y="0" width="4" height="45" rx="1" fill="#FF5D85" />
          <circle cx="2" cy="0" r="3" fill="#FFE066" />
          <circle cx="14" cy="0" r="3" fill="#FFE066" />
          <circle cx="26" cy="0" r="3" fill="#FFE066" />
          <circle cx="38" cy="0" r="3" fill="#FFE066" />
        </g>

        {/* Trophée animé au coin */}
        <motion.g animate={state} variants={trophyVariants} style={{ originX: "30px", originY: "180px" }}>
          <g transform="translate(15, 160)">
            <rect x="10" y="22" width="12" height="6" fill="#8B5A2B" />
            <rect x="6" y="28" width="20" height="4" fill="#6B3E1B" />
            <path d="M 4 0 L 28 0 L 26 18 Q 16 24 6 18 Z" fill="#FFE066" stroke="#C0891C" strokeWidth="1.2" />
            <path d="M 0 4 Q 2 12 8 12" stroke="#C0891C" strokeWidth="1.5" fill="none" />
            <path d="M 32 4 Q 30 12 24 12" stroke="#C0891C" strokeWidth="1.5" fill="none" />
            <text x="16" y="15" fontSize="9" textAnchor="middle" fill="#C0891C" style={{ fontFamily: "sans-serif", fontWeight: 900 }}>
              1
            </text>
          </g>
        </motion.g>

        {/* Chien qui traverse le parcours — face à droite, sens du mouvement */}
        <motion.g animate={state} variants={dogVariants}>
          <motion.g animate={state} variants={jumpVariants}>
            <g transform="translate(20, 135)">
              {/* Queue à gauche (arrière du chien qui court vers la droite) */}
              <motion.g animate={state} variants={tailVariants} style={{ originX: "-4px", originY: "8px" }}>
                <path d="M -4 8 Q -16 -4 -16 -16" stroke="url(#ag-dog)" strokeWidth="7" strokeLinecap="round" fill="none" />
              </motion.g>
              {/* Corps */}
              <ellipse cx="24" cy="18" rx="28" ry="13" fill="url(#ag-dog)" />
              {/* Pattes arrière (gauche, tendues vers l'arrière) */}
              <rect x="6" y="26" width="6" height="14" rx="3" fill="url(#ag-dog)" transform="rotate(-15 9 33)" />
              <rect x="16" y="26" width="6" height="14" rx="3" fill="url(#ag-dog)" transform="rotate(-10 19 33)" />
              {/* Pattes avant (droite, tendues vers l'avant) */}
              <rect x="32" y="26" width="6" height="14" rx="3" fill="url(#ag-dog)" transform="rotate(10 35 33)" />
              <rect x="42" y="26" width="6" height="14" rx="3" fill="url(#ag-dog)" transform="rotate(15 45 33)" />
              {/* Tête à droite */}
              <circle cx="52" cy="12" r="13" fill="url(#ag-dog)" />
              {/* Oreilles au vent — partent en arrière */}
              <ellipse cx="44" cy="2" rx="3.5" ry="8" fill="#A66A2F" transform="rotate(25 44 2)" />
              <ellipse cx="56" cy="0" rx="4" ry="10" fill="#A66A2F" transform="rotate(40 56 0)" />
              {/* Museau pointant à droite */}
              <ellipse cx="61" cy="16" rx="5" ry="3.5" fill="#FFE8C8" />
              <ellipse cx="64" cy="15" rx="2" ry="1.5" fill="#2A1810" />
              {/* Langue qui dépasse en courant */}
              <ellipse cx="63" cy="20" rx="2" ry="3.5" fill="#FF5D85" />
              {/* Œil déterminé */}
              <circle cx="53" cy="10" r="1.8" fill="#1B1108" />
              <circle cx="53.5" cy="9.5" r="0.5" fill="#FFFFFF" />
              {/* Sourcil concentré */}
              <path d="M 48 5 Q 53 3 58 5" stroke="#8B5526" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.7" />
              {/* Collier */}
              <path d="M 34 22 Q 42 26 50 22" stroke="#FF5D85" strokeWidth="2" fill="none" />
              <circle cx="43" cy="25" r="2" fill="#FFE066" />
            </g>
          </motion.g>
        </motion.g>
      </svg>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// 10. IllusGeneric — Fallback : patte + étincelles
// ══════════════════════════════════════════════════════════════════════════
export function IllusGeneric({ isHovered }: Props) {
  const state = isHovered ? "hover" : "rest";

  const pawVariants: Variants = {
    rest: { scale: 1 },
    hover: { scale: [1, 1.05, 1], transition: loopTransition(2.4) },
  };
  const sparkleVariants = (delay: number): Variants => ({
    rest: { opacity: 0, scale: 0 },
    hover: { opacity: [0, 1, 0], scale: [0.4, 1.1, 0.6], transition: { duration: 1.8, delay, repeat: Infinity, ease: "easeInOut" } },
  });

  return (
    <div
      className="absolute inset-0"
      style={{ background: "radial-gradient(circle at 30% 30%, #FFF5E6 0%, #FFD1A8 55%, #FF9E70 100%)" }}
    >
      <svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" className="w-full h-full">
        <path d="M 0 180 Q 200 170 400 180 L 400 220 L 0 220 Z" fill="#CE6B3E" opacity="0.3" />

        {/* Grande patte */}
        <motion.g animate={state} variants={pawVariants} style={{ originX: "200px", originY: "110px" }}>
          <g transform="translate(135, 50)">
            <ellipse cx="70" cy="85" rx="46" ry="34" fill="#FFFFFF" />
            <ellipse cx="20" cy="40" rx="14" ry="18" fill="#FFFFFF" />
            <ellipse cx="55" cy="22" rx="15" ry="18" fill="#FFFFFF" />
            <ellipse cx="88" cy="22" rx="15" ry="18" fill="#FFFFFF" />
            <ellipse cx="120" cy="40" rx="14" ry="18" fill="#FFFFFF" />
            <g fill="#FFCE9A" opacity="0.3">
              <ellipse cx="70" cy="95" rx="30" ry="18" />
            </g>
          </g>
        </motion.g>

        {/* Étincelles */}
        <motion.path
          d="M 60 80 L 62 74 L 64 80 L 70 82 L 64 84 L 62 90 L 60 84 L 54 82 Z"
          fill="#FFFFFF"
          animate={state}
          variants={sparkleVariants(0)}
          style={{ originX: "62px", originY: "82px" }}
        />
        <motion.path
          d="M 330 60 L 332 54 L 334 60 L 340 62 L 334 64 L 332 70 L 330 64 L 324 62 Z"
          fill="#FFFFFF"
          animate={state}
          variants={sparkleVariants(0.6)}
          style={{ originX: "332px", originY: "62px" }}
        />
        <motion.path
          d="M 340 160 L 342 154 L 344 160 L 350 162 L 344 164 L 342 170 L 340 164 L 334 162 Z"
          fill="#FFFFFF"
          animate={state}
          variants={sparkleVariants(1.2)}
          style={{ originX: "342px", originY: "162px" }}
        />
      </svg>
    </div>
  );
}
