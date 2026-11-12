/**
 * Control de acceso y protección de rutas privadas (Requisito 7).
 *
 * Protege las páginas que requieren autenticación previa o rol de administrador,
 * redirigiendo mediante location.replace para no dejar la página protegida en el
 * historial de navegación.
 *
 * @module rutas
 */

import { haySesion, esAdministrador } from './sesion.js';
import { guardarAviso } from './avisos.js';

/**
 * Protege una página privada estándar (ej. listado.html, ficha.html).
 * Si no existe sesión activa, redirige inmediatamente a 'index.html'.
 *
 * @param {Object} [opciones={}]
 * @param {Storage} [opciones.almacen] Almacén de sesión a consultar.
 * @param {Function} [opciones.reemplazar] Función de reemplazo de URL (location.replace).
 * @returns {boolean} True si el usuario tiene acceso permitido, false si es redirigido.
 */
export function protegerPaginaPrivada(opciones = {}) {
  const {
    almacen = typeof window !== 'undefined' ? window.sessionStorage : null,
    reemplazar = (url) => {
      if (typeof window !== 'undefined' && window.location) {
        window.location.replace(url);
      }
    },
  } = opciones;

  if (!haySesion(almacen)) {
    reemplazar('index.html');
    return false;
  }

  return true;
}

/**
 * Protege una página privada exclusiva de administradores (usuarios.html).
 * - Sin sesión activa: redirige a 'index.html'.
 * - Con sesión activa pero sin rol 'administrador': guarda un aviso diferido de error
 *   y redirige a 'listado.html'.
 *
 * @param {Object} [opciones={}]
 * @param {Storage} [opciones.almacen] Almacén de sesión a consultar.
 * @param {Function} [opciones.reemplazar] Función de reemplazo de URL (location.replace).
 * @returns {boolean} True si el usuario es administrador y tiene acceso, false si es redirigido.
 */
export function protegerPaginaAdmin(opciones = {}) {
  const {
    almacen = typeof window !== 'undefined' ? window.sessionStorage : null,
    reemplazar = (url) => {
      if (typeof window !== 'undefined' && window.location) {
        window.location.replace(url);
      }
    },
  } = opciones;

  if (!haySesion(almacen)) {
    reemplazar('index.html');
    return false;
  }

  if (!esAdministrador(almacen)) {
    guardarAviso(
      'Acceso denegado: se requieren permisos de Administrador para acceder a esa sección.',
      'danger',
      almacen,
    );
    reemplazar('listado.html');
    return false;
  }

  return true;
}
