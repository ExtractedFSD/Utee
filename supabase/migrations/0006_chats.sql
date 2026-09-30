-- Conversations with Una, kept so a person can reopen one and carry on.
-- Messages are stored as a JSON array of {role, text, lines, flag, at}.
create table tracker_chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  title text,
  mode text not null default 'free',
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tracker_chats_user_idx on tracker_chats (user_id, updated_at desc);

alter table tracker_chats enable row level security;
create policy "own rows select" on tracker_chats for select to authenticated using (user_id = auth.uid());
create policy "own rows insert" on tracker_chats for insert to authenticated with check (user_id = auth.uid());
create policy "own rows update" on tracker_chats for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows delete" on tracker_chats for delete to authenticated using (user_id = auth.uid());
