import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";

export type Workspace = {
  id: string;
  title: string | null;
  createdAt: string;
};

export type Member = {
  id: string;
  username: string | null;
  firstName: string | null;
};

export type Expense = {
  id: string;
  workspaceId: string;
  amount: number; // stored as cents
  currency: string;
  description: string;
  category: string;
  paidBy: string; // memberId
  date: string; // ISO string
  createdAt: string;
  createdBy: string; // memberId
};

type Data = {
  workspaces: Workspace[];
  members: Member[];
  expenses: Expense[];
};

export const defaultData: Data = {
  workspaces: [],
  members: [],
  expenses: [],
};

// Asegurar que el directorio data existe
const dataDir = join(__dirname, "../data");
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const file = join(dataDir, "db.json");
const adapter = new JSONFile<Data>(file);
export const db = new Low<Data>(adapter, defaultData);

export async function initDB() {
  try {
    await db.read();
    db.data ||= defaultData;
    await db.write();
  } catch (error) {
    console.error("Error al inicializar DB:", error);
    throw error;
  }
}
