
export type View = 'dashboard' | 'entries' | 'reports' | 'profile' | 'goals' | 'admin';

export type UserRole = 'user' | 'admin' | 'super_admin' | 'operational_admin' | 'support_admin';

export type UserStatus = 'active' | 'blocked';

export interface ReminderSettings {
  email: boolean;
  push: boolean;
}

export interface User {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  cpf?: string; // Novo campo CPF
  profileImage: string;
  reminderSettings: ReminderSettings;
  role: UserRole;
  status: UserStatus;
  createdAt: string; // ISO string
  subscriptionExpiresAt: string | null; // ISO string YYYY-MM-DD
  xp?: number;
  currentStreak?: number;
  lastInteractionDate?: string;
  internalNotes?: string;
  scanCount?: number; // Controle de scans gratuitos (Limite: 3)
  lastPayment?: {
    date: string;
    amount: number;
    product?: string;
    provider?: string;
    transactionId?: string;
  };
  lastChatClearedAt?: any; // Timestamp or Date or serializable
  lastSeen?: any;
}

export interface Expense {
  id: string;
  localName: string;
  purchaseDate: string; // YYYY-MM-DD
  total: number;
  category: string;
  subcategory: string;
  isRecurring: boolean;
  paymentMethod: string;
  recurrenceFrequency?: 'daily' | 'weekly' | 'monthly' | 'annually';
  type?: 'expense' | 'income';
  items: { name: string; price: number }[];
}

export interface BankTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
}

export interface Reminder {
  id: string;
  title: string;
  date: string;
  time: string;
  frequency: 'once' | 'monthly';
}

export interface Goal {
  id: string;
  name: string;
  category: string;
  targetAmount: number;
  startDate: string;
  endDate: string;
}

export interface Budget {
  id: string;
  category: string;
  amount: number;
  startDate: string;
  endDate: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  color?: string;
}

export interface PricingSettings {
  monthlyPrice: number;
  annualPrice: number;
  monthlyLink?: string;
  annualLink?: string;
}

export interface AdminLog {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  details: string;
  targetUserId?: string | null;
  targetUserName?: string | null;
  timestamp: any;
}

export type TicketStatus = 'open' | 'in_progress' | 'resolved';
export type TicketTag = 'financeiro' | 'bug' | 'cancelamento' | 'duvida' | 'feature';

export interface Ticket {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  lastMessage: string;
  lastMessageSender: 'user' | 'support';
  updatedAt: any;
  status: TicketStatus;
  unreadCount: number;
  isUserTyping?: boolean;
  isSupportTyping?: boolean;
  tags?: TicketTag[];
  assignedTo?: string;
  internalNotes?: string;
  userLastActive?: any;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'support';
  timestamp: any;
  read: boolean;
  attachmentUrl?: string;
  attachmentType?: 'image' | 'file';
}

// Utility types
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

export type DocumentWithId<T> = T & { id: string };

// Constants

export const EXPENSE_CATEGORIES: Record<string, string[]> = {
  'Alimentação': [
    'Supermercado (Geral)', 'Restaurante / Almoço', 'Lanches / Fast Food', 'Padaria / Café', 
    'Açougue / Peixaria', 'Hortifruti / Feira', 'Bebidas', 'Delivery (iFood/Rappi)', 'Doces e Sobremesas'
  ],
  'Moradia': [
    'Aluguel / Condomínio', 'Energia Elétrica', 'Água e Esgoto', 'Gás', 'Internet / TV / Celular', 
    'Produtos de Limpeza', 'Manutenção e Reparos', 'Jardinagem / Plantas', 'Artigos para o Lar', 'IPTU'
  ],
  'Transporte': [
    'Combustível', 'Uber / 99 / Táxi', 'Transporte Público', 'Manutenção Veicular', 'Estacionamento', 
    'Pedágio', 'IPVA / Licenciamento', 'Seguro Auto'
  ],
  'Saúde e Higiene': [
    'Farmácia / Medicamentos', 'Higiene Pessoal', 'Cosméticos', 'Consultas Médicas', 'Exames', 
    'Plano de Saúde', 'Dentista', 'Academia / Esportes'
  ],
  'Lazer': [
    'Cinema / Teatro / Shows', 'Streaming', 'Bares e Baladas', 'Viagens', 'Jogos', 'Livros', 'Hobbies'
  ],
  'Educação': [
    'Mensalidade Escolar', 'Cursos', 'Material Escolar', 'Livros Técnicos'
  ],
  'Vestuário': [
    'Roupas', 'Calçados', 'Acessórios', 'Lavanderia'
  ],
  'Compras': [
    'Eletrônicos', 'Eletrodomésticos', 'Celulares', 'Presentes', 'Brinquedos'
  ],
  'Serviços': [
    'Assinaturas', 'Serviços Bancários', 'Cabeleireiro / Barbeiro', 'Manicure', 'Serviços Profissionais'
  ],
  'Pets': [
    'Ração e Petiscos', 'Veterinário', 'Banho e Tosa', 'Acessórios Pet'
  ],
  'Investimentos': [
    'Aporte Mensal', 'Previdência', 'Reserva de Emergência', 'Cripto'
  ],
  'Dívidas': [
    'Cartão de Crédito', 'Empréstimo', 'Financiamento'
  ],
  'Outros': [
    'Doações', 'Imprevistos', 'Saques', 'Não Identificado'
  ]
};

export const INCOME_CATEGORIES: Record<string, string[]> = {
    'Salário': ['Mensal', 'Adiantamento', '13º Salário', 'Férias', 'Bônus / PLR'],
    'Empreendimento': ['Vendas de Produtos', 'Prestação de Serviços', 'Pró-labore', 'Lucros / Dividendos'],
    'Investimentos': ['Dividendos / Juros', 'Aluguéis Recebidos', 'Renda Fixa (Resgate)', 'Venda de Ativos'],
    'Benefícios': ['Vale Alimentação/Refeição', 'Auxílio Transporte', 'Aposentadoria', 'Bolsas / Auxílios Governo'],
    'Outros': ['Presentes / Doações', 'Reembolsos', 'Venda de Bens Pessoais', 'Empréstimos Recebidos', 'Outros']
};

export const CATEGORIES = EXPENSE_CATEGORIES;

export const PAYMENT_METHODS = [
  'Cartão de Crédito',
  'Cartão de Débito',
  'Pix',
  'Dinheiro',
  'Transferência Bancária',
  'Boleto',
  'Vale Refeição/Alimentação',
  'Outro'
];

export const DEFAULT_PROFILE_IMAGE = "https://ui-avatars.com/api/?background=0D8ABC&color=fff&name=User";

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  email: true,
  push: true,
};

export const DEFAULT_PRICING: PricingSettings = {
  monthlyPrice: 0.00, // Grátis (Teste)
  annualPrice: 199.90,
  monthlyLink: 'https://pay.kirvano.com/b378387a-a4c5-418b-887d-7f5f295bb61c', 
  annualLink: 'https://pay.kirvano.com/88970249-3079-45df-8083-26c9fe4c704c'
};

export const ROLE_LABELS: Record<UserRole, string> = {
    user: 'Usuário',
    admin: 'Admin',
    super_admin: 'Super Admin',
    operational_admin: 'Operacional',
    support_admin: 'Suporte'
};

export interface LevelInfo {
    level: number;
    title: string;
    minXp: number;
    maxXp: number;
}

export const LEVELS: LevelInfo[] = [
    { level: 1, title: "Iniciante", minXp: 0, maxXp: 100 },
    { level: 2, title: "Organizado", minXp: 101, maxXp: 500 },
    { level: 3, title: "Poupador", minXp: 501, maxXp: 1500 },
    { level: 4, title: "Investidor", minXp: 1501, maxXp: 3000 },
    { level: 5, title: "Mestre", minXp: 3001, maxXp: 6000 },
    { level: 6, title: "Magnata", minXp: 6001, maxXp: Infinity }
];

export const getLevelInfo = (xp: number): LevelInfo => {
    return LEVELS.find(l => xp >= l.minXp && xp <= l.maxXp) || LEVELS[LEVELS.length - 1];
};
