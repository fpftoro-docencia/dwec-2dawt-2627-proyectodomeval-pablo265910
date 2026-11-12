/**
 * Controlador del formulario de alta y edición de videojuegos (ficha.html).
 *
 * Gestiona los campos base de la entidad Videojuego, la inyección dinámica de la fecha
 * máxima (max = hoy), la extracción y normalización de datos con FormData y la
 * inicialización accesible de la vista.
 *
 * @module ficha
 */

/**
 * Inyecta dinámicamente el atributo max en el campo de fecha para impedir fechas futuras.
 *
 * Formatea la fecha de hoy como YYYY-MM-DD según la zona horaria local.
 *
 * @param {HTMLInputElement} inputFecha Elemento <input type="date">.
 * @param {Date | string} [fechaReferencia=new Date()] Fecha máxima permitida.
 * @returns {string} Fecha máxima en formato ISO YYYY-MM-DD.
 */
export function inyectarFechaMaxima(inputFecha, fechaReferencia = new Date()) {
  const d = fechaReferencia instanceof Date ? fechaReferencia : new Date(fechaReferencia);
  const fechaValida = isNaN(d.getTime()) ? new Date() : d;

  const anio = fechaValida.getFullYear();
  const mes = String(fechaValida.getMonth() + 1).padStart(2, '0');
  const dia = String(fechaValida.getDate()).padStart(2, '0');
  const hoyISO = `${anio}-${mes}-${dia}`;

  if (inputFecha) {
    inputFecha.max = hoyISO;
  }

  return hoyISO;
}

/**
 * Lee y normaliza los datos del formulario de la ficha utilizando FormData.
 *
 * Extrae tanto los campos base como las propiedades condicionales y los grupos
 * dinámicos de DLCs mediante FormData.getAll().
 *
 * @param {HTMLFormElement} formulario Elemento <form id="form-ficha">.
 * @returns {Object} Objeto normalizado con las propiedades de la entidad Videojuego.
 */
export function leerDatosFormulario(formulario) {
  if (!formulario || !(formulario instanceof HTMLFormElement)) {
    return {
      id: null,
      titulo: '',
      plataforma: '',
      formato: 'digital',
      fechaAdquisicion: '',
      horasJugadas: 0,
      estadoProgreso: 'pendiente',
      sku: '',
      codigoBarras: null,
      ubicacionEstanteria: null,
      tiendaDigital: null,
      dlcs: [],
    };
  }

  const formData = new FormData(formulario);

  const rawId = formData.get('id');
  const id = typeof rawId === 'string' && rawId.trim() ? rawId.trim() : null;

  const rawTitulo = formData.get('titulo');
  const titulo = typeof rawTitulo === 'string' ? rawTitulo.trim() : '';

  const rawPlataforma = formData.get('plataforma');
  const plataforma = typeof rawPlataforma === 'string' ? rawPlataforma.trim() : '';

  const rawSku = formData.get('sku');
  const sku = typeof rawSku === 'string' ? rawSku.trim() : '';

  const rawFecha = formData.get('fechaAdquisicion');
  const fechaAdquisicion = typeof rawFecha === 'string' ? rawFecha.trim() : '';

  const rawHoras = formData.get('horasJugadas');
  const horasJugadas =
    Number.isInteger(Number(rawHoras)) && Number(rawHoras) >= 0 ? Number(rawHoras) : 0;

  const rawEstado = formData.get('estado') || formData.get('estadoProgreso');
  const estadoProgreso =
    typeof rawEstado === 'string' ? rawEstado.trim().toLowerCase() : 'pendiente';

  const rawFormato = formData.get('formato');
  const formato =
    typeof rawFormato === 'string' && rawFormato.trim().toLowerCase() === 'fisico'
      ? 'fisico'
      : 'digital';

  // Campos condicionales según el formato
  const rawEan = formData.get('ean13') || formData.get('codigoBarras');
  const codigoBarras =
    formato === 'fisico' && typeof rawEan === 'string' && rawEan.trim() ? rawEan.trim() : null;

  const rawUbicacion = formData.get('ubicacion') || formData.get('ubicacionEstanteria');
  const ubicacionEstanteria =
    formato === 'fisico' && typeof rawUbicacion === 'string' && rawUbicacion.trim()
      ? rawUbicacion.trim()
      : null;

  const rawTienda = formData.get('tiendaDigital');
  const tiendaDigital =
    formato === 'digital' && typeof rawTienda === 'string' && rawTienda.trim()
      ? rawTienda.trim()
      : null;

  // Grupo dinámico de DLCs (getAll)
  const nombresDlc = formData.getAll('dlcNombre[]');
  const estadosDlc = formData.getAll('dlcEstado[]');
  const dlcs = [];

  const totalDlcs = Math.min(nombresDlc.length, estadosDlc.length, 3);
  for (let i = 0; i < totalDlcs; i++) {
    const nom = typeof nombresDlc[i] === 'string' ? nombresDlc[i].trim() : '';
    const est =
      typeof estadosDlc[i] === 'string' ? estadosDlc[i].trim().toLowerCase() : 'pendiente';
    if (nom) {
      dlcs.push({
        titulo: nom,
        estado: ['pendiente', 'jugando', 'completado'].includes(est) ? est : 'pendiente',
      });
    }
  }

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
  };
}

/**
 * Alterna la visibilidad y activación de las secciones condicionales según el formato elegido.
 *
 * Cumple el Requisito [S2-06] y ENUNCIADO R17:
 * - 'fisico': muestra y habilita la sección física (#bloque-fisico), ocultando y deshabilitando la digital (#bloque-digital).
 * - 'digital': muestra y habilita la sección digital (#bloque-digital), ocultando y deshabilitando la física (#bloque-fisico).
 * - Cualquier otro valor o nulo: oculta y deshabilita ambos bloques.
 *
 * Al deshabilitar un bloque limpia clases de error (.is-invalid), resetea aria-invalid a "false"
 * y vacía el texto de las cajas de error enlazadas mediante aria-describedby.
 *
 * @param {HTMLFormElement | HTMLElement | Document} formulario Formulario o contenedor.
 * @param {'fisico' | 'digital' | string | null} [formato] Formato seleccionado.
 */
export function alternarSeccionFormato(formulario, formato) {
  if (!formulario) return;

  const bloqueFisico = formulario.querySelector('#bloque-fisico');
  const bloqueDigital = formulario.querySelector('#bloque-digital');

  const formatoLimpio = typeof formato === 'string' ? formato.trim().toLowerCase() : null;

  const esFisico = formatoLimpio === 'fisico';
  const esDigital = formatoLimpio === 'digital';

  if (bloqueFisico) {
    bloqueFisico.hidden = !esFisico;
    bloqueFisico.disabled = !esFisico;
    const controlesFisicos = bloqueFisico.querySelectorAll('input, select, textarea');
    controlesFisicos.forEach((control) => {
      control.disabled = !esFisico;
      if (!esFisico) {
        control.classList.remove('is-invalid', 'is-valid');
        control.setAttribute('aria-invalid', 'false');
        const descId = control.getAttribute('aria-describedby');
        if (descId) {
          const cajaError = formulario.querySelector(`#${descId}`);
          if (cajaError) cajaError.textContent = '';
        }
      }
    });
  }

  if (bloqueDigital) {
    bloqueDigital.hidden = !esDigital;
    bloqueDigital.disabled = !esDigital;
    const controlesDigitales = bloqueDigital.querySelectorAll('input, select, textarea');
    controlesDigitales.forEach((control) => {
      control.disabled = !esDigital;
      if (!esDigital) {
        control.classList.remove('is-invalid', 'is-valid');
        control.setAttribute('aria-invalid', 'false');
        const descId = control.getAttribute('aria-describedby');
        if (descId) {
          const cajaError = formulario.querySelector(`#${descId}`);
          if (cajaError) cajaError.textContent = '';
        }
      }
    });
  }
}

/**
 * Rellena los campos base y condicionales de un formulario con los datos de un videojuego.
 *
 * @param {HTMLFormElement} formulario Elemento <form id="form-ficha">.
 * @param {Object} datos Objeto con las propiedades del videojuego.
 */
export function rellenarFormulario(formulario, datos = {}) {
  if (!formulario || !datos || typeof datos !== 'object') return;

  const inputId = formulario.querySelector('#ficha-id');
  if (inputId) inputId.value = datos.id || '';

  const inputTitulo = formulario.querySelector('#ficha-titulo');
  if (inputTitulo) inputTitulo.value = datos.titulo || '';

  const selectPlataforma = formulario.querySelector('#ficha-plataforma');
  if (selectPlataforma && datos.plataforma) {
    selectPlataforma.value = datos.plataforma;
  }

  const inputSku = formulario.querySelector('#ficha-sku');
  if (inputSku) inputSku.value = datos.sku || '';

  const inputFecha = formulario.querySelector('#ficha-fecha');
  if (inputFecha) inputFecha.value = datos.fechaAdquisicion || '';

  const inputHoras = formulario.querySelector('#ficha-horas');
  if (inputHoras) {
    inputHoras.value = typeof datos.horasJugadas === 'number' ? String(datos.horasJugadas) : '0';
  }

  const selectEstado = formulario.querySelector('#ficha-estado');
  if (selectEstado && datos.estadoProgreso) {
    selectEstado.value = datos.estadoProgreso.toLowerCase();
  }

  const formato =
    typeof datos.formato === 'string' && datos.formato.toLowerCase() === 'fisico'
      ? 'fisico'
      : datos.formato
        ? 'digital'
        : null;

  const radioFisico = formulario.querySelector('#formato-fisico');
  const radioDigital = formulario.querySelector('#formato-digital');

  if (formato === 'fisico') {
    if (radioFisico) radioFisico.checked = true;
    if (radioDigital) radioDigital.checked = false;
  } else if (formato === 'digital') {
    if (radioDigital) radioDigital.checked = true;
    if (radioFisico) radioFisico.checked = false;
  }

  alternarSeccionFormato(formulario, formato);

  const inputEan = formulario.querySelector('#ficha-ean');
  if (inputEan) {
    inputEan.value = datos.codigoBarras || datos.ean13 || '';
  }

  const inputUbicacion = formulario.querySelector('#ficha-ubicacion');
  if (inputUbicacion) {
    inputUbicacion.value = datos.ubicacionEstanteria || datos.ubicacion || '';
  }

  const selectTienda = formulario.querySelector('#ficha-tienda');
  if (selectTienda && datos.tiendaDigital) {
    selectTienda.value = datos.tiendaDigital;
  }
}

/**
 * Inicializa la página ficha.html.
 * Inyecta la fecha máxima en el selector de fecha y conecta el conmutador condicional de formato.
 *
 * @param {Document} [documento=document] Objeto de documento inyectable.
 * @param {Object} [opciones={}] Opciones configurables (fechaReferencia, formatoInicial, etc.).
 * @returns {Function} Función de limpieza para desconectar los oyentes.
 */
export function iniciarFicha(
  documento = typeof document !== 'undefined' ? document : null,
  opciones = {},
) {
  if (!documento) return () => {};

  const inputFecha = documento.querySelector('#ficha-fecha');
  if (inputFecha) {
    inyectarFechaMaxima(inputFecha, opciones.fechaReferencia || new Date());
  }

  const formulario = documento.querySelector('#form-ficha') || documento.querySelector('form');
  if (!formulario) return () => {};

  const radioMarcado = formulario.querySelector('input[name="formato"]:checked');
  const formatoInicial = opciones.formatoInicial || (radioMarcado ? radioMarcado.value : null);
  alternarSeccionFormato(formulario, formatoInicial);

  const manejadorCambioFormato = (evento) => {
    if (evento.target && evento.target.name === 'formato') {
      alternarSeccionFormato(formulario, evento.target.value);
    }
  };

  formulario.addEventListener('change', manejadorCambioFormato);

  return function desconectar() {
    formulario.removeEventListener('change', manejadorCambioFormato);
  };
}

export default {
  inyectarFechaMaxima,
  alternarSeccionFormato,
  leerDatosFormulario,
  rellenarFormulario,
  iniciarFicha,
};
