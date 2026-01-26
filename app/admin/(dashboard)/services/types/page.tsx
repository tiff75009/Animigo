"use client";

import { AnimatePresence } from "framer-motion";
import { Layers, Plus, Sparkles } from "lucide-react";
import { useAdminAuth } from "@/app/hooks/useAdminAuth";
import { useTypesPage } from "./hooks/useTypesPage";
import { TypeForm, TypeTable } from "./_components";

export default function CategoryTypesPage() {
  const { token } = useAdminAuth();
  const {
    // Data
    types,
    isLoading,

    // Form state
    formMode,
    setFormMode,
    formData,
    setFormData,
    resetForm,

    // Action states
    isSaving,
    error,

    // Actions
    handleCreate,
    handleUpdate,
    handleDelete,
    handleToggleActive,
    handleSeed,
    startEdit,
  } = useTypesPage(token);

  // Submit handler basé sur le mode
  const handleSubmit = async () => {
    if (formMode === "add") {
      await handleCreate();
    } else if (formMode === "edit") {
      await handleUpdate();
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Layers className="w-8 h-8 text-blue-400" />
            <h1 className="text-3xl font-bold text-white">
              Types de catégories
            </h1>
          </div>
          <p className="text-slate-400">
            Gérez les types pour organiser vos catégories de services (Garde,
            Services, Santé, Reproduction...).
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Bouton Seed (si aucun type) */}
          {types && types.length === 0 && (
            <button
              onClick={handleSeed}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Sparkles className="w-5 h-5" />
              Types par défaut
            </button>
          )}

          {/* Bouton Nouveau type */}
          <button
            onClick={() => {
              resetForm();
              setFormMode("add");
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nouveau type
          </button>
        </div>
      </div>

      {/* Formulaire (si ouvert) */}
      <AnimatePresence>
        {formMode !== "closed" && (
          <TypeForm
            mode={formMode}
            formData={formData}
            isSaving={isSaving}
            error={error}
            onFormDataChange={setFormData}
            onSubmit={handleSubmit}
            onCancel={resetForm}
          />
        )}
      </AnimatePresence>

      {/* Table des types */}
      <TypeTable
        types={types}
        isLoading={isLoading}
        error={formMode === "closed" ? error : null}
        onEdit={startEdit}
        onDelete={handleDelete}
        onToggleActive={handleToggleActive}
        onSeed={handleSeed}
      />
    </div>
  );
}
