
// Adicionado Omit para ser usado em toda a aplicação
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

export interface ExpenseItem {
  name: string;
  price: number;
}

export interface Expense {
  id: string; // Firebase document ID
  localName: string;
  purchaseDate: string; // YYYY-MM-DD
  items: ExpenseItem[];
  total: number;
  category: string;
  subcategory: string;
  isRecurring: boolean; // Novo campo para despesa recorrente
  recurrenceFrequency?: 'daily' | 'weekly' | 'monthly' | 'annually'; // Frequência, se recorrente
  paymentMethod: string; // Novo campo para forma de pagamento
  type: 'expense' | 'income'; // Novo campo para distinguir Receita de Despesa
}

// Updated UserRole hierarchy
export type UserRole = 'super_admin' | 'operational_admin' | 'support_admin' | 'admin' | 'user'; 
// 'admin' mantido para compatibilidade com dados legados

export type UserStatus = 'active' | 'blocked';

export interface User {
  uid: string; // Firebase User ID
  name: string;
  email: string;
  phone?: string;
  profileImage?: string; // Para armazenar no documento do usuário
  reminderSettings?: ReminderSettings; // Mantido para compatibilidade, mas deprecated
  role?: UserRole; // Nível de acesso
  status?: UserStatus; // Status da conta
  subscriptionExpiresAt?: string | null; // Data de expiração do acesso (YYYY-MM-DD)
  createdAt?: string; // Data de criação da conta
  // Gamification Fields
  xp?: number;
  currentStreak?: number; // Dias consecutivos de uso
  lastInteractionDate?: string; // YYYY-MM-DD da última vez que ganhou XP/Logou
  
  // Admin Fields
  internalNotes?: string; // Notas internas do admin sobre o usuário
  lastPayment?: {
    date: string;
    amount: number;
    provider: string;
    transactionId: string;
    product: string;
  };
  
  // Chat & Presence Fields
  lastChatClearedAt?: any; // Timestamp do Firestore para limpeza de chat do usuário
  lastSeen?: any; // Timestamp do Firestore da última vez que o app esteve aberto (Heartbeat)
}

// Interface para Logs de Auditoria do Admin
export interface AdminLog {
  id: string;
  adminId: string;
  adminName: string;
  targetUserId?: string; // Opcional, pois pode ser uma ação de sistema (ex: mudar preços)
  targetUserName?: string;
  action: string; // "Upgrade Manual", "Bloqueio", "Alteração de Preço"
  details: string; // "Mudou plano de user X para Vitalício"
  timestamp: any; // Firestore Timestamp
}

export interface Budget {
  id: string; // Firebase document ID
  category: string;
  amount: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

// Renomeado conceptualmente para "Orçamento de Categoria" na UI, mas mantemos a interface Goal para compatibilidade legacy se necessário, 
// ou usamos Budget para orçamentos e SavingsGoal para metas de economia.
// O código existente usa 'Goal' para o que agora chamamos de 'Orçamento'. 
export interface Goal {
  id: string; // Firebase document ID
  name: string; // "Gastos com Lazer"
  category: string; // "Lazer"
  targetAmount: number; // 500 (Limite)
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

// NOVA INTERFACE: Metas de Economia (Sonhos/Objetivos)
export interface SavingsGoal {
  id: string;
  name: string; // "Viagem para Disney"
  targetAmount: number; // 10000
  currentAmount: number; // 2500
  deadline: string; // YYYY-MM-DD
  color?: string; // Para UI
  icon?: string; // Para UI
}

// Nova interface para Lembretes Personalizados
export interface Reminder {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  frequency?: 'once' | 'monthly'; // Adicionado frequência
}

// Interface para Mensagens do Chat de Suporte
export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'support' | 'system';
  timestamp: any; // Firestore Timestamp
  read: boolean;
  attachmentUrl?: string; // URL da imagem/arquivo
  attachmentType?: 'image' | 'file'; // Tipo do anexo
}

// --- TIPOS DO SISTEMA DE TICKETS ---
export type TicketStatus = 'open' | 'in_progress' | 'resolved';
export type TicketTag = 'financeiro' | 'bug' | 'cancelamento' | 'duvida' | 'feature';

export interface Ticket {
  id: string; // Geralmente o UID do usuário para simplificar 1 ticket ativo por usuário, ou UUID
  userId: string;
  userName: string;
  userEmail: string;
  status: TicketStatus;
  lastMessage: string;
  lastMessageSender: 'user' | 'support' | 'system';
  updatedAt: any; // Timestamp da última interação
  unreadCount: number; // Para o admin
  
  // Admin only fields
  assignedTo?: string; // UID do admin responsável
  tags?: TicketTag[];
  internalNotes?: string; // Bloco de notas do suporte
  
  // Typing Indicators & Presence
  isUserTyping?: boolean;
  isSupportTyping?: boolean;
  userLastActive?: any; // Mantido para compatibilidade com lógica antiga de chat, mas preferir user.lastSeen
}

export interface ReminderSettings {
  isEnabled: boolean;
  time: string; // HH:MM
}

// Nova interface para Configurações de Preço do Sistema
export interface PricingSettings {
  monthlyPrice: number;
  annualPrice: number;
}

export type View = 'dashboard' | 'entries' | 'reports' | 'profile' | 'goals' | 'admin';

export const EXPENSE_CATEGORIES: Record<string, string[]> = {
    'Alimentação': [
      'Supermercado (Geral)', 'Restaurante / Almoço', 'Lanches / Fast Food', 'Padaria / Café', 'Açougue / Peixaria', 'Hortifruti', 'Bebidas (Não Alcoólicas)', 'Bebidas Alcoólicas', 'Delivery (iFood/Rappi)', 'Doces e Sobremesas'
    ],
    'Moradia': [
      'Aluguel / Condomínio', 'Energia Elétrica', 'Água e Esgoto', 'Gás', 'Internet / TV / Celular', 'Manutenção e Reparos', 'Produtos de Limpeza', 'Artigos para o Lar', 'IPTU / Seguros', 'Decoração'
    ],
    'Transporte': [
      'Combustível (Gasolina/Etanol)', 'Uber / 99 / Táxi', 'Transporte Público (Ônibus/Metrô)', 'Manutenção Veicular', 'Estacionamento', 'Pedágio', 'IPVA / Licenciamento', 'Seguro Auto', 'Multas', 'Lavagem Automotiva'
    ],
    'Saúde e Higiene': [
      'Farmácia / Medicamentos', 'Higiene Pessoal (Shampoo/Sabonete)', 'Cosméticos / Maquiagem', 'Consultas Médicas', 'Exames', 'Plano de Saúde', 'Dentista', 'Terapia / Psicólogo', 'Academia / Esportes', 'Suplementos'
    ],
    'Lazer e Entretenimento': [
      'Cinema / Teatro / Shows', 'Streaming (Netflix, Spotify, etc)', 'Bares e Baladas', 'Viagens e Passeios', 'Jogos / Videogames', 'Livros e Revistas', 'Hobbies', 'Restaurante (Jantar/Especial)', 'Ingressos'
    ],
    'Educação': [
      'Mensalidade Escolar/Faculdade', 'Cursos Livres / Idiomas', 'Material Escolar / Papelaria', 'Livros Técnicos', 'Uniformes'
    ],
    'Vestuário': [
      'Roupas', 'Calçados', 'Acessórios (Bolsas/Cintos)', 'Joias e Relógios', 'Lavanderia / Costureira'
    ],
    'Compras e Eletrônicos': [
      'Eletrônicos / Gadgets', 'Eletrodomésticos', 'Celulares e Acessórios', 'Presentes', 'Brinquedos'
    ],
    'Serviços e Taxas': [
      'Assinaturas Online', 'Serviços Bancários / Tarifas', 'Cabeleireiro / Barbeiro', 'Manicure / Estética', 'Serviços Profissionais (Contador/Advogado)', 'Taxas Governamentais'
    ],
    'Pets': [
      'Ração e Petiscos', 'Veterinário / Vacinas', 'Banho e Tosa', 'Acessórios e Brinquedos', 'Medicamentos Pet'
    ],
    'Investimentos': [
      'Aporte Mensal', 'Previdência Privada', 'Reserva de Emergência', 'Criptomoedas'
    ],
    'Dívidas e Crédito': [
      'Pagamento de Cartão de Crédito', 'Empréstimo Pessoal', 'Financiamento', 'Cheque Especial', 'Negociação de Dívidas'
    ],
    'Outros': [
      'Doações / Caridade', 'Imprevistos', 'Saques em Dinheiro', 'Não Identificado'
    ]
};

export const INCOME_CATEGORIES: Record<string, string[]> = {
    'Salário': ['Mensal', 'Adiantamento (Vale)', '13º Salário', 'Férias', 'Bônus / PLR'],
    'Empreendedorismo': ['Vendas de Produtos', 'Prestação de Serviços', 'Pró-labore', 'Lucros Distribuidos'],
    'Renda Passiva': ['Dividendos / Juros', 'Aluguéis (Imóveis/FIIs)', 'Rendimento Poupança/CDB'],
    'Renda Extra': ['Freelance / Bicos', 'Venda de Bens Usados', 'Cashback', 'Reembolso', 'Presentes em Dinheiro'],
    'Outros': ['Outras Receitas']
};

// Mantém CATEGORIES apontando para despesas para compatibilidade, mas removemos Receitas de lá
export const CATEGORIES = EXPENSE_CATEGORIES;

export const PAYMENT_METHODS: string[] = [
  'Cartão de Crédito',
  'Cartão de Débito',
  'Dinheiro',
  'Pix',
  'Vale Refeição/Alimentação',
  'Boleto',
  'Transferência Bancária',
  'Outro'
];

// Interface para transações extraídas de extratos bancários
export interface BankTransaction {
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT'; // Para diferenciar despesas de receitas
}

// Utility type for Firestore documents that include an 'id' field
export type DocumentWithId<T> = T & { id: string };

// Default values for user settings, moved here to be shared across the app
export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  isEnabled: false,
  time: '20:00',
};
export const DEFAULT_PROFILE_IMAGE = 'https://gravatar.com/avatar/?d=mp'; // Gravatar default image
// Preços padrão caso não haja nada no banco
export const DEFAULT_PRICING: PricingSettings = {
  monthlyPrice: 24.90,
  annualPrice: 149.88
};

// --- GAMIFICATION HELPERS ---

export interface LevelInfo {
    level: number;
    title: string;
    minXp: number;
    maxXp: number;
    iconColor: string;
}

export const LEVELS: LevelInfo[] = [
    { level: 1, title: 'Novato Financeiro', minXp: 0, maxXp: 500, iconColor: 'text-gray-500' },
    { level: 2, title: 'Aprendiz da Economia', minXp: 501, maxXp: 1200, iconColor: 'text-green-500' },
    { level: 3, title: 'Organizado', minXp: 1201, maxXp: 2500, iconColor: 'text-blue-500' },
    { level: 4, title: 'Estrategista', minXp: 2501, maxXp: 5000, iconColor: 'text-purple-500' },
    { level: 5, title: 'Mestre das Finanças', minXp: 5001, maxXp: 10000, iconColor: 'text-yellow-500' },
    { level: 6, title: 'Magnata', minXp: 10001, maxXp: Infinity, iconColor: 'text-indigo-500' },
];

export const getLevelInfo = (xp: number = 0): LevelInfo => {
    return LEVELS.find(l => xp >= l.minXp && xp <= l.maxXp) || LEVELS[LEVELS.length - 1];
};

// Helper para labels de roles
export const ROLE_LABELS: Record<UserRole, string> = {
    'super_admin': 'Super Admin',
    'admin': 'Super Admin (Legado)',
    'operational_admin': 'Admin Operacional',
    'support_admin': 'Admin Suporte',
    'user': 'Usuário'
};
