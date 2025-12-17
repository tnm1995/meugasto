
import React, { useState } from 'react';
import { db } from '../services/firebaseService';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { User, SharedWallet, Omit } from '../types';
import { XMarkIcon, PlusIcon, GroupIcon, CheckCircleIcon, KeyIcon, WalletIcon } from './Icons';
import { useToast } from '../contexts/ToastContext';

interface SharedWalletManagerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
}

export const SharedWalletManager: React.FC<SharedWalletManagerProps> = ({ isOpen, onClose, currentUser }) => {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [walletName, setWalletName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { showToast } = useToast();

  const handleCreateWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletName.trim()) return;
    
    setIsProcessing(true);
    try {
      // Gera um código de convite amigável
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const walletData: Omit<SharedWallet, 'id'> = {
        name: walletName,
        ownerId: currentUser.uid,
        memberUids: [currentUser.uid],
        inviteCode: code,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'shared_wallets'), walletData);
      showToast(`Carteira "${walletName}" criada! Compartilhe o código: ${code}`, 'success');
      setWalletName('');
      onClose();
    } catch (error) {
      showToast('Erro ao criar carteira.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleJoinWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    setIsProcessing(true);
    try {
      const q = query(collection(db, 'shared_wallets'), where('inviteCode', '==', inviteCode.trim().toUpperCase()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        showToast('Código de convite inválido.', 'error');
        return;
      }

      const walletDoc = querySnapshot.docs[0];
      const walletData = walletDoc.data() as SharedWallet;

      if (walletData.memberUids.includes(currentUser.uid)) {
        showToast('Você já é membro desta carteira.', 'info');
        onClose();
        return;
      }

      await updateDoc(doc(db, 'shared_wallets', walletDoc.id), {
        memberUids: arrayUnion(currentUser.uid)
      });

      showToast(`Você entrou na carteira: ${walletData.name}`, 'success');
      setInviteCode('');
      onClose();
    } catch (error) {
      showToast('Erro ao entrar na carteira.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex justify-center items-center z-[100] p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-fade-in">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <GroupIcon className="text-blue-600" />
            Carteiras Coletivas
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors">
            <XMarkIcon className="text-2xl" />
          </button>
        </div>

        <div className="p-1 bg-gray-100 mx-6 mt-6 rounded-xl flex">
            <button 
                onClick={() => setActiveTab('create')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'create' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
            >
                Nova Carteira
            </button>
            <button 
                onClick={() => setActiveTab('join')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'join' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
            >
                Entrar com Código
            </button>
        </div>

        <div className="p-6">
            {activeTab === 'create' ? (
                <form onSubmit={handleCreateWallet} className="space-y-4">
                    <p className="text-sm text-gray-500 leading-relaxed">
                        Crie um espaço compartilhado para despesas da casa, viagens ou projetos em conjunto.
                    </p>
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Nome da Carteira</label>
                        <input 
                            type="text" 
                            placeholder="Ex: Nossa Casa, Viagem 2024..." 
                            className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            value={walletName}
                            onChange={e => setWalletName(e.target.value)}
                            required
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={isProcessing}
                        className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2 active:scale-95"
                    >
                        {isProcessing ? 'Criando...' : <><PlusIcon /> Criar Carteira</>}
                    </button>
                </form>
            ) : (
                <form onSubmit={handleJoinWallet} className="space-y-4">
                    <p className="text-sm text-gray-500 leading-relaxed">
                        Insira o código enviado pelo proprietário da carteira para participar.
                    </p>
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Código de Convite</label>
                        <div className="relative">
                            <KeyIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                                type="text" 
                                placeholder="ABCDEF" 
                                className="w-full p-3.5 pl-11 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono font-bold uppercase tracking-widest"
                                value={inviteCode}
                                onChange={e => setInviteCode(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    <button 
                        type="submit" 
                        disabled={isProcessing}
                        className="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-all shadow-lg flex items-center justify-center gap-2 active:scale-95"
                    >
                        {isProcessing ? 'Entrando...' : <><CheckCircleIcon /> Entrar na Carteira</>}
                    </button>
                </form>
            )}
        </div>

        <div className="p-4 bg-blue-50 text-[10px] text-blue-600 text-center font-medium border-t border-blue-100">
            Dica: Tudo o que for gasto nesta carteira será visível por todos os membros.
        </div>
      </div>
    </div>
  );
};
