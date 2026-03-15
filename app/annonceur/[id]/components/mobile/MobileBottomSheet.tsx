"use client";

import { ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface MobileBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  headerLeft?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  maxHeight?: string;
  contentClassName?: string;
  noPadding?: boolean;
}

export default function MobileBottomSheet({
  isOpen,
  onClose,
  title,
  headerLeft,
  children,
  footer,
  maxHeight = "85dvh",
  contentClassName,
  noPadding = false,
}: MobileBottomSheetProps) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-[9998] lg:hidden"
            style={{ touchAction: "none" }}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 bg-white rounded-t-2xl z-[9999] lg:hidden flex flex-col"
            style={{ maxHeight, height: "auto" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 flex-shrink-0">
              {headerLeft || (
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div
              className={contentClassName || `flex-1 overflow-y-auto ${noPadding ? "" : "p-4"}`}
              style={{
                WebkitOverflowScrolling: "touch",
                overscrollBehavior: "contain",
                minHeight: 0,
              }}
            >
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="p-4 border-t border-gray-100 flex-shrink-0">
                {footer}
              </div>
            )}

            {/* Safe area spacer */}
            <div className="h-2 flex-shrink-0" />
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
