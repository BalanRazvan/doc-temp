
create table timelines (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name       text not null,
  color      text,
  visits     jsonb not null default '[]',
  procedures jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table patients (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name               text not null,
  anchor_date        date not null,
  source_timeline_id uuid references timelines(id) on delete set null,
  visits             jsonb not null default '[]',


  procedures         jsonb not null default '[]',
  note               text,
  created_at         timestamptz not null default now()
);

create table procedure_sets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name       text not null,
  procedures jsonb not null default '[]',  -- ["Vitals","Bloods",...] names only
  created_at timestamptz not null default now()
);

create table saved_articles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade default auth.uid(),
  source      text not null default 'europepmc',
  external_id text not null,              -- PMID / PMCID / DOI
  title       text not null,
  authors     text,
  journal     text,
  year        int,
  abstract    text,
  url         text,
  note        text,
  saved_at    timestamptz not null default now()
);

create index patients_user_id_idx        on patients(user_id);
create index timelines_user_id_idx       on timelines(user_id);
create index procedure_sets_user_id_idx  on procedure_sets(user_id);
create index saved_articles_user_id_idx  on saved_articles(user_id);

alter table timelines       enable row level security;
alter table patients        enable row level security;
alter table procedure_sets  enable row level security;
alter table saved_articles  enable row level security;

create policy "own rows" on timelines
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on patients
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on procedure_sets
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on saved_articles
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on timelines      to authenticated;
grant select, insert, update, delete on patients       to authenticated;
grant select, insert, update, delete on procedure_sets to authenticated;
grant select, insert, update, delete on saved_articles to authenticated;
