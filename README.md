# Telegram Expenses Bot - Bot de Gastos Compartidos

Bot de Telegram para gestionar gastos compartidos entre dos personas (pareja). Permite registrar gastos, calcular balances 50/50, ver resúmenes por categoría y exportar datos a CSV.

## 🎯 Características

- ✅ Registro rápido de gastos con inferencia automática de categorías
- ✅ Balance 50/50 automático del mes
- ✅ Resúmenes por categoría con porcentajes
- ✅ Consultas por mes y año
- ✅ Exportación a CSV
- ✅ Whitelist de usuarios autorizados
- ✅ Persistencia local con LowDB

## 📋 Requisitos

- Node.js 22.14 o superior
- pnpm 10.5.2 o superior
- Token de bot de Telegram (obtener en [@BotFather](https://telegram.me/BotFather))

## 🚀 Instalación

1. **Clonar el repositorio:**
```bash
git clone <repo-url>
cd telegram-expenses-bot
```

2. **Instalar dependencias:**
```bash
pnpm install
```

3. **Configurar variables de entorno:**
Crear archivo `.env` en la raíz del proyecto:
```env
TELEGRAM_BOT_TOKEN=tu_token_aqui
ALLOWED_USER_IDS=123456789,987654321
```

**Importante:** Reemplazar `123456789,987654321` con los IDs de Telegram de los usuarios autorizados. Para obtener tu ID, puedes usar el bot [@userinfobot](https://t.me/userinfobot).

4. **Iniciar el bot:**
```bash
pnpm dev
```

## 📖 Comandos

### Registrar gastos
- `/g <monto> <descripción>` - Registrar un gasto
- `/g <monto> [categoría] <descripción>` - Registrar con categoría específica

**Ejemplos:**
```
/g 12500 vino luigi bosca
/g 8300 [super] coto compras
```

### Consultas del mes
- `/month [YYYY-MM]` - Total del mes (sin argumento = mes actual)
- `/summary [YYYY-MM]` - Resumen por categoría con porcentajes
- `/balance` - Balance 50/50 del mes actual

**Ejemplos:**
```
/month
/month 2025-11
/summary 2025-12
/balance
```

### Consultas anuales
- `/year [YYYY]` - Resumen mes a mes del año (sin argumento = año actual)

**Ejemplo:**
```
/year 2025
```

### Listado y gestión
- `/last [n]` - Últimos N gastos con IDs completos (default: 5)
- `/del <id>` - Eliminar gasto por ID completo
- `/edit <id> <monto>` - Editar monto de un gasto

**Ejemplos:**
```
/last 10
/del abc123-def456-ghi789
/edit abc123-def456-ghi789 15000
```

### Búsqueda
- `/find <término> [YYYY-MM]` - Buscar gastos por descripción (muestra IDs completos)

**Ejemplos:**
```
/find vino
/find pizza 2025-12
```

### Edición
- `/edit <id> <monto>` - Editar el monto de un gasto existente

**Ejemplo:**
```
/edit abc123-def456-ghi789 15000
```

### Pagos de deuda
- `/pago <monto> <descripción>` - Registrar un pago de deuda (se considera en /balance)

**Ejemplo:**
```
/pago 5000 Ana me pagó
```
**Nota:** Los pagos de deuda registrados con `/pago` se restan del balance calculado en `/balance`. Si Ana debe 10000 a Seba y se registra `/pago 5000 Ana me pagó`, el balance mostrará que Ana debe 5000.

### Exportar
- `/csv [YYYY-MM]` - Exportar gastos del mes a CSV con IDs completos (sin argumento = mes actual)

**Ejemplo:**
```
/csv 2025-12
/csv
```
**Nota:** El CSV exportado incluye IDs completos y una columna "Tipo" que indica si es "Gasto" o "Pago de deuda".

### Ayuda
- `/start` - Iniciar bot y ver bienvenida
- `/help` - Ver ayuda completa

## 🏷️ Categorías

El bot infiere automáticamente la categoría basándose en palabras clave en la descripción:

- **vinos**: vino, malbec, cabernet, chardonnay, syrah, bianchi, zuccardi, luigi bosca, salentein, catena
- **super**: coto, disco, carrefour, jumbo, dia, supermercado
- **delivery**: rappi, pedidosya, uber eats, delivery
- **salidas**: bar, resto, restaurante, cine
- **hogar**: ferreteria, ikea, easy, sodimac
- **otros**: (categoría por defecto)

Puedes forzar una categoría usando la sintaxis: `/g 12000 [categoría] descripción`

## 💰 Formato de montos

El bot acepta múltiples formatos:
- Enteros: `12500`
- Decimales: `12500.50`
- Separadores de miles: `12.500` o `12,500`
- Combinado: `12.500,50`

Todos se normalizan y almacenan en centavos internamente.

## 🔒 Seguridad

El bot utiliza una whitelist de usuarios. Solo los IDs configurados en `ALLOWED_USER_IDS` pueden usar el bot. Los demás usuarios recibirán un mensaje de acceso denegado.

## 📁 Estructura del proyecto

```
src/
  bot/           # Handlers de comandos de Telegram
  domain/        # Lógica de negocio (balance, categorías, tiempo)
  app/           # Casos de uso (servicios)
  infra/         # Repositorios y base de datos (LowDB)
  utils/         # Utilidades (money, text, csv, whitelist)
  data/          # Base de datos JSON (gitignored)
```

## 🗄️ Base de datos

Los datos se almacenan localmente en `src/data/db.json` (no versionado en git). La estructura es:

```json
{
  "workspaces": [],
  "members": [],
  "expenses": []
}
```

## 🛠️ Scripts

- `pnpm dev` - Ejecutar en modo desarrollo
- `pnpm build` - Compilar TypeScript
- `pnpm start` - Ejecutar versión compilada

## 📝 Notas

- El bot usa long-polling (no webhook) para mantener la implementación simple
- Los montos se almacenan en centavos para evitar problemas de precisión con decimales
- El balance se calcula asumiendo división 50/50 entre dos miembros
- Si hay más de 2 miembros en un workspace, el balance MVP asume solo los primeros 2 activos

## 🚧 Roadmap (Post-MVP)

- [ ] Soporte multi-moneda
- [ ] Splits personalizados (no solo 50/50)
- [ ] Integración con bancos
- [ ] Dashboard web
- [ ] Insights con IA
- [ ] Exportación a PDF
- [ ] Presupuestos y alertas

## 📄 Licencia

MIT

## 👤 Autor

Desarrollado para gestión de finanzas compartidas de pareja.

