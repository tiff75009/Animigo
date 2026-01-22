"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import type { Category } from "../../types";
import CategoryRow from "./CategoryRow";
import EmptyState from "./EmptyState";

interface CategoryTableProps {
  categories: Category[] | undefined;
  isLoading: boolean;
  expandedParents: Set<Id<"serviceCategories">>;
  uploadingImageId: Id<"serviceCategories"> | null;
  onToggleExpand: (parentId: Id<"serviceCategories">) => void;
  onEdit: (category: Category) => void;
  onDelete: (categoryId: Id<"serviceCategories">) => void;
  onToggleActive: (
    categoryId: Id<"serviceCategories">,
    currentActive: boolean
  ) => void;
  onImageUpload: (file: File, categoryId: Id<"serviceCategories">) => void;
  onSeed: () => void;
}

export default function CategoryTable({
  categories,
  isLoading,
  expandedParents,
  uploadingImageId,
  onToggleExpand,
  onEdit,
  onDelete,
  onToggleActive,
  onImageUpload,
  onSeed,
}: CategoryTableProps) {
  // Organiser les catégories par parent
  const { parents, children, orphans } = useMemo(() => {
    if (!categories) {
      return { parents: [], children: new Map(), orphans: [] };
    }

    const parentsArr: Category[] = [];
    const childrenMap = new Map<Id<"serviceCategories">, Category[]>();
    const orphansArr: Category[] = [];

    // Créer un set des IDs de catégories existantes
    const categoryIds = new Set(categories.map((c) => c.id));

    categories.forEach((cat) => {
      if (!cat.parentCategoryId) {
        // C'est une catégorie parente
        parentsArr.push(cat);
      } else if (categoryIds.has(cat.parentCategoryId)) {
        // C'est une sous-catégorie avec un parent existant
        const existing = childrenMap.get(cat.parentCategoryId) || [];
        childrenMap.set(cat.parentCategoryId, [...existing, cat]);
      } else {
        // C'est une orpheline (parent supprimé ou inexistant)
        orphansArr.push(cat);
      }
    });

    // Trier les parents par ordre
    parentsArr.sort((a, b) => a.order - b.order);

    // Trier les enfants de chaque parent par ordre
    childrenMap.forEach((children) => {
      children.sort((a, b) => a.order - b.order);
    });

    return { parents: parentsArr, children: childrenMap, orphans: orphansArr };
  }, [categories]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  // Empty state
  if (!categories || categories.length === 0) {
    return <EmptyState onSeed={onSeed} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-slate-800/50 rounded-xl overflow-hidden border border-slate-700"
    >
      <table className="w-full">
        <thead>
          <tr className="bg-slate-900/50 border-b border-slate-700">
            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Catégorie
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <span className="hidden lg:inline">Affichage / Facturation</span>
              <span className="lg:hidden">Détails</span>
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <span className="hidden lg:inline">Sous-cat. / Prestations</span>
              <span className="lg:hidden">Contenu</span>
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Statut
            </th>
            <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {/* Catégories parentes avec leurs enfants */}
          {parents.map((parent) => {
            const parentChildren = children.get(parent.id) || [];
            const isExpanded = expandedParents.has(parent.id);

            return (
              <React.Fragment key={parent.id}>
                {/* Ligne parent */}
                <CategoryRow
                  category={parent}
                  isExpanded={isExpanded}
                  isParentRow
                  childrenCount={parentChildren.length}
                  uploadingImageId={uploadingImageId}
                  onToggleExpand={() => onToggleExpand(parent.id)}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onToggleActive={onToggleActive}
                  onImageUpload={onImageUpload}
                />

                {/* Lignes enfants (si expandé) */}
                {isExpanded &&
                  parentChildren.map((child: Category) => (
                    <CategoryRow
                      key={child.id}
                      category={child}
                      uploadingImageId={uploadingImageId}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onToggleActive={onToggleActive}
                      onImageUpload={onImageUpload}
                    />
                  ))}
              </React.Fragment>
            );
          })}

          {/* Catégories orphelines */}
          {orphans.length > 0 && (
            <>
              <tr className="bg-slate-700/30">
                <td
                  colSpan={5}
                  className="px-6 py-2 text-xs font-semibold text-slate-400 uppercase"
                >
                  Catégories sans parent
                </td>
              </tr>
              {orphans.map((orphan) => (
                <CategoryRow
                  key={orphan.id}
                  category={orphan}
                  uploadingImageId={uploadingImageId}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onToggleActive={onToggleActive}
                  onImageUpload={onImageUpload}
                />
              ))}
            </>
          )}
        </tbody>
      </table>
    </motion.div>
  );
}
