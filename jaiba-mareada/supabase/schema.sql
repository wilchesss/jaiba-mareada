-- =====================================================================
-- La Jaiba Mareada — Esquema de base de datos para Supabase
-- =====================================================================
-- Ejecuta este script completo en: Supabase Dashboard → SQL Editor → New query
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tabla: dias_cerrados
-- ---------------------------------------------------------------------
create table if not exists public.dias_cerrados (
  id uuid primary key default gen_random_uuid(),
  fecha date not null unique,
  motivo text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. Tabla: reservaciones
-- ---------------------------------------------------------------------
create table if not exists public.reservaciones (
  id uuid primary key default gen_random_uuid(),
  fecha date not null unique,
  cliente_nombre text not null,
  cliente_telefono text not null,
  hora_inicio time not null,
  hora_fin time not null,
  horas_extra integer not null default 0 check (horas_extra >= 0),
  costo_base numeric(10,2) not null,
  costo_extra numeric(10,2) not null default 0,
  costo_total numeric(10,2) generated always as (costo_base + costo_extra) stored,
  anticipo_requerido numeric(10,2) generated always as ((costo_base + costo_extra) * 0.5) stored,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Un día no puede estar reservado Y cerrado a la vez
create or replace function public.evitar_fecha_duplicada()
returns trigger as $$
begin
  if tg_table_name = 'reservaciones' then
    if exists (select 1 from public.dias_cerrados where fecha = new.fecha) then
      raise exception 'La fecha % está marcada como cerrada', new.fecha;
    end if;
  elsif tg_table_name = 'dias_cerrados' then
    if exists (select 1 from public.reservaciones where fecha = new.fecha) then
      raise exception 'La fecha % ya tiene una reservación', new.fecha;
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_check_fecha_reservacion on public.reservaciones;
create trigger trg_check_fecha_reservacion
  before insert or update of fecha on public.reservaciones
  for each row execute function public.evitar_fecha_duplicada();

drop trigger if exists trg_check_fecha_cerrado on public.dias_cerrados;
create trigger trg_check_fecha_cerrado
  before insert or update of fecha on public.dias_cerrados
  for each row execute function public.evitar_fecha_duplicada();

-- updated_at automático
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_reservaciones_updated_at on public.reservaciones;
create trigger trg_reservaciones_updated_at
  before update on public.reservaciones
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 3. Tabla: pagos
-- ---------------------------------------------------------------------
create table if not exists public.pagos (
  id uuid primary key default gen_random_uuid(),
  reservacion_id uuid not null references public.reservaciones(id) on delete cascade,
  monto numeric(10,2) not null check (monto > 0),
  fecha_pago date not null default current_date,
  nota text,
  created_at timestamptz not null default now()
);

-- No permitir que un pago exceda el saldo pendiente
create or replace function public.validar_pago()
returns trigger as $$
declare
  v_total numeric(10,2);
  v_pagado numeric(10,2);
begin
  select costo_total into v_total from public.reservaciones where id = new.reservacion_id;
  select coalesce(sum(monto), 0) into v_pagado
    from public.pagos
    where reservacion_id = new.reservacion_id
      and (tg_op = 'INSERT' or id <> new.id);

  if v_pagado + new.monto > v_total then
    raise exception 'El pago excede el saldo pendiente (saldo actual: %)', (v_total - v_pagado);
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_validar_pago on public.pagos;
create trigger trg_validar_pago
  before insert or update on public.pagos
  for each row execute function public.validar_pago();

-- ---------------------------------------------------------------------
-- 4. Vista: reservaciones con saldo
-- ---------------------------------------------------------------------
create or replace view public.vista_reservaciones_saldo as
select
  r.*,
  coalesce(p.total_pagado, 0) as total_pagado,
  r.costo_total - coalesce(p.total_pagado, 0) as saldo_pendiente,
  case
    when coalesce(p.total_pagado, 0) >= r.costo_total then 'pagado'
    when coalesce(p.total_pagado, 0) >= r.anticipo_requerido then 'anticipo_cubierto'
    else 'pendiente'
  end as estado_pago
from public.reservaciones r
left join (
  select reservacion_id, sum(monto) as total_pagado
  from public.pagos
  group by reservacion_id
) p on p.reservacion_id = r.id;

-- ---------------------------------------------------------------------
-- 5. Row Level Security — solo usuarios autenticados (Luis)
-- ---------------------------------------------------------------------
alter table public.reservaciones enable row level security;
alter table public.pagos enable row level security;
alter table public.dias_cerrados enable row level security;

drop policy if exists "auth_all_reservaciones" on public.reservaciones;
create policy "auth_all_reservaciones" on public.reservaciones
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "auth_all_pagos" on public.pagos;
create policy "auth_all_pagos" on public.pagos
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "auth_all_dias_cerrados" on public.dias_cerrados;
create policy "auth_all_dias_cerrados" on public.dias_cerrados
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- La vista hereda RLS de reservaciones y pagos automáticamente (security_invoker)
alter view public.vista_reservaciones_saldo set (security_invoker = on);

-- ---------------------------------------------------------------------
-- Fin del script
-- ---------------------------------------------------------------------
