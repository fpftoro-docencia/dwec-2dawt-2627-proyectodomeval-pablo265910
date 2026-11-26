# Reglas del Asistente para GameVault

1. **Lectura obligatoria del contexto**: Al iniciar cualquier interacción o tarea en este workspace, lee SIEMPRE primero el archivo `.contexto-agente.md` para sincronizar el estado actual de Trello, las decisiones técnicas y las reglas activas.
2. **Commits progresivos y frecuentes**: Realiza commits pequeños, atómicos y frecuentes a medida que avanzas en una tarea ("poco a poco"). NUNCA hagas un único commit gigante por tarea. Sigue Conventional Commits.
3. **Pull Requests con permiso previo**: Pregunta y pide SIEMPRE confirmación y permiso explícito al usuario antes de abrir, crear o fusionar cualquier Pull Request (`gh pr create`, fusiones a `main`, etc.).
4. **Documentación del contexto**: El archivo `.contexto-agente.md` se mantiene en el repositorio como documentación técnica y de trazabilidad compartida del proyecto. Manténlo siempre actualizado tras cada tarea.
5. **Restricción de Bootstrap**: Está terminantemente prohibido usar el JavaScript de Bootstrap; solo se utilizan sus hojas de estilo CSS.
