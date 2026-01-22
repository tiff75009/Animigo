"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Camera,
  X,
  Loader2,
  GripVertical,
  Plus,
  ImageIcon,
  Trash2,
  Edit3,
  Check,
} from "lucide-react";
import { useCloudinary } from "@/app/hooks/useCloudinary";

interface EnvironmentPhoto {
  id: string;
  url: string;
  caption?: string;
}

interface EnvironmentPhotosSectionProps {
  photos: EnvironmentPhoto[];
  onUpdate: (photos: EnvironmentPhoto[]) => Promise<void>;
}

// Composant pour une photo draggable
function SortablePhoto({
  photo,
  onRemove,
  onEditCaption,
  isRemoving,
}: {
  photo: EnvironmentPhoto;
  onRemove: (id: string) => void;
  onEditCaption: (id: string, caption: string) => void;
  isRemoving: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [caption, setCaption] = useState(photo.caption || "");

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: photo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  const handleSaveCaption = () => {
    onEditCaption(photo.id, caption);
    setIsEditing(false);
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: isDragging ? 0.5 : 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={`relative aspect-[4/3] rounded-xl overflow-hidden group ${
        isDragging ? "ring-2 ring-primary shadow-xl" : ""
      }`}
    >
      <Image
        src={photo.url}
        alt={photo.caption || "Photo de l'environnement"}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 50vw, 25vw"
      />

      {/* Overlay au hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Bouton drag en haut à gauche */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 p-1.5 bg-white/90 rounded-lg cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
      >
        <GripVertical className="w-4 h-4 text-gray-600" />
      </div>

      {/* Boutons en haut à droite */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setIsEditing(true)}
          className="p-1.5 bg-white/90 rounded-lg hover:bg-white transition-colors shadow-md"
          title="Modifier la légende"
        >
          <Edit3 className="w-4 h-4 text-gray-600" />
        </button>
        <button
          onClick={() => onRemove(photo.id)}
          disabled={isRemoving}
          className="p-1.5 bg-red-500 rounded-lg hover:bg-red-600 transition-colors shadow-md disabled:opacity-50"
          title="Supprimer"
        >
          {isRemoving ? (
            <Loader2 className="w-4 h-4 text-white animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4 text-white" />
          )}
        </button>
      </div>

      {/* Légende en bas */}
      {isEditing ? (
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/80">
          <div className="flex gap-2">
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Ajouter une légende..."
              className="flex-1 px-2 py-1 text-sm bg-white/20 text-white placeholder-white/50 rounded border-0 outline-none focus:bg-white/30"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveCaption();
                if (e.key === "Escape") setIsEditing(false);
              }}
            />
            <button
              onClick={handleSaveCaption}
              className="p-1 bg-primary rounded hover:bg-primary/90"
            >
              <Check className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      ) : (
        photo.caption && (
          <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <p className="text-white text-sm font-medium truncate">
              {photo.caption}
            </p>
          </div>
        )
      )}
    </motion.div>
  );
}

// Photo overlay pendant le drag
function PhotoOverlay({ photo }: { photo: EnvironmentPhoto }) {
  return (
    <div className="aspect-[4/3] w-48 rounded-xl overflow-hidden shadow-2xl ring-2 ring-primary">
      <Image
        src={photo.url}
        alt={photo.caption || "Photo"}
        fill
        className="object-cover"
      />
    </div>
  );
}

export default function EnvironmentPhotosSection({
  photos,
  onUpdate,
}: EnvironmentPhotosSectionProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const { uploadImages, isConfigured } = useCloudinary();

  // Fonction commune pour uploader des fichiers
  const handleUploadFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      // Filtrer uniquement les images
      const imageFiles = files.filter((file) => file.type.startsWith("image/"));
      if (imageFiles.length === 0) return;

      setIsUploading(true);
      try {
        const urls = await uploadImages(imageFiles, "animigo/environment");

        if (urls.length > 0) {
          const newPhotos: EnvironmentPhoto[] = urls.map((url) => ({
            id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            url,
            caption: undefined,
          }));

          await onUpdate([...photos, ...newPhotos]);
        }
      } catch (error) {
        console.error("Erreur upload:", error);
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [photos, onUpdate, uploadImages]
  );

  // Drag & drop pour upload de fichiers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Vérifier qu'on quitte vraiment la zone (pas un enfant)
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      await handleUploadFiles(files);
    },
    [handleUploadFiles]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Upload via input file
  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      await handleUploadFiles(Array.from(files));
    },
    [handleUploadFiles]
  );

  // Supprimer une photo
  const handleRemove = useCallback(
    async (id: string) => {
      setRemovingId(id);
      try {
        const newPhotos = photos.filter((p) => p.id !== id);
        await onUpdate(newPhotos);
      } catch (error) {
        console.error("Erreur suppression:", error);
      } finally {
        setRemovingId(null);
      }
    },
    [photos, onUpdate]
  );

  // Modifier la légende
  const handleEditCaption = useCallback(
    async (id: string, caption: string) => {
      const newPhotos = photos.map((p) =>
        p.id === id ? { ...p, caption: caption || undefined } : p
      );
      await onUpdate(newPhotos);
    },
    [photos, onUpdate]
  );

  // Drag & drop
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = photos.findIndex((p) => p.id === active.id);
    const newIndex = photos.findIndex((p) => p.id === over.id);

    const newPhotos = arrayMove(photos, oldIndex, newIndex);
    await onUpdate(newPhotos);
  };

  const activePhoto = activeId
    ? photos.find((p) => p.id === activeId)
    : null;

  return (
    <motion.div
      ref={dropZoneRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="bg-white rounded-3xl shadow-lg p-6 relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Overlay de drop */}
      <AnimatePresence>
        {isDragOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-primary/10 border-2 border-dashed border-primary rounded-3xl flex items-center justify-center backdrop-blur-sm"
          >
            <div className="text-center">
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <ImageIcon className="w-10 h-10 text-primary" />
              </motion.div>
              <p className="text-primary font-semibold text-lg">
                Déposez vos photos ici
              </p>
              <p className="text-primary/70 text-sm mt-1">
                Images JPG, PNG, WebP acceptées
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Camera className="w-5 h-5 text-primary" />
          Photos de l&apos;environnement
        </h3>
        <span className="text-xs text-text-light">
          {photos.length} photo{photos.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Input file caché */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {photos.length === 0 ? (
        /* État vide - zone de drop */
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
            isDragOver
              ? "border-primary bg-primary/5"
              : "border-gray-200 hover:border-primary/50 hover:bg-primary/5"
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <ImageIcon className="w-8 h-8 text-primary" />
          </div>
          <p className="text-foreground font-medium mb-2">
            Glissez-déposez vos photos ici
          </p>
          <p className="text-sm text-text-light mb-4">
            ou cliquez pour sélectionner des fichiers
          </p>
          {isUploading ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl font-medium">
              <Loader2 className="w-5 h-5 animate-spin" />
              Upload en cours...
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors">
              <Plus className="w-5 h-5" />
              Ajouter des photos
            </div>
          )}
        </div>
      ) : (
        /* Grille de photos avec drag & drop */
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={photos.map((p) => p.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <AnimatePresence mode="popLayout">
                {photos.map((photo) => (
                  <SortablePhoto
                    key={photo.id}
                    photo={photo}
                    onRemove={handleRemove}
                    onEditCaption={handleEditCaption}
                    isRemoving={removingId === photo.id}
                  />
                ))}
              </AnimatePresence>

              {/* Bouton ajouter */}
              <motion.button
                layout
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || !isConfigured}
                className="aspect-[4/3] border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                ) : (
                  <>
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <Plus className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-primary">
                      Ajouter
                    </span>
                  </>
                )}
              </motion.button>
            </div>
          </SortableContext>

          {/* Overlay pendant le drag */}
          <DragOverlay>
            {activePhoto ? <PhotoOverlay photo={activePhoto} /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Info */}
      <p className="text-xs text-text-light mt-4 text-center">
        Glissez des fichiers pour ajouter • Déplacez les photos pour réorganiser • Survolez pour modifier
      </p>
    </motion.div>
  );
}
