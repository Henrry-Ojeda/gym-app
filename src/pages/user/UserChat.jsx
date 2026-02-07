import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { MessageCircle, Send, User, Loader2 } from 'lucide-react';
import Chat from '../../components/Chat';

const UserChat = ({ user }) => {
  const [admins, setAdmins] = useState([]);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [chats, setChats] = useState({}); // { adminId: chatId }
  const [unreadCounts, setUnreadCounts] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Obtener todos los administradores
      const { data: adminProfiles } = await supabase
        .from('profiles')
        .select('*')
        .or('role.eq.admin,role.eq.admin-user')
        .order('first_name', { ascending: true });

      setAdmins(adminProfiles || []);

      if (adminProfiles?.length > 0) {
        // 2. Buscar/Crear chats con cada admin y contar no leídos
        const chatMap = {};
        const unreadMap = {};

        for (const admin of adminProfiles) {
          // Buscar chat
          let { data: chat } = await supabase
            .from('chats')
            .select('id')
            .eq('client_id', user.id)
            .eq('admin_id', admin.id)
            .maybeSingle();

          if (!chat) {
            // No creamos el chat automáticamente para todos, solo si se selecciona
            // Pero necesitamos saber si existe para mostrar notificaciones
          } else {
            chatMap[admin.id] = chat.id;

            // Contar no leídos de este admin
            const { count } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('chat_id', chat.id)
              .eq('sender_id', admin.id)
              .eq('is_read', false);
            
            unreadMap[admin.id] = count || 0;
          }
        }

        setChats(chatMap);
        setUnreadCounts(unreadMap);

        // Si solo hay uno, seleccionarlo automáticamente
        if (adminProfiles.length === 1) {
          handleSelectAdmin(adminProfiles[0], chatMap[adminProfiles[0].id]);
        }
      }
    } catch (err) {
      console.error("Error fetching chat data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) fetchData();
  }, [user]);

  const handleSelectAdmin = async (admin, existingChatId) => {
    let chatId = existingChatId;

    if (!chatId) {
      // Crear chat si no existe al hacer click
      const { data: newChat, error } = await supabase
        .from('chats')
        .insert([{ 
          client_id: user.id, 
          admin_id: admin.id,
          last_message: '¡Hola! Empieza tu consulta aquí.'
        }])
        .select()
        .single();
      
      if (!error && newChat) {
        chatId = newChat.id;
        setChats(prev => ({ ...prev, [admin.id]: chatId }));
      }
    }

    if (chatId) {
      setSelectedAdmin({ ...admin, chatId });
      // Limpiar unread al entrar
      setUnreadCounts(prev => ({ ...prev, [admin.id]: 0 }));
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 text-primary">
      <Loader2 className="animate-spin mb-4" size={32} />
      <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50">Sincronizando Soporte...</span>
    </div>
  );

  return (
    <div className="h-[calc(100vh-180px)] animate-in fade-in duration-500 overflow-hidden rounded-[2.5rem] border border-dark-700 shadow-2xl relative flex bg-dark-900/40 backdrop-blur-md">
      {/* Sidebar de Admins si hay más de uno */}
      {admins.length > 1 && (
        <aside className="w-20 md:w-64 border-r border-white/5 flex flex-col bg-black/20">
          <div className="p-6 hidden md:block">
            <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] italic">Equipo de Soporte</h3>
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar py-4 md:py-0">
            {admins.map((admin) => (
              <button
                key={admin.id}
                onClick={() => handleSelectAdmin(admin, chats[admin.id])}
                className={`w-full p-4 md:p-5 flex items-center justify-center md:justify-start gap-4 transition-all border-b border-white/5 relative group ${
                  selectedAdmin?.id === admin.id ? 'bg-primary/10 border-l-4 border-l-primary' : 'hover:bg-white/5'
                }`}
              >
                <div className={`w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center border transition-all ${
                  selectedAdmin?.id === admin.id ? 'border-primary/50 bg-primary/10' : 'border-dark-700 bg-dark-800'
                }`}>
                  {admin.avatar_url ? (
                    <img src={admin.avatar_url} className="w-full h-full object-cover rounded-2xl" />
                  ) : (
                    <User size={20} className={selectedAdmin?.id === admin.id ? 'text-primary' : 'text-gray-500'} />
                  )}
                </div>
                <div className="hidden md:block text-left overflow-hidden">
                   <p className={`font-black text-[12px] uppercase italic truncate ${selectedAdmin?.id === admin.id ? 'text-primary' : 'text-white'}`}>
                     {admin.first_name} {admin.last_name}
                   </p>
                   <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Soporte Técnico</p>
                </div>

                {unreadCounts[admin.id] > 0 && (
                  <span className="absolute top-4 right-4 md:static md:ml-auto w-2 h-2 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse" />
                )}
              </button>
            ))}
          </div>
        </aside>
      )}

      {/* Area de Chat */}
      <main className="flex-1 relative flex flex-col">
        {selectedAdmin ? (
          <Chat chatId={selectedAdmin.chatId} currentUser={user} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-20 h-20 rounded-[2rem] bg-dark-800 flex items-center justify-center mb-6 border border-dark-700 shadow-xl">
              <MessageCircle size={40} className="text-gray-600" />
            </div>
            <h3 className="text-2xl font-black italic tracking-tighter mb-3 uppercase italic underline decoration-primary decoration-4 underline-offset-8">Conecta con tus Coaches</h3>
            <p className="text-gray-500 text-sm max-w-sm leading-relaxed">
              Selecciona a un miembro de nuestro equipo para resolver tus dudas técnicas o recibir feedback.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default UserChat;
