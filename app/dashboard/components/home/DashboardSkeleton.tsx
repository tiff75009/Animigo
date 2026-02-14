"use client";

export function DashboardSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Welcome Header + Badge */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-56 rounded-lg bg-gray-200" />
          <div className="h-4 w-40 rounded bg-gray-200" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-32 rounded-xl bg-gray-200" />
          <div className="h-9 w-24 rounded-xl bg-gray-200" />
        </div>
      </div>

      {/* Context Banner : profil + payout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-gray-100 p-4 border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gray-200" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-28 rounded bg-gray-200" />
              <div className="h-3 w-40 rounded bg-gray-200" />
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-green-50 p-5 border border-green-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-100" />
            <div className="space-y-2">
              <div className="h-4 w-24 rounded bg-green-100" />
              <div className="h-6 w-20 rounded bg-green-100" />
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Cards — 3 cols */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-gray-200" />
              <div className="h-4 w-20 rounded bg-gray-200" />
            </div>
            <div className="h-7 w-28 rounded bg-gray-200" />
          </div>
        ))}
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
            <div className="h-5 w-40 rounded bg-gray-200 mb-4" />
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
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="h-5 w-32 rounded bg-gray-200 mb-4" />
              <div className="flex items-end gap-1.5" style={{ height: 80 }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-gray-200 rounded-t" style={{ height: `${30 + (i * 12) % 50}%` }} />
                    <div className="h-2 w-6 rounded bg-gray-200" />
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="h-5 w-36 rounded bg-gray-200 mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between">
                      <div className="h-4 w-28 rounded bg-gray-200" />
                      <div className="h-4 w-16 rounded bg-gray-200" />
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-200" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right — 5 cols */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="h-5 w-36 rounded bg-gray-200 mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-gray-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-28 rounded bg-gray-200" />
                    <div className="h-3 w-40 rounded bg-gray-200" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="h-5 w-28 rounded bg-gray-200 mb-3" />
              <div className="flex items-center gap-4">
                <div className="h-8 w-16 rounded bg-gray-200" />
                <div className="h-4 w-20 rounded bg-gray-200" />
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="h-5 w-24 rounded bg-gray-200 mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i}>
                    <div className="flex justify-between mb-1.5">
                      <div className="h-4 w-20 rounded bg-gray-200" />
                      <div className="h-4 w-10 rounded bg-gray-200" />
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-gray-200" />
                  </div>
                ))}
              </div>
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

      {/* Quick Shortcuts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-14 rounded-xl bg-gray-200" />
        ))}
      </div>
    </div>
  );
}
