import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Send, Image, User, Check, CheckCheck, Loader2, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';

const Chat = ({ chatId, currentUser }) => {
  const [messages, setMessages] = useState([]);
  const [chatInfo, setChatInfo] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    const fetchChatData = async () => {
      // 1. Obtener info del chat con perfiles de cliente y admin
      const { data: chatData, error } = await supabase
        .from('chats')
        .select(`
          *,
          client:client_id(first_name, last_name, avatar_url, role),
          admin:admin_id(first_name, last_name, avatar_url, role)
        `)
        .eq('id', chatId)
        .single();
      
      if (error) {
        console.error("Error fetching chat data:", error);
        setLoading(false);
        return;
      }

      // Determinar quién es la otra persona para mostrar en el header
      const isUserAdmin = ['admin', 'admin-user'].includes(currentUser?.role);
      const otherPerson = isUserAdmin ? chatData.client : chatData.admin;
      
      setChatInfo({ ...chatData, otherPerson });

      // 2. Obtener mensajes
      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (msgs) {
        setMessages(msgs);
        markAsRead(msgs);
      }
      setLoading(false);
      scrollToBottom();
    };

    fetchChatData();

    const channel = supabase
      .channel(`chat_realtime:${chatId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `chat_id=eq.${chatId}`
      }, (payload) => {
        setMessages((prev) => {
          // Evitar duplicados si el mensaje ya llegó por el insert directo
          if (prev.some(m => m.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });
        markAsRead([payload.new]);
        scrollToBottom();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId]);

  const markAsRead = async (msgs) => {
    const unreadIds = msgs
      .filter(m => m.sender_id !== currentUser.id && !m.is_read)
      .map(m => m.id);

    if (unreadIds.length > 0) {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .in('id', unreadIds);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const content = newMessage;
    const tempId = 'temp-' + Date.now();
    setNewMessage('');

    // Optimismo: Agregar mensaje localmente para feedback inmediato
    const optimisticMsg = {
      id: tempId,
      chat_id: chatId,
      sender_id: currentUser.id,
      content: content,
      created_at: new Date().toISOString(),
      is_sending: true
    };
    
    setMessages(prev => [...prev, optimisticMsg]);
    scrollToBottom();

    try {
      // 1. Insertar mensaje
      const { data: insertedMsg, error: msgError } = await supabase
        .from('messages')
        .insert([{
          chat_id: chatId,
          sender_id: currentUser.id,
          content: content
        }])
        .select()
        .single();

      if (msgError) throw msgError;

      // Actualizar el mensaje optimista con el real para evitar saltos
      setMessages(prev => prev.map(m => m.id === tempId ? insertedMsg : m));

      // 2. Actualizar resumen del chat
      await supabase
        .from('chats')
        .update({ 
          last_message: content,
          updated_at: new Date().toISOString()
        })
        .eq('id', chatId);
      
      scrollToBottom();
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      // Revertir optimismo y devolver texto al input
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setNewMessage(content);
      
      Swal.fire({
        title: 'Error de Envío',
        text: 'Hubo un problema al enviar el mensaje. Verifica tu conexión.',
        icon: 'error',
        background: '#121212',
        color: '#fff',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 4000
      });
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full text-primary">
      <Loader2 className="animate-spin mb-3" size={32} />
      <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Sincronizando...</span>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-black/20 overflow-hidden">
      {/* Header Premium */}
      <div className="p-6 border-b border-dark-700 bg-dark-900/50 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-[1.2rem] bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center text-primary shadow-lg shadow-primary/5 overflow-hidden">
            {chatInfo?.otherPerson?.avatar_url ? (
               <img src={chatInfo.otherPerson.avatar_url} className="w-full h-full object-cover" alt="Profile" />
            ) : (
               <User size={24} />
            )}
          </div>
          <div>
            <h4 className="text-sm font-black italic uppercase tracking-tight leading-none mb-1">
              {chatInfo?.otherPerson?.first_name} {chatInfo?.otherPerson?.last_name || ''}
            </h4>
            <p className="text-[9px] font-bold text-primary uppercase tracking-[0.2em] opacity-80 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" /> 
              {['admin', 'admin-user'].includes(chatInfo?.otherPerson?.role) ? 'Soporte Técnico' : 'Cliente Conectado'}
            </p>
          </div>
        </div>
      </div>

      {/* Área de Mensajes */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-fixed">
        {messages.map((msg) => {
          const isMe = msg.sender_id === currentUser.id;
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, x: isMe ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[75%] group relative ${isMe ? 'items-end' : 'items-start'}`}>
                <div className={`px-5 py-3.5 rounded-[1.8rem] text-[13px] shadow-xl ${
                  isMe 
                    ? 'bg-primary text-black font-black rounded-tr-none' 
                    : 'bg-dark-800 text-white border border-dark-700 rounded-tl-none font-medium'
                }`}>
                  {msg.content}
                </div>
                <div className={`mt-2 flex items-center gap-2 px-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {isMe && <CheckCheck size={12} className="text-primary" />}
                </div>
              </div>
            </motion.div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      {/* Input de Mensaje de Alta Gama */}
      <form onSubmit={handleSendMessage} className="p-6 bg-dark-900 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] border-t border-dark-700">
        <div className="max-w-4xl mx-auto flex gap-3">
          <div className="flex-1 relative">
            <input 
              type="text" 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Escribe tu respuesta técnica..."
              className="w-full bg-dark-800 border border-dark-700 rounded-2xl px-6 py-4 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-white text-xs font-bold"
            />
            <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-primary transition-colors">
              <Image size={20} />
            </button>
          </div>
          <button 
            type="submit"
            className="w-14 h-14 bg-primary text-black rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20"
          >
            <Send size={24} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default Chat;
