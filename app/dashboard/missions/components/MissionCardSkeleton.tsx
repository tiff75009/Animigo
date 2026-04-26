"use client";

import { motion } from "framer-motion";

export function MissionCardSkeleton() {
  return (
    <div
      className="bg-white p-4 animate-pulse"
      style={{ borderRadius: 14, border: "1px solid #ece9e1" }}
    >
      <div className="flex gap-3">
        <div className="w-12 h-12 rounded-full flex-shrink-0" style={{ background: "#f1ede3" }} />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="space-y-1.5">
            <div className="h-3 rounded w-1/3" style={{ background: "#f1ede3" }} />
            <div className="h-2.5 rounded w-1/2" style={{ background: "#f7f5ef" }} />
          </div>
          <div className="flex gap-3">
            <div className="h-2.5 rounded w-24" style={{ background: "#f7f5ef" }} />
            <div className="h-2.5 rounded w-20" style={{ background: "#f7f5ef" }} />
          </div>
          <div className="h-4 rounded w-20" style={{ background: "#f1ede3" }} />
        </div>
        <div
          className="w-20 h-5 rounded-full flex-shrink-0"
          style={{ background: "#f1ede3" }}
        />
      </div>
    </div>
  );
}

export function MissionListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.08 }}
        >
          <MissionCardSkeleton />
        </motion.div>
      ))}
    </div>
  );
}
