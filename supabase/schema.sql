-- ── Plans ─────────────────────────────────────────────────────────────────────
create table if not exists plans (
  id          text        primary key,
  user_id     uuid        references auth.users not null,
  data        jsonb       not null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Index for fast lookups by user
create index if not exists plans_user_id_idx on plans (user_id);

-- Row Level Security — users only see their own plans
alter table plans enable row level security;

create policy "Users can manage their own plans"
  on plans for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Settings ───────────────────────────────────────────────────────────────────
create table if not exists settings (
  user_id     uuid        primary key references auth.users,
  data        jsonb       not null default '{}',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table settings enable row level security;

create policy "Users can manage their own settings"
  on settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Updated_at trigger ─────────────────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger plans_updated_at
  before update on plans
  for each row execute function update_updated_at();

create trigger settings_updated_at
  before update on settings
  for each row execute function update_updated_at();
