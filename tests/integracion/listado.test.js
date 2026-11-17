import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cargarPagina, escribir } from '../pagina.js';
import { AlmacenFalso } from '../AlmacenFalso.js';
import { iniciarListado, RETARDO_DEBOUNCE_DEFECTO } from '../../js/listado.js';
import { iniciarAvisos } from '../../js/avisos.js';
import { iniciarSesion } from '../../js/sesion.js';
import { crearJuego, obtenerJuegos } from '../../js/juegos.js';

describe('integración listado.html (buscador con fake timers, paginación y modal)', () => {
  let almacenLocal;
  let almacenSesion;
  let desconectar;
  let desconectarAvisos;
  let ventanaMock;

  beforeEach(() => {
    cargarPagina('listado.html');
    almacenLocal = new AlmacenFalso();
    almacenSesion = new AlmacenFalso();
    iniciarSesion('pablo_dev', 'usuario', almacenSesion);
    desconectar = () => {};
    desconectarAvisos = () => {};

    const modal = document.querySelector('#modal-borrar');
    if (modal && !modal.showModal) {
      modal.showModal = function () {
        this.setAttribute('open', '');
      };
    }
    if (modal && !modal.close) {
      modal.close = function () {
        this.removeAttribute('open');
      };
    }

    ventanaMock = {
      location: {
        search: '',
        href: 'http://localhost/listado.html',
      },
      history: {
        replaceState: vi.fn((_state, _title, nuevaUrl) => {
          const parsed = new URL(nuevaUrl, 'http://localhost');
          ventanaMock.location.search = parsed.search;
          ventanaMock.location.href = parsed.href;
        }),
      },
    };
  });

  afterEach(() => {
    desconectar();
    desconectarAvisos();
    vi.useRealTimers();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('pagina el catálogo real de listado.html y navega entre páginas actualizando la URL', () => {
    for (let i = 1; i <= 8; i += 1) {
      crearJuego(
        {
          titulo: `Videojuego ${i}`,
          plataforma: 'PC',
          formato: 'digital',
          tiendaDigital: 'Steam',
          sku: `GAME-RPG-000${i}`,
        },
        'pablo_dev',
        almacenLocal,
      );
    }

    desconectar = iniciarListado(document, {
      almacenLocal,
      almacenSesion,
      ventana: ventanaMock,
      porPagina: 6,
    });

    expect(document.querySelectorAll('#grid-catalogo .col')).toHaveLength(6);
    expect(document.querySelector('#contador-resultados').textContent).toContain('8 videojuegos');

    const btnAnterior = document.querySelector('#paginacion-catalogo button[data-page="prev"]');
    const btnSiguiente = document.querySelector('#paginacion-catalogo button[data-page="next"]');
    expect(btnAnterior.disabled).toBe(true);
    expect(btnSiguiente.disabled).toBe(false);

    // Navegar a página 2
    btnSiguiente.click();
    expect(ventanaMock.location.search).toBe('?pagina=2');
    expect(document.querySelectorAll('#grid-catalogo .col')).toHaveLength(2);
    expect(document.querySelector('#grid-catalogo .js-juego-titulo').textContent).toBe(
      'Videojuego 7',
    );
    expect(
      document
        .querySelector('#paginacion-catalogo button[data-page="2"]')
        .getAttribute('aria-current'),
    ).toBe('page');
  });

  it('filtra con temporizadores falsos (debounce), ignora tildes/mayúsculas y resetea a página 1', () => {
    vi.useFakeTimers();

    for (let i = 1; i <= 7; i += 1) {
      crearJuego(
        {
          titulo: i === 2 ? 'Pokémon: Leyendas Árceus' : `Título Genérico ${i}`,
          plataforma: i === 2 ? 'Nintendo Switch' : 'PC',
          formato: 'fisico',
          sku: `GAME-RPG-000${i}`,
        },
        'pablo_dev',
        almacenLocal,
      );
    }

    // Empezamos directamente en página 2
    ventanaMock.location.search = '?pagina=2';
    ventanaMock.location.href = 'http://localhost/listado.html?pagina=2';

    desconectar = iniciarListado(document, {
      almacenLocal,
      almacenSesion,
      ventana: ventanaMock,
      porPagina: 4,
    });

    expect(document.querySelectorAll('#grid-catalogo .col')).toHaveLength(3);

    const buscador = document.querySelector('#buscador-catalogo');
    escribir(buscador, 'pokemon');

    // Antes de 300ms no debe aplicarse
    vi.advanceTimersByTime(RETARDO_DEBOUNCE_DEFECTO - 1);
    expect(document.querySelectorAll('#grid-catalogo .col')).toHaveLength(3);

    // Al cumplirse los 300ms filtra y resetea a página 1
    vi.advanceTimersByTime(1);
    expect(ventanaMock.location.search).toBe('');
    expect(document.querySelectorAll('#grid-catalogo .col')).toHaveLength(1);
    expect(document.querySelector('#grid-catalogo .js-juego-titulo').textContent).toBe(
      'Pokémon: Leyendas Árceus',
    );
    expect(document.querySelector('#contador-resultados').textContent).toContain('1 videojuego');

    // Búsqueda sin coincidencias muestra el estado vacío
    escribir(buscador, 'NoExisteEnCatalogo');
    vi.advanceTimersByTime(RETARDO_DEBOUNCE_DEFECTO);
    expect(document.querySelectorAll('#grid-catalogo .col')).toHaveLength(0);
    expect(document.querySelector('#estado-vacio-catalogo').hidden).toBe(false);
    expect(document.querySelector('#paginacion-catalogo').hidden).toBe(true);
  });

  it('borra un videojuego tras confirmar en el <dialog> y muestra el aviso en listado.html', () => {
    crearJuego(
      { titulo: 'Bloodborne', plataforma: 'PlayStation 5', formato: 'fisico' },
      'pablo_dev',
      almacenLocal,
    );

    desconectarAvisos = iniciarAvisos(document, { almacenSesion });
    desconectar = iniciarListado(document, {
      almacenLocal,
      almacenSesion,
      ventana: ventanaMock,
    });

    // Abrir modal y cancelar primero -> el juego permanece intacto
    document.querySelector('.js-btn-eliminar').click();
    expect(document.querySelector('#modal-juego-nombre').textContent).toContain('«Bloodborne»');
    document.querySelector('#btn-cancelar-borrado').click();
    expect(obtenerJuegos('pablo_dev', almacenLocal)).toHaveLength(1);

    // Volver a abrir y confirmar -> borra de almacenamiento y muestra aviso
    document.querySelector('.js-btn-eliminar').click();
    document.querySelector('#btn-confirmar-borrado').click();

    expect(obtenerJuegos('pablo_dev', almacenLocal)).toHaveLength(0);
    expect(document.querySelector('#estado-vacio-catalogo').hidden).toBe(false);
    expect(document.querySelector('#region-avisos').textContent).toContain(
      'Videojuego eliminado con éxito',
    );
  });
});
