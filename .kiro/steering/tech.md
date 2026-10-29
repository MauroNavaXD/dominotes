---
inclusion: always
---

# Stack técnico

## Tecnologías

| Área | Tecnología | Notas |
|------|------------|-------|
| Framework | Angular 22 (`@angular/core` ^22.1) | Componentes standalone, signals, nuevo control flow |
| Lenguaje | TypeScript ~6.0 | Configuración estricta (`noImplicitReturns`, `noPropertyAccessFromIndexSignature`, etc.) |
| Build | `@angular/build:application` (esbuild/Vite) | `ng build` usa producción por defecto |
| Estilos | Tailwind CSS 4 vía `@tailwindcss/postcss` | `src/styles.css` solo hace `@import 'tailwindcss';` |
| Iconos | BoxIcons 2.1.4 (CDN en `src/index.html`) | Clases `bx bx-*` |
| Persistencia | IndexedDB nativa | BD `dominotes`, store `tasks`, `keyPath: 'id'`, versión 1 |
| Reactividad | Angular signals | RxJS está instalado pero no se usa en la app |
| Tests | Vitest 4 + jsdom vía `@angular/build:unit-test` | Globals de Vitest (`describe`, `it`, `expect`, `vi`) |
| Lint | ESLint 10 (flat config) + `angular-eslint` 22 + `typescript-eslint` | Incluye reglas de accesibilidad en templates |
| Formato | Prettier 3 | `printWidth: 100`, `singleQuote: true`, parser `angular` para HTML |
| Paquetes | npm 11 | Usa `npm ci` para instalaciones reproducibles |

No agregues librerías nuevas (UI kits, state managers, date libraries, wrappers de IndexedDB) sin preguntar antes. El proyecto busca mantenerse mínimo.

## Comandos

```bash
npm start              # Servidor de desarrollo en http://localhost:4200 (no lo ejecutes tú; pídeselo al usuario)
npm run build          # Build de producción
npm run build:check    # Build de verificación (producción explícita)
npm run test:ci        # Tests en corrida única (usar este, nunca `npm test` en modo watch)
npm run typecheck      # tsc --noEmit sobre tsconfig.app.json
npm run lint:eslint    # ng lint (src/**/*.ts y src/**/*.html)
npm run format         # Prettier --write sobre src/
npm run format:check   # Prettier --check sobre src/
npm run lint           # ESLint + typecheck + format:check
npm run audit          # npm audit --audit-level=high
./scripts/validar.sh   # Pipeline completo: audit → ESLint → typecheck → formato → tests → build
```

Antes de dar por terminado un cambio, ejecuta como mínimo `npm run lint` y `npm run test:ci`. Para cambios grandes, ejecuta `./scripts/validar.sh`.

## Convenciones de Angular

- Solo **componentes standalone**; declara las dependencias en `imports` del `@Component`. No uses `NgModule`.
- Inyección con `inject()`, no por constructor.
- Estado con `signal()`, `computed()` y `.update()/.set()`. Expón signals de servicios como `readonly`.
- Templates con **control flow nuevo** (`@if`, `@for` con `track`, `@empty`, `@else`). No uses `*ngIf` ni `*ngFor`.
- Miembros que usa el template: `protected`. Internos: `private`. Constantes: `readonly`.
- Prefijo de selectores: `app` (`app-home`, kebab-case para elementos, camelCase para directivas). ESLint lo exige.
- Servicios con `@Injectable({ providedIn: 'root' })`.
- Las llamadas async disparadas desde la UI y no esperadas se marcan con `void` (por ejemplo, `void this.db.update(...)`).
- Limpia timers y suscripciones en `ngOnDestroy`.

## Persistencia (IndexedDB)

- Todo acceso a IndexedDB pasa por `TaskDbService`; los componentes nunca usan `indexedDB` directamente.
- El servicio mantiene un **espejo en memoria** (`tasks` signal). Primero persiste y después actualiza el signal.
- Si cambias la forma del store o agregas índices, incrementa `DB_VERSION` y maneja la migración en `onupgradeneeded`.
- Los campos nuevos de `Task` deben ser tolerantes a datos antiguos (`?? null` al leer).

## Fechas

- Timestamps completos (`createdAt`, `log[].timestamp`) se guardan como ISO (`new Date().toISOString()`).
- Fechas de solo día (`endDate`, `dueDate`) se guardan como `YYYY-MM-DD` generadas con `localDateString()` de `src/app/utils/date.ts`.
- **Nunca** uses `new Date('YYYY-MM-DD')`, porque se interpreta en UTC y puede correr el día. Para mostrar, separa año, mes y día y usa `new Date(y, m - 1, d)`.
- Para comparar fechas `YYYY-MM-DD`, la comparación lexicográfica de strings es válida y preferida.

## Estilos y accesibilidad

- Usa utilidades de Tailwind directamente en el template; evita CSS por componente (presupuesto de 4 kB de warning por componente).
- Paleta actual: `slate` (base), `blue` (acciones y foco), `amber` (en progreso), `green` (completada), `red` (peligro y vencida).
- Todo control interactivo necesita `aria-label` en español; los iconos con significado llevan `role="img"`, `title` y `aria-label`.
- Los botones deben declarar `type="button"`.

## Tests

- Archivo `*.spec.ts` junto al archivo que prueba.
- Componentes y servicios con `TestBed`; mocks con `vi.fn()` / `vi.stubGlobal()`.
- Fechas deterministas con `vi.useFakeTimers()` + `vi.setSystemTime()`.
- jsdom no incluye IndexedDB: mockéalo o propón agregar `fake-indexeddb` como devDependency (pregunta antes de instalar).
