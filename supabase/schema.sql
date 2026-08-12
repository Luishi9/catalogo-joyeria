-- ============================================================
-- AZUL JOYERIA - Schema Supabase
-- Ejecutar TODO esto en el SQL Editor del dashboard de Supabase:
--   https://supabase.com/dashboard/project/ozbnqyjnqdqygdyrleqq/sql
-- ============================================================

-- ================= TABLAS =================
create table if not exists public.productos (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  image text,
  image_path text,
  category text not null check (category in ('collares','pulseras','pendientes','otros','anillos')),
  material text,
  created_at timestamptz not null default now()
);

create table if not exists public.piedras (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  info text not null,
  image text,
  image_path text,
  created_at timestamptz not null default now()
);

-- ================= INDICES =================
-- El catalogo ordena productos por fecha y piedras por nombre.
create index if not exists productos_created_at_idx on public.productos (created_at desc);
create index if not exists productos_category_idx     on public.productos (category);
create index if not exists piedras_nombre_idx        on public.piedras (nombre asc);

-- ================= RLS (Row Level Security) =================
alter table public.productos enable row level security;
alter table public.piedras   enable row level security;

-- Lectura publica: el catalogo publico (/index.html) funciona sin login.
drop policy if exists "lectura_publica_productos" on public.productos;
create policy "lectura_publica_productos"
  on public.productos for select
  to anon, authenticated
  using (true);

drop policy if exists "lectura_publica_piedras" on public.piedras;
create policy "lectura_publica_piedras"
  on public.piedras for select
  to anon, authenticated
  using (true);

-- Escritura/edicion/borrado: solo usuarios autenticados (panel /insert).
drop policy if exists "escritura_auth_productos" on public.productos;
create policy "escritura_auth_productos"
  on public.productos for all
  to authenticated
  using (true) with check (true);

drop policy if exists "escritura_auth_piedras" on public.piedras;
create policy "escritura_auth_piedras"
  on public.piedras for all
  to authenticated
  using (true) with check (true);

-- ================= STORAGE =================
-- Bucket publico para imagenes (usar en la UI Storage -> New bucket:
-- nombre "imagenes-joyeria", tipo Public). El INSERT siguiente es respaldo.
insert into storage.buckets (id, name, public)
values ('imagenes-joyeria', 'imagenes-joyeria', true)
on conflict (id) do nothing;

-- Lectura publica de archivos (el catalogo muestra las imagenes sin login).
drop policy if exists "bucket_lectura_publica" on storage.objects;
create policy "bucket_lectura_publica"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'imagenes-joyeria');

-- Subida/actualizacion/borrado: solo autenticados (panel /insert).
drop policy if exists "bucket_escritura_auth" on storage.objects;
create policy "bucket_escritura_auth"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'imagenes-joyeria');

drop policy if exists "bucket_update_auth" on storage.objects;
create policy "bucket_update_auth"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'imagenes-joyeria');

drop policy if exists "bucket_delete_auth" on storage.objects;
create policy "bucket_delete_auth"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'imagenes-joyeria');