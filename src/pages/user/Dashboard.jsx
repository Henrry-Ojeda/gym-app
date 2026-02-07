import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Dumbbell, MessageCircle, User, Activity, Play, LogOut, Clock, CreditCard, Sparkles, Loader2, X, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import UserChat from './UserChat';
import UserSubscription from './UserSubscription';
import ProfileManager from '../../components/ProfileManager';

const UserDashboard = ({ user, onLogout }) => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home'); // 'home', 'chat', 'subscription', 'profile'
  const [weeklySchedule, setWeeklySchedule] = useState({});
  const [todayRoutine, setTodayRoutine] = useState(null);
  const [currentDay, setCurrentDay] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [workoutMode, setWorkoutMode] = useState(() => localStorage.getItem('gym_workout_active') === 'true');
  const [completedExercises, setCompletedExercises] = useState(() => {
    const saved = localStorage.getItem('gym_workout_progress');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeVideo, setActiveVideo] = useState(null);

  useEffect(() => {
    localStorage.setItem('gym_workout_active', workoutMode);
    if (!workoutMode) {
      // Opcional: Podrías querer mantener el progreso aunque cierres el overlay, 
      // pero por ahora limpiamos si no está en modo entrenamiento para evitar basura
    }
  }, [workoutMode]);

  useEffect(() => {
    localStorage.setItem('gym_workout_progress', JSON.stringify(completedExercises));
  }, [completedExercises]);

  const toggleExercise = (id) => {
    setCompletedExercises(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const finishWorkout = () => {
    Swal.fire({
      title: '¡Buen trabajo!',
      text: 'Has completado tu sesión de hoy.',
      icon: 'success',
      background: '#121212',
      color: '#fff',
      confirmButtonText: 'CERRAR',
      confirmButtonColor: '#bcff00'
    });
    setWorkoutMode(false);
    setCompletedExercises([]);
    localStorage.removeItem('gym_workout_progress');
    localStorage.removeItem('gym_workout_active');
  };

  const fetchUpdatedUser = async () => {
    // Esto refresca los datos del usuario localmente después de un cambio de perfil
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();
      if (data) Object.assign(user, data);
    }
  };

  useEffect(() => {
    fetchUserData();
    if (user?.id) fetchUnreadCount();

    // Suscribirse a nuevos mensajes para notificaciones en tiempo real
    const channel = supabase
      .channel('unread_messages')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages'
      }, () => {
        if (activeTab !== 'chat') fetchUnreadCount();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user, activeTab]);

  useEffect(() => {
    if (activeTab === 'chat' && unreadCount > 0) {
      setUnreadCount(0);
    }
  }, [activeTab, unreadCount]);

  const fetchUnreadCount = async () => {
    try {
      // 1. Obtener los IDs de los chats del usuario
      const { data: userChats } = await supabase
        .from('chats')
        .select('id')
        .eq('client_id', user.id);

      if (!userChats?.length) return;

      const chatIds = userChats.map(c => c.id);

      // 2. Contar mensajes no leídos (sender_id != user.id AND is_read = false)
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('chat_id', chatIds)
        .neq('sender_id', user.id)
        .eq('is_read', false);

      setUnreadCount(count || 0);
    } catch (err) {
      console.error("Error fetching unread count:", err);
    }
  };

  const fetchUserData = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const today = days[new Date().getDay()];
    setCurrentDay(today);

    try {
      // Construir la consulta de forma segura
      let query = supabase
        .from('routines')
        .select(`
          *,
          routine_exercises (
            id,
            sets,
            reps,
            rest_time,
            exercises (name, video_url, thumbnail_url)
          )
        `);

      if (user.current_level_id) {
        query = query.or(`client_id.eq.${user.id},and(is_template.eq.true,level_id.eq.${user.current_level_id})`);
      } else {
        query = query.eq('client_id', user.id);
      }

      const { data: routinesData, error } = await query;
      if (error) throw error;

      const scheduleObj = {};
      routinesData?.forEach(r => {
        if (r.day_of_week) {
          // Si hay varias rutinas el mismo día (raro), la personalizada del cliente gana
          if (!scheduleObj[r.day_of_week] || r.client_id === user.id) {
            scheduleObj[r.day_of_week] = r;
          }
        }
      });

      setWeeklySchedule(scheduleObj);
      if (scheduleObj[today]) setTodayRoutine(scheduleObj[today]);

    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    }
    
    setLoading(false);
  };

  if (!user) return (
    <div className="h-screen flex flex-col items-center justify-center bg-black gap-4 font-inter">
      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center animate-spin border border-primary/20">
        <Loader2 className="text-primary" size={24} />
      </div>
      <span className="text-[10px] uppercase tracking-[0.3em] text-gray-500 font-bold">Identificando Perfil</span>
    </div>
  );

  const isExpired = !user.subscription_expires_at || new Date(user.subscription_expires_at) < new Date();

  // Si está vencido y no está en chat o perfil, lo mandamos a un estado de bloqueo
  const isBlocked = isExpired && activeTab !== 'chat';

  return (
    <div className="min-h-screen bg-black text-white pb-32 font-inter">
      {/* Header Premium */}
      <header className="px-6 py-6 flex justify-between items-center glass sticky top-0 z-40 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/40 flex items-center justify-center overflow-hidden shadow-lg shadow-primary/5">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User size={24} className="text-primary" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
               <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em] leading-none text-glow">Athlete • Core</p>
               <span className="w-1 h-1 bg-gray-700 rounded-full" />
               <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">{user?.subscription_tier || 'Free'}</span>
            </div>
            <h2 className="text-xl font-black uppercase leading-none tracking-tighter mt-1 italic">
              {user?.first_name || 'Atleta'} {user?.last_name || ''}
            </h2>
          </div>
        </div>
        <button onClick={onLogout} className="w-10 h-10 rounded-xl bg-dark-800 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-all">
          <LogOut size={18} />
        </button>
      </header>

      <main className="px-6 py-8">
        <AnimatePresence mode="wait">
          {isBlocked ? (
            <motion.div 
              key="blocked"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center p-10 card-dark border-red-500/20 bg-gradient-to-b from-red-500/10 to-transparent min-h-[400px] text-center"
            >
              <div className="w-20 h-20 rounded-[2rem] bg-red-500/20 flex items-center justify-center mb-6 border border-red-500/30">
                <CreditCard size={40} className="text-red-500" />
              </div>
              <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white mb-2">MEMBRESÍA <span className="text-red-500">VENCIDA</span></h3>
              <p className="text-gray-400 text-sm max-w-xs leading-relaxed mb-8">
                Tu acceso a los planes de entrenamiento ha expirado. Para continuar con tu progreso, por favor regulariza tu mensualidad.
              </p>
              
              <div className="space-y-4 w-full max-w-xs">
                <button 
                  onClick={() => setActiveTab('chat')}
                  className="w-full py-4 bg-primary text-black font-black uppercase text-[10px] tracking-widest rounded-2xl flex items-center justify-center gap-2 hover:scale-105 transition-all shadow-xl shadow-primary/20"
                >
                  <MessageCircle size={18} /> NOTIFICAR PAGO POR CHAT
                </button>
                <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest italic">
                  *Solo el chat permanece activo para soporte
                </p>
              </div>
            </motion.div>
          ) : activeTab === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {/* Main Routine Section */}
              <section>
                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Activity size={14} className="text-primary" /> MIS RUTINAS • HOY ({currentDay.toUpperCase()})
                </h3>
                
                {loading ? (
                  <div className="h-56 card-dark animate-pulse flex flex-col items-center justify-center gap-4 border-primary/5">
                    <Loader2 className="animate-spin text-primary/20" size={32} />
                    <span className="text-[10px] font-black text-primary/20 uppercase tracking-widest">Sincronizando arsenal...</span>
                  </div>
                ) : todayRoutine ? (
                  <div className="card-dark relative overflow-hidden group border-primary/20 bg-gradient-to-br from-dark-900 to-black p-8">
                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-4">
                        <div className="bg-primary/10 border border-primary/20 px-3 py-1 rounded-full text-[9px] font-black text-primary uppercase tracking-widest">
                           {todayRoutine.is_template ? 'Programa de Nivel' : 'Plan Personalizado'}
                        </div>
                        <Sparkles className="text-primary opacity-50" size={18} />
                      </div>
                      <h4 className="text-5xl font-black italic uppercase leading-none mb-4 tracking-tighter text-glow truncate pr-10">{todayRoutine.title}</h4>
                      <p className="text-[12px] text-gray-400 mb-8 max-w-[90%] leading-relaxed font-medium">{todayRoutine.description || 'Maximiza tu potencial con la sesión técnica de hoy.'}</p>
                      
                      <div className="flex items-center gap-6 mb-8">
                        <div className="flex flex-col">
                           <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-1">Duración Est.</span>
                           <div className="flex items-center gap-2 text-sm font-black text-white italic">
                             <Clock size={16} className="text-primary" /> 45 MIN
                           </div>
                        </div>
                        <div className="flex flex-col">
                           <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-1">Volumen Técnico</span>
                           <div className="flex items-center gap-2 text-sm font-black text-white italic">
                             <Activity size={16} className="text-primary" /> {todayRoutine.routine_exercises?.length || 0} EJERCICIOS
                           </div>
                        </div>
                      </div>

                      <button 
                        onClick={() => setWorkoutMode(true)}
                        className="btn-primary w-full flex items-center justify-center gap-3 py-5 group shadow-2xl shadow-primary/10"
                      >
                        <Play fill="black" size={22} className="group-hover:scale-110 transition-transform" /> 
                        <span className="text-sm font-black tracking-tight italic uppercase">INICIAR ENTRENAMIENTO</span>
                      </button>
                    </div>
                    <div className="absolute -right-12 -top-12 opacity-[0.03] pointer-events-none group-hover:opacity-[0.05] group-hover:scale-110 transition-all duration-700">
                      <Dumbbell size={280} />
                    </div>
                  </div>
                ) : (
                  <div className="card-dark border-dashed border-dark-700 py-16 text-center bg-dark-900/10">
                    <div className="bg-dark-800 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-dark-700 shadow-xl">
                      <Activity className="text-gray-600" size={32} />
                    </div>
                    <p className="text-white font-black text-lg italic uppercase tracking-tight mb-2">DÍA DE RECUPERACIÓN</p>
                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest max-w-[200px] mx-auto opacity-50">Prepárate para la próxima sesión de alto impacto.</p>
                  </div>
                )}
              </section>

              {/* Weekly Map */}
              <section>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">MAPA SEMANAL</h3>
                  <div className="w-20 h-[1px] bg-dark-800" />
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                  {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map((day) => {
                    const isToday = day === currentDay;
                    const routine = weeklySchedule[day];
                    
                    return (
                      <div 
                        key={day} 
                        className={`flex-shrink-0 w-32 p-5 rounded-[1.8rem] border transition-all relative overflow-hidden ${
                          isToday 
                            ? 'bg-primary border-primary text-black shadow-xl shadow-primary/10' 
                            : routine 
                              ? 'bg-dark-900 border-dark-700 text-white hover:border-primary/50' 
                              : 'bg-transparent border-dark-800 text-gray-600'
                        }`}
                      >
                        <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${isToday ? 'text-black' : 'text-gray-500'}`}>{day.slice(0, 3)}</p>
                        <div className="h-12 flex flex-col justify-center">
                          {routine ? (
                            <p className="text-[13px] font-black uppercase italic leading-tight line-clamp-2">{routine.title}</p>
                          ) : (
                            <p className="text-[10px] font-black italic opacity-20 uppercase tracking-widest">Rest</p>
                          )}
                        </div>
                        {isToday && <div className="absolute -bottom-1 -right-1 opacity-20"><Dumbbell size={48} /></div>}
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Workout Session Overlay */}
              <AnimatePresence>
                {workoutMode && todayRoutine && (
                  <motion.div 
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="fixed inset-0 z-[100] bg-black flex flex-col pt-safe px-6 overflow-hidden"
                  >
                    {/* Header Workout */}
                    <div className="py-6 flex justify-between items-center bg-black">
                      <div>
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">Sesión en Curso</p>
                        <h4 className="text-xl font-black italic uppercase tracking-tighter">{todayRoutine.title}</h4>
                      </div>
                      <button 
                        onClick={() => setWorkoutMode(false)}
                        className="w-10 h-10 rounded-full bg-dark-800 flex items-center justify-center text-gray-400"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-8">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">PROGRESO TÉCNICO</span>
                        <span className="text-[9px] font-black text-primary uppercase tracking-widest">
                          {Math.round((completedExercises.length / todayRoutine.routine_exercises.length) * 100)}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-dark-900 rounded-full overflow-hidden border border-dark-800">
                        <motion.div 
                          className="h-full bg-primary"
                          initial={{ width: 0 }}
                          animate={{ width: `${(completedExercises.length / todayRoutine.routine_exercises.length) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Exercises List */}
                    <div className="flex-1 overflow-y-auto space-y-4 pb-32 no-scrollbar custom-scrollbar">
                      {todayRoutine.routine_exercises.map((re, idx) => (
                        <div 
                          key={re.id}
                          className={`card-dark p-4 flex gap-4 transition-all border-2 ${
                            completedExercises.includes(re.id) ? 'border-primary/40 bg-primary/5' : 'border-dark-800'
                          }`}
                        >
                          {/* Thumb/Video */}
                          <div className="relative w-24 h-24 flex-shrink-0 bg-dark-800 rounded-2xl overflow-hidden group">
                            {re.exercises?.thumbnail_url ? (
                              <img src={re.exercises.thumbnail_url} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-700"><Dumbbell size={24} /></div>
                            )}
                            {re.exercises?.video_url && (
                              <button 
                                onClick={() => setActiveVideo(re.exercises)}
                                className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Play fill="white" size={24} />
                              </button>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                            <div>
                               <h5 className="text-[13px] font-black uppercase italic tracking-tighter truncate">{re.exercises?.name}</h5>
                               <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">{re.sets} SERIES × {re.reps} REPS</p>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              {re.exercises?.video_url && (
                                <button 
                                  onClick={() => setActiveVideo(re.exercises)}
                                  className="text-[9px] font-black text-primary uppercase tracking-[0.1em] flex items-center gap-1 hover:underline"
                                >
                                  <Sparkles size={10} /> Ver Técnica
                                </button>
                              )}
                              <span className="w-1 h-1 bg-dark-800 rounded-full" />
                              <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">{re.rest_time} Desc.</span>
                            </div>
                          </div>

                          {/* Checkbox */}
                          <button 
                            onClick={() => toggleExercise(re.id)}
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                              completedExercises.includes(re.id) 
                                ? 'bg-primary text-black shadow-lg shadow-primary/20 scale-110' 
                                : 'bg-dark-900 border border-dark-700 text-dark-700'
                            }`}
                          >
                            <CheckCircle2 size={24} className={completedExercises.includes(re.id) ? '' : 'opacity-20'} />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Footer Finish */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black to-transparent">
                      <button 
                        onClick={finishWorkout}
                        disabled={completedExercises.length === 0}
                        className={`w-full py-5 rounded-[2rem] font-black italic transition-all shadow-2xl ${
                          completedExercises.length === todayRoutine.routine_exercises.length
                            ? 'bg-primary text-black shadow-primary/20'
                            : completedExercises.length > 0
                              ? 'bg-white text-black'
                              : 'bg-dark-800 text-gray-600 cursor-not-allowed'
                        }`}
                      >
                        {completedExercises.length === todayRoutine.routine_exercises.length ? (
                          'CONCLUIR ENTRENAMIENTO'
                        ) : (
                          `FINALIZAR SESIÓN (${completedExercises.length}/${todayRoutine.routine_exercises.length})`
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Video Player Modal */}
              <AnimatePresence>
                {activeVideo && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setActiveVideo(null)}
                      className="absolute inset-0 bg-black/95 backdrop-blur-xl"
                    />
                    
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0, y: 20 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0.9, opacity: 0, y: 20 }}
                      className="relative w-full max-w-4xl aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10"
                    >
                      <button 
                        onClick={() => setActiveVideo(null)}
                        className="absolute top-4 right-4 z-10 p-2 bg-black/50 text-white rounded-full hover:bg-black transition-colors"
                      >
                        <X size={20} />
                      </button>

                      <div className="w-full h-full">
                        {activeVideo.video_url?.includes('storage') ? (
                          <video 
                            src={activeVideo.video_url}
                            className="w-full h-full object-contain"
                            controls
                            autoPlay
                          />
                        ) : activeVideo.video_url ? (
                          <iframe 
                            src={(() => {
                              const url = activeVideo.video_url;
                              let videoId = '';
                              
                              if (url.includes('youtube.com/watch?v=')) {
                                videoId = url.split('v=')[1]?.split('&')[0];
                              } else if (url.includes('youtu.be/')) {
                                videoId = url.split('youtu.be/')[1]?.split('?')[0];
                              } else if (url.includes('youtube.com/shorts/')) {
                                videoId = url.split('/shorts/')[1]?.split('?')[0];
                              } else if (url.includes('youtube.com/embed/')) {
                                return url;
                              }

                              return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0` : url;
                            })()}
                            className="w-full h-full border-0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 gap-4">
                            <Activity size={48} className="animate-pulse" />
                            <p className="text-sm font-bold uppercase tracking-widest">No hay video disponible</p>
                          </div>
                        )}
                      </div>

                      <div className="absolute bottom-0 inset-x-0 p-8 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none">
                        <h3 className="text-2xl font-black italic uppercase text-white tracking-tighter">{activeVideo.name}</h3>
                        <p className="text-primary text-[10px] font-black uppercase mt-1 tracking-widest italic">Técnica Correcta • Gym Digital</p>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {activeTab === 'chat' && (
            <motion.div 
              key="chat"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <UserChat user={user} />
            </motion.div>
          )}

          {activeTab === 'subscription' && (
            <motion.div 
              key="subscription"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
            >
              <UserSubscription user={user} />
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div 
              key="profile"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <ProfileManager user={user} onUpdate={fetchUpdatedUser} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Nav Premium */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] md:w-auto md:min-w-[400px] glass-dark border border-white/5 rounded-[2.5rem] flex justify-around p-3 z-40 shadow-2xl backdrop-blur-3xl ring-1 ring-white/10">
        <NavIcon 
          icon={<Dumbbell size={22} />} 
          active={activeTab === 'home'} 
          label="MIS RUTINAS" 
          disabled={isExpired}
          onClick={() => !isExpired && setActiveTab('home')}
        />
        <NavIcon 
          icon={<MessageCircle size={22} />} 
          active={activeTab === 'chat'} 
          label="CHAT" 
          onClick={() => {
            setActiveTab('chat');
            setUnreadCount(0);
          }}
          badge={activeTab !== 'chat' && unreadCount > 0 ? unreadCount : null}
        />
        <NavIcon 
          icon={<CreditCard size={22} />} 
          active={activeTab === 'subscription'} 
          label="MEMBRESÍA" 
          disabled={isExpired}
          onClick={() => !isExpired && setActiveTab('subscription')}
        />
        <NavIcon 
          icon={<User size={22} />} 
          active={activeTab === 'profile'}
          label="PERFIL" 
          disabled={isExpired}
          onClick={() => !isExpired && setActiveTab('profile')}
        />
      </nav>
    </div>
  );
};

const NavIcon = ({ icon, active, label, onClick, badge, disabled }) => (
  <button 
    onClick={onClick}
    disabled={disabled}
    className={`flex-1 flex flex-col items-center gap-1.5 transition-all outline-none group relative ${disabled ? 'opacity-20 cursor-not-allowed grayscale' : active ? 'text-primary' : 'text-gray-500 hover:text-gray-300'}`}
  >
    <div className={`w-12 h-12 rounded-2xl transition-all flex items-center justify-center ${active ? 'bg-primary/20 scale-110 shadow-lg shadow-primary/5' : 'group-hover:bg-white/5'}`}>
      {icon}
      {badge && (
        <span className="absolute -top-1 -right-1 bg-primary text-black text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-black animate-bounce shadow-lg shadow-primary/20">
          {badge}
        </span>
      )}
    </div>
    <span className={`text-[8px] font-black tracking-[0.1em] uppercase transition-all ${active ? 'opacity-100 translate-y-0' : 'opacity-40 -translate-y-1'}`}>
      {label}
    </span>
  </button>
);

export default UserDashboard;
