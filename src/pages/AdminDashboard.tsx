import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LogOut, Plus, Database, Loader2 } from 'lucide-react';
import museumLogo from '@/assets/museum-logo.png';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate('/auth');
      } else {
        setIsAuthenticated(true);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/auth');
      } else {
        setIsAuthenticated(true);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading || !isAuthenticated) {
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
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <h1 className="font-display text-lg font-semibold text-foreground">Administration</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Déconnexion
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-12">
          <img src={museumLogo} alt="Logo du musée" className="w-24 h-24 mx-auto mb-4 rounded-full" />
          <h2 className="font-display text-2xl font-bold text-foreground">Panneau d'administration</h2>
          <p className="text-muted-foreground mt-2">Gérez les artefacts du musée</p>
        </div>

        {/* Options */}
        <div className="grid gap-4">
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => navigate('/admin/add')}
            className="group flex items-center gap-4 p-6 bg-card border border-border rounded-xl hover:border-primary/50 hover:shadow-lg transition-all text-left"
          >
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Plus className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-foreground">Ajouter un artefact</h3>
              <p className="text-sm text-muted-foreground">Photographier et enregistrer un nouvel objet</p>
            </div>
          </motion.button>

          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onClick={() => navigate('/admin/database')}
            className="group flex items-center gap-4 p-6 bg-card border border-border rounded-xl hover:border-primary/50 hover:shadow-lg transition-all text-left"
          >
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Database className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-foreground">Accéder à la database</h3>
              <p className="text-sm text-muted-foreground">Consulter, modifier et supprimer les artefacts</p>
            </div>
          </motion.button>
        </div>
      </main>
    </div>
  );
}
