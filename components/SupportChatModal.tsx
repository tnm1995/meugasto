import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { db, storage } from '../services/firebaseService';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, setDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { User, ChatMessage } from '../types';
import { XMarkIcon, SendIcon, PaperClipIcon, SupportAgentIcon } from './Icons';
import { useToast } from '../contexts/ToastContext';

interface SupportChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
}

export const SupportChatModal: React.FC<SupportChatModalProps> = ({ isOpen, onClose, currentUser }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  // Listen to messages
  useEffect(() => {
    if (!isOpen || !currentUser?.uid) return;

    // Ensure ticket document exists
    const ticketRef = doc(db, 'tickets', currentUser.uid);
    setDoc(ticketRef, {
        userId: currentUser.uid,
        userName: currentUser.name || 'Usuário',
        userEmail: currentUser.email,
        updatedAt: serverTimestamp(),
        // status: 'open' // Don't overwrite status if exists
    }, { merge: true });

    const q = query(
      collection(db, 'tickets', currentUser.uid, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: ChatMessage[] = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() } as ChatMessage);
      });
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [isOpen, currentUser]);

  const sendMessage = async (e?: FormEvent, attachmentUrl?: string, attachmentType?: 'image' | 'file') => {
    if (e) e.preventDefault();
    if ((!newMessage.trim() && !attachmentUrl) || !currentUser?.uid) return;

    const messageText = newMessage;
    setNewMessage(''); // Clear input immediately

    try {
      // Add message to subcollection
      await addDoc(collection(db, 'tickets', currentUser.uid, 'messages'), {
        text: messageText,
        sender: 'user',
        timestamp: serverTimestamp(),
        read: false,
        attachmentUrl: attachmentUrl || null,
        attachmentType: attachmentType || null
      });

      // Update ticket metadata
      const ticketRef = doc(db, 'tickets', currentUser.uid);
      await updateDoc(ticketRef, {
        lastMessage: attachmentUrl ? (attachmentType === 'image' ? '📷 Imagem' : '📎 Arquivo') : messageText,
        lastMessageSender: 'user',
        updatedAt: serverTimestamp(),
        status: 'open', // Reopen ticket on new user message
        unreadCount: 1 // Increment or set unread for admin (logic might be more complex for increment, simplified here)
      });

    } catch (error) {
      console.error("Error sending message:", error);
      showToast("Erro ao enviar mensagem.", "error");
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
          // Cria uma referência no Storage: chat_attachments/{userId}/{timestamp}_{filename}
          const storageRef = ref(storage, `chat_attachments/${currentUser.uid}/${Date.now()}_${file.name}`);
          
          // Upload
          await uploadBytes(storageRef, file);
          
          // Get URL
          const downloadURL = await getDownloadURL(storageRef);
          
          // Send message with image
          await sendMessage(undefined, downloadURL, 'image');
          
      } catch (error: any) {
          console.error("Upload error:", error);
          // Tratamento específico para erro de permissão (storage rules)
          if (error.code === 'storage/unauthorized') {
             showToast("Permissão negada ou arquivo muito grande (Max 5MB).", "error");
          } else {
             showToast("Erro ao enviar imagem.", "error");
          }
      } finally {
          setIsUploading(false);
          // Limpa o input para permitir selecionar o mesmo arquivo novamente se quiser
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md h-[600px] flex flex-col overflow-hidden border border-gray-100">
            {/* Header */}
            <div className="bg-blue-600 p-4 flex justify-between items-center text-white shrink-0">
                <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-full">
                        <SupportAgentIcon className="text-xl" />
                    </div>
                    <div>
                        <h2 className="font-bold text-lg">Suporte MeuGasto</h2>
                        <p className="text-xs text-blue-100">Estamos aqui para ajudar</p>
                    </div>
                </div>
                <button onClick={onClose} className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-full">
                    <XMarkIcon className="text-2xl" />
                </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4">
                {messages.length === 0 && (
                    <div className="text-center text-gray-400 mt-10 text-sm">
                        <p>Envie uma mensagem para iniciar o atendimento.</p>
                    </div>
                )}
                {messages.map((msg) => {
                    const isUser = msg.sender === 'user';
                    return (
                        <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-2xl p-3 text-sm shadow-sm ${
                                isUser ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                            }`}>
                                {msg.attachmentUrl && (
                                    <div className="mb-2">
                                        <img src={msg.attachmentUrl} alt="Anexo" className="rounded-lg max-h-40 object-cover border border-white/20" />
                                    </div>
                                )}
                                {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
                                <p className={`text-[10px] mt-1 text-right ${isUser ? 'text-blue-100' : 'text-gray-400'}`}>
                                    {msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '...'}
                                </p>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white border-t border-gray-100 shrink-0">
                <form onSubmit={(e) => sendMessage(e)} className="flex items-center gap-2">
                    <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        ref={fileInputRef} 
                        onChange={handleFileUpload} 
                    />
                    <button 
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
                        title="Anexar imagem"
                    >
                        <PaperClipIcon className="text-xl" />
                    </button>
                    <input 
                        type="text" 
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Digite sua mensagem..." 
                        className="flex-1 bg-gray-100 text-gray-800 rounded-full px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
                        disabled={isUploading}
                    />
                    <button 
                        type="submit" 
                        disabled={(!newMessage.trim() && !isUploading)}
                        className="bg-blue-600 text-white p-2.5 rounded-full shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:shadow-none transform active:scale-95 flex items-center justify-center"
                    >
                        {isUploading ? (
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        ) : (
                            <SendIcon className="text-lg translate-x-0.5" />
                        )}
                    </button>
                </form>
            </div>
        </div>
    </div>
  );
};