
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db, storage } from '../services/firebaseService';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, getDocs, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Ticket, TicketStatus, TicketTag, ChatMessage, User } from '../types';
import { useToast } from '../contexts/ToastContext';
import { 
    SearchIcon, 
    CheckCircleIcon, 
    SupportAgentIcon, 
    SendIcon, 
    DescriptionIcon, 
    MoreVertIcon, 
    XMarkIcon,
    PaperClipIcon
} from './Icons';
import { motion } from 'framer-motion';

interface AdminSupportProps {
    currentUser: User;
    allUsers: User[];
}

const MACROS = [
    { label: "Saudação", text: "Olá! Como posso ajudar você hoje?" },
    { label: "Pedir Detalhes", text: "Poderia me dar mais detalhes sobre o problema que está enfrentando?" },
    { label: "Analisando", text: "Estou analisando sua conta, só um momento por favor." },
    { label: "Encerrar", text: "Há algo mais em que eu possa ajudar? Se não, vou encerrar este chamado." },
    { label: "Pagamento", text: "Para questões de pagamento, verifique se seu cartão está habilitado para compras online." }
];

const TICKET_TAGS: { value: TicketTag, label: string, color: string }[] = [
    { value: 'financeiro', label: 'Financeiro', color: 'bg-green-100 text-green-700' },
    { value: 'bug', label: 'Bug/Erro', color: 'bg-red-100 text-red-700' },
    { value: 'cancelamento', label: 'Cancelamento', color: 'bg-gray-200 text-gray-700' },
    { value: 'duvida', label: 'Dúvida', color: 'bg-blue-100 text-blue-700' },
    { value: 'feature', label: 'Sugestão', color: 'bg-purple-100 text-purple-700' },
];

export const AdminSupport: React.FC<AdminSupportProps> = ({ currentUser, allUsers }) => {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [filterStatus, setFilterStatus] = useState<TicketStatus | 'all'>('open');
    const [replyText, setReplyText] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    
    // Typing Indicators
    const typingTimeoutRef = useRef<any>(null);
    
    // Ticket Details State
    const [internalNote, setInternalNote] = useState('');
    const [loadingMessages, setLoadingMessages] = useState(false);

    // File Upload State
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { showToast } = useToast();

    const admins = useMemo(() => allUsers.filter(u => u.role && ['admin', 'super_admin', 'operational_admin', 'support_admin'].includes(u.role)), [allUsers]);

    // 1. Fetch Tickets
    useEffect(() => {
        const q = query(collection(db, 'tickets'), orderBy('updatedAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const ticketList: Ticket[] = [];
            snapshot.forEach(doc => {
                ticketList.push({ id: doc.id, ...doc.data() } as Ticket);
            });
            setTickets(ticketList);
        });
        return () => unsubscribe();
    }, []);

    // 2. Fetch Messages for Selected Ticket
    useEffect(() => {
        if (!selectedTicketId) {
            setMessages([]);
            return;
        }

        setLoadingMessages(true);
        // Garante que o caminho é o mesmo usado pelo usuário: users/{userId}/support_messages
        const messagesRef = collection(db, 'users', selectedTicketId, 'support_messages');
        const q = query(messagesRef, orderBy('timestamp', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgList: ChatMessage[] = [];
            snapshot.forEach(doc => {
                msgList.push({ id: doc.id, ...doc.data() } as ChatMessage);
            });
            setMessages(msgList);
            setLoadingMessages(false);
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        });

        const currentTicket = tickets.find(t => t.id === selectedTicketId);
        if (currentTicket) setInternalNote(currentTicket.internalNotes || '');

        return () => unsubscribe();
    }, [selectedTicketId]);

    // 3. Auto-reset Unread Count (Lógica Adicionada)
    useEffect(() => {
        if (selectedTicketId) {
            const currentTicket = tickets.find(t => t.id === selectedTicketId);
            if (currentTicket && currentTicket.unreadCount > 0) {
                const ticketRef = doc(db, 'tickets', selectedTicketId);
                updateDoc(ticketRef, { unreadCount: 0 }).catch(err => console.error("Erro ao zerar contador:", err));
            }
        }
    }, [selectedTicketId, tickets]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setReplyText(e.target.value);
        if (!selectedTicketId) return;

        const ticketRef = doc(db, 'tickets', selectedTicketId);
        updateDoc(ticketRef, { isSupportTyping: true }).catch(() => {});

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        
        typingTimeoutRef.current = setTimeout(() => {
            updateDoc(ticketRef, { isSupportTyping: false }).catch(() => {});
        }, 2000);
    };

    const handleFileSelect = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
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
            const storageRef = ref(storage, `chat_attachments/${selectedTicketId}/${Date.now()}_${file.name}`);
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
        if (!selectedTicketId) {
            showToast('Selecione um ticket primeiro.', 'error');
            return;
        }
        const msgText = text !== undefined ? text : replyText.trim();
        if (!msgText && !attachmentUrl) return;

        try {
            // Referência direta à coleção no Firestore
            const messagesRef = collection(db, 'users', selectedTicketId, 'support_messages');
            
            // Adiciona mensagem
            await addDoc(messagesRef, {
                text: msgText,
                sender: 'support',
                timestamp: serverTimestamp(),
                read: false,
                attachmentUrl: attachmentUrl || undefined,
                attachmentType: attachmentType || undefined
            });

            // Atualiza ticket
            const ticketRef = doc(db, 'tickets', selectedTicketId);
            await updateDoc(ticketRef, {
                lastMessage: attachmentUrl ? (msgText || 'Enviou um anexo') : msgText,
                lastMessageSender: 'support',
                updatedAt: serverTimestamp(),
                status: 'in_progress',
                unreadCount: 0,
                isSupportTyping: false
            });

            if (!attachmentUrl) {
                setReplyText('');
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            }
        } catch (error) {
            console.error("Error sending message:", error);
            showToast('Erro ao enviar mensagem. Verifique permissões.', 'error');
        }
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage();
    };

    const updateTicketField = async (field: keyof Ticket, value: any) => {
        if (!selectedTicketId) return;
        try {
            const ticketRef = doc(db, 'tickets', selectedTicketId);
            await updateDoc(ticketRef, { [field]: value });
            showToast('Ticket atualizado.', 'success');
        } catch (error) {
            showToast('Erro ao atualizar.', 'error');
        }
    };

    const handleSaveNote = async () => {
        await updateTicketField('internalNotes', internalNote);
    };

    const filteredTickets = tickets.filter(t => {
        const matchesStatus = filterStatus === 'all' ? true : t.status === filterStatus;
        const matchesSearch = t.userName.toLowerCase().includes(searchTerm.toLowerCase()) || t.userEmail.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const selectedTicket = tickets.find(t => t.id === selectedTicketId);

    const getStatusBadge = (status: TicketStatus) => {
        switch (status) {
            case 'open': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 uppercase tracking-wide">Aberto</span>;
            case 'in_progress': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 uppercase tracking-wide">Em Andamento</span>;
            case 'resolved': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700 uppercase tracking-wide">Resolvido</span>;
        }
    };

    const isUserOnline = (ticket: Ticket) => {
        if (!ticket.userLastActive) return false;
        let lastActiveTime = 0;
        if (ticket.userLastActive.toMillis) lastActiveTime = ticket.userLastActive.toMillis();
        else if (ticket.userLastActive.seconds) lastActiveTime = ticket.userLastActive.seconds * 1000;
        else if (ticket.userLastActive instanceof Date) lastActiveTime = ticket.userLastActive.getTime();
        return (Date.now() - lastActiveTime) < 120000;
    };

    return (
        <div className="flex h-[calc(100vh-140px)] bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            
            {/* LEFT SIDEBAR: Ticket List */}
            <div className="w-1/3 min-w-[300px] border-r border-gray-200 flex flex-col bg-gray-50">
                <div className="p-4 border-b border-gray-200 bg-white">
                    <div className="relative mb-4">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                        <input 
                            type="text" 
                            placeholder="Buscar usuário..." 
                            className="w-full pl-9 pr-4 py-2 bg-gray-100 border-transparent focus:bg-white focus:border-blue-500 rounded-lg text-sm transition-all outline-none border"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {(['open', 'in_progress', 'resolved', 'all'] as const).map(status => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${filterStatus === status ? 'bg-gray-800 text-white shadow-md' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                            >
                                {status === 'all' ? 'Todos' : (status === 'open' ? 'Abertos' : (status === 'in_progress' ? 'Andamento' : 'Resolvidos'))}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {filteredTickets.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 text-sm">Nenhum ticket encontrado.</div>
                    ) : (
                        filteredTickets.map(ticket => (
                            <div 
                                key={ticket.id}
                                onClick={() => setSelectedTicketId(ticket.id)}
                                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-white transition-colors relative ${selectedTicketId === ticket.id ? 'bg-white border-l-4 border-l-blue-600 shadow-sm' : ''}`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <div className="flex items-center gap-1.5">
                                        <h4 className={`font-bold text-sm ${ticket.unreadCount > 0 ? 'text-gray-900' : 'text-gray-700'}`}>{ticket.userName}</h4>
                                        {isUserOnline(ticket) && (
                                            <span className="w-2 h-2 rounded-full bg-green-500 shadow-sm" title="Online Agora"></span>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-gray-400">{new Date(ticket.updatedAt?.toMillis?.() || Date.now()).toLocaleDateString('pt-BR', {day:'2-digit', month:'short'})}</span>
                                </div>
                                <p className={`text-xs truncate mb-2 ${ticket.unreadCount > 0 ? 'font-bold text-gray-800' : 'text-gray-500'}`}>
                                    {ticket.isUserTyping ? (
                                        <span className="text-blue-600 font-bold italic">Digitando...</span>
                                    ) : (
                                        <>
                                            {ticket.lastMessageSender === 'user' ? '👤 ' : 'Support: '} {ticket.lastMessage}
                                        </>
                                    )}
                                </p>
                                <div className="flex items-center justify-between">
                                    <div className="flex gap-1">
                                        {getStatusBadge(ticket.status)}
                                        {ticket.tags && ticket.tags.length > 0 && (
                                            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${TICKET_TAGS.find(t=>t.value === ticket.tags![0])?.color || 'bg-gray-100'}`}>
                                                {ticket.tags[0].slice(0,3)}
                                            </span>
                                        )}
                                    </div>
                                    {ticket.unreadCount > 0 && (
                                        <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{ticket.unreadCount}</span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* MAIN CONTENT: Chat */}
            {selectedTicket ? (
                <div className="flex-1 flex flex-col min-w-0 bg-white relative">
                    {/* Header Chat */}
                    <div className="h-16 border-b border-gray-100 flex justify-between items-center px-6 bg-white shrink-0">
                        <div className="flex flex-col">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                {selectedTicket.userName}
                                {isUserOnline(selectedTicket) ? (
                                    <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Online
                                    </span>
                                ) : (
                                    <span className="text-[10px] font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">Offline</span>
                                )}
                            </h3>
                            <p className="text-xs text-gray-500">{selectedTicket.userEmail}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <select 
                                value={selectedTicket.status}
                                onChange={(e) => updateTicketField('status', e.target.value)}
                                className="bg-gray-50 border border-gray-200 text-xs font-bold rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="open">Aberto</option>
                                <option value="in_progress">Em Andamento</option>
                                <option value="resolved">Resolvido</option>
                            </select>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 space-y-4 custom-scrollbar">
                        {messages.map((msg) => {
                            const isSupport = msg.sender !== 'user';
                            return (
                                <div key={msg.id} className={`flex ${isSupport ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[70%] p-3 rounded-2xl text-sm shadow-sm ${isSupport ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-gray-200 text-gray-700 rounded-tl-none'}`}>
                                        {msg.attachmentUrl && (
                                            <div 
                                                onClick={() => window.open(msg.attachmentUrl, '_blank')}
                                                className={`flex items-center gap-2 p-2 mb-2 rounded-lg cursor-pointer transition-colors border w-full ${
                                                    isSupport 
                                                    ? 'bg-white/10 border-white/20 hover:bg-white/20 text-white' 
                                                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-700'
                                                }`}
                                            >
                                                <div className={`p-1.5 rounded-md ${isSupport ? 'bg-white/20' : 'bg-white border border-gray-200 shadow-sm'}`}>
                                                    <DescriptionIcon className="text-lg" />
                                                </div>
                                                <div className="flex flex-col overflow-hidden text-left">
                                                    <span className="text-xs font-bold truncate">Arquivo enviado</span>
                                                    <span className="text-[9px] opacity-80">Clique para abrir</span>
                                                </div>
                                            </div>
                                        )}
                                        <p>{msg.text}</p>
                                        <span className={`text-[10px] block mt-1 opacity-70 ${isSupport ? 'text-blue-100 text-right' : 'text-gray-400'}`}>
                                            {msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '...'}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                        
                        {/* User Typing Indicator in Admin Panel */}
                        {selectedTicket.isUserTyping && (
                            <div className="flex justify-start mb-2">
                                <div className="bg-white p-3 rounded-2xl rounded-tl-none flex items-center gap-1 w-fit shadow-sm border border-gray-200">
                                    <span className="text-xs font-bold text-gray-500 mr-2">Digitando</span>
                                    <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                                    <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                                    <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Reply Area */}
                    <div className="p-4 border-t border-gray-100 bg-white">
                        {/* Macros */}
                        <div className="flex gap-2 overflow-x-auto mb-3 pb-1 scrollbar-hide">
                            {MACROS.map((macro, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setReplyText(macro.text)}
                                    className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-full text-xs text-gray-600 whitespace-nowrap transition-colors"
                                >
                                    {macro.label}
                                </button>
                            ))}
                        </div>
                        <form onSubmit={handleSendMessage} className="relative flex items-end gap-2">
                            <button
                                type="button"
                                onClick={handleFileSelect}
                                disabled={isUploading}
                                className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-blue-600 rounded-xl bg-gray-50 border border-gray-200 hover:bg-blue-50 transition-colors flex-shrink-0"
                                title="Enviar print/arquivo"
                            >
                                {isUploading ? (
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                                ) : (
                                    <PaperClipIcon className="text-xl" />
                                )}
                            </button>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileUpload} 
                                className="hidden" 
                                accept="image/*,.pdf" 
                            />

                            <div className="relative flex-1">
                                <input 
                                    type="text" 
                                    value={replyText}
                                    onChange={handleInputChange}
                                    placeholder="Escreva uma resposta..."
                                    className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
                                />
                                <button 
                                    type="submit"
                                    disabled={(!replyText.trim() && !isUploading)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                                >
                                    <SendIcon className="text-sm" />
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                    <SupportAgentIcon className="text-6xl mb-4 opacity-20" />
                    <p className="font-medium">Selecione um ticket para iniciar o atendimento</p>
                </div>
            )}

            {/* RIGHT SIDEBAR: Details */}
            {selectedTicket && (
                <div className="w-1/4 min-w-[250px] border-l border-gray-200 bg-white flex flex-col p-5 overflow-y-auto">
                    <div className="mb-6">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Atribuir a</label>
                        <select 
                            value={selectedTicket.assignedTo || ''}
                            onChange={(e) => updateTicketField('assignedTo', e.target.value)}
                            className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="">Não atribuído</option>
                            {admins.map(admin => (
                                <option key={admin.uid} value={admin.uid}>{admin.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="mb-6">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Tags</label>
                        <div className="flex flex-wrap gap-2">
                            {TICKET_TAGS.map(tag => {
                                const isSelected = selectedTicket.tags?.includes(tag.value);
                                return (
                                    <button
                                        key={tag.value}
                                        onClick={() => {
                                            const currentTags = selectedTicket.tags || [];
                                            const newTags = isSelected 
                                                ? currentTags.filter(t => t !== tag.value)
                                                : [...currentTags, tag.value];
                                            updateTicketField('tags', newTags);
                                        }}
                                        className={`px-2 py-1 rounded-md text-xs font-medium border transition-all ${isSelected ? tag.color + ' border-transparent ring-1 ring-offset-1' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                                    >
                                        {tag.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2 flex items-center gap-1">
                            <DescriptionIcon className="text-sm" /> Nota Interna (Privado)
                        </label>
                        <textarea 
                            className="w-full flex-1 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-gray-700 resize-none focus:ring-2 focus:ring-yellow-400 outline-none placeholder-yellow-700/30"
                            placeholder="Escreva observações sobre o cliente ou problema..."
                            value={internalNote}
                            onChange={(e) => setInternalNote(e.target.value)}
                            onBlur={handleSaveNote}
                        />
                        <p className="text-[10px] text-gray-400 mt-2 text-right">Salvo automaticamente ao sair.</p>
                    </div>
                </div>
            )}
        </div>
    );
};
