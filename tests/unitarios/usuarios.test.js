import { describe, it, expect, beforeEach } from 'vitest';
import { AlmacenFalso } from '../AlmacenFalso.js';
import {
  obtenerUsuarios,
  guardarUsuarios,
  obtenerUsuarioPorNombre,
  existeUsuario,
  registrarUsuario,
  autenticarUsuario,
  cambiarRolUsuario,
  eliminarUsuario,
  vaciarUsuarios,
  CLAVE_USUARIOS,
} from '../../js/usuarios.js';

describe('módulo usuarios.js', () => {
  let almacen;

  beforeEach(() => {
    almacen = new AlmacenFalso();
  });

  describe('lectura y comprobación inicial (obtenerUsuarios, existeUsuario)', () => {
    it('obtenerUsuarios devuelve un array vacío si no hay datos', () => {
      expect(obtenerUsuarios(almacen)).toEqual([]);
    });

    it('devuelve array vacío de forma segura si el almacén es null o indefinido', () => {
      expect(obtenerUsuarios(null)).toEqual([]);
      expect(obtenerUsuarios(undefined)).toEqual([]);
    });

    it('existeUsuario devuelve false si el usuario no existe', () => {
      expect(existeUsuario('link_hyrule', almacen)).toBe(false);
      expect(obtenerUsuarioPorNombre('link_hyrule', almacen)).toBeNull();
    });

    it('guardarUsuarios persiste la colección y lanza error si el almacén no es válido', () => {
      guardarUsuarios([{ nombre: 'u_directo', clave: 'hash1', rol: 'usuario' }], almacen);
      expect(almacen.getItem(CLAVE_USUARIOS)).toContain('u_directo');
      expect(() => guardarUsuarios([], null)).toThrow(/almacén no disponible/i);
    });
  });

  describe('registro de usuarios y asignación de roles (Requisito 3 y 4)', () => {
    it('el primer usuario registrado adquiere automáticamente rol de administrador', async () => {
      const admin = await registrarUsuario(
        {
          nombre: 'pablo_admin',
          correo: 'pablo@gamevault.com',
          clave: 'Password123',
        },
        almacen,
      );

      expect(admin.nombre).toBe('pablo_admin');
      expect(admin.usuario).toBe('pablo_admin');
      expect(admin.correo).toBe('pablo@gamevault.com');
      expect(admin.rol).toBe('administrador');
      // La contraseña nunca se almacena en texto plano
      expect(admin.clave).not.toBe('Password123');
      expect(admin.clave).toHaveLength(64); // SHA-256 en hexadecimal

      const usuarios = obtenerUsuarios(almacen);
      expect(usuarios).toHaveLength(1);
      expect(usuarios[0].rol).toBe('administrador');
    });

    it('los siguientes usuarios registrados adquieren rol de usuario común', async () => {
      await registrarUsuario(
        {
          nombre: 'admin_primero',
          correo: 'admin@gamevault.com',
          clave: 'SuperSecret1',
        },
        almacen,
      );

      const segundo = await registrarUsuario(
        {
          nombre: 'samus_aran',
          correo: 'samus@metroid.org',
          clave: 'Hunter2026!',
        },
        almacen,
      );

      const tercero = await registrarUsuario(
        {
          nombre: 'solid_snake',
          correo: 'snake@foxhound.mil',
          clave: 'Codec14085',
        },
        almacen,
      );

      expect(segundo.rol).toBe('usuario');
      expect(tercero.rol).toBe('usuario');

      const todos = obtenerUsuarios(almacen);
      expect(todos).toHaveLength(3);
      expect(todos[0].rol).toBe('administrador');
      expect(todos[1].rol).toBe('usuario');
      expect(todos[2].rol).toBe('usuario');
    });

    it('rechaza el registro si el nombre de usuario ya está ocupado', async () => {
      await registrarUsuario(
        {
          nombre: 'cloud_strife',
          correo: 'cloud@avalanche.org',
          clave: 'BusterSword7',
        },
        almacen,
      );

      await expect(
        registrarUsuario(
          {
            nombre: 'cloud_strife',
            correo: 'otro_cloud@shinra.corp',
            clave: 'Omnislash99',
          },
          almacen,
        ),
      ).rejects.toThrow(/ya existe/i);

      // Comprobación insensible a mayúsculas/minúsculas
      await expect(
        registrarUsuario(
          {
            nombre: 'CLOUD_STRIFE',
            correo: 'clon@shinra.corp',
            clave: 'Omnislash99',
          },
          almacen,
        ),
      ).rejects.toThrow(/ya existe/i);
    });

    it('rechaza registros con datos obligatorios incompletos', async () => {
      await expect(
        registrarUsuario({ correo: 'a@b.com', clave: 'Clave123' }, almacen),
      ).rejects.toThrow(/nombre de usuario es obligatorio/i);

      await expect(
        registrarUsuario({ nombre: '   ', correo: 'a@b.com', clave: 'Clave123' }, almacen),
      ).rejects.toThrow(/nombre de usuario es obligatorio/i);

      await expect(
        registrarUsuario({ nombre: 'user1', correo: '', clave: 'Clave123' }, almacen),
      ).rejects.toThrow(/correo electrónico es obligatorio/i);

      await expect(
        registrarUsuario({ nombre: 'user1', correo: 'a@b.com', clave: '' }, almacen),
      ).rejects.toThrow(/contraseña es obligatoria/i);
    });
  });

  describe('autenticación de usuarios (autenticarUsuario)', () => {
    beforeEach(async () => {
      await registrarUsuario(
        {
          nombre: 'kratos_sparta',
          correo: 'kratos@olympus.gr',
          clave: 'LeviathanAxe2026',
        },
        almacen,
      );
    });

    it('autentica correctamente con usuario y contraseña válidos', async () => {
      const usuario = await autenticarUsuario('kratos_sparta', 'LeviathanAxe2026', almacen);
      expect(usuario).not.toBeNull();
      expect(usuario?.nombre).toBe('kratos_sparta');
      expect(usuario?.rol).toBe('administrador');
    });

    it('permite autenticación insensible a mayúsculas en el nombre de usuario', async () => {
      const usuario = await autenticarUsuario('KRATOS_SPARTA', 'LeviathanAxe2026', almacen);
      expect(usuario).not.toBeNull();
      expect(usuario?.nombre).toBe('kratos_sparta');
    });

    it('devuelve null si la contraseña es incorrecta', async () => {
      const resultado = await autenticarUsuario('kratos_sparta', 'ClaveErronea123', almacen);
      expect(resultado).toBeNull();
    });

    it('devuelve null si el usuario no existe en el sistema', async () => {
      const resultado = await autenticarUsuario('usuario_fantasma', 'Cualquiera', almacen);
      expect(resultado).toBeNull();
    });

    it('devuelve null si los argumentos son inválidos o vacíos', async () => {
      expect(await autenticarUsuario('', 'clave', almacen)).toBeNull();
      expect(await autenticarUsuario('kratos_sparta', '', almacen)).toBeNull();
      expect(await autenticarUsuario(null, 'clave', almacen)).toBeNull();
    });
  });

  describe('gestión de roles y operaciones auxiliares', () => {
    it('cambiarRolUsuario modifica el rol de un usuario existente', async () => {
      await registrarUsuario({ nombre: 'admin1', correo: 'a@a.com', clave: 'P1' }, almacen);
      await registrarUsuario({ nombre: 'user1', correo: 'u@u.com', clave: 'P2' }, almacen);

      const actualizado = cambiarRolUsuario('user1', 'administrador', almacen);
      expect(actualizado?.rol).toBe('administrador');

      const userLeido = obtenerUsuarioPorNombre('user1', almacen);
      expect(userLeido?.rol).toBe('administrador');
    });

    it('cambiarRolUsuario rechaza roles inválidos', async () => {
      await registrarUsuario({ nombre: 'user1', correo: 'u@u.com', clave: 'P1' }, almacen);
      expect(() => cambiarRolUsuario('user1', 'moderador', almacen)).toThrow(/rol debe ser/i);
    });

    it('eliminarUsuario borra un usuario y vaciarUsuarios limpia la colección', async () => {
      await registrarUsuario({ nombre: 'user1', correo: 'u1@u.com', clave: 'P1' }, almacen);
      await registrarUsuario({ nombre: 'user2', correo: 'u2@u.com', clave: 'P2' }, almacen);

      expect(eliminarUsuario('user1', almacen)).toBe(true);
      expect(existeUsuario('user1', almacen)).toBe(false);
      expect(obtenerUsuarios(almacen)).toHaveLength(1);

      vaciarUsuarios(almacen);
      expect(obtenerUsuarios(almacen)).toEqual([]);
    });
  });

  describe('tolerancia a fallos y resiliencia ante datos corruptos', () => {
    it('devuelve array vacío si el almacenamiento contiene JSON corrupto', () => {
      almacen.setItem(CLAVE_USUARIOS, '{json-invalido--corrupto---');
      expect(obtenerUsuarios(almacen)).toEqual([]);
      expect(existeUsuario('cualquiera', almacen)).toBe(false);
    });

    it('devuelve array vacío si el contenido almacenado no es un array', () => {
      almacen.setItem(CLAVE_USUARIOS, JSON.stringify({ nombre: 'no-es-array' }));
      expect(obtenerUsuarios(almacen)).toEqual([]);

      almacen.setItem(CLAVE_USUARIOS, JSON.stringify('texto plano'));
      expect(obtenerUsuarios(almacen)).toEqual([]);

      almacen.setItem(CLAVE_USUARIOS, JSON.stringify(42));
      expect(obtenerUsuarios(almacen)).toEqual([]);
    });

    it('filtra registros defectuosos en el array sin romper los válidos', () => {
      const datosMezclados = [
        null,
        'cadena_invalida',
        { nombre: '' },
        { nombre: 'usuario_valido', clave: 'hash1234', rol: 'usuario', correo: 'v@v.com' },
        { nombre: 'sin_clave', rol: 'usuario' },
        { nombre: 'rol_invalido', clave: 'hash1234', rol: 'superhacker' },
      ];

      almacen.setItem(CLAVE_USUARIOS, JSON.stringify(datosMezclados));
      const usuarios = obtenerUsuarios(almacen);
      expect(usuarios).toHaveLength(1);
      expect(usuarios[0].nombre).toBe('usuario_valido');
    });

    it('devuelve array vacío si getItem arroja una excepción', () => {
      const almacenDefectuoso = {
        getItem() {
          throw new Error('Almacenamiento restringido');
        },
      };
      expect(obtenerUsuarios(almacenDefectuoso)).toEqual([]);
    });
  });
});
