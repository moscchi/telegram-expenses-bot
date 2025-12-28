import { Expense } from "../infra/db";
import { Member } from "../infra/db";

export type BalanceResult = {
  memberA: Member;
  memberB: Member;
  paidA: number; // en centavos
  paidB: number; // en centavos
  total: number; // en centavos
  share: number; // en centavos
  balance: number; // en centavos (positivo = B debe a A, negativo = A debe a B)
  warning?: string; // si hay más de 2 miembros
};

/**
 * Calcula el balance 50/50 para dos miembros en un conjunto de gastos
 */
export function computeBalance(
  expenses: Expense[],
  members: Member[]
): BalanceResult | null {
  if (expenses.length === 0) {
    return null;
  }

  if (members.length === 0) {
    return null;
  }

  // MVP: usar los primeros 2 miembros activos
  const memberA = members[0];
  const memberB = members.length > 1 ? members[1] : memberA; // Si solo hay 1, usar el mismo

  let paidA = 0;
  let paidB = 0;
  let debtPaymentsA = 0; // Pagos de deuda que A hizo a B
  let debtPaymentsB = 0; // Pagos de deuda que B hizo a A

  for (const expense of expenses) {
    if (expense.type === "debt_payment") {
      // Los pagos de deuda reducen la deuda del que paga
      if (expense.paidBy === memberA.id) {
        debtPaymentsA += expense.amount; // A pagó deuda a B
      } else if (expense.paidBy === memberB.id) {
        debtPaymentsB += expense.amount; // B pagó deuda a A
      }
    } else {
      // Gastos normales
      if (expense.paidBy === memberA.id) {
        paidA += expense.amount;
      } else if (expense.paidBy === memberB.id) {
        paidB += expense.amount;
      }
    }
  }

  const total = paidA + paidB;
  const share = total / 2;
  let balance = paidA - share; // Balance base

  // Ajustar por pagos de deuda
  // Si A pagó deuda a B, reduce lo que B debe a A
  balance -= debtPaymentsA;
  // Si B pagó deuda a A, aumenta lo que B debe a A (o reduce lo que A debe a B)
  balance += debtPaymentsB;

  const result: BalanceResult = {
    memberA,
    memberB,
    paidA,
    paidB,
    total,
    share,
    balance,
  };

  // Warning si hay más de 2 miembros
  if (members.length > 2) {
    result.warning = `⚠️ Este workspace tiene más de 2 miembros (${members.length}). El balance MVP asume solo los primeros 2 miembros activos.`;
  }

  return result;
}
