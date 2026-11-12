import { describe, it, expect } from 'vitest';
import { paginar, POR_PAGINA_DEFECTO } from '../../js/paginar.js';
import { paginar as paginarReexportado } from '../../js/paginacion.js';

describe('módulo paginar.js (función pura de paginación)', () => {
  const coleccionPrueba = [
    { id: 'juego_1', titulo: 'Elden Ring' },
    { id: 'juego_2', titulo: 'The Legend of Zelda: Tears of the Kingdom' },
    { id: 'juego_3', titulo: 'Super Mario Odyssey' },
    { id: 'juego_4', titulo: 'God of War Ragnarok' },
    { id: 'juego_5', titulo: 'Cyberpunk 2077' },
    { id: 'juego_6', titulo: 'Hollow Knight' },
    { id: 'juego_7', titulo: 'Red Dead Redemption 2' },
  ];

  describe('requisitos obligatorios del enunciado (Requisito 21)', () => {
    it('obtiene correctamente la primera página', () => {
      const resultado = paginar(coleccionPrueba, 1, 3);

      expect(resultado.pagina).toBe(1);
      expect(resultado.paginaActual).toBe(1);
      expect(resultado.totalPaginas).toBe(3);
      expect(resultado.total).toBe(7);
      expect(resultado.porPagina).toBe(3);
      expect(resultado.elementos).toHaveLength(3);
      expect(resultado.elementos[0].id).toBe('juego_1');
      expect(resultado.elementos[2].id).toBe('juego_3');
      expect(resultado.tieneAnterior).toBe(false);
      expect(resultado.tieneSiguiente).toBe(true);
    });

    it('obtiene correctamente la última página con elementos sobrantes', () => {
      const resultado = paginar(coleccionPrueba, 3, 3);

      expect(resultado.pagina).toBe(3);
      expect(resultado.totalPaginas).toBe(3);
      expect(resultado.elementos).toHaveLength(1);
      expect(resultado.elementos[0].id).toBe('juego_7');
      expect(resultado.tieneAnterior).toBe(true);
      expect(resultado.tieneSiguiente).toBe(false);
    });

    it('obtiene correctamente la última página en caso de división exacta', () => {
      const seisJuegos = coleccionPrueba.slice(0, 6);
      const resultado = paginar(seisJuegos, 3, 2);

      expect(resultado.pagina).toBe(3);
      expect(resultado.totalPaginas).toBe(3);
      expect(resultado.elementos).toHaveLength(2);
      expect(resultado.elementos[0].id).toBe('juego_5');
      expect(resultado.elementos[1].id).toBe('juego_6');
      expect(resultado.tieneAnterior).toBe(true);
      expect(resultado.tieneSiguiente).toBe(false);
    });

    it('corrige a la última página si se solicita una página que no existe por exceso', () => {
      const resultado = paginar(coleccionPrueba, 999, 3);

      expect(resultado.pagina).toBe(3);
      expect(resultado.totalPaginas).toBe(3);
      expect(resultado.elementos).toHaveLength(1);
      expect(resultado.elementos[0].id).toBe('juego_7');
      expect(resultado.tieneAnterior).toBe(true);
      expect(resultado.tieneSiguiente).toBe(false);
    });

    it('corrige a la primera página si se solicita una página inferior a 1', () => {
      const resCero = paginar(coleccionPrueba, 0, 3);
      expect(resCero.pagina).toBe(1);
      expect(resCero.elementos).toHaveLength(3);
      expect(resCero.elementos[0].id).toBe('juego_1');

      const resNegativo = paginar(coleccionPrueba, -5, 3);
      expect(resNegativo.pagina).toBe(1);
      expect(resNegativo.elementos[0].id).toBe('juego_1');
    });

    it('gestiona adecuadamente una lista vacía', () => {
      const resultado = paginar([], 1, 5);

      expect(resultado.elementos).toEqual([]);
      expect(resultado.pagina).toBe(1);
      expect(resultado.totalPaginas).toBe(1);
      expect(resultado.total).toBe(0);
      expect(resultado.porPagina).toBe(5);
      expect(resultado.tieneAnterior).toBe(false);
      expect(resultado.tieneSiguiente).toBe(false);
    });

    it('gestiona una lista vacía solicitando una página inexistente', () => {
      const resultado = paginar([], 10, 6);

      expect(resultado.elementos).toEqual([]);
      expect(resultado.pagina).toBe(1);
      expect(resultado.totalPaginas).toBe(1);
      expect(resultado.total).toBe(0);
    });
  });

  describe('resiliencia y tolerancia ante parámetros inesperados', () => {
    it('maneja listas no array (null, undefined, objeto o string) devolviendo array vacío', () => {
      expect(paginar(null, 1, 5).elementos).toEqual([]);
      expect(paginar(undefined, 1, 5).elementos).toEqual([]);
      expect(paginar({}, 1, 5).elementos).toEqual([]);
      expect(paginar('cadena', 1, 5).elementos).toEqual([]);
    });

    it('utiliza POR_PAGINA_DEFECTO cuando no se especifica o es inválido', () => {
      const diezNumeros = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const resDefecto = paginar(diezNumeros, 1);
      expect(resDefecto.porPagina).toBe(POR_PAGINA_DEFECTO);
      expect(resDefecto.elementos).toHaveLength(POR_PAGINA_DEFECTO);

      const resInvalido = paginar(diezNumeros, 1, 0);
      expect(resInvalido.porPagina).toBe(POR_PAGINA_DEFECTO);

      const resNegativo = paginar(diezNumeros, 1, -2);
      expect(resNegativo.porPagina).toBe(POR_PAGINA_DEFECTO);

      const resTextoInvalido = paginar(diezNumeros, 1, 'invalido');
      expect(resTextoInvalido.porPagina).toBe(POR_PAGINA_DEFECTO);
    });

    it('soporta números pasados como cadenas (ej. provenientes de URLSearchParams)', () => {
      const items = ['A', 'B', 'C', 'D', 'E'];
      const resultado = paginar(items, '2', '2');

      expect(resultado.pagina).toBe(2);
      expect(resultado.porPagina).toBe(2);
      expect(resultado.elementos).toEqual(['C', 'D']);
      expect(resultado.totalPaginas).toBe(3);
    });

    it('corrige valores de página no numéricos a la página 1', () => {
      const items = ['A', 'B', 'C'];
      expect(paginar(items, 'pagina_invalida', 2).pagina).toBe(1);
      expect(paginar(items, NaN, 2).pagina).toBe(1);
      expect(paginar(items, null, 2).pagina).toBe(1);
    });
  });

  describe('tabla de casos it.each para combinaciones de límites', () => {
    const lista10 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    it.each([
      ['primera página exacta', 1, 3, [1, 2, 3], 1, 4],
      ['segunda página intermedia', 2, 3, [4, 5, 6], 2, 4],
      ['tercera página intermedia', 3, 3, [7, 8, 9], 3, 4],
      ['cuarta página (última con resto 1)', 4, 3, [10], 4, 4],
      ['página 5 inexistente (superior)', 5, 3, [10], 4, 4],
      ['página 100 inexistente (muy superior)', 100, 3, [10], 4, 4],
      ['página 0 inexistente (inferior)', 0, 3, [1, 2, 3], 1, 4],
      ['página negativa (-1)', -1, 3, [1, 2, 3], 1, 4],
    ])(
      '%s: pagina solicitada %i, porPagina %i -> elementos %j, pagina corregida %i, totalPaginas %i',
      (_caso, pagSolicitada, itemsPorPag, elemEsperados, pagCorregidaEsperada, totPagEsperadas) => {
        const res = paginar(lista10, pagSolicitada, itemsPorPag);
        expect(res.elementos).toEqual(elemEsperados);
        expect(res.pagina).toBe(pagCorregidaEsperada);
        expect(res.totalPaginas).toBe(totPagEsperadas);
      },
    );
  });

  describe('re-exportación desde paginacion.js', () => {
    it('la función paginar importada desde paginacion.js tiene el mismo comportamiento', () => {
      const items = ['X', 'Y', 'Z'];
      expect(paginarReexportado(items, 1, 2)).toEqual(paginar(items, 1, 2));
    });
  });
});
