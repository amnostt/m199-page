# Fundamento técnico de Misión 1-99

Este documento describe la arquitectura que existe hoy, sus límites obligatorios y las brechas técnicas conocidas. No representa una arquitectura futura ni implica que una capacidad esté completa solo porque exista en la API.

| Mantenimiento       | Valor                                                                                                                 |
| ------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Estado              | Vigente; contiene estado actual volátil.                                                                              |
| Responsable         | Equipo de desarrollo.                                                                                                 |
| Última verificación | 2026-07-19                                                                                                            |
| Actualizar cuando   | Cambien arquitectura, configuración efectiva, esquema, migraciones, contratos, invariantes o capacidades verificadas. |

## Fuentes de verdad

| Necesidad                                     | Fuente                                            |
| --------------------------------------------- | ------------------------------------------------- |
| Propósito y alcance del producto              | [Resumen ejecutivo](./executive-summary.md)       |
| Arquitectura, decisiones e invariantes        | Este documento                                    |
| Prioridad y estado de entrega                 | [Hoja de ruta](./development-roadmap.md)          |
| Flujo de trabajo y criterios de entrega       | [Proceso de desarrollo](./development-process.md) |
| Terminología compartida                       | [Glosario](./glossary.md)                         |
| Comandos, estructura y reglas para contribuir | [`AGENTS.md`](../AGENTS.md)                       |

Para afirmar el estado actual prevalecen la fuente ejecutable, la configuración efectiva, las declaraciones del esquema, las migraciones y las pruebas. Los comentarios y las descripciones de paquetes orientan, pero pueden conservar contexto histórico y no demuestran por sí solos el comportamiento vigente. Si esas fuentes ejecutables se contradicen, se debe verificar el recorrido real y corregir la inconsistencia en lugar de elegir la afirmación más conveniente. Las decisiones de producto pendientes deben resolverse en un SDD change antes de modificar comportamiento.

## Estado actual: arquitectura

```text
apps/web ──HTTP──> apps/api ──DbService──> packages/db ──Prisma──> PostgreSQL
```

| Área          | Tecnología              | Responsabilidad actual                                                                      |
| ------------- | ----------------------- | ------------------------------------------------------------------------------------------- |
| `apps/web`    | React 19 y Vite         | Sitio público, routing del cliente, sesión administrativa y panel de gestión.               |
| `apps/api`    | NestJS                  | Contratos HTTP, autenticación, validación, reglas de aplicación, archivos y acceso a datos. |
| `packages/db` | Prisma                  | Esquema, configuración, migraciones, seed y creación compartida del cliente.                |
| PostgreSQL 16 | Docker Compose en local | Persistencia relacional y restricciones durables.                                           |

### Invariantes de arquitectura

- Mantener la dirección `web -> HTTP -> API -> database`; `apps/web` no importa Prisma ni accede a PostgreSQL.
- Acceder a Prisma desde la API mediante `DbService`; `packages/db` conserva la propiedad del cliente y del ciclo de migraciones.
- Validar entradas HTTP en DTOs y aplicar reglas de dominio en servicios de la API.
- Usar restricciones de base de datos para invariantes durables y transacciones de servicio para reglas entre registros o ciclos de vida.
- Mantener separados los controladores públicos y administrativos cuando el módulo ya usa esa frontera.
- Preservar los sufijos `.js` en imports relativos de TypeScript ESM.
- No introducir un paquete compartido hasta que exista duplicación real entre paquetes.

## Estado actual: capacidades

| Módulo       | Estado actual comprobado                                                                                                                                                                      | Evidencia principal                                                                                                                                                                          |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth         | Login, access token y refresh token en cookies `httpOnly`, rotación, logout, revocación y control de responsable `ACTIVE`.                                                                    | [`apps/api/src/auth`](../apps/api/src/auth)                                                                                                                                                  |
| Landing      | Lectura pública y edición administrativa de campos base. La API y el modelo soportan héroe y salida destacada, pero la interfaz no los administra.                                            | [`landing.service.ts`](../apps/api/src/landing/landing.service.ts), [`LandingSettingsPage.tsx`](../apps/web/src/admin/LandingSettingsPage.tsx)                                               |
| Posts        | CRUD administrativo, publicación, archivo, sanitización, descargas, destacados y lectura pública. El formulario permite cargar, reemplazar y desasociar portada y descargas.                  | [`posts.service.ts`](../apps/api/src/posts/posts.service.ts), [`PostFormPage.tsx`](../apps/web/src/admin/PostFormPage.tsx)                                                                   |
| Outings      | Gestión administrativa, publicación, archivo, lectura pública, likes anónimos y carga o reemplazo de imagen principal, croquis y plan. La interfaz no permite quitar asociaciones existentes. | [`outings.service.ts`](../apps/api/src/outings/outings.service.ts), [`OutingFormPage.tsx`](../apps/web/src/admin/OutingFormPage.tsx), [`outingsApi.ts`](../apps/web/src/admin/outingsApi.ts) |
| Responsibles | API para crear, listar, editar `displayName`, cambiar estado y restablecer contraseña. La interfaz solo crea, lista y cambia estado.                                                          | [`apps/api/src/responsibles`](../apps/api/src/responsibles), [`ResponsiblesPage.tsx`](../apps/web/src/admin/ResponsiblesPage.tsx)                                                            |
| Verses       | API pública y administrativa, historial y panel para crear, listar y eliminar. Vite reenvía `/verses/...` sin reescritura al `API_TARGET` durante el desarrollo local.                        | [`apps/api/src/verses`](../apps/api/src/verses), [`versesApi.ts`](../apps/web/src/admin/versesApi.ts), [`vite.config.ts`](../apps/web/vite.config.ts)                                        |
| Files        | Carga autenticada, validación, miniaturas, entrega pública y eliminación. No existe endpoint para listar archivos ni pantalla independiente.                                                  | [`apps/api/src/file-module`](../apps/api/src/file-module), [`FileUploadWidget.tsx`](../apps/web/src/admin/FileUploadWidget.tsx)                                                              |

## Decisiones e invariantes

| Tema                  | Invariante o regla vigente                                                                                            | Mecanismo                                                            |
| --------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Landing singleton     | Existe una única configuración con `id = 1`.                                                                          | Upsert en `LandingService`.                                          |
| Salida destacada      | `LandingSettings.featuredOutingId` admite una selección; la respuesta pública solo la incluye si está `PUBLISHED`.    | Restricción `@unique` y filtro de servicio.                          |
| Posts destacados      | Hay tres slots fijos y un post no puede ocupar más de uno. El cuarto intento se rechaza; no hay reemplazo automático. | `FeaturedPostSlot`, índices únicos y validación de servicio.         |
| Contenido público     | Posts, salidas y versículos públicos deben estar `PUBLISHED`.                                                         | Consultas y proyecciones públicas.                                   |
| Likes de salidas      | Cada combinación `outingId` + `visitorHash` es única; no se persiste identidad pública ni IP sin procesar.            | Restricción compuesta y actualización transaccional de `likesCount`. |
| Versículo vigente     | Es el último `PUBLISHED` por `publishedAt`; la fecha de negocio se deriva con zona `America/Lima`.                    | Servicio de versículos e índice por estado y fecha.                  |
| Archivos              | El binario vive en almacenamiento local y `FileAsset` conserva metadatos, categoría, ruta y URL.                      | `FileService`, validación por categoría y contención de rutas.       |
| Contenido enriquecido | El HTML de posts se sanitiza en servidor y en cliente.                                                                | `sanitize-html` y DOMPurify.                                         |
| Responsable inactivo  | No puede iniciar sesión, refrescar sesión ni atravesar rutas protegidas; al desactivarlo se revocan sus sesiones.     | Guards, auth service y servicio de responsables.                     |

## Seguridad y contratos HTTP

- La configuración se valida antes de inicializar la base de datos. Son obligatorias `NODE_ENV`, `PORT`, `DATABASE_URL`, `JWT_SECRET` y `VISITOR_HASH_SECRET`.
- Las cookies de autenticación son `httpOnly`, usan `SameSite=Lax` y activan `secure` en producción.
- Las mutaciones requieren que `Origin` coincida con `API_ORIGIN`; la configuración actual admite un solo origen.
- El `ValidationPipe` global aplica `whitelist` y `transform`.
- El filtro global normaliza errores como `{ statusCode, message, timestamp, path }` y oculta stacks no controlados.
- Los archivos aceptan JPEG, PNG, WebP, GIF y, según la categoría, PDF. `MAX_FILE_SIZE` tiene un valor predeterminado de 10 MiB.
- Los archivos entregados por `GET /files/:id` son públicos. No deben usarse para información privada.

### Scaffold temporal de validación

- **Estado actual:** `ValidationProofModule` está registrado en `AppModule` y expone `POST /echo` sin `AuthGuard` para demostrar el `ValidationPipe` global ([módulo](../apps/api/src/common/validation-proof/validation-proof.module.ts), [controlador](../apps/api/src/common/validation-proof/echo.controller.ts), [registro](../apps/api/src/app.module.ts)). Es scaffolding técnico, no un contrato de producto.
- **Invariante:** una release desplegable no debe exponer este endpoint de prueba en producción.
- **Brecha objetivo:** antes de la primera release se debe retirar `ValidationProofModule` de `AppModule` o condicionar su registro para que `NODE_ENV=production` no cree la ruta. La evidencia de release debe comprobar que `POST /echo` responde `404` en la configuración de producción.

## Almacenamiento de archivos

**Estado actual:** el almacenamiento local es una decisión válida para desarrollo, no una garantía de durabilidad en producción.

- Los controles de carga están integrados en posts y salidas; gestionar el héroe deberá reutilizar la misma frontera de `FileService` y validar la categoría `LANDING_HERO`.
- No hay API de listado general, por lo que todavía no existe una fuente completa para una biblioteca de archivos.
- `DELETE /files/:id` elimina metadatos y binarios, pero una interfaz global de borrado requiere antes políticas de archivos en uso, huérfanos, retención y recuperación.
- **Brecha objetivo:** la topología de producción debe montar almacenamiento persistente o adoptar otro proveedor sin romper las referencias de `FileAsset`.

## Estado actual y brecha objetivo: operación

| Área                   | Estado actual                                                        | Brecha para producción                                                                        |
| ---------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Desarrollo local       | PostgreSQL 16 mediante Compose, migraciones Prisma y seed repetible. | No aplica como topología de producción.                                                       |
| Calidad                | Scripts raíz para Prettier, ESLint, typecheck, Vitest y build web.   | Falta CI/CD que los ejecute y conserve evidencia.                                             |
| API                    | `start:dev`, typecheck y pruebas unitarias.                          | Faltan scripts de build e inicio de producción.                                               |
| Salud                  | `GET /health` informa proceso, uptime y entorno.                     | No comprueba conectividad con PostgreSQL ni almacenamiento.                                   |
| Persistencia           | PostgreSQL y `UPLOAD_DIR` local.                                     | Faltan almacenamiento persistente, copias de seguridad, restauración y política de retención. |
| Verificación integrada | Pruebas por paquete.                                                 | Falta un E2E ejecutable sobre web, API, base de datos y archivos.                             |

Los comandos y prerrequisitos detallados se mantienen en [`AGENTS.md`](../AGENTS.md), no se duplican aquí.

## Brechas objetivo conocidas

| Prioridad         | Brecha                                                                                                                                       | Riesgo                                                                               |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Alta              | `CreatePostDto` y `UpdatePostDto` aceptan `status: PUBLISHED`, pero esa ruta no establece `publishedAt`; puede eludir `publish()`.           | Contenido publicado con fecha nula y transición inconsistente.                       |
| Alta              | La interfaz maneja etiquetas de descargas, pero la API solo persiste `downloadIds`.                                                          | El contrato `downloadLabels` se pierde al guardar.                                   |
| Alta              | La prevención de auto-desactivación existe en la interfaz, no como invariante de API; tampoco se protege al último responsable activo.       | Bloqueo administrativo o bypass mediante HTTP directo.                               |
| Media             | `skip` y `take` carecen de validación numérica y límites explícitos; las consultas públicas no tienen una estrategia uniforme de paginación. | Consultas costosas o contratos ambiguos.                                             |
| Media             | Fechas de salidas, categorías de archivos y detalles de errores requieren validación y contratos más estrictos.                              | Inconsistencias de datos y diagnósticos insuficientes.                               |
| Media             | No se configura CORS ni `trust proxy`; `API_ORIGIN` admite un solo origen.                                                                   | Fallos o supuestos incorrectos detrás de proxy y despliegues con orígenes separados. |
| Alta para release | `POST /echo` sigue registrado como scaffold público de validación.                                                                           | Exposición de una ruta sin contrato de producto en producción.                       |
| Alta para release | Faltan build/start de API, topología, almacenamiento persistente, copias de seguridad, health dependiente de DB, CI/CD y E2E.                | No existe una ruta de despliegue recuperable y verificable.                          |

Estas brechas se priorizan como slices en la [hoja de ruta](./development-roadmap.md).
