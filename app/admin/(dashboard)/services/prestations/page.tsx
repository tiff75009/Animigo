"use client";

import { AnimatePresence } from "framer-motion";
import { ListChecks, Plus } from "lucide-react";
import { useAdminAuth } from "@/app/hooks/useAdminAuth";
import { usePrestationsPage } from "./hooks/usePrestationsPage";
import { usePrestationActions } from "./hooks/usePrestationActions";
import { PrestationsFilters, PrestationsTable, PrestationForm } from "./_components";

export default function PrestationsPage() {
  const { token } = useAdminAuth();
  const {
    // Data
    types,
    parentCategories,
    isLoading,

    // Filters
    selectedTypeId,
    setSelectedTypeId,
    selectedParentId,
    setSelectedParentId,
    searchQuery,
    setSearchQuery,

    // Filtered data
    filteredPrestations,
    filteredParentCategories,

    // Stats
    stats,
  } = usePrestationsPage(token);

  const {
    // Form state
    isEditing,
    editingPrestation,
    formData,
    setFormData,

    // Action states
    isSaving,
    error,

    // Actions
    startEdit,
    startCreate,
    cancelEdit,
    handleSave,
    handleDelete,
    handleToggleActive,
  } = usePrestationActions(token);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <ListChecks className="w-8 h-8 text-blue-400" />
            <h1 className="text-3xl font-bold text-white">Prestations</h1>
          </div>
          <p className="text-slate-400">
            Gérez toutes les prestations (sous-catégories) disponibles sur la
            plateforme.
          </p>
        </div>

        <button
          onClick={startCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nouvelle prestation
        </button>
      </div>

      {/* Form (if editing) */}
      <AnimatePresence>
        {isEditing && (
          <PrestationForm
            isEditing={isEditing}
            editingPrestation={editingPrestation}
            formData={formData}
            parentCategories={parentCategories}
            isSaving={isSaving}
            error={error}
            onFormDataChange={setFormData}
            onSave={handleSave}
            onCancel={cancelEdit}
          />
        )}
      </AnimatePresence>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <p className="text-slate-400 text-sm">Total</p>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <p className="text-slate-400 text-sm">Actives</p>
          <p className="text-2xl font-bold text-green-400">{stats.active}</p>
        </div>
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <p className="text-slate-400 text-sm">Inactives</p>
          <p className="text-2xl font-bold text-slate-400">{stats.inactive}</p>
        </div>
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <p className="text-slate-400 text-sm">Types utilisés</p>
          <p className="text-2xl font-bold text-blue-400">
            {Object.keys(stats.byType).length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <PrestationsFilters
        types={types}
        parentCategories={filteredParentCategories}
        selectedTypeId={selectedTypeId}
        selectedParentId={selectedParentId}
        searchQuery={searchQuery}
        onTypeChange={(id) => {
          setSelectedTypeId(id);
          setSelectedParentId(null);
        }}
        onParentChange={setSelectedParentId}
        onSearchChange={setSearchQuery}
      />

      {/* Results count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-400">
          {filteredPrestations.length} prestation
          {filteredPrestations.length > 1 ? "s" : ""} trouvée
          {filteredPrestations.length > 1 ? "s" : ""}
        </p>
      </div>

      {/* Table */}
      <PrestationsTable
        prestations={filteredPrestations}
        isLoading={isLoading}
        onEdit={startEdit}
        onDelete={handleDelete}
        onToggleActive={handleToggleActive}
      />
    </div>
  );
}
