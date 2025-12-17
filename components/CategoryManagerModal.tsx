
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Category, Omit } from '../types';
import { XMarkIcon, PlusIcon, TrashIcon, EditIcon, CheckIcon } from './Icons';
import { useToast } from '../contexts/ToastContext';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onSaveCategory: (cat: Omit<Category, 'id'>, id?: string) => Promise<string | null | boolean>;
  onDeleteCategory: (id: string) => Promise<boolean>;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({ 
    isOpen, 
    onClose, 
    categories, 
    onSaveCategory, 
    onDeleteCategory 
}) => {
    const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
    const [editingCatId, setEditingCatId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [subcategories, setSubcategories] = useState<string[]>([]);
    const [newSubName, setNewSubName] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const { showToast } = useToast();

    const filteredCats = categories.filter(c => c.type === activeTab);

    const resetForm = () => {
        setEditingCatId(null);
        setName('');
        setSubcategories(['Geral']);
        setNewSubName('');
    };

    const handleEdit = (cat: Category) => {
        setEditingCatId(cat.id);
        setName(cat.name);
        setSubcategories([...cat.subcategories]);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleAddSub = () => {
        if (!newSubName.trim()) return;
        if (subcategories.includes(newSubName.trim())) {
            showToast('Subcategoria já existe.', 'info');
            return;
        }
        setSubcategories([...subcategories, newSubName.trim()]);
        setNewSubName('');
    };

    const handleRemoveSub = (index: number) => {
        if (subcategories.length <= 1) {
            showToast('A categoria deve ter pelo menos uma subcategoria.', 'info');
            return;
        }
        setSubcategories(subcategories.filter((_, i) => i !== index));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || subcategories.length === 0) {
            showToast('Preencha o nome e adicione subcategorias.', 'error');
            return;
        }

        setIsSaving(true);
        const payload: Omit<Category, 'id'> = {
            name: name.trim(),
            type: activeTab,
            subcategories: subcategories
        };

        const success = await onSaveCategory(payload, editingCatId || undefined);
        if (success) {
            showToast(`Categoria ${editingCatId ? 'atualizada' : 'criada'}!`, 'success');
            resetForm();
        }
        setIsSaving(false);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir esta categoria? Lançamentos existentes nela não serão apagados, mas poderão ficar sem categoria definida.')) {
            const success = await onDeleteCategory(id);
            if (success) showToast('Categoria excluída.', 'success');
        }
    };

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex justify-center items-center z-[9999] p-4 animate-fade-in" role="dialog">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Minhas Categorias</h2>
                        <p className="text-xs text-gray-500">Personalize como você organiza seus gastos</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 w-10 h-10 rounded-full hover:bg-gray-100 transition-colors flex items-center justify-center">
                        <XMarkIcon className="text-2xl" />
                    </button>
                </div>

                <div className="flex bg-gray-100 p-1 mx-6 mt-4 rounded-2xl shadow-inner shrink-0">
                    <button onClick={() => {setActiveTab('expense'); resetForm();}} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'expense' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>Despesas</button>
                    <button onClick={() => {setActiveTab('income'); resetForm();}} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'income' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500'}`}>Receitas</button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                    {/* FORMULÁRIO DE ADIÇÃO/EDIÇÃO */}
                    <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 mb-8">
                        <h3 className="text-sm font-bold text-blue-900 mb-4 flex items-center gap-2">
                            {editingCatId ? <EditIcon className="text-sm"/> : <PlusIcon className="text-sm"/>}
                            {editingCatId ? 'Editar Categoria' : 'Nova Categoria'}
                        </h3>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block ml-1 mb-1.5">Nome da Categoria</label>
                                <input 
                                    type="text" 
                                    value={name} 
                                    onChange={e => setName(e.target.value)} 
                                    placeholder="Ex: Assinaturas, Mercado, Freelance..."
                                    className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block ml-1 mb-1.5">Subcategorias</label>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {subcategories.map((sub, idx) => (
                                        <span key={idx} className="bg-white border border-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm animate-fade-in">
                                            {sub}
                                            <button type="button" onClick={() => handleRemoveSub(idx)} className="text-gray-300 hover:text-red-500 transition-colors">
                                                <XMarkIcon className="text-sm" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={newSubName} 
                                        onChange={e => setNewSubName(e.target.value)} 
                                        placeholder="Nova subcategoria..."
                                        className="flex-1 p-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddSub())}
                                    />
                                    <button type="button" onClick={handleAddSub} className="bg-white border border-blue-200 text-blue-600 p-2.5 rounded-xl hover:bg-blue-50 transition-colors shadow-sm">
                                        <PlusIcon />
                                    </button>
                                </div>
                            </div>

                            <div className="pt-2 flex gap-2">
                                <button type="submit" disabled={isSaving} className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-all shadow-md active:scale-95 disabled:bg-blue-300 flex items-center justify-center gap-2">
                                    {isSaving ? <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span> : <CheckIcon />}
                                    Salvar Alterações
                                </button>
                                {editingCatId && (
                                    <button type="button" onClick={resetForm} className="px-5 bg-gray-200 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-300 transition-colors">Cancelar</button>
                                )}
                            </div>
                        </form>
                    </div>

                    {/* LISTA DE CATEGORIAS EXISTENTES */}
                    <div>
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 ml-1">Categorias de {activeTab === 'expense' ? 'Despesa' : 'Receita'}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {filteredCats.length === 0 ? (
                                <p className="text-gray-400 text-sm col-span-2 text-center py-8 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">Nenhuma categoria personalizada.</p>
                            ) : (
                                filteredCats.map(cat => (
                                    <div key={cat.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow group">
                                        <div>
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-bold text-gray-800">{cat.name}</h4>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleEdit(cat)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"><EditIcon className="text-sm"/></button>
                                                    <button onClick={() => handleDelete(cat.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><TrashIcon className="text-sm"/></button>
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tight mb-2">{cat.subcategories.length} subcategorias</p>
                                            <div className="flex flex-wrap gap-1">
                                                {cat.subcategories.slice(0, 4).map((s, i) => (
                                                    <span key={i} className="text-[9px] bg-gray-50 text-gray-500 px-2 py-0.5 rounded border border-gray-100">{s}</span>
                                                ))}
                                                {cat.subcategories.length > 4 && <span className="text-[9px] text-gray-400 px-1">+{cat.subcategories.length - 4}</span>}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};
