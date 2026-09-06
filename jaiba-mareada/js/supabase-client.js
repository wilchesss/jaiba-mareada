import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ⚠️ Reemplaza estos dos valores con los de tu proyecto de Supabase
// (Project Settings → API → Project URL / anon public key)
const SUPABASE_URL = 'https://exvnatugthbarhdsstuj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4dm5hdHVndGhiYXJoZHNzdHVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2NTE5NTMsImV4cCI6MjEwNDIyNzk1M30.gxNX5wQsDHa7a4iu_8SCxHO7Ih56QMf9Ko4abac-M1M';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------
export async function iniciarSesion(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function cerrarSesion() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function obtenerSesion() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function onAuthChange(callback) {
  supabase.auth.onAuthStateChange((_event, session) => callback(session));
}

// ---------------------------------------------------------------------
// Reservaciones
// ---------------------------------------------------------------------
export async function obtenerReservacionesRango(fechaInicio, fechaFin) {
  const { data, error } = await supabase
    .from('vista_reservaciones_saldo')
    .select('*')
    .gte('fecha', fechaInicio)
    .lte('fecha', fechaFin)
    .order('fecha', { ascending: true });

  if (error) throw error;
  return data;
}

export async function obtenerReservacionesMes(anio, mes) {
  const inicio = `${anio}-${String(mes).padStart(2, '0')}-01`;
  const finMes = new Date(anio, mes, 0).getDate();
  const fin = `${anio}-${String(mes).padStart(2, '0')}-${String(finMes).padStart(2, '0')}`;

  const { data, error } = await supabase
    .from('vista_reservaciones_saldo')
    .select('*')
    .gte('fecha', inicio)
    .lte('fecha', fin)
    .order('fecha', { ascending: true });

  if (error) throw error;
  return data;
}

export async function obtenerReservacion(id) {
  const { data, error } = await supabase
    .from('vista_reservaciones_saldo')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function crearReservacion(reservacion) {
  const { data, error } = await supabase
    .from('reservaciones')
    .insert(reservacion)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function actualizarReservacion(id, cambios) {
  const { data, error } = await supabase
    .from('reservaciones')
    .update(cambios)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function eliminarReservacion(id) {
  const { error } = await supabase.from('reservaciones').delete().eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------
// Pagos
// ---------------------------------------------------------------------
export async function obtenerPagos(reservacionId) {
  const { data, error } = await supabase
    .from('pagos')
    .select('*')
    .eq('reservacion_id', reservacionId)
    .order('fecha_pago', { ascending: true });
  if (error) throw error;
  return data;
}

export async function registrarPago(reservacionId, monto, notaOpcional) {
  const { data, error } = await supabase
    .from('pagos')
    .insert({ reservacion_id: reservacionId, monto, nota: notaOpcional || null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function eliminarPago(id) {
  const { error } = await supabase.from('pagos').delete().eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------
// Días cerrados
// ---------------------------------------------------------------------
export async function obtenerDiasCerradosMes(anio, mes) {
  const inicio = `${anio}-${String(mes).padStart(2, '0')}-01`;
  const finMes = new Date(anio, mes, 0).getDate();
  const fin = `${anio}-${String(mes).padStart(2, '0')}-${String(finMes).padStart(2, '0')}`;

  const { data, error } = await supabase
    .from('dias_cerrados')
    .select('*')
    .gte('fecha', inicio)
    .lte('fecha', fin);
  if (error) throw error;
  return data;
}

export async function marcarDiaCerrado(fecha, motivo) {
  const { data, error } = await supabase
    .from('dias_cerrados')
    .insert({ fecha, motivo: motivo || null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function reabrirDia(id) {
  const { error } = await supabase.from('dias_cerrados').delete().eq('id', id);
  if (error) throw error;
}
