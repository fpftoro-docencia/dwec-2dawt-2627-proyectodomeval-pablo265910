/**
 * Gestión de usuarios, roles y autenticación en localStorage.
 *
 * Administra el registro de usuarios, control de nombres duplicados,
 * asignación automática de rol (el primer usuario es administrador)
 * y autenticación mediante resúmenes criptográficos SHA-256.
 *
 * @module usuarios
 */

import { resumirClave } from './clave.js';

export const CLAVE_USUARIOS = 'gamevault_usuarios';

/**
 * @typedef {Object} Usuario
 * @property {string} nombre Nombre de usuario único.
 * @property {string} usuario Alias de nombre para compatibilidad con sesión.
 * @property {string} correo Correo electrónico del usuario.
 * @property {string} clave Resumen SHA-256 de la contraseña.
 * @property {string} claveHash Alias del resumen SHA-256.
 * @property {'usuario' | 'administrador'} rol Rol asignado en la aplicación.
 * @property {string} [creadoEn] Fecha y hora de registro en formato ISO.
 */

/**
 * Helper para obtener el almacén de usuarios por defecto de forma segura en navegador o tests.
 * @returns {Storage | null}
 */
function obtenerAlmacenDefecto() {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return null;
}

/**
 * Obtiene la lista completa de usuarios registrados.
 * Devuelve un array vacío si no hay usuarios o si los datos almacenados están corruptos.
 *
 * @param {Storage} [almacen=obtenerAlmacenDefecto()] Almacén donde residen los datos.
 * @returns {Usuario[]} Lista de usuarios válidos encontrados.
 */
export function obtenerUsuarios(almacen = obtenerAlmacenDefecto()) {
  try {
    if (!almacen || typeof almacen.getItem !== 'function') return [];
    const raw = almacen.getItem(CLAVE_USUARIOS);
    if (!raw) return [];

    const datos = JSON.parse(raw);
    if (!Array.isArray(datos)) return [];

    return datos
      .filter((item) => {
        if (typeof item !== 'object' || item === null) return false;
        const nombre = (item.nombre || item.usuario || '').trim();
        const clave = item.clave || item.claveHash || '';
        const rol = item.rol;
        return (
          nombre.length > 0 &&
          typeof clave === 'string' &&
          clave.length > 0 &&
          (rol === 'usuario' || rol === 'administrador')
        );
      })
      .map((item) => {
        const nombreNormalizado = (item.nombre || item.usuario || '').trim();
        const claveNormalizada = item.clave || item.claveHash;
        return {
          nombre: nombreNormalizado,
          usuario: nombreNormalizado,
          correo: (item.correo || item.email || '').trim(),
          clave: claveNormalizada,
          claveHash: claveNormalizada,
          rol: item.rol,
          creadoEn: item.creadoEn || new Date().toISOString(),
        };
      });
  } catch {
    return [];
  }
}

/**
 * Guarda la colección completa de usuarios en el almacenamiento.
 *
 * @param {Usuario[]} usuarios Array de usuarios a persistir.
 * @param {Storage} [almacen=obtenerAlmacenDefecto()] Almacén donde persistir.
 */
export function guardarUsuarios(usuarios, almacen = obtenerAlmacenDefecto()) {
  if (!almacen || typeof almacen.setItem !== 'function') {
    throw new Error('Almacén no disponible para guardar usuarios');
  }
  const listaSegura = Array.isArray(usuarios) ? usuarios : [];
  almacen.setItem(CLAVE_USUARIOS, JSON.stringify(listaSegura));
}

/**
 * Busca un usuario registrado por su nombre de usuario (búsqueda insensible a mayúsculas/minúsculas).
 *
 * @param {string} nombre Nombre de usuario a buscar.
 * @param {Storage} [almacen=obtenerAlmacenDefecto()] Almacén a consultar.
 * @returns {Usuario | null} Usuario encontrado o null si no existe o datos corruptos.
 */
export function obtenerUsuarioPorNombre(nombre, almacen = obtenerAlmacenDefecto()) {
  if (!nombre || typeof nombre !== 'string') return null;
  const nombreLimpio = nombre.trim().toLowerCase();
  if (nombreLimpio === '') return null;

  const usuarios = obtenerUsuarios(almacen);
  const encontrado = usuarios.find(
    (u) => u.nombre.toLowerCase() === nombreLimpio || u.usuario.toLowerCase() === nombreLimpio,
  );
  return encontrado || null;
}

/**
 * Comprueba si ya existe un usuario registrado con el nombre proporcionado.
 *
 * @param {string} nombre Nombre de usuario a verificar.
 * @param {Storage} [almacen=obtenerAlmacenDefecto()] Almacén a consultar.
 * @returns {boolean} True si el nombre ya está ocupado.
 */
export function existeUsuario(nombre, almacen = obtenerAlmacenDefecto()) {
  return obtenerUsuarioPorNombre(nombre, almacen) !== null;
}

/**
 * Registra un nuevo usuario en el sistema.
 * El primer usuario en registrarse adquiere automáticamente el rol de 'administrador';
 * los usuarios posteriores se registran como 'usuario'.
 *
 * @param {Object} datos Datos del usuario a registrar.
 * @param {string} datos.nombre Nombre de usuario.
 * @param {string} [datos.usuario] Alias de nombre.
 * @param {string} datos.correo Correo electrónico.
 * @param {string} [datos.email] Alias de correo.
 * @param {string} datos.clave Contraseña en texto plano a resumir con SHA-256.
 * @param {string} [datos.contrasena] Alias de clave.
 * @param {Storage} [almacen=obtenerAlmacenDefecto()] Almacén donde guardar.
 * @returns {Promise<Usuario>} El usuario creado y guardado.
 * @throws {Error} Si faltan datos obligatorios o el nombre ya está ocupado.
 */
export async function registrarUsuario(datos = {}, almacen = obtenerAlmacenDefecto()) {
  const nombre = (datos.nombre || datos.usuario || '').trim();
  const correo = (datos.correo || datos.email || '').trim();
  const clave = datos.clave || datos.contrasena || datos.password || '';

  if (!nombre) {
    throw new Error('El nombre de usuario es obligatorio');
  }
  if (!correo) {
    throw new Error('El correo electrónico es obligatorio');
  }
  if (!clave || typeof clave !== 'string') {
    throw new Error('La contraseña es obligatoria');
  }

  if (existeUsuario(nombre, almacen)) {
    throw new Error(`El usuario '${nombre}' ya existe`);
  }

  const usuariosActuales = obtenerUsuarios(almacen);
  // Regla Requisito 4: El primer usuario que se registra es administrador; los demás son usuarios.
  const rol = usuariosActuales.length === 0 ? 'administrador' : 'usuario';

  const claveHash = await resumirClave(clave);
  const nuevoUsuario = {
    nombre,
    usuario: nombre,
    correo,
    clave: claveHash,
    claveHash,
    rol,
    creadoEn: new Date().toISOString(),
  };

  usuariosActuales.push(nuevoUsuario);
  guardarUsuarios(usuariosActuales, almacen);

  return nuevoUsuario;
}

/**
 * Autentica las credenciales de un usuario comparando el resumen SHA-256 de la clave proporcionada.
 *
 * @param {string} nombre Nombre de usuario.
 * @param {string} clavePlana Contraseña introducida en texto plano.
 * @param {Storage} [almacen=obtenerAlmacenDefecto()] Almacén a consultar.
 * @returns {Promise<Usuario | null>} El objeto del usuario si la contraseña es correcta, o null si falla.
 */
export async function autenticarUsuario(nombre, clavePlana, almacen = obtenerAlmacenDefecto()) {
  if (!nombre || !clavePlana || typeof nombre !== 'string' || typeof clavePlana !== 'string') {
    return null;
  }

  const usuario = obtenerUsuarioPorNombre(nombre, almacen);
  if (!usuario) return null;

  const resumenCalculado = await resumirClave(clavePlana);
  if (usuario.clave === resumenCalculado || usuario.claveHash === resumenCalculado) {
    return usuario;
  }

  return null;
}

/**
 * Modifica el rol de un usuario existente ('usuario' o 'administrador').
 *
 * @param {string} nombre Nombre del usuario a modificar.
 * @param {'usuario' | 'administrador'} nuevoRol Nuevo rol a asignar.
 * @param {Storage} [almacen=obtenerAlmacenDefecto()] Almacén donde persistir.
 * @returns {Usuario | null} Usuario actualizado o null si no se encuentra.
 * @throws {Error} Si el rol no es válido.
 */
export function cambiarRolUsuario(nombre, nuevoRol, almacen = obtenerAlmacenDefecto()) {
  if (nuevoRol !== 'usuario' && nuevoRol !== 'administrador') {
    throw new Error("El rol debe ser 'usuario' o 'administrador'");
  }

  const usuarios = obtenerUsuarios(almacen);
  const indice = usuarios.findIndex(
    (u) => u.nombre.toLowerCase() === (nombre || '').trim().toLowerCase(),
  );

  if (indice === -1) return null;

  usuarios[indice].rol = nuevoRol;
  guardarUsuarios(usuarios, almacen);
  return usuarios[indice];
}

/**
 * Elimina un usuario por su nombre.
 *
 * @param {string} nombre Nombre del usuario a eliminar.
 * @param {Storage} [almacen=obtenerAlmacenDefecto()] Almacén donde persistir.
 * @returns {boolean} True si se eliminó, false si no se encontró.
 */
export function eliminarUsuario(nombre, almacen = obtenerAlmacenDefecto()) {
  const usuarios = obtenerUsuarios(almacen);
  const nombreLimpio = (nombre || '').trim().toLowerCase();
  const inicial = usuarios.length;
  const filtrados = usuarios.filter((u) => u.nombre.toLowerCase() !== nombreLimpio);

  if (filtrados.length === inicial) return false;

  guardarUsuarios(filtrados, almacen);
  return true;
}

/**
 * Elimina todos los usuarios del almacenamiento.
 *
 * @param {Storage} [almacen=obtenerAlmacenDefecto()] Almacén a vaciar.
 */
export function vaciarUsuarios(almacen = obtenerAlmacenDefecto()) {
  try {
    almacen?.removeItem(CLAVE_USUARIOS);
  } catch {
    // Silencioso ante fallos de almacenamiento
  }
}
