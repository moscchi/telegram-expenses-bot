import { Telegraf, Context } from "telegraf";
import { ExpenseService } from "../app/expenseService";
import {
  WorkspaceRepository,
  MemberRepository,
  ExpenseRepository,
} from "../infra/repositories";
import { parseGastoCommand } from "../utils/text";
import { formatMoney } from "../utils/money";
import { isUserAllowed } from "../utils/whitelist";

// Initialize services
const workspaceRepo = new WorkspaceRepository();
const memberRepo = new MemberRepository();
const expenseRepo = new ExpenseRepository();
const expenseService = new ExpenseService(
  workspaceRepo,
  memberRepo,
  expenseRepo
);

// Map para trackear usuarios que están esperando ingresar su nombre
const waitingForName = new Map<number, boolean>();

/**
 * Middleware para verificar whitelist
 * Debe ejecutarse ANTES de todos los comandos
 */
function whitelistMiddleware(ctx: Context, next: () => Promise<void>) {
  if (!ctx.from) {
    return Promise.resolve(); // Dejar pasar si no hay usuario (puede ser un update de otro tipo)
  }

  const userId = ctx.from.id;

  if (!isUserAllowed(userId)) {
    // Usuario no autorizado
    ctx
      .reply(
        "🔒 Lo siento, no tenés acceso a este bot.\n\n" +
          "Este bot es privado y solo está disponible para usuarios autorizados."
      )
      .catch(console.error);
    return Promise.resolve(); // No llamar next(), detener el procesamiento
  }

  return next(); // Usuario autorizado, continuar
}

export function registerCommands(bot: Telegraf) {
  // IMPORTANTE: Registrar comandos ANTES del middleware de texto

  // Aplicar middleware
  bot.use(whitelistMiddleware);

  bot.command("start", async (ctx: Context) => {
    try {
      if (!ctx.from) {
        await ctx.reply("❌ Error: no se pudo identificar al usuario");
        return;
      }

      const userId = String(ctx.from.id);
      const username = ctx.from.username || null;
      const firstName = ctx.from.first_name || null;

      // Verificar si el usuario ya existe
      const existingMember = await memberRepo.findById(userId);

      if (!existingMember) {
        // Usuario nuevo: pedir nombre
        waitingForName.set(ctx.from.id, true);

        const welcomeText = `
👋 <b>¡Bienvenido/a!</b>

Parece que es tu primera vez aquí. Para personalizar tu experiencia, ¿cómo te gustaría que te llame?

Por favor, escribí tu nombre (o el apodo que prefieras):
        `.trim();

        await ctx.reply(welcomeText, { parse_mode: "HTML" });
        return;
      }

      // Usuario existente: mostrar bienvenida normal
      const memberName =
        existingMember.firstName || existingMember.username || "Usuario";
      const helpText = `
        👋 <b>¡Hola ${memberName}!</b>
        
        Bienvenido/a de vuelta al bot de gastos compartidos.
        
        <b>Comandos disponibles:</b>
        /g &lt;monto&gt; &lt;descripción&gt; - Registrar un gasto
        /g &lt;monto&gt; [categoría] &lt;descripción&gt; - Registrar con categoría
        /pago &lt;monto&gt; &lt;descripción&gt; - Registrar pago de deuda
        /month [YYYY-MM] - Total del mes
        /summary [YYYY-MM] - Resumen por categoría
        /balance - Ver quién debe a quién (considera pagos)
        /year [YYYY] - Resumen anual mes a mes
        /find &lt;término&gt; [YYYY-MM] - Buscar gastos
        /last [n] - Últimos N gastos (con IDs completos)
        /edit &lt;id&gt; &lt;monto&gt; - Editar monto
        /del &lt;id&gt; - Eliminar un gasto
        /csv [YYYY-MM] - Exportar gastos a CSV
        /help - Ver ayuda completa
        
        <b>Ejemplos:</b>
        /g 12500 vino luigi bosca
        /g 8300 [super] coto compras
        /pago 5000 Ana me pagó
        /month 2025-12
        /find vino
        /balance
        /csv
              `.trim();

      await ctx.reply(helpText, { parse_mode: "HTML" });
    } catch (error) {
      console.error("Error en /start:", error);
      await ctx.reply("❌ Error al procesar el comando");
    }
  });

  bot.command("help", async (ctx: Context) => {
    const helpText = `
<b>📋 Comandos disponibles:</b>

<b>💰 Registrar gastos:</b>
/g &lt;monto&gt; &lt;descripción&gt;
/g &lt;monto&gt; [categoría] &lt;descripción&gt;
Ejemplo: /g 12500 vino malbec
Ejemplo: /g 8300 [super] coto compras

<b>💸 Pagos de deuda:</b>
/pago &lt;monto&gt; &lt;descripción&gt; - Registrar pago de deuda
Ejemplo: /pago 5000 Ana me pagó

<b>📊 Consultas del mes:</b>
/month [YYYY-MM] - Total del mes
/summary [YYYY-MM] - Resumen por categoría
/balance - Balance 50/50 (considera pagos de deuda)
Ejemplo: /month 2025-11
Ejemplo: /summary 12

<b>📅 Consultas anuales:</b>
/year [YYYY] - Resumen mes a mes del año
Ejemplo: /year 2025

<b>🔍 Búsqueda:</b>
/find &lt;término&gt; [YYYY-MM] - Buscar gastos por descripción
Ejemplo: /find vino
Ejemplo: /find pizza 2025-12

<b>📋 Listado y gestión:</b>
/last [n] - Últimos N gastos con IDs completos (default: 5)
/del &lt;id&gt; - Eliminar gasto por ID completo
/edit &lt;id&gt; &lt;monto&gt; - Editar monto de un gasto
Ejemplo: /last 10
Ejemplo: /del abc123-def456-ghi789
Ejemplo: /edit abc123-def456-ghi789 15000

<b>💾 Exportar:</b>
/csv [YYYY-MM] - Exportar gastos del mes a CSV (con IDs completos)
Ejemplo: /csv 2025-12
Ejemplo: /csv (mes actual)

<b>ℹ️ Ayuda:</b>
/start - Iniciar bot y ver bienvenida
/help - Ver esta ayuda

<b>💡 Notas:</b>
• Los parámetros entre [ ] son opcionales
• Formato de fecha: YYYY-MM (ej: 2025-12)
• Las categorías se infieren automáticamente o podés usar [categoría]
• Categorías disponibles: vinos, super, delivery, salidas, hogar, otros
• Los pagos de deuda (/pago) se consideran en el cálculo de /balance
• Todos los comandos muestran IDs completos para facilitar edición/eliminación
    `.trim();

    await ctx.reply(helpText, { parse_mode: "HTML" });
  });

  bot.command("g", async (ctx: Context) => {
    try {
      // Cancelar modo "waiting for name" si está activo
      if (ctx.from) {
        waitingForName.delete(ctx.from.id);
      }

      if (!ctx.message || !("text" in ctx.message)) {
        await ctx.reply("❌ Error: mensaje inválido");
        return;
      }

      const text = ctx.message.text;
      const { amount, category, description } = parseGastoCommand(text);

      // Get chat and user info
      const chatId = String(ctx.chat?.id || 0);
      const chatTitle = "title" in ctx.chat! ? ctx.chat.title || null : null;
      const userId = String(ctx.from?.id || 0);
      const username = ctx.from?.username || null;
      const firstName = ctx.from?.first_name || null;

      // Add expense
      const expense = await expenseService.addExpense(
        chatId,
        chatTitle,
        userId,
        username,
        firstName,
        amount,
        description,
        category
      );

      // Get member for formatting
      const member = await memberRepo.findById(expense.paidBy);
      const memberInfo = member || { username, firstName };

      // Format response
      const amountFormatted = formatMoney(expense.amount);
      const categoryText = category
        ? ` (categoría: ${category})`
        : ` (categoría inferida: ${expense.category})`;

      await ctx.reply(
        `✅ Gasto registrado:\n\n${expenseService.formatExpense(
          expense,
          memberInfo
        )}\n\nTotal: ${amountFormatted} ARS${categoryText}`,
        { parse_mode: "HTML" }
      );
    } catch (error) {
      console.error("Error en /g:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Error desconocido al registrar el gasto";
      await ctx.reply(`❌ ${errorMessage}`);
    }
  });

  bot.command("month", async (ctx: Context) => {
    try {
      const chatId = String(ctx.chat?.id || 0);

      // Parsear argumento opcional [YYYY-MM o MM]
      const args =
        ctx.message && "text" in ctx.message
          ? ctx.message.text.split(/\s+/).slice(1)
          : [];

      const monthInput = args.length > 0 ? args[0] : undefined;

      const { total, monthName } = await expenseService.getMonthTotal(
        chatId,
        monthInput
      );
      const totalFormatted = formatMoney(total);

      await ctx.reply(
        `📅 <b>Total del mes: ${monthName}</b>\n\n` +
          `💰 <b>${totalFormatted} ARS</b>\n\n` +
          `<i>Usá /month YYYY-MM para ver otro mes (ej: /month 2025-11)</i>`,
        { parse_mode: "HTML" }
      );
    } catch (error) {
      console.error("Error en /month:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Error al obtener el total del mes";
      await ctx.reply(
        `❌ ${errorMessage}\n\nEjemplo: /month 2025-12 o /month 12`
      );
    }
  });
  bot.command("csv", async (ctx: Context) => {
    try {
      const chatId = String(ctx.chat?.id || 0);

      // Parsear argumento opcional [YYYY-MM]
      const args =
        ctx.message && "text" in ctx.message
          ? ctx.message.text.split(/\s+/).slice(1)
          : [];

      const monthInput = args.length > 0 ? args[0] : undefined;

      const { expenses, monthName } = await expenseService.getMonthExpenses(
        chatId,
        monthInput
      );

      if (expenses.length === 0) {
        await ctx.reply(
          `📭 No hay gastos registrados en ${monthName} para exportar.`
        );
        return;
      }

      // Obtener información de miembros
      const membersMap = new Map<
        string,
        { username: string | null; firstName: string | null }
      >();
      for (const expense of expenses) {
        if (!membersMap.has(expense.paidBy)) {
          const member = await memberRepo.findById(expense.paidBy);
          membersMap.set(
            expense.paidBy,
            member || { username: null, firstName: null }
          );
        }
      }

      // Generar CSV
      const { generateCSV } = await import("../utils/csv");
      const csvContent = generateCSV(expenses, membersMap);

      // Crear archivo temporal
      const fs = await import("fs");
      const path = await import("path");
      const os = await import("os");

      const filename = `gastos_${monthName.replace(/\s+/g, "_")}.csv`;
      const filepath = path.join(os.tmpdir(), filename);

      fs.writeFileSync(filepath, csvContent, "utf-8");

      // Enviar archivo
      await ctx.replyWithDocument(
        {
          source: filepath,
          filename: filename,
        },
        {
          caption: `📊 Exportación CSV - ${monthName}\n\nTotal de gastos: ${expenses.length}`,
        }
      );

      // Limpiar archivo temporal
      fs.unlinkSync(filepath);
    } catch (error) {
      console.error("Error en /csv:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Error al generar el CSV";
      await ctx.reply(`❌ ${errorMessage}\n\nEjemplo: /csv 2025-12 o /csv`);
    }
  });
  bot.command("summary", async (ctx: Context) => {
    try {
      const chatId = String(ctx.chat?.id || 0);

      // Parsear argumento opcional [YYYY-MM o MM]
      const args =
        ctx.message && "text" in ctx.message
          ? ctx.message.text.split(/\s+/).slice(1)
          : [];

      const monthInput = args.length > 0 ? args[0] : undefined;

      const { summary, monthName } = await expenseService.getMonthSummary(
        chatId,
        monthInput
      );

      if (summary.size === 0) {
        await ctx.reply(`📭 No hay gastos registrados en ${monthName}.`);
        return;
      }

      // Calcular total para porcentajes
      const total = Array.from(summary.values()).reduce(
        (sum, val) => sum + val,
        0
      );

      // Ordenar por monto descendente
      const sorted = Array.from(summary.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([category, amount]) => ({
          category,
          amount,
          percentage: (amount / total) * 100,
        }));

      let message = `📊 <b>Resumen por categoría - ${monthName}</b>\n\n`;

      for (const item of sorted) {
        const amountFormatted = formatMoney(item.amount);
        message += `• <b>${
          item.category
        }</b>: ${amountFormatted} ARS (${item.percentage.toFixed(1)}%)\n`;
      }

      message += `\n💰 <b>Total: ${formatMoney(total)} ARS</b>\n\n`;
      message += `<i>Usá /summary YYYY-MM para ver otro mes (ej: /summary 2025-11)</i>`;

      await ctx.reply(message, { parse_mode: "HTML" });
    } catch (error) {
      console.error("Error en /summary:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Error al obtener el resumen";
      await ctx.reply(
        `❌ ${errorMessage}\n\nEjemplo: /summary 2025-12 o /summary 12`
      );
    }
  });

  bot.command("year", async (ctx: Context) => {
    try {
      const chatId = String(ctx.chat?.id || 0);

      // Parsear argumento opcional [YYYY]
      const args =
        ctx.message && "text" in ctx.message
          ? ctx.message.text.split(/\s+/).slice(1)
          : [];

      const yearInput = args.length > 0 ? args[0] : undefined;

      const yearSummary = await expenseService.getYearSummary(
        chatId,
        yearInput
      );

      // Filtrar solo meses con gastos
      const monthsWithExpenses = yearSummary.filter((m) => m.total > 0);

      if (monthsWithExpenses.length === 0) {
        const year = yearInput || new Date().getFullYear();
        await ctx.reply(`📭 No hay gastos registrados en ${year}.`);
        return;
      }

      // Calcular total del año
      const yearTotal = yearSummary.reduce((sum, m) => sum + m.total, 0);

      // Ordenar por mes
      const sorted = monthsWithExpenses.sort(
        (a, b) => a.monthNumber - b.monthNumber
      );

      const year = yearSummary[0].year;
      let message = `📅 <b>Resumen anual ${year}</b>\n\n`;

      for (const month of sorted) {
        const amountFormatted = formatMoney(month.total);
        const percentage = (month.total / yearTotal) * 100;
        message += `• <b>${
          month.monthName
        }</b>: ${amountFormatted} ARS (${percentage.toFixed(1)}%)\n`;
      }

      message += `\n💰 <b>Total del año: ${formatMoney(yearTotal)} ARS</b>\n\n`;
      message += `<i>Usá /year YYYY para ver otro año (ej: /year 2024)</i>`;

      await ctx.reply(message, { parse_mode: "HTML" });
    } catch (error) {
      console.error("Error en /year:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Error al obtener el resumen anual";
      await ctx.reply(`❌ ${errorMessage}\n\nEjemplo: /year 2025`);
    }
  });

  bot.command("balance", async (ctx: Context) => {
    try {
      const chatId = String(ctx.chat?.id || 0);
      const balance = await expenseService.getBalance(chatId);

      if (!balance) {
        const monthName = new Date().toLocaleDateString("es-AR", {
          month: "long",
          year: "numeric",
        });
        await ctx.reply(
          `📭 No hay gastos registrados en ${monthName} para calcular el balance.`
        );
        return;
      }

      const memberAName =
        balance.memberA.firstName || balance.memberA.username || "Usuario A";
      const memberBName =
        balance.memberB.firstName || balance.memberB.username || "Usuario B";

      const paidAFormatted = formatMoney(balance.paidA);
      const paidBFormatted = formatMoney(balance.paidB);
      const totalFormatted = formatMoney(balance.total);
      const shareFormatted = formatMoney(balance.share);

      const monthName = new Date().toLocaleDateString("es-AR", {
        month: "long",
        year: "numeric",
      });
      let message = `⚖️ <b>Balance ${monthName}</b>\n\n`;

      if (balance.warning) {
        message += `${balance.warning}\n\n`;
      }

      message += `<b>Gastos:</b>\n`;
      message += `• ${memberAName}: ${paidAFormatted} ARS\n`;
      message += `• ${memberBName}: ${paidBFormatted} ARS\n`;
      message += `\n💰 Total: ${totalFormatted} ARS\n`;
      message += `📊 Cuota por persona: ${shareFormatted} ARS\n\n`;

      if (Math.abs(balance.balance) < 1) {
        // Balance perfecto (menos de 1 centavo de diferencia)
        message += `✅ <b>Balance equilibrado</b>`;
      } else if (balance.balance > 0) {
        // B debe a A
        const amountFormatted = formatMoney(balance.balance);
        message += `💸 <b>${memberBName} debe ${amountFormatted} ARS a ${memberAName}</b>`;
      } else {
        // A debe a B
        const amountFormatted = formatMoney(Math.abs(balance.balance));
        message += `💸 <b>${memberAName} debe ${amountFormatted} ARS a ${memberBName}</b>`;
      }

      await ctx.reply(message, { parse_mode: "HTML" });
    } catch (error) {
      console.error("Error en /balance:", error);
      await ctx.reply("❌ Error al calcular el balance");
    }
  });

  bot.command("last", async (ctx: Context) => {
    try {
      const chatId = String(ctx.chat?.id || 0);

      // Parsear argumento opcional [n]
      const args =
        ctx.message && "text" in ctx.message
          ? ctx.message.text.split(/\s+/).slice(1)
          : [];

      const n =
        args.length > 0 && !isNaN(Number(args[0]))
          ? Math.max(1, Math.min(50, Number(args[0]))) // Limitar entre 1 y 50
          : 5; // Default 5

      const expenses = await expenseService.getLastExpenses(chatId, n);

      if (expenses.length === 0) {
        await ctx.reply("📭 No hay gastos registrados.");
        return;
      }

      let message = `📋 <b>Últimos ${expenses.length} gasto${
        expenses.length > 1 ? "s" : ""
      }</b>\n\n`;

      // En el comando /last, cambiar formatExpense por formatExpenseWithFullId:

      for (const expense of expenses) {
        const member = await memberRepo.findById(expense.paidBy);
        const memberInfo = member || { username: null, firstName: null };
        message += `${expenseService.formatExpenseWithFullId(
          expense,
          memberInfo
        )}\n\n`;
      }

      await ctx.reply(message, { parse_mode: "HTML" });
    } catch (error) {
      console.error("Error en /last:", error);
      await ctx.reply("❌ Error al obtener los últimos gastos");
    }
  });

  bot.command("del", async (ctx: Context) => {
    try {
      const chatId = String(ctx.chat?.id || 0);

      // Parsear ID del gasto
      const args =
        ctx.message && "text" in ctx.message
          ? ctx.message.text.split(/\s+/).slice(1)
          : [];

      if (args.length === 0) {
        await ctx.reply(
          "❌ Debes proporcionar el ID del gasto a eliminar.\nEjemplo: /del abc123"
        );
        return;
      }

      const expenseId = args[0].trim();

      // Buscar el gasto primero para verificar que existe
      const expense = await expenseRepo.findById(expenseId);

      if (!expense) {
        await ctx.reply(`❌ No se encontró un gasto con ID: ${expenseId}`);
        return;
      }

      // Verificar que el gasto pertenece al workspace actual
      if (expense.workspaceId !== chatId) {
        await ctx.reply("❌ No puedes eliminar gastos de otro workspace.");
        return;
      }

      // Eliminar
      const deleted = await expenseService.deleteExpense(expenseId, chatId);

      if (deleted) {
        const amountFormatted = formatMoney(expense.amount);
        await ctx.reply(
          `✅ Gasto eliminado:\n\n` +
            `#${expense.id.slice(0, 6)} ${amountFormatted} ARS — ${
              expense.category
            } — "${expense.description}"`
        );
      } else {
        await ctx.reply("❌ Error al eliminar el gasto");
      }
    } catch (error) {
      console.error("Error en /del:", error);
      await ctx.reply("❌ Error al eliminar el gasto");
    }
  });
  bot.command("find", async (ctx: Context) => {
    try {
      const chatId = String(ctx.chat?.id || 0);

      const args =
        ctx.message && "text" in ctx.message
          ? ctx.message.text.split(/\s+/).slice(1)
          : [];

      if (args.length === 0) {
        await ctx.reply(
          "❌ Debes proporcionar un término de búsqueda.\nEjemplo: /find vino"
        );
        return;
      }

      let searchTerm = args.slice(0, -1).join(" "); // Todo excepto el último
      const lastArg = args[args.length - 1];

      // Verificar si el último argumento es una fecha (YYYY-MM o MM)
      let monthInput: string | undefined;
      if (/^\d{4}-\d{2}$/.test(lastArg) || /^\d{1,2}$/.test(lastArg)) {
        monthInput = lastArg;
      } else {
        // Si no es fecha, incluir en el término de búsqueda
        searchTerm = args.join(" ");
      }

      const { expenses, monthName } =
        await expenseService.findExpensesByDescription(
          chatId,
          searchTerm,
          monthInput
        );

      if (expenses.length === 0) {
        await ctx.reply(
          `📭 No se encontraron gastos con "${searchTerm}"${
            monthInput ? ` en ${monthName}` : ""
          }.`
        );
        return;
      }

      let message = `🔍 <b>Búsqueda: "${searchTerm}"</b>\n`;
      if (monthInput) {
        message += `📅 Mes: ${monthName}\n`;
      }
      message += `\nEncontrados: ${expenses.length} gasto${
        expenses.length > 1 ? "s" : ""
      }\n\n`;

      for (const expense of expenses) {
        const member = await memberRepo.findById(expense.paidBy);
        const memberInfo = member || { username: null, firstName: null };
        message += `${expenseService.formatExpenseWithFullId(
          expense,
          memberInfo
        )}\n\n`;
      }

      await ctx.reply(message, { parse_mode: "HTML" });
    } catch (error) {
      console.error("Error en /find:", error);
      await ctx.reply("❌ Error al buscar gastos");
    }
  });

  bot.command("edit", async (ctx: Context) => {
    try {
      const chatId = String(ctx.chat?.id || 0);

      const args =
        ctx.message && "text" in ctx.message
          ? ctx.message.text.split(/\s+/).slice(1)
          : [];

      if (args.length < 2) {
        await ctx.reply(
          "❌ Debes proporcionar el ID y el nuevo monto.\nEjemplo: /edit abc123 15000"
        );
        return;
      }

      const expenseId = args[0].trim();
      const newAmount = args.slice(1).join(" "); // Puede tener espacios si es "12.500,50"

      const updated = await expenseService.updateExpenseAmount(
        expenseId,
        chatId,
        newAmount
      );

      const member = await memberRepo.findById(updated.paidBy);
      const memberInfo = member || { username: null, firstName: null };
      const amountFormatted = formatMoney(updated.amount);

      await ctx.reply(
        `✅ Gasto actualizado:\n\n${expenseService.formatExpenseWithFullId(
          updated,
          memberInfo
        )}\n\nNuevo monto: ${amountFormatted} ARS`,
        { parse_mode: "HTML" }
      );
    } catch (error) {
      console.error("Error en /edit:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Error al actualizar el gasto";
      await ctx.reply(`❌ ${errorMessage}`);
    }
  });

  bot.command("pago", async (ctx: Context) => {
    try {
      if (!ctx.message || !("text" in ctx.message)) {
        await ctx.reply("❌ Error: mensaje inválido");
        return;
      }

      const text = ctx.message.text;
      const args = text
        .replace(/^\/pago\s+/, "")
        .trim()
        .split(/\s+/);

      if (args.length < 2) {
        await ctx.reply(
          "❌ Debes proporcionar monto y descripción.\nEjemplo: /pago 5000 Ana me pagó"
        );
        return;
      }

      const amount = args[0];
      const description = args.slice(1).join(" ");

      const chatId = String(ctx.chat?.id || 0);
      const chatTitle = "title" in ctx.chat! ? ctx.chat.title || null : null;
      const userId = String(ctx.from?.id || 0);
      const username = ctx.from?.username || null;
      const firstName = ctx.from?.first_name || null;

      const expense = await expenseService.addDebtPayment(
        chatId,
        chatTitle,
        userId,
        username,
        firstName,
        amount,
        description
      );

      const member = await memberRepo.findById(expense.paidBy);
      const memberInfo = member || { username, firstName };
      const amountFormatted = formatMoney(expense.amount);

      await ctx.reply(
        `✅ Pago de deuda registrado:\n\n${expenseService.formatExpenseWithFullId(
          expense,
          memberInfo
        )}\n\nMonto: ${amountFormatted} ARS\n\nEste pago se considerará en el cálculo de /balance`,
        { parse_mode: "HTML" }
      );
    } catch (error) {
      console.error("Error en /pago:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Error al registrar el pago";
      await ctx.reply(`❌ ${errorMessage}`);
    }
  });
  // Middleware para capturar el nombre cuando el usuario está en modo "waiting for name"
  // IMPORTANTE: Este debe ir DESPUÉS de los comandos para no interferir
  bot.on("text", async (ctx: Context) => {
    // Solo procesar si el usuario está esperando ingresar su nombre
    if (!ctx.from || !waitingForName.get(ctx.from.id)) {
      return; // Dejar que otros handlers procesen el mensaje
    }

    // Si el mensaje es un comando, cancelar el registro de nombre
    if (
      ctx.message &&
      "text" in ctx.message &&
      ctx.message.text.startsWith("/")
    ) {
      waitingForName.delete(ctx.from.id);
      return;
    }

    try {
      const userId = String(ctx.from.id);
      const username = ctx.from.username || null;
      const nameInput =
        ctx.message && "text" in ctx.message ? ctx.message.text.trim() : "";

      if (!nameInput || nameInput.length < 2) {
        await ctx.reply(
          "❌ El nombre debe tener al menos 2 caracteres. Por favor, intentá de nuevo:"
        );
        return;
      }

      // Crear el miembro con el nombre proporcionado
      await memberRepo.findOrCreate(userId, username, nameInput);

      // Limpiar el estado de espera
      waitingForName.delete(ctx.from.id);

      // Mostrar mensaje de bienvenida completo
      const helpText = `
✅ <b>¡Perfecto, ${nameInput}!</b>

Ya estás registrado. Este bot te ayuda a gestionar los gastos compartidos con tu pareja.

<b>Comandos disponibles:</b>
/g &lt;monto&gt; &lt;descripción&gt; - Registrar un gasto
/g &lt;monto&gt; [categoría] &lt;descripción&gt; - Registrar con categoría
/month - Total del mes actual
/balance - Ver quién debe a quién
/summary - Resumen por categoría del mes
/last [n] - Últimos N gastos (default: 5)
/del &lt;id&gt; - Eliminar un gasto
/help - Ver esta ayuda

<b>Ejemplos:</b>
/g 12500 vino luigi bosca
/g 8300 [super] coto compras
/month
/balance
      `.trim();

      await ctx.reply(helpText, { parse_mode: "HTML" });
    } catch (error) {
      console.error("Error al registrar nombre:", error);
      await ctx.reply(
        "❌ Error al registrar tu nombre. Por favor, intentá de nuevo con /start"
      );
      waitingForName.delete(ctx.from.id);
    }
  });
}
