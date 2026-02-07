import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Dumbbell, MessageCircle, User, Activity, Play, LogOut, Clock, CreditCard, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import UserChat from './UserChat';
import UserSubscription from './UserSubscription';

const UserDashboard = ({ user, onLogout }) => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home'); // 'home', 'chat', 'subscription'
  const [weeklySchedule, setWeeklySchedule] = useState({});
  const [todayRoutine, setTodayRoutine] = useState(null);
  const [currentDay, setCurrentDay] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

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
          {activeTab === 'home' && (
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

                      <button className="btn-primary w-full flex items-center justify-center gap-3 py-5 group shadow-2xl shadow-primary/10">
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
        </AnimatePresence>
      </main>

      {/* Bottom Nav Premium */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] md:w-auto md:min-w-[400px] glass-dark border border-white/5 rounded-[2.5rem] flex justify-around p-3 z-40 shadow-2xl backdrop-blur-3xl ring-1 ring-white/10">
        <NavIcon 
          icon={<Dumbbell size={22} />} 
          active={activeTab === 'home'} 
          label="MIS RUTINAS" 
          onClick={() => setActiveTab('home')}
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
          onClick={() => setActiveTab('subscription')}
        />
        <NavIcon 
          icon={<User size={22} />} 
          label="PERFIL" 
          onClick={() => {}} // Futuro perfil
        />
      </nav>
    </div>
  );
};

const NavIcon = ({ icon, active, label, onClick, badge }) => (
  <button 
    onClick={onClick}
    className={`flex-1 flex flex-col items-center gap-1.5 transition-all outline-none group relative ${active ? 'text-primary' : 'text-gray-500 hover:text-gray-300'}`}
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
