import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { User, Mail, Shield, Key, Save, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import Swal from 'sweetalert2';

const ProfileManager = ({ user, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || ''
  });
  const [passwords, setPasswords] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name
        })
        .eq('id', user.id);

      if (error) throw error;

      Swal.fire({
        title: '¡Actualizado!',
        text: 'Tu perfil se ha guardado correctamente.',
        icon: 'success',
        background: '#121212',
        color: '#fff',
        timer: 1500,
        showConfirmButton: false
      });

      if (onUpdate) onUpdate();
    } catch (err) {
      Swal.fire({ title: 'Error', text: err.message, icon: 'error', background: '#121212', color: '#fff' });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      return Swal.fire({ title: 'Error', text: 'Las contraseñas no coinciden', icon: 'error', background: '#121212', color: '#fff' });
    }

    if (passwords.newPassword.length < 6) {
      return Swal.fire({ title: 'Error', text: 'La contraseña debe tener al menos 6 caracteres', icon: 'error', background: '#121212', color: '#fff' });
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwords.newPassword
      });

      if (error) throw error;

      Swal.fire({
        title: 'Contraseña Actualizada',
        text: 'Tu clave ha sido cambiada con éxito.',
        icon: 'success',
        background: '#121212',
        color: '#fff',
        timer: 2000,
        showConfirmButton: false
      });

      setPasswords({ newPassword: '', confirmPassword: '' });
    } catch (err) {
      Swal.fire({ title: 'Error', text: err.message, icon: 'error', background: '#121212', color: '#fff' });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-500 max-w-6xl mx-auto">
      {/* Sección Información Personal */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="card-dark border-primary/10 p-8 space-y-8"
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
            <User className="text-primary" size={32} />
          </div>
          <div>
            <h3 className="text-xl font-black uppercase italic tracking-tighter">Información Personal</h3>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Actualiza tus datos básicos</p>
          </div>
        </div>

        <form onSubmit={handleProfileUpdate} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-500 uppercase ml-1">Nombre</label>
              <div className="relative">
                <input 
                  type="text"
                  value={formData.first_name}
                  onChange={e => setFormData({...formData, first_name: e.target.value})}
                  className="w-full bg-dark-900 border border-dark-700 rounded-xl py-3 px-4 text-sm font-bold outline-none focus:border-primary transition-all"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-500 uppercase ml-1">Apellido</label>
              <input 
                type="text"
                value={formData.last_name}
                onChange={e => setFormData({...formData, last_name: e.target.value})}
                className="w-full bg-dark-900 border border-dark-700 rounded-xl py-3 px-4 text-sm font-bold outline-none focus:border-primary transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5 opacity-60">
            <label className="text-[10px] font-black text-gray-500 uppercase ml-1 flex items-center gap-2">
              <Mail size={12} /> Email de Usuario
            </label>
            <input 
              disabled
              value={user?.email || ''}
              className="w-full bg-dark-900/50 border border-dark-800 rounded-xl py-3 px-4 text-sm font-medium text-gray-500 cursor-not-allowed"
            />
          </div>

          <div className="pt-4">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full btn-primary py-4 flex items-center justify-center gap-2 font-black italic uppercase tracking-tight"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /> GUARDAR CAMBIOS</>}
            </button>
          </div>
        </form>
      </motion.div>

      {/* Sección Seguridad / Contraseña */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-6"
      >
        <div className="card-dark border-red-500/10 p-8 space-y-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
              <Key className="text-red-500" size={32} />
            </div>
            <div>
              <h3 className="text-xl font-black uppercase italic tracking-tighter">Seguridad</h3>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Cambiar contraseña de acceso</p>
            </div>
          </div>

          <form onSubmit={handlePasswordUpdate} className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-500 uppercase ml-1">Nueva Contraseña</label>
              <input 
                type="password"
                value={passwords.newPassword}
                onChange={e => setPasswords({...passwords, newPassword: e.target.value})}
                placeholder="Mínimo 6 caracteres"
                className="w-full bg-dark-900 border border-dark-700 rounded-xl py-3 px-4 text-sm font-bold outline-none focus:border-red-500/50 transition-all text-white"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-500 uppercase ml-1">Confirmar Contraseña</label>
              <input 
                type="password"
                value={passwords.confirmPassword}
                onChange={e => setPasswords({...passwords, confirmPassword: e.target.value})}
                className="w-full bg-dark-900 border border-dark-700 rounded-xl py-3 px-4 text-sm font-bold outline-none focus:border-red-500/50 transition-all text-white"
              />
            </div>

            <div className="pt-4">
              <button 
                type="submit" 
                disabled={passwordLoading}
                className="w-full bg-dark-800 border border-red-500/20 text-red-500 hover:bg-red-500/10 py-4 flex items-center justify-center gap-2 font-black italic uppercase tracking-tight rounded-xl transition-all"
              >
                {passwordLoading ? <Loader2 className="animate-spin" size={20} /> : <><Shield size={20} /> ACTUALIZAR CLAVE</>}
              </button>
            </div>
          </form>
        </div>

        <div className="card-dark bg-primary/5 border-primary/10 p-6 flex items-start gap-4">
          <AlertCircle className="text-primary mt-1" size={20} />
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-primary mb-1">Nota de Seguridad</h4>
            <p className="text-[10px] text-gray-400 font-medium leading-relaxed">
              Al actualizar tu contraseña, tu sesión se mantendrá activa en este dispositivo, pero podrías necesitar re-autenticarte en otros terminales.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ProfileManager;
