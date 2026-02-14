"use client";

export function LoadingSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-8 animate-pulse">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-2xl bg-gray-200" />
        <div className="space-y-2">
          <div className="h-7 w-40 rounded-lg bg-gray-200" />
          <div className="h-4 w-56 rounded bg-gray-200" />
        </div>
      </div>

      {/* Revenue Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-3 h-8 w-8 rounded-lg bg-gray-200" />
            <div className="mb-1 h-4 w-20 rounded bg-gray-200" />
            <div className="h-6 w-24 rounded bg-gray-200" />
          </div>
        ))}
      </div>

      {/* Monthly Chart */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-4 h-5 w-48 rounded bg-gray-200" />
        <div className="flex items-end justify-between gap-2" style={{ height: 160 }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 rounded-t bg-gray-200"
              style={{ height: `${20 + (i * 7) % 60}%` }}
            />
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 w-28 rounded-full bg-gray-200" />
        ))}
      </div>

      {/* Mission list */}
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="h-5 w-48 rounded bg-gray-200" />
                <div className="h-4 w-32 rounded bg-gray-200" />
                <div className="h-3 w-56 rounded bg-gray-200" />
              </div>
              <div className="h-6 w-20 rounded bg-gray-200" />
            </div>
          </div>
        ))}
      </div>

      {/* Payout section */}
      <div className="rounded-2xl bg-gray-200 p-6" style={{ height: 100 }} />
    </div>
  );
}
