import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Upload, Video, CheckCircle2, Loader2, X, Edit3, Trash2, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const UNcategorized = 'Sin Clasificar';

const ExerciseManager = () => {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [status, setStatus] = useState(null); 
  const [exercises, setExercises] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeFilter, setActiveFilter] = useState('Todas');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Edit State
  const [editingExercise, setEditingExercise] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    muscle_group: UNcategorized,
    description: '',
  });
  const [videoFile, setVideoFile] = useState(null);
  const [imageFile, setImageFile] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setFetching(true);
    try {
      const [exRes, catRes] = await Promise.all([
        supabase.from('exercises').select('*').order('created_at', { ascending: false }),
        supabase.from('exercise_categories').select('*').order('name', { ascending: true })
      ]);

      if (!exRes.error) setExercises(exRes.data);
      if (!catRes.error) setCategories(catRes.data);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setFetching(false);
    }
  };

  const handleDelete = async (id, videoUrl, imageUrl) => {
    if (!confirm('¿Seguro que quieres eliminar este ejercicio?')) return;

    try {
      // 1. Delete from DB
      const { error: dbError } = await supabase.from('exercises').delete().eq('id', id);
      if (dbError) throw dbError;

      // 2. Delete files from Storage
      const filesToRemove = [];
      if (videoUrl) filesToRemove.push(videoUrl.split('/').pop());
      if (imageUrl) filesToRemove.push(imageUrl.split('/').pop());
      
      if (filesToRemove.length > 0) {
        await supabase.storage.from('exercise-videos').remove(filesToRemove);
      }

      setExercises(prev => prev.filter(ex => ex.id !== id));
    } catch (error) {
      console.error('Error eliminando:', error);
      alert('Error al eliminar el ejercicio');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setLoading(true);
    setStatus(null);
    setUploadProgress(0);

    try {
      let video_url = null;
      let thumbnail_url = null;

      // 1. Subir Video si existe
      if (videoFile) {
        const fileExt = videoFile.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}_video.${fileExt}`;
        const { error: storageError } = await supabase.storage
          .from('exercise-videos')
          .upload(fileName, videoFile);
        if (storageError) throw storageError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('exercise-videos')
          .getPublicUrl(fileName);
        video_url = publicUrl;
      }

      setUploadProgress(50);

      // 2. Subir Imagen si existe
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}_image.${fileExt}`;
        const { error: storageError } = await supabase.storage
          .from('exercise-videos')
          .upload(fileName, imageFile);
        if (storageError) throw storageError;

        const { data: { publicUrl } } = supabase.storage
          .from('exercise-videos')
          .getPublicUrl(fileName);
        thumbnail_url = publicUrl;
      }

      setUploadProgress(80);

      // 3. Guardar en Base de Datos
      const { error: dbError } = await supabase
        .from('exercises')
        .insert([{
          name: formData.name,
          muscle_group: formData.muscle_group,
          description: formData.description,
          video_url: video_url,
          thumbnail_url: thumbnail_url
        }]);

      if (dbError) throw dbError;

      setUploadProgress(100);
      setStatus('success');
      setFormData({ name: '', muscle_group: UNcategorized, description: '' });
      setVideoFile(null);
      setImageFile(null);
      fetchData();
      
    } catch (error) {
      console.error('Error:', error);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase
        .from('exercises')
        .update({
          name: editingExercise.name,
          muscle_group: editingExercise.muscle_group,
          description: editingExercise.description
        })
        .eq('id', editingExercise.id);

      if (error) throw error;
      setIsEditModalOpen(false);
      fetchData();
    } catch (error) {
      alert('Error al actualizar');
    } finally {
      setLoading(false);
    }
  };

  const filteredExercises = exercises.filter(ex => 
    (activeFilter === 'Todas' || ex.muscle_group === activeFilter) &&
    (ex.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
      {/* Formulario Lateral */}
      <div className="lg:col-span-1">
        <div className="card-dark sticky top-24">
          <h2 className="text-xl font-black mb-6 flex items-center gap-2 italic">
            <Video className="text-primary" size={20} /> CONFIGURADOR
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Nombre</label>
              <input 
                type="text" 
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Ej: Press de Banca"
                className="w-full bg-dark-900 border border-dark-700 rounded-lg p-2.5 text-sm outline-none focus:border-primary transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Instrucciones</label>
              <textarea 
                rows="2"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full bg-dark-900 border border-dark-700 rounded-lg p-2.5 text-sm outline-none focus:border-primary transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Dropzone Video */}
              <div className="border-2 border-dashed border-dark-700 rounded-xl p-3 text-center hover:border-primary/50 transition-colors relative h-32 flex flex-col items-center justify-center">
                {!videoFile ? (
                  <>
                    <Video className="text-gray-600 mb-1" size={20} />
                    <p className="text-[10px] text-gray-400">Video Principal</p>
                    <input 
                      type="file" 
                      accept="video/*"
                      onChange={(e) => setVideoFile(e.target.files[0])}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </>
                ) : (
                  <div className="flex flex-col items-center">
                    <CheckCircle2 size={24} className="text-primary mb-1" />
                    <span className="text-[10px] truncate max-w-[80px]">{videoFile.name}</span>
                    <button type="button" onClick={() => setVideoFile(null)} className="text-red-500 mt-1">
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>

              {/* Dropzone Imagen */}
              <div className="border-2 border-dashed border-dark-700 rounded-xl p-3 text-center hover:border-primary/50 transition-colors relative h-32 flex flex-col items-center justify-center">
                {!imageFile ? (
                  <>
                    <Upload className="text-gray-600 mb-1" size={20} />
                    <p className="text-[10px] text-gray-400">Imagen / Mini</p>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => setImageFile(e.target.files[0])}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </>
                ) : (
                  <div className="flex flex-col items-center">
                    <CheckCircle2 size={24} className="text-primary mb-1" />
                    <span className="text-[10px] truncate max-w-[80px]">{imageFile.name}</span>
                    <button type="button" onClick={() => setImageFile(null)} className="text-red-500 mt-1">
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Categoría</label>
              <select 
                className="w-full bg-dark-900 border border-dark-700 rounded-lg p-2.5 text-sm outline-none focus:border-primary transition-colors font-bold uppercase tracking-tighter"
                value={formData.muscle_group}
                onChange={(e) => setFormData({...formData, muscle_group: e.target.value})}
              >
                <option value={UNcategorized}>-- Sin Clasificar --</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>

            {loading && (
              <div className="w-full h-1 bg-dark-900 rounded-full overflow-hidden mt-4">
                <div className="h-full bg-primary transition-all" style={{ width: `${uploadProgress}%` }} />
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : "CREAR RECURSO"}
            </button>
          </form>
        </div>
      </div>

      {/* Catálogo de Ejercicios */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2 leading-none">
            RECURSOS MULTIMEDIA ({filteredExercises.length})
          </h3>
          
          <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative w-full md:w-48 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-primary transition-colors" size={14} />
              <input 
                type="text"
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-dark-900 border border-dark-700 rounded-xl py-2 pl-9 pr-3 text-[10px] outline-none focus:border-primary transition-all font-bold"
              />
            </div>

            <div className="flex gap-2 flex-wrap justify-end">
              {['Todas', UNcategorized, ...categories.map(c => c.name)].map(filter => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`text-[9px] font-black uppercase tracking-tighter px-3 py-1 rounded-full border transition-all ${
                    activeFilter === filter 
                      ? 'bg-primary text-black border-primary' 
                      : 'bg-transparent text-gray-500 border-dark-700 hover:border-gray-500'
                  }`}
                >
                  {filter === UNcategorized ? 'Sueltos' : filter}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fetching ? (
            <div className="col-span-2 p-20 text-center text-primary italic font-bold">Cargando catálogo...</div>
          ) : filteredExercises.length === 0 ? (
            <div className="col-span-2 p-20 text-center text-gray-500 italic border-2 border-dashed border-dark-800 rounded-3xl py-16">
              No hay recursos bajo este filtro.
            </div>
          ) : (
            filteredExercises.map((ex) => (
              <div key={ex.id} className="card-dark group overflow-hidden border-dark-700 hover:border-primary/30 transition-all">
                <div className="aspect-video bg-dark-900 -mx-6 -mt-6 mb-4 relative overflow-hidden">
                  {ex.video_url ? (
                    <video 
                      src={ex.video_url} 
                      className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                      muted
                      onMouseOver={e => e.target.play()}
                      onMouseOut={e => { e.target.pause(); e.target.currentTime = 0; }}
                    />
                  ) : ex.thumbnail_url ? (
                    <img src={ex.thumbnail_url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-700 italic text-[10px]">Sin multimedia</div>
                  )}
                  
                  <div className="absolute top-2 right-2 flex gap-2 translate-y-[-100%] group-hover:translate-y-0 transition-transform">
                    <button 
                      onClick={() => { setEditingExercise(ex); setIsEditModalOpen(true); }}
                      className="p-1.5 bg-primary/80 rounded-lg hover:bg-primary text-black transition-colors"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button 
                      onClick={() => handleDelete(ex.id, ex.video_url, ex.thumbnail_url)}
                      className="p-1.5 bg-red-500/80 rounded-lg hover:bg-red-500 text-white transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
                
                <h4 className="font-bold text-sm mb-1 uppercase tracking-tighter truncate">{ex.name}</h4>
                <div className="flex justify-between items-center">
                  <span className={`text-[10px] font-black uppercase ${ex.muscle_group === UNcategorized ? 'text-gray-600' : 'text-primary'}`}>
                    {ex.muscle_group}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal de Edición */}
      <AnimatePresence>
        {isEditModalOpen && editingExercise && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md card-dark !p-8 border-t-4 border-primary shadow-2xl"
            >
              <h3 className="text-xl font-black italic mb-6 uppercase tracking-tighter">Organizar Recurso</h3>
              
              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Nombre</label>
                  <input 
                    value={editingExercise.name}
                    onChange={(e) => setEditingExercise({...editingExercise, name: e.target.value})}
                    className="w-full bg-dark-900 border border-dark-700 rounded-lg p-2.5 text-sm outline-none focus:border-primary transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Instrucciones</label>
                  <textarea 
                    rows="3"
                    value={editingExercise.description}
                    onChange={(e) => setEditingExercise({...editingExercise, description: e.target.value})}
                    className="w-full bg-dark-900 border border-dark-700 rounded-lg p-2.5 text-sm outline-none focus:border-primary transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 text-primary">Asignar a Categoría</label>
                  <select 
                    value={editingExercise.muscle_group}
                    onChange={(e) => setEditingExercise({...editingExercise, muscle_group: e.target.value})}
                    className="w-full bg-dark-900 border border-dark-700 rounded-lg p-2.5 text-sm font-bold uppercase"
                  >
                    <option value={UNcategorized}>-- Sin Clasificar --</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-4 mt-8">
                  <button 
                    type="button" 
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1 text-[10px] font-black uppercase text-gray-500 hover:text-white"
                  >
                    ATRÁS
                  </button>
                  <button 
                    type="submit"
                    className="flex-[2] btn-primary py-3 text-xs"
                  >
                    GUARDAR CAMBIOS
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

export default ExerciseManager;
