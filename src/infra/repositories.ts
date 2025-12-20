import { db, Workspace, Member, Expense, defaultData } from "./db";
import { v4 as uuidv4 } from "uuid";

// Helper para asegurar que db.data esté inicializado
async function ensureData() {
  await db.read();
  if (!db.data) {
    db.data = JSON.parse(JSON.stringify(defaultData)); // Deep copy
    await db.write();
  }
  // Asegurar que todas las propiedades existan
  if (!db.data.workspaces) db.data.workspaces = [];
  if (!db.data.members) db.data.members = [];
  if (!db.data.expenses) db.data.expenses = [];
}

export class WorkspaceRepository {
  async findOrCreate(chatId: string, title: string | null): Promise<Workspace> {
    await ensureData();

    let workspace = db.data!.workspaces.find((w) => w.id === chatId);

    if (!workspace) {
      workspace = {
        id: chatId,
        title,
        createdAt: new Date().toISOString(),
      };
      db.data!.workspaces.push(workspace);
      await db.write();
    } else if (title && workspace.title !== title) {
      // Update title if provided and different
      workspace.title = title;
      await db.write();
    }

    return workspace;
  }

  async findById(id: string): Promise<Workspace | null> {
    await ensureData();
    if (!db.data || !db.data.workspaces) return null;
    return db.data.workspaces.find((w) => w.id === id) || null;
  }
}

export class MemberRepository {
  async findOrCreate(
    userId: string,
    username: string | null,
    firstName: string | null
  ): Promise<Member> {
    await ensureData();

    let member = db.data!.members.find((m) => m.id === userId);

    if (!member) {
      member = {
        id: userId,
        username,
        firstName,
      };
      db.data!.members.push(member);
      await db.write();
    } else {
      // Update username/firstName if changed (priorizar firstName si se proporciona)
      if (username !== null) member.username = username;
      if (firstName !== null) {
        member.firstName = firstName; // Actualizar nombre si se proporciona
      }
      await db.write();
    }

    return member;
  }

  async findById(id: string): Promise<Member | null> {
    await ensureData();
    if (!db.data || !db.data.members) return null;
    return db.data.members.find((m) => m.id === id) || null;
  }

  async findByWorkspace(workspaceId: string): Promise<Member[]> {
    await ensureData();
    if (!db.data || !db.data.members || !db.data.expenses) return [];
    // Get all members who have expenses in this workspace
    const expenseMemberIds = new Set(
      db
        .data!.expenses.filter((e) => e.workspaceId === workspaceId)
        .map((e) => e.paidBy)
    );

    return db.data!.members.filter((m) => expenseMemberIds.has(m.id));
  }
}

export class ExpenseRepository {
  async create(expense: Omit<Expense, "id">): Promise<Expense> {
    await ensureData();

    const newExpense: Expense = {
      ...expense,
      id: uuidv4(),
    };

    db.data!.expenses.push(newExpense);
    await db.write();

    return newExpense;
  }

  async findById(id: string): Promise<Expense | null> {
    await ensureData();
    if (!db.data || !db.data.expenses) return null;
    return db.data.expenses.find((e) => e.id === id) || null;
  }

  async findByWorkspace(workspaceId: string): Promise<Expense[]> {
    await ensureData();
    if (!db.data || !db.data.expenses) return [];
    return db.data.expenses.filter((e) => e.workspaceId === workspaceId);
  }

  async delete(id: string, workspaceId: string): Promise<boolean> {
    await ensureData();
    if (!db.data || !db.data.expenses) return false;

    const index = db.data.expenses.findIndex(
      (e) => e.id === id && e.workspaceId === workspaceId
    );

    if (index === -1) {
      return false;
    }

    db.data.expenses.splice(index, 1);
    await db.write();

    return true;
  }

  async findLastN(workspaceId: string, n: number): Promise<Expense[]> {
    await ensureData();
    if (!db.data || !db.data.expenses) return [];
    return db
      .data.expenses.filter((e) => e.workspaceId === workspaceId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, n);
  }
}