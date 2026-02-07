import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Shield, Plus, Trash2, Edit3, Check, X, Loader2 } from 'lucide-react';
import Swal from 'sweetalert2';

const RoleManager = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    setLoading(true);
    // Intentar obtener roles de una tabla 'system_roles'. 
    // Si no existe, usaremos valores por defecto para no romper la UI.
    const { data, error } = await supabase
      .from('system_roles')
      .select('*')
      .order('name', { ascending: true });
    
    if (!error) {
      setRoles(data);
    } else {
      console.warn("La tabla system_roles no existe. Usando roles por defecto.");
      setRoles([
        { id: '1', name: 'USER' },
        { id: '2', name: 'ADMIN' }
      ]);
    }
    setLoading(false);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      const { error } = await supabase
        .from('system_roles')
        .insert([{ name: newName.toUpperCase().trim() }]);
      
      if (error) throw error;
      setNewName('');
      fetchRoles();
      Swal.fire({ title: 'Éxito', text: 'Rol creado.', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, background: '#121212', color: '#fff' });
    } catch (error) {
      Swal.fire({ 
        title: 'Atención', 
        text: 'Para usar el CRUD de Roles, debes crear la tabla "system_roles" en Supabase.', 
        icon: 'info', 
        background: '#121212', 
        color: '#fff' 
      });
    }
  };

  const handleUpdate = async (id) => {
    if (!editName.trim()) return;
    try {
      const { error } = await supabase
        .from('system_roles')
        .update({ name: editName.toUpperCase().trim() })
        .eq('id', id);
      
      if (error) throw error;
      setEditingId(null);
      fetchRoles();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: '¿Eliminar Rol?',
      text: "Esto podría afectar el acceso de los usuarios.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ff4444',
      cancelButtonColor: '#333',
      confirmButtonText: 'SÍ, ELIMINAR',
      background: '#121212',
      color: '#fff'
    });

    if (result.isConfirmed) {
      const { error } = await supabase.from('system_roles').delete().eq('id', id);
      if (!error) fetchRoles();
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="card-dark border-primary/10">
        <h3 className="text-sm font-black italic uppercase mb-4 flex items-center gap-2">
          <Shield className="text-primary" size={16} /> Definir Nuevo Rol de Usuario
        </h3>
        <form onSubmit={handleAdd} className="flex gap-2">
          <input 
            type="text" 
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Ej: TRAINER, MENTOR, VISTA..."
            className="flex-1 bg-dark-900 border border-dark-700 rounded-lg px-4 py-2 text-sm outline-none focus:border-primary transition-all uppercase font-bold"
          />
          <button type="submit" className="btn-primary flex items-center gap-2 px-6">
            <Plus size={18} /> AGREGAR
          </button>
        </form>
      </div>

      <div className="card-dark">
        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">ROLES DEL SISTEMA</h3>
        <div className="grid grid-cols-1 gap-2">
          {roles.map((role) => (
            <div key={role.id} className="flex items-center justify-between bg-dark-900/50 p-3 rounded-xl border border-dark-700 hover:border-primary/20 transition-all">
              {editingId === role.id ? (
                <div className="flex-1 flex gap-2">
                  <input 
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 bg-black border border-primary rounded px-2 py-1 text-sm font-bold uppercase"
                  />
                  <button onClick={() => handleUpdate(role.id)} className="text-primary"><Check size={18} /></button>
                  <button onClick={() => setEditingId(null)} className="text-red-500"><X size={18} /></button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-dark-800 flex items-center justify-center border border-dark-700">
                      <Shield size={14} className="text-gray-500" />
                    </div>
                    <span className="font-black italic text-sm tracking-tight text-white">{role.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => { setEditingId(role.id); setEditName(role.name); }}
                      className="p-2 text-gray-600 hover:text-primary transition-colors"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(role.id)}
                      className="p-2 text-gray-600 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          {loading && <div className="text-center py-4"><Loader2 className="animate-spin mx-auto text-primary" /></div>}
        </div>
      </div>
    </div>
  );
};

export default RoleManager;
