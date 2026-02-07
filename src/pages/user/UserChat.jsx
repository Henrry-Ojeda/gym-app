import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { MessageCircle, Send, User, Loader2 } from 'lucide-react';
import Chat from '../../components/Chat';

const UserChat = ({ user }) => {
  const [chatId, setChatId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getOrCreateChat = async () => {
      setLoading(true);
      try {
        // 1. Buscar chat existente con el cliente
        const { data: existingChat, error: fetchError } = await supabase
          .from('chats')
          .select('id')
          .eq('client_id', user.id)
          .maybeSingle();

        if (fetchError) {
           console.error("Error fetching existing chat:", fetchError);
        }

        if (existingChat) {
          setChatId(existingChat.id);
        } else {
          // 2. Si no existe, buscar un admin para asignarlo
          let { data: adminProfile, error: adminError } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', 'h_ojeda19@hotmail.es')
            .maybeSingle();

          if (!adminProfile) {
            const { data: anyAdmin } = await supabase
              .from('profiles')
              .select('id')
              .or('role.eq.admin,role.eq.admin-user')
              .limit(1)
              .maybeSingle();
            adminProfile = anyAdmin;
          }

          if (adminProfile) {
            const { data: newChat, error: insertError } = await supabase
              .from('chats')
              .insert([{ 
                client_id: user.id, 
                admin_id: adminProfile.id,
                last_message: '¡Hola! ¿En qué puedo ayudarte hoy?'
              }])
              .select()
              .maybeSingle();
            
            if (insertError) {
               console.error("Error creating chat:", insertError);
            } else if (newChat) {
               setChatId(newChat.id);
            }
          } else {
             console.warn("No admin found to assign chat.");
          }
        }
      } catch (err) {
        console.error("Critical error in getOrCreateChat:", err);
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) getOrCreateChat();
  }, [user]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 text-primary">
      <Loader2 className="animate-spin mb-4" size={32} />
      <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50">Conectando con Soporte...</span>
    </div>
  );

  return (
    <div className="h-[calc(100vh-180px)] animate-in fade-in duration-500 overflow-hidden rounded-[2.5rem] border border-dark-700 shadow-2xl relative">
      {chatId ? (
        <Chat chatId={chatId} currentUser={user} />
      ) : (
        <div className="flex flex-col items-center justify-center h-full p-12 text-center bg-dark-900/50">
           <MessageCircle size={48} className="text-dark-700 mb-6" />
           <h3 className="text-xl font-black italic uppercase italic tracking-tighter mb-2">CANAL NO DISPONIBLE</h3>
           <p className="text-gray-500 text-sm max-w-xs">No se ha podido establecer conexión con el equipo técnico. Por favor, intenta más tarde.</p>
        </div>
      )}
    </div>
  );
};

export default UserChat;
