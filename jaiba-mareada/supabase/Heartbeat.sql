-- Tabla dedicada para el ping de mantenimiento (no contiene datos del negocio)
create table if not exists public.heartbeat (
  id int primary key default 1,
  pinged_at timestamptz not null default now(),
  constraint solo_una_fila check (id = 1)
);
 
insert into public.heartbeat (id, pinged_at) values (1, now())
on conflict (id) do nothing;
 
-- RLS activado, sin políticas para anon/authenticated:
-- nadie desde la app puede leerla ni escribirla. Solo el
-- workflow de GitHub Actions la toca, usando la service_role key,
-- que por diseño de Supabase siempre puede saltarse RLS.
alter table public.heartbeat enable row level security;
 
