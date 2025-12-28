import {
  WorkspaceRepository,
  MemberRepository,
  ExpenseRepository,
} from "../infra/repositories";
import { parseMoney, formatMoney } from "../utils/money";
import { inferCategory, isValidCategory } from "../domain/categories";
import { Expense, Member } from "../infra/db";
import { getCurrentMonthRange, getMonthRange, getYearMonthRanges, isDateInRange, formatDate } from "../domain/time";
import { computeBalance, BalanceResult } from "../domain/balance";

export class ExpenseService {
  constructor(
    private workspaceRepo: WorkspaceRepository,
    private memberRepo: MemberRepository,
    private expenseRepo: ExpenseRepository
  ) {}

  async addExpense(
    chatId: string,
    chatTitle: string | null,
    userId: string,
    username: string | null,
    firstName: string | null,
    amountInput: string,
    description: string,
    categoryOverride: string | null
  ): Promise<Expense> {
    // Parse amount to cents
    const amountCents = parseMoney(amountInput);
    
    // Ensure workspace exists
    const workspace = await this.workspaceRepo.findOrCreate(chatId, chatTitle);
    
    // Ensure member exists
    const member = await this.memberRepo.findOrCreate(userId, username, firstName);
    
    // Determine category
    let category: string;
    if (categoryOverride) {
      if (!isValidCategory(categoryOverride)) {
        throw new Error(`Categoría inválida: ${categoryOverride}`);
      }
      category = categoryOverride;
    } else {
      category = inferCategory(description);
    }
    
    // Create expense
    const expense = await this.expenseRepo.create({
      workspaceId: workspace.id,
      amount: amountCents,
      currency: "ARS",
      description,
      category,
      paidBy: member.id,
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      createdBy: member.id,
      type: "expense", // Por defecto es un gasto
    });
    
    return expense;
  }
  
  formatExpense(expense: Expense, member: { username: string | null; firstName: string | null }): string {
    const amount = formatMoney(expense.amount);
    const memberName = member.username 
      ? `@${member.username}` 
      : member.firstName || "Usuario";
    const date = formatDate(expense.date);
    
    return `#${expense.id.slice(0, 6)} ${amount} ARS — ${expense.category} — "${expense.description}" — pagado por ${memberName} — ${date}`;
  }

  /**
   * Obtiene el total gastado en un mes específico
   * @param workspaceId ID del workspace
   * @param monthInput Formato opcional: "YYYY-MM" o "MM" (default: mes actual)
   */
  async getMonthTotal(workspaceId: string, monthInput?: string): Promise<{ total: number; monthName: string }> {
    const { start, end, monthName } = getMonthRange(monthInput);
    const expenses = await this.expenseRepo.findByWorkspace(workspaceId);
    
    const monthExpenses = expenses.filter((e) =>
      isDateInRange(e.date, start, end)
    );
    
    const total = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
    return { total, monthName };
  }

  /**
   * Obtiene resumen por categoría de un mes específico
   * @param workspaceId ID del workspace
   * @param monthInput Formato opcional: "YYYY-MM" o "MM" (default: mes actual)
   */
  async getMonthSummary(workspaceId: string, monthInput?: string): Promise<{ summary: Map<string, number>; monthName: string }> {
    const { start, end, monthName } = getMonthRange(monthInput);
    const expenses = await this.expenseRepo.findByWorkspace(workspaceId);
    
    const monthExpenses = expenses.filter((e) =>
      isDateInRange(e.date, start, end)
    );
    
    const summary = new Map<string, number>();
    for (const expense of monthExpenses) {
      const current = summary.get(expense.category) || 0;
      summary.set(expense.category, current + expense.amount);
    }
    
    return { summary, monthName };
  }

  /**
   * Calcula el balance 50/50 del mes actual
   */
  async getBalance(workspaceId: string): Promise<BalanceResult | null> {
    const { start, end } = getCurrentMonthRange();
    const expenses = await this.expenseRepo.findByWorkspace(workspaceId);
    
    const monthExpenses = expenses.filter((e) =>
      isDateInRange(e.date, start, end)
    );
    
    const members = await this.memberRepo.findByWorkspace(workspaceId);
    
    return computeBalance(monthExpenses, members);
  }

  /**
   * Obtiene los últimos N gastos
   */
  async getLastExpenses(workspaceId: string, n: number): Promise<Expense[]> {
    return this.expenseRepo.findLastN(workspaceId, n);
  }

  /**
   * Elimina un gasto
   */
  async deleteExpense(expenseId: string, workspaceId: string): Promise<boolean> {
    return this.expenseRepo.delete(expenseId, workspaceId);
  }

  /**
   * Obtiene resumen mes a mes de un año
   * @param workspaceId ID del workspace
   * @param yearInput Año (YYYY) o undefined para año actual
   */
  async getYearSummary(workspaceId: string, yearInput?: string | number): Promise<Array<{
    monthName: string;
    monthNumber: number;
    total: number;
    year: number;
  }>> {
    const ranges = getYearMonthRanges(yearInput);
    const expenses = await this.expenseRepo.findByWorkspace(workspaceId);
    
    return ranges.map((range) => {
      const monthExpenses = expenses.filter((e) =>
        isDateInRange(e.date, range.start, range.end)
      );
      
      const total = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
      
      return {
        monthName: range.monthName,
        monthNumber: range.monthNumber,
        total,
        year: range.year,
      };
    });
  }

  /**
   * Obtiene los gastos de un mes específico para exportar
   * @param workspaceId ID del workspace
   * @param monthInput Formato opcional: "YYYY-MM" o "MM" (default: mes actual)
   */
  async getMonthExpenses(workspaceId: string, monthInput?: string): Promise<{ expenses: Expense[]; monthName: string }> {
    const { start, end, monthName } = getMonthRange(monthInput);
    const allExpenses = await this.expenseRepo.findByWorkspace(workspaceId);
    
    const monthExpenses = allExpenses
      .filter((e) => isDateInRange(e.date, start, end))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    return { expenses: monthExpenses, monthName };
  }
  /**
   * Busca gastos por descripción
   * @param workspaceId ID del workspace
   * @param searchTerm Término de búsqueda
   * @param monthInput Formato opcional: "YYYY-MM" o "MM" (default: mes actual)
   */
  async findExpensesByDescription(
    workspaceId: string,
    searchTerm: string,
    monthInput?: string
  ): Promise<{ expenses: Expense[]; monthName: string }> {
    const expenses = await this.expenseRepo.findByDescription(workspaceId, searchTerm, monthInput);
    const monthName = monthInput 
      ? (await import("../domain/time.js")).getMonthRange(monthInput).monthName
      : new Date().toLocaleDateString("es-AR", { month: "long", year: "numeric" });
    
    return { expenses, monthName };
  }

  /**
   * Actualiza el monto de un gasto
   * @param expenseId ID del gasto
   * @param workspaceId ID del workspace
   * @param newAmountInput Nuevo monto en formato "12500" o "12500.50"
   */
  async updateExpenseAmount(
    expenseId: string,
    workspaceId: string,
    newAmountInput: string
  ): Promise<Expense> {
    const newAmountCents = parseMoney(newAmountInput);
    const updated = await this.expenseRepo.updateAmount(expenseId, workspaceId, newAmountCents);
    
    if (!updated) {
      throw new Error("Gasto no encontrado o no pertenece a este workspace");
    }
    
    return updated;
  }

  /**
   * Registra un pago de deuda
   * @param chatId ID del chat
   * @param chatTitle Título del chat
   * @param userId ID del usuario
   * @param username Nombre de usuario
   * @param firstName Nombre del usuario
   * @param amountInput Monto en formato "12500" o "12500.50"
   * @param description Descripción del pago de deuda
   */
  async addDebtPayment(
    chatId: string,
    chatTitle: string | null,
    userId: string,
    username: string | null,
    firstName: string | null,
    amountInput: string,
    description: string
  ): Promise<Expense> {
    const amountCents = parseMoney(amountInput);
    const workspace = await this.workspaceRepo.findOrCreate(chatId, chatTitle);
    const member = await this.memberRepo.findOrCreate(userId, username, firstName);
    
    const expense = await this.expenseRepo.create({
      workspaceId: workspace.id,
      amount: amountCents,
      currency: "ARS",
      description: description || "Pago de deuda",
      category: "otros",
      paidBy: member.id,
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      createdBy: member.id,
      type: "debt_payment", // Marcar como pago de deuda
    });
    
    return expense;
  }

  /**
   * Formatea expense con ID completo
   * @param expense Expense
   * @param member Usuario
   * @returns Formato del gasto con ID completo
   */
  formatExpenseWithFullId(expense: Expense, member: { username: string | null; firstName: string | null }): string {
    const amount = formatMoney(expense.amount);
    const memberName = member.username 
      ? `@${member.username}` 
      : member.firstName || "Usuario";
    const date = formatDate(expense.date);
    const typeLabel = expense.type === "debt_payment" ? " [PAGO DEUDA]" : "";
    
    return `ID: <code>${expense.id}</code>\n${amount} ARS — ${expense.category} — "${expense.description}"${typeLabel} — pagado por ${memberName} — ${date}`;
  }
}