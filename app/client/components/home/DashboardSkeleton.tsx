"use client";

export function DashboardSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Welcome Header */}
      <div className="rounded-2xl bg-secondary/20 p-6 lg:p-8">
        <div className="h-8 w-56 rounded-lg bg-secondary/30" />
        <div className="h-4 w-40 rounded bg-secondary/20 mt-2" />
      </div>

      {/* Stat Cards — 4 cols */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-gray-200" />
              <div className="h-4 w-16 rounded bg-gray-200" />
            </div>
            <div className="h-8 w-12 rounded bg-gray-200" />
          </div>
        ))}
      </div>

      {/* Main grid — 7/5 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left — 7 cols */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="h-5 w-48 rounded bg-gray-200 mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="w-12 h-12 rounded-full bg-gray-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 rounded bg-gray-200" />
                    <div className="h-3 w-24 rounded bg-gray-200" />
                  </div>
                  <div className="h-4 w-16 rounded bg-gray-200" />
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="h-5 w-36 rounded bg-gray-200 mb-4" />
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-3 w-16 rounded bg-gray-200" />
                  <div className="h-6 w-20 rounded bg-gray-200" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — 5 cols */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="h-5 w-32 rounded bg-gray-200 mb-4" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                  <div className="w-14 h-14 rounded-full bg-gray-200" />
                  <div className="space-y-2">
                    <div className="h-4 w-16 rounded bg-gray-200" />
                    <div className="h-3 w-12 rounded bg-gray-200" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="h-5 w-36 rounded bg-gray-200 mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-8 h-8 rounded-full bg-gray-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-28 rounded bg-gray-200" />
                    <div className="h-3 w-16 rounded bg-gray-200" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="h-5 w-28 rounded bg-gray-200 mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="p-3 bg-gray-50 rounded-xl space-y-2">
                  <div className="h-4 w-36 rounded bg-gray-200" />
                  <div className="h-3 w-24 rounded bg-gray-200" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-14 rounded-xl bg-gray-200" />
        ))}
      </div>
    </div>
  );
}
