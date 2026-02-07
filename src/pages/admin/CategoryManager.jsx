import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Plus, Trash2, Folder, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CategoryManager = () => {
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [counts, setCounts] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: catData, error: catError } = await supabase
        .from('exercise_categories')
        .select('*')
        .order('name', { ascending: true });

      if (catError) throw catError;
      setCategories(catData || []);
      
      const { data: exData } = await supabase.from('exercises').select('muscle_group');
      const countsMap = {};
      exData?.forEach(ex => {
        countsMap[ex.muscle_group] = (countsMap[ex.muscle_group] || 0) + 1;
      });
      setCounts(countsMap);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newCategory.trim()) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('exercise_categories')
        .insert([{ name: newCategory.trim() }]);

      if (error) {
        alert('Error: La categoría ya existe');
      } else {
        setNewCategory('');
        setIsModalOpen(false);
        fetchData();
      }
    } catch (err) {
      alert('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    const usage = counts[name] || 0;
    const warning = usage > 0 
      ? `ADVERTENCIA: Hay ${usage} ejercicios usando esta categoría. ¿Realmente quieres borrarla?`
      : '¿Seguro que quieres eliminar esta categoría?';
      
    if (!confirm(warning)) return;
    
    const { error } = await supabase.from('exercise_categories').delete().eq('id', id);
    if (!error) fetchData();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="max-w-md">
          <h2 className="text-2xl font-black italic flex items-center gap-3 uppercase tracking-tighter">
            <Folder className="text-primary" size={24} /> Organizador de Grupos
          </h2>
          <p className="text-gray-500 text-xs mt-1">
            Define las categorías principales para clasificar tus videos y rutinas.
          </p>
        </div>

        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center gap-2 px-6"
        >
          <Plus size={18} /> AGREGAR CATEGORÍA
        </button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading ? (
          <div className="col-span-full py-20 text-center text-primary italic font-bold">
            Sincronizando categorías...
          </div>
        ) : categories.length === 0 ? (
          <div className="col-span-full py-20 text-center text-gray-500 border-2 border-dashed border-dark-700 rounded-3xl">
            <Folder size={48} className="mx-auto mb-4 opacity-20" />
            <p className="font-bold italic">No has creado categorías todavía.</p>
          </div>
        ) : (
          categories.map((cat) => (
            <div 
              key={cat.id} 
              className="card-dark group hover:border-primary/50 transition-all flex items-center justify-between p-4"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-dark-900 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <Folder size={20} />
                </div>
                <div>
                  <h4 className="font-black text-sm uppercase tracking-tighter text-white">
                    {cat.name}
                  </h4>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    {counts[cat.name] || 0} EJERCICIOS
                  </p>
                </div>
              </div>

              <button 
                onClick={() => handleDelete(cat.id, cat.name)}
                className="p-2 text-gray-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Modal para Nueva Categoría */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm card-dark !p-8 border-t-4 border-primary shadow-2xl"
            >
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>

              <h3 className="text-xl font-black italic mb-6 uppercase tracking-tighter">Nueva Categoría</h3>
              
              <form onSubmit={handleCreate} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Nombre del Grupo</label>
                  <input 
                    autoFocus
                    required
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Ej: Piernas, Empuje..."
                    className="w-full bg-dark-900 border border-dark-700 rounded-xl p-3 text-sm font-bold outline-none focus:border-primary transition-all"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
                  >
                    CANCELAR
                  </button>
                  <button 
                    disabled={saving}
                    className="flex-[2] btn-primary py-3 px-8 text-xs flex items-center justify-center gap-2"
                  >
                    {saving ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                    CREAR AHORA
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CategoryManager;
