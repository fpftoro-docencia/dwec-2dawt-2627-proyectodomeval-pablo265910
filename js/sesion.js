/**
 * Gestión de la sesión de usuario en `sessionStorage` (`gamevault_sesion`).
 *
 * Maneja la persistencia, validación de esquema y lectura de la sesión activa
 * del usuario actual (nombre de usuario y rol) usando la clave `gamevault_sesion`
 * en `sessionStorage`.
 *
 * @module sesion
 */

/**
 * Clave utilizada en `sessionStorage` para almacenar los datos de la sesión activa (`gamevault_sesion`).
 *
 * @type {string}
 */
export const CLAVE_SESION = 'gamevault_sesion';

/**
 * Datos de la sesión activa persistidos en `sessionStorage` bajo la clave `gamevault_sesion`.
 *
 * @typedef {Object} Sesion
 * @property {string} usuario Nombre del usuario con sesión iniciada.
 * @property {'usuario' | 'administrador'} rol Rol asignado al usuario.
 */

/**
 * Obtiene el almacén de sesión por defecto (`window.sessionStorage`) de forma segura en navegador o tests.
 *
 * @private
 * @returns {Storage | null} Instancia de `sessionStorage` si está disponible, o `null`.
 */
function obtenerAlmacenDefecto() {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    return window.sessionStorage;
  }
  return null;
}

/**
 * Obtiene los datos de la sesión actual desde `sessionStorage` (`gamevault_sesion`).
 * Devuelve `null` si no hay sesión, el almacén no está disponible o los datos JSON están corruptos.
 *
 * @param {Storage} [almacen=window.sessionStorage] Almacén de sesión a consultar.
 * @returns {Sesion | null} Objeto con usuario y rol, o `null` si no hay sesión válida.
 */
export function obtenerSesion(almacen = obtenerAlmacenDefecto()) {
  try {
    if (!almacen) return null;
    const raw = almacen.getItem(CLAVE_SESION);
    if (!raw) return null;
    const datos = JSON.parse(raw);
    if (
      typeof datos === 'object' &&
      datos !== null &&
      typeof datos.usuario === 'string' &&
      datos.usuario.trim().length > 0 &&
      (datos.rol === 'usuario' || datos.rol === 'administrador')
    ) {
      return {
        usuario: datos.usuario.trim(),
        rol: datos.rol,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Inicia una nueva sesión persistiendo el usuario y su rol en `sessionStorage` (`gamevault_sesion`).
 *
 * @param {string} usuario Nombre de usuario.
 * @param {'usuario' | 'administrador'} rol Rol asignado.
 * @param {Storage} [almacen=window.sessionStorage] Almacén donde guardar.
 * @returns {Sesion} La sesión creada.
 * @throws {Error} Si el usuario o el rol no son válidos, o si el almacén no está disponible.
 */
export function iniciarSesion(usuario, rol, almacen = obtenerAlmacenDefecto()) {
  if (!usuario || typeof usuario !== 'string' || usuario.trim() === '') {
    throw new Error('El nombre de usuario es obligatorio');
  }
  if (rol !== 'usuario' && rol !== 'administrador') {
    throw new Error("El rol debe ser 'usuario' o 'administrador'");
  }
  if (!almacen || typeof almacen.setItem !== 'function') {
    throw new Error('Almacén no disponible para iniciar sesión');
  }
  const sesion = { usuario: usuario.trim(), rol };
  almacen.setItem(CLAVE_SESION, JSON.stringify(sesion));
  return sesion;
}

/**
 * Alias de {@link module:sesion.iniciarSesion} para compatibilidad con la especificación de tareas.
 * Inicia una nueva sesión persistiendo el usuario y su rol en `sessionStorage` (`gamevault_sesion`).
 *
 * @function
 * @param {string} usuario Nombre de usuario.
 * @param {'usuario' | 'administrador'} rol Rol asignado.
 * @param {Storage} [almacen=window.sessionStorage] Almacén donde guardar.
 * @returns {Sesion} La sesión creada.
 * @throws {Error} Si el usuario o el rol no son válidos, o si el almacén no está disponible.
 */
export const guardarSesion = iniciarSesion;

/**
 * Cierra la sesión activa eliminando la entrada `gamevault_sesion` del almacenamiento.
 *
 * @param {Storage} [almacen=window.sessionStorage] Almacén del que borrar la sesión.
 * @returns {void}
 */
export function cerrarSesion(almacen = obtenerAlmacenDefecto()) {
  try {
    almacen?.removeItem(CLAVE_SESION);
  } catch {
    // Si falla el acceso al almacenamiento, no lanzamos excepción no controlada
  }
}

/**
 * Comprueba si existe una sesión activa y válida.
 *
 * @param {Storage} [almacen=window.sessionStorage] Almacén a consultar.
 * @returns {boolean} True si hay una sesión válida activa.
 */
export function haySesion(almacen = obtenerAlmacenDefecto()) {
  return obtenerSesion(almacen) !== null;
}

/**
 * Comprueba si el usuario de la sesión actual tiene rol de administrador.
 *
 * @param {Storage} [almacen=window.sessionStorage] Almacén a consultar.
 * @returns {boolean} True si el usuario activo es administrador.
 */
export function esAdministrador(almacen = obtenerAlmacenDefecto()) {
  const sesion = obtenerSesion(almacen);
  return Boolean(sesion && sesion.rol === 'administrador');
}

/**
 * Alias de {@link module:sesion.esAdministrador} para compatibilidad con la especificación de tareas.
 * Comprueba si el usuario de la sesión actual en `sessionStorage` tiene rol de administrador.
 *
 * @function
 * @param {Storage} [almacen=window.sessionStorage] Almacén a consultar.
 * @returns {boolean} True si el usuario activo es administrador.
 */
export const esAdmin = esAdministrador;
