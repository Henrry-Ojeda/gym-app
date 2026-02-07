import { useState, useEffect } from 'react';
import { LayoutDashboard, Dumbbell, MessageSquare, Users, Settings, Plus, Layout, Flame, LogOut, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabaseClient';
import AdminChatManager from './AdminChatManager';
import ClientManager from './ClientManager';
import RoutineManager from './RoutineManager';
import GlobalAgendaManager from './GlobalAgendaManager';
import SubscriptionManager from './SubscriptionManager';

const AdminPanel = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('gym_admin_tab') || 'dashboard');
  const [activeRoutineSubTab, setActiveRoutineSubTab] = useState(() => localStorage.getItem('gym_admin_routine_subtab') || 'programs');

  useEffect(() => {
    localStorage.setItem('gym_admin_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem('gym_admin_routine_subtab', activeRoutineSubTab);
  }, [activeRoutineSubTab]);
  const [stats, setStats] = useState({
    clients: 0,
    routines: 0,
    exercises: 0,
    pendingMessages: 0
  });

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboardStats();
    }
  }, [activeTab]);

  const fetchDashboardStats = async () => {
    try {
      const [clientsCount, routinesCount, exercisesCount] = await Promise.all([
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .in('role', ['user', 'admin-user']),
        supabase.from('routines').select('*', { count: 'exact', head: true }),
        supabase.from('exercises').select('*', { count: 'exact', head: true }),
      ]);

      setStats({
        clients: clientsCount.count || 0,
        routines: routinesCount.count || 0,
        exercises: exercisesCount.count || 0,
        pendingMessages: 0 
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'users', label: 'Clientes', icon: <Users size={20} /> },
    { id: 'routines', label: 'Rutinas', icon: <Dumbbell size={20} /> },
    { id: 'agenda', label: 'Agenda Global', icon: <Calendar size={20} /> },
    { id: 'subscriptions', label: 'Suscripciones', icon: <Flame size={20} /> },
    { id: 'chats', label: 'Mensajes', icon: <MessageSquare size={20} /> },
    { id: 'settings', label: 'Ajustes', icon: <Settings size={20} /> },
  ];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col md:flex-row">
      {/* Sidebar - Desktop Only */}
      <aside className="hidden md:flex w-64 border-r border-dark-700 bg-dark-900/50 flex flex-col pt-8 sticky top-0 h-screen">
        <div className="px-8 mb-12">
          <div className="text-2xl font-black tracking-tighter italic">
            CORE<span className="text-primary"> ADMIN</span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                activeTab === item.id 
                  ? 'bg-primary text-black' 
                  : 'text-gray-400 hover:text-white hover:bg-dark-800'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-dark-700">
          <button 
            onClick={onLogout}
            className="w-full text-xs text-gray-500 hover:text-red-500 transition-colors uppercase font-bold tracking-widest"
          >
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-black/80 backdrop-blur-xl border-t border-dark-700 flex justify-around py-3 z-[100] px-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center gap-1 transition-colors ${
              activeTab === item.id ? 'text-primary' : 'text-gray-600'
            }`}
          >
            <div className={`p-1 rounded-lg transition-colors ${activeTab === item.id ? 'bg-primary/10' : ''}`}>
              {item.icon}
            </div>
            <span className="text-[9px] font-black uppercase tracking-tighter">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-6 md:p-12 pb-24 md:pb-12">
        {/* Mobile Header Logo */}
        <div className="md:hidden flex justify-between items-center mb-10">
          <div className="text-xl font-black italic tracking-tighter">CORE<span className="text-primary"> ADMIN</span></div>
          <button onClick={onLogout} className="text-gray-600 hover:text-red-500"><LogOut size={20} /></button>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase leading-none">
              {menuItems.find(i => i.id === activeTab)?.label}
            </h1>
            <p className="text-gray-500 text-sm md:text-base">Gestión del sistema de alto rendimiento</p>
          </div>
        </div>

        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-500">
            <StatCard title="Total Clientes" value={stats.clients} trend="Usuarios" />
            <StatCard title="Programas de Entrenamiento" value={stats.routines} color="text-primary" />
            <StatCard title="Ejercicios en Catálogo" value={stats.exercises} />
          </div>
        )}

        {activeTab === 'users' && (
          <div className="animate-in slide-in-from-bottom-4 duration-500">
            <ClientManager />
          </div>
        )}

        {activeTab === 'agenda' && (
          <div className="animate-in slide-in-from-bottom-4 duration-500">
            <GlobalAgendaManager 
              onNavigate={(tab, subtab) => {
                setActiveTab(tab);
                if (subtab) setActiveRoutineSubTab(subtab);
              }}
            />
          </div>
        )}

        {activeTab === 'routines' && (
          <div className="animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex gap-4 mb-8 border-b border-dark-700 pb-4">
              <button 
                onClick={() => setActiveRoutineSubTab('programs')}
                className={`text-xs font-bold uppercase tracking-widest pb-2 transition-colors relative ${
                  activeRoutineSubTab === 'programs' ? 'text-primary' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                Programas
                {activeRoutineSubTab === 'programs' && <motion.div layoutId="subtab" className="absolute bottom-0 left-0 w-full h-0.5 bg-primary" />}
              </button>
              <button 
                onClick={() => setActiveRoutineSubTab('personal')}
                className={`text-xs font-bold uppercase tracking-widest pb-2 transition-colors relative ${
                  activeRoutineSubTab === 'personal' ? 'text-primary' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                Personalizadas
                {activeRoutineSubTab === 'personal' && <motion.div layoutId="subtab" className="absolute bottom-0 left-0 w-full h-0.5 bg-primary" />}
              </button>
              <button 
                onClick={() => setActiveRoutineSubTab('exercises')}
                className={`text-xs font-bold uppercase tracking-widest pb-2 transition-colors relative ${
                  activeRoutineSubTab === 'exercises' ? 'text-primary' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                Ejercicios
                {activeRoutineSubTab === 'exercises' && <motion.div layoutId="subtab" className="absolute bottom-0 left-0 w-full h-0.5 bg-primary" />}
              </button>
              <button 
                onClick={() => setActiveRoutineSubTab('categories')}
                className={`text-xs font-bold uppercase tracking-widest pb-2 transition-colors relative ${
                  activeRoutineSubTab === 'categories' ? 'text-primary' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                Categorías
                {activeRoutineSubTab === 'categories' && <motion.div layoutId="subtab" className="absolute bottom-0 left-0 w-full h-0.5 bg-primary" />}
              </button>
              <button 
                onClick={() => setActiveRoutineSubTab('levels')}
                className={`text-xs font-bold uppercase tracking-widest pb-2 transition-colors relative ${
                  activeRoutineSubTab === 'levels' ? 'text-primary' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                Niveles
                {activeRoutineSubTab === 'levels' && <motion.div layoutId="subtab" className="absolute bottom-0 left-0 w-full h-0.5 bg-primary" />}
              </button>
            </div>
            
            <RoutineManager activeRoutineSubTab={activeRoutineSubTab} />
          </div>
        )}

        {activeTab === 'subscriptions' && (
          <div className="animate-in slide-in-from-bottom-4 duration-500">
            <SubscriptionManager />
          </div>
        )}

        {activeTab === 'chats' && (
          <div className="animate-in fade-in duration-500">
            {user ? (
              <AdminChatManager adminUser={user} />
            ) : (
              <div className="p-20 text-center">Cargando sesión...</div>
            )}
          </div>
        )}

        {activeTab !== 'routines' && activeTab !== 'chats' && activeTab !== 'dashboard' && (
          <div className="mt-12 card-dark">
            <h2 className="text-xl font-black mb-6 flex items-center gap-2">
              <Layout className="text-primary" size={24} /> VISTA RÁPIDA
            </h2>
            <div className="space-y-4 opacity-50 italic">
              Zona de trabajo en desarrollo para el módulo: {activeTab}...
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const StatCard = ({ title, value, trend, color = 'text-white' }) => (
  <div className="card-dark group hover:border-primary/20 transition-all">
    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{title}</h3>
    <div className="flex items-end justify-between">
      <span className={`text-4xl font-black ${color}`}>{value}</span>
      {trend && <span className="text-primary text-xs font-bold mb-1">{trend}</span>}
    </div>
  </div>
);

export default AdminPanel;
