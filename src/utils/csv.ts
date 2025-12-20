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
  const headers = [
    "ID",
    "Fecha",
    "Monto (ARS)",
    "Categoría",
    "Descripción",
    "Pagado por",
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
      expense.id.slice(0, 6),
      date,
      amount.replace(/\./g, "").replace(",", "."), // Formato numérico para Excel
      escapeCSV(expense.category),
      escapeCSV(expense.description),
      escapeCSV(memberName),
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}
