import { OpenAI } from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// WARNING: This file isn't tested.
export async function adviceGenerate(finanzas: {
  ingresos: number;
  egresos: number;
  detalleMensual: string;
}) {
  const prompt = `
Soy un asesor financiero. A continuación se detallan los ingresos y egresos de una persona. 
Brinda un análisis y sugerencias simples y útiles sobre cómo mejorar su salud financiera.

Ingresos totales: $${finanzas.ingresos}
Egresos totales: $${finanzas.egresos}
Detalle mensual:\n${finanzas.detalleMensual}

Consejo:
`;

  const completion = await openai.chat.completions.create({
    model: "omni-moderation-latest",
    store: true,
    messages: [{ role: "user", content: prompt }],
  });

  return completion.choices[0].message.content;
}
