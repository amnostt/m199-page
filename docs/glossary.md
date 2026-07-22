# Glosario

Vocabulario común para interpretar el resumen ejecutivo, el fundamento técnico y la hoja de ruta. Los identificadores de código y términos establecidos se conservan en su forma original.

## Producto y dominio

| Término     | Definición                                                                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Actor       | Persona o sistema que participa en un recorrido y obtiene o produce un resultado.                                                                |
| Archivo     | Recurso binario registrado como `FileAsset`, por ejemplo una imagen o PDF, asociado a contenido mediante su identificador.                       |
| Destacado   | Contenido seleccionado para recibir mayor visibilidad en la landing. Puede ser una salida o hasta tres posts.                                    |
| Landing     | Página pública de inicio que reúne héroe, presentación del ministerio, video, destacados, contacto y versículo vigente.                          |
| Misión 1-99 | Ministerio y producto digital al que pertenece este repositorio.                                                                                 |
| Post        | Publicación editorial con título, slug, descripción, contenido enriquecido, tags, portada y descargas opcionales.                                |
| Responsable | Usuario administrativo que mantiene el contenido. Todos los responsables activos tienen actualmente el mismo acceso.                             |
| Salida      | Actividad evangelística con fecha, ubicación, descripción, ciclo editorial, archivos asociados y likes anónimos. En código se denomina `Outing`. |
| Versículo   | Texto bíblico con referencia, fecha de negocio, estado y fecha de publicación. El más reciente publicado aparece en la landing.                  |

## Planificación y alcance

| Término                                       | Definición                                                                                                                                  |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Acceptance criterion / criterio de aceptación | Condición observable que debe cumplirse para considerar correcto un comportamiento.                                                         |
| Capability / capacidad                        | Habilidad estable que el producto o el equipo debe poseer para lograr un outcome.                                                           |
| Horizontal split / división horizontal        | Separación por capa técnica, como “solo API” o “solo UI”. Puede ser útil como task, pero por sí sola normalmente no entrega valor completo. |
| Idea                                          | Posibilidad inicial de mejora que todavía debe convertirse en un problema comprobable.                                                      |
| Milestone / hito                              | Estado intermedio verificable que agrupa capacidades o slices relacionados y demuestra progreso hacia un objetivo.                          |
| Non-goal / no objetivo                        | Resultado excluido deliberadamente de un scope para proteger el foco y evitar expectativas implícitas.                                      |
| Outcome / resultado                           | Cambio observable para un actor o para la operación; expresa efecto, no trabajo realizado.                                                  |
| Roadmap / hoja de ruta                        | Orden explícito de outcomes, capabilities y slices según prioridad, estado y dependencias. No es una lista detallada de tasks.              |
| Scope / alcance                               | Límite de lo incluido en un change, slice, milestone o release. Incluye también sus no objetivos.                                           |
| Slice                                         | Porción acotada de una capacidad. Debe indicar un resultado y una frontera de verificación.                                                 |
| Vertical slice                                | Recorrido mínimo útil que atraviesa las capas necesarias y produce un outcome verificable de extremo a extremo.                             |
| Walking skeleton                              | Primer recorrido mínimo ejecutable que conecta las fronteras principales del sistema y prueba que la arquitectura puede entregar valor.     |

## Entrega y calidad

| Término                 | Definición                                                                                                                                                                                                                                                            |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Arreglo directo pequeño | Corrección local pequeña cuya causa y solución son inequívocas; conserva verificación pertinente.                                                                                                                                         |
| Definition of Done      | Lista de condiciones que demuestra que un slice está implementado, verificado, documentado y listo para entrega.                                                                                                                                                      |
| Definition of Ready     | Condiciones mínimas que debe cumplir un slice antes de comenzar su implementación.                                                                                                                                                                                    |
| Hotfix                  | Corrección urgente de un defecto en producción, priorizada para restaurar o proteger el servicio; requiere verificación.                                                                                                                                             |
| Invariant / invariante  | Regla que debe mantenerse verdadera ante cualquier cliente o recorrido válido; se protege en API o base de datos cuando corresponde.                                                                                                                                  |
| Regression / regresión  | Pérdida o alteración accidental de un comportamiento que antes funcionaba.                                                                                                                                                                                            |
| Release                 | Evento explícito que versiona o promueve una entrega verificada a un entorno objetivo; no equivale a completar un PR.                                                                                                                                                 |

## Estados y términos técnicos

| Término                            | Definición                                                                                                               |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `ACTIVE` / `INACTIVE`              | Estados de un responsable. Solo `ACTIVE` permite autenticarse y usar rutas protegidas.                                   |
| `DRAFT` / `PUBLISHED` / `ARCHIVED` | Estados de ciclo de vida del contenido. Solo `PUBLISHED` es elegible para superficies públicas.                          |
| API                                | Interfaz HTTP de `apps/api` consumida por `apps/web` y otros clientes autorizados.                                       |
| a11y                               | Abreviatura de accessibility; comprende acceso mediante teclado, semántica, contraste, foco y tecnologías de asistencia. |
| CI/CD                              | Automatización de integración, verificación y entrega de cambios.                                                        |
| E2E                                | Prueba end-to-end que recorre varias fronteras reales, por ejemplo web, API, PostgreSQL y archivos.                      |
| SEO                                | Prácticas para que cada página pública sea comprensible e indexable por buscadores y al compartirse.                     |
