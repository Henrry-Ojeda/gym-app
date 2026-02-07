import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Layout, Plus, Search, Trash2, ChevronRight, Dumbbell, Clock, Layers, Loader2 as LoaderIcon, Edit3, X, User, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';
import ExerciseManager from './ExerciseManager';
import CategoryManager from './CategoryManager';
import LevelManager from './LevelManager';

const RoutineManager = ({ activeRoutineSubTab = 'programs' }) => {
  const [routines, setRoutines] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [categories, setCategories] = useState([]);
  const [levels, setLevels] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [clients, setClients] = useState([]);
  const [activeFilter, setActiveFilter] = useState('Todas');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState(''); // Exercise search
  const [routineSearchQuery, setRoutineSearchQuery] = useState(''); // Routine search
  
  const [newRoutine, setNewRoutine] = useState({
    title: '',
    description: '',
    level_id: '',
    subscription_tier: 'basic',
    client_id: null,
    is_template: true,
    day_of_week: '',
    exercises: []
  });

  // Auto-fill level and subscription when client is selected
  useEffect(() => {
    if (activeRoutineSubTab === 'personal' && newRoutine.client_id) {
      const client = clients.find(c => c.id === newRoutine.client_id);
      if (client) {
        setNewRoutine(prev => ({
          ...prev,
          level_id: client.current_level_id || prev.level_id,
          subscription_tier: client.subscription_id || prev.subscription_tier
        }));
      }
    }
  }, [newRoutine.client_id, activeRoutineSubTab]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: routinesData, error: rError } = await supabase
        .from('routines')
        .select('*, routine_exercises(id), profiles:client_id(first_name, last_name)')
        .order('created_at', { ascending: false });

      if (rError) throw rError;

      setRoutines(routinesData.map(r => ({
        ...r,
        exercise_count: r.routine_exercises?.length || 0
      })));

      const [exercisesRes, catRes, levelsRes, clientsRes, subsRes] = await Promise.all([
        supabase.from('exercises').select('*').order('name', { ascending: true }),
        supabase.from('exercise_categories').select('*').order('name', { ascending: true }),
        supabase.from('routine_levels').select('*').order('name', { ascending: true }),
        supabase.from('profiles').select('id, first_name, last_name, email, current_level_id, subscription_id').order('first_name', { ascending: true }),
        supabase.from('subscriptions').select('*').order('name', { ascending: true })
      ]);

      if (!exercisesRes.error) setExercises(exercisesRes.data);
      if (!catRes.error) setCategories(catRes.data);
      if (!levelsRes.error) setLevels(levelsRes.data);
      if (!clientsRes.error) setClients(clientsRes.data);
      if (!subsRes.error) setSubscriptions(subsRes.data);

    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredExercises = exercises.filter(ex => {
    const isAlreadyAdded = newRoutine.exercises.some(added => added.exercise_id === ex.id);
    const matchesFilter = activeFilter === 'Todas' || ex.muscle_group === activeFilter;
    const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase());
    return !isAlreadyAdded && matchesFilter && matchesSearch;
  });

  const handleAddExercise = (exerciseId) => {
    const exercise = exercises.find(e => e.id === exerciseId);
    if (!exercise) return;
    
    setNewRoutine({
      ...newRoutine,
      exercises: [...newRoutine.exercises, { 
        exercise_id: exercise.id, 
        name: exercise.name,
        sets: 4, 
        reps: '12', 
        rest_time: '60s' 
      }]
    });
  };

  const handleEdit = async (routine) => {
    const { data: relData } = await supabase
      .from('routine_exercises')
      .select('*, exercises(name)')
      .eq('routine_id', routine.id)
      .order('order_index', { ascending: true });

    const formattedExercises = relData.map(rel => ({
      exercise_id: rel.exercise_id,
      name: rel.exercises?.name || 'Ejercicio',
      sets: rel.sets,
      reps: rel.reps,
      rest_time: rel.rest_time
    }));

    setNewRoutine({
      title: routine.title,
      description: routine.description || '',
      level_id: routine.level_id || '',
      subscription_tier: routine.subscription_tier || 'basic',
      client_id: routine.client_id || null,
      is_template: routine.is_template ?? true,
      day_of_week: routine.day_of_week || '',
      exercises: formattedExercises
    });
    setEditingId(routine.id);
    setIsCreating(true);
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: "Se eliminarán también las asignaciones de esta rutina en el calendario.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ff4444',
      confirmButtonText: 'SÍ, ELIMINAR',
      background: '#121212',
      color: '#fff'
    });

    if (result.isConfirmed) {
      try {
        // 1. Eliminar ejercicios asociados (por si no hay cascada)
        await supabase.from('routine_exercises').delete().eq('routine_id', id);
        
        // 2. Eliminar asignaciones en tablas de agenda
        await supabase.from('level_assignments').delete().eq('routine_id', id);
        await supabase.from('weekly_assignments').delete().eq('routine_id', id);

        // 3. Eliminar la rutina principal
        const { error } = await supabase.from('routines').delete().eq('id', id);
        
        if (error) throw error;

        Swal.fire({
          title: 'Eliminado',
          text: 'La rutina ha sido eliminada correctamente.',
          icon: 'success',
          background: '#121212',
          color: '#fff',
          timer: 1500,
          showConfirmButton: false
        });
        
        fetchData();
      } catch (err) {
        console.error("Delete Error:", err);
        Swal.fire({
          title: 'Error al eliminar',
          text: 'No se pudo eliminar la rutina. Asegúrese de que no esté siendo usada en otros módulos.',
          icon: 'error',
          background: '#121212',
          color: '#fff'
        });
      }
    }
  };

  const handleRemoveExercise = (index) => {
    const updated = [...newRoutine.exercises];
    updated.splice(index, 1);
    setNewRoutine({ ...newRoutine, exercises: updated });
  };

  const saveRoutine = async () => {
    if (!newRoutine.title || newRoutine.exercises.length === 0) {
      return Swal.fire({ title: '¡Espera!', text: 'Título y ejercicios requeridos.', icon: 'warning', background: '#121212', color: '#fff' });
    }

    if (activeRoutineSubTab === 'personal' && !newRoutine.client_id) {
      return Swal.fire({ title: 'Falta Cliente', text: 'Debes asignar un cliente para una rutina personalizada.', icon: 'warning', background: '#121212', color: '#fff' });
    }

    setSaving(true);
    try {
      let routineId = editingId;
      if (editingId) {
        await supabase.from('routines').update({
          title: newRoutine.title,
          description: newRoutine.description,
          level_id: newRoutine.level_id || null,
          subscription_tier: newRoutine.subscription_tier,
          client_id: newRoutine.client_id,
          day_of_week: newRoutine.day_of_week,
          is_template: newRoutine.client_id ? false : newRoutine.is_template
        }).eq('id', editingId);
        await supabase.from('routine_exercises').delete().eq('routine_id', editingId);
      } else {
        const { data, error } = await supabase.from('routines').insert([{
          title: newRoutine.title,
          description: newRoutine.description,
          level_id: newRoutine.level_id || null,
          subscription_tier: newRoutine.subscription_tier,
          client_id: newRoutine.client_id,
          day_of_week: newRoutine.day_of_week,
          is_template: newRoutine.client_id ? false : newRoutine.is_template,
          admin_id: (await supabase.auth.getUser()).data.user.id
        }]).select().single();
        if (error) throw error;
        routineId = data.id;
      }

      const routineExercises = newRoutine.exercises.map((ex, index) => ({
        routine_id: routineId,
        exercise_id: ex.exercise_id,
        sets: parseInt(ex.sets),
        reps: ex.reps,
        rest_time: ex.rest_time,
        order_index: index
      }));
      await supabase.from('routine_exercises').insert(routineExercises);

      setIsCreating(false);
      setEditingId(null);
      setNewRoutine({ title: '', description: '', level_id: '', subscription_tier: 'basic', client_id: null, is_template: activeRoutineSubTab === 'programs', day_of_week: '', exercises: [] });
      fetchData();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const filteredRoutines = routines.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(routineSearchQuery.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(routineSearchQuery.toLowerCase()));
    
    if (activeRoutineSubTab === 'programs') {
      return matchesSearch && r.is_template;
    }
    if (activeRoutineSubTab === 'personal') {
      return matchesSearch && !r.is_template;
    }
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {(activeRoutineSubTab === 'programs' || activeRoutineSubTab === 'personal') && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <Layers size={14} /> {activeRoutineSubTab === 'programs' ? 'GESTIÓN DE PROGRAMAS' : 'RUTINAS PERSONALIZADAS'}
            </h2>
            {!isCreating && (
              <div className="flex w-full md:w-auto gap-4 flex-1 max-w-xl">
                <div className="relative flex-1 group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                  <input 
                    type="text" 
                    placeholder="Buscar..."
                    value={routineSearchQuery}
                    onChange={(e) => setRoutineSearchQuery(e.target.value)}
                    className="w-full bg-dark-900 border border-dark-700 rounded-xl py-2 pl-10 pr-4 text-xs outline-none focus:border-primary transition-all"
                  />
                </div>
                <button 
                  onClick={() => { 
                    setEditingId(null); 
                    setNewRoutine({ 
                      title: '', 
                      description: '', 
                      level_id: '',
                      subscription_tier: 'basic',
                      client_id: null,
                      is_template: activeRoutineSubTab === 'programs',
                      day_of_week: '',
                      exercises: [] 
                    }); 
                    setIsCreating(true); 
                  }} 
                  className="btn-primary flex items-center gap-2 py-2 px-6 text-xs"
                >
                  <Plus size={16} /> {activeRoutineSubTab === 'personal' ? 'RUTINA PERSONALIZADA' : 'CREAR RUTINA'}
                </button>
              </div>
            )}
          </div>

          {isCreating ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-500">
               <div className="card-dark space-y-6 p-8 border-primary/10">
                 <div className="space-y-4">
                   <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4">
                     {activeRoutineSubTab === 'personal' && newRoutine.client_id 
                       ? `PROGRAMA PARA: ${clients.find(c => c.id === newRoutine.client_id)?.first_name} ${clients.find(c => c.id === newRoutine.client_id)?.last_name}`
                       : 'Detalles del Programa'}
                   </h3>
                   
                   <div className="space-y-1">
                     <label className="text-[9px] font-bold text-gray-500 uppercase ml-1">Título de la Rutina</label>
                     <input 
                       value={newRoutine.title} 
                       onChange={e => setNewRoutine({...newRoutine, title: e.target.value})} 
                       placeholder="Ej: Empuje Hipertrofia" 
                       className="w-full bg-dark-900 border border-dark-700 rounded-xl p-3 text-sm font-bold outline-none focus:border-primary transition-all" 
                     />
                   </div>

                   <div className="space-y-1">
                     <label className="text-[9px] font-bold text-gray-500 uppercase ml-1">Descripción / Notas</label>
                     <textarea 
                       value={newRoutine.description} 
                       onChange={e => setNewRoutine({...newRoutine, description: e.target.value})} 
                       placeholder="Instrucciones generales..." 
                       className="w-full bg-dark-900 border border-dark-700 rounded-xl p-3 text-sm outline-none focus:border-primary transition-all min-h-[80px]" 
                     />
                   </div>

                   <div className="space-y-1">
                     <label className="text-[9px] font-bold text-gray-500 uppercase ml-1">Día Asignado (Calendario)</label>
                     <select 
                       value={newRoutine.day_of_week} 
                       onChange={e => setNewRoutine({...newRoutine, day_of_week: e.target.value})}
                       className="w-full bg-dark-900 border border-dark-700 rounded-xl p-3 text-sm font-bold outline-none focus:border-primary transition-all text-primary"
                     >
                       <option value="">-- SELECCIONAR DÍA (OPCIONAL) --</option>
                       {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(d => (
                         <option key={d} value={d}>{d.toUpperCase()}</option>
                       ))}
                     </select>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                       <label className="text-[9px] font-bold text-gray-500 uppercase ml-1">Nivel Sugerido</label>
                       <select 
                         value={newRoutine.level_id} 
                         onChange={e => setNewRoutine({...newRoutine, level_id: e.target.value})}
                         className="w-full bg-dark-900 border border-dark-700 rounded-xl p-3 text-sm outline-none focus:border-primary transition-all"
                       >
                         <option value="">TODOS LOS NIVELES</option>
                         {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                       </select>
                     </div>
                     <div className="space-y-1">
                       <label className="text-[9px] font-bold text-gray-500 uppercase ml-1">Suscripción Requerida</label>
                       <select 
                         value={newRoutine.subscription_tier} 
                         onChange={e => setNewRoutine({...newRoutine, subscription_tier: e.target.value})}
                         className="w-full bg-dark-900 border border-dark-700 rounded-xl p-3 text-sm outline-none focus:border-primary transition-all font-bold"
                       >
                         <option value="">TODOS (ABIERTO)</option>
                         {subscriptions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                       </select>
                     </div>
                   </div>

                   {activeRoutineSubTab === 'personal' && (
                     <div className="space-y-1 p-4 bg-primary/5 border border-primary/20 rounded-2xl">
                       <label className="text-[9px] font-black text-primary uppercase ml-1 flex items-center gap-2">
                         <User size={12} /> Asignar a Cliente (Obligatorio)
                       </label>
                       <select 
                         value={newRoutine.client_id || ''} 
                         onChange={e => setNewRoutine({...newRoutine, client_id: e.target.value, is_template: false})}
                         className="w-full bg-black border border-dark-700 rounded-xl p-3 text-sm font-bold outline-none focus:border-primary transition-all text-white mt-2"
                       >
                         <option value="">-- SELECCIONAR CLIENTE --</option>
                         {clients.map(c => (
                           <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                         ))}
                       </select>
                     </div>
                   )}
                 </div>

                 <div className="space-y-3">
                   <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Ejercicios Seleccionados ({newRoutine.exercises.length})</h3>
                   <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                     {newRoutine.exercises.map((ex, idx) => (
                       <div key={idx} className="flex justify-between items-center bg-dark-800/50 p-3 rounded-xl border border-dark-700 group hover:border-primary/30 transition-all">
                         <div className="flex-1">
                           <p className="text-xs font-bold uppercase italic tracking-tighter">{ex.name}</p>
                           <p className="text-[9px] text-gray-500 font-bold">{ex.sets} SERIES × {ex.reps} REPS · {ex.rest_time} DESC.</p>
                         </div>
                         <button 
                           onClick={() => handleRemoveExercise(idx)}
                           className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 hover:text-red-500 hover:bg-red-500/10 transition-all"
                         >
                           <Trash2 size={14}/>
                         </button>
                       </div>
                     ))}
                     {newRoutine.exercises.length === 0 && (
                       <p className="text-[10px] text-gray-600 italic py-4">No has añadido ejercicios aún...</p>
                     )}
                   </div>
                 </div>

                 <div className="pt-6 border-t border-dark-700 flex flex-col gap-3">
                    <button 
                      onClick={saveRoutine} 
                      disabled={saving}
                      className="w-full btn-primary py-4 flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                    >
                      {saving ? <LoaderIcon className="animate-spin" size={18} /> : <><Save size={18} /> GUARDAR RUTINA</>}
                    </button>
                    <button onClick={() => setIsCreating(false)} className="w-full py-3 text-xs font-bold text-gray-500 hover:text-white transition-colors uppercase tracking-widest">CANCELAR</button>
                 </div>
               </div>
               <div className="card-dark p-6 space-y-6">
                 <div className="flex flex-col gap-4">
                   <div className="flex items-center justify-between">
                     <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Biblioteca de Ejercicios</h3>
                     <span className="text-[9px] font-bold text-primary px-2 py-0.5 bg-primary/10 rounded-full border border-primary/20">
                       {filteredExercises.length} DISPONIBLES
                     </span>
                   </div>
                   
                   <div className="relative group">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-primary transition-colors" size={14} />
                     <input 
                       placeholder="Buscar por nombre..." 
                       className="w-full bg-dark-900 border border-dark-700 rounded-xl py-2.5 pl-10 pr-4 text-xs outline-none focus:border-primary transition-all" 
                       onChange={e => setSearchQuery(e.target.value)} 
                     />
                   </div>

                   <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar no-scrollbar">
                     {['Todas', ...categories.map(c => c.name)].map(cat => (
                       <button
                         key={cat}
                         onClick={() => setActiveFilter(cat)}
                         className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all border ${
                           activeFilter === cat 
                             ? 'bg-primary text-black border-primary shadow-[0_0_10px_rgba(188,255,0,0.3)]' 
                             : 'bg-transparent text-gray-600 border-dark-700 hover:border-gray-500'
                         }`}
                       >
                         {cat}
                       </button>
                     ))}
                   </div>
                 </div>

                 <div className="max-h-[500px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                   {filteredExercises.map(ex => (
                     <button 
                       key={ex.id} 
                       onClick={() => handleAddExercise(ex.id)} 
                       className="w-full group text-left p-4 bg-dark-800/30 hover:bg-primary/5 rounded-2xl border border-dark-700 hover:border-primary/30 transition-all flex items-center justify-between gap-4"
                     >
                       <div>
                         <p className="text-[11px] font-black uppercase italic tracking-tighter group-hover:text-primary transition-colors">{ex.name}</p>
                         <p className="text-[8px] font-bold text-gray-600 uppercase mt-0.5">{ex.muscle_group || 'General'}</p>
                       </div>
                       <div className="w-8 h-8 rounded-xl bg-dark-900 border border-dark-700 flex items-center justify-center text-gray-600 group-hover:text-primary group-hover:border-primary/50 transition-all">
                         <Plus size={14}/>
                       </div>
                     </button>
                   ))}
                   {filteredExercises.length === 0 && (
                     <div className="py-10 text-center border-2 border-dashed border-dark-800 rounded-3xl">
                       <p className="text-[10px] text-gray-600 italic uppercase font-black">No hay más ejercicios disponibles</p>
                     </div>
                   )}
                 </div>
               </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRoutines.map(routine => (
                <div key={routine.id} className="card-dark p-6 group">
                  <div className="flex justify-between mb-4">
                    <Dumbbell className="text-primary" size={20} />
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(routine)}><Edit3 size={16}/></button>
                      <button onClick={() => handleDelete(routine.id)}><Trash2 size={16}/></button>
                    </div>
                  </div>
                  <h4 className="font-bold uppercase italic truncate">
                    {routine.title}
                    {activeRoutineSubTab === 'personal' && routine.profiles && (
                      <span className="text-primary ml-2 lowercase font-normal opacity-70">
                        - {routine.profiles.first_name} {routine.profiles.last_name}
                      </span>
                    )}
                  </h4>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-[10px] text-gray-500">{routine.exercise_count} EJERCICIOS</p>
                    {routine.day_of_week && (
                      <span className="text-[9px] font-black text-primary px-2 py-0.5 bg-primary/10 rounded-lg border border-primary/20">
                        {routine.day_of_week.toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeRoutineSubTab === 'exercises' && <ExerciseManager />}
      {activeRoutineSubTab === 'categories' && <CategoryManager />}
      {activeRoutineSubTab === 'levels' && <LevelManager />}
    </div>
  );
};

export default RoutineManager;
