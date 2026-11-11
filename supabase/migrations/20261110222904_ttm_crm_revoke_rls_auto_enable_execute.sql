-- Existing target function was verified as an event-trigger-only RLS helper.
-- Keep its body and event trigger unchanged; prevent direct Data API execution.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
