import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { motion } from 'framer-motion';
import { Mail, Lock, Loader2, ArrowLeft, User, CheckCircle2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

const Register = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: ''
  });
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.first_name,
            last_name: formData.last_name,
            role: 'user',
            subscription_status: 'active',
            current_level_id: '5a6a673a-d642-471f-b9e1-5f802ac585f9', // PRINCIPIANTE
            subscription_id: 'b7c2d2ff-62a8-4e9c-b1e4-d84ddb628468' // BASIC
          }
        }
      });

      if (error) throw error;

      await Swal.fire({
        title: '¡Registro Exitoso!',
        text: 'Tu cuenta ha sido creada. Ahora puedes iniciar sesión.',
        icon: 'success',
        background: '#121212',
        color: '#fff',
        confirmButtonColor: '#bcff00',
      });

      navigate('/login');
    } catch (error) {
      Swal.fire({
        title: 'Error',
        text: error.message,
        icon: 'error',
        background: '#121212',
        color: '#fff',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-primary/5 -z-10" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full glass p-8 rounded-2xl relative"
      >
        <Link to="/" className="absolute -top-12 left-0 text-gray-500 hover:text-primary flex items-center gap-2 transition-colors">
          <ArrowLeft size={18} /> Volver
        </Link>
        
        <div className="text-center mb-8">
          <div className="text-3xl font-black tracking-tighter mb-2 italic text-primary">
            ÚNETE AL CORE
          </div>
          <p className="text-gray-400">Comienza tu transformación hoy mismo</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 ml-1">Nombre</label>
              <input 
                type="text" 
                required
                value={formData.first_name}
                onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                className="w-full bg-dark-900 border border-dark-700 rounded-lg py-3 px-4 outline-none focus:border-primary transition-colors text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 ml-1">Apellido</label>
              <input 
                type="text" 
                required
                value={formData.last_name}
                onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                className="w-full bg-dark-900 border border-dark-700 rounded-lg py-3 px-4 outline-none focus:border-primary transition-colors text-white text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 ml-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
              <input 
                type="email" 
                required
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full bg-dark-900 border border-dark-700 rounded-lg py-3 pl-10 pr-4 outline-none focus:border-primary transition-colors text-white text-sm"
                placeholder="tu@email.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 ml-1 text-primary">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
              <input 
                type="password" 
                required
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full bg-dark-900 border border-dark-700 rounded-lg py-3 pl-10 pr-4 outline-none focus:border-primary transition-colors text-white text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button 
            disabled={loading}
            className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-6 py-4"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : "CREAR CUENTA AHORA"}
          </button>
        </form>

        <div className="mt-8 text-center text-gray-500 text-sm">
          ¿Ya tienes cuenta? <Link to="/login" className="text-primary hover:underline font-bold">Inicia sesión</Link>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
