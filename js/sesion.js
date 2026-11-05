/**
 * Gestión de la sesión de usuario en sessionStorage.
 *
 * Maneja la persistencia y lectura de la sesión activa del usuario
 * actual (nombre de usuario y rol).
 *
 * @module sesion
 */

export const CLAVE_SESION = 'gamevault_sesion';

/**
 * @typedef {Object} Sesion
 * @property {string} usuario Nombre del usuario con sesión iniciada.
 * @property {'usuario' | 'administrador'} rol Rol asignado al usuario.
 */

/**
 * Obtiene los datos de la sesión actual.
 * Devuelve un valor por defecto (null) si no hay sesión o si los datos están corruptos.
 *
 * @param {Storage} [almacen=window.sessionStorage] Almacén de sesión a consultar.
 * @returns {Sesion | null} Objeto con usuario y rol, o null si no hay sesión válida.
 */
export function obtenerSesion(almacen = window.sessionStorage) {
  try {
    const raw = almacen?.getItem(CLAVE_SESION);
    if (!raw) return null;
    const datos = JSON.parse(raw);
    if (
      typeof datos === 'object' &&
      datos !== null &&
      typeof datos.usuario === 'string' &&
      (datos.rol === 'usuario' || datos.rol === 'administrador')
    ) {
      return {
        usuario: datos.usuario,
        rol: datos.rol,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Inicia una nueva sesión persistiendo el usuario y su rol.
 *
 * @param {string} usuario Nombre de usuario.
 * @param {'usuario' | 'administrador'} rol Rol asignado.
 * @param {Storage} [almacen=window.sessionStorage] Almacén donde guardar.
 * @returns {Sesion} La sesión creada.
 * @throws {Error} Si el usuario o el rol no son válidos.
 */
export function iniciarSesion(usuario, rol, almacen = window.sessionStorage) {
  if (!usuario || typeof usuario !== 'string') {
    throw new Error('El nombre de usuario es obligatorio');
  }
  if (rol !== 'usuario' && rol !== 'administrador') {
    throw new Error("El rol debe ser 'usuario' o 'administrador'");
  }
  const sesion = { usuario: usuario.trim(), rol };
  almacen.setItem(CLAVE_SESION, JSON.stringify(sesion));
  return sesion;
}

/**
 * Cierra la sesión activa eliminando sus datos del almacenamiento.
 *
 * @param {Storage} [almacen=window.sessionStorage] Almacén del que borrar la sesión.
 */
export function cerrarSesion(almacen = window.sessionStorage) {
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
export function haySesion(almacen = window.sessionStorage) {
  return obtenerSesion(almacen) !== null;
}

/**
 * Comprueba si el usuario de la sesión actual tiene rol de administrador.
 *
 * @param {Storage} [almacen=window.sessionStorage] Almacén a consultar.
 * @returns {boolean} True si el usuario activo es administrador.
 */
export function esAdministrador(almacen = window.sessionStorage) {
  const sesion = obtenerSesion(almacen);
  return Boolean(sesion && sesion.rol === 'administrador');
}
