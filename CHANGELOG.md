# Changelog

## [1.0.1] - 2025-12-20
### Fixed
- Migración a ESM (ES Modules) para compatibilidad con LowDB v7
- Script post-build para agregar extensiones `.js` automáticamente a importaciones
- Configuración de TypeScript para compilación ESM
- Fix de `__dirname` en ESM usando `import.meta.url`
- Build y deploy funcionando correctamente en producción

### Changed
- `tsconfig.json`: Cambiado de CommonJS a ES2020 modules
- `package.json`: Agregado `"type": "module"` para ESM
- Script de build ahora ejecuta `tsc && node scripts/fix-imports.js`

## [1.0.0] - 2025-12-20
### Added
- **Comandos de registro de gastos:**
  - `/g <monto> <descripción>` - Registrar gasto con inferencia automática de categoría
  - `/g <monto> [categoría] <descripción>` - Registrar gasto con categoría específica
  - Soporte para múltiples formatos de monto (enteros, decimales, separadores de miles)
  - Almacenamiento en centavos para precisión

- **Sistema de categorías:**
  - Inferencia automática de categorías basada en palabras clave
  - Categorías: vinos, super, delivery, salidas, hogar, otros
  - Override manual de categoría con sintaxis `[categoría]`

- **Consultas del mes:**
  - `/month [YYYY-MM]` - Total del mes (sin argumento = mes actual)
  - `/summary [YYYY-MM]` - Resumen por categoría con porcentajes
  - `/balance` - Balance 50/50 del mes actual con cálculo de deudas

- **Consultas anuales:**
  - `/year [YYYY]` - Resumen mes a mes del año con porcentajes

- **Gestión de gastos:**
  - `/last [n]` - Últimos N gastos (default: 5)
  - `/del <id>` - Eliminar gasto por ID

- **Exportación:**
  - `/csv [YYYY-MM]` - Exportar gastos del mes a CSV

- **Seguridad:**
  - Sistema de whitelist de usuarios autorizados
  - Configuración mediante variable de entorno `ALLOWED_USER_IDS`
  - Middleware de autenticación en todos los comandos

- **Onboarding:**
  - `/start` - Registro inicial con solicitud de nombre personalizado
  - Persistencia de información de usuarios y workspaces

- **Base de datos:**
  - Persistencia local con LowDB (JSON)
  - Estructura de datos: workspaces, members, expenses
  - Inicialización automática de base de datos

- **Utilidades:**
  - Formateo de dinero en formato es-AR (12.500,50)
  - Parsing robusto de montos con múltiples formatos
  - Utilidades de tiempo para rangos de meses y años
  - Cálculo de balance 50/50 entre dos miembros

- **Documentación:**
  - README completo con instrucciones de instalación
  - Documentación de todos los comandos y parámetros
  - Ejemplos de uso

### Technical
- Arquitectura modular: bot, domain, app, infra, utils
- TypeScript con tipado estricto
- Separación de lógica de negocio y handlers de Telegram
- Repositorios para abstracción de datos
- Servicios de dominio para casos de uso

## [0.1.0] - 2025-04-10
### Added
- Bot de Telegram básico con comando /start
- Soporte para registrar gasto con texto simple ("Pizza 3000")
- Soporte para registrar ingreso con texto simple ("Cobro deuda 15000")
- Soporte para ver resumen por mes ingresado por el usuario o por año, en formato tabla
- Base de datos local con LowDB
- Estructura mensual por clave tipo "april-2025"