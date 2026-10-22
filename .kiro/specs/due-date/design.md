# Diseño — Fecha de vencimiento

## Visión general

Se agrega un campo `dueDate` independiente al modelo `Task`, editable manualmente desde una nueva columna "Vencimiento" en la tabla de tareas. Una tarea se marca como **vencida** cuando `dueDate < hoy` (comparación por fecha local) y no está en `done`. El estado de vencimiento se recalcula en vivo mediante una señal reactiva de "fecha de hoy" que se refresca periódicamente, además de al cargar la UI.

Además, la lista de tareas se **ordena por estado** únicamente para presentación (primero *en progreso*, luego *pendientes* y por último *completadas*), reutilizando el `sort()` centralizado del servicio sin modificar los datos persistidos.

El diseño reutiliza los patrones ya presentes en el proyecto:
- Persistencia local-first en IndexedDB con un espejo reactivo (`signal<Task[]>`) en `TaskDbService`.
- Logging automático de cambios en el método `update()`.
- Manejo de fechas por **componentes locales** (como ya hacen `localDateString()` y `formatEndDate()`), evitando el desfase UTC.
- Iconografía BoxIcons (`bx bx-*`) y utilidades Tailwind.

## Arquitectura

```
home.html / home.ts (UI)
   │  edición de dueDate ──────────────► TaskDbService.update(id, { dueDate })
   │  cálculo isOverdue(task, hoy) ◄──── signal `today` (refresco en vivo)
   ▼
TaskDbService  ──escribe/lee──► IndexedDB (store "tasks", keyPath id)
   └── signal `tasks` ──► re-render reactivo
```

El cálculo de "vencida" vive en la capa de presentación (componente `Home`) porque depende del tiempo actual, no de los datos persistidos. `TaskDbService` solo se encarga de almacenar `dueDate` y registrar el cambio en el historial.

## Componentes e interfaces

### 1. Modelo (`src/app/models/task.ts`)

Se agrega el campo `dueDate` a la interfaz `Task`:

```ts
export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  createdAt: string;
  endDate: string | null;
  /** Fecha de vencimiento ingresada manualmente. ISO date-only (YYYY-MM-DD) o null. */
  dueDate: string | null;
  log: TaskLogEntry[];
}
```

Nota de compatibilidad: las tareas antiguas carecen de `dueDate`. El código de lectura debe tolerar `undefined` tratándolo como `null` (p. ej. `task.dueDate ?? null`). No se requiere migración del esquema de IndexedDB porque el store es schemaless; `DB_VERSION` se mantiene en `1`.

### 2. Servicio (`src/app/services/task-db.service.ts`)

- **`create(title)`**: inicializar `dueDate: null` en el objeto `Task` creado.
- **`update(id, changes)`**: ampliar el tipo de `changes` para incluir `dueDate`:

  ```ts
  changes: Partial<Pick<Task, 'title' | 'status' | 'endDate' | 'dueDate'>>
  ```

  Agregar una rama de logging para `dueDate`, análoga a la de `endDate` manual, pero **independiente** de la lógica de `status`/`endDate`:

  - Si `dueDate` cambió a un valor no nulo: `Fecha de vencimiento establecida a <fecha>`.
  - Si `dueDate` cambió a `null`: `Fecha de vencimiento eliminada`.

  La rama de `dueDate` no debe interferir con la cadena `if/else` existente que maneja los efectos de `status` sobre `endDate`; se evalúa de forma separada para que un cambio de `dueDate` no dispare ni cancele los efectos de `endDate`.

- **`sort(tasks)` — orden por estado (Requisito 8)**: el método privado `sort()` deja de ordenar
  únicamente por `createdAt` y pasa a ordenar primero por **prioridad de estado** y, como clave
  secundaria estable, por `createdAt` descendente:

  ```ts
  // Prioridad de presentación: menor = primero.
  const STATUS_RANK: Record<TaskStatus, number> = {
    'in-progress': 0,
    'pending': 1,
    'done': 2,
  };

  private sort(tasks: Task[]): Task[] {
    return [...tasks].sort((a, b) => {
      const byStatus = STATUS_RANK[a.status] - STATUS_RANK[b.status];
      if (byStatus !== 0) {
        return byStatus;
      }
      // Dentro del mismo estado: orden estable y predecible por creación (desc).
      return b.createdAt.localeCompare(a.createdAt);
    });
  }
  ```

  - **Clave primaria**: `STATUS_RANK` mapea `in-progress → 0`, `pending → 1`, `done → 2`, de modo
    que las tareas *en progreso* aparecen primero y las *completadas* al final (Req. 8.1).
  - **Clave secundaria estable**: cuando dos tareas comparten estado, el comparador cae en
    `createdAt` descendente, garantizando un orden determinista y predecible dentro del grupo
    (Req. 8.2). El comparador es total (nunca devuelve `0` salvo empate real de ambas claves),
    por lo que el resultado no depende de la estabilidad del `sort` del motor.
  - **Reubicación en vivo**: como `sort()` ya se invoca en `load()`, `create()` y `update()`, un
    cambio de `status` reordena automáticamente la tarea al grupo correcto y refresca el signal
    `tasks`, re-renderizando la tabla (Req. 8.3).
  - **Solo presentación**: `sort()` devuelve un **arreglo nuevo** y no muta cada `Task`; las
    operaciones `store.add`/`store.put` persisten el objeto de tarea sin el criterio de orden, por
    lo que el ordenamiento no altera los datos en IndexedDB (Req. 8.4).

El resto de la mecánica (apertura perezosa de la DB, transacciones, espejo en el signal) no cambia.

### 3. Componente Home (`src/app/pages/home/home.ts`)

Responsabilidades nuevas:

- **Señal de tiempo (`today`)**: una `signal<string>` con la fecha local de hoy en formato `YYYY-MM-DD`, inicializada al construir el componente y refrescada periódicamente.
  - Se usa un `setInterval` (p. ej. cada 60 s) que actualiza `today` solo si la fecha local cambió, para activar el recálculo reactivo de `isOverdue` sin trabajo innecesario.
  - El intervalo se limpia en `ngOnDestroy` para evitar fugas (el componente implementa `OnDestroy`).
  - Se reutiliza/exporta una utilidad para obtener la fecha local `YYYY-MM-DD` (equivalente a `localDateString`), de modo que servicio y componente usen el mismo criterio.

- **`isOverdue(task: Task): boolean`**: predicado puro que devuelve `true` cuando:
  - `task.dueDate` no es nulo, y
  - `task.status !== 'done'`, y
  - `task.dueDate < today()` (comparación lexicográfica de cadenas `YYYY-MM-DD`, que es equivalente al orden cronológico para ese formato y evita construir `Date` en UTC).

  La dependencia de `today()` dentro de `isOverdue` hace que las plantillas que llaman a `isOverdue(task)` se reevalúen cuando `today` cambia, cumpliendo la actualización en vivo.

- **`updateDueDate(task: Task, value: string): void`**: normaliza la entrada del `<input type="date">`:
  - Cadena vacía ⇒ `dueDate = null`.
  - Si el valor no cambió respecto a `task.dueDate`, no hace nada.
  - En otro caso delega en `db.update(task.id, { dueDate })`.

- **`formatDueDate(date: string): string`** (opcional para tooltip): reutiliza el mismo enfoque local que `formatEndDate` si se necesita mostrar la fecha formateada además del input.

### 4. Plantilla (`src/app/pages/home/home.html`)

- **Encabezado**: agregar `<th>` "Vencimiento" (ancho fijo coherente con las demás columnas, p. ej. `w-44`). La tabla pasa de **5 a 6 columnas**.
- **Fila de creación**: agregar una celda placeholder (`—`) o, si se decide permitirlo, un input de fecha; por defecto placeholder `—` para mantener el flujo de creación simple (la fecha se asigna editando luego).
- **Filas de tarea**: nueva celda con `<input type="date">` enlazado a `task.dueDate` que invoca `updateDueDate(task, $event.target.value)` en `change`.
- **Icono de advertencia**: en la celda del título (junto al input de título) mostrar condicionalmente `@if (isOverdue(task))` un `<i class="bx bx-error ...">` con color de alerta (`text-red-500` o `text-amber-500`), `title="Tarea vencida"` y `aria-label` equivalente.
- **`colspan`**: cambiar los `colspan="5"` de la fila de historial y del estado vacío a `colspan="6"`.

## Modelos de datos

`dueDate: string | null` — fecha-only `YYYY-MM-DD`, consistente con `endDate`. Comparable lexicográficamente para determinar orden cronológico. Persistido dentro de cada registro `Task` en el store `tasks`.

## Manejo de errores

- **Datos antiguos sin `dueDate`**: se normalizan con `?? null` en lectura; no se lanza error.
- **Entrada de fecha inválida/limpia**: el `<input type="date">` entrega `''` cuando está vacío; se mapea a `null`.
- **Fugas de temporizador**: el `setInterval` se cancela en `ngOnDestroy`.
- **Desfase UTC**: se evita comparando y formateando siempre con componentes de fecha locales; no se usa `new Date('YYYY-MM-DD')` para la comparación.

## Estrategia de pruebas

- **Unitarias de `isOverdue`** (bordes clave):
  - Sin `dueDate` ⇒ no vencida.
  - `dueDate === hoy` ⇒ no vencida (vence al día siguiente).
  - `dueDate < hoy` y `status !== 'done'` ⇒ vencida.
  - `dueDate < hoy` y `status === 'done'` ⇒ no vencida.
- **Servicio `update`**: cambiar `dueDate` registra la entrada de log correcta y no altera `endDate`/`status`.
- **Servicio `sort` — orden por estado** (Requisito 8):
  - Dada una mezcla de tareas, el resultado agrupa `in-progress` → `pending` → `done` en ese orden.
  - Dentro del mismo estado, el orden secundario por `createdAt` descendente es estable y predecible.
  - Tras cambiar el `status` de una tarea vía `update()`, la tarea queda reubicada en el grupo correcto.
  - El ordenamiento no modifica los registros persistidos (los objetos `Task` guardados no cambian).
- **Verificación de build**: ejecutar la compilación del proyecto (Angular) tras los cambios.
- **Verificación visual**: comprobar en el navegador que la columna aparece, la edición persiste, el icono se muestra solo en tareas vencidas no completadas, y que el layout (6 columnas, colspans) se ve correcto.
