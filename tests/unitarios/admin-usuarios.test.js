import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AlmacenFalso } from '../AlmacenFalso.js';
import { registrarUsuario, obtenerUsuarios } from '../../js/usuarios.js';
import { iniciarSesion } from '../../js/sesion.js';
import {
  MENSAJE_AUTO_REVOCACION,
  filtrarUsuarios,
  renderizarFilaUsuario,
  renderizarTablaUsuarios,
  iniciarAdminUsuarios,
} from '../../js/admin-usuarios.js';

describe('módulo admin-usuarios.js (zona de administración de usuarios)', () => {
  let cuerpoTabla;
  let templateUsuario;
  let elementoVacio;
  let contenedorPaginacion;
  let inputBuscador;

  beforeEach(() => {
    document.body.innerHTML = `
      <input type="search" id="buscador-usuarios" name="qUsuario" />
      <table>
        <tbody id="tabla-usuarios-body"></tbody>
      </table>
      <div id="estado-vacio-usuarios" hidden>Sin resultados</div>
      <ul id="paginacion-usuarios" class="pagination"></ul>
      <div id="region-avisos"></div>

      <template id="tpl-usuario">
        <table>
          <tbody>
            <tr class="js-fila-usuario">
              <td class="js-usuario-nombre">nombre</td>
              <td class="js-usuario-email">correo</td>
              <td><span class="gv-badge gv-badge-meta js-usuario-rol-badge">Usuario</span></td>
              <td>
                <button
                  type="button"
                  class="btn-gv-ghost js-btn-alternar-rol"
                  role="switch"
                  aria-checked="false"
                >
                  Cambiar a Administrador
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </template>
    `;

    cuerpoTabla = document.querySelector('#tabla-usuarios-body');
    templateUsuario = document.querySelector('#tpl-usuario');
    elementoVacio = document.querySelector('#estado-vacio-usuarios');
    contenedorPaginacion = document.querySelector('#paginacion-usuarios');
    inputBuscador = document.querySelector('#buscador-usuarios');
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  describe('filtrarUsuarios', () => {
    const lista = [
      { nombre: 'admin_jefe', correo: 'admin@gamevault.com', rol: 'administrador' },
      { nombre: 'josé_garcía', correo: 'jose.garcia@ejemplo.es', rol: 'usuario' },
      { nombre: 'lucia_dev', correo: 'lucia@vault.org', rol: 'usuario' },
    ];

    it('filtra por nombre o correo sin distinguir tildes ni mayúsculas', () => {
      expect(filtrarUsuarios(lista, 'JOSE')).toHaveLength(1);
      expect(filtrarUsuarios(lista, 'vault.org')).toHaveLength(1);
      expect(filtrarUsuarios(lista, 'admin')).toHaveLength(1);
      expect(filtrarUsuarios(lista, '')).toHaveLength(3);
    });
  });

  describe('renderizarFilaUsuario y protección contra auto-revocación', () => {
    it('devuelve null ante parámetros inválidos', () => {
      expect(renderizarFilaUsuario(null, templateUsuario)).toBeNull();
      expect(renderizarFilaUsuario({}, null)).toBeNull();
    });

    it('renderiza una fila de usuario estándar con botón habilitado y textContent seguro', () => {
      const fila = renderizarFilaUsuario(
        { nombre: 'player1', correo: 'player1@test.com', rol: 'usuario' },
        templateUsuario,
        'admin_root',
      );

      expect(fila.querySelector('.js-usuario-nombre').textContent).toBe('player1');
      expect(fila.querySelector('.js-usuario-email').textContent).toBe('player1@test.com');

      const badge = fila.querySelector('.js-usuario-rol-badge');
      expect(badge.textContent).toBe('Usuario');
      expect(badge.className).toContain('gv-badge-meta');

      const btn = fila.querySelector('.js-btn-alternar-rol');
      expect(btn.disabled).toBe(false);
      expect(btn.getAttribute('aria-checked')).toBe('false');
      expect(btn.textContent).toBe('Cambiar a Administrador');
      expect(btn.dataset.usuario).toBe('player1');
    });

    it('deshabilita el botón del administrador con sesión activa y explica el motivo', () => {
      const fila = renderizarFilaUsuario(
        { nombre: 'Admin_Root', correo: 'admin@test.com', rol: 'administrador' },
        templateUsuario,
        'admin_root',
      );

      const badge = fila.querySelector('.js-usuario-rol-badge');
      expect(badge.textContent).toBe('Administrador');
      expect(badge.className).toContain('gv-badge-admin');

      const btn = fila.querySelector('.js-btn-alternar-rol');
      expect(btn.disabled).toBe(true);
      expect(btn.getAttribute('aria-disabled')).toBe('true');
      expect(btn.getAttribute('title')).toBe(MENSAJE_AUTO_REVOCACION);
      expect(btn.textContent).toContain('No puedes retirar tu propio rol');
    });

    it('previene XSS renderizando datos maliciosos únicamente como texto plano', () => {
      const fila = renderizarFilaUsuario(
        {
          nombre: '<img src=x onerror=alert(1)>',
          correo: '<script>xss()</script>@test.com',
          rol: 'usuario',
        },
        templateUsuario,
        'admin',
      );

      const elNombre = fila.querySelector('.js-usuario-nombre');
      const elEmail = fila.querySelector('.js-usuario-email');
      expect(elNombre.textContent).toBe('<img src=x onerror=alert(1)>');
      expect(elNombre.children).toHaveLength(0);
      expect(elEmail.textContent).toBe('<script>xss()</script>@test.com');
      expect(elEmail.children).toHaveLength(0);
    });
  });

  describe('renderizarTablaUsuarios', () => {
    it('inserta todas las filas mediante DocumentFragment y tolera listas vacías', () => {
      expect(() => renderizarTablaUsuarios(null, [], templateUsuario)).not.toThrow();

      renderizarTablaUsuarios(
        cuerpoTabla,
        [
          { nombre: 'u1', correo: 'u1@a.com', rol: 'administrador' },
          { nombre: 'u2', correo: 'u2@a.com', rol: 'usuario' },
        ],
        templateUsuario,
        'u1',
      );

      const filas = cuerpoTabla.querySelectorAll('.js-fila-usuario');
      expect(filas).toHaveLength(2);
      expect(filas[0].querySelector('.js-btn-alternar-rol').disabled).toBe(true);
      expect(filas[1].querySelector('.js-btn-alternar-rol').disabled).toBe(false);
    });
  });

  describe('iniciarAdminUsuarios (flujo interactivo completo)', () => {
    let almacenLocal;
    let almacenSesion;

    beforeEach(() => {
      almacenLocal = new AlmacenFalso();
      almacenSesion = new AlmacenFalso();
    });

    it('muestra estado vacío y oculta paginación cuando no hay usuarios', () => {
      const desconectar = iniciarAdminUsuarios(document, {
        almacenLocal,
        almacenSesion,
        usuarioActual: 'admin',
      });

      expect(elementoVacio.hidden).toBe(false);
      expect(contenedorPaginacion.hidden).toBe(true);
      expect(cuerpoTabla.querySelectorAll('.js-fila-usuario')).toHaveLength(0);

      desconectar();
    });

    it('permite alternar el rol de otros usuarios por delegación de eventos y protege la sesión actual', async () => {
      await registrarUsuario(
        { nombre: 'admin_jefe', correo: 'admin@gv.es', clave: 'Password1' },
        almacenLocal,
      );
      await registrarUsuario(
        { nombre: 'colaborador', correo: 'colab@gv.es', clave: 'Password1' },
        almacenLocal,
      );
      iniciarSesion('admin_jefe', 'administrador', almacenSesion);

      const avisosRecibidos = [];
      const manejarAviso = (e) => avisosRecibidos.push(e.detail);
      document.addEventListener('aviso', manejarAviso);

      const alCambiarRol = vi.fn();
      const desconectar = iniciarAdminUsuarios(document, {
        almacenLocal,
        almacenSesion,
        alCambiarRol,
      });

      const filas = cuerpoTabla.querySelectorAll('.js-fila-usuario');
      expect(filas).toHaveLength(2);

      // Fila 0: el propio admin tiene botón deshabilitado
      const btnAdmin = filas[0].querySelector('.js-btn-alternar-rol');
      expect(btnAdmin.disabled).toBe(true);
      expect(btnAdmin.title).toBe(MENSAJE_AUTO_REVOCACION);

      // Intentar forzar click sobre el botón propio aunque se removiera disabled en DOM
      btnAdmin.disabled = false;
      btnAdmin.click();
      expect(avisosRecibidos.at(-1)?.tipo).toBe('warning');
      expect(obtenerUsuarios(almacenLocal)[0].rol).toBe('administrador');

      // Fila 1: alternar rol de usuario -> administrador y volver a usuario
      const btnColab = filas[1].querySelector('.js-btn-alternar-rol');
      expect(btnColab.disabled).toBe(false);
      btnColab.click();

      expect(alCambiarRol).toHaveBeenCalledWith(
        expect.objectContaining({ nombre: 'colaborador', rol: 'administrador' }),
      );
      expect(obtenerUsuarios(almacenLocal)[1].rol).toBe('administrador');
      expect(avisosRecibidos.at(-1)).toEqual({
        mensaje: 'Rol de «colaborador» cambiado a administrador.',
        tipo: 'success',
      });

      // La tabla se ha re-renderizado con la nueva insignia y botón "Cambiar a Usuario"
      const btnColabActualizado = cuerpoTabla
        .querySelectorAll('.js-fila-usuario')[1]
        .querySelector('.js-btn-alternar-rol');
      expect(btnColabActualizado.textContent).toBe('Cambiar a Usuario');
      expect(btnColabActualizado.getAttribute('aria-checked')).toBe('true');

      // Volver a cambiar de administrador -> usuario
      btnColabActualizado.click();
      expect(obtenerUsuarios(almacenLocal)[1].rol).toBe('usuario');

      document.removeEventListener('aviso', manejarAviso);
      desconectar();
    });

    it('filtra usuarios con debounce de 300ms y resetea la paginación a la página 1', async () => {
      vi.useFakeTimers();
      try {
        await registrarUsuario(
          { nombre: 'admin_principal', correo: 'admin@gv.es', clave: 'Password1' },
          almacenLocal,
        );
        for (let i = 1; i <= 5; i += 1) {
          await registrarUsuario(
            {
              nombre: i === 2 ? 'andrés_lópez' : `jugador_${i}`,
              correo: `u${i}@gv.es`,
              clave: 'Password1',
            },
            almacenLocal,
          );
        }
        iniciarSesion('admin_principal', 'administrador', almacenSesion);

        const replaceState = vi.fn((_s, _t, nuevaUrl) => {
          const parsed = new URL(nuevaUrl, 'http://localhost');
          ventanaFalsa.location.search = parsed.search;
          ventanaFalsa.location.href = parsed.href;
        });
        const ventanaFalsa = {
          location: {
            search: '?pagina=2',
            href: 'http://localhost/usuarios.html?pagina=2',
          },
          history: { replaceState },
        };

        const desconectar = iniciarAdminUsuarios(document, {
          almacenLocal,
          almacenSesion,
          porPagina: 3,
          ventana: ventanaFalsa,
        });

        // En página 2 muestra los 3 últimos usuarios
        expect(cuerpoTabla.querySelectorAll('.js-fila-usuario')).toHaveLength(3);

        // Buscar sin tildes a "andres" desde la página 2
        inputBuscador.value = 'andres';
        inputBuscador.dispatchEvent(new Event('input', { bubbles: true }));
        vi.advanceTimersByTime(299);
        expect(cuerpoTabla.querySelectorAll('.js-fila-usuario')).toHaveLength(3);

        vi.advanceTimersByTime(1);
        expect(ventanaFalsa.location.search).toBe('');
        const filasFiltradas = cuerpoTabla.querySelectorAll('.js-fila-usuario');
        expect(filasFiltradas).toHaveLength(1);
        expect(filasFiltradas[0].querySelector('.js-usuario-nombre').textContent).toBe(
          'andrés_lópez',
        );

        // Búsqueda sin coincidencias muestra estado vacío y oculta paginación
        inputBuscador.value = 'nadie_existe';
        inputBuscador.dispatchEvent(new Event('input', { bubbles: true }));
        vi.advanceTimersByTime(300);

        expect(elementoVacio.hidden).toBe(false);
        expect(contenedorPaginacion.hidden).toBe(true);

        desconectar();
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
