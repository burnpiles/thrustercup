-- Thruster Cup leaderboard. Public read-only; all writes go through the submit-score edge function.
create table public.scores (
  twin text not null check (twin in ('alan','alex')),
  player_id uuid not null,
  name text not null check (char_length(name) between 2 and 12),
  score integer not null check (score between 0 and 500000),
  finish_ms integer check (finish_ms between 10000 and 900000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (twin, player_id)
);
create index scores_twin_score_idx on public.scores (twin, score desc);
create index scores_score_idx on public.scores (score desc);
alter table public.scores enable row level security;
create policy "public can read scores" on public.scores for select to anon, authenticated using (true);
revoke insert, update, delete on public.scores from anon, authenticated;

create table public.submit_rate (
  bucket text primary key,
  window_start timestamptz not null default now(),
  hits integer not null default 0
);
alter table public.submit_rate enable row level security;
revoke all on public.submit_rate from anon, authenticated;

create or replace function public.rate_hit(p_bucket text, p_limit integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_hits integer;
begin
  insert into public.submit_rate as r (bucket, window_start, hits) values (p_bucket, now(), 1)
  on conflict (bucket) do update
    set hits = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.hits + 1 end,
        window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning hits into v_hits;
  return v_hits <= p_limit;
end; $$;

create or replace function public.submit_score(p_twin text, p_player uuid, p_name text, p_score integer, p_finish_ms integer)
returns table(best integer, improved boolean) language plpgsql security definer set search_path = public as $$
declare v_prev integer;
begin
  select s.score into v_prev from public.scores s where s.twin = p_twin and s.player_id = p_player;
  if v_prev is null then
    insert into public.scores (twin, player_id, name, score, finish_ms) values (p_twin, p_player, p_name, p_score, p_finish_ms);
    return query select p_score, true;
  elsif p_score > v_prev then
    update public.scores set name = p_name, score = p_score, finish_ms = p_finish_ms, updated_at = now() where twin = p_twin and player_id = p_player;
    return query select p_score, true;
  else
    update public.scores set name = p_name, updated_at = now() where twin = p_twin and player_id = p_player;
    return query select v_prev, false;
  end if;
end; $$;

revoke execute on function public.rate_hit(text, integer, integer) from public, anon, authenticated;
revoke execute on function public.submit_score(text, uuid, text, integer, integer) from public, anon, authenticated;
grant execute on function public.rate_hit(text, integer, integer) to service_role;
grant execute on function public.submit_score(text, uuid, text, integer, integer) to service_role;
grant select, insert, update, delete on public.scores, public.submit_rate to service_role;
