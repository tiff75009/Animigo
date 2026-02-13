export function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Hero cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="h-32 rounded-2xl bg-gray-200" />
        <div className="h-32 rounded-2xl bg-gray-200" />
        <div className="h-32 rounded-2xl bg-gray-200" />
      </div>
      {/* Payout banner */}
      <div className="h-28 rounded-2xl bg-gray-200" />
      {/* Month selector */}
      <div className="h-12 w-48 mx-auto rounded-xl bg-gray-200" />
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="h-24 rounded-2xl bg-gray-200" />
        <div className="h-24 rounded-2xl bg-gray-200" />
        <div className="h-24 rounded-2xl bg-gray-200" />
        <div className="h-24 rounded-2xl bg-gray-200" />
      </div>
      {/* Mission list */}
      <div className="h-64 rounded-2xl bg-gray-200" />
    </div>
  );
}
