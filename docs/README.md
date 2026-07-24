# Documentación de Misión 1-99

Este índice organiza las fuentes que gobiernan el trabajo. Ante una contradicción sobre el estado implementado, se aplica la precedencia definida en el [fundamento técnico](./technical-foundation.md).

## Ruta de lectura recomendada

1. [Resumen ejecutivo](./executive-summary.md): propósito, actores, alcance y criterios de éxito.
2. [Fundamento técnico](./technical-foundation.md): arquitectura actual, invariantes, evidencia y brechas objetivo.
3. [Hoja de ruta](./development-roadmap.md): prioridad, estado y dependencias de los slices.
4. [Glosario](./glossary.md): definiciones canónicas para interpretar los documentos anteriores.

## Guías operativas

- [Guía operativa del landing Astro](./astro-landing-deployment.md): contrato de runtime, dispatch ordenado de Caddy, monitoreo de 503 y rollback sin ejecutar cambios de producción.
- [Local development database seed](./local-development-seed.md): deterministic seed contents, known local administrator, and guarded reset workflow.

## Fuentes normativas

| Fuente                                            | Gobierna                                                                          |
| ------------------------------------------------- | --------------------------------------------------------------------------------- |
| [Resumen ejecutivo](./executive-summary.md)       | Propósito, actores, alcance y no objetivos del MVP.                               |
| [Fundamento técnico](./technical-foundation.md)   | Arquitectura vigente, invariantes técnicas, estado comprobado y brechas objetivo. |
| [Hoja de ruta](./development-roadmap.md)          | Prioridad, estado y dependencias de capacidades y slices.                         |
| [Glosario](./glossary.md)                         | Significado canónico de términos compartidos.                                     |
| [Guía operativa del landing Astro](./astro-landing-deployment.md) | Runtime Node, dispatch Caddy, monitoreo y rollback del landing migrado. |
| [`AGENTS.md`](../AGENTS.md)                       | Reglas de contribución, comandos y límites del repositorio.                       |
