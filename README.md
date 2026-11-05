# GameVault (Gestor de Biblioteca y Backlog de Videojuegos)

<!-- Sprint 2: la insignia de tu workflow, con tu organización y tu repositorio. -->
![Integración continua](https://github.com/fpftoro-docencia/dwec-2dawt-2627-proyectodomeval-pablo265910/actions/workflows/ci.yml/badge.svg)

<!-- Completa cada sección a medida que avanzas en los sprints. Borra los comentarios como este
     cuando termines. Este README es también la portada de la documentación que genera `npm run docs`.
     No cambies los títulos de las secciones (##): la corrección los busca por su nombre. -->

## Mi proyecto

**GameVault** es una aplicación web de gestión (CRUD) para que coleccionistas y jugadores organicen y controlen su colección personal de videojuegos, tanto físicos como digitales. Permite catalogar títulos, registrar horas jugadas, controlar préstamos a conocidos con datos de contacto y gestionar DLCs o expansiones adquiridas. Toda la persistencia es local en el navegador del usuario (`localStorage` por usuario y `sessionStorage` para la sesión), sin dependencias de librerías JS externas ni APIs remotas, maquetada exclusivamente con el CSS de Bootstrap.

**Web publicada:** https://gamevault-dwec.vercel.app

### La entidad

| Campo | Control | Obligatorio | Regla de validación | Mensaje si no se cumple |
|-------|---------|:-----------:|---------------------|-------------------------|
| Código EAN-13 | `<input type="text">` | Sí | Longitud exacta de 13 dígitos numéricos (`/^\d{13}$/`) y algoritmo de control ponderado módulo 10. | «El código de barras debe tener 13 dígitos y un dígito de control EAN-13 válido.» |
| Título del juego | `<input type="text">` | Sí | Texto entre 2 y 100 caracteres. | «El título del videojuego es obligatorio (entre 2 y 100 caracteres).» |
| Plataforma | `<select>` | Sí | Debe seleccionarse una opción válida: *PC*, *PlayStation 5*, *Xbox Series X*, *Nintendo Switch* o *Retro*. | «Selecciona una plataforma válida de la lista.» |
| Fecha de adquisición | `<input type="date">` | Sí | Fecha válida no posterior al día actual (`max = hoy` asignado por JS). | «La fecha de adquisición es obligatoria y no puede ser posterior a hoy.» |
| Horas jugadas | `<input type="number">` | Sí | Número entero mayor o igual a 0. | «Las horas jugadas deben ser un número igual o superior a 0.» |
| Formato | `<input type="radio">` | Sí | Selección exclusiva entre *Físico* o *Digital*. | «Debes seleccionar el formato del juego (Físico o Digital).» |
| ¿Está prestado? *(Condicional)* | `<input type="checkbox">` | No | Casilla booleana. Si se activa, muestra y habilita los campos de Nombre del prestatario y Teléfono. | — |
| Nombre del prestatario *(Condicional)* | `<input type="text">` | Sí (si prestado) | Obligatorio si está prestado; longitud entre 2 y 50 caracteres. | «Indica el nombre de la persona a quien le prestaste el juego.» |
| Teléfono de contacto *(Condicional)* | `<input type="tel">` | Sí (si prestado) | Número de teléfono móvil español válido (`/^[67]\d{8}$/`). | «Introduce un teléfono móvil válido de 9 dígitos que comience por 6 o 7.» |
| DLCs / Expansiones *(Grupo dinámico)* | `<template>` (0 a 3 filas) | No | De 0 a 3 elementos. Cada fila clonada requiere Título del DLC (`text`) y Estado (`select`: *Pendiente*, *Jugando*, *Completado*). | «Cada DLC añadido debe incluir un título válido y su estado.» |

### El registro de usuarios

| Campo | Control | Regla | Mensaje |
|---|---|---|---|
| Nombre de usuario | `<input type="text">` | Longitud entre 3 y 15 caracteres alfanuméricos (`/^[a-zA-Z0-9_-]{3,15}$/`) y no ocupado previamente. | «El usuario debe tener entre 3 y 15 caracteres alfanuméricos y no estar ocupado.» |
| Correo electrónico | `<input type="email">` | Formato estándar de correo electrónico válido. | «Introduce una dirección de correo electrónico válida.» |
| Contraseña | `<input type="password">` | Mínimo 8 caracteres, al menos una minúscula (`\p{Ll}`), una mayúscula (`\p{Lu}`) y un número. | «La contraseña debe tener al menos 8 caracteres, una minúscula, una mayúscula y un número.» |
| Repetir contraseña | `<input type="password">` | Coincidencia exacta con el campo Contraseña. | «Las contraseñas no coinciden.» |
| Aceptación de condiciones | `<input type="checkbox">` | Casilla obligatoria (`required`). | «Debes aceptar las condiciones de uso para continuar.» |

### Páginas

| Página | Acceso | Qué hace |
|---|---|---|
| `index.html` | Pública | Inicio de sesión. Calcula el resumen criptográfico SHA-256 (`resumirClave`), evita el doble envío y redirige al listado si ya existe sesión activa. |
| `registro.html` | Pública | Registro de nuevos usuarios con validación reactiva de los requisitos de contraseña (`\p{Ll}`, `\p{Lu}`). El primer usuario adquiere rol de Administrador. Inicia sesión automáticamente y redirige con aviso. |
| `listado.html` | Usuarios | Catálogo y control de backlog del usuario. Renderizado mediante `<template>`, buscador con *debounce* (insensible a tildes/mayúsculas), paginación dinámica (`?pagina=1`) y borrado con modal nativo `<dialog>`. |
| `ficha.html` | Usuarios | Alta (`ficha.html`) o edición (`ficha.html?id=...`). Validación accesible en tiempo real (`blur` en fase de captura, `aria-invalid`, `aria-describedby`), campos condicionales y grupo dinámico con `<template>`. |
| `usuarios.html` | Administradores | Zona de administración protegida. Listado de usuarios con buscador y paginación. Conmutador de roles (usuario / administrador) con protección contra auto-revocación del propio rol. |

## Arquitectura y módulos

<!-- 1. Un diagrama (Mermaid) de tus módulos y de qué usa cada uno.
     2. Tabla con cada módulo: qué hace, si usa el DOM y qué exporta.
     3. Cómo están hechos tus objetos (funciones fábrica o clases) y qué patrones de diseño usas
        (al menos dos): dónde y por qué.
     4. Cómo reciben las páginas lo que necesitan (almacenamiento, sesión, navegación) y por qué así
        se pueden probar.
     5. Qué documenta tu JSDoc y cómo se genera la documentación (`npm run docs`). -->

## Cómo ejecutarlo

<!-- Cómo abrir el proyecto en el Dev Container y ver la web, y cómo pasar los tests, la cobertura,
     las pruebas de extremo a extremo, ESLint y Prettier, generar la documentación y preparar la web
     publicable (`npm run build`). -->

## Almacenamiento y sesión

<!-- 1. Tabla con cada clave que usas: dónde está (localStorage o sessionStorage), qué guarda y un
        ejemplo de su contenido.
     2. Por qué cada dato va donde va.
     3. Cómo guardas el rol y cómo proteges las páginas por sesión y por rol.
     4. Por qué este inicio de sesión NO es seguro: qué podría hacer alguien con las DevTools y cómo
        se hace en una aplicación real. -->

## Funcionalidad y formularios

<!-- Una subsección por parte de la aplicación (sesión y registro, listado y paginación, ficha,
     zona de administración): qué hace y cómo lo has resuelto. Incluye:
     - cómo lees los datos (FormData: get, getAll), cómo creas y numeras el grupo dinámico, cómo
       funciona el campo condicional, qué atributos pones desde el código y cómo rellenas el
       formulario al editar;
     - la validación: cuándo validas cada campo, de dónde salen los mensajes (validity,
       setCustomValidity y tus validadores), qué haces para que los errores sean accesibles y cómo
       evitas el doble envío;
     - las expresiones regulares: tabla con cada una, en qué validador está, qué acepta (un ejemplo)
       y qué significan sus partes y sus flags; qué parte de la validación hace la expresión y qué
       parte el código. -->

## Eventos

### Eventos en el HTML

<!-- Qué consigues con el HTML sin escribir oyentes (envío con Intro, novalidate y los atributos de
     validación, dialog, label for…) y por qué no usas atributos on…. -->

### Tipos de eventos

<!-- Tabla con los eventos que usas y por qué has elegido cada uno frente a otros parecidos
     (submit frente a click, input frente a change, blur frente a focusout…). -->

### Propagación

<!-- 1. Tabla con TODOS tus oyentes: evento, dónde lo registras, en qué fase actúa
        (captura, objetivo o burbuja) y para qué.
     2. Dónde usas la delegación y qué ganas con ella.
     3. Tu uso de la captura y por qué no servía la burbuja.
     4. Si usas stopPropagation, por qué. -->

## Pruebas y cobertura

<!-- 1. Tabla de la pirámide: tipo (unitario, de integración o de extremo a extremo), fichero,
        qué prueba y cuántos tests tiene. Por qué cada cosa se prueba en ese nivel y no en otro.
     2. Cómo simulas al usuario (eventos, requestSubmit), los servicios (AlmacenFalso, el resumen
        de la contraseña, la navegación) y el tiempo (temporizadores falsos).
     3. Cómo se ejecutan las mismas pruebas de extremo a extremo con serve y contra la web
        desplegada (BASE_URL).
     4. Pega la salida de `npm run coverage` (con el resumen de la cobertura) y de `npm run e2e`.
        Explica qué umbral has puesto, a qué ficheros y qué queda sin probar y por qué. -->

## Integración continua

### ESLint y Prettier

<!-- Sprint 1. Las reglas que has añadido a eslint.config.js (al menos tres): qué comprueba cada una
     y por qué la quieres. Pega la salida de `npm run lint` y de `npm run format:check`. Cuenta un
     problema real que encontraras con el depurador de las DevTools y cómo lo resolviste. -->

### El workflow

<!-- Sprints 1 y 2. Qué hace ci.yml: cuándo se ejecuta, la tabla de sus trabajos y por qué están en
     ese orden, qué artefactos sube y para qué sirven, y qué hace concurrency. -->

| Trabajo | Espera a | Pasos | Artefacto |
|---------|----------|-------|-----------|
| `Calidad` | — | | — |
| `Tests` | | | |
| `E2E` | | | |

**Ejecución en verde con sus artefactos:** <!-- enlace -->

## Despliegue continuo

<!-- Sprint 3. 1. Cómo has configurado Vercel: build, carpeta de salida, protección de los
        despliegues y Deployment Checks (qué comprobaciones exige y por qué).
     2. Qué hacen despliegue.yml y release.yml, y qué comprueba tu prueba de humo.
     3. El camino de un cambio, con tus palabras: desde tu git push en una rama hasta que se ve en
        la web, qué se comprueba en cada paso y qué pasa si algo falla. -->

**Web publicada:** <!-- https://<proyecto>.vercel.app -->

| Evidencia | Enlace | Captura |
|-----------|--------|---------|
| *Pull request* con su vista previa y `E2E desplegado` | <!-- enlace a la pull request --> | `img/pr-comprobaciones.png` |
| Versión retenida por Vercel | <!-- enlace a la ejecución en rojo --> | `img/vercel-retenido.png` |
| Release `v1.0` | <!-- enlace a la Release --> | — |

<!-- Qué rompiste a propósito para la versión retenida, qué viste en Vercel y cómo comprobaste que la
     web seguía con la versión anterior. -->

## Organización del trabajo

### Definición de Hecho

Para dar por terminada una tarea y moverla a la columna **«Hecho»** en el tablero de Trello, debe cumplir obligatoriamente todas las condiciones verificables siguientes:

- [x] **Funcionalidad completa:** El código implementa todos los requisitos técnicos y de negocio de la tarea respetando el contrato de la aplicación sin librerías externas de JS.
- [x] **Semántica y Accesibilidad:** Estructura HTML basada en elementos semánticos estándar (`<dialog>`, `<template>`, `<select>`, `<button>`), con gestión accesible de estados e interacción (`role="status"`, `aria-invalid`, `aria-describedby`, `aria-current="page"`).
- [x] **Calidad de código (Linting & Formato):** El código cumple con las reglas configuradas en ESLint (incluidas las 3 reglas adicionales) y Prettier; `npm run lint` y `npm run format:check` se ejecutan sin errores ni advertencias.
- [x] **Pruebas automatizadas en verde:** Se han desarrollado los tests unitarios o de integración correspondientes con `AlmacenFalso` y pasan limpiamente al ejecutar `npm test`.
- [x] **Cobertura verificada:** Las funciones lógicas puras (validadores y paginación) mantienen una cobertura de líneas igual o superior al 90% (`npm run coverage`).
- [x] **Empaquetado validado:** El script de compilación `npm run build` genera la versión distribuible en la carpeta `dist/` sin errores.
- [x] **Control de versiones ordenado:** El desarrollo se realiza en una rama propia de funcionalidad con commits semánticos y concisos.
- [x] **Integración Continua aprobada:** La Pull Request asociada cuenta con todos los checks del workflow de GitHub Actions (`ci.yml`) en verde antes de fusionarse a `main`.
- [x] **Sincronización del tablero:** La tarjeta correspondiente en Trello se ha desplazado a la columna «Hecho».

### Sprints

| Sprint | *Tag* | Qué incluye | Reflexión |
|--------|-------|-------------|-----------|
| 1 | `v0.1` | Usuarios, sesión en `sessionStorage`, roles con primer usuario administrador, registro con validador reactivo de contraseña (`\p{Ll}`, `\p{Lu}`), login con SHA-256 (`resumirClave`), maquetación base de las 5 páginas, sistema de eventos propios `aviso`, tests unitarios con `AlmacenFalso` y workflow CI paso 1 (calidad y tests). | *Pendiente de cierre de Sprint 1.* |
| 2 | `v0.2` | Entidad Videojuego, CRUD `juegos.js` por usuario, validadores con algoritmo EAN-13, SKU y teléfono, campo condicional de préstamo, grupo dinámico de DLCs (0 a 3) clonado de `<template>`, catálogo con buscador con debounce y modal `<dialog>`, paginación pura, zona de administración de usuarios, delegación de eventos, tests de integración y E2E Playwright con cobertura >= 90% y CI completo. | *Pendiente de cierre de Sprint 2.* |
| 3 | `v1.0` | Despliegue continuo en Vercel, vistas previas automáticas en Pull Requests probadas con Playwright (`BASE_URL`), prueba de humo en producción (`humo.spec.js`), automatización de GitHub Releases con archivo ZIP en tags `v*`, documentación JSDoc completa y evidencias finales. | *Pendiente de cierre de Sprint 3.* |

**Tablero de Trello:** [GameVault - Tablero de Seguimiento (DWEC)](https://trello.com/b/b1iXcn0Q/gamevault-proyecto-dom-dwec) *(compartido con el profesor)*

**Blog del proyecto:** [blog/README.md](blog/README.md) <!-- dificultades y problemas conceptuales de cada sprint -->

### Ramas y versiones

| Rama | Funcionalidad | *Pull request* |
|------|---------------|----------------|
| `definicion-proyecto` | [S1-01] Configuración inicial, temática GameVault, arquitectura de páginas y Definición de Hecho (DoD) | — |

**Estrategia de integración:** Se utiliza integración mediante **Merge Commits** (`git merge --no-ff`) para mantener la trazabilidad histórica de cada rama y preservar el contexto exacto de cada Pull Request y sus revisiones asociadas en el repositorio.

**Política de `.gitignore`:** Se excluyen dependencias de paquetes (`node_modules/`), artefactos de build (`dist/`), informes de cobertura (`coverage/`), reportes y trazas de Playwright (`playwright-report/`, `test-results/`), variables de entorno locales (`.env*`) y archivos de configuración del sistema operativo (`.DS_Store`, `Thumbs.db`), ya que son archivos generados en local, volátiles o sensibles que no deben formar parte del repositorio compartido.

**Versión de entrega:** `v1.0`
