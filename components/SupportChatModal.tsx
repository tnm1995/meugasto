
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { XMarkIcon, SupportAgentIcon, SendIcon, PaperClipIcon, DescriptionIcon } from './Icons';
import { useFirestoreCollection } from '../hooks/useFirestoreCollection';
import { ChatMessage, User, Omit } from '../types';
import { orderBy, serverTimestamp, doc, setDoc, updateDoc, getDoc, increment, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../services/firebaseService';
import { useToast } from '../contexts/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';

interface SupportChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
}

const isBusinessHours = () => {
  const now = new Date();
  try {
      const formatter = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: 'numeric',
        hour12: false
      });
      const hourInBrasilia = parseInt(formatter.format(now));
      return hourInBrasilia >= 9 && hourInBrasilia < 18;
  } catch (e) {
      const hours = now.getHours();
      return hours >= 9 && hours < 18;
  }
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

const SUPPORT_AVATAR_URL = "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80";

export const SupportChatModal: React.FC<SupportChatModalProps> = ({ isOpen, onClose, currentUser }) => {
  const [newMessage, setNewMessage] = useState('');
  const [isOnline, setIsOnline] = useState(isBusinessHours());
  
  // Guest Form States
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState(''); 
  const [guestPhone, setGuestPhone] = useState('');
  const [guestMessage, setGuestMessage] = useState('');
  const [isGuestFormSubmitted, setIsGuestFormSubmitted] = useState(false);

  // Typing Indicator Logic
  const [isSupportTyping, setIsSupportTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // File Upload State
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    const interval = setInterval(() => {
      setIsOnline(isBusinessHours());
    }, 60000);
    setIsOnline(isBusinessHours());
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [newMessage]);

  const queryConstraints = useMemo(() => [orderBy('timestamp', 'asc')], []);
  const { 
    data: allMessages, 
    loading, 
    addDocument 
  } = useFirestoreCollection<ChatMessage>('support_messages', currentUser?.uid || '', queryConstraints);

  const messages = useMemo(() => {
    if (!currentUser?.lastChatClearedAt) return allMessages;
    let clearTime = 0;
    if (currentUser.lastChatClearedAt.toMillis) {
        clearTime = currentUser.lastChatClearedAt.toMillis();
    } else if (currentUser.lastChatClearedAt.seconds) {
        clearTime = currentUser.lastChatClearedAt.seconds * 1000;
    } else if (typeof currentUser.lastChatClearedAt === 'string') {
        clearTime = new Date(currentUser.lastChatClearedAt).getTime();
    }

    return allMessages.filter(msg => {
        let msgTime = 0;
        if (msg.timestamp?.toMillis) msgTime = msg.timestamp.toMillis();
        else if (msg.timestamp?.seconds) msgTime = msg.timestamp.seconds * 1000;
        else if (msg.timestamp instanceof Date) msgTime = msg.timestamp.getTime();
        else if (!msg.timestamp) msgTime = Date.now();

        return msgTime > clearTime;
    });
  }, [allMessages, currentUser?.lastChatClearedAt]);

  const scrollToBottom = () => {
      if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
  };

  useEffect(() => {
    if (isOpen) {
        setTimeout(scrollToBottom, 300);
    }
  }, [isOpen, messages, isGuestFormSubmitted, isSupportTyping]);

  useEffect(() => {
      if (!currentUser?.uid) return;
      const ticketRef = doc(db, 'tickets', currentUser.uid);
      const unsubscribe = onSnapshot(ticketRef, (docSnap) => {
          if (docSnap.exists()) {
              const data = docSnap.data();
              setIsSupportTyping(!!data.isSupportTyping);
          }
      });
      return () => unsubscribe();
  }, [currentUser?.uid]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setNewMessage(e.target.value);
      if (currentUser?.uid) {
          const ticketRef = doc(db, 'tickets', currentUser.uid);
          updateDoc(ticketRef, { isUserTyping: true }).catch(() => {});
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => {
              updateDoc(ticketRef, { isUserTyping: false }).catch(() => {});
          }, 2000);
      }
  };

  const handleClose = async () => {
      if (currentUser?.uid) {
          try {
              const userRef = doc(db, 'users', currentUser.uid);
              await updateDoc(userRef, { lastChatClearedAt: serverTimestamp() });
              const ticketRef = doc(db, 'tickets', currentUser.uid);
              await updateDoc(ticketRef, { isUserTyping: false });
          } catch (error) {
              console.error("Error clearing chat session:", error);
          }
      }
      onClose();
  };

  const handleFileSelect = () => {
      if (fileInputRef.current) {
          fileInputRef.current.click();
      }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !currentUser?.uid) return;

      // Validação de Tamanho (Máximo 5MB)
      const MAX_SIZE = 5 * 1024 * 1024; // 5MB em bytes
      if (file.size > MAX_SIZE) {
          showToast("O arquivo é muito grande. O limite máximo é 5MB.", "error");
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
      }

      setIsUploading(true);
      try {
          const storageRef = ref(storage, `chat_attachments/${currentUser.uid}/${Date.now()}_${file.name}`);
          await uploadBytes(storageRef, file);
          const downloadURL = await getDownloadURL(storageRef);
          await sendMessage(undefined, downloadURL, 'image');
      } catch (error: any) {
          console.error("Upload error:", error);
          if (error.code === 'storage/unauthorized') {
             showToast("Permissão negada ou arquivo muito grande (Max 5MB).", "error");
          } else {
             showToast("Erro ao enviar imagem.", "error");
          }
      } finally {
          setIsUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const sendMessage = async (text?: string, attachmentUrl?: string, attachmentType?: 'image' | 'file') => {
      if (!currentUser) return;
      const msgText = text !== undefined ? text : newMessage.trim();
      if (!msgText && !attachmentUrl) return;

      try {
        const messageData: Omit<ChatMessage, 'id'> = {
          text: msgText,
          sender: 'user',
          timestamp: serverTimestamp(),
          read: false,
          attachmentUrl: attachmentUrl || undefined,
          attachmentType: attachmentType || undefined
        };
  
        await addDocument(messageData);
  
        const ticketRef = doc(db, 'tickets', currentUser.uid);
        const ticketSnap = await getDoc(ticketRef);
  
        const ticketPayload = {
            userId: currentUser.uid,
            userName: currentUser.name || 'Usuário',
            userEmail: currentUser.email || '',
            lastMessage: attachmentUrl ? (msgText || 'Enviou um anexo') : msgText,
            lastMessageSender: 'user',
            updatedAt: serverTimestamp(),
            status: ticketSnap.exists() && ticketSnap.data().status !== 'resolved' ? ticketSnap.data().status : 'open',
            unreadCount: increment(1),
            isUserTyping: false,
            userLastActive: serverTimestamp()
        };
  
        await setDoc(ticketRef, ticketPayload, { merge: true });
  
        if (!attachmentUrl) {
            setNewMessage('');
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            if (textareaRef.current) textareaRef.current.style.height = 'auto';
        }
      } catch (error) {
        console.error("Error sending message:", error);
        showToast("Erro ao enviar mensagem.", 'error');
      }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessage();
  };

  const handleGuestSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!guestName || !guestEmail || !guestPhone || !guestMessage) {
          showToast("Por favor, preencha todos os campos.", 'error');
          return;
      }
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
          <button onClick={handleClose} className="text-blue-600 font-bold hover:underline">Fechar Janela</button>
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
             else if (msg.timestamp?.seconds) dateObj = new Date(msg.timestamp.seconds * 1000);
             else if (msg.timestamp instanceof Date) dateObj = msg.timestamp;
          }
          
          const dateStr = formatDateSeparator(dateObj);
          const showDateSeparator = dateStr !== lastDateStr;
          lastDateStr = dateStr;
          const timeString = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          const isUser = msg.sender === 'user';
          
          const nextMsg = messages[index + 1];
          const isLastInGroup = !nextMsg || nextMsg.sender !== msg.sender || (nextMsg.timestamp && Math.abs( (typeof nextMsg.timestamp.toMillis === 'function' ? nextMsg.timestamp.toMillis() : (nextMsg.timestamp?.seconds ? nextMsg.timestamp.seconds * 1000 : (nextMsg.timestamp as any).getTime())) - dateObj.getTime()) > 60000 * 5); 
          
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
                              {msg.attachmentUrl && (
                                <div 
                                    onClick={() => window.open(msg.attachmentUrl, '_blank')}
                                    className={`flex items-center gap-2 p-2 mb-2 rounded-lg cursor-pointer transition-colors border w-full ${
                                        isUser 
                                        ? 'bg-white/10 border-white/20 hover:bg-white/20 text-white' 
                                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-700'
                                    }`}
                                >
                                    <div className={`p-1.5 rounded-md ${isUser ? 'bg-white/20' : 'bg-white border border-gray-200 shadow-sm'}`}>
                                        <DescriptionIcon className="text-lg" />
                                    </div>
                                    <div className="flex flex-col overflow-hidden text-left">
                                        <span className="text-xs font-bold truncate">Arquivo enviado</span>
                                        <span className="text-[9px] opacity-80">Clique para abrir</span>
                                    </div>
                                </div>
                              )}
                              {msg.text}
                          </div>
                          {isLastInGroup && <span className={`text-[10px] mt-1 px-1 ${isUser ? 'text-gray-400 text-right' : 'text-gray-400 text-left'}`}>{timeString}</span>}
                      </div>
                  </div>
              </React.Fragment>
          );
      });
  };

  const contentVariants = {
      hidden: { opacity: 0, transition: { duration: 0.1 } },
      visible: { opacity: 1, transition: { delay: 0.2, duration: 0.2 } },
      exit: { opacity: 0, transition: { duration: 0.1 } }
  };

  if (!isOpen) return null;

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
        transition={{ type: "spring", stiffness: 350, damping: 30 }}
        onClick={e => e.stopPropagation()}
    >
        <motion.div 
            className="flex flex-col h-full w-full"
            variants={contentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
        >
            {/* Header Branco Limpo */}
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
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 p-2 rounded-full transition-colors w-10 h-10 flex items-center justify-center shrink-0 aspect-square">
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
                        
                        {/* Upload Loading Indicator */}
                        {isUploading && (
                            <div className="flex justify-end mb-2">
                                <div className="bg-gray-100 p-3 rounded-2xl rounded-tr-none shadow-sm flex items-center gap-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                    <span className="text-xs text-gray-500">Enviando arquivo...</span>
                                </div>
                            </div>
                        )}

                        {/* Support Typing Indicator */}
                        {isSupportTyping && (
                            <div className="flex justify-start mb-2">
                                <div className="bg-white p-3 rounded-2xl rounded-tl-none flex items-center gap-1 w-fit shadow-sm border border-gray-200">
                                    <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                                    <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                                    <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>
                </>
                )}
            </div>

            {/* Input Area (Only for Logged In Users) */}
            {currentUser && (
                <div className="p-3 bg-white border-t border-gray-100 z-20">
                <form onSubmit={handleSendMessage} className="flex items-end gap-2 bg-gray-50 p-1.5 rounded-[1.5rem] border border-gray-200 focus-within:border-gray-400 focus-within:ring-4 focus-within:ring-gray-100 transition-all shadow-sm">
                    {/* Botão de Anexo */}
                    <button
                        type="button"
                        onClick={handleFileSelect}
                        disabled={isUploading}
                        className="text-gray-400 hover:text-blue-600 p-2 rounded-full hover:bg-blue-50 transition-colors mb-0.5 ml-1 flex-shrink-0"
                        title="Enviar print/arquivo"
                    >
                        <PaperClipIcon className="text-xl" />
                    </button>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileUpload} 
                        className="hidden" 
                        accept="image/*,.pdf"
                    />

                    <textarea
                        ref={textareaRef}
                        value={newMessage}
                        onChange={handleInputChange}
                        placeholder="Digite sua mensagem..."
                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-gray-800 placeholder-gray-400 resize-none max-h-32 py-3 px-2 min-h-[44px]"
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
                        disabled={!newMessage.trim() && !isUploading}
                        className="
                            group flex items-center justify-center shrink-0
                            w-11 h-11 rounded-full 
                            bg-black text-white 
                            shadow-md shadow-gray-500/20 
                            transition-all duration-300 ease-out
                            hover:shadow-lg hover:scale-105 hover:bg-gray-800
                            active:scale-95 active:shadow-sm
                            disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed disabled:shadow-none disabled:scale-100
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
