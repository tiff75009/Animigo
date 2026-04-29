"use client";

import { Fragment, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/app/hooks/useAdminAuth";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  Lock,
  Unlock,
  GripVertical,
  Pencil,
  X,
  Check,
  Loader2,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  Download,
  ArrowUp,
  ArrowDown,
  MessageSquareText,
  ChevronDown,
} from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";

interface DisputeReason {
  _id: Id<"disputeReasons">;
  label: string;
  slug: string;
  description?: string;
  blocksPayment: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
  clientHelperMessage?: string;
  resolutionTemplate?: string;
}

export default function AdminMotifsPage() {
  const { token } = useAdminAuth();
  const [editingId, setEditingId] = useState<Id<"disputeReasons"> | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editBlocksPayment, setEditBlocksPayment] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newBlocksPayment, setNewBlocksPayment] = useState(false);
  const [newClientHelper, setNewClientHelper] = useState("");
  const [newResolutionTpl, setNewResolutionTpl] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // ─── Édition des templates (helper client + résolution) par accordéon ───
  const [templatesOpenId, setTemplatesOpenId] = useState<Id<"disputeReasons"> | null>(null);
  const [tplHelper, setTplHelper] = useState("");
  const [tplResolution, setTplResolution] = useState("");
  const [isSavingTpl, setIsSavingTpl] = useState(false);

  // Queries
  const reasons = useQuery(
    api.admin.disputeReasons.getAll,
    token ? { token } : "skip"
  );

  // Mutations
  const createReason = useMutation(api.admin.disputeReasons.create);
  const updateReason = useMutation(api.admin.disputeReasons.update);
  const reorderReasons = useMutation(api.admin.disputeReasons.reorder);
  const seedDefaults = useMutation(api.admin.disputeReasons.seedDefaults);
  const seedTemplates = useMutation(api.admin.disputeReasons.seedTemplatesIntoExisting);
  const applyBlocksPaymentChange = useMutation(
    api.admin.disputeReasons.applyBlocksPaymentChangeToActiveDisputes
  );

  const startEdit = (reason: DisputeReason) => {
    setEditingId(reason._id);
    setEditLabel(reason.label);
    setEditDescription(reason.description || "");
    setEditBlocksPayment(reason.blocksPayment);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditLabel("");
    setEditDescription("");
    setEditBlocksPayment(false);
  };

  const handleSaveEdit = async () => {
    if (!token || !editingId || !editLabel.trim()) return;
    setIsProcessing(true);
    try {
      await updateReason({
        token,
        id: editingId,
        label: editLabel.trim(),
        description: editDescription.trim() || undefined,
        blocksPayment: editBlocksPayment,
      });
      cancelEdit();
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleActive = async (id: Id<"disputeReasons">, isActive: boolean) => {
    if (!token) return;
    try {
      await updateReason({ token, id, isActive: !isActive });
    } catch (error) {
      console.error("Erreur:", error);
    }
  };

  const handleToggleBlocksPayment = async (id: Id<"disputeReasons">, blocksPayment: boolean) => {
    if (!token) return;
    const newValue = !blocksPayment;
    try {
      const r = await updateReason({ token, id, blocksPayment: newValue });
      const activeCount = r?.activeDisputesUsingReason ?? 0;
      if (activeCount > 0) {
        const verb = newValue ? "bloquées" : "débloquées";
        const propagate = window.confirm(
          `Ce motif est utilisé par ${activeCount} réclamation${activeCount > 1 ? "s" : ""} active${activeCount > 1 ? "s" : ""}.\n\n` +
            `Voulez-vous propager le changement ? Les réclamations en cours seront ${verb} en conséquence.\n\n` +
            `(Annuler = seul le motif est mis à jour, les réclamations en cours gardent leur état actuel)`
        );
        if (propagate) {
          const result = await applyBlocksPaymentChange({
            token,
            reasonId: id,
            newBlocksPayment: newValue,
          });
          window.alert(
            `${result.updated} réclamation${result.updated > 1 ? "s" : ""} mise${result.updated > 1 ? "s" : ""} à jour.`
          );
        }
      }
    } catch (error) {
      console.error("Erreur:", error);
    }
  };

  const handleCreate = async () => {
    if (!token || !newLabel.trim() || !newSlug.trim()) return;
    setIsProcessing(true);
    try {
      await createReason({
        token,
        label: newLabel.trim(),
        slug: newSlug.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
        description: newDescription.trim() || undefined,
        blocksPayment: newBlocksPayment,
        clientHelperMessage: newClientHelper.trim() || undefined,
        resolutionTemplate: newResolutionTpl.trim() || undefined,
      });
      setIsCreating(false);
      setNewLabel("");
      setNewSlug("");
      setNewDescription("");
      setNewBlocksPayment(false);
      setNewClientHelper("");
      setNewResolutionTpl("");
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMoveUp = async (index: number) => {
    if (!token || !reasons || index <= 0) return;
    const ids = reasons.map((r: DisputeReason) => r._id);
    [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
    try {
      await reorderReasons({ token, orderedIds: ids });
    } catch (error) {
      console.error("Erreur:", error);
    }
  };

  const handleMoveDown = async (index: number) => {
    if (!token || !reasons || index >= reasons.length - 1) return;
    const ids = reasons.map((r: DisputeReason) => r._id);
    [ids[index], ids[index + 1]] = [ids[index + 1], ids[index]];
    try {
      await reorderReasons({ token, orderedIds: ids });
    } catch (error) {
      console.error("Erreur:", error);
    }
  };

  const handleSeedDefaults = async () => {
    if (!token) return;
    setIsProcessing(true);
    try {
      await seedDefaults({ token });
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSeedTemplates = async () => {
    if (!token) return;
    if (
      !window.confirm(
        "Pré-remplir les templates manquants pour tous les motifs ?\n(N'écrase pas les templates déjà saisis)"
      )
    ) {
      return;
    }
    setIsProcessing(true);
    try {
      const r = await seedTemplates({ token });
      window.alert(r.message);
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const openTemplates = (reason: DisputeReason) => {
    if (templatesOpenId === reason._id) {
      setTemplatesOpenId(null);
      return;
    }
    setTemplatesOpenId(reason._id);
    setTplHelper(reason.clientHelperMessage ?? "");
    setTplResolution(reason.resolutionTemplate ?? "");
  };

  const handleSaveTemplates = async () => {
    if (!token || !templatesOpenId) return;
    setIsSavingTpl(true);
    try {
      await updateReason({
        token,
        id: templatesOpenId,
        clientHelperMessage: tplHelper.trim() || undefined,
        resolutionTemplate: tplResolution.trim() || undefined,
      });
      setTemplatesOpenId(null);
    } catch (error) {
      console.error("Erreur sauvegarde templates:", error);
    } finally {
      setIsSavingTpl(false);
    }
  };

  const generateSlug = (label: string) => {
    return label
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <Link
            href="/admin/reclamations"
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour aux réclamations
          </Link>
          <h1 className="text-3xl font-bold text-white">Motifs de réclamation</h1>
          <p className="text-slate-400 mt-1">
            Configurez les motifs disponibles pour les clients
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSeedDefaults}
            disabled={isProcessing}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors border border-slate-700 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Initialiser par défaut
          </button>
          <button
            onClick={handleSeedTemplates}
            disabled={isProcessing}
            title="Remplit les champs templates manquants pour tous les motifs existants"
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-blue-300 rounded-lg hover:bg-slate-700 transition-colors border border-blue-500/30 disabled:opacity-50"
          >
            <MessageSquareText className="w-4 h-4" />
            Pré-remplir templates
          </button>
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nouveau motif
          </button>
        </div>
      </div>

      {/* Formulaire création */}
      <AnimatePresence>
        {isCreating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6"
          >
            <div className="bg-slate-900 rounded-xl border border-blue-500/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Nouveau motif</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="new-label" className="block text-sm text-slate-400 mb-1">
                    Libellé
                  </label>
                  <input
                    id="new-label"
                    type="text"
                    value={newLabel}
                    onChange={(e) => {
                      setNewLabel(e.target.value);
                      setNewSlug(generateSlug(e.target.value));
                    }}
                    placeholder="Ex: Service non réalisé"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="new-slug" className="block text-sm text-slate-400 mb-1">
                    Slug
                  </label>
                  <input
                    id="new-slug"
                    type="text"
                    value={newSlug}
                    onChange={(e) => setNewSlug(e.target.value)}
                    placeholder="service_non_realise"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="mb-4">
                <label htmlFor="new-description" className="block text-sm text-slate-400 mb-1">
                  Description
                </label>
                <input
                  id="new-description"
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Description optionnelle..."
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Templates (optionnels) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="new-helper" className="block text-sm text-slate-400 mb-1">
                    Aide affichée au client (optionnel)
                  </label>
                  <textarea
                    id="new-helper"
                    value={newClientHelper}
                    onChange={(e) => setNewClientHelper(e.target.value)}
                    rows={3}
                    placeholder="Ex: Joindre photos + facture vétérinaire si applicable"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-y"
                  />
                </div>
                <div>
                  <label htmlFor="new-resolution" className="block text-sm text-slate-400 mb-1">
                    Modèle de résolution admin (optionnel)
                  </label>
                  <textarea
                    id="new-resolution"
                    value={newResolutionTpl}
                    onChange={(e) => setNewResolutionTpl(e.target.value)}
                    rows={3}
                    placeholder="Pré-rempli dans la card Action / Résolution"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-y"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-3 cursor-pointer">
                  <button
                    type="button"
                    onClick={() => setNewBlocksPayment(!newBlocksPayment)}
                    className="relative"
                  >
                    {newBlocksPayment ? (
                      <ToggleRight className="w-8 h-8 text-red-400" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-slate-500" />
                    )}
                  </button>
                  <span className="text-sm text-slate-300 flex items-center gap-1">
                    {newBlocksPayment ? (
                      <>
                        <Lock className="w-3.5 h-3.5 text-red-400" />
                        Bloque le paiement
                      </>
                    ) : (
                      <>
                        <Unlock className="w-3.5 h-3.5 text-slate-500" />
                        Ne bloque pas le paiement
                      </>
                    )}
                  </span>
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setIsCreating(false);
                      setNewLabel("");
                      setNewSlug("");
                      setNewDescription("");
                      setNewBlocksPayment(false);
                    }}
                    className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={!newLabel.trim() || !newSlug.trim() || isProcessing}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Créer
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Liste des motifs */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-4 py-4 text-slate-400 font-medium w-12">Ordre</th>
                <th className="text-left px-4 py-4 text-slate-400 font-medium">Libellé</th>
                <th className="text-left px-4 py-4 text-slate-400 font-medium">Slug</th>
                <th className="text-left px-4 py-4 text-slate-400 font-medium">Description</th>
                <th className="text-center px-4 py-4 text-slate-400 font-medium">Bloque paiement</th>
                <th className="text-center px-4 py-4 text-slate-400 font-medium">Actif</th>
                <th className="text-right px-4 py-4 text-slate-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reasons?.map((reason: DisputeReason, index: number) => (
                <Fragment key={reason._id}>
                <motion.tr
                  className="border-b border-slate-800/50 hover:bg-slate-800/30"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  {editingId === reason._id ? (
                    // Mode édition
                    <>
                      <td className="px-4 py-4">
                        <span className="text-slate-500 text-sm">{reason.sortOrder}</span>
                      </td>
                      <td className="px-4 py-4">
                        <input
                          type="text"
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-slate-500 text-sm font-mono">{reason.slug}</span>
                      </td>
                      <td className="px-4 py-4">
                        <input
                          type="text"
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                        />
                      </td>
                      <td className="px-4 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => setEditBlocksPayment(!editBlocksPayment)}
                        >
                          {editBlocksPayment ? (
                            <Lock className="w-5 h-5 text-red-400 mx-auto" />
                          ) : (
                            <Unlock className="w-5 h-5 text-slate-500 mx-auto" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-slate-500 text-sm">—</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={cancelEdit}
                            className="p-1.5 text-slate-400 hover:text-white transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleSaveEdit}
                            disabled={isProcessing || !editLabel.trim()}
                            className="p-1.5 text-green-400 hover:text-green-300 transition-colors disabled:opacity-50"
                          >
                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    // Mode lecture
                    <>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleMoveUp(index)}
                            disabled={index === 0}
                            className="p-0.5 text-slate-500 hover:text-white disabled:opacity-30 transition-colors"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleMoveDown(index)}
                            disabled={index === (reasons?.length || 0) - 1}
                            className="p-0.5 text-slate-500 hover:text-white disabled:opacity-30 transition-colors"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`text-sm font-medium ${reason.isActive ? "text-white" : "text-slate-500 line-through"}`}>
                          {reason.label}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-slate-500 text-sm font-mono">{reason.slug}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-slate-400 text-sm">{reason.description || "—"}</span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleBlocksPayment(reason._id, reason.blocksPayment)}
                          title={reason.blocksPayment ? "Bloque le paiement" : "Ne bloque pas le paiement"}
                        >
                          {reason.blocksPayment ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full">
                              <Lock className="w-3 h-3" />
                              Oui
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-500/20 text-slate-400 text-xs rounded-full">
                              <Unlock className="w-3 h-3" />
                              Non
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(reason._id, reason.isActive)}
                        >
                          {reason.isActive ? (
                            <ToggleRight className="w-7 h-7 text-green-400 mx-auto" />
                          ) : (
                            <ToggleLeft className="w-7 h-7 text-slate-500 mx-auto" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => openTemplates(reason)}
                            title={
                              reason.clientHelperMessage || reason.resolutionTemplate
                                ? "Templates configurés"
                                : "Configurer les templates"
                            }
                            className={`p-1.5 transition-colors ${
                              reason.clientHelperMessage || reason.resolutionTemplate
                                ? "text-blue-400 hover:text-blue-300"
                                : "text-slate-400 hover:text-white"
                            }`}
                          >
                            <MessageSquareText className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => startEdit(reason)}
                            className="p-1.5 text-slate-400 hover:text-white transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </motion.tr>
                {/* Ligne dépliable : édition des templates pour ce motif */}
                <AnimatePresence initial={false}>
                  {templatesOpenId === reason._id && (
                    <motion.tr
                      key={`${reason._id}-tpl`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="border-b border-slate-800/50 bg-slate-800/20"
                    >
                      <td colSpan={7} className="px-6 py-5">
                        <div className="space-y-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                                <MessageSquareText className="w-4 h-4 text-blue-400" />
                                Templates du motif « {reason.label} »
                              </h4>
                              <p className="text-xs text-slate-400 mt-0.5">
                                Personnalisez les messages préremplis selon ce motif.
                              </p>
                            </div>
                            <button
                              onClick={() => setTemplatesOpenId(null)}
                              className="text-slate-400 hover:text-white p-1"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label
                                htmlFor={`tpl-helper-${reason._id}`}
                                className="block text-xs font-medium text-slate-300 mb-1.5"
                              >
                                Aide affichée au client
                                <span className="text-slate-500 font-normal ml-1">
                                  (lors de l&apos;ouverture de la réclamation)
                                </span>
                              </label>
                              <textarea
                                id={`tpl-helper-${reason._id}`}
                                value={tplHelper}
                                onChange={(e) => setTplHelper(e.target.value)}
                                rows={5}
                                placeholder={`Ex: Pour ce motif, merci de joindre :\n• Photos de l'incident\n• Facture vétérinaire si applicable\n• Détails précis (date, heure, lieu)`}
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500 resize-y"
                              />
                              <p className="text-[10.5px] text-slate-500 mt-1">
                                S&apos;affiche dans une bulle d&apos;info quand le
                                client choisit ce motif.
                              </p>
                            </div>

                            <div>
                              <label
                                htmlFor={`tpl-resolution-${reason._id}`}
                                className="block text-xs font-medium text-slate-300 mb-1.5"
                              >
                                Modèle de résolution
                                <span className="text-slate-500 font-normal ml-1">
                                  (pré-rempli côté admin)
                                </span>
                              </label>
                              <textarea
                                id={`tpl-resolution-${reason._id}`}
                                value={tplResolution}
                                onChange={(e) => setTplResolution(e.target.value)}
                                rows={5}
                                placeholder={`Ex: Bonjour {client_prenom},\n\nNous avons examiné votre réclamation concernant "{service}" du {date}. Suite à notre enquête, nous vous accordons un remboursement de {montant}€…`}
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500 resize-y"
                              />
                              <p className="text-[10.5px] text-slate-500 mt-1">
                                Pré-rempli dans la card Action / Résolution de
                                l&apos;admin pour ce motif. Les balises ci-dessous
                                seront remplacées automatiquement.
                              </p>

                              {/* Liste des balises dynamiques disponibles */}
                              <div className="mt-2 p-2.5 rounded-lg bg-slate-900 border border-slate-700/50">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">
                                  Balises dynamiques
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {[
                                    { tag: "{service}", desc: "Nom du service" },
                                    { tag: "{date}", desc: "Date longue (1 mai 2026)" },
                                    { tag: "{date_courte}", desc: "Date courte (01/05/2026)" },
                                    { tag: "{montant}", desc: "Montant en € (45,00)" },
                                    { tag: "{client_prenom}", desc: "Prénom client" },
                                    { tag: "{client_name}", desc: "Prénom + initiale" },
                                    { tag: "{announcer_name}", desc: "Nom annonceur" },
                                    { tag: "{motif}", desc: "Libellé du motif" },
                                  ].map((b) => (
                                    <button
                                      key={b.tag}
                                      type="button"
                                      onClick={() => {
                                        // Insérer la balise au curseur
                                        const ta = document.getElementById(
                                          `tpl-resolution-${reason._id}`
                                        ) as HTMLTextAreaElement | null;
                                        if (!ta) return;
                                        const start = ta.selectionStart;
                                        const end = ta.selectionEnd;
                                        const next =
                                          tplResolution.slice(0, start) +
                                          b.tag +
                                          tplResolution.slice(end);
                                        setTplResolution(next);
                                        setTimeout(() => {
                                          ta.focus();
                                          ta.setSelectionRange(
                                            start + b.tag.length,
                                            start + b.tag.length
                                          );
                                        }, 0);
                                      }}
                                      title={b.desc}
                                      className="font-mono text-[10.5px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/25 hover:bg-blue-500/25 transition-colors"
                                    >
                                      {b.tag}
                                    </button>
                                  ))}
                                </div>
                                <p className="text-[10px] text-slate-500 mt-1.5">
                                  Cliquez sur une balise pour l&apos;insérer.
                                  Les balises de choix (ex: <code>{`{a / b / c}`}</code>)
                                  ne sont pas remplacées — l&apos;admin doit les éditer.
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-3 pt-1">
                            <button
                              onClick={() => setTemplatesOpenId(null)}
                              className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                            >
                              Annuler
                            </button>
                            <button
                              onClick={handleSaveTemplates}
                              disabled={isSavingTpl}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                              {isSavingTpl ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Check className="w-4 h-4" />
                              )}
                              Enregistrer les templates
                            </button>
                          </div>
                        </div>
                      </td>
                    </motion.tr>
                  )}
                </AnimatePresence>
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty state */}
        {reasons?.length === 0 && (
          <div className="text-center py-12">
            <AlertTriangle className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">Aucun motif configuré</p>
            <p className="text-slate-500 text-sm mb-4">
              Initialisez les motifs par défaut pour commencer
            </p>
            <button
              onClick={handleSeedDefaults}
              disabled={isProcessing}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Initialiser les motifs par défaut
            </button>
          </div>
        )}

        {/* Loading */}
        {!reasons && (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 text-slate-600 mx-auto animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}
