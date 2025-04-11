import "dotenv/config";
import { Telegraf } from "telegraf";
import {
  addExpense,
  addIncome,
  getAllData,
  getBalance,
  getMonthTransactions,
  initDB,
} from "./db";
import dayjs from "dayjs";
import { escapeMarkdown } from "./utils/escapeMarkdowns";
import { adviceGenerate } from "./ai";

// ⚠️ Usá tu token real en un archivo `.env` o directamente acá para pruebas
const bot = new Telegraf(process.env.BOT_TOKEN!);

bot.start(async (ctx) => {
  await initDB();
  await ctx.reply("👋 Hola! Bienvenido/a a tu asistente de gastos.");
  await ctx.reply("💰 Decime cuánto dinero tenés disponible para comenzar:");

  // Escuchamos el próximo mensaje del usuario como monto inicial
  bot.on("text", async (ctx2) => {
    const input = ctx2.message.text;
    const amount = parseFloat(input);

    if (isNaN(amount)) {
      await ctx2.reply(
        "❌ Eso no parece un número válido. Por favor, usá solo números."
      );
      return;
    }

    await addIncome(amount);
    const balance = await getBalance();
    await ctx2.reply(
      `✅ Registrado. Tu saldo inicial es de $${balance.toFixed(2)}.`
    );
  });
});
bot.command("gastar", async (ctx) => {
  await initDB();
  const text = ctx.message.text;

  // Sacamos el comando (/gastar Pizza 3000 → [Pizza, 3000])
  const parts = text.split(" ").slice(1);

  if (parts.length < 2) {
    await ctx.reply(
      "⚠️ Usá el formato: `/gastar motivo monto`\nEjemplo: `/gastar Pizza 3000`"
    );
    return;
  }

  const amount = parseFloat(parts[parts.length - 1]);
  if (isNaN(amount)) {
    await ctx.reply("❌ El monto debe ser un número válido.");
    return;
  }

  const description = parts.slice(0, -1).join(" ");
  await addExpense(description, amount);
  const balance = await getBalance();

  await ctx.reply(
    `💸 Gastaste $${amount.toFixed(
      2
    )} en "${description}".\n💰 Te queda $${balance.toFixed(2)}.`
  );
});

function escapeMarkdownV2(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, (match) => "\\" + match);
}

bot.command("resumen", async (ctx) => {
  const input = ctx.message.text.split(" ").slice(1);
  const now = dayjs();
  let month = now.format("MMMM");
  let year = now.format("YYYY");

  if (input.length >= 1) {
    month = input[0];
  }
  if (input.length === 2) {
    year = input[1];
  }

  const key = `${month}-${year}`.toLowerCase();
  const title = `${month} ${year}`.toUpperCase();

  const data = await getAllData();
  const monthData = data.months[key];

  if (!monthData || monthData.transactions.length === 0) {
    await ctx.reply(`📭 No hay movimientos registrados en ${title}.`);
    return;
  }

  const rows = monthData.transactions.map((t) => {
    const isIncome = t.amount > 0;
    const sign = isIncome ? "+" : "-";
    const emoji = isIncome ? "💸" : "💥";
    const date = dayjs(t.date).format("MM-DD");
    const desc = t.description.padEnd(20, " ").slice(0, 20);
    const amount = `${sign}$${Math.abs(t.amount).toFixed(2)}`.padStart(10, " ");

    return `${emoji} ${date} | ${desc} | ${amount}`;
  });

  const monthlyBalance = monthData.income - monthData.expenses;
  const saldo = `📌 *Saldo del mes:* $${monthlyBalance.toFixed(2)}`;
  const escapedSaldo = escapeMarkdownV2(saldo);
  const header = `📊 *Movimientos del mes ${escapeMarkdownV2(title)}*\n\`\`\``;
  const footer = `\`\`\``;
  const body = rows.map(escapeMarkdownV2).join("\n");

  const finalMessage = `${header}\nFecha | Descripción         | Importe\n-------------------------------------------\n${body}\n${footer}\n\n${escapedSaldo}`;

  await ctx.reply(finalMessage, { parse_mode: "MarkdownV2" });
});
bot.command("resumen_anual", async (ctx) => {
  const year = dayjs().year();
  const data = await getAllData();
  const months = Object.entries(data.months).filter(([key]) =>
    key.includes(year.toString())
  );

  if (months.length === 0) {
    await ctx.reply(`📭 No hay movimientos registrados en ${year}.`);
    return;
  }

  let totalIncome = 0;
  let totalExpenses = 0;

  const rows = months.map(([key, m]) => {
    const name = key.split("-")[0];
    totalIncome += m.income;
    totalExpenses += m.expenses;
    const balance = m.income - m.expenses;
    return `${name.padEnd(10)} | +$${m.income
      .toFixed(2)
      .padStart(8)} | -$${m.expenses.toFixed(2).padStart(8)} | Saldo: $${balance
      .toFixed(2)
      .padStart(8)}`;
  });

  const header = `📊 *Resumen anual ${year}*\n\`\`\``;
  const footer = `\`\`\``;
  const body = rows.map(escapeMarkdownV2).join("\n");

  const resumenFinal = `${header}\nMes        | Ingresos  | Egresos   | Saldo\n----------------------------------------------\n${body}\n${footer}\n\n${escapeMarkdownV2(
    `🧾 *Total Ingresos:* $${totalIncome.toFixed(2)}`
  )}\n${escapeMarkdownV2(
    `💸 *Total Egresos:* $${totalExpenses.toFixed(2)}`
  )}\n${escapeMarkdownV2(
    `💰 *Balance:* $${(totalIncome - totalExpenses).toFixed(2)}`
  )}`;

  await ctx.reply(resumenFinal, { parse_mode: "MarkdownV2" });
});

bot.command("ingresar", async (ctx) => {
  const input = ctx.message.text.split(" ").slice(1);

  const lastWord = input[input.length - 1];
  const amount = parseFloat(lastWord);

  if (isNaN(amount) || amount <= 0) {
    await ctx.reply(
      "❌ Tenés que terminar con un número positivo. Ejemplo: /ingresar Sueldo Abril 25000"
    );
    return;
  }

  const description = input.slice(0, -1).join(" ") || "Ingreso";

  await addIncome(amount, description);

  await ctx.reply(
    `✅ Ingreso registrado: $${amount.toFixed(
      2
    )} en concepto de "${description}" 💸.`
  );
});
bot.command("consejo_ia", async (ctx) => {
  const year = dayjs().year();
  const data = await getAllData();
  const months = Object.entries(data.months).filter(([key]) =>
    key.includes(year.toString())
  );

  if (months.length === 0) {
    await ctx.reply("📭 No hay datos financieros registrados este año.");
    return;
  }

  let totalIncome = 0;
  let totalExpenses = 0;
  const detalleMensual = months
    .map(([key, m]) => {
      const name = key.split("-")[0];
      totalIncome += m.income;
      totalExpenses += m.expenses;
      return `${name}: +$${m.income.toFixed(2)} / -$${m.expenses.toFixed(2)}`;
    })
    .join("\n");

  const consejo = await adviceGenerate({
    ingresos: totalIncome,
    egresos: totalExpenses,
    detalleMensual,
  });

  await ctx.replyWithMarkdownV2(
    escapeMarkdownV2(`🤖 Consejo financiero IA:\n\n${consejo}`)
  );
});

// Inicializar bot
bot.launch().then(() => {
  console.log("🤖 Bot corriendo...");
});

// Shutdown limpio
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
