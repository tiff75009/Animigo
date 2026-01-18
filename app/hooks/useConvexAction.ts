"use client";

import { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { FunctionReference } from "convex/server";
import { useToast } from "@/app/components/ui/toast";
import { parseError } from "@/app/lib/errors";
import { useRouter } from "next/navigation";

type MutationArgs<T extends FunctionReference<"mutation">> = T extends FunctionReference<
  "mutation",
  "public",
  infer Args
>
  ? Args
  : never;

type MutationReturn<T extends FunctionReference<"mutation">> = T extends FunctionReference<
  "mutation",
  "public",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any,
  infer Return
>
  ? Return
  : never;

// Type pour les réponses standardisées Convex
type ConvexResult<T> =
  | ({ success: true } & T)
  | { success: false; error: string };

interface UseConvexActionOptions {
  /** Message de succès à afficher */
  successMessage?: string;
  /** Callback en cas de succès */
  onSuccess?: () => void;
  /** Callback en cas d'erreur */
  onError?: (error: string) => void;
  /** Rediriger vers login si session expirée */
  redirectOnSessionExpired?: boolean;
  /** URL de redirection pour session expirée */
  sessionExpiredRedirect?: string;
}

/**
 * Hook pour exécuter des mutations Convex avec gestion d'erreurs intégrée
 * Supporte le pattern { success: true/false, error?: string }
 *
 * @example
 * const { execute, isLoading } = useConvexAction(api.admin.login.adminLogin, {
 *   successMessage: "Connexion réussie",
 *   onSuccess: () => router.push("/admin"),
 * });
 *
 * const result = await execute({ email, password });
 * if (result?.success) {
 *   // Utiliser result.token, result.user, etc.
 * }
 */
export function useConvexAction<T extends FunctionReference<"mutation">>(
  mutation: T,
  options: UseConvexActionOptions = {}
) {
  const {
    successMessage,
    onSuccess,
    onError,
    redirectOnSessionExpired = true,
    sessionExpiredRedirect,
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useMutation(mutation);
  const toast = useToast();
  const router = useRouter();

  const execute = useCallback(
    async (args: MutationArgs<T>): Promise<MutationReturn<T> | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await mutate(args) as ConvexResult<MutationReturn<T>>;

        // Gérer le pattern { success: false, error: "..." }
        if (result && typeof result === "object" && "success" in result) {
          if (!result.success && "error" in result) {
            const errorMessage = result.error as string;
            setError(errorMessage);

            // Vérifier si session expirée
            const isSessionError =
              errorMessage.toLowerCase().includes("session") ||
              errorMessage.toLowerCase().includes("token") ||
              errorMessage.toLowerCase().includes("expirée");

            if (isSessionError && redirectOnSessionExpired) {
              const isAdmin = window.location.pathname.startsWith("/admin");
              const redirectUrl = sessionExpiredRedirect ?? (isAdmin ? "/admin/connexion" : "/connexion");

              if (isAdmin) {
                localStorage.removeItem("admin_token");
              }

              toast.warning("Session expirée", "Veuillez vous reconnecter.");
              router.push(redirectUrl);
              return null;
            }

            // Afficher l'erreur avec le toast
            const parsed = parseError(errorMessage);
            toast.error(parsed.title, parsed.message);
            onError?.(errorMessage);
            return null;
          }
        }

        // Succès
        if (successMessage) {
          toast.success(successMessage);
        }
        onSuccess?.();
        return result as MutationReturn<T>;

      } catch (err) {
        // Erreur réseau ou autre erreur non gérée
        const parsed = parseError(err);
        setError(parsed.message);
        toast.error(parsed.title, parsed.message);
        onError?.(parsed.message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [
      mutate,
      toast,
      router,
      successMessage,
      onSuccess,
      onError,
      redirectOnSessionExpired,
      sessionExpiredRedirect,
    ]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    execute,
    isLoading,
    error,
    clearError,
  };
}

/**
 * Hook simplifié pour afficher des erreurs manuellement
 */
export function useErrorHandler() {
  const toast = useToast();
  const router = useRouter();

  const handleError = useCallback(
    (errorMessage: string, options?: { redirect?: string; silent?: boolean }) => {
      const parsed = parseError(errorMessage);

      const isSessionError =
        errorMessage.toLowerCase().includes("session") ||
        errorMessage.toLowerCase().includes("expirée");

      if (isSessionError) {
        const isAdmin = window.location.pathname.startsWith("/admin");
        const redirectUrl = options?.redirect ?? (isAdmin ? "/admin/connexion" : "/connexion");

        if (isAdmin) {
          localStorage.removeItem("admin_token");
        }

        toast.warning(parsed.title, parsed.message);
        router.push(redirectUrl);
        return parsed;
      }

      if (!options?.silent) {
        toast.error(parsed.title, parsed.message);
      }

      return parsed;
    },
    [toast, router]
  );

  return { handleError };
}
