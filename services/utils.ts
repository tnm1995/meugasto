
import type { Expense } from '../types';

export const getLocalStorageCompositeKey = (key: string, userIdentifier: string): string => {
  // Ensure userIdentifier is not empty or null/undefined, provide a fallback if necessary.
  // In MainAppContent, this hook is only called when userId is guaranteed.
  return `${userIdentifier}_${key}`;
};

// Define the Period type for consistency with Reports.tsx
type Period = 'this-month' | 'last-month' | 'last-7-days' | 'custom';

// Helper para pegar a data local no formato YYYY-MM-DD
// Isso corrige o problema de "quebra de ofensiva" por causa do fuso horário UTC
export const getLocalDate = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// New utility function to filter expenses by period
export const filterExpensesByPeriod = (
  expenses: Expense[],
  period: Period,
  customStartDate: string,
  customEndDate: string
): Expense[] => {
  let startDate: Date;
  let endDate: Date;
  const now = new Date();

  // Normalize `now` to the start of the current day to avoid time-of-day issues
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (period) {
    case 'this-month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of current month
      break;
    case 'last-month':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0); // Last day of previous month
      break;
    case 'last-7-days':
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 6); // 7 days including today
      endDate = today;
      break;
    case 'custom':
      // Ensure custom dates are valid, fall back to current date if not
      startDate = customStartDate ? new Date(customStartDate + 'T00:00:00') : new Date(0); // Epoch start if empty
      endDate = customEndDate ? new Date(customEndDate + 'T23:59:59') : new Date(); // End of today if empty
      break;
    default:
      // Default to this month if period is unknown
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      break;
  }

  return expenses.filter(expense => {
    const expenseDate = new Date(expense.purchaseDate + 'T00:00:00'); // Normalize expense date
    return expenseDate >= startDate && expenseDate <= endDate;
  });
};
