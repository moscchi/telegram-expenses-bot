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

  for (const expense of expenses) {
    if (expense.paidBy === memberA.id) {
      paidA += expense.amount;
    } else if (expense.paidBy === memberB.id) {
      paidB += expense.amount;
    }
  }

  const total = paidA + paidB;
  const share = total / 2;
  const balance = paidA - share; // Positivo = B debe a A, Negativo = A debe a B

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
