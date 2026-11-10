/**
 * Controlador de la página de registro (registro.html).
 *
 * Gestiona la validación reactiva de la contraseña, control de errores accesible
 * en los campos, verificación de disponibilidad del nombre de usuario,
 * registro, auto-login, aviso diferido y redirección.
 *
 * @module registro
 */

import { haySesion, iniciarSesion } from './sesion.js';
import { existeUsuario, registrarUsuario } from './usuarios.js';
import { guardarAviso, lanzarAviso } from './avisos.js';
import { validarNombreUsuario, validarCorreo, evaluarRequisitosClave } from './validadores.js';

/**
 * Inicializa la lógica de la página de registro.
 *
 * @param {Document} [documento=document]
 * @param {Object} [opciones={}] Dobles de prueba para redirección y almacenamiento.
 * @param {Storage} [opciones.almacenSesion] Almacén de sesión (sessionStorage o doble).
 * @param {Storage} [opciones.almacenUsuarios] Almacén de usuarios (localStorage o doble).
 * @param {Function} [opciones.navegar] Función de redirección.
 * @returns {void}
 */
export function iniciarRegistro(documento = document, opciones = {}) {
  const {
    almacenSesion = typeof window !== 'undefined' ? window.sessionStorage : null,
    almacenUsuarios = typeof window !== 'undefined' ? window.localStorage : null,
    navegar = (url) => {
      if (typeof window !== 'undefined') window.location.href = url;
    },
  } = opciones;

  // 1. Guarda de ruta: si ya hay sesión iniciada, redirige al catálogo
  if (haySesion(almacenSesion)) {
    navegar('listado.html');
    return;
  }

  const formulario = documento.querySelector('#form-registro');
  if (!formulario) return;

  const inputUsuario = documento.querySelector('#reg-usuario');
  const inputEmail = documento.querySelector('#reg-email');
  const inputPassword = documento.querySelector('#reg-password');
  const inputPasswordConfirm = documento.querySelector('#reg-password-confirm');
  const inputCondiciones = documento.querySelector('#reg-condiciones');
  const btnSubmit = documento.querySelector('#btn-submit-registro');

  // Elementos del indicador de requisitos
  const reqLongitud = documento.querySelector('#req-longitud');
  const reqMinuscula = documento.querySelector('#req-minuscula');
  const reqMayuscula = documento.querySelector('#req-mayuscula');
  const reqNumero = documento.querySelector('#req-numero');

  // Cajas de error
  const errorUsuario = documento.querySelector('#error-reg-usuario');
  const errorEmail = documento.querySelector('#error-reg-email');
  const errorPassword = documento.querySelector('#error-reg-password');
  const errorPasswordConfirm = documento.querySelector('#error-reg-password-confirm');
  const errorCondiciones = documento.querySelector('#error-reg-condiciones');

  /**
   * Muestra u oculta el mensaje de error de un campo de forma accesible.
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

  // --- Validación reactiva del panel de contraseña ---
  if (inputPassword) {
    inputPassword.addEventListener('input', () => {
      const valor = inputPassword.value;
      const evalRequisitos = evaluarRequisitosClave(valor);

      const actualizarItem = (el, cumplido) => {
        if (!el) return;
        el.classList.toggle('requisito-cumplido', cumplido);
        el.classList.toggle('text-success', cumplido);
      };

      actualizarItem(reqLongitud, evalRequisitos.longitud);
      actualizarItem(reqMinuscula, evalRequisitos.minuscula);
      actualizarItem(reqMayuscula, evalRequisitos.mayuscula);
      actualizarItem(reqNumero, evalRequisitos.digito);

      // Si el campo ya tiene error previo, revalidar en tiempo real
      if (inputPassword.getAttribute('aria-invalid') === 'true') {
        if (evalRequisitos.valida) {
          establecerError(inputPassword, errorPassword, '');
        }
      }

      // Revalidar confirmación si ya tiene contenido
      if (inputPasswordConfirm && inputPasswordConfirm.value) {
        if (inputPasswordConfirm.value === valor) {
          establecerError(inputPasswordConfirm, errorPasswordConfirm, '');
        }
      }
    });
  }

  // --- Validación individual en fase de salida (blur) ---
  if (inputUsuario) {
    inputUsuario.addEventListener('blur', () => {
      const val = inputUsuario.value.trim();
      if (!val) {
        establecerError(inputUsuario, errorUsuario, 'El nombre de usuario es obligatorio.');
      } else if (!validarNombreUsuario(val)) {
        establecerError(
          inputUsuario,
          errorUsuario,
          'El usuario debe tener entre 3 y 15 caracteres alfanuméricos o guiones.',
        );
      } else if (existeUsuario(val, almacenUsuarios)) {
        establecerError(inputUsuario, errorUsuario, 'Este nombre de usuario ya está ocupado.');
      } else {
        establecerError(inputUsuario, errorUsuario, '');
      }
    });
  }

  if (inputEmail) {
    inputEmail.addEventListener('blur', () => {
      const val = inputEmail.value.trim();
      if (!val) {
        establecerError(inputEmail, errorEmail, 'El correo electrónico es obligatorio.');
      } else if (!validarCorreo(val)) {
        establecerError(
          inputEmail,
          errorEmail,
          'Introduce una dirección de correo electrónico válida.',
        );
      } else {
        establecerError(inputEmail, errorEmail, '');
      }
    });
  }

  if (inputPassword) {
    inputPassword.addEventListener('blur', () => {
      const val = inputPassword.value;
      const reqs = evaluarRequisitosClave(val);
      if (!reqs.valida) {
        establecerError(
          inputPassword,
          errorPassword,
          'La contraseña debe tener al menos 8 caracteres, una minúscula, una mayúscula y un número.',
        );
      } else {
        establecerError(inputPassword, errorPassword, '');
      }
    });
  }

  if (inputPasswordConfirm) {
    inputPasswordConfirm.addEventListener('blur', () => {
      const val = inputPasswordConfirm.value;
      if (!val || val !== inputPassword?.value) {
        establecerError(
          inputPasswordConfirm,
          errorPasswordConfirm,
          'Las contraseñas no coinciden.',
        );
      } else {
        establecerError(inputPasswordConfirm, errorPasswordConfirm, '');
      }
    });
  }

  if (inputCondiciones) {
    inputCondiciones.addEventListener('change', () => {
      if (!inputCondiciones.checked) {
        establecerError(
          inputCondiciones,
          errorCondiciones,
          'Debes aceptar las condiciones de uso.',
        );
      } else {
        establecerError(inputCondiciones, errorCondiciones, '');
      }
    });
  }

  // --- Envío del formulario con protección anti-doble envío ---
  let enviando = false;

  formulario.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (enviando) return;

    // Validación general previa al envío
    const usuarioVal = inputUsuario?.value.trim() || '';
    const emailVal = inputEmail?.value.trim() || '';
    const passVal = inputPassword?.value || '';
    const passConfirmVal = inputPasswordConfirm?.value || '';
    const condicionesVal = inputCondiciones?.checked || false;

    let hayErrores = false;

    if (!validarNombreUsuario(usuarioVal)) {
      establecerError(
        inputUsuario,
        errorUsuario,
        'El usuario debe tener entre 3 y 15 caracteres alfanuméricos o guiones.',
      );
      hayErrores = true;
    } else if (existeUsuario(usuarioVal, almacenUsuarios)) {
      establecerError(inputUsuario, errorUsuario, 'Este nombre de usuario ya está ocupado.');
      hayErrores = true;
    } else {
      establecerError(inputUsuario, errorUsuario, '');
    }

    if (!validarCorreo(emailVal)) {
      establecerError(
        inputEmail,
        errorEmail,
        'Introduce una dirección de correo electrónico válida.',
      );
      hayErrores = true;
    } else {
      establecerError(inputEmail, errorEmail, '');
    }

    if (!evaluarRequisitosClave(passVal).valida) {
      establecerError(
        inputPassword,
        errorPassword,
        'La contraseña debe tener al menos 8 caracteres, una minúscula, una mayúscula y un número.',
      );
      hayErrores = true;
    } else {
      establecerError(inputPassword, errorPassword, '');
    }

    if (passVal !== passConfirmVal || !passConfirmVal) {
      establecerError(inputPasswordConfirm, errorPasswordConfirm, 'Las contraseñas no coinciden.');
      hayErrores = true;
    } else {
      establecerError(inputPasswordConfirm, errorPasswordConfirm, '');
    }

    if (!condicionesVal) {
      establecerError(inputCondiciones, errorCondiciones, 'Debes aceptar las condiciones de uso.');
      hayErrores = true;
    } else {
      establecerError(inputCondiciones, errorCondiciones, '');
    }

    if (hayErrores) {
      lanzarAviso(formulario, 'Por favor, corrige los errores antes de continuar.', 'danger');
      return;
    }

    // Activar protección anti-doble envío
    enviando = true;
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.classList.add('loading');
    }

    try {
      // 1. Registrar usuario en localStorage (el 1º adquiere 'administrador' automáticamente)
      const nuevoUsuario = await registrarUsuario(
        {
          nombre: usuarioVal,
          correo: emailVal,
          clave: passVal,
        },
        almacenUsuarios,
      );

      // 2. Iniciar sesión automáticamente en sessionStorage
      iniciarSesion(nuevoUsuario.nombre, nuevoUsuario.rol, almacenSesion);

      // 3. Dejar aviso guardado para la siguiente página
      guardarAviso(
        `¡Bienvenido a GameVault, ${nuevoUsuario.nombre}! Tu cuenta ha sido creada con éxito.`,
        'success',
        almacenSesion,
      );

      // 4. Redirección limpia al listado
      navegar('listado.html');
    } catch (err) {
      lanzarAviso(formulario, err.message || 'Error al procesar el registro.', 'danger');
      enviando = false;
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.classList.remove('loading');
      }
    }
  });
}
