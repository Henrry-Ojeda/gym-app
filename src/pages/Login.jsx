import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { motion } from 'framer-motion';
import { Mail, Lock, Loader2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.message === 'Invalid login credentials') {
        setError('Credenciales incorrectas. Revisa tu email y contraseña.');
      } else {
        setError(error.message);
      }
      setLoading(false);
    }
    // No setSession or Navigate needed here as App.jsx listens to the auth change
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-primary/5 -z-10" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full glass p-8 rounded-2xl relative"
      >
        <Link to="/" className="absolute -top-12 left-0 text-gray-500 hover:text-primary flex items-center gap-2 transition-colors">
          <ArrowLeft size={18} /> Volver
        </Link>
        
        <div className="text-center mb-8">
          <div className="text-3xl font-black tracking-tighter mb-2 italic">
            CORE<span className="text-primary">•</span>
          </div>
          <p className="text-gray-400">Accede a tu panel de alto rendimiento</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 ml-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-dark-900 border border-dark-700 rounded-lg py-3 pl-10 pr-4 outline-none focus:border-primary transition-colors text-white"
                placeholder="tu@email.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 ml-1">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-dark-900 border border-dark-700 rounded-lg py-3 pl-10 pr-4 outline-none focus:border-primary transition-colors text-white"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm bg-red-500/10 p-3 rounded-lg border border-red-500/20">
              {error}
            </div>
          )}

          <button 
            disabled={loading}
            className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : "INICIAR SESIÓN"}
          </button>
        </form>

        <div className="mt-8 text-center text-gray-500 text-sm">
          ¿No tienes cuenta? <span className="text-primary cursor-pointer hover:underline font-bold">Consulta planes</span>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
