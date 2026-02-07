import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { CreditCard, Plus, Trash2, Edit3, Check, X, Loader2 } from 'lucide-react';
import Swal from 'sweetalert2';

const SubscriptionManager = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('0');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('0');

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .order('price', { ascending: true });
    
    if (!error) setSubscriptions(data);
    else {
      // If table doesn't exist, show empty and maybe alert
      console.error(error);
    }
    setLoading(false);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      const { error } = await supabase
        .from('subscriptions')
        .insert([{ 
          name: newName.toUpperCase().trim(),
          price: parseFloat(newPrice) || 0
        }]);
      
      if (error) throw error;
      setNewName('');
      setNewPrice('0');
      fetchSubscriptions();
      Swal.fire({ title: 'Éxito', text: 'Suscripción creada.', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, background: '#121212', color: '#fff' });
    } catch (error) {
      Swal.fire({ title: 'Error', text: 'Error al crear la suscripción.', icon: 'error', background: '#121212', color: '#fff' });
    }
  };

  const handleUpdate = async (id) => {
    if (!editName.trim()) return;
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ 
          name: editName.toUpperCase().trim(),
          price: parseFloat(editPrice) || 0
        })
        .eq('id', id);
      
      if (error) throw error;
      setEditingId(null);
      fetchSubscriptions();
    } catch (error) {
      Swal.fire({ title: 'Error', text: error.message, icon: 'error', background: '#121212', color: '#fff' });
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: '¿Eliminar suscripción?',
      text: "Esto podría afectar a los usuarios asociados.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ff4444',
      cancelButtonColor: '#333',
      confirmButtonText: 'SÍ, ELIMINAR',
      background: '#121212',
      color: '#fff'
    });

    if (result.isConfirmed) {
      const { error } = await supabase.from('subscriptions').delete().eq('id', id);
      if (!error) fetchSubscriptions();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="card-dark border-primary/10">
        <h3 className="text-sm font-black italic uppercase mb-4 flex items-center gap-2">
          <CreditCard className="text-primary" size={16} /> Configurar Planes de Suscripción
        </h3>
        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1">
            <label className="text-[10px] text-gray-500 font-bold uppercase mb-2 block">Nombre del Plan</label>
            <input 
              type="text" 
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ej: PREMIUM, VIP..."
              className="w-full bg-dark-900 border border-dark-700 rounded-lg px-4 py-2 text-sm outline-none focus:border-primary transition-all uppercase font-bold"
            />
          </div>
          <div className="md:col-span-1">
            <label className="text-[10px] text-gray-500 font-bold uppercase mb-2 block">Precio Mensual ($)</label>
            <input 
              type="number" 
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              className="w-full bg-dark-900 border border-dark-700 rounded-lg px-4 py-2 text-sm outline-none focus:border-primary transition-all font-bold"
            />
          </div>
          <div className="flex items-end">
            <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2 py-2">
              <Plus size={18} /> AGREGAR PLAN
            </button>
          </div>
        </form>
      </div>

      <div className="card-dark">
        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">PLANES ACTIVOS</h3>
        <div className="grid grid-cols-1 gap-2">
          {subscriptions.map((sub) => (
            <div key={sub.id} className="flex items-center justify-between bg-dark-900/50 p-4 rounded-xl border border-dark-700 hover:border-primary/20 transition-all">
              {editingId === sub.id ? (
                <div className="flex-1 grid grid-cols-3 gap-4">
                  <input 
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="bg-black border border-primary rounded px-2 py-1 text-sm font-bold uppercase"
                  />
                  <input 
                    type="number"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="bg-black border border-primary rounded px-2 py-1 text-sm font-bold"
                  />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => handleUpdate(sub.id)} className="text-primary"><Check size={18} /></button>
                    <button onClick={() => setEditingId(null)} className="text-red-500"><X size={18} /></button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black">
                      $
                    </div>
                    <div>
                      <span className="font-black italic text-sm tracking-tight text-white block uppercase">{sub.name}</span>
                      <span className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">${sub.price} / MES</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => { setEditingId(sub.id); setEditName(sub.name); setEditPrice(sub.price); }}
                      className="p-2 text-gray-600 hover:text-primary transition-colors"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(sub.id)}
                      className="p-2 text-gray-600 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          {!loading && subscriptions.length === 0 && (
            <div className="text-center py-10 opacity-30">
               <p className="text-xs uppercase font-black italic">No hay planes configurados todavía.</p>
            </div>
          )}
          {loading && <div className="text-center py-4"><Loader2 className="animate-spin mx-auto text-primary" /></div>}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionManager;
