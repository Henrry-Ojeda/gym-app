import { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, ChevronRight, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const WorkoutPlayer = ({ exercise, onFinish }) => {
  const [timeLeft, setTimeLeft] = useState(60); // Tiempo de descanso
  const [isRunning, setIsRunning] = useState(false);
  const [currentSet, setCurrentSet] = useState(1);
  const totalSets = 4;

  useEffect(() => {
    let timer;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
    }
    return () => clearInterval(timer);
  }, [isRunning, timeLeft]);

  const toggleTimer = () => setIsRunning(!isRunning);
  const resetTimer = () => {
    setTimeLeft(60);
    setIsRunning(false);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col p-6 animate-in fade-in transition-all">
      {/* Video / Thumbnail Mini Player */}
      <div className="relative w-full aspect-video bg-dark-800 rounded-3xl overflow-hidden mb-8 border border-dark-700 shadow-2xl shadow-primary/10">
        <video 
          src={exercise?.video_url} 
          autoPlay 
          loop 
          muted 
          playsInline
          className="w-full h-full object-cover"
        />
        <div className="absolute top-4 left-4 bg-primary text-black text-[10px] font-black px-2 py-1 rounded uppercase">
          En ejecución
        </div>
      </div>

      {/* Info Ejercicio */}
      <div className="mb-8">
        <h2 className="text-3xl font-black italic tracking-tighter uppercase leading-none mb-2">
          {exercise?.name || 'Press de Banca'}
        </h2>
        <p className="text-gray-500 font-medium">{exercise?.muscle_group || 'Pecho'} • 4 Series • 10-12 Reps</p>
      </div>

      {/* Control de Series */}
      <div className="grid grid-cols-4 gap-2 mb-8">
        {[1, 2, 3, 4].map((s) => (
          <div 
            key={s}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              s < currentSet ? 'bg-primary' : s === currentSet ? 'bg-primary/40' : 'bg-dark-700'
            }`}
          />
        ))}
      </div>

      {/* Cronómetro de Descanso */}
      <div className="card-dark flex flex-col items-center justify-center p-8 mb-8 border-primary/20">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em] mb-4">Descanso Sugerido</p>
        <span className={`text-7xl font-black tabular-nums italic ${timeLeft < 10 ? 'text-red-500' : 'text-white'}`}>
          00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
        </span>
        
        <div className="flex gap-4 mt-6">
          <button onClick={resetTimer} className="p-4 rounded-full bg-dark-900 border border-dark-700 text-gray-400 hover:text-white transition-colors">
            <RotateCcw size={24} />
          </button>
          <button 
            onClick={toggleTimer} 
            className={`p-6 rounded-full transition-transform active:scale-90 ${
              isRunning ? 'bg-dark-700 text-white' : 'bg-primary text-black shadow-lg shadow-primary/20'
            }`}
          >
            {isRunning ? <Pause size={32} /> : <Play size={32} fill="currentColor" />}
          </button>
        </div>
      </div>

      {/* Botón Acción Principal */}
      <button 
        onClick={() => {
          if (currentSet < totalSets) {
            setCurrentSet(prev => prev + 1);
            resetTimer();
            setIsRunning(true);
          } else {
            onFinish();
          }
        }}
        className="btn-primary w-full py-5 text-lg flex items-center justify-center gap-3 mt-auto"
      >
        {currentSet < totalSets ? (
          <>SERIE {currentSet} COMPLETADA <ChevronRight size={20} /></>
        ) : (
          <>FINALIZAR ENTRENAMIENTO <CheckCircle2 size={24} /></>
        )}
      </button>
    </div>
  );
};

export default WorkoutPlayer;
