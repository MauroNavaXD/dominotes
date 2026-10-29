# Producto — DomiNotes

## Qué es

DomiNotes es una aplicación web de gestión de tareas (to-do) **local-first**: todas las tareas se guardan en el navegador del usuario (IndexedDB). No hay backend, cuentas de usuario ni sincronización. La app funciona sin conexión una vez cargada.

Este repositorio contiene únicamente el **frontend** del proyecto y se usa también como proyecto de **capacitación en Kiro** (flujo de specs, steering y hooks). Prioriza código claro, pequeño y fácil de explicar sobre abstracciones sofisticadas.

## Usuario y propuesta de valor

- Persona individual que quiere llevar un registro rápido de sus pendientes sin registrarse ni instalar nada.
- Crear una tarea debe tomar un solo paso (escribir el título y presionar Enter).
- Toda la edición es **en línea** sobre la tabla; no hay formularios ni pantallas de detalle.

## Funcionalidades actuales

1. **Crear tareas** con un título. La fecha de creación (`createdAt`) se asigna automáticamente.
2. **Estados**: `pending` (Pendiente), `in-progress` (En progreso), `done` (Completada).
3. **Fecha fin (`endDate`)**: se asigna automáticamente al pasar a `done` y se limpia al salir de `done`.
4. **Fecha de vencimiento (`dueDate`)**: opcional y editable manualmente. Es independiente de `endDate` y de `status`.
5. **Tareas vencidas**: una tarea está vencida si `dueDate < hoy` (fecha local) y no está en `done`. Se muestra un icono de advertencia, y el indicador se actualiza en vivo sin recargar.
6. **Historial (`log`)**: cada cambio relevante (título, estado, fechas) genera una entrada con mensaje en español. Se consulta desde la fila de la tarea.
7. **Orden de presentación**: en progreso → pendientes → completadas; dentro de cada grupo, de la más nueva a la más antigua. El orden es solo visual y nunca altera los datos persistidos.
8. **Eliminar tareas.**

## Reglas de negocio que no se deben romper

- Cambiar `dueDate` nunca modifica `status` ni `endDate`, y viceversa.
- El día de vencimiento todavía **no** cuenta como vencido; la tarea se considera vencida a partir del día siguiente.
- Las tareas `done` nunca se marcan como vencidas.
- Las fechas "solo día" (`endDate`, `dueDate`) se manejan como `YYYY-MM-DD` con componentes **locales**, nunca UTC.
- Todo cambio que el usuario perciba como relevante debe quedar registrado en el historial.
- Los datos antiguos guardados sin campos nuevos (por ejemplo, sin `dueDate`) deben seguir cargando sin errores; trata el campo ausente como `null`.

## Idioma y tono

- La interfaz está en **español (es-MX)**: textos, etiquetas, `aria-label`, mensajes del historial y formatos de fecha (`toLocaleDateString('es-MX', ...)`).
- Los specs, requerimientos y documentación del producto se escriben en español.
- Tono de la UI breve y amable (por ejemplo, "No hay tareas todavía. Crea la primera arriba.").

## Fuera de alcance (por ahora)

- Backend, autenticación, multiusuario o sincronización entre dispositivos.
- Notificaciones push o recordatorios fuera de la app.
- Etiquetas, proyectos, prioridades o subtareas.

Si una petición cae en estos temas, señálalo antes de implementarla y propón crear un spec en `.kiro/specs/`.
