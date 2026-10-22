# Dominotes — Frontend

[![Angular](https://img.shields.io/badge/Angular-22-DD0031?style=for-the-badge&logo=angular&logoColor=white)](https://angular.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4-38BDF8?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)
[![Prettier](https://img.shields.io/badge/Prettier-F7B93E?style=for-the-badge&logo=prettier&logoColor=white)](https://prettier.io/)

Aplicación web de gestión de tareas (to-do) construida con **Angular 22**. Permite crear tareas, seguir su estado (pendiente, en progreso, completada), registrar su historial de cambios y asignarles fechas (creación, fin y vencimiento).

## Estructura del proyecto

```
frontend/
├── src/app/
│   ├── models/      # Interfaces y tipos (Task, TaskStatus, ...)
│   ├── pages/       # Vistas/páginas de la aplicación
│   ├── services/    # Lógica de datos y persistencia
│   └── app.*        # Configuración raíz, rutas y componente principal
├── scripts/         # Scripts de ayuda (preparar / correr / validar)
└── public/          # Recursos estáticos
```

## Requisitos previos

- [Node.js](https://nodejs.org/) (incluye `npm`)

Los scripts verifican automáticamente que Node.js y npm estén instalados antes de continuar.

## Puesta en marcha con scripts

En la carpeta `scripts/` hay tres utilidades para facilitar el flujo de trabajo. Cada una existe en dos versiones: `.sh` para **Mac/Linux** y `.bat` para **Windows**.

> Ejecuta siempre los scripts **desde la carpeta `frontend`**.

| Paso | Qué hace | Mac / Linux | Windows |
|------|----------|-------------|---------|
| 1. Preparar | Verifica Node.js/npm e instala dependencias | `./scripts/preparar.sh` | `scripts\preparar.bat` |
| 2. Correr | Levanta el servidor de desarrollo | `./scripts/correr.sh` | `scripts\correr.bat` |
| 3. Validar | Audita dependencias, ESLint, tipado, formato, tests y build | `./scripts/validar.sh` | `scripts\validar.bat` |

### Mac / Linux

La primera vez puede que necesites dar permisos de ejecución a los scripts:

```bash
chmod +x scripts/*.sh
```

Luego:

```bash
# 1. Preparar el entorno (instala dependencias)
./scripts/preparar.sh

# 2. Levantar el frontend en modo desarrollo
./scripts/correr.sh

# 3. Validar el código antes de subir cambios
./scripts/validar.sh
```

### Windows

Desde `cmd` o PowerShell, dentro de la carpeta `frontend`:

```bat
REM 1. Preparar el entorno (instala dependencias)
scripts\preparar.bat

REM 2. Levantar el frontend en modo desarrollo
scripts\correr.bat

REM 3. Validar el código antes de subir cambios
scripts\validar.bat
```

Una vez levantado el servidor, abre tu navegador en **http://localhost:4200/**. La aplicación se recarga automáticamente al modificar los archivos fuente. Para detener el servidor usa `Ctrl + C`.

## Comandos npm equivalentes

Si prefieres no usar los scripts, puedes ejecutar los comandos directamente:

| Acción | Comando |
|--------|---------|
| Instalar dependencias | `npm ci` (o `npm install`) |
| Servidor de desarrollo | `npm start` |
| Compilar para producción | `npm run build` |
| Build de verificación (producción) | `npm run build:check` |
| Pruebas unitarias (Vitest) | `npm test` |
| Pruebas unitarias en CI (corrida única) | `npm run test:ci` |
| Auditar dependencias (high/critical) | `npm run audit` |
| Revisar tipado | `npm run typecheck` |
| Revisar formato | `npm run format:check` |
| Corregir formato automáticamente | `npm run format` |
| ESLint (Angular) | `npm run lint:eslint` |
| Lint (ESLint + tipado + formato) | `npm run lint` |

## Recursos adicionales

Para más detalles sobre Angular CLI, consulta la [referencia de comandos de Angular CLI](https://angular.dev/tools/cli).
