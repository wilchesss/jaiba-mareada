import { obtenerReservacionesMes, obtenerDiasCerradosMes } from './supabase-client.js';

const NOMBRES_MES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export const estadoCalendario = {
  anio: new Date().getFullYear(),
  mes: new Date().getMonth() + 1, // 1-12
  reservaciones: [],
  diasCerrados: [],
};

export function mesSiguiente() {
  estadoCalendario.mes++;
  if (estadoCalendario.mes > 12) { estadoCalendario.mes = 1; estadoCalendario.anio++; }
}

export function mesAnterior() {
  estadoCalendario.mes--;
  if (estadoCalendario.mes < 1) { estadoCalendario.mes = 12; estadoCalendario.anio--; }
}

export async function cargarDatosMes() {
  const [reservaciones, diasCerrados] = await Promise.all([
    obtenerReservacionesMes(estadoCalendario.anio, estadoCalendario.mes),
    obtenerDiasCerradosMes(estadoCalendario.anio, estadoCalendario.mes),
  ]);
  estadoCalendario.reservaciones = reservaciones;
  estadoCalendario.diasCerrados = diasCerrados;
}

function pad(n) { return String(n).padStart(2, '0'); }

export function renderCalendario() {
  const { anio, mes, reservaciones, diasCerrados } = estadoCalendario;
  document.getElementById('mes-actual').textContent = `${NOMBRES_MES[mes - 1]} ${anio}`;

  const mapaReservaciones = new Map(reservaciones.map((r) => [r.fecha, r]));
  const mapaCerrados = new Map(diasCerrados.map((d) => [d.fecha, d]));

  const primerDiaSemana = new Date(anio, mes - 1, 1).getDay(); // 0=domingo
  const diasEnMes = new Date(anio, mes, 0).getDate();
  const hoyStr = `${new Date().getFullYear()}-${pad(new Date().getMonth() + 1)}-${pad(new Date().getDate())}`;

  const grid = document.getElementById('grid-calendario');
  grid.innerHTML = '';

  for (let i = 0; i < primerDiaSemana; i++) {
    const vacio = document.createElement('div');
    vacio.className = 'dia-celda vacio';
    grid.appendChild(vacio);
  }

  for (let dia = 1; dia <= diasEnMes; dia++) {
    const fechaStr = `${anio}-${pad(mes)}-${pad(dia)}`;
    const celda = document.createElement('div');
    celda.textContent = dia;
    celda.dataset.fecha = fechaStr;

    let estado = 'libre';
    if (mapaReservaciones.has(fechaStr)) estado = 'apartado';
    else if (mapaCerrados.has(fechaStr)) estado = 'cerrado';

    celda.className = `dia-celda ${estado}${fechaStr === hoyStr ? ' hoy' : ''}`;
    grid.appendChild(celda);
  }

  return { mapaReservaciones, mapaCerrados };
}
