import { useState } from 'react';
import { Layers, Shield, Flame, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import LevelManager from './LevelManager';
import SubscriptionManager from './SubscriptionManager';
import RoleManager from './RoleManager';

const SettingsManager = () => {
  const [activeSubTab, setActiveSubTab] = useState('levels');

  const tabs = [
    { id: 'levels', label: 'Niveles', icon: <Layers size={18} />, component: <LevelManager /> },
    { id: 'roles', label: 'Roles de Sistema', icon: <Shield size={18} />, component: <RoleManager /> },
    { id: 'subscriptions', label: 'Planes de Suscripción', icon: <Flame size={18} />, component: <SubscriptionManager /> },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-8 animate-in fade-in duration-500">
      {/* Sidebar de Ajustes */}
      <aside className="w-full lg:w-64 space-y-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all group ${
              activeSubTab === tab.id 
                ? 'bg-primary text-black font-black italic' 
                : 'bg-dark-900 border border-dark-700 text-gray-400 hover:text-white hover:border-primary/30'
            }`}
          >
            <div className="flex items-center gap-3 text-xs uppercase tracking-widest">
              {tab.icon}
              {tab.label}
            </div>
            <ChevronRight size={16} className={`transition-transform ${activeSubTab === tab.id ? 'rotate-90' : 'group-hover:translate-x-1'}`} />
          </button>
        ))}
      </aside>

      {/* Área de Configuración */}
      <div className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSubTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {tabs.find(t => t.id === activeSubTab)?.component}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SettingsManager;
