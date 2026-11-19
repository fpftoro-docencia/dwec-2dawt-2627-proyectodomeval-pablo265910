/**
 * Módulo de gestión y persistencia del catálogo de videojuegos en localStorage.
 *
 * Implementa el almacenamiento aislado por usuario (cada usuario ve solo sus juegos),
 * generación de identificadores únicos por videojuego, operaciones CRUD completas y
 * tolerancia ante datos corruptos o anomalías en el almacenamiento.
 *
 * @module juegos
 */

/**
 * Prefijo de clave utilizado en `localStorage` para aislar el catálogo por usuario (`gamevault_juegos_<usuario>`).
 *
 * @type {string}
 */
export const PREFIJO_CLAVE_JUEGOS = 'gamevault_juegos_';

/**
 * Contenido descargable o expansión asociada a un videojuego.
 *
 * @typedef {Object} DLC
 * @property {string} titulo Nombre o título del DLC o expansión.
 * @property {'pendiente' | 'jugando' | 'completado'} estado Estado de avance del DLC.
 */

/**
 * Alias de compatibilidad de {@link module:juegos~DLC}.
 *
 * @typedef {DLC} DlcItem
 */

/**
 * Representación normalizada de un videojuego en el catálogo del usuario.
 *
 * @typedef {Object} Videojuego
 * @property {string} id Identificador único del videojuego.
 * @property {string} titulo Título del videojuego (entre 2 y 100 caracteres).
 * @property {'PC' | 'PlayStation 5' | 'Xbox Series X' | 'Nintendo Switch' | 'Retro'} plataforma Plataforma del juego.
 * @property {'fisico' | 'digital'} formato Formato de la edición (Físico o Digital).
 * @property {string} fechaAdquisicion Fecha de compra o adquisición en formato ISO YYYY-MM-DD.
 * @property {number} horasJugadas Horas totales jugadas (número entero >= 0).
 * @property {'pendiente' | 'jugando' | 'completado' | 'abandonado'} estadoProgreso Estado de progreso actual.
 * @property {string} sku Código de catálogo interno (ej. GAME-RPG-0042).
 * @property {string | null} [codigoBarras] Código de barras EAN-13 (solo formato físico).
 * @property {string | null} [ubicacionEstanteria] Ubicación en balda EST-X-00 (solo formato físico).
 * @property {string | null} [tiendaDigital] Tienda de adquisición digital (solo formato digital).
 * @property {DLC[]} [dlcs] Lista de contenidos descargables o expansiones (de 0 a 3).
 * @property {string} [creadoEn] Fecha y hora de creación del registro (ISO 8601).
 * @property {string} [actualizadoEn] Fecha y hora de última modificación (ISO 8601).
 */

/**
 * Obtiene el almacén por defecto (`window.localStorage`) de forma segura en navegador o tests.
 *
 * @private
 * @returns {Storage | null} Instancia de `localStorage` si está disponible, o `null`.
 */
function obtenerAlmacenDefecto() {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return null;
}

/**
 * Obtiene la clave de almacenamiento en localStorage para un usuario específico.
 *
 * Normaliza el nombre de usuario eliminando espacios y convirtiéndolo a minúsculas
 * para garantizar el aislamiento multiusuario.
 *
 * @param {string} usuario Nombre del usuario propietario del catálogo.
 * @returns {string} Clave de almacenamiento (ej. 'gamevault_juegos_pablo_dev').
 * @example
 * obtenerClaveJuegos('  Pablo_Dev '); // 'gamevault_juegos_pablo_dev'
 */
export function obtenerClaveJuegos(usuario) {
  if (typeof usuario !== 'string') return '';
  const limpio = usuario.trim().toLowerCase();
  return limpio ? `${PREFIJO_CLAVE_JUEGOS}${limpio}` : '';
}

/**
 * Genera un identificador único para un nuevo videojuego.
 *
 * @returns {string} Identificador único con prefijo 'gv_' y marca temporal.
 * @example
 * const id = generarIdJuego(); // 'gv_1731268800000_a1b2c3d'
 */
export function generarIdJuego() {
  const timestamp = Date.now();
  const aleatorio = Math.random().toString(36).substring(2, 9);
  return `gv_${timestamp}_${aleatorio}`;
}

/**
 * Normaliza y sanea las propiedades de un registro de videojuego.
 *
 * @private
 * @param {Object} raw Objeto sin normalizar leído del almacenamiento o entrada.
 * @returns {Videojuego | null} Videojuego saneado o `null` si carece de `id` o `titulo` válidos.
 */
function normalizarJuego(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }

  const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : null;
  const titulo = typeof raw.titulo === 'string' ? raw.titulo.trim() : '';

  if (!id || !titulo) {
    return null;
  }

  const plataformaValidas = ['PC', 'PlayStation 5', 'Xbox Series X', 'Nintendo Switch', 'Retro'];
  const plataforma = plataformaValidas.includes(raw.plataforma) ? raw.plataforma : 'PC';

  const formato = raw.formato === 'fisico' ? 'fisico' : 'digital';

  const estadosValidos = ['pendiente', 'jugando', 'completado', 'abandonado'];
  const estadoProgreso = estadosValidos.includes(raw.estadoProgreso)
    ? raw.estadoProgreso
    : 'pendiente';

  const horasJugadas =
    Number.isInteger(Number(raw.horasJugadas)) && Number(raw.horasJugadas) >= 0
      ? Number(raw.horasJugadas)
      : 0;

  const fechaAdquisicion =
    typeof raw.fechaAdquisicion === 'string' && raw.fechaAdquisicion.trim()
      ? raw.fechaAdquisicion.trim()
      : new Date().toISOString().split('T')[0];

  const sku = typeof raw.sku === 'string' ? raw.sku.trim() : '';
  const codigoBarras =
    formato === 'fisico' && typeof raw.codigoBarras === 'string' ? raw.codigoBarras.trim() : null;
  const ubicacionEstanteria =
    formato === 'fisico' && typeof raw.ubicacionEstanteria === 'string'
      ? raw.ubicacionEstanteria.trim()
      : null;
  const tiendaDigital =
    formato === 'digital' && typeof raw.tiendaDigital === 'string'
      ? raw.tiendaDigital.trim()
      : null;

  const dlcs = Array.isArray(raw.dlcs)
    ? raw.dlcs
        .filter((d) => d && typeof d === 'object' && typeof d.titulo === 'string')
        .map((d) => ({
          titulo: d.titulo.trim(),
          estado: ['pendiente', 'jugando', 'completado'].includes(d.estado)
            ? d.estado
            : 'pendiente',
        }))
        .slice(0, 3)
    : [];

  return {
    id,
    titulo,
    plataforma,
    formato,
    fechaAdquisicion,
    horasJugadas,
    estadoProgreso,
    sku,
    codigoBarras,
    ubicacionEstanteria,
    tiendaDigital,
    dlcs,
    creadoEn: raw.creadoEn || new Date().toISOString(),
    actualizadoEn: raw.actualizadoEn || new Date().toISOString(),
  };
}

/**
 * Obtiene la colección completa de videojuegos para un usuario determinado.
 *
 * Implementa resiliencia ante datos corruptos: si el JSON no es parseable o
 * no es un array, devuelve un array vacío sin lanzar excepciones.
 *
 * @param {string} usuario Nombre del usuario propietario.
 * @param {Storage} [almacen=obtenerAlmacenDefecto()]
 * @returns {Videojuego[]}
 */
export function obtenerJuegos(usuario, almacen = obtenerAlmacenDefecto()) {
  const clave = obtenerClaveJuegos(usuario);
  if (!clave || !almacen) return [];

  try {
    const raw = almacen.getItem(clave);
    if (!raw) return [];

    const datos = JSON.parse(raw);
    if (!Array.isArray(datos)) return [];

    return datos.map(normalizarJuego).filter((j) => j !== null);
  } catch {
    return [];
  }
}

/**
 * Busca un videojuego por su identificador único dentro del catálogo del usuario.
 *
 * @param {string} id
 * @param {string} usuario
 * @param {Storage} [almacen=obtenerAlmacenDefecto()]
 * @returns {Videojuego | null}
 */
export function obtenerJuegoPorId(id, usuario, almacen = obtenerAlmacenDefecto()) {
  if (typeof id !== 'string' || !id.trim()) return null;
  const juegos = obtenerJuegos(usuario, almacen);
  return juegos.find((j) => j.id === id.trim()) || null;
}

/**
 * Persiste la colección de videojuegos de un usuario en el almacenamiento.
 *
 * @param {Videojuego[]} juegos Lista de videojuegos a persistir.
 * @param {string} usuario Nombre del usuario propietario.
 * @param {Storage} [almacen=obtenerAlmacenDefecto()] Almacén donde persistir.
 * @returns {void}
 * @throws {Error} Si el usuario es inválido o el almacén no está disponible.
 */
export function guardarJuegos(juegos, usuario, almacen = obtenerAlmacenDefecto()) {
  const clave = obtenerClaveJuegos(usuario);
  if (!clave) {
    throw new Error('El nombre de usuario es obligatorio para persistir su catálogo de juegos.');
  }
  if (!almacen) {
    throw new Error('El almacén de datos (localStorage) no está disponible.');
  }

  const normalizados = Array.isArray(juegos)
    ? juegos.map(normalizarJuego).filter((j) => j !== null)
    : [];

  almacen.setItem(clave, JSON.stringify(normalizados));
}

/**
 * Registra un nuevo videojuego en el catálogo del usuario asignándole un ID único.
 *
 * @param {Object} datosJuego Propiedades del videojuego a crear (ver {@link module:juegos~Videojuego}).
 * @param {string} usuario Nombre del usuario propietario.
 * @param {Storage} [almacen=obtenerAlmacenDefecto()] Almacén donde persistir.
 * @returns {Videojuego} Videojuego creado y persistido.
 * @throws {Error} Si faltan datos obligatorios o el usuario es inválido.
 */
export function crearJuego(datosJuego, usuario, almacen = obtenerAlmacenDefecto()) {
  if (!datosJuego || typeof datosJuego !== 'object') {
    throw new Error('Los datos del videojuego son obligatorios.');
  }

  const titulo = typeof datosJuego.titulo === 'string' ? datosJuego.titulo.trim() : '';
  if (!titulo) {
    throw new Error('El título del videojuego es obligatorio.');
  }

  const juegos = obtenerJuegos(usuario, almacen);
  const nuevoJuego = normalizarJuego({
    ...datosJuego,
    id: generarIdJuego(),
    creadoEn: new Date().toISOString(),
    actualizadoEn: new Date().toISOString(),
  });

  if (!nuevoJuego) {
    throw new Error('No se pudo normalizar el videojuego.');
  }

  juegos.push(nuevoJuego);
  guardarJuegos(juegos, usuario, almacen);
  return nuevoJuego;
}

/**
 * Actualiza los datos de un videojuego existente identificado por su ID.
 *
 * @param {string} id Identificador del videojuego a modificar.
 * @param {Object} datosActualizados Campos a actualizar (ver {@link module:juegos~Videojuego}).
 * @param {string} usuario Nombre del usuario propietario.
 * @param {Storage} [almacen=obtenerAlmacenDefecto()] Almacén donde persistir.
 * @returns {Videojuego | null} Videojuego modificado o null si no se encontró.
 */
export function actualizarJuego(id, datosActualizados, usuario, almacen = obtenerAlmacenDefecto()) {
  if (typeof id !== 'string' || !id.trim() || !datosActualizados) {
    return null;
  }

  const juegos = obtenerJuegos(usuario, almacen);
  const indice = juegos.findIndex((j) => j.id === id.trim());

  if (indice === -1) {
    return null;
  }

  const juegoPrevio = juegos[indice];
  const actualizado = normalizarJuego({
    ...juegoPrevio,
    ...datosActualizados,
    id: juegoPrevio.id, // Preserva siempre el ID original
    creadoEn: juegoPrevio.creadoEn, // Preserva la fecha de alta original
    actualizadoEn: new Date().toISOString(),
  });

  if (!actualizado) {
    return null;
  }

  juegos[indice] = actualizado;
  guardarJuegos(juegos, usuario, almacen);
  return actualizado;
}

/**
 * Guarda un videojuego: si tiene ID y ya existe lo actualiza; si no, lo crea nuevo.
 *
 * @param {Object} datosJuego Datos del videojuego a crear o actualizar (ver {@link module:juegos~Videojuego}).
 * @param {string} usuario Nombre del usuario propietario.
 * @param {Storage} [almacen=obtenerAlmacenDefecto()] Almacén donde persistir.
 * @returns {Videojuego} Videojuego creado o actualizado.
 */
export function guardarJuego(datosJuego, usuario, almacen = obtenerAlmacenDefecto()) {
  if (datosJuego && typeof datosJuego.id === 'string' && datosJuego.id.trim()) {
    const existente = obtenerJuegoPorId(datosJuego.id, usuario, almacen);
    if (existente) {
      return actualizarJuego(datosJuego.id, datosJuego, usuario, almacen);
    }
  }
  return crearJuego(datosJuego, usuario, almacen);
}

/**
 * Elimina un videojuego del catálogo del usuario según su ID.
 *
 * @param {string} id
 * @param {string} usuario
 * @param {Storage} [almacen=obtenerAlmacenDefecto()]
 * @returns {boolean} true si fue eliminado, false si no existía.
 */
export function eliminarJuego(id, usuario, almacen = obtenerAlmacenDefecto()) {
  if (typeof id !== 'string' || !id.trim()) return false;

  const juegos = obtenerJuegos(usuario, almacen);
  const longitudOriginal = juegos.length;
  const filtrados = juegos.filter((j) => j.id !== id.trim());

  if (filtrados.length === longitudOriginal) {
    return false;
  }

  guardarJuegos(filtrados, usuario, almacen);
  return true;
}

/**
 * Elimina todos los videojuegos del catálogo de un usuario.
 *
 * @param {string} usuario Nombre del usuario propietario.
 * @param {Storage} [almacen=obtenerAlmacenDefecto()] Almacén donde eliminar el catálogo.
 * @returns {void}
 */
export function vaciarJuegos(usuario, almacen = obtenerAlmacenDefecto()) {
  const clave = obtenerClaveJuegos(usuario);
  if (!clave || !almacen) return;
  try {
    almacen.removeItem(clave);
  } catch {
    // Silencioso ante errores de almacén
  }
}
