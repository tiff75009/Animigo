"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Category, ParentCategory } from "../types";

interface UseCategoryDataResult {
  categories: Category[] | undefined;
  parentCategories: ParentCategory[] | undefined;
  isLoading: boolean;
}

/**
 * Hook pour récupérer les données des catégories
 * Gère les queries Convex pour les catégories et catégories parentes
 */
export function useCategoryData(
  token: string | null | undefined
): UseCategoryDataResult {
  const categories = useQuery(
    api.admin.serviceCategories.listCategories,
    token ? { token } : "skip"
  ) as Category[] | undefined;

  const parentCategories = useQuery(
    api.admin.serviceCategories.listParentCategories,
    token ? { token } : "skip"
  ) as ParentCategory[] | undefined;

  return {
    categories,
    parentCategories,
    isLoading: categories === undefined,
  };
}
