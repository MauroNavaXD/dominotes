# Plan de implementación — Fecha de vencimiento

- [x] 1. Agregar el campo `dueDate` al modelo `Task`
  - Añadir `dueDate: string | null` a la interfaz `Task` en `src/app/models/task.ts` con comentario de formato `YYYY-MM-DD`.
  - _Requisitos: 1.1_

- [x] 2. Soportar `dueDate` en la creación y persistencia de tareas
  - En `TaskDbService.create()` (`src/app/services/task-db.service.ts`), inicializar `dueDate: null` en el objeto `Task`.
  - Verificar que `dueDate` se persiste con el resto de la tarea en el store `tasks`.
  - _Requisitos: 1.2, 1.4_

- [x] 3. Soportar edición y logging de `dueDate` en el servicio
  - Ampliar el tipo de `changes` en `TaskDbService.update()` a `Partial<Pick<Task, 'title' | 'status' | 'endDate' | 'dueDate'>>`.
  - Agregar una rama de logging independiente para `dueDate`: "Fecha de vencimiento establecida a <fecha>" cuando pasa a un valor no nulo y "Fecha de vencimiento eliminada" cuando pasa a `null`.
  - Asegurar que el cambio de `dueDate` NO active ni cancele la lógica de efectos de `status` sobre `endDate` y no modifique `endDate`/`status`.
  - _Requisitos: 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3_

- [ ] 4. Normalizar datos antiguos sin `dueDate` al leer
  - Garantizar que las tareas cargadas desde IndexedDB sin `dueDate` se traten como `null` (p. ej. normalizando con `?? null` donde se consuma el valor).
  - _Requisitos: 1.3_

- [x] 5. Implementar la señal de tiempo "hoy" con actualización en vivo
  - En `Home` (`src/app/pages/home/home.ts`), agregar una `signal` `today` con la fecha local `YYYY-MM-DD`.
  - Inicializarla al construir el componente y refrescarla con un `setInterval` (~60 s) que la actualice solo si la fecha local cambió.
  - Implementar `OnDestroy` y limpiar el intervalo para evitar fugas.
  - Reutilizar una utilidad de fecha local `YYYY-MM-DD` consistente con `localDateString` del servicio.
  - _Requisitos: 6.1, 6.2, 6.3, 4.5_

- [x] 6. Implementar el predicado `isOverdue`
  - Añadir `isOverdue(task: Task): boolean` en `Home` que devuelva `true` solo si `dueDate` no es nulo, `status !== 'done'` y `dueDate < today()`.
  - Usar comparación lexicográfica de cadenas `YYYY-MM-DD` (orden cronológico, sin construir `Date` en UTC).
  - Hacer que dependa de `today()` para re-evaluación reactiva en vivo.
  - _Requisitos: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 7. Implementar el manejador de edición `updateDueDate`
  - Añadir `updateDueDate(task: Task, value: string)` en `Home` que mapee cadena vacía a `null`, evite guardados sin cambios y delegue en `db.update(task.id, { dueDate })`.
  - _Requisitos: 2.2, 2.3_

- [x] 8. Agregar la columna "Vencimiento" a la tabla
  - En `src/app/pages/home/home.html`, agregar el `<th>` "Vencimiento" en el encabezado.
  - Agregar la celda de la nueva columna en la fila de creación (placeholder `—`).
  - Agregar en cada fila de tarea un `<input type="date">` enlazado a `task.dueDate` que invoque `updateDueDate` en `change`.
  - _Requisitos: 2.1, 7.1, 7.2_

- [ ] 9. Agregar el icono de advertencia para tareas vencidas
  - En la celda del título, mostrar condicionalmente (`@if (isOverdue(task))`) un icono BoxIcons de alerta (p. ej. `bx bx-error`) con color de alerta Tailwind.
  - Añadir `title` y `aria-label` indicando que la tarea está vencida.
  - _Requisitos: 5.1, 5.2, 5.3, 5.4_

- [ ] 10. Ajustar los `colspan` de la tabla
  - Cambiar los `colspan="5"` de la fila de historial y del estado vacío a `colspan="6"`.
  - _Requisitos: 7.3_

- [ ] 11. Verificar la implementación
  - Ejecutar la compilación/build del proyecto y corregir errores.
  - Validar en el navegador: la columna aparece, la edición persiste, el icono se muestra solo en tareas vencidas no completadas, el estado se actualiza en vivo y el layout (6 columnas y colspans) es correcto.
  - _Requisitos: 4.1-4.5, 5.1-5.4, 6.1-6.3, 7.1-7.3_
