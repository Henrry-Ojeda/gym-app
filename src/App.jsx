import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient';

// Pages (to be created)
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/user/Dashboard';
import AdminPanel from './pages/admin/AdminPanel';

const queryClient = new QueryClient();

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      if (initialSession) fetchProfile(initialSession.user.id, initialSession);
      else setLoading(false);
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) fetchProfile(newSession.user.id, newSession);
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId, currentSession) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, subscription:subscription_id(name)')
        .eq('id', userId)
        .single();

      if (error) {
        console.warn('Profile not found in DB, using metadata fallback:', error);
        if (currentSession?.user) {
          const metadata = currentSession.user.user_metadata;
          const fallbackProfile = {
            id: userId,
            email: currentSession.user.email,
            first_name: metadata?.first_name || 'Atleta',
            last_name: metadata?.last_name || '',
            role: metadata?.role || 'user',
            subscription_tier: 'Free',
            current_level_id: metadata?.current_level_id,
            subscription_id: metadata?.subscription_id
          };
          setProfile(fallbackProfile);
          setLoading(false);
          return;
        }
        throw error;
      }

      if (!data) {
        setLoading(false);
        return;
      }

      // Mapear el nombre de la suscripción para que Dashboard lo reconozca
      const processedProfile = {
        ...data,
        subscription_tier: data.subscription?.name || 'Free'
      };
      
      // Auto-promoción interna para el propietario
      if (processedProfile.email === 'h_ojeda19@hotmail.es') {
        if (processedProfile.role !== 'admin-user' && processedProfile.role !== 'admin') {
          console.log('Promoting user to admin-user locally...');
          await supabase
            .from('profiles')
            .update({ role: 'admin-user' })
            .eq('id', userId);
          
          setProfile({ ...processedProfile, role: 'admin-user' });
        } else {
          setProfile(processedProfile);
        }
      } else {
        setProfile(processedProfile);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-black gap-4">
      <div className="text-3xl font-black italic tracking-tighter text-primary animate-pulse">CORE</div>
      <div className="text-[10px] uppercase tracking-[0.3em] text-gray-500 font-bold">Sincronizando Sistema</div>
    </div>
  );

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route 
            path="/" 
            element={session ? (['admin', 'admin-user'].includes(profile?.role) ? <Navigate to="/admin" /> : <Navigate to="/dashboard" />) : <Landing />} 
          />
          <Route 
            path="/login" 
            element={!session ? <Login /> : (['admin', 'admin-user'].includes(profile?.role) ? <Navigate to="/admin" /> : <Navigate to="/dashboard" />)} 
          />
          <Route 
            path="/register" 
            element={!session ? <Register /> : (['admin', 'admin-user'].includes(profile?.role) ? <Navigate to="/admin" /> : <Navigate to="/dashboard" />)} 
          />
          
          {/* Protected User Routes */}
          <Route 
            path="/dashboard/*" 
            element={
              session ? (
                ['admin', 'admin-user'].includes(profile?.role) ? <Navigate to="/admin" /> : <Dashboard user={profile} onLogout={handleLogout} />
              ) : <Navigate to="/login" />
            } 
          />

          {/* Protected Admin Routes */}
          <Route 
            path="/admin/*" 
            element={
              session && ['admin', 'admin-user'].includes(profile?.role) 
                ? <AdminPanel user={profile} onLogout={handleLogout} /> 
                : <Navigate to="/login" />
            } 
          />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
