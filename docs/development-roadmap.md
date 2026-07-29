# Hoja de ruta de desarrollo

Esta hoja de ruta ordena resultados pendientes. Separa el estado comprobado del objetivo y no considera completa una capacidad por la sola existencia de una API.

**Última verificación:** 2026-07-29. Debe actualizarse cuando se verifique un recorrido completo o cambien una prioridad o dependencia.

## Alcance del MVP

La identidad del producto y los principios visuales se mantienen en [`brand.md`](./brand.md); este capítulo fija qué se construye, para quién y cómo se reconoce el cierre.

### Actores

| Actor                           | Necesidad                                      | Resultado esperado                                                                                        |
| ------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Visitante                       | Comprender la misión y conocer acciones reales | Encuentra una narrativa clara, publicaciones, salidas y el versículo vigente desde cualquier dispositivo. |
| Responsable                     | Mantener el contenido público                  | Administra la landing, publicaciones, salidas, responsables y versículos mediante una sesión protegida.   |
| Equipo de producto y desarrollo | Evolucionar el MVP con control                 | Distingue el estado implementado de los objetivos y verifica cada cambio antes de entregarlo.             |

### Capacidades previstas

- Experiencia pública para landing, publicaciones, salidas, likes anónimos, versículo vigente e historial de versículos.
- Administración autenticada de landing, publicaciones, salidas, responsables y versículos.
- Carga de imágenes y PDF dentro de los flujos que los utilizan.
- Contenido enriquecido de publicaciones sanitizado en servidor y cliente.
- Experiencia pública coherente con la identidad definida en [`brand.md`](./brand.md).
- Operación desplegable con persistencia, observabilidad mínima, copias de seguridad y recuperación documentada.

### Fuera del MVP

- Roles o permisos diferenciados.
- Registro público, login social o recuperación de contraseña por correo.
- Buscador público, modo presentador o modo oscuro.
- Imágenes embebidas dentro del contenido enriquecido de publicaciones.
- Formulario de contacto o mapa embebido.
- Sustituir la gestión editorial por un CMS externo.

### Criterios de éxito

- Un visitante comprende la misión y recorre el contenido principal en móvil y escritorio sin enlaces ni estados rotos.
- Un responsable completa los flujos editoriales previstos sin asistencia técnica ni acceso directo a la base de datos.
- Las reglas de publicación, acceso y archivos se mantienen aunque la interfaz cliente sea omitida.
- El despliegue conserva datos y archivos, ofrece una señal de salud útil y puede recuperarse mediante copias verificadas.

## Estado actual

| Capacidad                | Estado actual                                                                                                                                | Objetivo                                                                                                    |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Plataforma local         | Implementada: monorepo pnpm con Astro, React, NestJS, Prisma y PostgreSQL; dispone de scripts de calidad y seed repetible.                   | Mantener el entorno reproducible mientras evoluciona la operación.                                          |
| Sitio público            | Parcial: landing, publicaciones y salidas son páginas Astro explícitas; la landing muestra el versículo vigente y las salidas admiten likes. | Completar historial de versículos y verificar identidad de marca, responsive, accesibilidad, estados y SEO. |
| Administración editorial | Parcial: gestiona landing, héroe, salida destacada, publicaciones, salidas, responsables y versículos.                                       | Completar edición de responsables y desasociación de archivos.                                              |
| Archivos                 | Parcial: carga y asociación dentro de publicaciones, salidas y héroe; no hay listado general.                                                | Definir el ciclo de vida antes de ofrecer una biblioteca o eliminación global.                              |
| Operación de producción  | No iniciada: el runtime web se puede construir e iniciar, pero la API y la infraestructura no tienen un recorrido de producción completo.    | Lograr una entrega persistente, observable, recuperable y automatizada.                                     |

## Próximos resultados

No hay un cambio activo declarado en este documento. El orden siguiente conserva la prioridad de trabajo pendiente; iniciar un resultado requiere confirmar su alcance y evidencia de cierre.

| Orden | Resultado                              | Estado actual                                                                                                                                             | Se considera completo cuando                                                                                       |
| ----- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 1     | Completar el ciclo de responsables     | La API edita `displayName` y restablece contraseñas; la interfaz no.                                                                                      | Ambas acciones se completan desde la interfaz y los errores son recuperables.                                      |
| 2     | Proteger invariantes de responsables   | La interfaz bloquea la auto-desactivación, pero la API puede ser invocada directamente y tampoco protege al último responsable activo.                    | La API rechaza ambos casos de forma transaccional y probada.                                                       |
| 3     | Publicar el historial de versículos    | `GET /verses/history` existe; no hay página pública.                                                                                                      | El visitante puede recorrer el historial con estados vacío, error y navegación definidos.                          |
| 4     | Desasociar archivos de salidas y héroe | La interfaz permite cargar o reemplazar, no quitar la asociación existente.                                                                               | El cliente puede enviar una intención explícita de desasociación sin borrar globalmente el `FileAsset`.            |
| 5     | Endurecer consultas y fechas           | Paginación, límites y algunas fechas conservan contratos ambiguos.                                                                                        | DTOs y servicios validan rangos, formatos y límites consistentes.                                                  |
| 6     | Definir el contrato HTTP de despliegue | CORS, origen y proxy confiable dependen de una topología aún no acordada.                                                                                 | La topología determina orígenes, proxy, cookies y errores seguros, con pruebas pertinentes.                        |
| 7     | Completar la experiencia pública       | Existe un sistema visual consolidado, pero su aplicación integral no está verificada contra [`brand.md`](./brand.md). El seed usa contenido demostrativo. | Los recorridos públicos aplican la identidad acordada y superan revisión responsive, accesibilidad, estados y SEO. |
| 8     | Preparar producción                    | Faltan build/start de API, persistencia, health dependiente, copias y retiro de `POST /echo`.                                                             | El sistema se despliega, monitorea, respalda, restaura y no expone scaffolding.                                    |
| 9     | Automatizar la entrega                 | Las verificaciones existen como comandos locales.                                                                                                         | CI/CD y E2E ejecutan el recorrido crítico y conservan evidencia antes de una release.                              |

## Más adelante

| Capacidad                                | Condición de entrada                                                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Gestión independiente de archivos        | Definir referencias en uso, orfandad, retención, eliminación y recuperación; añadir una API de listado. |
| Roles diferenciados                      | Comprobar la necesidad operativa y diseñar un modelo de autorización.                                   |
| Recuperación por correo                  | Definir servicio de correo, seguridad de tokens y operación.                                            |
| Búsqueda, modo presentador o modo oscuro | Demostrar un resultado medible y priorizarlo frente a las necesidades del MVP.                          |

## Regla de actualización

- Cambiar un estado solo con evidencia del recorrido completo.
- Mantener un resultado observable y una condición de cierre por fila.
- No duplicar comandos ni reglas de contribución: pertenecen a [`AGENTS.md`](../AGENTS.md).
