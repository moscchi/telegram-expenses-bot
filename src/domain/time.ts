import dayjs from "dayjs";

/**
 * Obtiene el rango de fechas del mes actual (local time)
 * Retorna { start: ISO string, end: ISO string }
 */
export function getCurrentMonthRange(): { start: string; end: string } {
  const start = dayjs().startOf("month").toISOString();
  const end = dayjs().endOf("month").toISOString();
  return { start, end };
}

/**
 * Obtiene el rango de fechas de un mes específico
 * @param monthInput Formato: "YYYY-MM" o "MM" (mes actual del año actual)
 * @returns { start: ISO string, end: ISO string, monthName: string }
 */
export function getMonthRange(monthInput?: string): { start: string; end: string; monthName: string } {
  let date: dayjs.Dayjs;
  
  if (!monthInput) {
    date = dayjs();
  } else {
    // Intentar parsear como YYYY-MM
    if (monthInput.includes("-")) {
      date = dayjs(monthInput, "YYYY-MM");
      if (!date.isValid()) {
        throw new Error(`Formato de fecha inválido: ${monthInput}. Usa YYYY-MM (ej: 2025-12)`);
      }
    } else {
      // Solo mes (MM), usar año actual
      const month = parseInt(monthInput, 10);
      if (isNaN(month) || month < 1 || month > 12) {
        throw new Error(`Mes inválido: ${monthInput}. Debe ser un número entre 1 y 12.`);
      }
      date = dayjs().month(month - 1); // dayjs meses son 0-indexed
    }
  }
  
  const start = date.startOf("month").toISOString();
  const end = date.endOf("month").toISOString();
  const monthName = date.format("MMMM YYYY");
  
  return { start, end, monthName };
}

/**
 * Obtiene todos los rangos de meses de un año
 * @param yearInput Año (YYYY) o undefined para año actual
 * @returns Array de { start, end, monthName, monthNumber }
 */
export function getYearMonthRanges(yearInput?: string | number): Array<{
  start: string;
  end: string;
  monthName: string;
  monthNumber: number;
  year: number;
}> {
  let year: number;
  
  if (!yearInput) {
    year = dayjs().year();
  } else if (typeof yearInput === "string") {
    year = parseInt(yearInput, 10);
    if (isNaN(year) || year < 2000 || year > 2100) {
      throw new Error(`Año inválido: ${yearInput}. Debe ser un número entre 2000 y 2100.`);
    }
  } else {
    year = yearInput;
  }
  
  const ranges = [];
  for (let month = 0; month < 12; month++) {
    const date = dayjs().year(year).month(month);
    ranges.push({
      start: date.startOf("month").toISOString(),
      end: date.endOf("month").toISOString(),
      monthName: date.format("MMMM YYYY"),
      monthNumber: month + 1,
      year: year,
    });
  }
  
  return ranges;
}

/**
 * Verifica si una fecha ISO está dentro de un rango
 */
export function isDateInRange(dateISO: string, startISO: string, endISO: string): boolean {
  const date = dayjs(dateISO);
  const start = dayjs(startISO);
  const end = dayjs(endISO);
  return (date.isAfter(start) || date.isSame(start)) && (date.isBefore(end) || date.isSame(end));
}

/**
 * Formatea una fecha ISO a formato legible (es-AR)
 */
export function formatDate(dateISO: string): string {
  return dayjs(dateISO).format("YYYY-MM-DD");
}