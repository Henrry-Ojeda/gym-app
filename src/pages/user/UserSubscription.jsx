import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { CreditCard, Check, ShieldCheck, Zap, Loader2, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const UserSubscription = ({ user }) => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      const { data } = await supabase
        .from('subscriptions')
        .select('*')
        .order('price', { ascending: true });
      setPlans(data || []);
      setLoading(false);
    };
    fetchPlans();
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 text-primary">
      <Loader2 className="animate-spin mb-4" size={32} />
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">CENTRO DE <span className="text-primary text-glow">MEMBRESÍAS</span></h2>
        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em]">Eleva tu rendimiento al siguiente nivel</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {plans.map((sub) => {
          const isCurrent = user?.subscription_tier?.toLowerCase() === sub.name?.toLowerCase();
          
          return (
            <motion.div 
              key={sub.id} 
              whileHover={{ scale: 1.02 }}
              className={`card-dark relative overflow-hidden flex flex-col p-8 border-2 transition-all ${
                isCurrent ? 'border-primary ring-1 ring-primary/20 shadow-[0_0_30px_rgba(180,255,0,0.1)]' : 'border-dark-700 hover:border-dark-600'
              }`}
            >
              {isCurrent && (
                <div className="absolute top-4 right-4 bg-primary text-black font-black text-[9px] px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1">
                   <ShieldCheck size={12} /> Plan Actual
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-2xl font-black italic uppercase text-white mb-2">{sub.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-glow">${sub.price}</span>
                  <span className="text-gray-500 text-[10px] font-black uppercase">/ mes</span>
                </div>
              </div>

              <div className="space-y-4 mb-10 flex-1">
                <p className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
                  <Zap size={14} /> Beneficios Incluidos
                </p>
                <div className="space-y-3">
                  <BenefitItem text="Entrenamientos personalizados" />
                  <BenefitItem text="Seguimiento de progreso" />
                  <BenefitItem text="Soporte técnico directo" />
                  {sub.name.toLowerCase() === 'premium' && <BenefitItem text="Plan nutricional incluido" highlighted />}
                </div>
              </div>

              <button 
                disabled={isCurrent}
                className={`w-full py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all ${
                  isCurrent 
                  ? 'bg-dark-800 text-gray-500 cursor-not-allowed border border-dark-700' 
                  : 'bg-primary text-black hover:scale-105 active:scale-95 shadow-xl shadow-primary/10'
                }`}
              >
                {isCurrent ? 'YA ERES MIEMBRO' : 'MEJORAR PLAN'} <Sparkles size={16} />
              </button>
            </motion.div>
          );
        })}
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-3xl p-6 flex items-start gap-4">
        <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center text-primary flex-shrink-0">
          <ShieldCheck size={20} />
        </div>
        <div>
          <p className="text-[11px] font-black uppercase text-white mb-1">Garantía de Alto Rendimiento</p>
          <p className="text-gray-500 text-xs leading-relaxed">
            Todas nuestras suscripciones incluyen acceso a la plataforma CORE y soporte técnico ilimitado para asegurar que alcances tus metas.
          </p>
        </div>
      </div>
    </div>
  );
};

const BenefitItem = ({ text, highlighted }) => (
  <div className="flex items-center gap-3">
    <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${highlighted ? 'border-primary/50 bg-primary/20 text-primary' : 'border-dark-700 text-gray-500'}`}>
      <Check size={12} strokeWidth={3} />
    </div>
    <span className={`text-xs font-bold ${highlighted ? 'text-white' : 'text-gray-400'}`}>{text}</span>
  </div>
);

export default UserSubscription;
