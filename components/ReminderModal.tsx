
import React, { useState, useMemo, useEffect } from 'react';
import { XMarkIcon, TrashIcon, PlusIcon, CheckCircleIcon, NotificationsIcon, CalendarClockIcon } from './Icons';
import type { Reminder, Omit } from '../types';
import { useToast } from '../contexts/ToastContext';

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddReminder: (reminder: Omit<Reminder, 'id'>) => void;
  onDeleteReminder: (id: string) => void;
  reminders: Reminder[];
}

export const ReminderModal: React.FC<ReminderModalProps> = ({ isOpen, onClose, onAddReminder, onDeleteReminder, reminders }) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [frequency, setFrequency] = useState<'once' | 'monthly'>('once');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [notificationsAllowed, setNotificationsAllowed] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationsAllowed(Notification.permission === 'granted');
    }
  }, [isOpen]);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      showToast('Seu navegador não suporta notificações.', 'error');
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationsAllowed(permission === 'granted');
    if (permission === 'granted') {
      showToast('Notificações ativadas! Você será avisado no horário.', 'success');
      new Notification('MeuGasto', { body: 'As notificações estão funcionando!' });
    } else {
      showToast('Permissão negada. Não poderemos te avisar.', 'info');
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (title && date && time) {
        onAddReminder({ title, date, time, frequency });
        setTitle('');
        setDate('');
        setTime('');
        setFrequency('once');
        showToast('Lembrete agendado com sucesso!', 'success');
    }
  };

  const getUrgency = (dateStr: string, timeStr: string) => {
    const now = new Date();
    const reminderDate = new Date(`${dateStr}T${timeStr}:00`);
    
    // Zera os segundos/milisegundos para comparação justa de "Hoje"
    const today = new Date();
    today.setHours(0,0,0,0);
    const rDateOnly = new Date(reminderDate);
    rDateOnly.setHours(0,0,0,0);

    if (reminderDate < now) return 'overdue';
    if (rDateOnly.getTime() === today.getTime()) return 'today';
    return 'upcoming';
  };

  const sortedReminders = useMemo(() => {
    return [...reminders].sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}:00`);
      const dateB = new Date(`${b.date}T${b.time}:00`);
      return dateA.getTime() - dateB.getTime();
    });
  }, [reminders]);
  
  if (!isOpen) return null;

  const inputClasses = "w-full p-3 bg-white text-gray-900 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors duration-200 text-sm font-medium placeholder-gray-400";

  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
               <NotificationsIcon className="text-blue-600" />
               Lembretes
            </h2>
            <p className="text-xs text-gray-500">Não esqueça de pagar suas contas</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors" aria-label="Fechar">
            <XMarkIcon className="text-2xl" />
          </button>
        </div>
        
        {/* Form */}
        <div className="p-5 bg-gray-50/50 border-b border-gray-100">
            {!notificationsAllowed && (
                <div onClick={requestNotificationPermission} className="mb-4 bg-blue-50 border border-blue-100 text-blue-700 p-3 rounded-xl flex items-center gap-3 cursor-pointer hover:bg-blue-100 transition-colors">
                    <div className="bg-white p-1.5 rounded-full shadow-sm"><NotificationsIcon className="text-blue-600 text-sm" /></div>
                    <div className="flex-1">
                        <p className="text-xs font-bold">Ativar Notificações do Navegador</p>
                        <p className="text-[10px] opacity-80">Clique para receber alertas mesmo fora do app.</p>
                    </div>
                </div>
            )}

            <form onSubmit={handleAdd} className="space-y-3">
                <input 
                    type="text" 
                    placeholder="Ex: Pagar Cartão de Crédito..." 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={inputClasses}
                    required
                />
                <div className="grid grid-cols-2 gap-3">
                    <input 
                        type="date" 
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className={inputClasses}
                        required
                    />
                    <input 
                        type="time" 
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className={inputClasses}
                        required
                    />
                </div>
                <div className="flex items-center gap-2 px-1">
                    <input 
                        type="checkbox" 
                        id="monthlyFreq"
                        checked={frequency === 'monthly'}
                        onChange={(e) => setFrequency(e.target.checked ? 'monthly' : 'once')}
                        className="w-4 h-4 bg-white border-gray-300 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="monthlyFreq" className="text-xs text-gray-600 font-medium">
                        Repetir mensalmente (Apenas visual)
                    </label>
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3.5 px-4 rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-200">
                    <PlusIcon className="text-xl" />
                    Agendar Lembrete
                </button>
            </form>
        </div>

        {/* List */}
        <div className="p-4 overflow-y-auto flex-1 bg-gray-50">
            {sortedReminders.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-60 mt-4">
                    <CalendarClockIcon className="text-5xl mb-2" />
                    <p className="text-sm">Nenhum lembrete pendente.</p>
                </div>
            ) : (
                <ul className="space-y-2.5">
                    {sortedReminders.map(reminder => {
                        const urgency = getUrgency(reminder.date, reminder.time);
                        let badgeClass = "bg-gray-100 text-gray-500 border-gray-200";
                        let urgencyText = "Em breve";
                        
                        if (urgency === 'overdue') {
                            badgeClass = "bg-red-50 text-red-600 border-red-100";
                            urgencyText = "Atrasado";
                        } else if (urgency === 'today') {
                            badgeClass = "bg-green-50 text-green-600 border-green-100";
                            urgencyText = "Hoje";
                        }

                        return (
                            <li key={reminder.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col group hover:shadow-md transition-all">
                                <div className="flex justify-between items-start w-full">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeClass} uppercase tracking-wide`}>
                                                {urgencyText}
                                            </span>
                                            {reminder.frequency === 'monthly' && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-100 uppercase tracking-wide">
                                                    Mensal
                                                </span>
                                            )}
                                        </div>
                                        <p className={`font-bold text-base ${urgency === 'overdue' ? 'text-red-600' : 'text-gray-800'}`}>
                                            {reminder.title}
                                        </p>
                                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                            <span className="material-symbols-outlined text-sm">event</span>
                                            {new Date(reminder.date + 'T00:00:00').toLocaleDateString('pt-BR', {day:'2-digit', month:'short'})} 
                                            <span className="mx-1">•</span> 
                                            <span className="material-symbols-outlined text-sm">schedule</span>
                                            {reminder.time}
                                        </p>
                                    </div>
                                    
                                    {confirmDeleteId === reminder.id ? (
                                        <div className="flex flex-col gap-2 ml-2 animate-fade-in">
                                            <button 
                                                onClick={() => {
                                                    onDeleteReminder(reminder.id);
                                                    setConfirmDeleteId(null);
                                                    showToast('Lembrete concluído!', 'success');
                                                }}
                                                className="bg-green-500 text-white p-2 rounded-lg shadow-sm hover:bg-green-600 transition-colors"
                                                title="Confirmar Conclusão"
                                            >
                                                <CheckCircleIcon className="text-lg" />
                                            </button>
                                            <button 
                                                onClick={() => setConfirmDeleteId(null)}
                                                className="bg-gray-200 text-gray-600 p-2 rounded-lg hover:bg-gray-300 transition-colors"
                                                title="Cancelar"
                                            >
                                                <XMarkIcon className="text-lg" />
                                            </button>
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => setConfirmDeleteId(reminder.id)}
                                            className="text-gray-300 hover:text-green-600 p-2 rounded-xl hover:bg-green-50 transition-all ml-2"
                                            title="Concluir Lembrete"
                                        >
                                            <CheckCircleIcon className="text-2xl" />
                                        </button>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
      </div>
    </div>
  );
};
