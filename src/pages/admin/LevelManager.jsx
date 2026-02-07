import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Layers, Plus, Trash2, Edit3, Check, X, Loader2 } from 'lucide-react';
import Swal from 'sweetalert2';

const LevelManager = () => {
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    fetchLevels();
  }, []);

  const fetchLevels = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('routine_levels')
      .select('*')
      .order('name', { ascending: true });
    
    if (!error) setLevels(data);
    setLoading(false);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      const { error } = await supabase
        .from('routine_levels')
        .insert([{ name: newName.toUpperCase().trim() }]);
      
      if (error) throw error;
      setNewName('');
      fetchLevels();
    } catch (error) {
      Swal.fire({ title: 'Error', text: 'El grupo ya existe o hubo un error.', icon: 'error', background: '#121212', color: '#fff' });
    }
  };

  const handleUpdate = async (id) => {
    if (!editName.trim()) return;
    try {
      const { error } = await supabase
        .from('routine_levels')
        .update({ name: editName.toUpperCase().trim() })
        .eq('id', id);
      
      if (error) throw error;
      setEditingId(null);
      fetchLevels();
    } catch (error) {
      Swal.fire({ title: 'Error', text: error.message, icon: 'error', background: '#121212', color: '#fff' });
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: '¿Eliminar grupo?',
      text: "Esto puede afectar a las rutinas asignadas.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ff4444',
      cancelButtonColor: '#333',
      confirmButtonText: 'SÍ, ELIMINAR',
      background: '#121212',
      color: '#fff'
    });

    if (result.isConfirmed) {
      const { error } = await supabase.from('routine_levels').delete().eq('id', id);
      if (!error) fetchLevels();
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="card-dark border-primary/10">
        <h3 className="text-sm font-black italic uppercase mb-4 flex items-center gap-2">
          <Layers className="text-primary" size={16} /> Crear Nuevo Grupo / Nivel
        </h3>
        <form onSubmit={handleAdd} className="flex gap-2">
          <input 
            type="text" 
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Ej: ELITE, REHABILITACIÓN..."
            className="flex-1 bg-dark-900 border border-dark-700 rounded-lg px-4 py-2 text-sm outline-none focus:border-primary transition-all uppercase font-bold"
          />
          <button type="submit" className="btn-primary flex items-center gap-2 px-6">
            <Plus size={18} /> AGREGAR
          </button>
        </form>
        <p className="text-[10px] text-gray-500 mt-3 italic">* Principiantes, Intermedios y Avanzados están por defecto.</p>
      </div>

      <div className="card-dark">
        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">GRUPOS CONFIGURADOS</h3>
        <div className="grid grid-cols-1 gap-2">
          {levels.map((level) => (
            <div key={level.id} className="flex items-center justify-between bg-dark-900/50 p-3 rounded-xl border border-dark-700 hover:border-primary/20 transition-all">
              {editingId === level.id ? (
                <div className="flex-1 flex gap-2">
                  <input 
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 bg-black border border-primary rounded px-2 py-1 text-sm font-bold uppercase"
                  />
                  <button onClick={() => handleUpdate(level.id)} className="text-primary"><Check size={18} /></button>
                  <button onClick={() => setEditingId(null)} className="text-red-500"><X size={18} /></button>
                </div>
              ) : (
                <>
                  <span className="font-black italic text-sm tracking-tight text-white">{level.name}</span>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => { setEditingId(level.id); setEditName(level.name); }}
                      className="p-2 text-gray-600 hover:text-primary transition-colors"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(level.id)}
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

export default LevelManager;
