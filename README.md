# SplitCost

## CMS server configuration

Blog and media management is protected by a signed, HTTP-only server session and
database policies that reject public writes. Configure these server-only values
in the deployment environment:

- `ADMIN_LOGIN_ID`
- `ADMIN_LOGIN_PASSWORD`
- `ADMIN_SESSION_SECRET` (a long random value used only for signing sessions)
- `SUPABASE_SERVICE_ROLE_KEY` (required by authorized CMS write routes)

Do not expose these values through `NEXT_PUBLIC_*` variables. Public article and
redirect reads continue to use `SUPABASE_PUBLISHABLE_KEY`.
