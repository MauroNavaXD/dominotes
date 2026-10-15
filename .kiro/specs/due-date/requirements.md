# Requisitos — Fecha de vencimiento

## Introducción

Esta funcionalidad agrega a cada tarea una **fecha de vencimiento** (`dueDate`) opcional que el usuario puede ingresar manualmente. Cuando una tarea alcanza su fecha de vencimiento y no está completada, se destaca visualmente con un icono de advertencia. La fecha de vencimiento es independiente de la fecha de fin (`endDate`) existente, que sigue gobernada por el estado de la tarea.

Decisiones de producto acordadas:
1. Se introduce un **campo nuevo** `dueDate` (no se reutiliza `endDate`).
2. Una tarea se considera **vencida al día siguiente** de su fecha de vencimiento (es decir, `dueDate < hoy`; el propio día de vencimiento aún no cuenta como vencida).
3. Las tareas en estado `done` **nunca** se marcan como vencidas.
4. La fecha de vencimiento se muestra y edita en una **columna nueva** de la tabla.
5. El estado de "vencida" se actualiza **en vivo** (con el paso del tiempo) y **al cargar** la UI.

## Requisitos

### Requisito 1 — Modelado de la fecha de vencimiento

**Historia de usuario:** Como usuario, quiero que cada tarea tenga una fecha de vencimiento opcional, para poder registrar cuándo debe estar terminada.

#### Criterios de aceptación

1. CUANDO se define el modelo `Task` ENTONCES el sistema DEBERÁ incluir un campo `dueDate` de tipo `string | null` en formato `YYYY-MM-DD` (solo fecha).
2. CUANDO se crea una tarea nueva ENTONCES el sistema DEBERÁ inicializar `dueDate` en `null`.
3. CUANDO se carga una tarea existente que fue guardada antes de esta funcionalidad y no tiene `dueDate` ENTONCES el sistema DEBERÁ tratarla como si `dueDate` fuera ausente/`null` sin producir errores.
4. CUANDO se persiste una tarea ENTONCES el sistema DEBERÁ almacenar `dueDate` junto con el resto de la tarea en el object store `tasks` de IndexedDB.

### Requisito 2 — Edición manual de la fecha de vencimiento

**Historia de usuario:** Como usuario, quiero ingresar o modificar la fecha de vencimiento de una tarea manualmente, para mantenerla actualizada.

#### Criterios de aceptación

1. CUANDO visualizo la lista de tareas ENTONCES el sistema DEBERÁ mostrar una columna "Vencimiento" con un control de fecha editable por cada tarea.
2. CUANDO ingreso o cambio la fecha de vencimiento de una tarea ENTONCES el sistema DEBERÁ guardar el nuevo valor de `dueDate` en IndexedDB y reflejarlo en la UI.
3. CUANDO borro la fecha de vencimiento de una tarea ENTONCES el sistema DEBERÁ guardar `dueDate` como `null`.
4. CUANDO cambio la fecha de vencimiento ENTONCES el sistema DEBERÁ registrar una entrada en el historial (`log`) de la tarea describiendo el cambio en español.
5. CUANDO cambio la fecha de vencimiento ENTONCES el sistema NO DEBERÁ alterar el campo `endDate` ni el `status` de la tarea.

### Requisito 3 — Independencia respecto a `endDate` y `status`

**Historia de usuario:** Como usuario, quiero que la fecha de vencimiento sea independiente de la fecha de fin automática, para que registrar un vencimiento no interfiera con el cierre de la tarea.

#### Criterios de aceptación

1. CUANDO cambia el `status` de una tarea ENTONCES el sistema NO DEBERÁ modificar el valor de `dueDate`.
2. CUANDO una tarea pasa a `done` ENTONCES el sistema DEBERÁ seguir asignando `endDate` automáticamente según la lógica existente, sin tocar `dueDate`.
3. CUANDO una tarea sale de `done` ENTONCES el sistema DEBERÁ seguir limpiando `endDate` según la lógica existente, sin tocar `dueDate`.

### Requisito 4 — Detección de tarea vencida

**Historia de usuario:** Como usuario, quiero saber cuándo una tarea pasó su fecha de vencimiento, para priorizar lo que está atrasado.

#### Criterios de aceptación

1. CUANDO una tarea tiene `dueDate` y la fecha local de hoy es **posterior** a `dueDate` (es decir, `dueDate < hoy`) Y la tarea no está en `done` ENTONCES el sistema DEBERÁ considerarla vencida.
2. CUANDO la fecha local de hoy es **igual** a `dueDate` ENTONCES el sistema NO DEBERÁ considerar la tarea vencida (se considera vencida solo a partir del día siguiente).
3. CUANDO una tarea no tiene `dueDate` (`null` o ausente) ENTONCES el sistema NO DEBERÁ considerarla vencida.
4. CUANDO una tarea está en estado `done` ENTONCES el sistema NO DEBERÁ considerarla vencida, aunque su `dueDate` ya haya pasado.
5. CUANDO se compara `dueDate` contra la fecha de hoy ENTONCES el sistema DEBERÁ usar componentes de fecha **locales** (no UTC) para evitar desfases de día.

### Requisito 5 — Indicador visual de vencimiento

**Historia de usuario:** Como usuario, quiero ver un icono de advertencia en las tareas vencidas, para identificarlas de un vistazo.

#### Criterios de aceptación

1. CUANDO una tarea está vencida ENTONCES el sistema DEBERÁ mostrar un icono de advertencia (BoxIcons, estilo `bx bx-*`) destacado con color de alerta.
2. CUANDO una tarea no está vencida ENTONCES el sistema NO DEBERÁ mostrar el icono de advertencia.
3. CUANDO se muestra el icono de advertencia ENTONCES el sistema DEBERÁ proveer texto accesible (`title` y/o `aria-label`) que indique que la tarea está vencida.
4. CUANDO se renderiza el indicador ENTONCES el sistema DEBERÁ mantener consistencia con el estilo visual existente de la tabla (Tailwind, colores de alerta como `text-red-*` o `text-amber-*`).

### Requisito 6 — Actualización en vivo del estado de vencimiento

**Historia de usuario:** Como usuario, quiero que una tarea se marque como vencida sin tener que recargar la página, para no perderme vencimientos mientras la app está abierta.

#### Criterios de aceptación

1. CUANDO se carga la UI ENTONCES el sistema DEBERÁ evaluar el estado de vencimiento de todas las tareas con la fecha actual.
2. CUANDO transcurre el tiempo y una tarea alcanza la condición de vencida mientras la app está abierta ENTONCES el sistema DEBERÁ actualizar el indicador visual en vivo sin requerir recarga ni edición de datos.
3. CUANDO el componente que gestiona la actualización en vivo se destruye ENTONCES el sistema DEBERÁ liberar cualquier temporizador o recurso asociado para evitar fugas.

### Requisito 7 — Integridad del layout de la tabla

**Historia de usuario:** Como usuario, quiero que la tabla siga viéndose correcta tras agregar la columna de vencimiento, para no perder legibilidad.

#### Criterios de aceptación

1. CUANDO se agrega la columna "Vencimiento" ENTONCES el sistema DEBERÁ actualizar el encabezado de la tabla para incluirla.
2. CUANDO se renderiza la fila de creación ENTONCES el sistema DEBERÁ incluir la celda correspondiente a la nueva columna.
3. CUANDO se renderiza la fila expandida de historial o el estado vacío ENTONCES el sistema DEBERÁ ajustar el `colspan` para reflejar el nuevo número total de columnas.
