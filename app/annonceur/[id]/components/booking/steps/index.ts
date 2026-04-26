export { default as FormuleStep } from "./FormuleStep";
export { default as AnimalsStep } from "./AnimalsStep";
export { default as DatesStep } from "./DatesStep";
export { default as LocationStep } from "./LocationStep";
export { default as OptionsStep } from "./OptionsStep";
export { default as RecapStep } from "./RecapStep";
export { default as FinalizeStep } from "./FinalizeStep";
export { default as StepNav } from "./StepNav";
export { default as StepCard, StepHeader } from "./StepCard";

// Types pour les étapes
export type DesktopStep =
  | "formule"
  | "dog"
  | "animals"
  | "dates"
  | "location"
  | "options"
  | "recap"
  | "finalize";

// Variants pour les animations de transition
export const slideVariants = {
  enterFromRight: { x: 300, opacity: 0 },
  enterFromLeft: { x: -300, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exitToLeft: { x: -300, opacity: 0 },
  exitToRight: { x: 300, opacity: 0 },
};
