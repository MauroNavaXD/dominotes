# Estructura y organización del repositorio

Este documento define **cómo** organizar los archivos del repositorio a medida que crece. No describe el estado actual: es la norma que debe seguir todo archivo nuevo o movido. Si el código existente no cumple estas reglas, no lo reorganices por iniciativa propia. Propón la migración y espera confirmación.

## Principios

1. **Organizar por funcionalidad, no por tipo de archivo.** Todo lo que pertenece a una funcionalidad (vista, componentes, servicio, modelos, tests) vive junto. Así, borrar o mover una funcionalidad implica una sola carpeta.
2. **Lo compartido se gana su lugar.** Un archivo empieza dentro de su funcionalidad. Pasa a `shared/` o `core/` solo cuando **dos o más** funcionalidades lo usan.
3. **Estructura plana hasta que duela.** No crees subcarpetas vacías "por si acaso". Crea una subcarpeta cuando un directorio supere ~7 archivos o mezcle responsabilidades.
4. **Un concepto por archivo.** Un componente, servicio, modelo o grupo de funciones puras relacionadas por archivo.
5. **Las dependencias fluyen hacia abajo.** El código de nivel alto puede importar el de nivel bajo, nunca al revés (ver "Reglas de dependencia").

## Estructura objetivo de `src/app/`

```
src/app/
├── app.ts | app.html        # Componente raíz: solo layout global y <router-outlet />
├── app.config.ts            # Providers globales
├── app.routes.ts            # Rutas de nivel superior (carga perezosa de features)
│
├── core/                    # Singletons de toda la app; se instancian una sola vez
│   ├── services/            # Persistencia base, logging, configuración, errores globales
│   ├── layout/              # Header, footer, shell (si existen)
│   └── guards/ | interceptors/
│
├── shared/                  # Piezas reutilizables y sin estado de negocio
│   ├── components/          # UI genérica (botones, modales, inputs) sin lógica de dominio
│   ├── directives/ | pipes/
│   ├── models/              # Tipos usados por 2+ features
│   └── utils/               # Funciones puras (fechas, formato, cálculos) sin Angular
│
└── features/
    └── <feature>/           # Una carpeta por dominio o funcionalidad (kebab-case)
        ├── <feature>.routes.ts       # Rutas propias de la feature (si tiene varias vistas)
        ├── pages/<page>/             # Componentes enrutados
        ├── components/<component>/   # Componentes usados solo dentro de la feature
        ├── services/                 # Estado y acceso a datos de la feature
        ├── models/                   # Tipos y constantes del dominio de la feature
        └── utils/                    # Funciones puras propias de la feature
```

Una feature pequeña puede tener sus archivos directamente en `features/<feature>/` sin subcarpetas. Aplica el principio 3.

## Dónde va cada cosa

| Necesito... | Va en |
|-------------|-------|
| Una vista asociada a una ruta | `features/<feature>/pages/<page>/` |
| Un componente usado por una sola feature | `features/<feature>/components/<component>/` |
| Un componente genérico usado en varias features | `shared/components/<component>/` |
| Estado o acceso a datos de una feature | `features/<feature>/services/` |
| Un servicio único para toda la app (persistencia base, errores, config) | `core/services/` |
| Tipos e interfaces de un dominio | `features/<feature>/models/`; pasan a `shared/models/` si 2+ features los usan |
| Una función pura | `features/<feature>/utils/` o `shared/utils/` según quién la use |
| Estilos globales, tokens de Tailwind | `src/styles.css` (o archivos importados desde ahí) |
| Imágenes, fuentes, favicon, archivos estáticos | `public/` (se sirven desde la raíz `/`) |
| Recursos cargados en el HTML base (CDN, meta tags) | `src/index.html` |

Si algo no encaja en ninguna fila, pregunta antes de inventar una carpeta nueva y actualiza esta tabla después.

## Reglas de dependencia

```
app (raíz/rutas) → features → shared
                     ↘ core ↗
```

- `features/<a>` **no** importa de `features/<b>`. Si necesitan compartir algo, muévelo a `shared/` o `core/`.
- `shared/` no importa de `features/` ni de `core/`.
- `models/` y `utils/` no importan servicios ni componentes; `utils/` no depende de Angular.
- Los componentes nunca acceden directamente a APIs de almacenamiento (IndexedDB, `localStorage`); siempre pasan por un servicio.
- Importa con rutas relativas cortas dentro de una feature. Si las rutas cruzan muchos niveles (`../../../`), es señal de que el archivo debería vivir en `shared/` o `core/`.

## Nombres

- Carpetas y archivos en **kebab-case**.
- Guía de estilo de Angular 20+:
  - Componentes **sin sufijo**: `task-list.ts` → clase `TaskList`, template `task-list.html`. Estilos `task-list.css` solo si Tailwind no alcanza.
  - Servicios con sufijo `.service.ts`: `task-db.service.ts` → `TaskDbService`.
  - Guards, interceptors, pipes y directivas con su sufijo: `auth.guard.ts`, `relative-date.pipe.ts`, `autofocus.directive.ts`.
  - Rutas: `<feature>.routes.ts`.
- Modelos y utils con el nombre del concepto, sin sufijo: `task.ts`, `date.ts`.
- Tests: `<archivo>.spec.ts` **junto** al archivo que prueban. No uses carpetas `__tests__` ni `test/` separadas.
- Constantes de módulo en `UPPER_SNAKE_CASE`; tipos e interfaces en `PascalCase`; funciones y variables en `camelCase`.
- Identificadores en **inglés**; textos visibles para el usuario en **español**.

## Componentes

- Cada componente en su propia carpeta cuando tiene template separado (`<nombre>/<nombre>.ts` + `<nombre>.html`).
- Templates separados en `.html`. Usa templates inline solo para componentes de pocas líneas.
- Si un template supera ~150 líneas o repite bloques, extrae subcomponentes dentro de `components/` de la misma feature.

## Tests

- Unitarios: junto al archivo (`*.spec.ts`).
- Utilidades de prueba compartidas (mocks, fábricas de datos): `src/testing/`. Nunca las importes desde código de producción.
- Si en el futuro se agregan tests end-to-end, van en `e2e/` en la raíz del repositorio, fuera de `src/`.

## Raíz del repositorio

| Ubicación | Contenido |
|-----------|-----------|
| `src/` | Todo el código fuente de la aplicación |
| `public/` | Recursos estáticos |
| `scripts/` | Scripts de flujo de trabajo. Cada script existe en `.sh` (Mac/Linux) y `.bat` (Windows), con mensajes en español, y se ejecuta desde la raíz. Si cambias uno, cambia su par. |
| `docs/` | Documentación técnica extensa que no cabe en el README (arquitectura, decisiones, guías). Créala cuando haga falta. |
| Archivos de configuración | En la raíz, con el nombre estándar de cada herramienta (`angular.json`, `tsconfig*.json`, `eslint.config.js`, `.prettierrc`, `.editorconfig`, `.postcssrc.json`). No crees carpetas `config/`. |
| `.kiro/` | Specs, steering y hooks de Kiro |
| `.agents/` | Planes y revisiones de trabajo técnico generados por agentes |
| `dist/`, `.angular/`, `node_modules/` | Artefactos generados; nunca se editan ni se versionan |

## Documentación

Elige el lugar según el propósito:

| Tipo de documento | Ubicación | Cuándo |
|-------------------|-----------|--------|
| Puesta en marcha, requisitos, comandos, estructura general | `README.md` | Siempre actualizado. Modifícalo al cambiar scripts, comandos o carpetas de primer nivel. |
| Especificación de una funcionalidad de producto | `.kiro/specs/<feature>/` | Antes de implementar cualquier funcionalidad nueva o cambio de comportamiento |
| Plan o revisión de trabajo técnico (tooling, CI, refactors, dependencias) | `.agents/tasks/<tema>/plan.md`, `review.md` | Trabajo que no cambia el comportamiento del producto |
| Decisiones de arquitectura | `docs/adr/NNNN-titulo.md` | Al elegir una librería, patrón o estructura que sea costoso revertir |
| Guías extensas (arquitectura, convenciones detalladas) | `docs/` | Cuando el README crecería demasiado |
| Contexto persistente para Kiro | `.kiro/steering/` | Al cambiar el alcance (`product.md`), el stack (`tech.md`) o estas reglas (`structure.md`) |
| Explicación de código no obvio | JSDoc (`/** */`) en el propio archivo | Explica el *por qué*, no el *qué* |

### Specs (`.kiro/specs/<feature>/`)

- Nombre de carpeta en kebab-case, igual al nombre de la feature en `src/app/features/` cuando aplique.
- `requirements.md`: introducción, decisiones de producto e historias de usuario con criterios de aceptación EARS en español (`CUANDO ... ENTONCES el sistema DEBERÁ ...`), numerados `Requisito N` → `N.M`.
- `design.md`: visión general, arquitectura, componentes e interfaces, modelo de datos, manejo de errores y estrategia de pruebas.
- `tasks.md`: checklist numerado (`- [ ] N. ...`) con rutas de archivo concretas y `_Requisitos: N.M_` en cada tarea.
- Si la implementación cambia el alcance, actualiza primero `requirements.md` y `design.md` y después el código.

### ADRs (`docs/adr/`)

Numeración secuencial de 4 dígitos (`0001-usar-indexeddb.md`), con las secciones: Contexto, Decisión, Alternativas consideradas y Consecuencias. Un ADR no se edita después de aceptado; si la decisión cambia, se crea uno nuevo que lo reemplaza.

## Cómo evolucionar la estructura

- **Archivos nuevos**: siempre siguen la estructura objetivo.
- **Archivos existentes fuera de la norma**: se mueven solo cuando una tarea ya los toca de forma significativa, o con una tarea de refactor explícita y aprobada. Mueve en un commit separado (`refactor: move ... to features/...`) sin mezclar cambios de lógica.
- **Nueva carpeta de primer nivel** (en la raíz o en `src/app/`): pide confirmación y actualiza este documento y el README.
- Al mover archivos, actualiza los imports y verifica con `npm run lint` y `npm run test:ci`.

## Git

- Conventional Commits en inglés e imperativo: `tipo(scope): descripción`, con `scope` = nombre de la feature o área (`feat(tasks): ...`, `docs(due-date): ...`, `refactor(shared): ...`, `chore: ...`).
- Un commit por tarea de spec cuando sea posible; las reorganizaciones de archivos van en commits propios.
- Agrega archivos por nombre; evita `git add -A`.
