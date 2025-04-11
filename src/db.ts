import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import { join } from "path";
import dayjs from "dayjs";

type Transaction = {
  date: string;
  description: string;
  amount: number;
};

type MonthlyData = {
  income: number;
  expenses: number;
  transactions: Transaction[];
};

type Data = {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  months: Record<string, MonthlyData>;
};
const defaultData = {
  totalIncome: 0,
  totalExpenses: 0,
  balance: 0,
  months: {},
};
const file = join(__dirname, "./data/db.json");
const adapter = new JSONFile<Data>(file);
const db = new Low<Data>(adapter, defaultData);

export async function initDB() {
  await db.read();
  db.data ||= defaultData;
  await db.write();
}

export async function addIncome(amount: number, description = "Ingreso") {
  await initDB();

  const now = dayjs();
  const key = now.format("MMMM-YYYY").toLowerCase();
  const date = now.format("YYYY-MM-DD");

  if (!db.data!.months[key]) {
    db.data!.months[key] = {
      income: 0,
      expenses: 0,
      transactions: [],
    };
  }

  db.data!.months[key].income += amount;
  db.data!.months[key].transactions.push({
    date,
    description,
    amount,
  });

  db.data!.totalIncome += amount;
  db.data!.balance += amount;

  await db.write();
}

export async function addExpense(description: string, amount: number) {
  await initDB();

  const now = dayjs();
  const key = now.format("MMMM-YYYY").toLowerCase();
  const date = now.format("YYYY-MM-DD");

  if (!db.data!.months[key]) {
    db.data!.months[key] = {
      income: 0,
      expenses: 0,
      transactions: [],
    };
  }

  db.data!.months[key].transactions.push({
    date,
    description,
    amount: amount * -1,
  });

  db.data!.months[key].expenses += amount;
  db.data!.totalExpenses += amount;
  db.data!.balance -= amount;

  await db.write();
}

export async function getBalance() {
  await initDB();
  return db.data!.balance;
}

export async function getMonthTransactions(key: string) {
  await initDB();
  return db.data!.months[key]?.transactions || [];
}

export async function getAllData() {
  await initDB();
  return db.data!;
}
