import { Expense } from "../infra/db";
import { formatMoney } from "./money";
import { formatDate } from "../domain/time";

/**
 * Genera contenido CSV de gastos
 */
export function generateCSV(
  expenses: Expense[],
  members: Map<string, { username: string | null; firstName: string | null }>
): string {
  // Headers
  // Y actualizar headers:
  const headers = [
    "ID",
    "Fecha",
    "Monto (ARS)",
    "Categoría",
    "Descripción",
    "Pagado por",
    "Tipo",
  ];

  // Filas
  const rows = expenses.map((expense) => {
    const member = members.get(expense.paidBy) || {
      username: null,
      firstName: null,
    };
    const memberName = member.username
      ? `@${member.username}`
      : member.firstName || "Usuario";

    const amount = formatMoney(expense.amount);
    const date = formatDate(expense.date);

    // Escapar comillas y comas en CSV
    const escapeCSV = (str: string) => {
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    return [
      expense.id, // ID completo en lugar de slice(0, 6)
      date,
      amount.replace(/\./g, "").replace(",", "."),
      escapeCSV(expense.category),
      escapeCSV(expense.description),
      escapeCSV(memberName),
      expense.type === "debt_payment" ? "Pago de deuda" : "Gasto", // Nueva columna
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}
