import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, Sparkles, Save, ArrowLeft, Trash2, Loader2, LogOut, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

    for (const file of Array.from(files)) {
      await uploadPhoto(file);
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Compress image before upload
  const compressImage = async (file: File, maxWidth = 1200): Promise<Blob> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Only resize if larger than maxWidth
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => resolve(blob || file),
          'image/jpeg',
          0.85 // Quality 85%
        );
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const uploadPhoto = async (file: File) => {
    const tempId = `uploading-${Date.now()}`;
    setUploadingPhotos(prev => [...prev, tempId]);

    try {
      // Compress image first
      toast.info('Compressing image...');
      const compressedBlob = await compressImage(file);
      
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      const filePath = `artifacts/${fileName}`;

      toast.info('Uploading...');
      const { error: uploadError } = await supabase.storage
        .from('artifacts')
        .upload(filePath, compressedBlob, {
          contentType: 'image/jpeg',
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('artifacts')
        .getPublicUrl(filePath);

      setForm(prev => ({
        ...prev,
        photos: [...prev.photos, publicUrl],
      }));

      toast.success('Photo uploaded!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload photo');
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
            
            {/* Add Photo Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-1 transition-colors"
            >
              <Plus className="w-6 h-6 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Add</span>
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            capture="environment"
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
