import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Loader2,
  ArrowLeft,
  Pencil,
  Trash2,
  X,
  Save,
  Upload,
  Sparkles,
  Image as ImageIcon,
  LayoutGrid,
  List,
  Plus,
  Search,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CameraCaptureDialog } from '@/components/CameraCaptureDialog';

interface Artifact {
  id: string;
  name: string;
  date: string | null;
  description: string | null;
  photos: string[] | null;
  catalog_number: string | null;
  donation: string | null;
  created_at: string;
  updated_at: string;
}

interface ArtifactForm {
  name: string;
  date: string;
  description: string;
  photos: string[];
  catalog_number: string;
  donation: string;
}

const emptyForm: ArtifactForm = {
  name: '',
  date: '',
  description: '',
  photos: [],
  catalog_number: '',
  donation: '',
};

type ViewMode = 'gallery' | 'table';

export default function AdminDatabase() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingArtifact, setEditingArtifact] = useState<Artifact | null>(null);
  const [deletingArtifact, setDeletingArtifact] = useState<Artifact | null>(null);

  // Form states
  const [form, setForm] = useState<ArtifactForm>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState<string[]>([]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate('/auth');
      } else {
        setIsAuthenticated(true);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/auth');
      } else {
        setIsAuthenticated(true);
        fetchArtifacts();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchArtifacts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('artifacts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setArtifacts(data || []);
    } catch (error) {
      console.error('Error fetching artifacts:', error);
      toast.error('Échec du chargement des artefacts');
    } finally {
      setLoading(false);
    }
  };

  const openEditForm = (artifact: Artifact) => {
    setEditingArtifact(artifact);
    setForm({
      name: artifact.name,
      date: artifact.date || '',
      description: artifact.description || '',
      photos: artifact.photos || [],
      catalog_number: artifact.catalog_number || '',
      donation: artifact.donation || '',
    });
    setIsFormOpen(true);
  };

  const openDeleteConfirm = (artifact: Artifact) => {
    setDeletingArtifact(artifact);
    setIsDeleteOpen(true);
  };

  // Photo handling
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    await Promise.all(Array.from(files).map((file) => uploadPhoto(file)));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const preparePhotoForUpload = async (file: File, maxWidth = 1280) => {
    const isHeic = /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
    const quality = 0.78;

    const compressBitmap = async (bitmap: ImageBitmap): Promise<Blob> => {
      const scale = bitmap.width > maxWidth ? maxWidth / bitmap.width : 1;
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');
      ctx.drawImage(bitmap, 0, 0, width, height);
      return await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Compression failed'))),
          'image/jpeg',
          quality
        );
      });
    };

    try {
      if (typeof createImageBitmap === 'function') {
        const bitmap = await createImageBitmap(file);
        try {
          const blob = await compressBitmap(bitmap);
          return { blob, contentType: 'image/jpeg', extension: 'jpg' };
        } finally {
          bitmap.close?.();
        }
      }
    } catch (e) {
      // fall through
    }

    if (isHeic) {
      try {
        const heic2any = (await import('heic2any')).default;
        const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality });
        const convertedBlob = Array.isArray(converted) ? converted[0] : converted;
        return { blob: convertedBlob as Blob, contentType: 'image/jpeg', extension: 'jpg' };
      } catch (e) {
        console.warn('HEIC conversion failed, uploading original file:', e);
      }
    }

    const fallbackExt = file.name.split('.').pop() || 'bin';
    return {
      blob: file,
      contentType: file.type || 'application/octet-stream',
      extension: fallbackExt,
    };
  };

  const uploadPhoto = async (file: File) => {
    const tempId = `uploading-${Date.now()}`;
    setUploadingPhotos((prev) => [...prev, tempId]);
    const toastId = toast.loading('Préparation de la photo...');

    try {
      const prepared = await preparePhotoForUpload(file);
      toast.loading('Téléchargement de la photo...', { id: toastId });

      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${prepared.extension}`;
      const filePath = `artifacts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('artifacts')
        .upload(filePath, prepared.blob, { contentType: prepared.contentType });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('artifacts').getPublicUrl(filePath);

      setForm((prev) => ({ ...prev, photos: [...prev.photos, publicUrl] }));
      toast.success('Photo téléchargée !', { id: toastId });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error?.message || 'Échec du téléchargement de la photo', { id: toastId });
    } finally {
      setUploadingPhotos((prev) => prev.filter((id) => id !== tempId));
    }
  };

  const removePhoto = (index: number) => {
    setForm((prev) => ({ ...prev, photos: prev.photos.filter((_, i) => i !== index) }));
  };

  const analyzeWithAI = async () => {
    if (form.photos.length === 0) {
      toast.error("Veuillez d'abord télécharger au moins une photo");
      return;
    }
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-artifact', {
        body: { imageUrl: form.photos[0] },
      });
      if (error) throw error;
      setForm((prev) => ({
        ...prev,
        name: data.name || prev.name,
        date: data.date || prev.date,
        description: data.description || prev.description,
      }));
      toast.success('Analyse IA terminée !');
    } catch (error) {
      console.error('AI analysis error:', error);
      toast.error("Échec de l'analyse de l'artefact. Réessayez.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const openCreateForm = () => {
    setEditingArtifact(null);
    setForm(emptyForm);
    setIsFormOpen(true);
  };

  const saveArtifact = async () => {
    if (!form.name.trim()) {
      toast.error("Veuillez entrer un nom pour l'artefact");
      return;
    }
    setIsSaving(true);
    try {
      const artifactData = {
        name: form.name,
        date: form.date || 'Date inconnue',
        description: form.description || 'Aucune description disponible.',
        photos: form.photos,
        catalog_number: form.catalog_number || null,
        donation: form.donation || null,
      };

      if (editingArtifact) {
        const { error } = await supabase
          .from('artifacts')
          .update(artifactData)
          .eq('id', editingArtifact.id);
        if (error) throw error;
        toast.success('Artefact mis à jour !');
      } else {
        const { error } = await supabase
          .from('artifacts')
          .insert(artifactData);
        if (error) throw error;
        toast.success('Artefact créé !');
      }

      setIsFormOpen(false);
      setForm(emptyForm);
      setEditingArtifact(null);
      fetchArtifacts();
    } catch (error) {
      console.error('Save error:', error);
      toast.error("Échec de l'enregistrement de l'artefact");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteArtifact = async () => {
    if (!deletingArtifact) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('artifacts').delete().eq('id', deletingArtifact.id);
      if (error) throw error;
      toast.success('Artefact supprimé !');
      setIsDeleteOpen(false);
      setDeletingArtifact(null);
      fetchArtifacts();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error("Échec de la suppression de l'artefact");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter artifacts based on search query
  const filteredArtifacts = artifacts.filter((artifact) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      artifact.name.toLowerCase().includes(query) ||
      (artifact.description?.toLowerCase().includes(query)) ||
      (artifact.catalog_number?.toLowerCase().includes(query)) ||
      (artifact.donation?.toLowerCase().includes(query)) ||
      (artifact.date?.toLowerCase().includes(query))
    );
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <h1 className="font-display text-lg font-semibold text-foreground">Database</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={openCreateForm}
            >
              <Plus className="w-4 h-4 mr-1" />
              Ajouter
            </Button>
            <Button
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'gallery' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('gallery')}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Rechercher un artefact..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredArtifacts.length === 0 ? (
          <div className="text-center py-12">
            <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchQuery ? 'Aucun résultat trouvé' : 'Aucun artefact enregistré'}
            </p>
            {!searchQuery && (
              <Button onClick={openCreateForm} variant="outline" className="mt-4">
                Ajouter le premier artefact
              </Button>
            )}
          </div>
        ) : viewMode === 'table' ? (
          /* Table View */
          <div className="border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Photo</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                  <TableHead className="hidden md:table-cell">№ Catalogue</TableHead>
                  <TableHead className="hidden lg:table-cell">Description</TableHead>
                  <TableHead className="hidden xl:table-cell">Don</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredArtifacts.map((artifact) => (
                  <TableRow key={artifact.id}>
                    <TableCell>
                      <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted">
                        {artifact.photos && artifact.photos.length > 0 ? (
                          <img
                            src={artifact.photos[0]}
                            alt={artifact.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-6 h-6 text-muted-foreground/50" />
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{artifact.name}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {artifact.date || '—'}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {artifact.catalog_number || '—'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground max-w-[250px] truncate">
                      {artifact.description || '—'}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-muted-foreground max-w-[200px] truncate">
                      {artifact.donation || '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEditForm(artifact)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => openDeleteConfirm(artifact)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          /* Gallery View */
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredArtifacts.map((artifact) => (
              <motion.div
                key={artifact.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="aspect-square bg-muted relative">
                  {artifact.photos && artifact.photos.length > 0 ? (
                    <img
                      src={artifact.photos[0]}
                      alt={artifact.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-12 h-12 text-muted-foreground/50" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-medium text-sm text-foreground line-clamp-1">{artifact.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                    {artifact.catalog_number || artifact.date || '—'}
                  </p>
                  <div className="flex gap-1 mt-2">
                    <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => openEditForm(artifact)}>
                      <Pencil className="w-3 h-3 mr-1" />
                      Modifier
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-destructive hover:text-destructive"
                      onClick={() => openDeleteConfirm(artifact)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Add/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingArtifact ? "Modifier l'artefact" : "Ajouter un artefact"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Photos */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Photos</label>
              <div className="flex gap-2 mb-3">
                <CameraCaptureDialog onCapture={uploadPhoto} disabled={uploadingPhotos.length > 0} />
                <Button type="button" variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-2" />
                  Télécharger
                </Button>
              </div>

              <div className="grid grid-cols-4 gap-2 mb-3">
                <AnimatePresence>
                  {form.photos.map((photo, index) => (
                    <motion.div
                      key={photo}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="relative aspect-square rounded-lg overflow-hidden bg-muted"
                    >
                      <img src={photo} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => removePhoto(index)}
                        className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </motion.div>
                  ))}
                  {uploadingPhotos.map((id) => (
                    <motion.div
                      key={id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="aspect-square rounded-lg bg-muted flex items-center justify-center"
                    >
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />

              {form.photos.length > 0 && (
                <Button onClick={analyzeWithAI} disabled={isAnalyzing} variant="secondary" size="sm" className="w-full">
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyse en cours...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Remplir avec l'IA
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Nom *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="ex. Gramophone Berliner"
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Date</label>
              <Input
                value={form.date}
                onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                placeholder="ex. 1895 ou vers 1920"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Description</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Décrivez l'artefact, son histoire et son importance..."
                rows={3}
              />
            </div>

            {/* Catalog Number */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Numéro de catalogue</label>
              <Input
                value={form.catalog_number}
                onChange={(e) => setForm((prev) => ({ ...prev, catalog_number: e.target.value }))}
                placeholder="ex. CAT-001"
              />
            </div>

            {/* Donation */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Don</label>
              <Input
                value={form.donation}
                onChange={(e) => setForm((prev) => ({ ...prev, donation: e.target.value }))}
                placeholder="ex. Collection privée, Don de M. Dupont..."
              />
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Annuler
            </Button>
            <Button onClick={saveArtifact} disabled={isSaving || !form.name.trim()}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Mettre à jour
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet artefact ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer « {deletingArtifact?.name} » ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteArtifact}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Suppression...
                </>
              ) : (
                'Supprimer'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
