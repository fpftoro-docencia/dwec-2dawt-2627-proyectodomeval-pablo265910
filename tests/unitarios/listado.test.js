import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AlmacenFalso } from '../AlmacenFalso.js';
import { crearJuego, obtenerJuegos } from '../../js/juegos.js';
import {
  MAPA_ICONOS_CONSOLAS,
  renderizarTarjetaJuego,
  renderizarListadoJuegos,
  actualizarContadorResultados,
  alternarEstadoVacio,
  conectarModalBorrado,
  iniciarListado,
} from '../../js/listado.js';

describe('módulo listado.js (renderizado con <template>, modal <dialog> y catálogo)', () => {
  let templateJuego;
  let contenedorGrid;
  let elementoContador;
  let elementoVacio;
  let contenedorPaginacion;
  let modalBorrado;

  beforeEach(() => {
    document.body.innerHTML = `
      <section>
        <p id="contador-resultados">
          Mostrando <strong class="text-light font-mono">0</strong> videojuegos
        </p>
      </section>

      <section id="estado-vacio-catalogo" hidden>
        <h2>Tu bóveda de videojuegos está vacía</h2>
      </section>

      <div id="grid-catalogo" class="row"></div>

      <ul id="paginacion-catalogo" class="pagination"></ul>

      <dialog id="modal-borrar">
        <p>¿Deseas eliminar <strong id="modal-juego-nombre">este videojuego</strong>?</p>
        <button type="button" id="btn-cancelar-borrado">Cancelar</button>
        <button type="button" id="btn-confirmar-borrado">Sí, eliminar</button>
      </dialog>

      <template id="tpl-juego">
        <div class="col">
          <article class="gv-card-game">
            <div class="gv-card-hero">
              <img src="" alt="" class="gv-card-console-bg js-juego-consola-img" />
              <div class="gv-card-hero-badges">
                <span class="gv-badge js-juego-plataforma">PC</span>
                <span class="gv-badge js-juego-formato">Físico</span>
                <span class="gv-badge js-juego-estado">Jugando</span>
              </div>
              <h3 class="gv-card-hero-title js-juego-titulo">Título</h3>
              <span class="gv-card-hero-sku">SKU: <span class="js-juego-sku">GAME-0001</span></span>
            </div>
            <div class="gv-card-info-side">
              <dl>
                <dd><span class="js-juego-horas">0</span> h</dd>
                <dt class="js-juego-detalle-label">Detalle</dt>
                <dd class="js-juego-detalle-valor">Valor</dd>
              </dl>
              <div>
                <a href="ficha.html" class="js-btn-editar">Editar</a>
                <button type="button" class="js-btn-eliminar">Eliminar</button>
              </div>
            </div>
          </article>
        </div>
      </template>
    `;

    templateJuego = document.querySelector('#tpl-juego');
    contenedorGrid = document.querySelector('#grid-catalogo');
    elementoContador = document.querySelector('#contador-resultados');
    elementoVacio = document.querySelector('#estado-vacio-catalogo');
    contenedorPaginacion = document.querySelector('#paginacion-catalogo');
    modalBorrado = document.querySelector('#modal-borrar');

    // Polyfill básico para happy-dom si no implementa showModal/close
    if (!modalBorrado.showModal) {
      modalBorrado.showModal = function () {
        this.setAttribute('open', '');
      };
    }
    if (!modalBorrado.close) {
      modalBorrado.close = function () {
        this.removeAttribute('open');
      };
    }
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  describe('renderizarTarjetaJuego', () => {
    it('devuelve null si los argumentos son inválidos', () => {
      expect(renderizarTarjetaJuego(null, templateJuego)).toBeNull();
      expect(renderizarTarjetaJuego({}, null)).toBeNull();
      expect(renderizarTarjetaJuego('no-objeto', templateJuego)).toBeNull();
    });

    it('clona y rellena los campos de un videojuego físico con textContent seguro', () => {
      const juegoFisico = {
        id: 'gv_123',
        titulo: 'Bloodborne',
        plataforma: 'PlayStation 5',
        formato: 'fisico',
        fechaAdquisicion: '2026-03-01',
        horasJugadas: 65,
        estadoProgreso: 'completado',
        sku: 'GAME-ACT-0005',
        ubicacionEstanteria: 'EST-B-04',
      };

      const tarjeta = renderizarTarjetaJuego(juegoFisico, templateJuego);
      expect(tarjeta).not.toBeNull();
      expect(tarjeta.querySelector('.js-juego-titulo').textContent).toBe('Bloodborne');
      expect(tarjeta.querySelector('.js-juego-sku').textContent).toBe('GAME-ACT-0005');
      expect(tarjeta.querySelector('.js-juego-plataforma').textContent).toBe('PlayStation 5');
      expect(tarjeta.querySelector('.js-juego-formato').textContent).toBe('Físico');
      expect(tarjeta.querySelector('.js-juego-horas').textContent).toBe('65');
      expect(tarjeta.querySelector('.js-juego-estado').textContent).toBe('Completado');
      expect(tarjeta.querySelector('.js-juego-estado').className).toContain('gv-badge-completado');
      expect(tarjeta.querySelector('.js-juego-consola-img').src).toContain(
        MAPA_ICONOS_CONSOLAS['PlayStation 5'],
      );

      // Detalle condicional físico
      expect(tarjeta.querySelector('.js-juego-detalle-label').textContent).toBe(
        'Ubicación / Balda',
      );
      expect(tarjeta.querySelector('.js-juego-detalle-valor').textContent).toBe('EST-B-04');

      // Botón editar y botón eliminar
      const enlaceEditar = tarjeta.querySelector('.js-btn-editar');
      expect(enlaceEditar.getAttribute('href')).toBe('ficha.html?id=gv_123');
      expect(enlaceEditar.getAttribute('aria-label')).toBe('Editar Bloodborne');

      const btnEliminar = tarjeta.querySelector('.js-btn-eliminar');
      expect(btnEliminar.dataset.id).toBe('gv_123');
      expect(btnEliminar.dataset.titulo).toBe('Bloodborne');
      expect(btnEliminar.getAttribute('aria-label')).toBe('Eliminar Bloodborne');
    });

    it('rellena los detalles condicionales para un videojuego digital', () => {
      const juegoDigital = {
        id: 'gv_456',
        titulo: 'Cyberpunk 2077',
        plataforma: 'PC',
        formato: 'digital',
        horasJugadas: 110,
        estadoProgreso: 'jugando',
        sku: 'GAME-RPG-0099',
        tiendaDigital: 'Steam',
      };

      const tarjeta = renderizarTarjetaJuego(juegoDigital, templateJuego);
      expect(tarjeta.querySelector('.js-juego-formato').textContent).toBe('Digital');
      expect(tarjeta.querySelector('.js-juego-detalle-label').textContent).toBe('Tienda Digital');
      expect(tarjeta.querySelector('.js-juego-detalle-valor').textContent).toBe('Steam');
      expect(tarjeta.querySelector('.js-juego-consola-img').src).toContain(MAPA_ICONOS_CONSOLAS.PC);
    });

    it('previene ataques XSS renderizando texto malicioso exclusivamente como texto plano', () => {
      const juegoMalicioso = {
        id: 'gv_xss',
        titulo: '<script>alert("xss")</script><img src=x onerror=alert(1)>',
        plataforma: 'PC',
        formato: 'digital',
        sku: '<b>SKU-NEGRITA</b>',
      };

      const tarjeta = renderizarTarjetaJuego(juegoMalicioso, templateJuego);
      const elTitulo = tarjeta.querySelector('.js-juego-titulo');
      expect(elTitulo.textContent).toBe(
        '<script>alert("xss")</script><img src=x onerror=alert(1)>',
      );
      expect(elTitulo.children).toHaveLength(0); // Sin etiquetas HTML inyectadas

      const elSku = tarjeta.querySelector('.js-juego-sku');
      expect(elSku.textContent).toBe('<b>SKU-NEGRITA</b>');
      expect(elSku.children).toHaveLength(0);
    });
  });

  describe('renderizarListadoJuegos', () => {
    it('no lanza errores con parámetros nulos o contenedor vacío', () => {
      expect(() => renderizarListadoJuegos(null, [], templateJuego)).not.toThrow();
      expect(() => renderizarListadoJuegos(contenedorGrid, null, templateJuego)).not.toThrow();
    });

    it('vacía el contenedor e inserta atómicamente la lista de tarjetas usando DocumentFragment', () => {
      const juegos = [
        { id: '1', titulo: 'Juego 1', plataforma: 'PC', formato: 'digital' },
        { id: '2', titulo: 'Juego 2', plataforma: 'Retro', formato: 'fisico' },
      ];

      renderizarListadoJuegos(contenedorGrid, juegos, templateJuego);

      const columnas = contenedorGrid.querySelectorAll('.col');
      expect(columnas).toHaveLength(2);
      expect(columnas[0].querySelector('.js-juego-titulo').textContent).toBe('Juego 1');
      expect(columnas[1].querySelector('.js-juego-titulo').textContent).toBe('Juego 2');
    });
  });

  describe('actualizarContadorResultados y alternarEstadoVacio', () => {
    it('actualiza el contador con singular y plural correctamente', () => {
      actualizarContadorResultados(elementoContador, 0);
      expect(elementoContador.textContent).toContain('0 videojuegos');

      actualizarContadorResultados(elementoContador, 1);
      expect(elementoContador.textContent).toContain('1 videojuego');

      actualizarContadorResultados(elementoContador, 14);
      expect(elementoContador.textContent).toContain('14 videojuegos');
    });

    it('alterna la propiedad hidden del estado vacío', () => {
      alternarEstadoVacio(elementoVacio, true); // Hay elementos
      expect(elementoVacio.hidden).toBe(true);

      alternarEstadoVacio(elementoVacio, false); // Vacío
      expect(elementoVacio.hidden).toBe(false);
    });
  });

  describe('conectarModalBorrado', () => {
    it('abre el diálogo modal y asigna el título del videojuego seleccionado', () => {
      const spyShowModal = vi.spyOn(modalBorrado, 'showModal');
      const gestor = conectarModalBorrado(modalBorrado);

      gestor.abrir('gv_99', 'The Witcher 3');
      expect(modalBorrado.querySelector('#modal-juego-nombre').textContent).toContain(
        '«The Witcher 3»',
      );
      expect(spyShowModal).toHaveBeenCalled();

      gestor.desconectar();
    });

    it('cierra el diálogo al pulsar el botón Cancelar e invoca alCancelar', () => {
      const spyClose = vi.spyOn(modalBorrado, 'close');
      const alCancelar = vi.fn();
      const gestor = conectarModalBorrado(modalBorrado, { alCancelar });

      gestor.abrir('gv_99', 'Juego');
      const btnCancelar = modalBorrado.querySelector('#btn-cancelar-borrado');
      btnCancelar.click();

      expect(spyClose).toHaveBeenCalled();
      expect(alCancelar).toHaveBeenCalled();

      gestor.desconectar();
    });

    it('cierra el diálogo al confirmar e invoca alConfirmar con el ID pendiente', () => {
      const spyClose = vi.spyOn(modalBorrado, 'close');
      const alConfirmar = vi.fn();
      const gestor = conectarModalBorrado(modalBorrado, { alConfirmar });

      gestor.abrir('gv_100', 'Dark Souls');
      const btnConfirmar = modalBorrado.querySelector('#btn-confirmar-borrado');
      btnConfirmar.click();

      expect(spyClose).toHaveBeenCalled();
      expect(alConfirmar).toHaveBeenCalledWith('gv_100');

      gestor.desconectar();
    });

    it('cierra el diálogo al hacer clic en el backdrop', () => {
      const alCancelar = vi.fn();
      const gestor = conectarModalBorrado(modalBorrado, { alCancelar });

      gestor.abrir('gv_101', 'Zelda');
      modalBorrado.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(alCancelar).toHaveBeenCalled();
      gestor.desconectar();
    });
  });

  describe('iniciarListado (flujo completo)', () => {
    let almacenLocal;
    let almacenSesion;
    const usuarioPrueba = 'pablo_dev';

    beforeEach(() => {
      almacenLocal = new AlmacenFalso();
      almacenSesion = new AlmacenFalso();
    });

    it('con catálogo vacío, muestra empty state, contador en 0 y oculta paginación', () => {
      const desconectar = iniciarListado(document, {
        almacenLocal,
        almacenSesion,
        usuario: usuarioPrueba,
      });

      expect(elementoVacio.hidden).toBe(false);
      expect(elementoContador.textContent).toContain('0 videojuegos');
      expect(contenedorGrid.querySelectorAll('.col')).toHaveLength(0);
      expect(contenedorPaginacion.hidden).toBe(true);

      desconectar();
    });

    it('renderiza tarjetas paginadas cuando existen videojuegos en el catálogo', () => {
      crearJuego(
        { titulo: 'Juego A', plataforma: 'PC', formato: 'digital' },
        usuarioPrueba,
        almacenLocal,
      );
      crearJuego(
        { titulo: 'Juego B', plataforma: 'PlayStation 5', formato: 'fisico' },
        usuarioPrueba,
        almacenLocal,
      );

      const desconectar = iniciarListado(document, {
        almacenLocal,
        almacenSesion,
        usuario: usuarioPrueba,
        porPagina: 6,
      });

      expect(elementoVacio.hidden).toBe(true);
      expect(elementoContador.textContent).toContain('2 videojuegos');
      expect(contenedorGrid.querySelectorAll('.col')).toHaveLength(2);
      expect(contenedorPaginacion.hidden).toBe(false);

      desconectar();
    });

    it('abre el modal de confirmación al pulsar Eliminar en una tarjeta mediante delegación de eventos', () => {
      const juego = crearJuego(
        { titulo: 'Metroid Dread', plataforma: 'Nintendo Switch', formato: 'fisico' },
        usuarioPrueba,
        almacenLocal,
      );

      const spyShowModal = vi.spyOn(modalBorrado, 'showModal');

      const desconectar = iniciarListado(document, {
        almacenLocal,
        almacenSesion,
        usuario: usuarioPrueba,
      });

      const btnEliminar = contenedorGrid.querySelector('.js-btn-eliminar');
      expect(btnEliminar).not.toBeNull();
      expect(btnEliminar.dataset.id).toBe(juego.id);
      btnEliminar.click();

      expect(spyShowModal).toHaveBeenCalled();
      expect(modalBorrado.querySelector('#modal-juego-nombre').textContent).toContain(
        '«Metroid Dread»',
      );

      desconectar();
    });

    it('elimina el videojuego de localStorage al confirmar en el modal y refresca la vista', () => {
      const juego1 = crearJuego(
        { titulo: 'Juego Uno', plataforma: 'PC', formato: 'digital' },
        usuarioPrueba,
        almacenLocal,
      );
      const juego2 = crearJuego(
        { titulo: 'Juego Dos', plataforma: 'PC', formato: 'digital' },
        usuarioPrueba,
        almacenLocal,
      );

      const alEliminar = vi.fn();

      const desconectar = iniciarListado(document, {
        almacenLocal,
        almacenSesion,
        usuario: usuarioPrueba,
        alEliminar,
      });

      // Abrir modal con la primera tarjeta
      const primerBotonEliminar = contenedorGrid.querySelectorAll('.js-btn-eliminar')[0];
      primerBotonEliminar.click();

      // Confirmar en el modal
      const btnConfirmar = modalBorrado.querySelector('#btn-confirmar-borrado');
      btnConfirmar.click();

      expect(alEliminar).toHaveBeenCalledWith(juego1.id);

      const restantes = obtenerJuegos(usuarioPrueba, almacenLocal);
      expect(restantes).toHaveLength(1);
      expect(restantes[0].id).toBe(juego2.id);

      // La vista se ha refrescado automáticamente
      expect(elementoContador.textContent).toContain('1 videojuego');
      expect(contenedorGrid.querySelectorAll('.col')).toHaveLength(1);

      desconectar();
    });
  });
});
