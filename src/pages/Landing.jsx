import { motion } from 'framer-motion';
import { Dumbbell, Shield, Zap, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const Landing = () => {
  return (
    <div className="min-h-screen bg-black text-white font-inter selection:bg-primary selection:text-black">
      {/* Navigation */}
      <nav className="flex justify-between items-center px-6 py-6 border-b border-dark-700 glass sticky top-0 z-50">
        <div className="text-2xl font-black tracking-tighter">
          CORE<span className="text-primary">•</span>
        </div>
        <div className="hidden md:flex gap-8 text-sm font-medium text-gray-400">
          <a href="#metodo" className="hover:text-primary transition-colors">MÉTODO</a>
          <a href="#planes" className="hover:text-primary transition-colors">PLANES</a>
          <a href="#coach" className="hover:text-primary transition-colors">EL COACH</a>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-gray-400 text-sm font-bold hover:text-white transition-colors">
            LOG IN
          </Link>
          <Link to="/register" className="px-5 py-2 rounded-full bg-primary text-black text-sm font-bold hover:scale-105 transition-all">
            UNIRSE
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-primary/10 blur-[120px] rounded-full -z-10" />
        
        <div className="max-w-5xl mx-auto text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-6xl md:text-8xl font-black leading-[0.9] tracking-tighter mb-8"
          >
            NO VENDO RUTINAS,<br />
            DISEÑO <span className="text-primary italic">ATLETAS</span>.
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="text-xl text-gray-400 max-w-2xl mx-auto mb-12"
          >
            Resultados basados en ciencia, no en modas temporales. Un sistema integral 
            diseñado para llevar tu rendimiento al siguiente nivel.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link to="/register" className="btn-primary group flex items-center justify-center gap-2">
              EMPIEZA TU TRANSFORMACIÓN
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <a href="#planes" className="px-8 py-3 rounded-md bg-dark-800 border border-dark-700 font-bold hover:bg-dark-700 transition-all flex items-center justify-center">
              VER PLANES
            </a>
          </motion.div>
        </div>
      </section>

      {/* Stats/Features */}
      <section className="py-20 px-6 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { icon: <Zap className="text-primary" size={32} />, title: "EFICIENCIA MÁXIMA", desc: "Protocolos optimizados para ganar músculo y perder grasa sin perder el tiempo." },
          { icon: <Dumbbell className="text-primary" size={32} />, title: "PLANES A MEDIDA", desc: "No hay dos cuerpos iguales. Rutinas y nutrición adaptadas a tu bio-mecánica." },
          { icon: <Shield className="text-primary" size={32} />, title: "BASADO EN CIENCIA", desc: "Sin suplementos milagrosos. Solo principios fisiológicos que funcionan." }
        ].map((item, i) => (
          <div key={i} className="card-dark group hover:border-primary/30 transition-colors">
            <div className="mb-4">{item.icon}</div>
            <h3 className="text-xl font-black mb-2 tracking-tight">{item.title}</h3>
            <p className="text-gray-400 leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </section>

      {/* Placeholder for rest of sections */}
      <footer className="py-20 border-t border-dark-700 text-center text-gray-600">
        <p>© 2024 CORE SYSTEM • HIGH PERFORMANCE COACHING</p>
      </footer>
    </div>
  );
};

export default Landing;
