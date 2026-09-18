-- TASK 20: Tentative slot override/replacement — server-side enforcement.
--
-- Must be run manually in the Supabase SQL editor (no DDL access via the
-- app's anon key, same limitation discussed for schedule_no_overlap_new_rows
-- earlier). Does NOT modify that exclusion constraint — it's relied on
-- as-is to reject an unavailable replacement slot.
--
-- Why a function instead of just doing DELETE + INSERT from the client:
-- the override permission must not be enforced only by the frontend. This
-- function re-reads the old row fresh (FOR UPDATE, ignoring anything the
-- client already believes), re-checks it's still an unpaid tentative hold,
-- and only then deletes it and inserts the replacement — in the same
-- transaction, so any failure (old slot gone/paid/changed by someone else,
-- or the new slot no longer available) rolls back the whole thing and
-- leaves the original tentative slot untouched. SECURITY INVOKER (the
-- default — no SECURITY DEFINER) on purpose: RLS already permits anon to
-- insert/delete "Schedule" rows directly today, so this function doesn't
-- need to run with elevated privileges, and shouldn't.

create or replace function override_tentative_slot(
  p_old_schedule_id bigint,
  p_new_instructor_id uuid,
  p_new_date date,
  p_new_start_time time,
  p_new_end_time time,
  p_new_tentative_details jsonb
) returns "Schedule"
language plpgsql
as $$
declare
  v_old "Schedule";
  v_new "Schedule";
begin
  select * into v_old
  from "Schedule"
  where id = p_old_schedule_id
  for update;

  if v_old.id is null then
    raise exception 'This tentative slot no longer exists.';
  end if;

  if v_old."isTentative" is not true or v_old.status <> 'hold' then
    raise exception 'This slot is not a tentative hold and cannot be overridden.';
  end if;

  if coalesce(v_old.tentative_details->>'payment_status', 'unpaid') <> 'unpaid' then
    raise exception 'This tentative slot has already received payment and can no longer be overridden.';
  end if;

  delete from "Schedule" where id = p_old_schedule_id;

  begin
    insert into "Schedule" (
      instructor_id, date, start_time, end_time, status, "isTentative",
      tentative_details, learner_id, course_id, lesson_id
    ) values (
      p_new_instructor_id, p_new_date, p_new_start_time, p_new_end_time,
      'hold', true, p_new_tentative_details, null, null, null
    )
    returning * into v_new;
  exception
    when exclusion_violation then
      -- Same constraint already enforced for direct inserts
      -- (schedule_no_overlap_new_rows) — translated to a friendlier
      -- message here. Raising re-propagates out of this function, so the
      -- earlier DELETE rolls back too.
      raise exception 'The selected replacement slot is no longer available.';
  end;

  return v_new;
end;
$$;

grant execute on function override_tentative_slot(bigint, uuid, date, time, time, jsonb)
  to anon, authenticated;
