import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { User, MessageCircle, Search, Loader2, Plus } from 'lucide-react';
import Chat from '../../components/Chat';

const AdminChatManager = ({ adminUser }) => {
  const [chats, setChats] = useState([]);
  const [clients, setClients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChat, setSelectedChat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSelecting, setIsSelecting] = useState(false); // Modo "Nuevo Chat"
  const [unreadCounts, setUnreadCounts] = useState({});

  const fetchData = async () => {
    // 1. Obtener todos los clientes (profiles)
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, avatar_url')
      .order('first_name', { ascending: true });

    // 2. Obtener los chats existentes (todos los admins ven todos los chats para cobertura total)
    const { data: chatsData } = await supabase
      .from('chats')
      .select('*')
      .order('updated_at', { ascending: false });

    // 3. Obtener conteo de mensajes no leídos para cada chat
    if (chatsData?.length > 0) {
      const counts = {};
      for (const chat of chatsData) {
        // SI ES EL CHAT SELECCIONADO, FORZAMOS 0 PARA EVITAR SALTOS VISUALES
        if (chat.id === selectedChat?.id) {
          counts[chat.id] = 0;
          continue;
        }

        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('chat_id', chat.id)
          .eq('sender_id', chat.client_id) // Si el emisor es el cliente, es un mensaje para nosotros (admins)
          .eq('is_read', false);
        
        counts[chat.id] = count || 0;
      }
      setUnreadCounts(counts);
    }

    setClients(profilesData || []);
    setChats(chatsData || []);
    setLoading(false);
  };

  useEffect(() => {
    if (adminUser) fetchData();

    const channel = supabase
      .channel('admin_chats_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, () => fetchData())
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages' 
      }, (payload) => {
        // Si el mensaje es del cliente, incrementar contador si no tenemos el chat abierto
        if (payload.new.sender_id !== adminUser.id && payload.new.chat_id !== selectedChat?.id) {
          // Buscamos el chat para ver si el sender es el cliente de este chat
          const chat = chats.find(c => c.id === payload.new.chat_id);
          if (chat && payload.new.sender_id === chat.client_id) {
            setUnreadCounts(prev => ({
              ...prev,
              [payload.new.chat_id]: (prev[payload.new.chat_id] || 0) + 1
            }));
          }
        }
        // Refrescar lista de chats para ver el último mensaje actualizado
        fetchData();
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'messages' 
      }, (payload) => {
        // Si un mensaje se marcó como leído, refrescar conteos
        if (payload.new.is_read) {
          fetchData();
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [adminUser, selectedChat?.id]);

  // Filtrar clientes según la búsqueda
  const filteredClients = clients.filter(c => {
    const hasChat = chats.some(chat => chat.client_id === c.id);
    const matchesSearch = `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         c.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Si no hay búsqueda, solo mostrar los que ya tienen chat activo
    // Si hay búsqueda, mostrar todos los que coincidan para poder iniciar chats nuevos
    if (!searchQuery) return hasChat && c.id !== adminUser.id;
    return matchesSearch && c.id !== adminUser.id;
  });

  const handleSelectClient = async (client) => {
    // Buscar si ya existe un chat
    let chat = chats.find(c => c.client_id === client.id);

    if (!chat) {
      // Crear chat si no existe
      const { data, error } = await supabase
        .from('chats')
        .insert([{ admin_id: adminUser.id, client_id: client.id, last_message: '' }])
        .select()
        .single();
      
      if (!error) {
        chat = data;
        setChats(prev => [data, ...prev]);
      }
    }

    if (chat) {
      // 1. Marcar como leídos en la base de datos PRIMERO
      // para que cuando fetchData corra (por el cambio de selectedChat), la DB ya esté limpia
      await markChatAsRead(chat.id);
      
      // 2. Limpiar contador localmente inmediatamente
      setUnreadCounts(prev => ({
        ...prev,
        [chat.id]: 0
      }));

      // 3. Cambiar el chat seleccionado
      setSelectedChat({ ...chat, profiles: client });
      setIsSelecting(false);
    }
  };

  const markChatAsRead = async (chatId) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('chat_id', chatId)
        .neq('is_read', true); // Marcar todos los que no estén leídos como leídos al abrir el chat
      
      if (error) throw error;
      return true;
    } catch (err) {
      console.error("Error marking as read:", err);
      return false;
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center p-12 text-primary">
      <Loader2 className="animate-spin" />
    </div>
  );

  return (
    <div className="flex bg-dark-900/50 rounded-[2.5rem] border border-dark-700 h-[750px] overflow-hidden glass shadow-2xl">
      {/* Sidebar de Chats */}
      <aside className="w-80 border-r border-dark-700 flex flex-col bg-black/20">
        <div className="p-6 border-b border-dark-700 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">
              {isSelecting ? 'Iniciar Conversación' : 'Mensajería Directa'}
            </h3>
            <button 
              onClick={() => setIsSelecting(!isSelecting)}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                isSelecting ? 'bg-red-500/10 text-red-500 rotate-45' : 'bg-primary/20 text-primary hover:scale-110'
              }`}
              title={isSelecting ? "Cancelar" : "Nuevo Chat"}
            >
              <Plus size={18} />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
            <input 
              type="text" 
              placeholder={isSelecting ? "Buscar cliente..." : "Filtrar chats..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-dark-900 border border-dark-700 rounded-xl py-3 pl-10 pr-4 text-[11px] font-bold outline-none focus:border-primary transition-all text-white"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* MODO SELECCIÓN DE CLIENTE (NUEVO CHAT) */}
          {isSelecting ? (
            <div className="animate-in fade-in slide-in-from-left-4 duration-300">
              <p className="px-6 py-4 text-[9px] font-black text-gray-600 uppercase tracking-widest italic">Directorio de Clientes</p>
              {filteredClients.map((client) => (
                <button
                  key={client.id}
                  onClick={() => handleSelectClient(client)}
                  className="w-full p-5 flex items-center gap-4 hover:bg-primary/5 transition-all border-b border-dark-700/30 group"
                >
                  <div className="w-10 h-10 rounded-2xl bg-dark-800 flex items-center justify-center border border-dark-700 group-hover:border-primary/50">
                    <User size={16} className="text-gray-500 group-hover:text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-black text-[12px] uppercase italic text-white group-hover:text-primary transition-colors">
                      {client.first_name} {client.last_name}
                    </p>
                    <p className="text-[8px] font-bold text-gray-500 uppercase">{client.email}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            /* MODO LISTA DE CHATS ACTIVOS */
            <>
              {chats.length === 0 ? (
                <div className="p-12 text-center">
                  <MessageCircle size={32} className="mx-auto text-dark-700 mb-4 opacity-20" />
                  <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest italic leading-relaxed">
                    No tienes conversaciones activas.<br/>Pulsa el botón <b>"+"</b> para empezar.
                  </p>
                </div>
              ) : (
                chats
                  .filter(chat => {
                    const client = clients.find(c => c.id === chat.client_id);
                    if (!client) return false;
                    return `${client.first_name} ${client.last_name}`.toLowerCase().includes(searchQuery.toLowerCase());
                  })
                  .map((chat) => {
                    const client = clients.find(c => c.id === chat.client_id);
                    return (
                      <button
                        key={chat.id}
                        onClick={() => handleSelectClient(client)}
                        className={`w-full p-5 flex items-start gap-4 hover:bg-white/5 transition-all border-b border-dark-700/30 group ${
                          selectedChat?.id === chat.id ? 'bg-primary/5 border-l-4 border-l-primary' : ''
                        }`}
                      >
                        <div className="w-12 h-12 rounded-2xl bg-dark-800 flex items-center justify-center flex-shrink-0 border border-dark-700 group-hover:border-primary/30 transition-colors">
                          <User size={20} className={selectedChat?.id === chat.id ? 'text-primary' : 'text-gray-500'} />
                        </div>
                        <div className="flex-1 text-left overflow-hidden">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-black text-[12px] uppercase italic text-white truncate group-hover:text-primary transition-colors">
                              {client?.first_name} {client?.last_name}
                            </span>
                            {unreadCounts[chat.id] > 0 && (
                              <span className="bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full animate-bounce shadow-lg shadow-red-500/20">
                                {unreadCounts[chat.id]}
                              </span>
                            )}
                          </div>
                          <p className={`text-[9px] font-bold uppercase truncate tracking-wider ${unreadCounts[chat.id] > 0 ? 'text-primary' : 'text-gray-500'}`}>
                            {chat?.last_message || 'Sin mensajes aún'}
                          </p>
                        </div>
                      </button>
                    );
                  })
              )}
            </>
          )}
        </div>
      </aside>

      {/* Ventana de Chat Seleccionado */}
      <main className="flex-1 flex flex-col relative">
        {selectedChat ? (
          <div className="flex-1">
            <Chat chatId={selectedChat.id} currentUser={adminUser} />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-dark-800 flex items-center justify-center mb-4 border border-dark-700">
              <MessageCircle size={32} className="text-gray-600" />
            </div>
            <h3 className="text-xl font-black italic tracking-tighter mb-2 underline decoration-primary">CENTRO DE MENSAJERÍA</h3>
            <p className="text-gray-500 max-w-xs text-sm">
              Selecciona un cliente de la lista para ver su progreso y dar feedback técnico en tiempo real.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminChatManager;
