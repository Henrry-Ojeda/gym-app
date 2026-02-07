import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Users, Calendar, Save, Trash2, Loader2, ChevronRight, Layout, Plus, Wand2, Activity, AlertCircle, X, Edit3 } from 'lucide-react';
import Swal from 'sweetalert2';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * NOTA: Este componente ahora lee directamente de la tabla 'routines' usando el campo 'day_of_week'.
 * Para que funcione, debes ejecutar: 
 * ALTER TABLE routines ADD COLUMN IF NOT EXISTS day_of_week TEXT;
 */

const GlobalAgendaManager = ({ onNavigate }) => {
  const [activeSubTab, setActiveSubTab] = useState('view'); 
  const [loading, setLoading] = useState(true);
  const [loadingModal, setLoadingModal] = useState(false);
  const [levels, setLevels] = useState([]);
  const [routines, setRoutines] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [dayAssignments, setDayAssignments] = useState({ levels: {}, personal: [], routinesSummary: [] });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [levelsRes, routinesRes, clientsRes] = await Promise.all([
        supabase.from('routine_levels').select('*').order('name', { ascending: true }),
        supabase.from('routines').select('id, title, is_template, client_id, day_of_week, level_id').order('title', { ascending: true }),
        supabase.from('profiles').select('id, first_name, last_name, email, current_level_id').order('first_name', { ascending: true })
      ]);

      setLevels(levelsRes.data || []);
      setRoutines(routinesRes.data || []);
      setClients(clientsRes.data || []);
    } catch (err) {
      console.error('Error fetching initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDayDetails = async (day) => {
    setLoadingModal(true);
    setSelectedDay(day);
    try {
      // Obtenemos las rutinas directamente asociadas a este día
      const { data: dayRoutines, error } = await supabase
        .from('routines')
        .select('*, profiles:client_id(first_name, last_name, email)')
        .eq('day_of_week', day);

      if (error) throw error;

      const grouped = {
        levels: {},
        personal: [],
        routinesSummary: []
      };

      const rMap = {};

      levels.forEach(l => {
        // Encontrar rutinas de plantilla asignadas a este nivel para este día
        const levelRoutine = dayRoutines?.find(r => r.is_template && r.level_id === l.id);
        grouped.levels[l.id] = { routine: levelRoutine || null };
        
        if (levelRoutine) {
          const rid = levelRoutine.id;
          if (!rMap[rid]) {
            rMap[rid] = { id: rid, title: levelRoutine.title, isTemplate: true, targets: [] };
          }
          rMap[rid].targets.push({ type: 'level', name: l.name });
        }
      });

      // Procesar rutinas personalizadas
      dayRoutines?.forEach(r => {
        if (!r.is_template && r.client_id) {
          grouped.personal.push({ user: r.profiles, routine: r });
        }
      });

      grouped.routinesSummary = Object.values(rMap);
      setDayAssignments(grouped);
    } catch (err) {
      console.error('Error in fetchDayDetails:', err);
    } finally {
      setLoadingModal(false);
    }
  };

  // Función para actualizar la asociación directamente en la tabla de rutinas
  const handleUpdateLevelPlan = async (levelId, routineId) => {
    setLoadingModal(true);
    try {
      // 1. Quitamos la asociación del día a cualquier rutina previa de este nivel
      await supabase.from('routines')
        .update({ day_of_week: null })
        .eq('level_id', levelId)
        .eq('day_of_week', selectedDay);

      // 2. Si se seleccionó una rutina, la asociamos al nuevo día
      if (routineId !== 'none') {
        await supabase.from('routines')
          .update({ day_of_week: selectedDay })
          .eq('id', routineId);
      }

      fetchDayDetails(selectedDay);
      Swal.fire({ title: 'Plan Actualizado', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, background: '#121212', color: '#fff' });
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingModal(false);
    }
  };

  const handleRemovePersonalDay = async (routineId) => {
    try {
      await supabase.from('routines').update({ day_of_week: null }).eq('id', routineId);
      fetchDayDetails(selectedDay);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-primary" size={32} />
        <p className="text-[10px] font-black uppercase text-gray-500">Sincronizando Calendario...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 pt-4">
        {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(day => (
          <button 
            key={day} 
            onClick={() => fetchDayDetails(day)}
            className="group card-dark p-6 hover:border-primary/40 transition-all flex flex-col items-center gap-4 py-12"
          >
            <div className="w-14 h-14 rounded-full bg-dark-800 flex items-center justify-center text-gray-500 group-hover:bg-primary/20 group-hover:text-primary transition-colors">
              <Calendar size={24} />
            </div>
            <div className="text-center">
              <h4 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">{day}</h4>
            </div>
            <ChevronRight size={14} className="mt-2 text-dark-600 group-hover:translate-x-1 transition-transform" />
          </button>
        ))}
      </div>

      <AnimatePresence>
        {selectedDay && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedDay(null)} className="absolute inset-0 bg-black/95 backdrop-blur-xl" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative w-full max-w-6xl bg-dark-900 border border-dark-700 rounded-[3rem] shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
              
              <div className="p-8 border-b border-dark-700 flex justify-between items-center bg-black/40">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
                    <Calendar size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black italic uppercase tracking-tighter leading-none">{selectedDay}</h2>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-2">Programación basada en rutinas</p>
                  </div>
                </div>
                <button onClick={() => setSelectedDay(null)} className="p-3 hover:bg-dark-800 rounded-full transition-all text-gray-500 hover:text-white">
                  <Plus size={28} className="rotate-45" />
                </button>
              </div>

              <div className="p-10 overflow-y-auto space-y-12 custom-scrollbar">
                {loadingModal ? (
                  <div className="h-64 flex flex-col items-center justify-center gap-4">
                    <Loader2 className="animate-spin text-primary" size={40} />
                    <p className="text-[12px] font-black uppercase text-gray-400 tracking-widest">Calculando Agenda...</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-8">
                       <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                             <div className="w-2 h-6 bg-primary rounded-full" />
                             <h3 className="text-sm font-black text-white uppercase tracking-widest">Resumen de Ejecución Diaria</h3>
                          </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                         {dayAssignments.routinesSummary?.map((rs, idx) => (
                           <div key={idx} className="bg-gradient-to-br from-dark-800 to-black border border-dark-700 p-6 rounded-[2.5rem] hover:border-primary/40 transition-all flex flex-col gap-4">
                              <div className="flex items-center justify-between gap-3">
                                 <div className="flex items-center gap-3 flex-1 overflow-hidden">
                                    <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                                       {rs.isTemplate ? <Layout size={18} /> : <Wand2 size={18} />}
                                    </div>
                                    <p className="text-[11px] font-black text-white uppercase truncate italic">{rs.title}</p>
                                 </div>
                                 <button 
                                   onClick={() => onNavigate('routines', rs.isTemplate ? 'programs' : 'personal')}
                                   className="w-8 h-8 rounded-xl bg-dark-900 flex items-center justify-center text-gray-500 hover:text-primary transition-all border border-dark-700 flex-shrink-0"
                                 >
                                    <Edit3 size={14} />
                                 </button>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                 {rs.targets.map((t, tidx) => (
                                   <span key={tidx} className={`text-[8px] font-black px-3 py-1.5 rounded-full uppercase ${t.type === 'level' ? 'bg-primary text-black' : 'bg-dark-700 text-gray-400'}`}>
                                     {t.name}
                                   </span>
                                 ))}
                              </div>
                           </div>
                         ))}
                       </div>
                    </div>

                    <div className="space-y-8">
                      <div className="flex items-center gap-3">
                         <div className="w-2 h-6 bg-primary/40 rounded-full" />
                         <h3 className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Asignación Directa por Niveles</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {levels.map(lvl => {
                          const currentRout = dayAssignments.levels[lvl.id]?.routine;
                          return (
                            <div key={lvl.id} className="bg-black/40 border border-dark-700 rounded-3xl p-6">
                              <h5 className="text-[10px] font-black text-primary uppercase mb-4">{lvl.name}</h5>
                              <select 
                                value={currentRout?.id || 'none'}
                                onChange={(e) => handleUpdateLevelPlan(lvl.id, e.target.value)}
                                className="w-full bg-dark-800 border-none rounded-2xl px-5 py-4 text-xs font-black uppercase text-white outline-none ring-1 ring-dark-700 focus:ring-primary cursor-pointer"
                              >
                                <option value="none">-- DÍA DE DESCANSO --</option>
                                {routines.filter(r => r.is_template && (r.level_id === lvl.id || !r.level_id)).map(r => (
                                  <option key={r.id} value={r.id}>{r.title.toUpperCase()}</option>
                                ))}
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-8">
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <div className="w-2 h-6 bg-primary rounded-full shadow-[0_0_10px_rgba(188,255,0,0.5)]" />
                            <h3 className="text-sm font-black text-white uppercase tracking-widest">Rutinas Personalizadas Activas</h3>
                         </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                         {dayAssignments.personal?.map((item, idx) => (
                           <div key={idx} className="bg-dark-800 border border-dark-700 p-6 rounded-[2.5rem] group">
                              <div className="flex justify-between items-start mb-6">
                                 <div>
                                    <p className="text-[14px] font-black text-white italic">{item.user?.first_name} {item.user?.last_name}</p>
                                    <p className="text-[9px] text-gray-500 uppercase">{item.user?.email}</p>
                                 </div>
                                 <div className="flex gap-2">
                                    <button onClick={() => handleRemovePersonalDay(item.routine.id)} className="w-10 h-10 rounded-2xl bg-red-500/10 hover:bg-red-500 text-gray-400 hover:text-white flex items-center justify-center transition-all border border-red-500/20">
                                       <Trash2 size={16} />
                                    </button>
                                    <button onClick={() => onNavigate('routines', 'personal')} className="w-10 h-10 rounded-2xl bg-primary/10 hover:bg-primary text-primary hover:text-black flex items-center justify-center transition-all border border-primary/20">
                                       <Edit3 size={16} />
                                    </button>
                                 </div>
                              </div>
                              <div className="p-4 bg-black/40 border border-primary/20 rounded-2xl">
                                 <p className="text-[11px] font-black text-primary uppercase italic truncate">{item.routine?.title}</p>
                              </div>
                           </div>
                         ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="p-8 bg-black/60 border-t border-dark-700 flex justify-end">
                <button onClick={() => setSelectedDay(null)} className="px-12 py-5 bg-primary text-black text-xs font-black uppercase rounded-[1.5rem]">
                  Cerrar Gestión
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GlobalAgendaManager;
