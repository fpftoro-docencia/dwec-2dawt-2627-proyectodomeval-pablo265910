import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  RETARDO_DEBOUNCE_DEFECTO,
  normalizarTextoBusqueda,
  debounce,
  filtrarListaPorTexto,
} from '../../js/buscador.js';

describe('módulo buscador.js (normalización NFD, debounce y filtrado)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('normalizarTextoBusqueda', () => {
    it.each([
      ['tildes españolas y mayúsculas', '  Pokémon: Leyendas Árceus  ', 'pokemon: leyendas arceus'],
      ['diéresis y circunflejos', 'Crème Brûlée & Über', 'creme brulee & uber'],
      ['texto en mayúsculas', 'ELDEN RING', 'elden ring'],
      ['texto con espacios internos', '  PlayStation   5 ', 'playstation   5'],
      ['cadena vacía', '   ', ''],
      ['valor null', null, ''],
      ['valor undefined', undefined, ''],
      ['tipo numérico', 12345, ''],
    ])('%s: "%s" -> "%s"', (_caso, entrada, esperado) => {
      expect(normalizarTextoBusqueda(entrada)).toBe(esperado);
    });
  });

  describe('debounce', () => {
    it('lanza TypeError si el primer parámetro no es una función', () => {
      expect(() => debounce(null)).toThrow(TypeError);
      expect(() => debounce('no-fn')).toThrow(TypeError);
    });

    it('retrasa la ejecución hasta transcurrir el retardo por defecto (300ms)', () => {
      const espia = vi.fn();
      const debounced = debounce(espia);

      debounced('zelda');
      expect(espia).not.toHaveBeenCalled();

      vi.advanceTimersByTime(RETARDO_DEBOUNCE_DEFECTO - 1);
      expect(espia).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(espia).toHaveBeenCalledTimes(1);
      expect(espia).toHaveBeenCalledWith('zelda');
    });

    it('agrupa múltiples llamadas rápidas y ejecuta solo la última con sus argumentos', () => {
      const espia = vi.fn();
      const debounced = debounce(espia, 250);

      debounced('p');
      vi.advanceTimersByTime(100);
      debounced('po');
      vi.advanceTimersByTime(100);
      debounced('pok');
      vi.advanceTimersByTime(100);
      debounced('pokemon');

      expect(espia).not.toHaveBeenCalled();

      vi.advanceTimersByTime(250);
      expect(espia).toHaveBeenCalledTimes(1);
      expect(espia).toHaveBeenCalledWith('pokemon');
    });

    it('permite cancelar un temporizador pendiente mediante .cancelar()', () => {
      const espia = vi.fn();
      const debounced = debounce(espia, 300);

      debounced('cancelado');
      vi.advanceTimersByTime(150);
      debounced.cancelar();

      vi.advanceTimersByTime(500);
      expect(espia).not.toHaveBeenCalled();
    });

    it('usa el retardo por defecto si el retardo recibido es negativo o no finito', () => {
      const espia = vi.fn();
      const debounced = debounce(espia, -50);

      debounced('ok');
      vi.advanceTimersByTime(299);
      expect(espia).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(espia).toHaveBeenCalledWith('ok');
    });
  });

  describe('filtrarListaPorTexto', () => {
    const catalogo = [
      { id: 1, titulo: 'Pokémon Escarlata', plataforma: 'Nintendo Switch', sku: 'GAME-RPG-0001' },
      { id: 2, titulo: 'Bloodborne', plataforma: 'PlayStation 5', sku: 'GAME-ACT-0002' },
      { id: 3, titulo: 'Cyberpunk 2077', plataforma: 'PC', sku: 'GAME-RPG-0003' },
    ];

    it('devuelve [] si la lista no es un array y una copia si la consulta está vacía', () => {
      expect(filtrarListaPorTexto(null, 'pc', (x) => [x.titulo])).toEqual([]);

      const copia = filtrarListaPorTexto(catalogo, '   ', (x) => [x.titulo]);
      expect(copia).toEqual(catalogo);
      expect(copia).not.toBe(catalogo);
    });

    it('filtra ignorando mayúsculas y tildes usando la función extractora', () => {
      const resultado = filtrarListaPorTexto(catalogo, 'pokemon', (j) => [
        j.titulo,
        j.plataforma,
        j.sku,
      ]);
      expect(resultado).toHaveLength(1);
      expect(resultado[0].id).toBe(1);

      const resultadoInverso = filtrarListaPorTexto(catalogo, 'POKÉMON', (j) => [j.titulo]);
      expect(resultadoInverso).toHaveLength(1);
      expect(resultadoInverso[0].id).toBe(1);
    });

    it('coincide con cualquiera de los campos indexados (ej. plataforma o SKU)', () => {
      const porSku = filtrarListaPorTexto(catalogo, 'game-rpg', (j) => [
        j.titulo,
        j.plataforma,
        j.sku,
      ]);
      expect(porSku.map((j) => j.id)).toEqual([1, 3]);
    });
  });
});
