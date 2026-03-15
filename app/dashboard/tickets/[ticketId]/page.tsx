"use client";

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import {
  ChevronLeft,
  Send,
  Loader2,
  XCircle,
  RefreshCw,
  Calendar,
  Tag,
} from "lucide-react";
import {
  TicketStatusBadge,
  TicketPriorityBadge,
  TicketMessageBubble,
} from "@/app/components/support";
import { cn } from "@/app/lib/utils";
import { getAuthToken } from "@/app/lib/authToken";

const categoryLabels: Record<string, string> = {
  paiement: "Paiement / Facturation",
  reservation: "Réservation / Mission",
  compte: "Mon compte",
  technique: "Problème technique",
  signalement: "Signalement",
  autre: "Autre",
};

export default function DashboardTicketDetailPage() {
  const params = useParams();
  const ticketId = params.ticketId as string;
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [reopenMessage, setReopenMessage] = useState("");
  const [showReopenForm, setShowReopenForm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const token = getAuthToken();

  const data = useQuery(
    api.support.tickets.getTicketDetails,
    token ? { sessionToken: token, ticketId: ticketId as Id<"supportTickets"> } : "skip"
  );

  const addMessage = useMutation(api.support.tickets.addMessage);
  const closeTicket = useMutation(api.support.tickets.closeTicket);
  const reopenTicket = useMutation(api.support.tickets.reopenTicket);

  const isLoading = data === undefined;
  const ticket = data?.ticket;
  const messages = data?.messages || [];
  const relatedMission = data?.relatedMission;

  // Scroll vers le bas quand nouveaux messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !token) return;

    setIsSending(true);
    try {
      await addMessage({
        sessionToken: token,
        ticketId: ticketId as Id<"supportTickets">,
        content: newMessage,
      });
      setNewMessage("");
    } catch (error) {
      console.error("Erreur envoi message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = async () => {
    if (!token) return;
    setIsClosing(true);
    try {
      await closeTicket({
        sessionToken: token,
        ticketId: ticketId as Id<"supportTickets">,
      });
    } catch (error) {
      console.error("Erreur fermeture:", error);
    } finally {
      setIsClosing(false);
    }
  };

  const handleReopen = async () => {
    if (!token || !reopenMessage.trim()) return;
    setIsSending(true);
    try {
      await reopenTicket({
        sessionToken: token,
        ticketId: ticketId as Id<"supportTickets">,
        message: reopenMessage,
      });
      setReopenMessage("");
      setShowReopenForm(false);
    } catch (error) {
      console.error("Erreur réouverture:", error);
    } finally {
      setIsSending(false);
    }
  };

  const isClosed = ticket?.status === "closed" || ticket?.status === "resolved";

  return (
    <div className="space-y-6">
      {/* Retour */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <Link
          href="/dashboard/tickets"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-primary transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Retour à mes tickets
        </Link>
      </motion.div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : !ticket ? (
        <div className="text-center py-12 bg-white rounded-2xl">
          <p className="text-gray-500 mb-4">Ticket non trouvé</p>
          <Link href="/dashboard/tickets" className="text-primary hover:underline">
            Retour à mes tickets
          </Link>
        </div>
      ) : (
        <>
          {/* Header ticket */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 shadow-sm"
          >
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="text-sm text-gray-500 font-mono">
                    {ticket.ticketNumber}
                  </span>
                  <TicketStatusBadge status={ticket.status} />
                  <TicketPriorityBadge priority={ticket.priority} />
                </div>
                <h1 className="text-xl font-bold text-foreground mb-3">
                  {ticket.subject}
                </h1>
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <Tag className="w-4 h-4" />
                    {categoryLabels[ticket.category] || ticket.category}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    Créé le {new Date(ticket.createdAt).toLocaleDateString("fr-FR")}
                  </span>
                </div>
              </div>

              {/* Actions */}
              {!isClosed && (
                <button
                  onClick={handleClose}
                  disabled={isClosing}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors text-sm"
                >
                  {isClosing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  Fermer le ticket
                </button>
              )}
            </div>

            {/* Mission liée */}
            {relatedMission && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-500 mb-1">Réservation liée</p>
                <Link
                  href={`/dashboard/missions/${relatedMission._id}`}
                  className="text-primary hover:underline font-medium"
                >
                  {relatedMission.serviceName} - {relatedMission.startDate}
                </Link>
              </div>
            )}
          </motion.div>

          {/* Messages */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-sm overflow-hidden"
          >
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-semibold text-foreground">Messages</h2>
            </div>

            <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
              {messages.map((message: (typeof messages)[number]) => (
                <TicketMessageBubble
                  key={message._id}
                  message={message}
                  isCurrentUser={message.senderType === "user"}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Formulaire réponse */}
            {!isClosed ? (
              <div className="p-4 border-t border-gray-100">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Votre message..."
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={isSending || !newMessage.trim()}
                    className={cn(
                      "flex items-center justify-center w-12 h-12 rounded-xl",
                      "bg-primary text-white",
                      "hover:bg-primary/90 transition-colors",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    {isSending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 border-t border-gray-100 bg-gray-50">
                {showReopenForm ? (
                  <div className="space-y-3">
                    <textarea
                      value={reopenMessage}
                      onChange={(e) => setReopenMessage(e.target.value)}
                      placeholder="Expliquez pourquoi vous souhaitez rouvrir ce ticket..."
                      rows={3}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleReopen}
                        disabled={isSending || !reopenMessage.trim()}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        {isSending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                        Rouvrir le ticket
                      </button>
                      <button
                        onClick={() => setShowReopenForm(false)}
                        className="px-4 py-2 text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-gray-500 mb-3">
                      Ce ticket est {ticket.status === "resolved" ? "résolu" : "fermé"}
                    </p>
                    <button
                      onClick={() => setShowReopenForm(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 text-primary border border-primary rounded-xl hover:bg-primary/5 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Rouvrir le ticket
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </div>
  );
}
