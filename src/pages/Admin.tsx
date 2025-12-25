import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Save, ArrowLeft, Loader2, LogOut, X, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CameraCaptureDialog } from '@/components/CameraCaptureDialog';

interface ArtifactForm {
  name: string;
  date: string;
  description: string;
  photos: string[];
}

export default function Admin() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState<string[]>([]);
  const [form, setForm] = useState<ArtifactForm>({
    name: '',
    date: '',
    description: '',
    photos: [],
  });

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    await Promise.all(Array.from(files).map((file) => uploadPhoto(file)));

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
          quality,
        );
      });
    };

    // Try native decode/compress first
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

    // If it's HEIC/HEIF and native decode failed, try converting it (fixes "never uploads" on desktop Chrome)
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

    // Fallback: upload as-is (never block the upload)
    const fallbackExt = file.name.split('.').pop() || 'bin';
    return {
      blob: file,
      contentType: file.type || 'application/octet-stream',
      extension: fallbackExt,
    };
  };

  const uploadPhoto = async (file: File) => {
    const tempId = `uploading-${Date.now()}`;
    setUploadingPhotos(prev => [...prev, tempId]);

    const toastId = toast.loading('Preparing photo...');

    try {
      const prepared = await preparePhotoForUpload(file);

      toast.loading('Uploading photo...', { id: toastId });

      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${prepared.extension}`;
      const filePath = `artifacts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('artifacts')
        .upload(filePath, prepared.blob, {
          contentType: prepared.contentType,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('artifacts')
        .getPublicUrl(filePath);

      setForm(prev => ({
        ...prev,
        photos: [...prev.photos, publicUrl],
      }));

      toast.success('Photo uploaded!', { id: toastId });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error?.message || 'Failed to upload photo', { id: toastId });
    } finally {
      setUploadingPhotos(prev => prev.filter(id => id !== tempId));
    }
  };

  const removePhoto = (index: number) => {
    setForm(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
  };

  const analyzeWithAI = async () => {
    if (form.photos.length === 0) {
      toast.error('Please upload at least one photo first');
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-artifact', {
        body: { imageUrl: form.photos[0] },
      });

      if (error) throw error;

      setForm(prev => ({
        ...prev,
        name: data.name || prev.name,
        date: data.date || prev.date,
        description: data.description || prev.description,
      }));

      toast.success('AI analysis complete!');
    } catch (error) {
      console.error('AI analysis error:', error);
      toast.error('Failed to analyze artifact. Try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveArtifact = async () => {
    if (!form.name.trim()) {
      toast.error('Please enter a name for the artifact');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from('artifacts').insert({
        name: form.name,
        date: form.date || 'Unknown date',
        description: form.description || 'No description available.',
        photos: form.photos,
      });

      if (error) throw error;

      toast.success('Artifact saved successfully!');
      setForm({ name: '', date: '', description: '', photos: [] });
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save artifact');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="font-display text-lg font-semibold text-foreground">Add Artifact</h1>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-lg">
        {/* Photo Upload Section */}
        <section className="mb-6">
          <label className="block text-sm font-medium text-muted-foreground mb-2">Photos</label>

          {/* Camera + Upload buttons */}
          <div className="flex gap-2 mb-3">
            <CameraCaptureDialog onCapture={uploadPhoto} disabled={uploadingPhotos.length > 0} />
            <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </Button>
          </div>

          {/* Photo Grid */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <AnimatePresence>
              {form.photos.map((photo, index) => (
                <motion.div
                  key={photo}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="relative aspect-square rounded-lg overflow-hidden bg-muted"
                >
                  <img src={photo} alt={`Artifact ${index + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => removePhoto(index)}
                    className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              ))}

              {uploadingPhotos.map(id => (
                <motion.div
                  key={id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="aspect-square rounded-lg bg-muted flex items-center justify-center"
                >
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
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

          {/* AI Analyze Button */}
          {form.photos.length > 0 && (
            <Button
              onClick={analyzeWithAI}
              disabled={isAnalyzing}
              variant="secondary"
              className="w-full"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Auto-fill with AI
                </>
              )}
            </Button>
          )}
        </section>

        {/* Form Fields */}
        <section className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Name</label>
            <Input
              value={form.name}
              onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Berliner Gramophone"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Date</label>
            <Input
              value={form.date}
              onChange={(e) => setForm(prev => ({ ...prev, date: e.target.value }))}
              placeholder="e.g., 1895 or circa 1920"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Description</label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe the artifact, its history, and significance..."
              rows={4}
            />
          </div>
        </section>

        {/* Save Button */}
        <div className="mt-8">
          <Button
            onClick={saveArtifact}
            disabled={isSaving || !form.name.trim()}
            className="w-full"
            size="lg"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Artifact
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}
