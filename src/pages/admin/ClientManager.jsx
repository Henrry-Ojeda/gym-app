import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Users, Search, UserPlus, Shield, Mail, Edit3, Trash2, Key, Calendar, X as CloseIcon, Save, Loader2 as LoaderIcon, Wand2, ChevronRight, Dumbbell, Clock, Layers, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';

const ClientManager = () => {
  const [clients, setClients] = useState([]);
  const [routines, setRoutines] = useState([]);
  const [levels, setLevels] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [roles, setRoles] = useState([{ name: 'user' }, { name: 'admin' }]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [weeklySchedule, setWeeklySchedule] = useState({}); // { 'Lunes': routine_id }
  const [dayExercises, setDayExercises] = useState({}); // { 'Lunes': [exercises] }
  const [expandedDay, setExpandedDay] = useState(null);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    const [profilesRes, routinesRes, levelsRes, subsRes, rolesRes] = await Promise.all([
      supabase.from('profiles').select('*, subscription:subscription_id(id, name)').order('created_at', { ascending: false }),
      supabase.from('routines').select('id, title, is_template, client_id').or('client_id.is.null').order('title', { ascending: true }),
      supabase.from('routine_levels').select('*').order('name', { ascending: true }),
      supabase.from('subscriptions').select('*').order('name', { ascending: true }),
      supabase.from('system_roles').select('name').order('name', { ascending: true })
    ]);

    if (!profilesRes.error) setClients(profilesRes.data);
    if (!routinesRes.error) setRoutines(routinesRes.data);
    if (!levelsRes.error) setLevels(levelsRes.data);
    if (!subsRes.error) setSubscriptions(subsRes.data);
    
    if (!rolesRes.error && rolesRes.data.length > 0) {
      setRoles(rolesRes.data);
    }
    
    setLoading(false);
  };

  const handleEdit = async (client) => {
    setSelectedClient(client);
    setIsEditing(true);
    setIsModalOpen(true);
    setLoadingAssignments(true);
    setExpandedDay(null);

    try {
      // Fetch assignments
      const { data: assignments } = await supabase
        .from('weekly_assignments')
        .select('day_name, routine_id')
        .eq('user_id', client.id);

      const schedule = {};
      assignments?.forEach(as => {
        schedule[as.day_name] = as.routine_id;
      });
      setWeeklySchedule(schedule);

      // Fetch all private routines for this user to include in dropdown
      const { data: userRoutines } = await supabase
        .from('routines')
        .select('id, title, is_template, client_id')
        .eq('client_id', client.id);
      
      const allAvailable = [...routines.filter(r => r.is_template), ...(userRoutines || [])];
      setRoutines(allAvailable);

    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAssignments(false);
    }
  };

  const handleFetchExercises = async (day, routineId) => {
    if (!routineId || routineId === 'none') return;
    
    setLoadingAssignments(true);
    const { data } = await supabase
      .from('routine_exercises')
      .select('*, exercises(name)')
      .eq('routine_id', routineId)
      .order('order_index', { ascending: true });
    
    setDayExercises(prev => ({
      ...prev,
      [day]: data.map(re => ({
        id: re.id,
        name: re.exercises?.name || 'Ejercicio',
        sets: re.sets,
        reps: re.reps,
        rest_time: re.rest_time
      }))
    }));
    setLoadingAssignments(false);
  };

  const handleSaveExerciseChanges = async (day, exerciseIndex, field, value) => {
    const updatedDayEx = [...dayExercises[day]];
    updatedDayEx[exerciseIndex][field] = value;
    setDayExercises({...dayExercises, [day]: updatedDayEx});

    // Save to DB immediately if it's a private routine
    const routineId = weeklySchedule[day];
    const routine = routines.find(r => r.id === routineId);
    
    if (routine && !routine.is_template) {
      const exercise = updatedDayEx[exerciseIndex];
      await supabase.from('routine_exercises').update({ [field]: value }).eq('id', exercise.id);
    }
  };

  const handlePersonalizeInPlace = async (day) => {
    const routineId = weeklySchedule[day];
    const original = routines.find(r => r.id === routineId);
    if (!original || !original.is_template) return;

    const { isConfirmed } = await Swal.fire({
      title: 'Personalizar Entrenamiento',
      text: `¿Crear una copia privada de "${original.title}" para ajustar series y reps solo a este usuario?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#bcff00',
      background: '#121212',
      color: '#fff'
    });

    if (!isConfirmed) return;

    setLoadingAssignments(true);
    try {
      // 1. Fetch data
      const { data: exercisesToClone } = await supabase.from('routine_exercises').select('*').eq('routine_id', routineId);
      
      // 2. Insert new routine
      const { data: newRoutine, error } = await supabase.from('routines').insert([{
        title: `${original.title} (${selectedClient.first_name})`,
        client_id: selectedClient.id,
        is_template: false,
        admin_id: (await supabase.auth.getUser()).data.user.id
      }]).select().single();

      if (error) throw error;

      // 3. Clone exercises
      const cloned = exercisesToClone.map(ex => ({
        routine_id: newRoutine.id,
        exercise_id: ex.exercise_id,
        sets: ex.sets,
        reps: ex.reps,
        rest_time: ex.rest_time,
        order_index: ex.order_index
      }));
      await supabase.from('routine_exercises').insert(cloned);

      // 4. Update UI
      setWeeklySchedule({...weeklySchedule, [day]: newRoutine.id});
      setRoutines([...routines, newRoutine]);
      handleFetchExercises(day, newRoutine.id);

    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAssignments(false);
    }
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    const form = document.getElementById('profile-form');
    const formData = new FormData(form);
    
    const clientData = {
      first_name: formData.get('first_name'),
      last_name: formData.get('last_name'),
      role: formData.get('role'),
      current_level_id: formData.get('current_level_id') || null,
      subscription_id: formData.get('subscription_id') || null
    };

    try {
      setLoading(true);
      if (isEditing) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update(clientData)
          .eq('id', selectedClient.id);
        
        if (profileError) throw profileError;
        
        // Save assignments
        const { error: deleteError } = await supabase
          .from('weekly_assignments')
          .delete()
          .eq('user_id', selectedClient.id);
        
        if (deleteError) throw deleteError;

        const newAssignments = Object.entries(weeklySchedule)
          .filter(([_, rid]) => rid && rid !== 'none')
          .map(([day, rid]) => ({
            user_id: selectedClient.id,
            day_name: day,
            routine_id: rid
          }));

        if (newAssignments.length > 0) {
          const { error: insertError } = await supabase
            .from('weekly_assignments')
            .insert(newAssignments);
          
          if (insertError) throw insertError;
        }
      } else {
        // CREACION DE NUEVO USUARIO
        const email = formData.get('email');
        const password = formData.get('password');
        
        if (!email || !password) {
          throw new Error("Email y contraseña son obligatorios");
        }

        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: clientData.first_name,
              last_name: clientData.last_name,
              role: clientData.role
            }
          }
        });

        if (authError) throw authError;

        if (authData.user) {
          // Crear perfil completo (el trigger de supabase a veces no tiene acceso a level/subscription)
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: authData.user.id,
              email: email,
              ...clientData
            });
          
          if (profileError) throw profileError;
        }
      }
      setIsModalOpen(false);
      fetchClients();
      Swal.fire({ title: '¡Guardado!', icon: 'success', background: '#121212', color: '#fff', timer: 1500, showConfirmButton: false });
    } catch (err) {
      console.error(err);
      Swal.fire({
        title: 'Error al Guardar',
        text: err.message || 'No se pudo procesar la solicitud. Verifica los datos.',
        icon: 'error',
        background: '#121212',
        color: '#fff'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: '¿Eliminar Usuario?',
      text: "Esta acción no se puede deshacer.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ff4444',
      background: '#121212',
      color: '#fff'
    });

    if (result.isConfirmed) {
      await supabase.from('profiles').delete().eq('id', id);
      fetchClients();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text" 
            placeholder="Buscar..."
            className="w-full bg-dark-900 border border-dark-700 rounded-xl py-3 pl-10 pr-4 outline-none focus:border-primary transition-all"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <button onClick={() => { setIsEditing(false); setSelectedClient(null); setIsModalOpen(true); }} className="btn-primary flex items-center gap-2">
          <UserPlus size={20} /> NUEVO CLIENTE
        </button>
      </div>

      <div className="card-dark overflow-hidden p-0">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-dark-800/50 border-b border-dark-700 text-xs text-gray-400 uppercase tracking-widest">
              <th className="p-4">Cliente</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-700">
            {clients.filter(c => c.first_name?.toLowerCase().includes(searchQuery.toLowerCase())).map(client => (
              <tr key={client.id} className="hover:bg-primary/5 transition-colors">
                <td className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-dark-800 flex items-center justify-center font-bold text-primary italic border border-dark-700">
                    {client.first_name?.[0]+client.last_name?.[0]}
                  </div>
                  <div>
                    <p className="font-bold text-sm tracking-tight">{client.first_name} {client.last_name}</p>
                    <p className="text-xs text-gray-500">{client.email}</p>
                  </div>
                </td>
                <td className="p-4">
                  <span className="text-[10px] font-black uppercase text-primary px-2 py-0.5 bg-primary/10 rounded-lg border border-primary/20">
                    {client.subscription?.name || 'SIN PLAN'}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => handleEdit(client)} className="p-2 text-gray-400 hover:text-primary transition-colors hover:bg-primary/10 rounded-lg">
                      <Edit3 size={18} />
                    </button>
                    <button onClick={() => handleDelete(client.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors hover:bg-red-500/10 rounded-lg">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-6xl card-dark !p-0 flex flex-col max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b border-dark-700 bg-dark-800/50 flex justify-between items-center">
                <h3 className="text-2xl font-black italic uppercase tracking-tighter">
                  {isEditing ? `Editar: ${selectedClient?.first_name}` : 'Nuevo Cliente'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-white"><CloseIcon size={24}/></button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 flex flex-col lg:flex-row gap-12 custom-scrollbar">
                <div className="w-full lg:w-1/3 space-y-6">
                  <h4 className="text-[10px] font-black text-primary uppercase tracking-widest border-b border-primary/20 pb-2">Información de Perfil</h4>
                  <form id="profile-form" key={selectedClient?.id || 'new'} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Nombre</label>
                        <input name="first_name" defaultValue={selectedClient?.first_name} className="w-full bg-dark-900 border border-dark-700 rounded-lg p-2 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Apellido</label>
                        <input name="last_name" defaultValue={selectedClient?.last_name} className="w-full bg-dark-900 border border-dark-700 rounded-lg p-2 text-sm" />
                      </div>
                    </div>
                    {!isEditing && (
                      <div className="space-y-4">
                        <div className="space-y-1"><label className="text-[10px] font-bold text-gray-500 uppercase">Email</label><input name="email" className="w-full bg-dark-900 border border-dark-700 rounded-lg p-2 text-sm" /></div>
                        <div className="space-y-1"><label className="text-[10px] font-bold text-gray-500 uppercase text-primary">Contraseña</label><input name="password" type="password" className="w-full bg-dark-900 border border-dark-700 rounded-lg p-2 text-sm" /></div>
                      </div>
                    )}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Rol</label>
                      <select name="role" defaultValue={selectedClient?.role || 'user'} className="w-full bg-dark-900 border border-dark-700 rounded-lg p-2 text-sm uppercase font-bold">
                        {roles.map(r => (
                          <option key={r.name} value={r.name.toLowerCase()}>{r.name.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Nivel de Entrenamiento</label>
                      <select name="current_level_id" defaultValue={selectedClient?.current_level_id || ''} className="w-full bg-dark-900 border border-dark-700 rounded-lg p-2 text-sm uppercase font-bold text-primary">
                        <option value="">-- SIN NIVEL --</option>
                        {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Plan de Suscripción</label>
                      <select name="subscription_id" defaultValue={selectedClient?.subscription_id || ''} className="w-full bg-dark-900 border border-dark-700 rounded-lg p-2 text-sm uppercase font-bold text-white">
                        <option value="">-- SIN SUSCRIPCIÓN --</option>
                        {subscriptions.map(s => <option key={s.id} value={s.id}>{s.name} (${s.price})</option>)}
                      </select>
                    </div>
                  </form>
                </div>

                <div className="w-full lg:w-2/3 space-y-4">
                  <div className="flex justify-between items-center border-b border-primary/20 pb-2">
                    <h4 className="text-[10px] font-black text-primary uppercase tracking-widest">Programación Semanal</h4>
                    {loadingAssignments && <LoaderIcon className="animate-spin text-primary" size={14} />}
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3">
                    {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(day => (
                      <div key={day} className={`bg-dark-900 rounded-xl border transition-all ${expandedDay === day ? 'border-primary/40' : 'border-dark-700'}`}>
                        <div className="p-3 flex items-center gap-4 cursor-pointer" onClick={() => { 
                          setExpandedDay(expandedDay === day ? null : day);
                          if (expandedDay !== day) handleFetchExercises(day, weeklySchedule[day]);
                        }}>
                          <span className="w-20 text-[10px] font-black uppercase text-gray-500 italic">{day}</span>
                          <select 
                            value={weeklySchedule[day] || 'none'} 
                            className="flex-1 bg-black border border-dark-700 rounded p-1.5 text-[11px] font-bold outline-none focus:border-primary"
                            onChange={e => {
                              const rid = e.target.value;
                              setWeeklySchedule({...weeklySchedule, [day]: rid});
                              if (rid !== 'none') handleFetchExercises(day, rid);
                            }}
                            onClick={e => e.stopPropagation()}
                          >
                            <option value="none">-- DESCANSO --</option>
                            {routines.map(r => <option key={r.id} value={r.id}>{(r.title || 'Sin Título').toUpperCase()} {!r.is_template ? '⭐' : ''}</option>)}
                          </select>
                          <ChevronRight size={14} className={`transition-transform ${expandedDay === day ? 'rotate-90 text-primary' : ''}`} />
                        </div>
                        
                        {expandedDay === day && (
                          <div className="p-4 pt-0 border-t border-dark-800 space-y-4 animate-in fade-in slide-in-from-top-1">
                            {weeklySchedule[day] && weeklySchedule[day] !== 'none' ? (
                              <>
                                <div className="flex justify-between items-center px-1">
                                  <span className="text-[8px] font-black text-gray-600 uppercase">Ejercicios de la Rutina</span>
                                  {routines.find(r => r.id === weeklySchedule[day])?.is_template && (
                                    <button onClick={() => handlePersonalizeInPlace(day)} className="text-[8px] font-black text-primary border border-primary/20 px-2 py-1 rounded hover:bg-primary hover:text-black transition-all">PERSONALIZAR 🪄</button>
                                  )}
                                </div>
                                <div className="space-y-2">
                                  {dayExercises[day]?.map((ex, idx) => (
                                    <div key={idx} className="bg-dark-800 p-2 rounded-lg border border-dark-700 flex flex-wrap gap-4 items-center">
                                      <span className="text-[10px] font-bold uppercase flex-1">{ex.name}</span>
                                      <div className="flex gap-2">
                                        <div className="flex flex-col"><label className="text-[7px] text-gray-500 uppercase pl-1">Sets</label><input value={ex.sets} onChange={e => handleSaveExerciseChanges(day, idx, 'sets', e.target.value)} className="w-10 bg-black border border-dark-700 rounded p-1 text-[10px] text-center text-primary font-bold" /></div>
                                        <div className="flex flex-col"><label className="text-[7px] text-gray-500 uppercase pl-1">Reps</label><input value={ex.reps} onChange={e => handleSaveExerciseChanges(day, idx, 'reps', e.target.value)} className="w-16 bg-black border border-dark-700 rounded p-1 text-[10px] text-center text-white" /></div>
                                        <div className="flex flex-col"><label className="text-[7px] text-gray-500 uppercase pl-1">Descanso</label><input value={ex.rest_time} onChange={e => handleSaveExerciseChanges(day, idx, 'rest_time', e.target.value)} className="w-12 bg-black border border-dark-700 rounded p-1 text-[10px] text-center text-gray-400" /></div>
                                      </div>
                                    </div>
                                  ))}
                                  {(!dayExercises[day] || dayExercises[day].length === 0) && <p className="text-[10px] text-gray-600 italic text-center py-4">Cargando ejercicios...</p>}
                                </div>
                              </>
                            ) : <p className="text-center text-[10px] text-gray-600 uppercase py-6 font-bold tracking-widest">Día de Descanso / Sin Rutina</p>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-dark-700 bg-dark-800/80 backdrop-blur flex justify-end gap-4">
                <button onClick={() => setIsModalOpen(false)} className="px-8 py-3 text-xs font-bold uppercase text-gray-500 hover:text-white transition-colors">Cancelar</button>
                <button onClick={handleSave} disabled={loading} className="px-10 btn-primary py-3 text-xs flex items-center gap-2"><Save size={16} /> GUARDAR TODO</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ClientManager;
