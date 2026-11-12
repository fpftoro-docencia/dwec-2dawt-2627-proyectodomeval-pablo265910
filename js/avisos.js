/**
 * Sistema centralizado de avisos y notificaciones mediante eventos personalizados ('aviso').
 *
 * Implementa el Requisito 8 del proyecto:
 * - Emisión desacoplada desde cualquier elemento con CustomEvent y burbujeo (`bubbles: true`).
 * - Oyente único en `document` que captura los avisos y los dibuja en la región accesible (`role="status"`).
 * - Clases de alerta de Bootstrap (`alert-success`, `alert-danger`, `alert-info`, `alert-warning`).
 * - Persistencia de avisos en `sessionStorage` para mantener mensajes entre redirecciones.
 *
 * @module avisos
 */

export const NOMBRE_EVENTO_AVISO = 'aviso';
export const CLAVE_AVISO_SESION = 'gamevault_aviso_pendiente';
export const TIEMPO_DESAPARICION_MS = 5000;

/**
 * @typedef {'success' | 'danger' | 'warning' | 'info'} TipoAvisoBootstrap
 */

/**
 * @typedef {Object} DetalleAviso
 * @property {string} mensaje Contenido textual de la notificación.
 * @property {TipoAvisoBootstrap} tipo Categoría normalizada para estilos de Bootstrap.
 */

/**
 * Normaliza un tipo de aviso a una clase de alerta válida de Bootstrap 5.
 *
 * @param {string} [tipo='info'] Tipo de aviso recibido.
 * @returns {TipoAvisoBootstrap} Tipo estandarizado ('success', 'danger', 'warning' o 'info').
 * @example
 * normalizarTipoAviso('error'); // 'danger'
 * normalizarTipoAviso('exito'); // 'success'
 */
export function normalizarTipoAviso(tipo = 'info') {
  if (typeof tipo !== 'string') return 'info';
  const limpio = tipo.trim().toLowerCase();

  switch (limpio) {
    case 'success':
    case 'exito':
    case 'ok':
      return 'success';
    case 'danger':
    case 'error':
    case 'fallo':
      return 'danger';
    case 'warning':
    case 'alerta':
    case 'aviso':
      return 'warning';
    case 'info':
    default:
      return 'info';
  }
}

/**
 * Lanza el evento personalizado 'aviso' desde cualquier elemento del DOM.
 *
 * Conforme al Requisito 8, se emite un `CustomEvent` con `bubbles: true`
 * para que ascienda por el árbol del DOM hasta `document`.
 *
 * @fires aviso
 * @param {EventTarget} [elemento=document] Elemento emisor del evento.
 * @param {string} mensaje Texto descriptivo de la notificación.
 * @param {string} [tipo='info'] Severidad o tipo ('success', 'danger', 'warning', 'info').
 * @returns {CustomEvent<DetalleAviso>} El evento emitido.
 * @throws {Error} Si el mensaje no es una cadena válida no vacía.
 * @example
 * lanzarAviso(btnGuardar, 'Videojuego guardado correctamente', 'success');
 */
export function lanzarAviso(elemento = document, mensaje, tipo = 'info') {
  if (typeof mensaje !== 'string' || mensaje.trim() === '') {
    throw new Error('El mensaje del aviso debe ser una cadena de texto no vacía.');
  }

  const tipoNormalizado = normalizarTipoAviso(tipo);
  const evento = new CustomEvent(NOMBRE_EVENTO_AVISO, {
    bubbles: true,
    cancelable: true,
    detail: {
      mensaje: mensaje.trim(),
      tipo: tipoNormalizado,
    },
  });

  const emisor = elemento && typeof elemento.dispatchEvent === 'function' ? elemento : document;
  emisor.dispatchEvent(evento);
  return evento;
}

/**
 * Guarda un aviso en el almacenamiento de sesión para mostrarlo en la siguiente página tras navegar.
 *
 * @param {string} mensaje Texto del aviso a preservar.
 * @param {string} [tipo='info'] Categoría del aviso.
 * @param {Storage} [almacen=window.sessionStorage] Almacén de sesión donde persistir el aviso.
 * @returns {void}
 * @example
 * guardarAviso('Te has registrado con éxito. ¡Bienvenido a GameVault!', 'success');
 */
export function guardarAviso(mensaje, tipo = 'info', almacen = window.sessionStorage) {
  if (typeof mensaje !== 'string' || mensaje.trim() === '') return;

  const datos = {
    mensaje: mensaje.trim(),
    tipo: normalizarTipoAviso(tipo),
  };

  try {
    almacen?.setItem(CLAVE_AVISO_SESION, JSON.stringify(datos));
  } catch {
    // Si el almacenamiento está bloqueado o lleno, evitamos excepciones no controladas
  }
}

/**
 * Recupera y borra del almacenamiento el aviso pendiente de sesión, si existe.
 * Es tolerante a fallos si los datos están corruptos.
 *
 * @param {Storage} [almacen=window.sessionStorage] Almacén de sesión a consultar.
 * @returns {DetalleAviso | null} Los datos del aviso o null si no había ninguno válido.
 * @example
 * const avisoPrevio = consumirAviso();
 * if (avisoPrevio) { console.log(avisoPrevio.mensaje); }
 */
export function consumirAviso(almacen = window.sessionStorage) {
  try {
    const raw = almacen?.getItem(CLAVE_AVISO_SESION);
    if (!raw) return null;

    almacen?.removeItem(CLAVE_AVISO_SESION);
    const parseado = JSON.parse(raw);

    if (
      parseado &&
      typeof parseado === 'object' &&
      typeof parseado.mensaje === 'string' &&
      parseado.mensaje.trim() !== ''
    ) {
      return {
        mensaje: parseado.mensaje.trim(),
        tipo: normalizarTipoAviso(parseado.tipo),
      };
    }
    return null;
  } catch {
    try {
      almacen?.removeItem(CLAVE_AVISO_SESION);
    } catch {
      // Ignorar error al limpiar
    }
    return null;
  }
}

/**
 * Construye e inserta la alerta visual con clases de Bootstrap dentro de la región accesible.
 *
 * @param {HTMLElement} region Contenedor donde alojar la alerta (con role="status").
 * @param {string} mensaje Texto a mostrar en el aviso.
 * @param {string} [tipo='info'] Tipo de aviso para aplicar la clase alert-{tipo}.
 * @param {Object} [opciones={}] Opciones de renderizado.
 * @param {number} [opciones.duracionMs=TIEMPO_DESAPARICION_MS] Tiempo en ms antes de auto-cerrar (0 para desactivar).
 * @param {Document} [opciones.documento=document] Árbol DOM para crear los nodos.
 * @returns {HTMLElement} El elemento DOM de la alerta creada.
 */
export function renderizarAviso(region, mensaje, tipo = 'info', opciones = {}) {
  const { duracionMs = TIEMPO_DESAPARICION_MS, documento = region.ownerDocument || document } =
    opciones;

  const tipoNormalizado = normalizarTipoAviso(tipo);

  // Contenedor de la alerta con clases nativas de Bootstrap 5 y estética GameVault
  const alerta = documento.createElement('div');
  alerta.className = `alert alert-${tipoNormalizado} alert-dismissible gv-toast-item d-flex align-items-center justify-content-between m-0 fade show`;
  alerta.setAttribute('role', 'alert');

  // Contenedor de texto seguro contra inyección XSS
  const textoSpan = documento.createElement('span');
  textoSpan.className = 'gv-toast-mensaje';
  textoSpan.textContent = mensaje;
  alerta.appendChild(textoSpan);

  // Botón de cierre manual (sin JS de Bootstrap, con evento nativo)
  const btnCerrar = documento.createElement('button');
  btnCerrar.type = 'button';
  btnCerrar.className = 'btn-close ms-3';
  btnCerrar.setAttribute('aria-label', 'Cerrar notificación');
  btnCerrar.addEventListener('click', () => {
    alerta.remove();
  });
  alerta.appendChild(btnCerrar);

  region.appendChild(alerta);

  // Auto-desaparición con temporizador si se indica duración positiva
  if (duracionMs > 0) {
    setTimeout(() => {
      if (alerta.isConnected) {
        alerta.remove();
      }
    }, duracionMs);
  }

  return alerta;
}

/**
 * Registra un único oyente en `document` para escuchar el evento 'aviso'
 * y dibuja las alertas en la región con `role="status"`. Además, consume
 * y dispara cualquier aviso que hubiera quedado guardado en `sessionStorage`.
 *
 * @listens aviso
 * @param {Document} [documento=document] Documento donde registrar el oyente global.
 * @param {Object} [opciones={}] Configuración y dependencias.
 * @param {Storage} [opciones.almacen=window.sessionStorage] Almacén para avisos diferidos.
 * @param {string} [opciones.selectorRegion='#region-avisos, .gv-toast-region, [role="status"]'] Selector CSS de la región accesible.
 * @param {number} [opciones.duracionMs=TIEMPO_DESAPARICION_MS] Milisegundos de visualización antes de auto-cerrar.
 * @returns {() => void} Función de desuscripción para limpiar el oyente (útil en pruebas).
 * @example
 * // En el script principal de la página:
 * iniciarAvisos();
 */
export function iniciarAvisos(documento = document, opciones = {}) {
  const {
    almacen = window.sessionStorage,
    selectorRegion = '#region-avisos, .gv-toast-region, [role="status"]',
    duracionMs = TIEMPO_DESAPARICION_MS,
  } = opciones;

  // Manejador único en document para el evento 'aviso'
  const manejarAviso = (evento) => {
    const { mensaje, tipo } = evento.detail || {};
    if (!mensaje || typeof mensaje !== 'string') return;

    const region = documento.querySelector(selectorRegion);
    if (!region) return;

    renderizarAviso(region, mensaje, tipo, { duracionMs, documento });
  };

  documento.addEventListener(NOMBRE_EVENTO_AVISO, manejarAviso);

  // Consumir aviso pendiente de redirección previa, si existe
  const avisoPendiente = consumirAviso(almacen);
  if (avisoPendiente) {
    lanzarAviso(documento, avisoPendiente.mensaje, avisoPendiente.tipo);
  }

  // Devolver función de limpieza para tests
  return () => {
    documento.removeEventListener(NOMBRE_EVENTO_AVISO, manejarAviso);
  };
}
