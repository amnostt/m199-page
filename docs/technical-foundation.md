# Fundamento técnico de Misión 1-99

Este documento resume la arquitectura que existe hoy, las capacidades comprobadas y las brechas conocidas. No presenta un objetivo como si ya estuviera implementado.

**Última verificación:** 2026-07-29. Debe actualizarse cuando cambien la arquitectura, la configuración efectiva, el esquema, las migraciones, los contratos o las capacidades verificadas.

Para afirmar el estado actual prevalecen el código, la configuración, el esquema, las migraciones y las pruebas. Los comandos y las reglas de contribución se mantienen únicamente en [`AGENTS.md`](../AGENTS.md).

## Arquitectura actual

```text
apps/web ──HTTP──> apps/api ──DbService──> packages/db ──Prisma──> PostgreSQL
```

| Área          | Responsabilidad actual                                                                                                               | Evidencia principal                                                                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web`    | Runtime Astro con páginas públicas SSR explícitas. React 19 queda acotado a la aplicación administrativa y al botón de like público. | [`src/pages`](../apps/web/src/pages), [`admin.astro`](../apps/web/src/pages/admin.astro), [`LikeButton.tsx`](../apps/web/src/components/LikeButton.tsx) |
| `apps/api`    | API NestJS para autenticación, validación, reglas de aplicación, archivos y persistencia.                                            | [`app.module.ts`](../apps/api/src/app.module.ts)                                                                                                        |
| `packages/db` | Esquema Prisma, migraciones, seed y creación compartida del cliente.                                                                 | [`packages/db`](../packages/db)                                                                                                                         |
| PostgreSQL 16 | Persistencia relacional local mediante Docker Compose.                                                                               | [`compose.yml`](../compose.yml)                                                                                                                         |

Las fronteras obligatorias —dirección de dependencias, uso de `DbService`, DTOs, transacciones e imports ESM— están definidas en `AGENTS.md` y no se repiten aquí.

## Capacidades comprobadas

| Área          | Estado actual                                                                                                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Autenticación | Login, access token y refresh token en cookies `httpOnly`, rotación, logout, revocación y bloqueo de responsables `INACTIVE`.                                                         |
| Sitio público | Landing, listado y detalle de publicaciones, listado y detalle de salidas, 404 y likes como rutas Astro explícitas; no existe una ruta pública para el historial de versículos.       |
| Landing       | Lectura pública y edición administrativa de texto, contacto, video, héroe y salida destacada. La imagen del héroe se puede cargar o reemplazar, pero no desasociar desde la interfaz. |
| Publicaciones | CRUD administrativo, transiciones de publicación y archivo, portada, descargas etiquetadas y ordenadas, hasta tres destacados y lectura pública sanitizada.                           |
| Salidas       | Gestión administrativa, publicación, archivo, lectura pública, likes anónimos y archivos asociados. La interfaz permite cargar o reemplazar archivos, pero no desasociarlos.          |
| Responsables  | La API permite crear, listar, editar `displayName`, cambiar estado y restablecer contraseña. La interfaz solo crea, lista y cambia estado.                                            |
| Versículos    | API pública y administrativa con historial; el panel permite crear, listar y eliminar. La landing muestra el publicado más reciente.                                                  |
| Archivos      | Carga autenticada, validación por categoría y firma, miniaturas, entrega pública y eliminación. No hay listado general ni pantalla independiente.                                     |

## Invariantes vigentes

| Tema                     | Regla protegida                                                                                                                           |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Landing                  | Existe una sola configuración con `id = 1`. Solo una salida `PUBLISHED` puede aparecer como destacada.                                    |
| Publicaciones destacadas | Existen tres lugares fijos; un cuarto intento se rechaza y no reemplaza contenido automáticamente.                                        |
| Contenido público        | Las consultas públicas filtran contenido `PUBLISHED`; las publicaciones también requieren `publishedAt`.                                  |
| Likes de salidas         | La combinación `outingId` + `visitorHash` es única y no guarda la IP sin procesar.                                                        |
| Versículo vigente        | Es el último `PUBLISHED` por `publishedAt`; la fecha de negocio usa `America/Lima`.                                                       |
| Archivos                 | `FileService` controla categoría, tamaño, firma, rutas, metadatos, rollback y eliminación. Los binarios de `GET /files/:id` son públicos. |
| Contenido enriquecido    | El HTML de publicaciones se sanitiza en servidor y cliente.                                                                               |
| Responsable inactivo     | No puede iniciar ni refrescar sesión; al desactivarlo se revocan sus sesiones.                                                            |

La [identidad de marca](./brand.md) gobierna el mensaje y la experiencia visual, pero no prueba por sí sola que la interfaz la implemente.

## Seguridad y runtime

- La API valida `NODE_ENV`, `PORT`, `DATABASE_URL`, `JWT_SECRET` y `VISITOR_HASH_SECRET` antes de inicializar la base de datos.
- Las mutaciones protegidas exigen una sesión activa y un `Origin` igual a `API_ORIGIN`.
- El `ValidationPipe` global aplica `whitelist` y `transform`; el filtro global normaliza errores sin exponer stacks inesperados.
- El runtime web dispone de build y start para Astro Node. La API solo dispone de ejecución de desarrollo, typecheck y pruebas; todavía no tiene build/start de producción.
- El almacenamiento de archivos es local. Es adecuado para desarrollo, pero no garantiza durabilidad en producción.

## Brechas técnicas conocidas

- `ValidationProofModule` sigue registrado y expone `POST /echo`; una release no debe publicar ese scaffold.
- `GET /health` informa proceso y entorno, pero no comprueba PostgreSQL ni almacenamiento.
- La API no impide todavía la auto-desactivación ni desactivar al último responsable activo.
- La paginación, los límites, algunas fechas y ciertos contratos de archivo necesitan validación más estricta.
- Faltan topología de producción, persistencia de archivos, copias de seguridad y restauración verificadas, CI/CD y E2E integrado.

La prioridad y la condición de cierre de estas brechas se mantienen en la [hoja de ruta](./development-roadmap.md).
