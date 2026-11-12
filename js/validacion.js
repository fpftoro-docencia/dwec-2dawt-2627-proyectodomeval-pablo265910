/**
 * Motor genérico de validación en tiempo real y accesibilidad de formularios.
 *
 * Cumple los Requisitos 19 y 20 del ENUNCIADO y la tarjeta [S2-08] de Trello:
 * - Oyente 'blur' en fase de captura (useCapture = true) para validar al salir por primera vez.
 * - Oyentes 'input' y 'change' en fase de burbuja para reactividad tras haber sido visitado (dirty).
 * - Revalidación automática de campos dependientes (ej. repetir contraseña con data-coincidir-con).
 * - Actualización de estado accesible: aria-invalid, aria-describedby y cajas de error con role="alert".
 * - Integración con la Constraint Validation API nativa mediante setCustomValidity y validity.
 * - Feedback visual con clases de Bootstrap (.is-invalid, .invalid-feedback).
 * - Foco automático en el primer campo no válido al intentar enviar el formulario con errores.
 *
 * @module validacion
 */

import { VALIDADORES, MENSAJES_ERROR } from './validadores.js';

/**
 * Determina si un elemento HTML es un control de formulario validable.
 *
 * @param {HTMLElement} elemento
 * @returns {boolean}
 */
export function esCampoValidable(elemento) {
  if (!elemento || !(elemento instanceof HTMLElement)) return false;
  const tag = elemento.tagName.toLowerCase();
  if (tag !== 'input' && tag !== 'select' && tag !== 'textarea') return false;
  if (elemento.disabled) return false;
  if (
    elemento.type === 'hidden' ||
    elemento.type === 'submit' ||
    elemento.type === 'button' ||
    elemento.type === 'reset'
  ) {
    return false;
  }
  return true;
}

/**
 * Localiza la caja de error vinculada a un campo de formulario.
 *
 * Prioriza la referencia declarativa del atributo aria-describedby y aplica
 * resoluciones de respaldo por ID o jerarquía de contenedor.
 *
 * @param {HTMLElement} campo
 * @param {HTMLElement | Document} [formulario=campo.form || document]
 * @returns {HTMLElement | null}
 */
export function obtenerCajaError(campo, formulario = campo ? campo.form : null) {
  if (!campo) return null;
  const raiz = formulario || (campo.ownerDocument ? campo.ownerDocument : document);

  // 1. Por el atributo aria-describedby
  const ariaDesc = campo.getAttribute('aria-describedby');
  if (ariaDesc) {
    const ids = ariaDesc.trim().split(/\s+/);
    for (const id of ids) {
      const caja = raiz.querySelector(`#${id}`);
      if (
        caja &&
        (caja.classList.contains('field-error') ||
          caja.classList.contains('invalid-feedback') ||
          id.startsWith('error-'))
      ) {
        return caja;
      }
    }
    for (const id of ids) {
      const caja = raiz.querySelector(`#${id}`);
      if (caja && !caja.classList.contains('gv-pwd-requirements')) {
        return caja;
      }
    }
  }

  // 2. Por convención #error-<id>
  if (campo.id) {
    const porId = raiz.querySelector(`#error-${campo.id}`);
    if (porId) return porId;
  }

  // 3. Por convención #error-<name>
  if (campo.name) {
    const porName = raiz.querySelector(`#error-${campo.name}`);
    if (porName) return porName;
  }

  // 4. En el contenedor más cercano
  const contenedor = campo.closest(
    '.mb-3, .col-12, .col-md-6, .col-md-4, .col-md-3, .col-md-2, .gv-radio-card-group, .row',
  );
  if (contenedor) {
    const enContenedor = contenedor.querySelector('.field-error, .invalid-feedback');
    if (enContenedor) return enContenedor;
  }

  return null;
}

/**
 * Muestra o limpia el estado de error y accesibilidad de un campo en el DOM.
 *
 * @param {HTMLElement} campo Control a modificar.
 * @param {string} [mensaje=''] Mensaje de error a reflejar (vacío para limpiar).
 * @param {HTMLElement | Document} [formulario=campo.form] Formulario contenedor.
 */
export function mostrarErrorCampo(campo, mensaje = '', formulario = campo ? campo.form : null) {
  if (!campo) return;

  const cajaError = obtenerCajaError(campo, formulario);

  if (mensaje) {
    if (typeof campo.setCustomValidity === 'function') {
      campo.setCustomValidity(mensaje);
    }
    campo.classList.add('is-invalid');
    campo.classList.remove('is-valid');
    campo.setAttribute('aria-invalid', 'true');

    if (cajaError) {
      cajaError.textContent = mensaje;
      cajaError.classList.add('d-block');
      cajaError.classList.add('invalid-feedback');
    }
  } else {
    if (typeof campo.setCustomValidity === 'function') {
      campo.setCustomValidity('');
    }
    campo.classList.remove('is-invalid');
    campo.setAttribute('aria-invalid', 'false');

    if (cajaError) {
      cajaError.textContent = '';
      cajaError.classList.remove('d-block');
    }
  }
}

/**
 * Valida un campo individual de formulario según sus reglas y tipo de validador.
 *
 * @param {HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement} campo Control a validar.
 * @param {Object} [opciones={}] Opciones de validación (fechaReferencia, etc.).
 * @returns {{ valido: boolean, mensaje: string }}
 */
export function validarCampo(campo, opciones = {}) {
  if (!campo || campo.disabled) {
    return { valido: true, mensaje: '' };
  }

  const formulario = campo.form || (campo.ownerDocument ? campo.ownerDocument : null);
  let mensaje = '';
  const tipoValidador = campo.dataset.validar;
  const valor = typeof campo.value === 'string' ? campo.value : '';
  const valorLimpio = valor.trim();

  // 1. Casillas de verificación (checkbox)
  if (campo.type === 'checkbox') {
    if (campo.required && !campo.checked) {
      mensaje =
        MENSAJES_ERROR[tipoValidador] ||
        MENSAJES_ERROR.terminos ||
        'Debes aceptar las condiciones de uso para continuar.';
    }
  }
  // 2. Grupos de botones de opción (radio)
  else if (campo.type === 'radio') {
    if (campo.required && formulario) {
      const radios = formulario.querySelectorAll(`input[type="radio"][name="${campo.name}"]`);
      const algunoMarcado = Array.from(radios).some((r) => r.checked);
      if (!algunoMarcado) {
        mensaje =
          MENSAJES_ERROR[tipoValidador] ||
          MENSAJES_ERROR.formato ||
          'Debes seleccionar una opción.';
      }
    }
  }
  // 3. Campos con comprobación de coincidencia (ej. repetir contraseña)
  else if (campo.dataset.coincidirCon) {
    const idOtro = campo.dataset.coincidirCon;
    const otroCampo = formulario
      ? formulario.querySelector(`#${idOtro}`) || formulario.querySelector(`[name="${idOtro}"]`)
      : null;
    if (otroCampo && campo.value !== otroCampo.value) {
      mensaje =
        MENSAJES_ERROR[tipoValidador] ||
        MENSAJES_ERROR.repetirClave ||
        'Las contraseñas no coinciden.';
    } else if (campo.required && !valorLimpio) {
      mensaje = 'Este campo es obligatorio.';
    }
  }
  // 4. Validadores registrados en el mapa VALIDADORES con data-validar
  else if (tipoValidador && VALIDADORES[tipoValidador]) {
    const fnValidador = VALIDADORES[tipoValidador];

    if (campo.required && !valorLimpio) {
      mensaje = MENSAJES_ERROR[tipoValidador] || 'Este campo es obligatorio.';
    } else if (valorLimpio) {
      const esValido =
        tipoValidador === 'fecha'
          ? fnValidador(valorLimpio, opciones.fechaReferencia || new Date())
          : fnValidador(valorLimpio);

      if (!esValido) {
        mensaje = MENSAJES_ERROR[tipoValidador] || 'El valor introducido no es válido.';
      }
    }
  }
  // 5. Campos requeridos estándar sin validador específico
  else if (campo.required && !valorLimpio) {
    mensaje = MENSAJES_ERROR[tipoValidador] || 'Este campo es obligatorio.';
  }
  // 6. Validación nativa HTML5 de respaldo
  else if (typeof campo.checkValidity === 'function' && !campo.checkValidity()) {
    mensaje = campo.validationMessage || 'El valor introducido no cumple con el formato requerido.';
  }

  mostrarErrorCampo(campo, mensaje, formulario);

  return {
    valido: !mensaje,
    mensaje,
  };
}

/**
 * Valida todos los controles activos de un formulario.
 *
 * @param {HTMLFormElement} formulario Formulario a validar.
 * @param {Object} [opciones={}] Opciones configurables (focoAlPrimerError, fechaReferencia).
 * @returns {{ esValido: boolean, primerInvalido: HTMLElement | null, errores: Array<{ campo: HTMLElement, mensaje: string }> }}
 */
export function validarFormulario(formulario, opciones = {}) {
  if (!formulario) {
    return { esValido: true, primerInvalido: null, errores: [] };
  }

  const controles = formulario.querySelectorAll(
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]), select, textarea',
  );

  let esValido = true;
  let primerInvalido = null;
  const errores = [];

  controles.forEach((control) => {
    if (control.disabled) return;

    const res = validarCampo(control, opciones);
    if (!res.valido) {
      esValido = false;
      errores.push({ campo: control, mensaje: res.mensaje });
      if (!primerInvalido) {
        primerInvalido = control;
      }
    }
  });

  if (!esValido && primerInvalido && opciones.focoAlPrimerError !== false) {
    if (typeof primerInvalido.focus === 'function') {
      primerInvalido.focus();
    }
  }

  return {
    esValido,
    primerInvalido,
    errores,
  };
}

/**
 * Conecta el motor genérico de validación en tiempo real a un formulario.
 *
 * Gestiona:
 * - Atributo novalidate en el formulario.
 * - Validación inicial al salir del campo ('blur' capturado).
 * - Validación reactiva continua tras visita ('input' / 'change' en burbuja).
 * - Revalidación automática de campos dependientes (data-coincidir-con).
 * - Prevención de envío y foco en el primer error ante 'submit' inválido.
 *
 * @param {HTMLFormElement} formulario
 * @param {Object} [opciones={}]
 * @returns {Function} Función para desconectar los oyentes de eventos.
 */
export function conectarValidacionTiempoReal(formulario, opciones = {}) {
  if (!formulario || !(formulario instanceof HTMLFormElement)) {
    return () => {};
  }

  formulario.noValidate = true;

  const camposTocados = new WeakSet();

  // 1. Fase de captura (useCapture = true): oyente blur en el formulario
  const alSalirCampo = (evento) => {
    const campo = evento.target;
    if (!esCampoValidable(campo)) return;
    camposTocados.add(campo);
    validarCampo(campo, opciones);
  };
  formulario.addEventListener('blur', alSalirCampo, true);

  // 2. Fase de burbuja: oyentes input y change
  const alModificarCampo = (evento) => {
    const campo = evento.target;
    if (!esCampoValidable(campo)) return;

    if (camposTocados.has(campo) || campo.classList.contains('is-invalid')) {
      validarCampo(campo, opciones);
    }

    // Revalidar campos dependientes que coincidan con este control
    const ref = campo.id || campo.name;
    if (ref) {
      const dependientes = formulario.querySelectorAll(`[data-coincidir-con="${ref}"]`);
      dependientes.forEach((dep) => {
        if (camposTocados.has(dep) || dep.value) {
          validarCampo(dep, opciones);
        }
      });
    }
  };
  formulario.addEventListener('input', alModificarCampo);
  formulario.addEventListener('change', alModificarCampo);

  // 3. Envío del formulario (submit)
  const alEnviar = (evento) => {
    const controles = formulario.querySelectorAll(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]), select, textarea',
    );
    controles.forEach((c) => camposTocados.add(c));

    const resultado = validarFormulario(formulario, {
      ...opciones,
      focoAlPrimerError: true,
    });

    if (!resultado.esValido) {
      evento.preventDefault();
      evento.stopPropagation();
    } else if (typeof opciones.alEnviarValido === 'function') {
      opciones.alEnviarValido(evento);
    }
  };
  formulario.addEventListener('submit', alEnviar);

  return function desconectarValidacion() {
    formulario.removeEventListener('blur', alSalirCampo, true);
    formulario.removeEventListener('input', alModificarCampo);
    formulario.removeEventListener('change', alModificarCampo);
    formulario.removeEventListener('submit', alEnviar);
  };
}

export default {
  esCampoValidable,
  obtenerCajaError,
  mostrarErrorCampo,
  validarCampo,
  validarFormulario,
  conectarValidacionTiempoReal,
};
