import React, { useState, useEffect, useRef } from 'react';
import { db, storage } from '../services/firebaseService';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, where, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { User, Ticket, ChatMessage } from '../types';
import { SearchIcon, SendIcon, PaperClipIcon, ChatBubbleIcon, XMarkIcon } from './Icons';
import { useToast } from '../contexts/ToastContext';

interface AdminSupportProps {
    currentUser: User;
    allUsers?: User[];
}

export const AdminSupport: React.FC<AdminSupportProps> = ({ currentUser, allUsers }) => {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { showToast } = useToast();

    // Fetch Tickets
    useEffect(() => {
        const q = query(collection(db, 'tickets'), orderBy('updatedAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const ticketList: Ticket[] = [];
            snapshot.forEach((doc) => {
                ticketList.push({ id: doc.id, ...doc.data() } as Ticket);
            });
            setTickets(ticketList);
        });
        return () => unsubscribe();
    }, []);

    // Fetch Messages for Selected Ticket
    useEffect(() => {
        if (!selectedTicketId) return;

        const q = query(
            collection(db, 'tickets', selectedTicketId, 'messages'),
            orderBy('timestamp', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs: ChatMessage[] = [];
            snapshot.forEach((doc) => {
                msgs.push({ id: doc.id, ...doc.data() } as ChatMessage);
            });
            setMessages(msgs);
            // Scroll to bottom on new messages
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        });

        // Mark ticket as read (optional logic, could reset unread count)
        // updateDoc(doc(db, 'tickets', selectedTicketId), { unreadCount: 0 });

        return () => unsubscribe();
    }, [selectedTicketId]);

    const handleSendMessage = async (e?: React.FormEvent, attachmentUrl?: string, attachmentType?: 'image' | 'file') => {
        if (e) e.preventDefault();
        if ((!newMessage.trim() && !attachmentUrl) || !selectedTicketId) return;

        const messageText = newMessage;
        setNewMessage('');

        try {
            await addDoc(collection(db, 'tickets', selectedTicketId, 'messages'), {
                text: messageText,
                sender: 'support',
                timestamp: serverTimestamp(),
                read: false,
                attachmentUrl: attachmentUrl || null,
                attachmentType: attachmentType || null
            });

            await updateDoc(doc(db, 'tickets', selectedTicketId), {
                lastMessage: attachmentUrl ? (attachmentType === 'image' ? '📷 Imagem' : '📎 Arquivo') : messageText,
                lastMessageSender: 'support',
                updatedAt: serverTimestamp(),
                // status: 'in_progress' // Optional: auto update status
            });
        } catch (error) {
            console.error("Error sending message:", error);
            showToast("Erro ao enviar mensagem.", "error");
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedTicketId) return;

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
            const storageRef = ref(storage, `chat_attachments/${selectedTicketId}/${Date.now()}_${file.name}`);
            
            // Upload
            await uploadBytes(storageRef, file);
            
            // Get URL
            const downloadURL = await getDownloadURL(storageRef);
            
            // Send message with image
            await handleSendMessage(undefined, downloadURL, 'image');
            
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

    const filteredTickets = tickets.filter(t => 
        t.userName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        t.userEmail?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedTicket = tickets.find(t => t.id === selectedTicketId);

    return (
        <div className="flex flex-col md:flex-row h-[calc(100vh-200px)] min-h-[500px] bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Sidebar / Ticket List */}
            <div className={`w-full md:w-1/3 border-r border-gray-200 flex flex-col ${selectedTicketId ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b border-gray-200">
                    <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Buscar tickets..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {filteredTickets.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 text-sm">Nenhum ticket encontrado.</div>
                    ) : (
                        filteredTickets.map(ticket => (
                            <div 
                                key={ticket.id}
                                onClick={() => setSelectedTicketId(ticket.id)}
                                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${selectedTicketId === ticket.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className="font-bold text-gray-800 text-sm truncate">{ticket.userName}</h4>
                                    <span className="text-[10px] text-gray-400">
                                        {ticket.updatedAt?.toDate ? ticket.updatedAt.toDate().toLocaleDateString() : '-'}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-600 mb-1 truncate">{ticket.lastMessage}</p>
                                <div className="flex justify-between items-center">
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold 
                                        ${ticket.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                        {ticket.status}
                                    </span>
                                    {ticket.unreadCount > 0 && (
                                        <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                                            {ticket.unreadCount}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className={`w-full md:w-2/3 flex flex-col ${!selectedTicketId ? 'hidden md:flex' : 'flex'}`}>
                {selectedTicketId ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                            <div className="flex items-center gap-3">
                                <button onClick={() => setSelectedTicketId(null)} className="md:hidden text-gray-500">
                                    <span className="material-symbols-outlined">arrow_back</span>
                                </button>
                                <div>
                                    <h3 className="font-bold text-gray-800">{selectedTicket?.userName}</h3>
                                    <p className="text-xs text-gray-500">{selectedTicket?.userEmail}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors"
                                    onClick={() => setSelectedTicketId(null)}
                                    title="Fechar chat"
                                >
                                    <XMarkIcon className="text-xl" />
                                </button>
                            </div>
                        </div>

                        {/* Messages List */}
                        <div className="flex-1 overflow-y-auto p-4 bg-white space-y-4">
                            {messages.map((msg) => {
                                const isSupport = msg.sender === 'support';
                                return (
                                    <div key={msg.id} className={`flex ${isSupport ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[80%] rounded-2xl p-3 text-sm shadow-sm ${
                                            isSupport ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-gray-100 text-gray-800 rounded-tl-none'
                                        }`}>
                                            {msg.attachmentUrl && (
                                                <div className="mb-2">
                                                    <img src={msg.attachmentUrl} alt="Anexo" className="rounded-lg max-h-40 object-cover border border-white/20" />
                                                </div>
                                            )}
                                            {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
                                            <p className={`text-[10px] mt-1 text-right ${isSupport ? 'text-blue-100' : 'text-gray-400'}`}>
                                                {msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '...'}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 border-t border-gray-200 bg-gray-50">
                            <form onSubmit={(e) => handleSendMessage(e)} className="flex items-center gap-2">
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
                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-gray-200 rounded-full transition-colors"
                                >
                                    <PaperClipIcon className="text-xl" />
                                </button>
                                <input 
                                    type="text" 
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Digite sua resposta..." 
                                    className="flex-1 bg-white border border-gray-300 text-gray-800 rounded-full px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                                    disabled={isUploading}
                                />
                                <button 
                                    type="submit" 
                                    disabled={!newMessage.trim() && !isUploading}
                                    className="bg-blue-600 text-white p-2.5 rounded-full shadow-md hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center"
                                >
                                    {isUploading ? (
                                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    ) : (
                                        <SendIcon className="text-lg" />
                                    )}
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                        <ChatBubbleIcon className="text-6xl mb-4 opacity-20" />
                        <p>Selecione um ticket para ver a conversa.</p>
                    </div>
                )}
            </div>
        </div>
    );
};