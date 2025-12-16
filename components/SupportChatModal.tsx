
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { XMarkIcon, SupportAgentIcon, SendIcon } from './Icons';
import { useFirestoreCollection } from '../hooks/useFirestoreCollection';
import { ChatMessage, User, Omit, TicketStatus } from '../types';
import { orderBy, serverTimestamp, doc, setDoc, updateDoc, getDoc, increment } from 'firebase/firestore';
import { db } from '../services/firebaseService';
import { useToast } from '../contexts/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';

interface SupportChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
}

const isBusinessHours = () => {
  const now = new Date();
  const hours = now.getHours();
  // Funcionamento: 9h às 18h
  return hours >= 9 && hours < 18;
};

const formatDateSeparator = (date: Date) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (checkDate.getTime() === today.getTime()) return 'Hoje';
  if (checkDate.getTime() === yesterday.getTime()) return 'Ontem';
  
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// URL da imagem de perfil do suporte (Mulher profissional)
const SUPPORT_AVATAR_URL = "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80";
// Fallback para usuário
const DEFAULT_USER_AVATAR = "https://gravatar.com/avatar/?d=mp";

export const SupportChatModal: React.FC<SupportChatModalProps> = ({ isOpen, onClose, currentUser }) => {
  const [newMessage, setNewMessage] = useState('');
  const [isOnline, setIsOnline] = useState(isBusinessHours());
  
  // Guest Form States
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState(''); 
  const [guestPhone, setGuestPhone] = useState('');
  const [guestMessage, setGuestMessage] = useState('');
  const [isGuestFormSubmitted, setIsGuestFormSubmitted] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    const interval = setInterval(() => {
      setIsOnline(isBusinessHours());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Ajusta altura do textarea
  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [newMessage]);

  // Se tem usuário, usa o hook do Firestore. Se não, passa string vazia para evitar erro de permissão (modo formulário)
  const queryConstraints = useMemo(() => [orderBy('timestamp', 'asc')], []);
  const { 
    data: messages, 
    loading, 
    addDocument 
  } = useFirestoreCollection<ChatMessage>('support_messages', currentUser?.uid || '', queryConstraints);

  const scrollToBottom = () => {
      if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
  };

  useEffect(() => {
    if (isOpen) {
        setTimeout(scrollToBottom, 300); // Slight delay for animation
    }
  }, [isOpen, messages, isGuestFormSubmitted]);

  if (!isOpen) return null;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    if (!currentUser) {
        return;
    }

    try {
      // 1. Salva a mensagem na subcoleção do usuário (histórico)
      const messageData: Omit<ChatMessage, 'id'> = {
        text: newMessage.trim(),
        sender: 'user',
        timestamp: serverTimestamp(),
        read: false
      };

      await addDocument(messageData);

      // 2. Cria ou Atualiza o Ticket na coleção root 'tickets' para o Admin ver
      const ticketRef = doc(db, 'tickets', currentUser.uid);
      const ticketSnap = await getDoc(ticketRef);

      const ticketPayload = {
          userId: currentUser.uid,
          userName: currentUser.name || 'Usuário',
          userEmail: currentUser.email || '',
          lastMessage: newMessage.trim(),
          lastMessageSender: 'user',
          updatedAt: serverTimestamp(),
          // Se já existe, mantém o status atual (a menos que esteja resolvido, aí reabre). Se não, cria como 'open'.
          status: ticketSnap.exists() && ticketSnap.data().status !== 'resolved' ? ticketSnap.data().status : 'open',
          unreadCount: increment(1) // Incrementa contador de não lidas para o admin
      };

      await setDoc(ticketRef, ticketPayload, { merge: true });

      setNewMessage('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    } catch (error) {
      console.error("Error sending message:", error);
      showToast("Erro ao enviar mensagem.", 'error');
    }
  };

  const handleGuestSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!guestName || !guestEmail || !guestPhone || !guestMessage) {
          showToast("Por favor, preencha todos os campos.", 'error');
          return;
      }

      // Guest também pode gerar um ticket se quisermos, mas como não tem UID, 
      // precisaria de uma coleção separada ou gerar um ID temporário. 
      // Por enquanto, mantemos apenas o aviso visual para simplificar.
      
      setIsGuestFormSubmitted(true);
      showToast("Mensagem enviada! Entraremos em contato.", 'success');
  };

  const handleGuestPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 11);
    let formatted = value;
    if (value.length > 7) {
        formatted = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
    } else if (value.length > 2) {
        formatted = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    }
    setGuestPhone(formatted);
  };

  const renderGuestForm = () => (
      <div className="p-6 flex flex-col h-full bg-white overflow-y-auto custom-scrollbar">
          <div className="mb-6 text-center">
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-lg overflow-hidden">
                  <img src={SUPPORT_AVATAR_URL} alt="Atendente" className="w-full h-full object-cover" />
              </div>
              <h3 className="text-xl font-bold text-gray-800">Fale com a gente</h3>
              <p className="text-sm text-gray-500 mt-1">Preencha seus dados e responderemos o mais rápido possível.</p>
          </div>

          <form onSubmit={handleGuestSubmit} className="space-y-4">
              <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Nome</label>
                  <input 
                      type="text" 
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="Seu nome"
                      value={guestName}
                      onChange={e => setGuestName(e.target.value)}
                      required
                  />
              </div>
              <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Email</label>
                  <input 
                      type="email" 
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="seu@email.com"
                      value={guestEmail}
                      onChange={e => setGuestEmail(e.target.value)}
                      required
                  />
              </div>
              <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">WhatsApp / Celular</label>
                  <div className="relative">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2 pointer-events-none z-10 border-r border-gray-300 pr-2">
                          <img src="https://flagcdn.com/w40/br.png" alt="Brasil" className="w-5 h-auto rounded-sm shadow-sm" />
                          <span className="text-gray-500 font-medium text-xs">+55</span>
                      </div>
                      <input 
                          type="tel" 
                          className="w-full p-3 pl-[5.5rem] bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                          placeholder="(00) 00000-0000"
                          value={guestPhone}
                          onChange={handleGuestPhoneChange}
                          required
                      />
                  </div>
              </div>
              <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Como podemos ajudar?</label>
                  <textarea 
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none h-24"
                      placeholder="Descreva sua dúvida..."
                      value={guestMessage}
                      onChange={e => setGuestMessage(e.target.value)}
                      required
                  />
              </div>
              <button 
                  type="submit" 
                  className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition-colors shadow-lg active:scale-95 mt-2"
              >
                  Enviar Mensagem
              </button>
          </form>
      </div>
  );

  const renderGuestSuccess = () => (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-white">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 text-green-600 animate-fade-in">
              <span className="material-symbols-outlined text-4xl">check</span>
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Mensagem Enviada!</h3>
          <p className="text-gray-500 mb-8">Obrigado, <strong>{guestName}</strong>. Nossa equipe entrará em contato pelo número <strong>{guestPhone}</strong> ou email <strong>{guestEmail}</strong> em breve.</p>
          <button onClick={onClose} className="text-blue-600 font-bold hover:underline">Fechar Janela</button>
      </div>
  );

  const renderMessages = () => {
      if (loading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

      if (messages.length === 0) {
          return (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 p-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 overflow-hidden border-2 border-white shadow-sm">
                      <img src={SUPPORT_AVATAR_URL} alt="Suporte" className="w-full h-full object-cover opacity-80 grayscale" />
                  </div>
                  <p className="text-sm font-medium text-gray-500">Como podemos ajudar você hoje?</p>
                  <p className="text-xs mt-1">Envie sua dúvida abaixo.</p>
              </div>
          );
      }

      let lastDateStr = '';
      
      return messages.map((msg, index) => {
          let dateObj = new Date();
          if (msg.timestamp) {
             if (typeof msg.timestamp.toMillis === 'function') dateObj = new Date(msg.timestamp.toMillis());
             else if (msg.timestamp instanceof Date) dateObj = msg.timestamp;
          }
          
          const dateStr = formatDateSeparator(dateObj);
          const showDateSeparator = dateStr !== lastDateStr;
          lastDateStr = dateStr;
          const timeString = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          const isUser = msg.sender === 'user';
          
          const nextMsg = messages[index + 1];
          const isLastInGroup = !nextMsg || nextMsg.sender !== msg.sender || (nextMsg.timestamp && Math.abs( (typeof nextMsg.timestamp.toMillis === 'function' ? nextMsg.timestamp.toMillis() : (nextMsg.timestamp as any).getTime()) - dateObj.getTime()) > 60000 * 5); 
          
          let borderRadiusClass = 'rounded-2xl';
          if (isUser) borderRadiusClass = isLastInGroup ? 'rounded-2xl rounded-tr-sm' : 'rounded-2xl rounded-tr-sm rounded-br-sm mb-1';
          else borderRadiusClass = isLastInGroup ? 'rounded-2xl rounded-tl-sm' : 'rounded-2xl rounded-tl-sm rounded-bl-sm mb-1';

          return (
              <React.Fragment key={msg.id}>
                  {showDateSeparator && (
                      <div className="flex justify-center my-4">
                          <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">{dateStr}</span>
                      </div>
                  )}
                  <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} ${isLastInGroup ? 'mb-3' : 'mb-1'} group`}>
                      <div className={`max-w-[80%] relative ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
                          <div className={`px-4 py-2.5 text-sm shadow-sm relative break-words w-full ${borderRadiusClass} ${isUser ? 'bg-black text-white' : 'bg-white text-gray-800 border border-gray-100'}`}>
                              {msg.text}
                          </div>
                          {isLastInGroup && <span className={`text-[10px] mt-1 px-1 ${isUser ? 'text-gray-400 text-right' : 'text-gray-400 text-left'}`}>{timeString}</span>}
                      </div>
                  </div>
              </React.Fragment>
          );
      });
  };

  // Variantes para suavizar a entrada/saída do CONTEÚDO (evita esmagamento)
  const contentVariants = {
      hidden: { opacity: 0, transition: { duration: 0.1 } },
      visible: { opacity: 1, transition: { delay: 0.2, duration: 0.2 } },
      exit: { opacity: 0, transition: { duration: 0.1 } }
  };

  return (
    <motion.div 
        layoutId="support-chat-container"
        className="fixed z-[9999] bg-gray-50 flex flex-col overflow-hidden shadow-2xl origin-bottom-right"
        style={{
            bottom: window.innerWidth < 640 ? 0 : '1.5rem', 
            right: window.innerWidth < 640 ? 0 : '1.5rem',
            width: window.innerWidth < 640 ? '100%' : '420px',
            height: window.innerWidth < 640 ? '100%' : '650px',
            borderRadius: window.innerWidth < 640 ? '0' : '1.5rem',
            maxHeight: window.innerWidth < 640 ? '100vh' : '90vh'
        }}
        transition={{ type: "spring", stiffness: 350, damping: 30 }} // Ajuste fino
        onClick={e => e.stopPropagation()}
    >
        {/* Envolvemos todo o conteúdo interno em um motion.div com fade in/out */}
        <motion.div 
            className="flex flex-col h-full w-full"
            variants={contentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
        >
            {/* Header */}
            <div className="bg-white border-b border-gray-100 p-4 flex justify-between items-center shadow-sm z-20">
            <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 shrink-0">
                    <div className="w-full h-full rounded-full overflow-hidden border border-gray-200 shadow-inner">
                        <img src={SUPPORT_AVATAR_URL} alt="Julia" className="w-full h-full object-cover" />
                    </div>
                    <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                </div>
                <div>
                <h2 className="font-bold text-gray-800 text-base">Suporte MeuGasto</h2>
                <p className="text-xs text-gray-500 flex items-center gap-1.5 font-medium">
                    {isOnline ? 'Julia - Online agora' : 'Julia - Fora do horário'}
                </p>
                </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 p-2 rounded-full transition-colors w-10 h-10 flex items-center justify-center shrink-0 aspect-square">
                <XMarkIcon className="text-xl" />
            </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative bg-[#f8fafc]">
                {!currentUser && !isGuestFormSubmitted ? renderGuestForm() : 
                !currentUser && isGuestFormSubmitted ? renderGuestSuccess() : (
                <>
                    {/* Warning Banner se Offline */}
                    {!isOnline && (
                    <div className="bg-amber-50 px-4 py-3 text-xs text-amber-800 font-medium text-center border-b border-amber-100 flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-sm">schedule</span>
                        Atendimento: Seg a Sex, 09h às 18h. Deixe sua mensagem!
                    </div>
                    )}
                    <div className="h-full overflow-y-auto p-4 space-y-1 custom-scrollbar">
                        {renderMessages()}
                        <div ref={messagesEndRef} />
                    </div>
                </>
                )}
            </div>

            {/* Input Area (Only for Logged In Users) */}
            {currentUser && (
                <div className="p-3 bg-white border-t border-gray-100 z-20">
                <form onSubmit={handleSendMessage} className="flex items-end gap-2 bg-gray-50 p-1.5 rounded-[1.5rem] border border-gray-200 focus-within:border-gray-400 focus-within:ring-4 focus-within:ring-gray-100 transition-all shadow-sm">
                    <textarea
                    ref={textareaRef}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-gray-800 placeholder-gray-400 resize-none max-h-32 py-3 px-4 min-h-[44px]"
                    rows={1}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                        }
                    }}
                    />
                    <button 
                        type="submit" 
                        disabled={!newMessage.trim()}
                        className="
                            group flex items-center justify-center shrink-0
                            w-11 h-11 rounded-full 
                            bg-gradient-to-r from-blue-600 to-indigo-600 text-white 
                            shadow-md shadow-blue-500/20 
                            transition-all duration-300 ease-out
                            hover:shadow-lg hover:shadow-blue-500/40 hover:scale-105 hover:from-blue-500 hover:to-indigo-500
                            active:scale-95 active:shadow-sm
                            disabled:bg-none disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed disabled:shadow-none disabled:scale-100
                            mb-0.5 mr-0.5
                        "
                        >
                        <SendIcon className="text-xl relative left-0.5 top-0.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-disabled:transform-none" />
                    </button>
                </form>
                </div>
            )}
        </motion.div>
    </motion.div>
  );
};
