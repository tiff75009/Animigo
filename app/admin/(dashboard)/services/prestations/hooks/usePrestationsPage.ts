"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Prestation, TypeOption, ParentOption } from "../types";

interface UsePrestationsPageResult {
  // Data
  prestations: Prestation[] | undefined;
  types: TypeOption[] | undefined;
  parentCategories: ParentOption[] | undefined;
  isLoading: boolean;

  // Filters
  selectedTypeId: Id<"categoryTypes"> | null;
  setSelectedTypeId: (id: Id<"categoryTypes"> | null) => void;
  selectedParentId: Id<"serviceCategories"> | null;
  setSelectedParentId: (id: Id<"serviceCategories"> | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Filtered data
  filteredPrestations: Prestation[];
  filteredParentCategories: ParentOption[];

  // Stats
  stats: {
    total: number;
    active: number;
    inactive: number;
    byType: Record<string, number>;
  };
}

export function usePrestationsPage(
  token: string | null | undefined
): UsePrestationsPageResult {
  // Filter state
  const [selectedTypeId, setSelectedTypeId] = useState<Id<"categoryTypes"> | null>(null);
  const [selectedParentId, setSelectedParentId] = useState<Id<"serviceCategories"> | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Queries
  const prestations = useQuery(
    api.admin.serviceCategories.listPrestations,
    token
      ? {
          token,
          typeId: selectedTypeId || undefined,
          parentId: selectedParentId || undefined,
        }
      : "skip"
  ) as Prestation[] | undefined;

  const types = useQuery(
    api.admin.categoryTypes.listActiveTypes,
    token ? { token } : "skip"
  ) as TypeOption[] | undefined;

  const parentCategories = useQuery(
    api.admin.serviceCategories.listParentCategories,
    token ? { token } : "skip"
  ) as ParentOption[] | undefined;

  // Filter parent categories by selected type
  const filteredParentCategories = useMemo(() => {
    if (!parentCategories) return [];
    if (!selectedTypeId) return parentCategories;
    return parentCategories.filter((p) => p.typeId === selectedTypeId);
  }, [parentCategories, selectedTypeId]);

  // Filter prestations by search query
  const filteredPrestations = useMemo(() => {
    if (!prestations) return [];
    if (!searchQuery.trim()) return prestations;

    const query = searchQuery.toLowerCase();
    return prestations.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.slug.toLowerCase().includes(query) ||
        p.parentName?.toLowerCase().includes(query) ||
        p.typeName?.toLowerCase().includes(query)
    );
  }, [prestations, searchQuery]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!prestations) {
      return { total: 0, active: 0, inactive: 0, byType: {} };
    }

    const byType: Record<string, number> = {};
    let active = 0;
    let inactive = 0;

    prestations.forEach((p) => {
      if (p.isActive) active++;
      else inactive++;

      const typeName = p.typeName || "Sans type";
      byType[typeName] = (byType[typeName] || 0) + 1;
    });

    return {
      total: prestations.length,
      active,
      inactive,
      byType,
    };
  }, [prestations]);

  return {
    // Data
    prestations,
    types,
    parentCategories,
    isLoading: prestations === undefined,

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
  };
}
