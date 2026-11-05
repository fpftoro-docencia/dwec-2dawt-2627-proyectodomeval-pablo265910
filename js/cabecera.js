/**
 * Componente de cabecera común y barra de navegación para páginas privadas.
 *
 * Muestra el usuario activo, su rol y controla la visibilidad del enlace
 * a la zona de administración. Gestiona el cierre de sesión.
 *
 * @module cabecera
 */

import { obtenerSesion, cerrarSesion } from './sesion.js';

/**
 * Inicializa la cabecera común de la aplicación en el documento dado.
 *
 * @param {Document} [documento=document] Árbol DOM donde se encuentra la cabecera.
 * @param {Object} [opciones={}] Configuración y dobles de prueba para navegación y almacenamiento.
 * @param {Storage} [opciones.almacen=window.sessionStorage] Almacén de sesión.
 * @param {Function} [opciones.alCerrarSesion] Función a ejecutar tras cerrar sesión.
 * @returns {void}
 */
export function iniciarCabecera(documento = document, opciones = {}) {
  const {
    almacen = window.sessionStorage,
    alCerrarSesion = () => {
      window.location.href = 'index.html';
    },
  } = opciones;

  const sesion = obtenerSesion(almacen);

  // 1. Mostrar nombre de usuario activo
  const nombreElemento = documento.querySelector('#usuario-activo-nombre');
  if (nombreElemento) {
    nombreElemento.textContent = sesion ? sesion.usuario : 'Invitado';
  }

  // 2. Mostrar insignia de rol (Usuario vs Administrador)
  const rolElemento = documento.querySelector('#usuario-activo-rol');
  if (rolElemento) {
    if (sesion) {
      const esAdmin = sesion.rol === 'administrador';
      rolElemento.textContent = esAdmin ? 'Administrador' : 'Usuario';
      rolElemento.classList.toggle('steam-badge--rol-admin', esAdmin);
      rolElemento.classList.toggle('steam-badge--rol-usuario', !esAdmin);
    } else {
      rolElemento.textContent = 'Sin sesión';
      rolElemento.classList.remove('steam-badge--rol-admin');
      rolElemento.classList.add('steam-badge--rol-usuario');
    }
  }

  // 3. Control de visibilidad del enlace de Administración (solo administradores)
  const navItemAdmin = documento.querySelector('#nav-item-admin');
  const enlaceAdmin = documento.querySelector('#enlace-admin');
  const esAdmin = Boolean(sesion && sesion.rol === 'administrador');

  if (navItemAdmin) {
    navItemAdmin.hidden = !esAdmin;
  } else if (enlaceAdmin) {
    enlaceAdmin.hidden = !esAdmin;
  }

  // 4. Manejador para el botón de cerrar sesión
  const btnCerrarSesion = documento.querySelector('#btn-cerrar-sesion');
  if (btnCerrarSesion) {
    btnCerrarSesion.addEventListener('click', () => {
      cerrarSesion(almacen);
      alCerrarSesion();
    });
  }
}
