"use client";

export default function AdminDashboardSkeleton() {
  return (
    <div className="p-8 space-y-6 animate-pulse">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-8 w-48 bg-slate-800 rounded-lg" />
        <div className="h-5 w-72 bg-slate-800/60 rounded-lg" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-slate-900 rounded-xl p-6 border border-slate-800">
            <div className="flex items-center justify-between">
              <div className="space-y-3">
                <div className="h-4 w-24 bg-slate-700 rounded" />
                <div className="h-8 w-20 bg-slate-700 rounded" />
              </div>
              <div className="h-12 w-12 bg-slate-700 rounded-lg" />
            </div>
          </div>
        ))}
      </div>

      {/* Moderation Alert */}
      <div className="h-16 bg-slate-900 rounded-xl border border-slate-800" />

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 h-52">
            <div className="h-5 w-40 bg-slate-700 rounded mb-4" />
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-10 bg-slate-800 rounded-lg" />
              ))}
            </div>
          </div>
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 h-64">
            <div className="h-5 w-44 bg-slate-700 rounded mb-4" />
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-6 bg-slate-800 rounded" />
              ))}
            </div>
          </div>
        </div>
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 h-72">
            <div className="h-5 w-36 bg-slate-700 rounded mb-4" />
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 bg-slate-800 rounded-lg" />
              ))}
            </div>
          </div>
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 h-36">
            <div className="h-5 w-32 bg-slate-700 rounded mb-4" />
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-6 bg-slate-800 rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-slate-900 rounded-xl p-4 border border-slate-800 h-20" />
        ))}
      </div>
    </div>
  );
}
