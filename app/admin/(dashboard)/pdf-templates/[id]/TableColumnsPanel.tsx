"use client";

import { useState } from "react";
import {
  GripVertical, ChevronUp, ChevronDown, Plus, Trash2, Eye, EyeOff, Type, Table2, Pencil,
} from "lucide-react";
import type { TableColumnDef, TableColumnsConfig } from "./page";

// Champs disponibles pour le tableau prestations
const ITEMS_FIELDS = [
  { field: "description", label: "Description du service", tag: "{{description}}" },
  { field: "quantity", label: "Quantité", tag: "{{quantity}}" },
  { field: "unit", label: "Unité", tag: "{{unit}}" },
  { field: "unitPriceHT", label: "Prix unitaire HT", tag: "{{unitPriceHT}}" },
  { field: "unitPriceTTC", label: "Prix unitaire TTC", tag: "{{unitPriceTTC}}" },
  { field: "vatRate", label: "Taux TVA", tag: "{{vatRate}}" },
  { field: "vatAmount", label: "Montant TVA", tag: "{{vatAmount}}" },
  { field: "totalHT", label: "Total HT ligne", tag: "{{totalHT}}" },
  { field: "totalTTC", label: "Total TTC ligne", tag: "{{totalTTC}}" },
];

const TOTALS_FIELDS = [
  { field: "label", label: "Libellé", tag: "{{label}}" },
  { field: "amount", label: "Montant", tag: "{{amount}}" },
];

// Balises globales disponibles dans les templates de cellule
const GLOBAL_TAGS = [
  "invoiceNumber", "date", "clientName", "announcerName", "companyName",
  "siret", "capital", "serviceName", "missionDate", "animalDetails",
];

interface TableColumnsPanelProps {
  tableKey: "itemsTable" | "totalsTable";
  config: TableColumnsConfig;
  onChange: (config: TableColumnsConfig) => void;
}

export default function TableColumnsPanel({ tableKey, config, onChange }: TableColumnsPanelProps) {
  const columns = tableKey === "itemsTable" ? config.itemsTable! : config.totalsTable!;
  const availableFields = tableKey === "itemsTable" ? ITEMS_FIELDS : TOTALS_FIELDS;
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [editingColId, setEditingColId] = useState<string | null>(null);

  const updateColumns = (newCols: TableColumnDef[]) => {
    onChange({ ...config, [tableKey]: newCols });
  };

  const toggleColumn = (id: string) => {
    updateColumns(columns.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c));
  };

  const updateHeader = (id: string, headerText: string) => {
    updateColumns(columns.map(c => c.id === id ? { ...c, headerText } : c));
  };

  const updateWidth = (id: string, widthPercent: number) => {
    updateColumns(columns.map(c => c.id === id ? { ...c, widthPercent } : c));
  };

  const updateContentTemplate = (id: string, contentTemplate: string) => {
    updateColumns(columns.map(c => c.id === id ? { ...c, contentTemplate } : c));
  };

  const clearContentTemplate = (id: string) => {
    updateColumns(columns.map(c => c.id === id ? { ...c, contentTemplate: undefined } : c));
  };

  const moveColumn = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= columns.length) return;
    const newCols = [...columns];
    [newCols[index], newCols[newIndex]] = [newCols[newIndex], newCols[index]];
    updateColumns(newCols);
  };

  const addFreeTextColumn = () => {
    updateColumns([...columns, {
      id: `col_free_${Date.now()}`,
      dataField: "freeText",
      headerText: "Texte libre",
      widthPercent: 15,
      enabled: true,
      contentTemplate: "",
    }]);
  };

  const addDataColumn = (field: string) => {
    const def = availableFields.find(f => f.field === field);
    if (!def) return;
    updateColumns([...columns, {
      id: `col_${field}_${Date.now()}`,
      dataField: field,
      headerText: def.label,
      widthPercent: 15,
      enabled: true,
    }]);
  };

  const removeColumn = (id: string) => {
    updateColumns(columns.filter(c => c.id !== id));
    if (editingColId === id) setEditingColId(null);
  };

  // Drag & drop
  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => { e.preventDefault(); setDragOverIndex(index); };
  const handleDrop = (index: number) => {
    if (dragIndex === null || dragIndex === index) { setDragIndex(null); setDragOverIndex(null); return; }
    const newCols = [...columns];
    const [moved] = newCols.splice(dragIndex, 1);
    newCols.splice(index, 0, moved);
    updateColumns(newCols);
    setDragIndex(null);
    setDragOverIndex(null);
  };
  const handleDragEnd = () => { setDragIndex(null); setDragOverIndex(null); };

  const activeColumns = columns.filter(c => c.enabled);
  const totalWidth = activeColumns.reduce((sum, c) => sum + c.widthPercent, 0);
  const isWidthValid = Math.abs(totalWidth - 100) <= 1;

  const normalizeWidths = () => {
    const active = columns.filter(c => c.enabled);
    if (active.length === 0) return;
    const currentTotal = active.reduce((sum, c) => sum + c.widthPercent, 0);
    if (currentTotal === 0) return;
    const factor = 100 / currentTotal;
    updateColumns(columns.map(c => c.enabled ? { ...c, widthPercent: Math.round(c.widthPercent * factor) } : c));
  };

  const usedDataFields = new Set(columns.filter(c => c.dataField !== "freeText").map(c => c.dataField));
  const unusedFields = availableFields.filter(f => !usedDataFields.has(f.field));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Table2 className="w-3 h-3" />
          {tableKey === "itemsTable" ? "Colonnes prestations" : "Colonnes totaux"}
        </h4>
        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
          isWidthValid ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
        }`}>
          {totalWidth}%
        </span>
      </div>

      {!isWidthValid && (
        <button
          onClick={normalizeWidths}
          className="w-full text-[11px] px-2 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-colors"
        >
          Normaliser les largeurs à 100%
        </button>
      )}

      {/* Liste des colonnes */}
      <div className="space-y-1">
        {columns.map((col, index) => {
          const fieldDef = availableFields.find(f => f.field === col.dataField);
          const isFreeText = col.dataField === "freeText";
          const isEditing = editingColId === col.id;
          const hasCustomTemplate = !!col.contentTemplate;

          return (
            <div
              key={col.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={() => handleDrop(index)}
              onDragEnd={handleDragEnd}
              className={`group rounded-lg border transition-all ${
                dragOverIndex === index
                  ? "border-cyan-500/50 bg-cyan-500/10"
                  : col.enabled
                    ? "border-slate-700 bg-slate-800/60"
                    : "border-slate-800 bg-slate-900/40 opacity-60"
              }`}
            >
              {/* Ligne principale */}
              <div className="flex items-center gap-1 px-2 py-1.5">
                <GripVertical className="w-3 h-3 text-slate-600 cursor-grab flex-shrink-0" />

                <button onClick={() => toggleColumn(col.id)} className="flex-shrink-0 p-0.5" title={col.enabled ? "Masquer" : "Afficher"}>
                  {col.enabled ? <Eye className="w-3 h-3 text-emerald-400" /> : <EyeOff className="w-3 h-3 text-slate-600" />}
                </button>

                <input
                  type="text"
                  value={col.headerText}
                  onChange={(e) => updateHeader(col.id, e.target.value)}
                  className="flex-1 min-w-0 bg-transparent text-xs text-slate-200 focus:outline-none focus:text-white border-b border-transparent focus:border-slate-600 px-1 py-0.5"
                  title="Texte de l'en-tête"
                />

                <input
                  type="number"
                  value={col.widthPercent}
                  onChange={(e) => updateWidth(col.id, Math.max(3, Math.min(80, parseInt(e.target.value) || 0)))}
                  className="w-10 bg-slate-900 border border-slate-700 rounded text-[10px] text-center text-slate-300 focus:outline-none focus:border-cyan-600 px-1 py-0.5"
                  min={3} max={80}
                />
                <span className="text-[10px] text-slate-600">%</span>

                <div className="flex flex-col">
                  <button onClick={() => moveColumn(index, -1)} disabled={index === 0} className="text-slate-500 hover:text-white disabled:opacity-20">
                    <ChevronUp className="w-3 h-3" />
                  </button>
                  <button onClick={() => moveColumn(index, 1)} disabled={index === columns.length - 1} className="text-slate-500 hover:text-white disabled:opacity-20">
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>

                {/* Bouton éditer le contenu */}
                <button
                  onClick={() => setEditingColId(isEditing ? null : col.id)}
                  className={`flex-shrink-0 p-0.5 transition-colors ${
                    isEditing || hasCustomTemplate ? "text-cyan-400" : "text-slate-600 hover:text-slate-300"
                  }`}
                  title="Personnaliser le contenu de la cellule"
                >
                  <Pencil className="w-3 h-3" />
                </button>

                <button onClick={() => removeColumn(col.id)} className="flex-shrink-0 p-0.5 text-slate-600 hover:text-red-400 transition-colors" title="Supprimer">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>

              {/* Sous-ligne : source de donnée */}
              <div className="px-7 pb-1">
                <span className="text-[10px] text-slate-500">
                  {isFreeText ? "Texte libre" : fieldDef?.label || col.dataField}
                  {hasCustomTemplate && !isFreeText && (
                    <span className="ml-1 text-cyan-500">(personnalisé)</span>
                  )}
                </span>
              </div>

              {/* Éditeur de contenu (affiché quand on clique sur le crayon) */}
              {isEditing && (
                <div className="px-3 pb-2 space-y-1.5">
                  <div className="bg-slate-900/80 border border-slate-700 rounded-lg p-2 space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-semibold block">
                      Template de contenu
                    </label>
                    <textarea
                      value={col.contentTemplate ?? ""}
                      onChange={(e) => updateContentTemplate(col.id, e.target.value)}
                      placeholder={isFreeText
                        ? "Ex: Réf. {{invoiceNumber}}"
                        : `Vide = valeur par défaut (${fieldDef?.tag || col.dataField})\nEx: {{${col.dataField}}} - {{missionDate}}`
                      }
                      rows={3}
                      className="w-full bg-slate-950 border border-slate-700 rounded text-[11px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-600 px-2 py-1.5 font-mono leading-relaxed resize-y"
                    />

                    {/* Balises disponibles (per-row) */}
                    <div>
                      <p className="text-[9px] text-slate-600 uppercase tracking-wider font-semibold mb-1">Balises ligne</p>
                      <div className="flex flex-wrap gap-0.5">
                        {availableFields.map(f => (
                          <button
                            key={f.field}
                            onClick={() => updateContentTemplate(col.id, (col.contentTemplate ?? "") + `{{${f.field}}}`)}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 hover:bg-slate-700 font-mono transition-colors"
                          >
                            {`{{${f.field}}}`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Balises globales */}
                    <div>
                      <p className="text-[9px] text-slate-600 uppercase tracking-wider font-semibold mb-1">Balises globales</p>
                      <div className="flex flex-wrap gap-0.5">
                        {GLOBAL_TAGS.map(tag => (
                          <button
                            key={tag}
                            onClick={() => updateContentTemplate(col.id, (col.contentTemplate ?? "") + `{{${tag}}}`)}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 hover:bg-slate-700 font-mono transition-colors"
                          >
                            {`{{${tag}}}`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Bouton réinitialiser */}
                    {hasCustomTemplate && !isFreeText && (
                      <button
                        onClick={() => clearContentTemplate(col.id)}
                        className="text-[10px] text-slate-500 hover:text-red-400 transition-colors"
                      >
                        Réinitialiser (valeur par défaut)
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Boutons d'ajout */}
      <div className="space-y-1.5">
        {unusedFields.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold">Ajouter un champ</p>
            <div className="flex flex-wrap gap-1">
              {unusedFields.map(f => (
                <button
                  key={f.field}
                  onClick={() => addDataColumn(f.field)}
                  className="text-[10px] px-2 py-1 rounded-md bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:border-cyan-600 transition-colors"
                >
                  + {f.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={addFreeTextColumn}
          className="w-full flex items-center justify-center gap-1.5 text-[11px] px-2 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 transition-colors"
        >
          <Plus className="w-3 h-3" />
          <Type className="w-3 h-3" />
          Colonne texte libre
        </button>
      </div>
    </div>
  );
}
