-- Harden SECURITY DEFINER helpers
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.has_upload_permission() from public, anon, authenticated;
revoke all on function public.is_admin() from public, anon, authenticated;
revoke all on function public.refresh_bank_question_count() from public, anon, authenticated;

drop function if exists public.current_role();

grant execute on function public.has_upload_permission() to authenticated;
grant execute on function public.is_admin() to authenticated;
