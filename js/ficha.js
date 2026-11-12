/**
 * Controlador del formulario de alta y edición de videojuegos (ficha.html).
 *
 * Gestiona los campos base de la entidad Videojuego, la inyección dinámica de la fecha
 * máxima (max = hoy), la extracción y normalización de datos con FormData, el flujo
 * completo de alta y edición según parámetros de URL, persistencia desacoplada y la
 * inicialización accesible de la vista.
 *
 * @module ficha
 */

import { conectarValidacionTiempoReal } from './validacion.js';
import { obtenerJuegoPorId, crearJuego, actualizarJuego } from './juegos.js';
import { obtenerSesion } from './sesion.js';
import { guardarAviso, lanzarAviso } from './avisos.js';

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

export const MAX_DLCS = 3;
export const MIN_DLCS = 0;

let contadorDlc = 0;

/**
 * Genera un identificador único para los campos de una fila dinámica de DLC.
 * @returns {string} Cadena identificadora única.
 */
export function generarIdDlc() {
  contadorDlc += 1;
  return `dlc-${Date.now()}-${contadorDlc}`;
}

/**
 * Resetea el contador interno de identificadores de DLC (utilizado en pruebas).
 */
export function resetearContadorDlc() {
  contadorDlc = 0;
}

/**
 * Sincroniza el estado del botón de añadir DLC según el número actual de filas.
 * Se desactiva y marca con aria-disabled al alcanzar el límite (3) y se reactiva con menos de 3.
 *
 * @param {HTMLElement} contenedor Contenedor #lista-dlcs.
 * @param {HTMLButtonElement} [btnAnadir] Botón #btn-anadir-dlc.
 * @param {number} [maximo=MAX_DLCS] Límite máximo de elementos.
 */
export function sincronizarBotonAnadirDlc(contenedor, btnAnadir = null, maximo = MAX_DLCS) {
  if (!contenedor || !btnAnadir) return;

  const totalFilas = contenedor.querySelectorAll('.js-fila-dlc').length;
  const alcanzadoMaximo = totalFilas >= maximo;

  btnAnadir.disabled = alcanzadoMaximo;
  if (alcanzadoMaximo) {
    btnAnadir.setAttribute('aria-disabled', 'true');
  } else {
    btnAnadir.removeAttribute('aria-disabled');
  }
}

/**
 * Añade una nueva fila de DLC clonando la plantilla <template id="tpl-dlc">.
 * Genera identificadores únicos por campo, enlaza label con htmlFor y aria-describedby
 * con su respectiva caja de error, y gestiona el límite de 3 filas.
 *
 * @param {HTMLElement} contenedor Contenedor #lista-dlcs.
 * @param {HTMLTemplateElement} template Elemento <template id="tpl-dlc">.
 * @param {Object} [valores={}] Valores iniciales { titulo, estado }.
 * @param {HTMLButtonElement} [btnAnadir] Botón #btn-anadir-dlc para sincronizar su estado.
 * @returns {HTMLElement | null} El elemento de fila creado o null si ya se alcanzó el límite.
 */
export function anadirFilaDlc(contenedor, template, valores = {}, btnAnadir = null) {
  if (!contenedor || !template || !(template instanceof HTMLTemplateElement)) {
    return null;
  }

  const filasActuales = contenedor.querySelectorAll('.js-fila-dlc');
  if (filasActuales.length >= MAX_DLCS) {
    sincronizarBotonAnadirDlc(contenedor, btnAnadir);
    return null;
  }

  const clon = template.content.cloneNode(true);
  const fila = clon.querySelector('.js-fila-dlc');
  if (!fila) return null;

  const idUnico = generarIdDlc();

  const labelNombre = fila.querySelector('.js-label-dlc-nombre');
  const inputNombre = fila.querySelector('.js-input-dlc-nombre');
  const errorNombre = fila.querySelector('.js-error-dlc-nombre');

  const idInputNombre = `input-nombre-${idUnico}`;
  const idErrorNombre = `error-nombre-${idUnico}`;

  if (labelNombre) labelNombre.htmlFor = idInputNombre;
  if (inputNombre) {
    inputNombre.id = idInputNombre;
    inputNombre.setAttribute('aria-describedby', idErrorNombre);
    if (typeof valores.titulo === 'string') {
      inputNombre.value = valores.titulo;
    }
  }
  if (errorNombre) {
    errorNombre.id = idErrorNombre;
  }

  const labelEstado = fila.querySelector('.js-label-dlc-estado');
  const selectEstado = fila.querySelector('.js-select-dlc-estado');
  const errorEstado = fila.querySelector('.js-error-dlc-estado');

  const idSelectEstado = `select-estado-${idUnico}`;
  const idErrorEstado = `error-estado-${idUnico}`;

  if (labelEstado) labelEstado.htmlFor = idSelectEstado;
  if (selectEstado) {
    selectEstado.id = idSelectEstado;
    selectEstado.setAttribute('aria-describedby', idErrorEstado);
    if (typeof valores.estado === 'string') {
      selectEstado.value = valores.estado.toLowerCase();
    }
  }
  if (errorEstado) {
    errorEstado.id = idErrorEstado;
  }

  contenedor.appendChild(fila);

  sincronizarBotonAnadirDlc(contenedor, btnAnadir);

  return fila;
}

/**
 * Elimina una fila de DLC del contenedor y reactiva el botón de añadir si estaba desactivado.
 *
 * @param {HTMLElement} fila Fila de DLC a eliminar (.js-fila-dlc).
 * @param {HTMLElement} contenedor Contenedor #lista-dlcs.
 * @param {HTMLButtonElement} [btnAnadir] Botón #btn-anadir-dlc.
 */
export function quitarFilaDlc(fila, contenedor, btnAnadir = null) {
  if (!fila || typeof fila.remove !== 'function') return;

  fila.remove();

  if (contenedor) {
    sincronizarBotonAnadirDlc(contenedor, btnAnadir);
  }
}

/**
 * Conecta los eventos del grupo dinámico de DLCs (delegación para quitar filas y click en añadir).
 *
 * @param {HTMLElement} contenedor Elemento #lista-dlcs.
 * @param {HTMLTemplateElement} template Elemento <template id="tpl-dlc">.
 * @param {HTMLButtonElement} btnAnadir Elemento #btn-anadir-dlc.
 * @returns {Function} Función para desconectar los oyentes.
 */
export function conectarDlcs(contenedor, template, btnAnadir) {
  if (!contenedor || !template || !btnAnadir) return () => {};

  const alHacerClickAnadir = () => {
    anadirFilaDlc(contenedor, template, {}, btnAnadir);
  };

  const alHacerClickQuitar = (evento) => {
    const btnQuitar = evento.target.closest('.js-btn-quitar-dlc');
    if (btnQuitar && contenedor.contains(btnQuitar)) {
      const fila = btnQuitar.closest('.js-fila-dlc');
      if (fila) {
        quitarFilaDlc(fila, contenedor, btnAnadir);
      }
    }
  };

  btnAnadir.addEventListener('click', alHacerClickAnadir);
  contenedor.addEventListener('click', alHacerClickQuitar);

  sincronizarBotonAnadirDlc(contenedor, btnAnadir);

  return function desconectarDlcs() {
    btnAnadir.removeEventListener('click', alHacerClickAnadir);
    contenedor.removeEventListener('click', alHacerClickQuitar);
  };
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

  // Población de expansiones dinámicas (DLCs)
  const contenedorDlcs = formulario.querySelector('#lista-dlcs');
  const templateDlc =
    formulario.querySelector('#tpl-dlc') ||
    (formulario.ownerDocument && formulario.ownerDocument.querySelector('#tpl-dlc'));
  const btnAnadirDlc = formulario.querySelector('#btn-anadir-dlc');

  if (contenedorDlcs) {
    contenedorDlcs.innerHTML = '';
    if (Array.isArray(datos.dlcs) && templateDlc) {
      const dlcsLimite = datos.dlcs.slice(0, MAX_DLCS);
      dlcsLimite.forEach((dlc) => {
        anadirFilaDlc(contenedorDlcs, templateDlc, dlc, btnAnadirDlc);
      });
    }
    sincronizarBotonAnadirDlc(contenedorDlcs, btnAnadirDlc);
  }
}

/**
 * Inicializa la página ficha.html.
 *
 * Controla el flujo integral de alta y edición de la entidad Videojuego:
 * - Detecta el modo (Alta o Edición) a partir del parámetro de URL `?id=...` o `opciones.id`.
 * - En modo edición: carga el juego del catálogo del usuario. Si no existe, almacena
 *   un aviso diferido de error y redirige inmediatamente a `listado.html`.
 * - En modo alta: ajusta los títulos y botones para la creación de un nuevo registro.
 * - Inyecta dinámicamente la fecha máxima permitida (max = hoy) en el selector de fecha.
 * - Conecta la reactividad accesible para la sección condicional de formato (físico / digital).
 * - Vincula la gestión dinámica del grupo de DLCs con límites (0 a 3).
 * - Conecta el motor genérico de validación en tiempo real y captura el envío (`submit`).
 * - Al guardar con datos válidos: persiste el videojuego normalizado (crear o actualizar),
 *   almacena el aviso diferido de éxito en `sessionStorage` y redirige a `listado.html`.
 *
 * @param {Document} [documento=typeof document !== 'undefined' ? document : null] Objeto Document del DOM.
 * @param {Object} [opciones={}] Opciones configurables e inyección de dependencias.
 * @param {Storage} [opciones.almacenLocal] Almacén de persistencia para videojuegos (localStorage).
 * @param {Storage} [opciones.almacenSesion] Almacén de persistencia para sesión y avisos (sessionStorage).
 * @param {Window | { location: { search: string, href?: string } }} [opciones.ventana] Objeto de ventana o mock para navegación.
 * @param {Function} [opciones.navegar] Callback de navegación para redirección (por defecto window.location.href).
 * @param {string} [opciones.usuario] Usuario propietario (por defecto extraído de la sesión activa).
 * @param {string | null} [opciones.id] ID de videojuego explícito para modo edición o anulación.
 * @param {Date | string} [opciones.fechaReferencia] Fecha de referencia para fecha máxima.
 * @param {'fisico' | 'digital'} [opciones.formatoInicial] Formato inicial en modo alta.
 * @param {Array<Object>} [opciones.dlcsIniciales] Lista inicial de DLCs en modo alta.
 * @param {Object} [opciones.validacion] Opciones adicionales pasadas a conectarValidacionTiempoReal.
 * @param {Function} [opciones.alGuardar] Callback opcional invocado al guardar con éxito ({ modo, juego }).
 * @returns {Function} Función de limpieza para desconectar todos los oyentes de eventos.
 */
export function iniciarFicha(
  documento = typeof document !== 'undefined' ? document : null,
  opciones = {},
) {
  if (!documento) return () => {};

  const almacenLocal =
    opciones.almacenLocal ?? (typeof window !== 'undefined' ? window.localStorage : null);
  const almacenSesion =
    opciones.almacenSesion ?? (typeof window !== 'undefined' ? window.sessionStorage : null);
  const ventana = opciones.ventana ?? (typeof window !== 'undefined' ? window : null);
  const navegar =
    opciones.navegar ??
    ((url) => {
      if (ventana && ventana.location) {
        ventana.location.href = url;
      }
    });

  const usuario =
    opciones.usuario || (almacenSesion ? obtenerSesion(almacenSesion)?.usuario : '') || '';

  const formulario = documento.querySelector('#form-ficha') || documento.querySelector('form');
  const inputFecha = documento.querySelector('#ficha-fecha');
  if (inputFecha) {
    inyectarFechaMaxima(inputFecha, opciones.fechaReferencia || new Date());
  }

  // Detección de parámetro id para Modo Edición
  let idJuego = opciones.id !== undefined ? opciones.id : null;
  if (idJuego === null && ventana && ventana.location && ventana.location.search) {
    try {
      const urlParams = new URLSearchParams(ventana.location.search);
      const paramId = urlParams.get('id');
      if (paramId && paramId.trim()) {
        idJuego = paramId.trim();
      }
    } catch {
      idJuego = null;
    }
  }

  const modoEdicion = Boolean(idJuego);
  let juegoEnEdicion = null;

  if (modoEdicion) {
    juegoEnEdicion = obtenerJuegoPorId(idJuego, usuario, almacenLocal);
    if (!juegoEnEdicion) {
      guardarAviso(
        'El videojuego solicitado no existe o no pertenece a tu catálogo',
        'danger',
        almacenSesion,
      );
      navegar('listado.html');
      return () => {};
    }

    const tituloPagina = documento.querySelector('#titulo-pagina-ficha');
    if (tituloPagina) {
      tituloPagina.textContent = 'Edición de Videojuego';
    }
    const btnGuardar = documento.querySelector('#btn-guardar-ficha');
    if (btnGuardar) {
      const btnTexto = btnGuardar.querySelector('.btn-text');
      if (btnTexto) {
        btnTexto.textContent = 'Guardar cambios';
      }
    }
  } else {
    const tituloPagina = documento.querySelector('#titulo-pagina-ficha');
    if (tituloPagina) {
      tituloPagina.textContent = 'Alta de Videojuego';
    }
    const btnGuardar = documento.querySelector('#btn-guardar-ficha');
    if (btnGuardar) {
      const btnTexto = btnGuardar.querySelector('.btn-text');
      if (btnTexto) {
        btnTexto.textContent = 'Guardar videojuego';
      }
    }
  }

  let desconectarFormato = () => {};
  let desconectarValidacion = () => {};
  let desconectarDlcs = () => {};

  const contenedorDlcs = documento.querySelector('#lista-dlcs');
  const templateDlc = documento.querySelector('#tpl-dlc');
  const btnAnadirDlc = documento.querySelector('#btn-anadir-dlc');

  if (contenedorDlcs && templateDlc && btnAnadirDlc) {
    desconectarDlcs = conectarDlcs(contenedorDlcs, templateDlc, btnAnadirDlc);
  }

  if (formulario) {
    if (modoEdicion && juegoEnEdicion) {
      rellenarFormulario(formulario, juegoEnEdicion);
    } else {
      const radioMarcado = formulario.querySelector('input[name="formato"]:checked');
      const formatoInicial = opciones.formatoInicial || (radioMarcado ? radioMarcado.value : null);
      alternarSeccionFormato(formulario, formatoInicial);

      if (Array.isArray(opciones.dlcsIniciales) && contenedorDlcs && templateDlc && btnAnadirDlc) {
        contenedorDlcs.innerHTML = '';
        opciones.dlcsIniciales.slice(0, MAX_DLCS).forEach((dlc) => {
          anadirFilaDlc(contenedorDlcs, templateDlc, dlc, btnAnadirDlc);
        });
        sincronizarBotonAnadirDlc(contenedorDlcs, btnAnadirDlc);
      }
    }

    const manejadorCambioFormato = (evento) => {
      if (evento.target && evento.target.name === 'formato') {
        alternarSeccionFormato(formulario, evento.target.value);
      }
    };
    formulario.addEventListener('change', manejadorCambioFormato);
    desconectarFormato = () => {
      formulario.removeEventListener('change', manejadorCambioFormato);
    };

    const alEnviarValido = (evento) => {
      if (evento && typeof evento.preventDefault === 'function') {
        evento.preventDefault();
      }

      const datos = leerDatosFormulario(formulario);

      if (!usuario) {
        lanzarAviso(
          formulario,
          'No se puede guardar el videojuego sin una sesión de usuario activa.',
          'danger',
        );
        return;
      }

      try {
        if (modoEdicion) {
          const idActualizar = datos.id || idJuego;
          const actualizado = actualizarJuego(idActualizar, datos, usuario, almacenLocal);
          if (!actualizado) {
            lanzarAviso(formulario, 'Error al actualizar el videojuego.', 'danger');
            return;
          }
          guardarAviso('Videojuego actualizado con éxito', 'success', almacenSesion);
          if (typeof opciones.alGuardar === 'function') {
            opciones.alGuardar({ modo: 'edicion', juego: actualizado });
          }
          navegar('listado.html');
        } else {
          const nuevo = crearJuego(datos, usuario, almacenLocal);
          guardarAviso('Videojuego añadido con éxito a tu catálogo', 'success', almacenSesion);
          if (typeof opciones.alGuardar === 'function') {
            opciones.alGuardar({ modo: 'alta', juego: nuevo });
          }
          navegar('listado.html');
        }
      } catch (err) {
        lanzarAviso(formulario, err?.message || 'Error al guardar el videojuego.', 'danger');
      }
    };

    desconectarValidacion = conectarValidacionTiempoReal(formulario, {
      ...opciones.validacion,
      fechaReferencia: opciones.fechaReferencia,
      alEnviarValido,
    });
  }

  return function desconectar() {
    desconectarFormato();
    desconectarDlcs();
    desconectarValidacion();
  };
}

export default {
  MAX_DLCS,
  MIN_DLCS,
  generarIdDlc,
  resetearContadorDlc,
  sincronizarBotonAnadirDlc,
  anadirFilaDlc,
  quitarFilaDlc,
  conectarDlcs,
  inyectarFechaMaxima,
  alternarSeccionFormato,
  leerDatosFormulario,
  rellenarFormulario,
  iniciarFicha,
};
