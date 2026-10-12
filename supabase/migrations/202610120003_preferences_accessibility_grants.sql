begin;

grant update (
  reduce_motion,
  haptic_feedback,
  repeat_instructions
) on public.preferences to authenticated;

commit;
