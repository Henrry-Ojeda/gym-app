import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Users, Calendar, Save, Trash2, Filter, Loader2, CheckCircle2 } from 'lucide-react';
import Swal from 'sweetalert2';
import { motion } from 'framer-motion';

const MassAssignment = () => {
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [levels, setLevels] = useState([]);
  const [routines, setRoutines] = useState([]);
  
  // Selection state
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedTier, setSelectedTier] = useState('all');
  const [selectedDay, setSelectedDay] = useState('Lunes');
  const [selectedRoutine, setSelectedRoutine] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [levelsRes, routinesRes] = await Promise.all([
      supabase.from('routine_levels').select('*').order('name', { ascending: true }),
      supabase.from('routines').select('id, title').is('client_id', null).order('title', { ascending: true })
    ]);

    if (!levelsRes.error) setLevels(levelsRes.data);
    if (!routinesRes.error) setRoutines(routinesRes.data);
    setLoading(false);
  };

  const handleApply = async () => {
    if (!selectedRoutine) {
      return Swal.fire({ title: 'Atención', text: 'Debes seleccionar una rutina.', icon: 'warning', background: '#121212', color: '#fff' });
    }

    const { isConfirmed } = await Swal.fire({
      title: '¿Confirmar asignación masiva?',
      text: `Se aplicará la rutina a todos los usuarios que cumplan el filtro para el día ${selectedDay}. Esto sobrescribirá sus agendas actuales de ese día.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#bcff00',
      confirmButtonText: 'SÍ, APLICAR A TODOS',
      background: '#121212',
      color: '#fff'
    });

    if (!isConfirmed) return;

    setApplying(true);
    try {
      // 1. Get filtered users
      let query = supabase.from('profiles').select('id');
      if (selectedLevel !== 'all') query = query.eq('current_level_id', selectedLevel);
      if (selectedTier !== 'all') query = query.eq('subscription_status', selectedTier);
      
      const { data: users, error: usersError } = await query;
      if (usersError) throw usersError;

      if (!users || users.length === 0) {
        throw new Error('No se encontraron usuarios con esos filtros.');
      }

      // 2. Prepare assignments (Upsert style)
      const assignments = users.map(user => ({
        user_id: user.id,
        routine_id: selectedRoutine,
        day_name: selectedDay
      }));

      // 3. Delete old assignments for these users on this specific day to avoid UNIQUE constraint error
      // Actually, Supabase upsert works if we have an ON CONFLICT (user_id, day_name)
      // I added UNIQUE(user_id, day_name) in the SQL.
      
      const { error: upsertError } = await supabase
        .from('weekly_assignments')
        .upsert(assignments, { onConflict: 'user_id,day_name' });

      if (upsertError) throw upsertError;

      Swal.fire({
        title: '¡Éxito!',
        text: `Asignación completada para ${users.length} usuarios.`,
        icon: 'success',
        background: '#121212',
        color: '#fff'
      });
      
    } catch (error) {
      console.error(error);
      Swal.fire({ title: 'Error', text: error.message, icon: 'error', background: '#121212', color: '#fff' });
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="card-dark border-primary/20 p-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <Users size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black italic uppercase tracking-tight">Macro-Asignación de Rutinas</h3>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest leading-none mt-1">Sincroniza grupos enteros de un solo golpe</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Step 1: Filters */}
          <div className="space-y-6">
            <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2">
              <Filter size={14} /> 1. FILTRAR POBLACIÓN
            </h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Nivel / Grupo</label>
                <select 
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-700 rounded-xl p-3 text-sm font-bold uppercase outline-none focus:border-primary transition-all"
                >
                  <option value="all">TODOS LOS NIVELES</option>
                  {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Estatus Suscripción</label>
                <select 
                  value={selectedTier}
                  onChange={(e) => setSelectedTier(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-700 rounded-xl p-3 text-sm font-bold uppercase outline-none focus:border-primary transition-all"
                >
                  <option value="all">TODOS (BASICO + PREMIUM)</option>
                  <option value="active">SOLO PREMIUM (VIP)</option>
                  <option value="inactive">SOLO BÁSICO</option>
                </select>
              </div>
            </div>
          </div>

          {/* Step 2: Routine & Day */}
          <div className="space-y-6">
            <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2">
              <Calendar size={14} /> 2. DEFINIR AGENDA
            </h4>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Día de la Semana</label>
                <select 
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-700 rounded-xl p-3 text-sm font-bold uppercase outline-none focus:border-primary transition-all"
                >
                  {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Rutina a Asignar</label>
                <select 
                  value={selectedRoutine}
                  onChange={(e) => setSelectedRoutine(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-700 rounded-xl p-3 text-sm font-bold uppercase outline-none focus:border-primary transition-all text-primary"
                >
                  <option value="">-- SELECCIONAR RUTINA --</option>
                  {routines.map(r => (
                    <option key={r.id} value={r.id}>{r.title}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-dark-700 flex flex-col sm:flex-row items-center justify-between gap-6">
           <div className="flex items-center gap-3 text-gray-500 italic">
              <CheckCircle2 size={16} className="text-gray-700" />
              <p className="text-[10px] uppercase font-bold tracking-widest">Afectará múltiples cuentas de forma segura</p>
           </div>
           
           <button 
            onClick={handleApply}
            disabled={applying || loading}
            className="btn-primary flex items-center gap-3 py-4 px-10 shadow-lg shadow-primary/20 w-full sm:w-auto"
           >
             {applying ? (
               <Loader2 className="animate-spin" size={20} />
             ) : (
               <><Save size={20} /> EJECUTAR ACTUALIZACIÓN MASIVA</>
             )}
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Usuarios Totales" value="--" icon={<Users size={16}/>} />
        <StatCard label="Niveles Creados" value={levels.length} icon={<Filter size={16}/>} />
        <StatCard label="Plantillas Disponibles" value={routines.length} icon={<Calendar size={16}/>} />
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon }) => (
  <div className="card-dark !p-4 border-dark-800 flex items-center justify-between group hover:border-dark-700 transition-all">
    <div>
      <p className="text-[8px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">{label}</p>
      <span className="text-xl font-black italic">{value}</span>
    </div>
    <div className="w-8 h-8 rounded-lg bg-dark-800 flex items-center justify-center text-gray-600 group-hover:text-primary transition-colors">
      {icon}
    </div>
  </div>
);

export default MassAssignment;
