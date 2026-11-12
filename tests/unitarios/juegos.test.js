import { describe, it, expect, beforeEach } from 'vitest';
import { AlmacenFalso } from '../AlmacenFalso.js';
import {
  obtenerClaveJuegos,
  generarIdJuego,
  obtenerJuegos,
  obtenerJuegoPorId,
  guardarJuegos,
  crearJuego,
  actualizarJuego,
  guardarJuego,
  eliminarJuego,
  vaciarJuegos,
  PREFIJO_CLAVE_JUEGOS,
} from '../../js/juegos.js';

describe('módulo juegos.js', () => {
  let almacen;

  beforeEach(() => {
    almacen = new AlmacenFalso();
  });

  describe('utilidades de clave y generación de ID (obtenerClaveJuegos, generarIdJuego)', () => {
    it('obtenerClaveJuegos normaliza espacios y minúsculas con el prefijo oficial', () => {
      expect(obtenerClaveJuegos('Pablo_Dev')).toBe(`${PREFIJO_CLAVE_JUEGOS}pablo_dev`);
      expect(obtenerClaveJuegos('   Samus_Aran   ')).toBe(`${PREFIJO_CLAVE_JUEGOS}samus_aran`);
    });

    it('obtenerClaveJuegos devuelve cadena vacía ante argumentos no válidos', () => {
      expect(obtenerClaveJuegos('')).toBe('');
      expect(obtenerClaveJuegos('   ')).toBe('');
      expect(obtenerClaveJuegos(null)).toBe('');
      expect(obtenerClaveJuegos(undefined)).toBe('');
      expect(obtenerClaveJuegos(12345)).toBe('');
    });

    it('generarIdJuego produce identificadores únicos con prefijo gv_', () => {
      const id1 = generarIdJuego();
      const id2 = generarIdJuego();
      expect(id1).toMatch(/^gv_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^gv_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('lectura y aislamiento multiusuario (obtenerJuegos, obtenerJuegoPorId)', () => {
    it('obtenerJuegos devuelve array vacío si el almacén está vacío o el usuario no existe', () => {
      expect(obtenerJuegos('pablo_dev', almacen)).toEqual([]);
    });

    it('devuelve array vacío si el usuario o almacén son nulos o indefinidos', () => {
      expect(obtenerJuegos(null, almacen)).toEqual([]);
      expect(obtenerJuegos(undefined, almacen)).toEqual([]);
      expect(obtenerJuegos('pablo_dev', null)).toEqual([]);
      expect(obtenerJuegos('pablo_dev', undefined)).toEqual([]);
    });

    it('garantiza aislamiento estricto: cada usuario solo ve sus propios videojuegos', () => {
      crearJuego(
        { titulo: 'Metroid Dread', plataforma: 'Nintendo Switch', formato: 'fisico' },
        'samus_aran',
        almacen,
      );

      crearJuego(
        { titulo: 'Elden Ring', plataforma: 'PC', formato: 'digital' },
        'tarnished_one',
        almacen,
      );

      const juegosSamus = obtenerJuegos('samus_aran', almacen);
      const juegosTarnished = obtenerJuegos('tarnished_one', almacen);

      expect(juegosSamus).toHaveLength(1);
      expect(juegosSamus[0].titulo).toBe('Metroid Dread');

      expect(juegosTarnished).toHaveLength(1);
      expect(juegosTarnished[0].titulo).toBe('Elden Ring');

      // Un tercer usuario no ve ningún juego
      expect(obtenerJuegos('link_hyrule', almacen)).toEqual([]);
    });

    it('obtenerJuegoPorId localiza un juego por su identificador único', () => {
      const creado = crearJuego(
        {
          titulo: 'Zelda: Tears of the Kingdom',
          plataforma: 'Nintendo Switch',
          formato: 'fisico',
        },
        'link_hyrule',
        almacen,
      );

      const encontrado = obtenerJuegoPorId(creado.id, 'link_hyrule', almacen);
      expect(encontrado).not.toBeNull();
      expect(encontrado?.id).toBe(creado.id);
      expect(encontrado?.titulo).toBe('Zelda: Tears of the Kingdom');
    });

    it('obtenerJuegoPorId devuelve null si el ID no existe o los argumentos son inválidos', () => {
      expect(obtenerJuegoPorId('id_fantasma', 'link_hyrule', almacen)).toBeNull();
      expect(obtenerJuegoPorId('', 'link_hyrule', almacen)).toBeNull();
      expect(obtenerJuegoPorId(null, 'link_hyrule', almacen)).toBeNull();
    });
  });

  describe('operaciones CRUD (crear, actualizar, guardar, eliminar)', () => {
    it('crearJuego persiste un nuevo juego con todas sus propiedades saneadas', () => {
      const nuevo = crearJuego(
        {
          titulo: '  Final Fantasy VII Rebirth  ',
          plataforma: 'PlayStation 5',
          formato: 'fisico',
          horasJugadas: 85,
          estadoProgreso: 'jugando',
          sku: 'GAME-RPG-0007',
          codigoBarras: '8412345678905',
          ubicacionEstanteria: 'EST-B-04',
          dlcs: [{ titulo: 'Episode INTERmission', estado: 'completado' }],
        },
        'cloud_strife',
        almacen,
      );

      expect(nuevo.id).toBeDefined();
      expect(nuevo.titulo).toBe('Final Fantasy VII Rebirth');
      expect(nuevo.plataforma).toBe('PlayStation 5');
      expect(nuevo.formato).toBe('fisico');
      expect(nuevo.horasJugadas).toBe(85);
      expect(nuevo.estadoProgreso).toBe('jugando');
      expect(nuevo.codigoBarras).toBe('8412345678905');
      expect(nuevo.ubicacionEstanteria).toBe('EST-B-04');
      expect(nuevo.dlcs).toEqual([{ titulo: 'Episode INTERmission', estado: 'completado' }]);
      expect(nuevo.creadoEn).toBeDefined();
      expect(nuevo.actualizadoEn).toBeDefined();

      const persistidos = obtenerJuegos('cloud_strife', almacen);
      expect(persistidos).toHaveLength(1);
      expect(persistidos[0].id).toBe(nuevo.id);
    });

    it('crearJuego rechaza entradas sin título o con datos no válidos', () => {
      expect(() => crearJuego(null, 'pablo_dev', almacen)).toThrow(/obligatorios/i);
      expect(() => crearJuego({ titulo: '' }, 'pablo_dev', almacen)).toThrow(/título/i);
      expect(() => crearJuego({ titulo: '   ' }, 'pablo_dev', almacen)).toThrow(/título/i);
    });

    it('actualizarJuego modifica las propiedades y actualiza el timestamp de modificación', () => {
      const inicial = crearJuego(
        {
          titulo: 'Cyberpunk 2077',
          plataforma: 'PC',
          formato: 'digital',
          horasJugadas: 30,
          estadoProgreso: 'jugando',
          tiendaDigital: 'Steam',
        },
        'v_mercenary',
        almacen,
      );

      const modificado = actualizarJuego(
        inicial.id,
        {
          horasJugadas: 90,
          estadoProgreso: 'completado',
          dlcs: [{ titulo: 'Phantom Liberty', estado: 'completado' }],
        },
        'v_mercenary',
        almacen,
      );

      expect(modificado).not.toBeNull();
      expect(modificado?.horasJugadas).toBe(90);
      expect(modificado?.estadoProgreso).toBe('completado');
      expect(modificado?.dlcs).toHaveLength(1);
      expect(modificado?.id).toBe(inicial.id);
      expect(modificado?.creadoEn).toBe(inicial.creadoEn);

      const leido = obtenerJuegoPorId(inicial.id, 'v_mercenary', almacen);
      expect(leido?.horasJugadas).toBe(90);
      expect(leido?.estadoProgreso).toBe('completado');
    });

    it('actualizarJuego devuelve null si el ID no existe en el catálogo o los argumentos son inválidos', () => {
      const res1 = actualizarJuego('id_inexistente', { titulo: 'Nuevo' }, 'v_mercenary', almacen);
      expect(res1).toBeNull();

      expect(actualizarJuego(null, { titulo: 'Nuevo' }, 'v_mercenary', almacen)).toBeNull();
      expect(actualizarJuego('', { titulo: 'Nuevo' }, 'v_mercenary', almacen)).toBeNull();
      expect(actualizarJuego('id_valido', null, 'v_mercenary', almacen)).toBeNull();
    });

    it('guardarJuego crea el juego si se pasa un ID que no existe previamente', () => {
      const juegoConIdNuevo = guardarJuego(
        { id: 'gv_inexistente_123', titulo: 'Juego Nuevo' },
        'pablo_dev',
        almacen,
      );
      expect(juegoConIdNuevo.id).toBeDefined();
      expect(juegoConIdNuevo.titulo).toBe('Juego Nuevo');
      expect(obtenerJuegos('pablo_dev', almacen)).toHaveLength(1);
    });

    it('guardarJuego unifica creación y actualización transparentemente', () => {
      // 1. Sin ID -> se crea
      const nuevo = guardarJuego(
        { titulo: 'Hades II', plataforma: 'PC', formato: 'digital' },
        'zagreus',
        almacen,
      );
      expect(nuevo.id).toBeDefined();

      // 2. Con ID existente -> se actualiza
      const actualizado = guardarJuego(
        { id: nuevo.id, horasJugadas: 40, estadoProgreso: 'completado' },
        'zagreus',
        almacen,
      );
      expect(actualizado.id).toBe(nuevo.id);
      expect(actualizado.horasJugadas).toBe(40);
      expect(obtenerJuegos('zagreus', almacen)).toHaveLength(1);
    });

    it('eliminarJuego borra un registro existente y devuelve true', () => {
      const juego1 = crearJuego({ titulo: 'Doom Eternal' }, 'slayer', almacen);
      const juego2 = crearJuego({ titulo: 'Doom 1993' }, 'slayer', almacen);

      expect(obtenerJuegos('slayer', almacen)).toHaveLength(2);

      const eliminado = eliminarJuego(juego1.id, 'slayer', almacen);
      expect(eliminado).toBe(true);

      const restantes = obtenerJuegos('slayer', almacen);
      expect(restantes).toHaveLength(1);
      expect(restantes[0].id).toBe(juego2.id);
    });

    it('eliminarJuego devuelve false si el ID no existe o es inválido', () => {
      expect(eliminarJuego('id_inexistente', 'slayer', almacen)).toBe(false);
      expect(eliminarJuego('', 'slayer', almacen)).toBe(false);
      expect(eliminarJuego(null, 'slayer', almacen)).toBe(false);
    });

    it('vaciarJuegos elimina toda la colección del usuario y maneja errores de forma segura', () => {
      crearJuego({ titulo: 'Juego 1' }, 'pablo_dev', almacen);
      crearJuego({ titulo: 'Juego 2' }, 'pablo_dev', almacen);
      expect(obtenerJuegos('pablo_dev', almacen)).toHaveLength(2);

      vaciarJuegos('pablo_dev', almacen);
      expect(obtenerJuegos('pablo_dev', almacen)).toEqual([]);

      // Si usuario es vacío o null
      expect(() => vaciarJuegos('', almacen)).not.toThrow();
      expect(() => vaciarJuegos(null, almacen)).not.toThrow();

      // Si removeItem lanza excepción
      const almacenRoto = {
        removeItem() {
          throw new Error('No se puede escribir');
        },
      };
      expect(() => vaciarJuegos('pablo_dev', almacenRoto)).not.toThrow();
    });

    it('guardarJuegos lanza excepción si falta usuario o almacén', () => {
      expect(() => guardarJuegos([], '', almacen)).toThrow(/nombre de usuario es obligatorio/i);
      expect(() => guardarJuegos([], 'pablo_dev', null)).toThrow(/almacén/i);
    });
  });

  describe('tolerancia a fallos y resiliencia ante datos corruptos', () => {
    it('devuelve array vacío si el almacenamiento contiene JSON corrupto no parseable', () => {
      const clave = obtenerClaveJuegos('user_corrupto');
      almacen.setItem(clave, '{{json-roto--sin-cerrar[[');

      expect(obtenerJuegos('user_corrupto', almacen)).toEqual([]);
      expect(obtenerJuegoPorId('cualquiera', 'user_corrupto', almacen)).toBeNull();
    });

    it('devuelve array vacío si el JSON almacenado no es un array', () => {
      const clave = obtenerClaveJuegos('user_tipo_invalido');
      almacen.setItem(clave, JSON.stringify({ titulo: 'no es un array' }));
      expect(obtenerJuegos('user_tipo_invalido', almacen)).toEqual([]);

      almacen.setItem(clave, JSON.stringify('cadena plana'));
      expect(obtenerJuegos('user_tipo_invalido', almacen)).toEqual([]);

      almacen.setItem(clave, JSON.stringify(123456));
      expect(obtenerJuegos('user_tipo_invalido', almacen)).toEqual([]);
    });

    it('filtra registros defectuosos preservando los juegos válidos', () => {
      const clave = obtenerClaveJuegos('user_mixto');
      const datosMezclados = [
        null,
        'cadena_invalida',
        { id: '', titulo: 'Sin id' },
        { id: 'gv_1', titulo: '  ' }, // Sin título
        {
          id: 'gv_valido_1',
          titulo: 'Hollow Knight',
          plataforma: 'PC',
          formato: 'digital',
          horasJugadas: 'no_es_numero', // Se sanea a 0
          dlcs: 'no_es_array', // Se sanea a []
        },
      ];

      almacen.setItem(clave, JSON.stringify(datosMezclados));
      const juegos = obtenerJuegos('user_mixto', almacen);

      expect(juegos).toHaveLength(1);
      expect(juegos[0].id).toBe('gv_valido_1');
      expect(juegos[0].titulo).toBe('Hollow Knight');
      expect(juegos[0].horasJugadas).toBe(0);
      expect(juegos[0].dlcs).toEqual([]);
    });

    it('devuelve array vacío de forma segura si getItem lanza una excepción', () => {
      const almacenDefectuoso = {
        getItem() {
          throw new Error('Almacenamiento bloqueado');
        },
      };
      expect(obtenerJuegos('user_error', almacenDefectuoso)).toEqual([]);
    });
  });
});
