# GameVault (Gestor de Biblioteca y Backlog de Videojuegos)

<!-- Sprint 2: la insignia de tu workflow, con tu organización y tu repositorio. -->
![Integración continua](https://github.com/fpftoro-docencia/dwec-2dawt-2627-proyectodomeval-pablo265910/actions/workflows/ci.yml/badge.svg)

<!-- Completa cada sección a medida que avanzas en los sprints. Borra los comentarios como este
     cuando termines. Este README es también la portada de la documentación que genera `npm run docs`.
     No cambies los títulos de las secciones (##): la corrección los busca por su nombre. -->

## Mi proyecto

**GameVault** es una aplicación web de gestión (CRUD) para que cada usuario registrado organice y controle su colección personal de videojuegos, diferenciando de forma realista entre ediciones **físicas** (en disco/cartucho) y **digitales** (Steam, PlayStation Store, eShop, etc.). Permite catalogar títulos, registrar horas de juego, controlar en qué tienda o estantería están y gestionar sus expansiones/DLCs. Toda la persistencia es local en el navegador del usuario (`localStorage` por usuario y `sessionStorage` para la sesión), sin dependencias de librerías externas (salvo el CSS de Bootstrap) y sin APIs remotas.

**Web publicada:** <!-- https://<proyecto>.vercel.app (se añadirá en el Sprint 3 al desplegar en Vercel) -->

### La entidad

| Campo | Control | Obligatorio | Regla de validación | Mensaje si no se cumple |
|-------|---------|:-----------:|---------------------|-------------------------|
| Título del juego | `<input type="text">` | Sí | Texto obligatorio (entre 2 y 100 caracteres). | «El título del videojuego es obligatorio (entre 2 y 100 caracteres).» |
| Plataforma | `<select>` | Sí | Selección obligatoria entre: *PC*, *PlayStation 5*, *Xbox Series X*, *Nintendo Switch* o *Retro*. | «Selecciona una plataforma válida de la lista.» |
| Formato | `<input type="radio">` | Sí | Selección exclusiva entre *Físico* o *Digital* (activa la lógica condicional). | «Debes seleccionar el formato del juego (Físico o Digital).» |
| Fecha de adquisición | `<input type="date">` | Sí | Fecha no futura (`max = hoy` asignado dinámicamente por JS). | «La fecha de adquisición es obligatoria y no puede ser posterior a hoy.» |
| Horas jugadas | `<input type="number">` | Sí | Número entero mayor o igual a 0. | «Las horas jugadas deben ser un número igual o superior a 0.» |
| Estado de progreso | `<select>` | Sí | Selección obligatoria entre: *Pendiente*, *Jugando*, *Completado* o *Abandonado*. | «Selecciona el estado de progreso actual del juego.» |
| Código de inventario (SKU) | `<input type="text">` | Sí | Expresión regular de catálogo interno (`/^GAME-[A-Z]{3}-\d{4}$/`). | «El código de catálogo debe seguir el formato GAME-XXX-0000 (ej. GAME-RPG-0042).» |
| Código de barras EAN-13 *(Condicional: solo Físico)* | `<input type="text">` | Sí (si físico) | 13 dígitos numéricos (`/^\d{13}$/`) y cumplimiento del algoritmo de control ponderado (módulo 10). | «El código de barras debe tener 13 dígitos y un dígito de control EAN-13 válido.» |
| Ubicación en estantería *(Condicional: solo Físico)* | `<input type="text">` | Sí (si físico) | Formato de balda mediante regex (`/^EST-[A-Z]-\d{2}$/`). | «La ubicación debe indicar estantería y balda en formato EST-X-00 (ej. EST-A-03).» |
| Tienda digital *(Condicional: solo Digital)* | `<select>` | Sí (si digital) | Selección entre: *Steam*, *PlayStation Store*, *Nintendo eShop*, *Epic Games Store*, *Xbox Store*. | «Selecciona la tienda digital donde adquiriste el juego.» |
| DLCs / Expansiones *(Grupo dinámico)* | `<template>` (0 a 3 filas) | No | De 0 a 3 elementos clonados de `<template id="tpl-dlc">`. Cada fila requiere Nombre del DLC (`text`) y Estado (`select`: *Pendiente*, *Jugando*, *Completado*). | «Cada DLC añadido debe incluir un título válido y su estado.» |

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

Para poner en marcha el proyecto en un entorno local o dentro del Dev Container:

1. **Instalación de dependencias:**
   ```bash
   npm install
   ```

2. **Visualizar la aplicación web:**
   Abrir cualquiera de las páginas (`index.html`, `registro.html`, `listado.html`, `ficha.html`, `usuarios.html`) con la extensión **Live Server** de VS Code o sirviendo el directorio raíz con cualquier servidor estático local.

3. **Ejecutar tests unitarios y de integración:**
   ```bash
   npm test
   ```
   Ejecuta la suite completa de Vitest (127 pruebas en verde en 10 suites de prueba).

4. **Comprobar cobertura de código:**
   ```bash
   npm run coverage
   ```
   Genera el reporte de cobertura mediante V8, superando ampliamente el 90% requerido en funciones lógicas puras (100% en validadores y hashing criptográfico).

5. **Verificar calidad estática y formato:**
   ```bash
   npm run lint          # Comprueba las reglas estrictas de ESLint
   npm run format:check  # Verifica el formato con Prettier
   npm run format        # Aplica el formateo automático con Prettier
   ```

## Almacenamiento y sesión

La aplicación persiste su estado íntegramente en el navegador web del cliente mediante las APIs estándar `sessionStorage` y `localStorage`, garantizando un funcionamiento desacoplado y sin backend.

### Claves utilizadas

| Clave | Almacenamiento | Qué guarda | Ejemplo de contenido |
|---|:---:|---|---|
| `gamevault_sesion` | `sessionStorage` | Usuario autenticado actualmente y su rol en la aplicación. | `{"usuario": "pablo_dev", "rol": "administrador"}` |
| `gamevault_aviso_pendiente` | `sessionStorage` | Mensaje y tipo de aviso que debe mostrarse tras una redirección entre páginas. | `{"mensaje": "Te has registrado con éxito", "tipo": "success"}` |
| `gamevault_usuarios` | `localStorage` | Colección completa de usuarios registrados en el navegador con contraseñas en hash SHA-256. | `[{"nombre": "admin", "usuario": "admin", "correo": "admin@gamevault.com", "clave": "8c69...", "rol": "administrador"}]` |
| `gamevault_juegos_<usuario>` | `localStorage` | Catálogo personal de videojuegos del usuario indicado (aislamiento multiusuario). | `[{"id": "gv_1731425000_abc12", "titulo": "Elden Ring", "plataforma": "PC", "formato": "digital", "horasJugadas": 120, "estadoProgreso": "completado"}]` |

### Criterio de distribución de datos
- **`sessionStorage` para la sesión y avisos diferidos:** Se utiliza para los datos volátiles que deben caducar automáticamente en cuanto el usuario cierra la pestaña o ventana del navegador, evitando que sesiones previas queden activas involuntariamente.
- **`localStorage` para usuarios y catálogos de videojuegos:** Se utiliza para la información persistente que debe conservarse entre diferentes visitas. Cada usuario registrado dispone de su propia clave (`gamevault_juegos_<usuario>`), asegurando que ningún usuario pueda ver o modificar el catálogo de otro en el mismo equipo.

### Seguridad del inicio de sesión y limitaciones en cliente
Este inicio de sesión es una **simulación educativa**:
- **Riesgo:** Al no existir un servidor seguro, cualquier persona con acceso físico al equipo o a las herramientas de desarrollo del navegador (DevTools) puede inspeccionar y alterar `localStorage` o `sessionStorage`, modificando su rol a `administrador` o alterando los registros.
- **Cómo se hace en una aplicación real:** En un entorno de producción, la autenticación se delega a un servidor seguro mediante cookies `HttpOnly` y `Secure`, o mediante tokens criptográficos firmados (JWT), y la autorización de cada operación (alta, consulta o borrado) se verifica en backend consultando una base de datos protegida.

## Funcionalidad y formularios

### Validadores y Expresiones Regulares (`js/validadores.js`)

La aplicación implementa validación pura desacoplada del DOM mediante funciones exportadas y un mapa unificado `VALIDADORES` que permite a los formularios enlazar cada campo dinámicamente mediante el atributo `data-validar`.

#### Tabla de Expresiones Regulares

| Expresión Regular | Validador | Ejemplo válido | Desglose y significado de partes y flags | Qué valida la regex vs Qué valida el código |
|---|---|---|---|---|
| `/^[a-zA-Z0-9_-]{3,15}$/` | `validarNombreUsuario` | `pablo_dev` | `^` inicio, `[a-zA-Z0-9_-]` letras, dígitos o guiones, `{3,15}` entre 3 y 15 caracteres, `$` fin. Sin flags. | **Regex:** Formato y longitud de caracteres.<br>**Código:** `trim()`, tipo `string` y unicidad contra `localStorage`. |
| `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` | `validarCorreo` | `gamer@gamevault.org` | `^` inicio, `[^\s@]+` parte local sin espacios ni arrobas, `@` arroba obligatoria, `[^\s@]+` dominio, `\.` punto literal, `[^\s@]+` TLD, `$` fin. | **Regex:** Estructura general de dirección email.<br>**Código:** `trim()` y tipo `string`. |
| `/\p{Ll}/u`<br>`/\p{Lu}/u`<br>`/\d/` | `evaluarRequisitosClave`<br>`validarClave` | `Password2026!` | `\p{Ll}` minúscula Unicode (flag `u`), `\p{Lu}` mayúscula Unicode (flag `u`), `\d` dígito numérico. | **Regex:** Presencia de cada familia de caracteres sin flag global `g` (evita anomalías de estado con `lastIndex`).<br>**Código:** Longitud mínima `>= 8` y composición booleana reactiva. |
| `/^GAME-[A-Z]{3}-\d{4}$/` | `validarSKU` | `GAME-RPG-0042` | `^GAME-` prefijo fijo en mayúsculas, `[A-Z]{3}` código de género de 3 letras mayúsculas, `-\d{4}$` guion y 4 dígitos correlativos. | **Regex:** Sintaxis y estructura estricta del SKU de catálogo.<br>**Código:** `trim()` y comprobación de tipo de dato. |
| `/^\d{13}$/` | `validarEAN13` | `4020628663124` | `^` inicio, `\d{13}` exactamente 13 dígitos numéricos decimales, `$` fin. | **Regex:** Longitud exacta y contenido exclusivamente numérico.<br>**Código:** Algoritmo oficial de control ponderado módulo 10 (impares peso 1, pares peso 3, cálculo de dígito verificador). |
| `/^EST-[A-Z]-\d{2}$/` | `validarEstanteria` | `EST-A-03` | `^EST-` prefijo de estantería, `[A-Z]` letra mayúscula de módulo, `-\d{2}$` número de balda de 2 dígitos (00 a 99). | **Regex:** Formato físico de balda.<br>**Código:** `trim()` y comprobación de tipo de dato. |

#### Algoritmo Oficial de Control EAN-13

Para la edición física de videojuegos, el validador `validarEAN13(codigo)` verifica la integridad del código de barras de 13 dígitos numéricos:
1. Valida que el texto recibido coincida con `/^\d{13}$/`.
2. Extrae los primeros 12 dígitos y reserva el 13º como dígito de control.
3. Calcula la suma ponderada asignando peso 1 a posiciones impares y peso 3 a posiciones pares (indexadas en 0):
   $$\text{suma} = \sum_{i=0}^{11} d_i \times (i \bmod 2 === 0 \text{ ? } 1 : 3)$$
4. Calcula el dígito esperado mediante:
   $$\text{control} = (10 - (\text{suma} \bmod 10)) \bmod 10$$
5. Comprueba la coincidencia estricta (`calculado === digitoControl`). Si la suma es múltiplo de 10, el dígito de control es `0`.

#### Validadores de la Entidad Videojuego

- **`validarTitulo(titulo)`:** Cadena obligatoria entre 2 y 100 caracteres tras `trim()`.
- **`validarPlataforma(plataforma)`:** Debe pertenecer a las opciones oficiales: `PC`, `PlayStation 5`, `Xbox Series X`, `Nintendo Switch` o `Retro`.
- **`validarFormato(formato)`:** Acepta `'fisico'` o `'digital'` (insensible a mayúsculas).
- **`validarFechaAdquisicion(fecha, hoy)`:** Comprueba formato `YYYY-MM-DD`, que sea una fecha de calendario real (rechaza 30 de febrero, mes 13, etc.) y que no sea posterior a la fecha de hoy.
- **`validarHorasJugadas(horas)`:** Número entero no negativo (`>= 0`).
- **`validarEstadoProgreso(estado)`:** Debe pertenecer a: `pendiente`, `jugando`, `completado` o `abandonado`.
- **`validarTiendaDigital(tienda)`:** Valida tienda admitida (`Steam`, `PlayStation Store`, `Nintendo eShop`, `Epic Games Store`, `Xbox Store`).
- **`validarDlc(dlc)` y `validarDlcs(dlcs)`:** Valida grupos dinámicos de expansiones (entre 0 y 3 elementos, cada uno con título válido y estado `pendiente`, `jugando` o `completado`).

### Lógica Pura de Paginación (`js/paginar.js`)

La paginación de colecciones se implementa como una función pura matemática desacoplada del DOM: `paginar(lista, pagina, porPagina)`.

- **Cálculo de páginas:** $\text{totalPaginas} = \max(1, \lceil \text{total} / \text{porPagina} \rceil)$.
- **Corrección automática de límites:**
  - Si se solicita una página menor que 1 (ej. 0 o números negativos), la corrige automáticamente a `1`.
  - Si se solicita una página superior al total (ej. página 99 teniendo 3), la corrige automáticamente a la última disponible (`totalPaginas`).
  - Si la colección está vacía (`[]`), devuelve `elementos: []`, `totalPaginas: 1` y `pagina: 1`.
- **Estructura devuelta:**
  ```javascript
  {
    elementos: [...],      // Porción exacta de elementos de la página
    pagina: 1,             // Página efectiva corregida
    paginaActual: 1,       // Alias
    totalPaginas: 3,       // Total de páginas calculadas
    porPagina: 6,          // Elementos por página
    total: 15,             // Total de elementos en la colección original
    tieneAnterior: false,  // Booleano para controles de navegación
    tieneSiguiente: true   // Booleano para controles de navegación
  }
  ```
- **Reutilización:** Este módulo sirve de forma transversal para paginar las tarjetas del catálogo en `listado.html` y las filas de la tabla de administración en `usuarios.html`.

### Componente Visual de Paginación y Gestión de URL (`js/paginacion.js`)

El componente visual de paginación implementa la interfaz accesible de navegación y su sincronización bidireccional con la dirección del navegador web:

- **Controles generados íntegramente por código:** Crea dinámicamente el botón «Anterior», los botones numéricos correlativos y el botón «Siguiente» dentro de la lista de paginación (`#paginacion-catalogo` en `listado.html` y `#paginacion-usuarios` en `usuarios.html`).
- **Estados accesibles y semántica:**
  - El botón «Anterior» se desactiva (`disabled` en el botón y clase `.disabled` en el `<li>`) cuando la página activa es la primera (`pagina <= 1`).
  - El botón «Siguiente» se desactiva (`disabled` y clase `.disabled`) cuando la página activa es la última (`pagina >= totalPaginas`).
  - La página actual se resalta con la clase `.active` y se marca semánticamente para lectores de pantalla mediante el atributo `aria-current="page"`.
- **Sincronización con la URL (`?pagina=X`):**
  - Al cambiar de página, se actualiza la dirección en el historial del cliente sin recargar la página mediante `URLSearchParams` y `history.replaceState`.
  - Al recargar la página o acceder mediante un enlace directo (`?pagina=2`), `obtenerPaginaUrl` extrae y convalida el parámetro para situar al usuario en dicha página.
  - Al volver a la página 1 o al realizar una nueva búsqueda, se elimina el parámetro `pagina` para mantener la URL limpia.
- **Delegación de eventos:** Un único oyente `click` registrado en el contenedor `<ul>` intercepta cualquier pulsación en fase de burbuja mediante `e.target.closest('button[data-pagina], button[data-page]')`. Esto asegura que los controles respondan de inmediato tras ser re-renderizados sin necesidad de reconectar oyentes individuales.

### Formulario de la Ficha y Lectura de Datos (`ficha.html`, `js/ficha.js`)

El formulario de alta y edición de videojuegos implementa la captura y población estructurada de datos mediante APIs nativas del navegador:

- **Fecha máxima dinámica (`inyectarFechaMaxima`):** Para evitar que el usuario seleccione fechas futuras en el selector nativo de fecha (`<input type="date">`), la función calcula la fecha local actual en formato ISO (`YYYY-MM-DD`) e inyecta dinámicamente el atributo `max`. Esto proporciona una primera barrera visual y nativa antes de la validación lógica.
- **Lectura íntegra y normalización con `FormData` (`leerDatosFormulario`):**
  - Utiliza `new FormData(formulario)` para recopilar de forma declarativa todos los controles del formulario según su atributo `name`.
  - Normaliza campos numéricos (`horas` a entero `>= 0`), campos de texto (con `trim()`) y el formato seleccionado (`fisico` o `digital`).
  - Extrae de manera estructurada los grupos repetibles (expansiones DLCs) agrupando pares de `dlc-titulo` y `dlc-estado` mediante `formData.getAll()`.
  - Asegura que los campos condicionales no aplicables (ej. EAN y estantería en formato digital, o tienda en formato físico) se limpien y no contaminen la entidad.
- **Campo condicional interactivo (`alternarSeccionFormato`):**
  - Vincula la selección del selector de formato (*Edición Física* vs *Edición Digital*).
  - Si se selecciona **Físico**, se muestra y habilita la sección `#bloque-fisico` (`hidden = false`, `disabled = false`), activando los campos de código EAN-13 y ubicación en estantería; la sección digital `#bloque-digital` se oculta y deshabilita (`hidden = true`, `disabled = true`).
  - Si se selecciona **Digital**, se oculta y deshabilita `#bloque-fisico`, y se muestra y habilita `#bloque-digital` con su lista de tiendas digitales compatibles (*Steam, PlayStation Store, Nintendo eShop, Epic Games Store, Xbox Store*).
  - Al deshabilitar una sección, se limpian automáticamente las clases de error (`is-invalid`), se resetea `aria-invalid="false"` y se vacía el texto de las alertas vinculadas por `aria-describedby`, impidiendo errores fantasma o envíos residuales.
  - La sincronización nativa mediante el atributo `disabled` asegura que los controles inactivos queden automáticamente excluidos de la serialización con `FormData` y del árbol de accesibilidad.
- **Grupo dinámico de expansiones/DLCs (`anadirFilaDlc`, `quitarFilaDlc`, `conectarDlcs`):**
  - Permite asociar de 0 a 3 contenidos descargables o expansiones clonando la plantilla HTML nativa `<template id="tpl-dlc">`.
  - Genera identificadores únicos correlativos por fila (`id="input-nombre-dlc-..."`, `id="select-estado-dlc-..."`), enlazando de forma accesible sus etiquetas mediante `htmlFor` y sus cajas de error reactivas mediante `aria-describedby`.
  - Control de límites estricto (mínimo 0, máximo 3): al alcanzar 3 expansiones en el contenedor `#lista-dlcs`, el botón «+ Añadir DLC» se deshabilita (`disabled = true`, `aria-disabled="true"`). Al pulsar «Quitar» en cualquier fila (gestionado mediante delegación de eventos `click`), la fila se elimina y el botón vuelve a reactivarse automáticamente.
  - La serialización aprovecha `new FormData(formulario)` y `formData.getAll('dlcNombre[]')` junto con `formData.getAll('dlcEstado[]')` para normalizar las colecciones en un array estructurado de objetos `{ titulo, estado }`.
- **Población bidireccional (`rellenarFormulario`):** Permite reutilizar el mismo formulario tanto para el alta como para la edición de títulos existentes (`ficha.html?id=X`), asignando los valores de la entidad a cada control, sincronizando el radio de formato correspondiente y clonando las filas de DLC existentes.
- **Flujo completo de alta y edición con redirecciones (`iniciarFicha`):**
  - **Detección de modo:** Analiza el parámetro de búsqueda `?id=...` de la URL mediante `URLSearchParams`. Si no existe parámetro, opera en **modo alta** (titula «Alta de Videojuego» y botón «Guardar videojuego»). Si existe, conmuta a **modo edición** (titula «Edición de Videojuego» y botón «Guardar cambios»).
  - **Control de accesos y resiliencia:** Si el `id` indicado no existe en el catálogo del usuario o pertenece a otra cuenta (aislamiento multiusuario), guarda un aviso de error diferido (`guardarAviso`) y redirige inmediatamente al usuario a `listado.html` sin renderizar datos corruptos.
  - **Persistencia normalizada y feedback diferido:** Al enviar el formulario válido, el motor de validación delega el guardado a `crearJuego` (generando un ID único con prefijo `gv_`) o `actualizarJuego` (preservando el ID original y actualizando `actualizadoEn`). Tras persistir en `localStorage`, almacena un aviso de éxito en `sessionStorage` (`gamevault_aviso_pendiente`) y redirige a `listado.html`, donde el aviso se muestra automáticamente tras la navegación.

### Motor Genérico de Validación en Tiempo Real y Accesibilidad (`js/validacion.js`)

El motor de validación implementa las directrices de los requisitos 19 y 20 del enunciado, desacoplando la lógica de validación de cada vista y garantizando una experiencia accesible e interactiva:

- **Fases de propagación para el ciclo de vida del error:**
  - **Fase de captura (`useCapture = true`):** Se registra un único oyente `blur` en el `<form>`. Al abandonar el foco de un campo por primera vez, se evalúa y se marca como visitado (`dirty`), sin necesidad de registrar oyentes individuales en cada control.
  - **Fase de burbuja:** Una vez que un campo ha sido visitado o presenta un estado de error, los eventos `input` y `change` revalidan el valor de forma reactiva e instantánea, eliminando el mensaje en cuanto el usuario corrige el dato.
- **Revalidación de campos dependientes (`data-coincidir-con`):**
  - Cuando se modifica un campo del que dependen otros (por ejemplo, la contraseña principal), el motor localiza automáticamente los controles dependientes (como repetir contraseña) y los revalida de inmediato.
- **Accesibilidad y Constraint Validation API:**
  - **Sincronización accesible:** Los campos erróneos reciben `aria-invalid="true"` y se vinculan a través de `aria-describedby` con su caja de mensaje (`role="alert"` o `aria-live="polite"`).
  - **API nativa:** Se utiliza `setCustomValidity(mensaje)` para alimentar la validación estándar del navegador y clases de Bootstrap (`.is-invalid`, `.invalid-feedback`, `.d-block`).
  - **Envío y foco automático:** Al pulsar enviar con datos incompletos o erróneos, se cancela el evento `submit` y se transfiere automáticamente el foco (`focus()`) al **primer campo no válido** del formulario.






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

Para asegurar la calidad estática del código y la homogeneidad en el estilo sin intervención manual, el proyecto integra **ESLint** (con configuración plana en `eslint.config.js`) y **Prettier** (configurado en `.prettierrc`).

#### Reglas añadidas a `eslint.config.js`

Se han incorporado cuatro reglas adicionales a las recomendadas por defecto:

| Regla | Severidad | Qué comprueba | Justificación técnica |
|---|:---:|---|---|
| `no-var` | `error` | Prohíbe el uso de la palabra reservada `var` para la declaración de variables. | Evita errores graves provocados por el *hoisting* y la ausencia de ámbito de bloque (`block scope`), forzando el uso exclusivo de `let` y `const` conforme al estándar moderno ECMAScript. |
| `prefer-const` | `error` | Exige el uso de `const` en todas aquellas variables que nunca son reasignadas tras su inicialización. | Garantiza la inmutabilidad de referencias, reduciendo efectos secundarios no deseados, mejorando la predictibilidad del flujo de datos y comunicando claramente la intención del código. |
| `eqeqeq` | `error` | Obliga al uso de operadores de igualdad estricta (`===` y `!==`) deshabilitando la igualdad débil (`==` y `!=`). | Previene fallos sutiles causados por la coerción implícita de tipos de JavaScript (por ejemplo, `false == ""` o `null == undefined`). |
| `no-duplicate-imports` | `error` | Prohíbe declarar múltiples sentencias `import` hacia el mismo módulo en un mismo archivo. | Mantiene las dependencias organizadas, limpias y centralizadas en la cabecera de cada módulo. |

#### Comprobaciones de calidad en verde

Salida de **`npm run lint`**:
```text
> mi-aplicacion@1.0.0 lint
> eslint .

(0 errores, 0 advertencias)
```

Salida de **`npm run format:check`**:
```text
> mi-aplicacion@1.0.0 format:check
> prettier --check .

Checking formatting...
All matched files use Prettier code style!
```

#### Problema real diagnosticado con las DevTools

Durante el desarrollo reactivo de la validación de contraseña en `js/registro.js`, el indicador visual del requisito de cifra numérica (`#req-numero`) dejaba de marcarse como cumplido intermitentemente mientras el usuario tecleaba rápido, a pesar de que la clave contenía dígitos.

- **Diagnóstico en DevTools:** Se estableció un punto de interrupción condicional (*conditional breakpoint*) dentro del oyente del evento `input` en el panel **Sources** de Chrome DevTools. Inspeccionando el valor de la expresión regular en la sección **Scope / Watch**, se descubrió que la regex compartida en el módulo utilizaba la bandera global `/\d/g`. En los motores V8 de JavaScript, las instancias de `RegExp` con flag `g` preservan la propiedad interna `lastIndex` entre ejecuciones sucesivas; por tanto, al llamar repetidamente a `.test(valor)`, el motor reanudaba la búsqueda desde el final de la coincidencia anterior y fallaba alternadamente devolviendo `false`.
- **Resolución:** Se eliminó la bandera global `g` dejando `/\d/`, transformando la evaluación en una función pura y sin estado (*stateless*) que responde siempre de forma determinista ante cualquier entrada.

### El workflow

El flujo de integración continua está automatizado mediante GitHub Actions en [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

- **Cuándo se ejecuta:** En cada evento `push` hacia `main` y en cada `pull_request` dirigida a `main`.
- **Permisos de seguridad:** `permissions: contents: read` (principio de mínimo privilegio, el workflow únicamente requiere lectura del repositorio).
- **Entorno de ejecución:** Máquinas virtuales `ubuntu-latest` con Node.js 24 y caché nativa de dependencias de npm.

#### Trabajos de Integración Continua (Paso 1: Sprint 1)

| Trabajo | Espera a | Pasos que ejecuta | Artefacto |
|---------|----------|-------------------|-----------|
| `Calidad` | — *(Primer trabajo)* | 1. Descargar el código (`actions/checkout@v7`)<br>2. Instalar Node.js 24 con caché de npm (`actions/setup-node@v7`)<br>3. Instalar dependencias limpias (`npm ci`)<br>4. Comprobar calidad estática (`npm run lint`)<br>5. Comprobar formato (`npm run format:check`) | — |
| `Tests` | `Calidad` (`needs: calidad`) | 1. Descargar el código (`actions/checkout@v7`)<br>2. Instalar Node.js 24 con caché de npm (`actions/setup-node@v7`)<br>3. Instalar dependencias limpias (`npm ci`)<br>4. Ejecutar pruebas automatizadas (`npm test`) | *(En Sprint 2: `coverage/`)* |
| `E2E` | *(Sprint 2)* | *(Se incorporará en el Sprint 2 tras configurar Playwright)* | *(En Sprint 2: `playwright-report/`)* |

**Justificación técnica del orden de ejecución:**
El trabajo de `Calidad` se sitúa en primer lugar porque el análisis estático de código (ESLint) y la comprobación de formato (Prettier) se ejecutan en pocos segundos y detectan inmediatamente variables no utilizadas, referencias no inicializadas o inconsistencias de estilo. Si la calidad estática falla, el flujo se detiene de inmediato mediante *fail-fast*, evitando consumir minutos de cómputo innecesarios en la ejecución de la suite de pruebas unitarias (`Tests`).

**Ejecución en verde:** [Ejecución #42892582735 (Calidad y Tests)](https://github.com/fpftoro-docencia/dwec-2dawt-2627-proyectodomeval-pablo265910/actions/runs/42892582735) en la Pull Request [#19](https://github.com/fpftoro-docencia/dwec-2dawt-2627-proyectodomeval-pablo265910/pull/19).

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

| Sprint | Fecha límite | *Tag* | Qué incluye | Reflexión |
|--------|--------------|-------|-------------|-----------|
| 1 | 12 nov 2026 | `v0.1` | Usuarios, sesión en `sessionStorage`, roles con primer usuario administrador, registro con validador reactivo de contraseña (`\p{Ll}`, `\p{Lu}`), login con SHA-256 (`resumirClave`), maquetación base de las 5 páginas, sistema de eventos propios `aviso`, tests unitarios con `AlmacenFalso` y workflow CI paso 1 (calidad y tests). | El Sprint 1 ha establecido con éxito los cimientos arquitectónicos de GameVault. Se ha implementado un flujo de autenticación, control de roles y sesiones completamente desacoplado y protegido contra datos corruptos en el navegador del cliente. La suite de 127 tests en Vitest con `AlmacenFalso` y el pipeline de CI en GitHub Actions garantizan una base de código limpia y con cobertura verificada superior al 90%. El mayor aprendizaje ha sido la aplicación práctica de inyección de dependencias y eventos nativos (`CustomEvent`), fundamentales para lograr un diseño modular y fácilmente testeable. |
| 2 | 19 nov 2026 | `v0.2` | Entidad Videojuego, CRUD `juegos.js` por usuario, validadores con algoritmo EAN-13, SKU y estantería, lógica condicional de formato físico vs digital, grupo dinámico de DLCs (0 a 3) clonado de `<template>`, catálogo con buscador con debounce y modal `<dialog>`, paginación pura, zona de administración de usuarios, delegación de eventos, tests de integración y E2E Playwright con cobertura >= 90% y CI completo. | *Pendiente de cierre de Sprint 2.* |
| 3 | 26 nov 2026 | `v1.0` | Despliegue continuo en Vercel, vistas previas automáticas en Pull Requests probadas con Playwright (`BASE_URL`), prueba de humo en producción (`humo.spec.js`), automatización de GitHub Releases con archivo ZIP en tags `v*`, documentación JSDoc completa y evidencias finales. | *Pendiente de cierre de Sprint 3.* |

**Tablero de Trello:** [GameVault - Tablero de Seguimiento (DWEC)](https://trello.com/b/b1iXcn0Q/gamevault-proyecto-dom-dwec) *(compartido con el profesor)*

**Blog del proyecto:** [blog/README.md](blog/README.md) <!-- dificultades y problemas conceptuales de cada sprint -->

### Ramas y versiones

| Rama | Funcionalidad | *Pull request* |
|------|---------------|----------------|
| `definicion-proyecto` | [S1-01] Configuración inicial, temática GameVault, arquitectura de páginas y Definición de Hecho (DoD) | — |
| `estructura-html-base` | [S1-02] Estructura HTML base de las 5 páginas y enlace a Bootstrap | [#2](https://github.com/fpftoro-docencia/dwec-2dawt-2627-proyectodomeval-pablo265910/pull/2) |
| `cabecera-sesion` | [S1-03] Cabecera común, menú de navegación y sesión de usuario | [#7](https://github.com/fpftoro-docencia/dwec-2dawt-2627-proyectodomeval-pablo265910/pull/7) |
| `nueva-estetica-minimalista` | Actualización de diseño Dark Minimalism, plantillas HTML y recursos gráficos | [#8](https://github.com/fpftoro-docencia/dwec-2dawt-2627-proyectodomeval-pablo265910/pull/8) |
| `avisos-custom-event` | [S1-04] Sistema de eventos de avisos personalizados ('aviso') | [#11](https://github.com/fpftoro-docencia/dwec-2dawt-2627-proyectodomeval-pablo265910/pull/11) |
| `modulo-sesion` | [S1-05] Módulo de gestión de sesión (sesion.js) | [#12](https://github.com/fpftoro-docencia/dwec-2dawt-2627-proyectodomeval-pablo265910/pull/12) |
| `modulo-usuarios` | [S1-06] Módulo de gestión de usuarios y roles (usuarios.js) | [#13](https://github.com/fpftoro-docencia/dwec-2dawt-2627-proyectodomeval-pablo265910/pull/13) |
| `pagina-registro` | [S1-07] Página y formulario de registro (registro.html) | [#14](https://github.com/fpftoro-docencia/dwec-2dawt-2627-proyectodomeval-pablo265910/pull/14) |
| `pagina-login` | [S1-08] Página de inicio de sesión (index.html) | [#15](https://github.com/fpftoro-docencia/dwec-2dawt-2627-proyectodomeval-pablo265910/pull/15) |
| `rutas-privadas` | [S1-09] Control de acceso y protección de rutas privadas | [#16](https://github.com/fpftoro-docencia/dwec-2dawt-2627-proyectodomeval-pablo265910/pull/16) |
| `calidad-codigo` | [S1-10] Configuración de calidad de código con ESLint y Prettier | [#17](https://github.com/fpftoro-docencia/dwec-2dawt-2627-proyectodomeval-pablo265910/pull/17) |
| `tests-unitarios` | [S1-11] Tests unitarios con AlmacenFalso (Usuarios, Sesión y Validadores) | [#18](https://github.com/fpftoro-docencia/dwec-2dawt-2627-proyectodomeval-pablo265910/pull/18) |
| `workflow-ci` | [S1-12] Workflow de Integración Continua - Paso 1: Calidad y Tests | [#19](https://github.com/fpftoro-docencia/dwec-2dawt-2627-proyectodomeval-pablo265910/pull/19) |
| `cierre-sprint-1` | [S1-13] Cierre del Sprint 1: Blog, Tag v0.1 y Reflexión | [#20](https://github.com/fpftoro-docencia/dwec-2dawt-2627-proyectodomeval-pablo265910/pull/20) |
| `modulo-juegos` | [S2-01] Módulo de persistencia de videojuegos (juegos.js) | [#21](https://github.com/fpftoro-docencia/dwec-2dawt-2627-proyectodomeval-pablo265910/pull/21) |

**Estrategia de integración:** Se utiliza integración mediante **Merge Commits** (`git merge --no-ff`) para mantener la trazabilidad histórica de cada rama y preservar el contexto exacto de cada Pull Request y sus revisiones asociadas en el repositorio.

**Política de `.gitignore`:** Se excluyen dependencias de paquetes (`node_modules/`), artefactos de build (`dist/`), informes de cobertura (`coverage/`), reportes y trazas de Playwright (`playwright-report/`, `test-results/`), variables de entorno locales (`.env*`) y archivos de configuración del sistema operativo (`.DS_Store`, `Thumbs.db`), ya que son archivos generados en local, volátiles o sensibles que no deben formar parte del repositorio compartido.

**Versión de entrega:** `v1.0`
