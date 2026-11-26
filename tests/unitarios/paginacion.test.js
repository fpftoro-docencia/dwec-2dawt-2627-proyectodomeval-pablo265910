import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  obtenerPaginaUrl,
  fijarPaginaUrl,
  renderizarControlesPaginacion,
  conectarPaginacion,
  paginar,
  POR_PAGINA_DEFECTO,
} from '../../js/paginacion.js';

describe('módulo paginacion.js (componente visual y sincronización de URL)', () => {
  let ventanaMock;

  beforeEach(() => {
    ventanaMock = {
      location: {
        href: 'http://localhost:3000/listado.html',
        pathname: '/listado.html',
        search: '',
        hash: '',
      },
      history: {
        replaceState: vi.fn((_estado, _titulo, nuevaUrl) => {
          const partes = nuevaUrl.split('?');
          ventanaMock.location.pathname = partes[0];
          ventanaMock.location.search = partes[1] ? `?${partes[1]}` : '';
          ventanaMock.location.href = `http://localhost:3000${nuevaUrl}`;
        }),
      },
    };
  });

  describe('re-exportaciones', () => {
    it('re-exporta paginar y POR_PAGINA_DEFECTO desde paginar.js', () => {
      expect(typeof paginar).toBe('function');
      expect(POR_PAGINA_DEFECTO).toBe(6);
    });
  });

  describe('obtenerPaginaUrl', () => {
    it('devuelve 1 si no hay parámetros en la URL', () => {
      ventanaMock.location.search = '';
      expect(obtenerPaginaUrl('pagina', ventanaMock)).toBe(1);
    });

    it('devuelve el número de página cuando está presente en la URL', () => {
      ventanaMock.location.search = '?pagina=4';
      expect(obtenerPaginaUrl('pagina', ventanaMock)).toBe(4);
    });

    it('devuelve 1 si el valor es inválido o no numérico', () => {
      ventanaMock.location.search = '?pagina=invalido';
      expect(obtenerPaginaUrl('pagina', ventanaMock)).toBe(1);

      ventanaMock.location.search = '?pagina=0';
      expect(obtenerPaginaUrl('pagina', ventanaMock)).toBe(1);

      ventanaMock.location.search = '?pagina=-3';
      expect(obtenerPaginaUrl('pagina', ventanaMock)).toBe(1);
    });

    it('soporta claves de parámetro personalizadas', () => {
      ventanaMock.location.search = '?p=7';
      expect(obtenerPaginaUrl('p', ventanaMock)).toBe(7);
    });

    it('devuelve 1 de forma segura si ventana o location son null', () => {
      expect(obtenerPaginaUrl('pagina', null)).toBe(1);
      expect(obtenerPaginaUrl('pagina', {})).toBe(1);
    });

    it('devuelve 1 si ocurre una excepción al leer los parámetros', () => {
      const ventanaError = {
        location: {
          get search() {
            throw new Error('Fallo de acceso');
          },
        },
      };
      expect(obtenerPaginaUrl('pagina', ventanaError)).toBe(1);
    });
  });

  describe('fijarPaginaUrl', () => {
    it('actualiza la URL con replaceState cuando la página es mayor que 1', () => {
      fijarPaginaUrl(3, 'pagina', ventanaMock);

      expect(ventanaMock.history.replaceState).toHaveBeenCalledWith(
        null,
        '',
        '/listado.html?pagina=3',
      );
      expect(ventanaMock.location.search).toBe('?pagina=3');
    });

    it('elimina el parámetro de la URL cuando la página es 1 para mantenerla limpia', () => {
      ventanaMock.location.search = '?pagina=3';
      ventanaMock.location.href = 'http://localhost:3000/listado.html?pagina=3';

      fijarPaginaUrl(1, 'pagina', ventanaMock);

      expect(ventanaMock.history.replaceState).toHaveBeenCalledWith(null, '', '/listado.html');
      expect(ventanaMock.location.search).toBe('');
    });

    it('preserva otros parámetros existentes en la búsqueda al actualizar', () => {
      ventanaMock.location.search = '?buscar=zelda&orden=recientes';
      ventanaMock.location.href = 'http://localhost:3000/listado.html?buscar=zelda&orden=recientes';

      fijarPaginaUrl(2, 'pagina', ventanaMock);

      expect(ventanaMock.history.replaceState).toHaveBeenCalledWith(
        null,
        '',
        expect.stringContaining('buscar=zelda'),
      );
      expect(ventanaMock.history.replaceState).toHaveBeenCalledWith(
        null,
        '',
        expect.stringContaining('pagina=2'),
      );
    });

    it('no falla de forma resiliente si ventana o history no están disponibles', () => {
      expect(() => fijarPaginaUrl(2, 'pagina', null)).not.toThrow();
      expect(() => fijarPaginaUrl(2, 'pagina', {})).not.toThrow();
    });
  });

  describe('renderizarControlesPaginacion', () => {
    let contenedor;

    beforeEach(() => {
      contenedor = document.createElement('ul');
      contenedor.className = 'pagination';
    });

    it('renderiza la estructura completa para 3 páginas posicionadas en la página 1', () => {
      renderizarControlesPaginacion(contenedor, { pagina: 1, totalPaginas: 3 });

      const items = contenedor.querySelectorAll('.page-item');
      expect(items).toHaveLength(5); // Anterior + 3 números + Siguiente

      // Botón «Anterior» deshabilitado en página 1
      const btnAnterior = items[0].querySelector('button');
      expect(items[0].classList.contains('disabled')).toBe(true);
      expect(btnAnterior.disabled).toBe(true);
      expect(btnAnterior.textContent).toBe('Anterior');

      // Botón «1» activo con aria-current="page"
      const btn1 = items[1].querySelector('button');
      expect(items[1].classList.contains('active')).toBe(true);
      expect(btn1.getAttribute('aria-current')).toBe('page');
      expect(btn1.textContent).toBe('1');

      // Botones «2» y «3» no activos
      expect(items[2].classList.contains('active')).toBe(false);
      expect(items[2].querySelector('button').hasAttribute('aria-current')).toBe(false);

      // Botón «Siguiente» habilitado
      const btnSiguiente = items[4].querySelector('button');
      expect(items[4].classList.contains('disabled')).toBe(false);
      expect(btnSiguiente.disabled).toBe(false);
      expect(btnSiguiente.textContent).toBe('Siguiente');
    });

    it('renderiza correctamente el estado en la última página', () => {
      renderizarControlesPaginacion(contenedor, { pagina: 4, totalPaginas: 4 });

      const items = contenedor.querySelectorAll('.page-item');
      expect(items).toHaveLength(6); // Anterior + 4 números + Siguiente

      // Anterior habilitado
      expect(items[0].classList.contains('disabled')).toBe(false);
      expect(items[0].querySelector('button').disabled).toBe(false);

      // Página 4 activa
      expect(items[4].classList.contains('active')).toBe(true);
      expect(items[4].querySelector('button').getAttribute('aria-current')).toBe('page');

      // Siguiente deshabilitado
      expect(items[5].classList.contains('disabled')).toBe(true);
      expect(items[5].querySelector('button').disabled).toBe(true);
    });

    it('renderiza correctamente el estado en una página intermedia', () => {
      renderizarControlesPaginacion(contenedor, { pagina: 2, totalPaginas: 3 });

      const items = contenedor.querySelectorAll('.page-item');
      expect(items[0].classList.contains('disabled')).toBe(false); // Anterior habilitado
      expect(items[2].classList.contains('active')).toBe(true); // Página 2 activa
      expect(items[4].classList.contains('disabled')).toBe(false); // Siguiente habilitado
    });

    it('sustituye los nodos anteriores de forma segura al re-renderizar', () => {
      renderizarControlesPaginacion(contenedor, { pagina: 1, totalPaginas: 2 });
      expect(contenedor.querySelectorAll('.page-item')).toHaveLength(4);

      renderizarControlesPaginacion(contenedor, { pagina: 2, totalPaginas: 5 });
      expect(contenedor.querySelectorAll('.page-item')).toHaveLength(7);
    });

    it('no falla si el contenedor es null', () => {
      expect(() =>
        renderizarControlesPaginacion(null, { pagina: 1, totalPaginas: 1 }),
      ).not.toThrow();
    });
  });

  describe('conectarPaginacion — delegación de eventos y navegación', () => {
    let contenedor;
    let alCambiarPaginaMock;

    beforeEach(() => {
      contenedor = document.createElement('ul');
      contenedor.className = 'pagination';
      renderizarControlesPaginacion(contenedor, { pagina: 2, totalPaginas: 4 });
      alCambiarPaginaMock = vi.fn();
    });

    it('delega el click en un botón de número y ejecuta callback y fijarPaginaUrl', () => {
      conectarPaginacion(contenedor, {
        alCambiarPagina: alCambiarPaginaMock,
        ventana: ventanaMock,
      });

      const btnPagina3 = contenedor.querySelector('button[data-pagina="3"]');
      btnPagina3.click();

      expect(alCambiarPaginaMock).toHaveBeenCalledWith(3);
      expect(ventanaMock.history.replaceState).toHaveBeenCalledWith(
        null,
        '',
        '/listado.html?pagina=3',
      );
    });

    it('delega el click en «Siguiente» incrementando la página', () => {
      conectarPaginacion(contenedor, {
        alCambiarPagina: alCambiarPaginaMock,
        ventana: ventanaMock,
      });

      const btnSiguiente = contenedor.querySelector('button[data-pagina="next"]');
      btnSiguiente.click();

      expect(alCambiarPaginaMock).toHaveBeenCalledWith(3);
    });

    it('delega el click en «Anterior» decrementando la página', () => {
      conectarPaginacion(contenedor, {
        alCambiarPagina: alCambiarPaginaMock,
        ventana: ventanaMock,
      });

      const btnAnterior = contenedor.querySelector('button[data-pagina="prev"]');
      btnAnterior.click();

      expect(alCambiarPaginaMock).toHaveBeenCalledWith(1);
    });

    it('no ejecuta el callback si el botón clickeado está deshabilitado', () => {
      renderizarControlesPaginacion(contenedor, { pagina: 1, totalPaginas: 3 });

      conectarPaginacion(contenedor, {
        alCambiarPagina: alCambiarPaginaMock,
        ventana: ventanaMock,
      });

      const btnAnterior = contenedor.querySelector('button[data-pagina="prev"]');
      expect(btnAnterior.disabled).toBe(true);

      btnAnterior.click();
      expect(alCambiarPaginaMock).not.toHaveBeenCalled();
    });

    it('no ejecuta el callback si se clickea en la misma página activa', () => {
      conectarPaginacion(contenedor, {
        alCambiarPagina: alCambiarPaginaMock,
        ventana: ventanaMock,
      });

      const btnPagina2 = contenedor.querySelector('button[data-pagina="2"]');
      btnPagina2.click();

      expect(alCambiarPaginaMock).not.toHaveBeenCalled();
    });

    it('admite la función opcional obtenerEstadoActual para resolver estado dinámico', () => {
      let estadoDinamico = { pagina: 1, totalPaginas: 5 };

      conectarPaginacion(contenedor, {
        alCambiarPagina: alCambiarPaginaMock,
        obtenerEstadoActual: () => estadoDinamico,
        ventana: ventanaMock,
      });

      const btnSiguiente = contenedor.querySelector('button[data-pagina="next"]');
      btnSiguiente.click();

      expect(alCambiarPaginaMock).toHaveBeenCalledWith(2);

      // Ahora simulamos que el estado externo avanzó a la página 3
      estadoDinamico = { pagina: 3, totalPaginas: 5 };
      btnSiguiente.click();

      expect(alCambiarPaginaMock).toHaveBeenCalledWith(4);
    });

    it('la función desconectar devuelta retira el oyente correctamente', () => {
      const desconectar = conectarPaginacion(contenedor, {
        alCambiarPagina: alCambiarPaginaMock,
        ventana: ventanaMock,
      });

      desconectar();

      const btnPagina3 = contenedor.querySelector('button[data-pagina="3"]');
      btnPagina3.click();

      expect(alCambiarPaginaMock).not.toHaveBeenCalled();
    });

    it('devuelve una función vacía segura si el contenedor o el callback son inválidos', () => {
      const desconectarNull = conectarPaginacion(null);
      expect(typeof desconectarNull).toBe('function');
      expect(() => desconectarNull()).not.toThrow();

      const desconectarSinCallback = conectarPaginacion(contenedor, {});
      expect(typeof desconectarSinCallback).toBe('function');
      expect(() => desconectarSinCallback()).not.toThrow();
    });
  });
});
