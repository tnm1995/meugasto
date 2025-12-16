
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
  
  // Chat Fields
  lastChatClearedAt?: any; // Timestamp do Firestore para limpeza de chat do usuário
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
  userLastActive?: any; // Timestamp do Heartbeat do usuário
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
      'Supermercado', 'Restaurante', 'Cafeteria', 'Delivery / Fast Food', 'Padaria', 'Açougue', 'Feira / Hortifruti', 'Conveniência', 'Mercearia', 'Outros - Alimentação'
    ],
    'Moradia': [
      'Aluguel / Financiamento', 'Condomínio', 'Contas (Água, Luz, Gás)', 'Internet / TV / Telefone', 'Manutenção / Reparos', 'Móveis / Decoração', 'IPTU', 'Seguro Residencial', 'Limpeza', 'Jardinagem', 'Consertos Domésticos', 'Outros - Moradia'
    ],
    'Transporte': [
      'Combustível', 'Transporte Público', 'Aplicativos (Uber, 99)', 'Manutenção do Veículo', 'Estacionamento', 'Pedágio', 'Seguro / IPVA', 'Multas', 'Lavagem', 'Táxi', 'Aluguel de Carro', 'Outros - Transporte'
    ],
    'Lazer': [
      'Cinema / Teatro / Shows', 'Streaming (Netflix, Spotify)', 'Bares / Festas', 'Passeios / Viagens', 'Livros / Revistas', 'Jogos', 'Hobbies', 'Parques', 'Eventos Esportivos', 'Shows / Festivais', 'Jantares Especiais', 'Baladas', 'Outros - Lazer'
    ],
    'Saúde': [
      'Farmácia / Medicamentos', 'Plano de Saúde', 'Consultas / Exames', 'Academia / Esportes', 'Terapia', 'Dentista', 'Óculos / Lentes', 'Massagem', 'Fisioterapia', 'Exames Laboratoriais', 'Outros - Saúde'
    ],
    'Cuidados Pessoais': [
      'Salão / Barbearia', 'Cosméticos / Perfumes', 'Massagens', 'Estética', 'Manicure / Pedicure', 'Produtos de Higiene', 'Outros - Cuidados Pessoais'
    ],
    'Vestuário': [
      'Roupas', 'Calçados', 'Acessórios', 'Lavanderia', 'Alfaiataria', 'Joias', 'Outros - Vestuário'
    ],
    'Educação': [
      'Cursos / Faculdade', 'Material Escolar', 'Livros Técnicos', 'Idiomas', 'Pós-Graduação', 'Workshops', 'Aulas Particulares', 'Outros - Educação'
    ],
    'Compras': [
      'Eletrônicos', 'Presentes', 'Casa / Jardim', 'Eletrodomésticos', 'Roupas de Cama / Banho', 'Brinquedos', 'Aparelhos Celulares', 'Computadores', 'Outros - Compras'
    ],
    'Serviços': [
      'Serviços Financeiros / Taxas', 'Assinaturas', 'Serviços Profissionais', 'Advogado', 'Contador', 'Consultoria', 'Limpeza Doméstica', 'Conserto de Eletrônicos', 'Outros - Serviços'
    ],
    'Impostos e Taxas': [
      'Imposto de Renda', 'IPVA', 'IPTU', 'Taxas Bancárias', 'Licenciamento de Veículo', 'Outros - Impostos e Taxas'
    ],
    'Investimentos': [
      'Ações', 'Fundos', 'Renda Fixa', 'Criptomoedas', 'Previdência Privada', 'Tesouro Direto', 'Outros - Investimentos'
    ],
    'Dívidas e Empréstimos': [
      'Empréstimo Pessoal', 'Financiamento de Carro', 'Financiamento Imobiliário', 'Cartão de Crédito (Pagamento Fatura)', 'Cheque Especial', 'Consórcio', 'Outros - Dívidas'
    ],
    'Outros': [
      'Doações', 'Pets', 'Despesa não categorizada', 'Diversos', 'Multas / Juros', 'Seguros (Outros)'
    ]
};

export const INCOME_CATEGORIES: Record<string, string[]> = {
    'Salário': ['Mensal', 'Adiantamento', '13º Salário', 'Férias'],
    'Empreendedorismo': ['Vendas de Produtos', 'Prestação de Serviços', 'Pró-labore', 'Lucros'],
    'Investimentos': ['Dividendos', 'Juros sobre Capital', 'Rendimento Poupança', 'Aluguéis (FIIs)', 'Criptomoedas'],
    'Extra': ['Freelance', 'Venda de Bens', 'Cashback', 'Reembolso', 'Presente'],
    'Outros': ['Outras Receitas']
};

// Mantém CATEGORIES apontando para despesas para compatibilidade, mas removemos Receitas de lá
export const CATEGORIES = EXPENSE_CATEGORIES;

export const PAYMENT_METHODS: string[] = [
  'Cartão de Crédito',
  'Cartão de Débito',
  'Dinheiro',
  'Pix',
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