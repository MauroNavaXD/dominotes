---
inclusion: fileMatch
fileMatchPattern: ["src/app/**/services/**/*.ts", "src/app/**/utils/**/*.ts"]
---

# Unit testing de services y utils

Reglas para escribir y mantener tests unitarios de **servicios** (`services/`) y **funciones puras** (`utils/`) con Vitest 4 + jsdom vía `@angular/build:unit-test`. Complementa la sección "Tests" de `tech.md`; si hay conflicto, este documento es más específico y prevalece.

## Principios

- **Un spec por archivo**, junto a él: `date.ts` → `date.spec.ts`, `task-db.service.ts` → `task-db.service.spec.ts`.
- **Prueba comportamiento, no implementación.** Verifica la API pública (valores devueltos, estado del signal, datos persistidos). No accedas a miembros `private` ni con `as any` ni con `['privado']`.
- **Tests deterministas.** Nada de fecha real, UUID aleatorio ni orden de ejecución entre tests. Cada test prepara su propio estado.
- **Nombres en español y describiendo la regla**: `it('limpia endDate al salir de done', ...)`. Identificadores en inglés.
- **Una regla de negocio por test.** Si el nombre necesita "y", probablemente son dos tests.
- Cada regla de `product.md` ("Reglas de negocio que no se deben romper") que toque el archivo debe tener al menos un test.

## Utils (funciones puras)

- **Sin `TestBed` ni Angular.** Importa la función y pruébala directo; `utils/` no depende de Angular y sus tests tampoco.
- Usa tablas de casos con `it.each` para entradas/salidas:

```ts
import { localDateString } from './date';

describe('localDateString', () => {
  it.each([
    [new Date(2026, 0, 5), '2026-01-05'],
    [new Date(2026, 11, 31, 23, 59), '2026-12-31'],
    [new Date(2026, 9, 29, 0, 0), '2026-10-29'],
  ])('formatea %s como %s', (date, expected) => {
    expect(localDateString(date)).toBe(expected);
  });
});
```

- **Fechas locales, nunca UTC.** Construye entradas con `new Date(y, m - 1, d, h, min)`. Nunca `new Date('YYYY-MM-DD')` ni strings ISO con `Z` como entrada de una fecha "solo día"; el test pasaría o fallaría según la zona horaria de quien lo ejecuta.
- Cubre los bordes: medianoche (`00:00` y `23:59`), cambio de mes/año, mes y día de un dígito (padding), y el valor por defecto del parámetro (con `vi.setSystemTime`).
- Comparaciones `YYYY-MM-DD`: prueba explícitamente "hoy", "ayer" y "mañana" (el día de vencimiento **no** está vencido).

## Services

### Instanciación

- Obtén el servicio con `TestBed.inject(...)`, nunca con `new`, para que `inject()` interno funcione:

```ts
let service: TaskDbService;

beforeEach(() => {
  TestBed.configureTestingModule({});
  service = TestBed.inject(TaskDbService);
});
```

- `TestBed` se reinicia entre tests, así que cada test recibe una instancia nueva (y una caché `dbPromise` nueva). No compartas instancias en `beforeAll`.
- Lee los signals llamándolos (`service.tasks()`); no hace falta fixture ni `whenStable()` para servicios. Si un servicio usa `effect()`, ejecútalos con `TestBed.tick()` antes de verificar.

### IndexedDB

- jsdom **no** trae IndexedDB. Mientras no se apruebe `fake-indexeddb` (pregunta antes de instalarlo), usa un fake en memoria con `vi.stubGlobal('indexedDB', ...)`.
- El fake vive en `src/testing/` (por ejemplo `src/testing/fake-indexeddb.ts`) y nunca se importa desde código de producción.
- El fake debe disparar `onsuccess` / `onerror` de forma **asíncrona** (`queueMicrotask` o `setTimeout(0)`), igual que el navegador; si lo haces síncrono, el handler aún no está asignado cuando se resuelve la petición.
- Restaura siempre en `afterEach` con `vi.unstubAllGlobals()`.
- Verifica el contrato "primero persiste, después actualiza el signal":
  - Caso feliz: el registro existe en el store fake **y** en `service.tasks()`.
  - Caso de error: si `add`/`put`/`delete` falla, la promesa se rechaza (`await expect(...).rejects.toThrow()`) y el signal **no** cambia.
- Datos antiguos: carga en el store un `Task` sin campos nuevos (por ejemplo sin `dueDate`) y verifica que `load()` no falla y el campo se trata como `null`.
- Si cambias `DB_VERSION` o el esquema, agrega un test de `onupgradeneeded`.

### Fechas, IDs y tiempo

- Fija la hora con `vi.setSystemTime(new Date(2026, 9, 29, 10, 0))`. Sin `vi.useFakeTimers()` solo se mockea `Date`, que es lo que necesitan estos servicios. Si además necesitas controlar timers, usa `vi.useFakeTimers({ toFake: ['Date', 'setTimeout'] })` limitado a lo necesario.
- Limpia en `afterEach` con `vi.useRealTimers()`.
- Con fake timers y promesas usa las variantes async: `await vi.advanceTimersByTimeAsync(ms)` / `await vi.runAllTimersAsync()`.
- IDs deterministas: `vi.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000001')`.
- Para `createdAt` y `log[].timestamp` compara contra el ISO esperado de la hora fijada; para `endDate` / `dueDate` contra `YYYY-MM-DD` local.

### Historial y reglas de negocio

Para cada operación que cambie una tarea, verifica:

- El cambio en los datos (`status`, `endDate`, `dueDate`, `title`).
- La entrada exacta añadida a `log` (mensaje en español) y que las anteriores se conservan.
- Que **no** se genera entrada cuando el valor no cambia.
- La independencia de `dueDate` respecto a `status` y `endDate` en ambas direcciones.
- El orden de `tasks()`: en progreso → pendientes → completadas, y dentro de cada grupo de la más nueva a la más antigua; el orden no se persiste.

## Mocks

- **Prefiere mocks por DI** (`providers: [{ provide: X, useValue: mock }]`) sobre `vi.mock()` de módulos.
- Si usas `vi.mock` o `vi.hoisted`, ponlos en el **nivel superior** del archivo (Vitest 5 lanza error si están dentro de un `describe`).
- Mocks tipados: `vi.fn<(id: string) => Promise<void>>()`. Evita `any`.
- Los mocks que se invocan con `new` necesitan `function` o `class` en la implementación (no arrow functions).
- No dependas de llamadas acumuladas entre tests: crea mocks nuevos por test o limpia con `vi.clearAllMocks()` en `beforeEach`. `vi.restoreAllMocks()` solo restaura spies de `vi.spyOn`; no resetea su historial.
- Restaura lo global en `afterEach`: `vi.useRealTimers()`, `vi.unstubAllGlobals()`, `vi.restoreAllMocks()`.

## Async

- Tests async con `async/await`; nunca callbacks `done`.
- **Siempre `await`** a `.resolves`, `.rejects` y `expect.poll()` (en Vitest 5 una aserción async sin `await` hace fallar el test).
- No uses `fakeAsync`, `tick`, `flush` ni `waitForAsync`: dependen de Zone.js y la app es zoneless.
- Opciones del test como segundo argumento: `it('...', { retry: 2 }, async () => {})`. No uses `describe.sequential`; usa `{ concurrent: false }` si hace falta.

## Qué no hacer

- No accedas a `indexedDB`, `localStorage` ni a la red reales.
- No uses `setTimeout` reales para "esperar" a que algo termine; usa `await` sobre la promesa, fake timers o `expect.poll()`.
- No hagas snapshots de objetos con fechas o UUID no fijados.
- No dejes `it.only` / `describe.only` ni tests `skip` sin un comentario con el motivo.

## Comandos

```bash
npm run test:ci                                                   # Suite completa, corrida única
npx ng test --watch=false --include src/app/utils/date.spec.ts    # Un solo archivo
npx ng test --watch=false --coverage                              # Con reporte de cobertura
```

Nunca uses `npm test` (modo watch). Antes de terminar, ejecuta `npm run lint` y `npm run test:ci`.
