/**
 * Controlador de la página de inicio de sesión (index.html).
 *
 * Gestiona la autenticación de usuarios mediante resúmenes SHA-256,
 * protección anti-doble envío, vaciado de contraseña y foco ante error,
 * y redirección automática si ya existe sesión activa.
 *
 * @module login
 */

import { haySesion, iniciarSesion } from './sesion.js';
import { autenticarUsuario } from './usuarios.js';
import { guardarAviso, lanzarAviso } from './avisos.js';

/**
 * Inicializa la lógica de inicio de sesión.
 *
 * @param {Document} [documento=document]
 * @param {Object} [opciones={}] Dobles de prueba para redirección y almacenamiento.
 * @param {Storage} [opciones.almacenSesion] Almacén de sesión (sessionStorage o doble).
 * @param {Storage} [opciones.almacenUsuarios] Almacén de usuarios (localStorage o doble).
 * @param {Function} [opciones.navegar] Función de navegación/redirección.
 * @returns {void}
 */
export function iniciarLogin(documento = document, opciones = {}) {
  const {
    almacenSesion = typeof window !== 'undefined' ? window.sessionStorage : null,
    almacenUsuarios = typeof window !== 'undefined' ? window.localStorage : null,
    navegar = (url) => {
      if (typeof window !== 'undefined') window.location.href = url;
    },
  } = opciones;

  // 1. Guarda de ruta: si ya hay sesión activa, va directamente al listado
  if (haySesion(almacenSesion)) {
    navegar('listado.html');
    return;
  }

  const formulario = documento.querySelector('#form-login');
  if (!formulario) return;

  const inputUsuario = documento.querySelector('#login-usuario');
  const inputPassword = documento.querySelector('#login-password');
  const btnSubmit = documento.querySelector('#btn-submit-login');
  const errorUsuario = documento.querySelector('#error-login-usuario');
  const errorPassword = documento.querySelector('#error-login-password');
  const errorGeneral = documento.querySelector('#error-login-general');

  /**
   * Muestra u oculta mensaje de error en un campo de forma accesible.
   *
   * @param {HTMLInputElement} input
   * @param {HTMLElement} cajaError
   * @param {string} mensaje
   */
  function establecerError(input, cajaError, mensaje) {
    if (!input || !cajaError) return;
    if (mensaje) {
      input.setAttribute('aria-invalid', 'true');
      cajaError.textContent = mensaje;
      cajaError.classList.add('d-block');
    } else {
      input.setAttribute('aria-invalid', 'false');
      cajaError.textContent = '';
      cajaError.classList.remove('d-block');
    }
  }

  // Validación al salir de los campos (blur)
  if (inputUsuario) {
    inputUsuario.addEventListener('blur', () => {
      const val = inputUsuario.value.trim();
      if (!val) {
        establecerError(inputUsuario, errorUsuario, 'Introduce tu nombre de usuario.');
      } else {
        establecerError(inputUsuario, errorUsuario, '');
      }
    });
  }

  if (inputPassword) {
    inputPassword.addEventListener('blur', () => {
      const val = inputPassword.value;
      if (!val) {
        establecerError(inputPassword, errorPassword, 'Introduce tu contraseña.');
      } else {
        establecerError(inputPassword, errorPassword, '');
      }
    });
  }

  // Envío del formulario y autenticación con protección anti-doble envío
  let enviando = false;

  formulario.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Si ya se está procesando un envío, ignorar clics o intros adicionales
    if (enviando) return;

    const usuarioVal = inputUsuario?.value.trim() || '';
    const passVal = inputPassword?.value || '';

    let hayErrores = false;

    if (!usuarioVal) {
      establecerError(inputUsuario, errorUsuario, 'Introduce tu nombre de usuario.');
      hayErrores = true;
    } else {
      establecerError(inputUsuario, errorUsuario, '');
    }

    if (!passVal) {
      establecerError(inputPassword, errorPassword, 'Introduce tu contraseña.');
      hayErrores = true;
    } else {
      establecerError(inputPassword, errorPassword, '');
    }

    if (hayErrores) {
      if (errorGeneral) {
        errorGeneral.textContent = '';
        errorGeneral.classList.remove('d-block');
      }
      return;
    }

    // Activar estado de envío y bloquear nuevo envío
    enviando = true;
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.classList.add('loading');
    }

    try {
      // Autenticar credenciales comparando SHA-256
      const usuarioAutenticado = await autenticarUsuario(usuarioVal, passVal, almacenUsuarios);

      if (usuarioAutenticado) {
        // Iniciar sesión
        iniciarSesion(usuarioAutenticado.nombre, usuarioAutenticado.rol, almacenSesion);

        // Guardar aviso de bienvenida para listado.html
        guardarAviso(
          `¡Bienvenido de nuevo, ${usuarioAutenticado.nombre}!`,
          'success',
          almacenSesion,
        );

        // Redirigir al catálogo
        navegar('listado.html');
      } else {
        // Credenciales incorrectas:
        // 1. Desbloquear estado de envío
        enviando = false;
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.classList.remove('loading');
        }

        // 2. Vaciar el campo de contraseña y devolverle el foco
        if (inputPassword) {
          inputPassword.value = '';
          inputPassword.focus();
        }

        // 3. Mostrar error accesible y lanzar evento de aviso
        const mensajeError = 'El usuario o la contraseña no son correctos.';
        if (errorGeneral) {
          errorGeneral.textContent = mensajeError;
          errorGeneral.classList.add('d-block');
        }
        lanzarAviso(formulario, mensajeError, 'danger');
      }
    } catch (err) {
      enviando = false;
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.classList.remove('loading');
      }
      const mensaje = err.message || 'Error inesperado al iniciar sesión.';
      if (errorGeneral) {
        errorGeneral.textContent = mensaje;
        errorGeneral.classList.add('d-block');
      }
      lanzarAviso(formulario, mensaje, 'danger');
    }
  });
}
