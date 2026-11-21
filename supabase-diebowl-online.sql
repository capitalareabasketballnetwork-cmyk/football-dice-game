
-- DIEBOWL online: server-authoritative match state. SQL actions are the only writer.
create table if not exists public.diebowl_online_matches (
 id uuid primary key default gen_random_uuid(),
 code text unique not null check (code ~ '^[A-Z0-9]{6}$'),
 queue_type text not null default 'friend' check (queue_type in ('friend','random')),
 host_id uuid not null references auth.users(id),
 guest_id uuid references auth.users(id),
 host_roster jsonb not null,
 guest_roster jsonb,
 status text not null default 'waiting' check (status in ('waiting','playing','finished','cancelled')),
 phase text not null default 'waiting' check (phase in ('waiting','offense','defense','finished')),
 offense_id uuid references auth.users(id),
 selected_play text,
 selected_actor text,
 defense_play text,
 position integer not null default 35,
 down_number integer not null default 1,
 distance integer not null default 10,
 drive_count integer not null default 0,
 host_score integer not null default 0,
 guest_score integer not null default 0,
 play_number integer not null default 0,
 deadline timestamptz,
 winner_id uuid references auth.users(id),
 last_result jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint distinct_players check (guest_id is null or guest_id<>host_id)
);
create index if not exists diebowl_online_waiting_idx on public.diebowl_online_matches(queue_type,created_at) where status='waiting';
create index if not exists diebowl_online_host_idx on public.diebowl_online_matches(host_id,created_at desc);
create index if not exists diebowl_online_guest_idx on public.diebowl_online_matches(guest_id,created_at desc);
alter table public.diebowl_online_matches enable row level security;
revoke all on public.diebowl_online_matches from anon,authenticated;
grant select on public.diebowl_online_matches to authenticated;
drop policy if exists "Participants view online matches" on public.diebowl_online_matches;
create policy "Participants view online matches" on public.diebowl_online_matches
 for select to authenticated using ((select auth.uid())=host_id or (select auth.uid())=guest_id);

create table if not exists public.diebowl_online_xp (
 user_id uuid primary key references auth.users(id) on delete cascade,
 earned integer not null default 0 check (earned>=0),
 games integer not null default 0 check (games>=0)
);
alter table public.diebowl_online_xp enable row level security;
revoke all on public.diebowl_online_xp from anon,authenticated;
grant select on public.diebowl_online_xp to authenticated;
drop policy if exists "Players view own online xp" on public.diebowl_online_xp;
create policy "Players view own online xp" on public.diebowl_online_xp for select to authenticated
 using ((select auth.uid())=user_id);

-- Internal trusted snapshots and results: no browser UPDATE access.
create or replace function public.diebowl_online_action(
 p_action text, p_code text default null, p_play text default null, p_actor text default null
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
 u uuid := auth.uid();
 m public.diebowl_online_matches%rowtype;
 roster jsonb;
 my_roster jsonb;
 actor_role text;
 allowed_roles text[];
 offensive text[] := array['inside','outside','power','draw','scramble','quick','slant','screen','deep','playaction','seam','hailmary'];
 defensive text[] := array['base','blitz','runstop','coverage','zone','man','spy','prevent'];
 is_offense boolean;
 generated_code text;
 score_host integer;
 score_guest integer;
 gained integer;
 off_die integer;
 def_die integer;
 new_position integer;
 new_down integer;
 new_distance integer;
 new_drives integer;
 new_offense uuid;
 result_info jsonb;
 outcome text;
 finished boolean := false;
 winner uuid;
 cap_total integer;
 max_plays integer := 300;
begin
 if u is null then raise exception 'Sign in to play online.'; end if;
 if p_action not in ('create','random','join','refresh','offense','defense','leave') then raise exception 'Invalid action'; end if;
 if p_action in ('create','random') then
  select roster into roster from public.diebowl_rosters where user_id=u;
  if roster is null or jsonb_typeof(coalesce(roster->'players',roster))<>'object' then
   raise exception 'Save your complete DieBowl roster first.';
  end if;
  my_roster := coalesce(roster->'players',roster);
  if (select count(*) from jsonb_object_keys(my_roster)) < 10 then raise exception 'Your roster must have all ten positions.'; end if;
  -- Return existing live room instead of creating unbounded rooms.
  select * into m from public.diebowl_online_matches
   where (host_id=u or guest_id=u) and status in ('waiting','playing') order by created_at desc limit 1;
  if found then return to_jsonb(m); end if;
  if p_action='random' then
   select * into m from public.diebowl_online_matches
    where queue_type='random' and status='waiting' and host_id<>u
    order by created_at limit 1 for update skip locked;
   if found then
    update public.diebowl_online_matches set
     guest_id=u, guest_roster=roster,status='playing',phase='offense',offense_id=host_id,
     deadline=clock_timestamp()+interval '10 seconds',updated_at=now()
     where id=m.id returning * into m;
    return to_jsonb(m);
   end if;
  end if;
  for gained in 1..6 loop
   generated_code:=upper(substr(encode(gen_random_bytes(5),'hex'),1,6));
   begin
    insert into public.diebowl_online_matches(code,queue_type,host_id,host_roster)
    values(generated_code,case when p_action='random' then 'random' else 'friend' end,u,roster)
    returning * into m;
    return to_jsonb(m);
   exception when unique_violation then null;
   end;
  end loop;
  raise exception 'Could not generate room code. Try again.';
 end if;
 if p_code is null or upper(trim(p_code)) !~ '^[A-Z0-9]{6}$' then raise exception 'Enter a valid six-character room code.';end if;
 select * into m from public.diebowl_online_matches where code=upper(trim(p_code)) for update;
 if not found then raise exception 'Room not found.';end if;
 if p_action='join' then
  if m.host_id=u or m.guest_id=u then return to_jsonb(m); end if;
  if m.status<>'waiting' then raise exception 'This room is not available.';end if;
  select roster into roster from public.diebowl_rosters where user_id=u;
  if roster is null or jsonb_typeof(coalesce(roster->'players',roster))<>'object' then
   raise exception 'Save your complete DieBowl roster first.';
  end if;
  my_roster:=coalesce(roster->'players',roster);
  if (select count(*) from jsonb_object_keys(my_roster))<10 then raise exception 'Your roster must have all ten positions.';end if;
  update public.diebowl_online_matches set guest_id=u,guest_roster=roster,status='playing',
   phase='offense',offense_id=host_id,deadline=clock_timestamp()+interval '10 seconds',updated_at=now()
   where id=m.id returning * into m;
  return to_jsonb(m);
 end if;
 if u<>m.host_id and u is distinct from m.guest_id then raise exception 'You are not a player in this room.';end if;
 if p_action='leave' then
  if m.status='waiting' then
   update public.diebowl_online_matches set status='cancelled',phase='finished',deadline=null where id=m.id returning * into m;
  elsif m.status='playing' then
   winner:=case when u=m.host_id then m.guest_id else m.host_id end;
   update public.diebowl_online_matches set status='finished',phase='finished',winner_id=winner,deadline=null,
    last_result=jsonb_build_object('message','Opponent forfeited the match') where id=m.id returning * into m;
   finished:=true;
  end if;
 elsif m.status='playing' then
  -- A refresh resolves expired turns too; never trust the client clock.
  if m.phase='offense' and m.deadline<=clock_timestamp() then
   update public.diebowl_online_matches set phase='defense',selected_play='inside',
    selected_actor='RB',deadline=clock_timestamp()+interval '10 seconds',updated_at=now()
    where id=m.id returning * into m;
  end if;
  if p_action='offense' and m.phase='offense' then
   if u<>m.offense_id then raise exception 'It is not your offensive turn.';end if;
   if p_play is null or not p_play=any(offensive) then raise exception 'Invalid offensive play.';end if;
   allowed_roles:=case
    when p_play in ('inside','outside','draw') then array['RB','QB']
    when p_play='power' then array['RB','TE']
    when p_play='scramble' then array['QB','RB']
    when p_play='screen' then array['RB','WR']
    else array['WR','TE'] end;
   if p_actor is null or not p_actor=any(allowed_roles) then raise exception 'Choose an eligible player.';end if;
   update public.diebowl_online_matches set phase='defense',selected_play=p_play,
    selected_actor=p_actor,deadline=clock_timestamp()+interval '10 seconds',updated_at=now()
    where id=m.id returning * into m;
  elsif m.phase='defense' and (p_action='defense' or m.deadline<=clock_timestamp()) then
   if p_action='defense' and u=m.offense_id then raise exception 'It is not your defensive turn.';end if;
   if m.deadline<=clock_timestamp() then p_play:='base';end if;
   if p_play is null or not p_play=any(defensive) then raise exception 'Invalid defensive play.';end if;
   is_offense := m.offense_id=m.host_id;
   roster := case when is_offense then m.host_roster else m.guest_roster end;
   my_roster := coalesce(roster->'players',roster);
   if not (my_roster ? m.selected_actor) then raise exception 'Offense is missing an eligible player.';end if;
   -- One authoritative random roll; client requests cannot prescribe values.
   off_die:=1+floor(random()*20)::integer;
   def_die:=1+floor(random()*20)::integer;
   gained:=greatest(-10,least(35,5+off_die-def_die+
    case when m.selected_play in ('deep','hailmary') then 4
         when m.selected_play in ('screen','quick') then -2 else 0 end));
   if p_play='blitz' and m.selected_play in ('deep','hailmary','playaction') then gained:=gained-5;end if;
   if p_play='runstop' and m.selected_play in ('inside','outside','power','draw') then gained:=gained-5;end if;
   new_position:=m.position+gained;new_down:=m.down_number+1;
   new_distance:=m.distance-gained;new_drives:=m.drive_count;
   score_host:=m.host_score;score_guest:=m.guest_score;
   new_offense:=m.offense_id;
   outcome:='GAIN '||gained||' YARDS';
   if new_position>=100 then
    if is_offense then score_host:=score_host+7;else score_guest:=score_guest+7;end if;
    outcome:='TOUCHDOWN! +7';
    new_drives:=new_drives+1;new_offense:=case when is_offense then m.guest_id else m.host_id end;
    new_position:=35;new_down:=1;new_distance:=10;
   elsif new_distance<=0 then
    new_down:=1;new_distance:=10;outcome:='FIRST DOWN · '||gained||' YDS';
   elsif new_down>4 then
    outcome:='TURNOVER ON DOWNS';new_drives:=new_drives+1;
    new_offense:=case when is_offense then m.guest_id else m.host_id end;
    new_position:=greatest(1,least(99,100-new_position));new_down:=1;new_distance:=10;
   end if;
   finished:=new_drives>=8 or m.play_number>=max_plays;
   if finished then
    winner:=case when score_host>score_guest then m.host_id
                 when score_guest>score_host then m.guest_id else null end;
   end if;
   result_info:=jsonb_build_object('message',outcome,'offense_roll',off_die,'defense_roll',def_die,
    'offensive_play',m.selected_play,'defensive_play',p_play,'yards',gained,'sequence',m.play_number+1);
   update public.diebowl_online_matches set
    phase=case when finished then 'finished' else 'offense' end,
    status=case when finished then 'finished' else 'playing' end,
    offense_id=new_offense,selected_play=null,selected_actor=null,defense_play=null,
    position=new_position,down_number=new_down,distance=new_distance,drive_count=new_drives,
    host_score=score_host,guest_score=score_guest,play_number=m.play_number+1,
    winner_id=winner,last_result=result_info,
    deadline=case when finished then null else clock_timestamp()+interval '10 seconds' end,
    updated_at=now() where id=m.id returning * into m;
  elsif p_action in ('offense','defense') and m.phase<>p_action then
   raise exception 'That turn has already been completed.';
  end if;
 end if;
 if finished then
  insert into public.diebowl_online_xp(user_id,earned,games)
   values(m.host_id,case when m.winner_id is null then 3 when m.winner_id=m.host_id then 4 else 2 end,1)
   on conflict(user_id) do update set earned=public.diebowl_online_xp.earned+excluded.earned,games=public.diebowl_online_xp.games+1;
  insert into public.diebowl_online_xp(user_id,earned,games)
   values(m.guest_id,case when m.winner_id is null then 3 when m.winner_id=m.guest_id then 4 else 2 end,1)
   on conflict(user_id) do update set earned=public.diebowl_online_xp.earned+excluded.earned,games=public.diebowl_online_xp.games+1;
 end if;
 return to_jsonb(m);
end;
$$;
revoke all on function public.diebowl_online_action(text,text,text,text) from public,anon;
grant execute on function public.diebowl_online_action(text,text,text,text) to authenticated;
