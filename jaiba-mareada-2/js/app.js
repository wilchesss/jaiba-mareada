import { iniciarSesion, cerrarSesion, obtenerSesion, onAuthChange } from './supabase-client.js';
import {
  estadoCalendario, mesSiguiente, mesAnterior, cargarDatosMes, renderCalendario,
} from './calendario.js';
import { abrirModalDia, setOnCambio, renderFormularioReservacion } from './modal.js';

const fmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 });
const fmtFechaCorta = (f) => new Date(f + 'T00:00:00').toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });

const pantallaLogin = document.getElementById('pantalla-login');
const appEl = document.getElementById('app');

// ---------------------------------------------------------------------
// Registrar service worker
// ---------------------------------------------------------------------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  });
}

// ---------------------------------------------------------------------
// Autenticación
// ---------------------------------------------------------------------
async function iniciar() {
  const sesion = await obtenerSesion();
  mostrarSegunSesion(sesion);

  onAuthChange((sesion) => mostrarSegunSesion(sesion));
}

function mostrarSegunSesion(sesion) {
  if (sesion) {
    pantallaLogin.classList.add('oculto');
    appEl.classList.remove('oculto');
    cargarYRenderizar();
  } else {
    pantallaLogin.classList.remove('oculto');
    appEl.classList.add('oculto');
  }
}

document.getElementById('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const btn = document.getElementById('btn-login');
  const errorEl = document.getElementById('login-error');
  errorEl.classList.add('oculto');
  btn.disabled = true;
  btn.textContent = 'Entrando…';
  try {
    await iniciarSesion(email, password);
  } catch (err) {
    errorEl.textContent = 'Correo o contraseña incorrectos.';
    errorEl.classList.remove('oculto');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Entrar';
  }
});

document.getElementById('btn-logout').addEventListener('click', async () => {
  await cerrarSesion();
});

// ---------------------------------------------------------------------
// Navegación entre vistas (calendario / lista)
// ---------------------------------------------------------------------
document.querySelectorAll('.nav-inferior button').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-inferior button').forEach((b) => b.classList.remove('activo'));
    btn.classList.add('activo');
    const vista = btn.dataset.vista;
    document.getElementById('vista-calendario').classList.toggle('oculto', vista !== 'calendario');
    document.getElementById('vista-lista').classList.toggle('oculto', vista !== 'lista');
  });
});

// ---------------------------------------------------------------------
// Calendario: navegación de meses y click en día
// ---------------------------------------------------------------------
document.getElementById('mes-anterior').addEventListener('click', async () => {
  mesAnterior();
  await cargarYRenderizar();
});

document.getElementById('mes-siguiente').addEventListener('click', async () => {
  mesSiguiente();
  await cargarYRenderizar();
});

document.getElementById('btn-nueva-reservacion').addEventListener('click', () => {
  const hoy = new Date();
  const fechaStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  renderFormularioReservacion(fechaStr);
});

async function cargarYRenderizar() {
  mostrarCargando(true);
  try {
    await cargarDatosMes();
    const { mapaReservaciones, mapaCerrados } = renderCalendario();
    conectarClicksDias(mapaReservaciones, mapaCerrados);
    renderListaReservaciones();
  } catch (err) {
    mostrarToast(err.message || 'Error al cargar datos', true);
  } finally {
    mostrarCargando(false);
  }
}

function conectarClicksDias(mapaReservaciones, mapaCerrados) {
  document.querySelectorAll('.dia-celda:not(.vacio)').forEach((celda) => {
    celda.addEventListener('click', () => {
      const fecha = celda.dataset.fecha;
      abrirModalDia(fecha, mapaReservaciones.get(fecha), mapaCerrados.get(fecha));
    });
  });
}

function renderListaReservaciones() {
  const cont = document.getElementById('lista-reservaciones');
  const { reservaciones } = estadoCalendario;
  if (reservaciones.length === 0) {
    cont.innerHTML = '<p class="centro-vacio">No hay reservaciones este mes.</p>';
    return;
  }
  cont.innerHTML = reservaciones.map((r) => `
    <div class="tarjeta-reservacion" data-id="${r.id}">
      <div class="fila-top">
        <span class="fecha">${fmtFechaCorta(r.fecha)}</span>
        <span class="badge ${r.estado_pago}">${etiquetaEstado(r.estado_pago)}</span>
      </div>
      <div class="cliente">${r.cliente_nombre}</div>
      <div class="detalle">${r.hora_inicio.slice(0,5)} – ${r.hora_fin.slice(0,5)} · ${r.cliente_telefono}</div>
      <div class="saldo">Saldo: ${fmt.format(r.saldo_pendiente)}</div>
    </div>
  `).join('');

  cont.querySelectorAll('.tarjeta-reservacion').forEach((card) => {
    card.addEventListener('click', () => {
      const r = estadoCalendario.reservaciones.find((x) => x.id === card.dataset.id);
      abrirModalDia(r.fecha, r, null);
    });
  });
}

function etiquetaEstado(estado) {
  return { pagado: 'Pagado', anticipo_cubierto: 'Anticipo cubierto', pendiente: 'Pendiente' }[estado] || estado;
}

function mostrarCargando(mostrar) {
  const grid = document.getElementById('grid-calendario');
  if (mostrar && grid) grid.style.opacity = '0.4';
  else if (grid) grid.style.opacity = '1';
}

let toastTimeout;
function mostrarToast(mensaje, esError = false) {
  const toast = document.getElementById('toast');
  toast.textContent = mensaje;
  toast.classList.toggle('error', esError);
  toast.classList.remove('oculto');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.add('oculto'), 3500);
}

setOnCambio(() => {
  cargarYRenderizar();
  mostrarToast('Guardado correctamente');
});

iniciar();
