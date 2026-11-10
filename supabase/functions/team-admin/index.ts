import { createClient } from 'npm:@supabase/supabase-js@2.119.0';

const roles = ['director', 'admin', 'product_specialist', 'application_specialist', 'viewer'];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// The deployment origin is public configuration, never a caller-supplied redirect.
// APP_ORIGIN can override it for a separate authorised staging deployment.
Deno.serve(async (req: Request) => {
  const appOrigin = Deno.env.get('APP_ORIGIN') || 'https://ttm-product-workspace.hamdanfaiz.chatgpt.site';
  const origin = req.headers.get('origin');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json', 'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
  if (origin && origin === appOrigin) headers['Access-Control-Allow-Origin'] = origin;
  const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
  if (origin && origin !== appOrigin) return respond({ error: 'Origin tidak diizinkan.' }, 403);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') return respond({ error: 'Gunakan POST.' }, 405);
  const auth = req.headers.get('Authorization') || '';
  if (!/^Bearer \S+$/i.test(auth)) return respond({ error: 'Sesi login diperlukan.' }, 401);
  if (!appOrigin || !/^https?:\/\//.test(appOrigin)) return respond({ error: 'Konfigurasi APP_ORIGIN belum lengkap.' }, 503);
  const url = Deno.env.get('SUPABASE_URL') || '';
  const publicKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || '';
  const secretKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEY') || '';
  if (!url || !publicKey || !secretKey) return respond({ error: 'Konfigurasi server belum lengkap.' }, 503);
  const caller = createClient(url, publicKey, { global: { headers: { Authorization: auth } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error: userError } = await caller.auth.getUser(auth.replace(/^Bearer\s+/i, ''));
  if (userError || !user) return respond({ error: 'Sesi tidak valid atau kedaluwarsa.' }, 401);
  const { data: actor, error: profileError } = await caller.from('profiles').select('id,role,active').eq('id', user.id).single();
  if (profileError || !actor?.active) return respond({ error: 'Keanggotaan aktif diperlukan.' }, 403);
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return respond({ error: 'JSON tidak valid.' }, 400); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return respond({ error: 'Format tidak valid.' }, 400);
  if (typeof body.full_name !== 'string' || body.full_name.trim().length < 1 || body.full_name.length > 160) return respond({ error: 'Nama lengkap wajib, maksimal 160 karakter.' }, 400);
  const full_name = body.full_name.trim();
  if (body.action === 'update_self') {
    const { data, error } = await caller.from('profiles').update({ full_name }).eq('id', user.id).select().single();
    return error ? respond({ error: error.message }, 400) : respond({ profile: data });
  }
  if (!['director', 'admin'].includes(actor.role)) return respond({ error: 'Hanya director/admin dapat mengelola tim.' }, 403);
  if (!roles.includes(String(body.role))) return respond({ error: 'Role tidak valid.' }, 400);
  if (body.active !== undefined && typeof body.active !== 'boolean') return respond({ error: 'Status aktif tidak valid.' }, 400);
  if (body.region !== undefined && (typeof body.region !== 'string' || body.region.length > 160)) return respond({ error: 'Wilayah tidak valid.' }, 400);
  if (body.skills !== undefined && (!Array.isArray(body.skills) || body.skills.length > 50 || body.skills.some(x => typeof x !== 'string' || x.length > 100))) return respond({ error: 'Daftar kompetensi tidak valid.' }, 400);
  const changes = { full_name, role: body.role, active: body.active ?? true, region: body.region ?? '', skills: body.skills ?? [] };
  if (body.action === 'update') {
    if (typeof body.id !== 'string' || !uuid.test(body.id)) return respond({ error: 'ID anggota tidak valid.' }, 400);
    // Caller JWT is retained so RLS, last-manager trigger and audit all see the real operator.
    const { data, error } = await caller.from('profiles').update(changes).eq('id', body.id).select().single();
    return error ? respond({ error: error.message }, 400) : respond({ profile: data });
  }
  if (body.action !== 'invite') return respond({ error: 'Aksi tidak dikenali.' }, 400);
  if (typeof body.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email) || body.email.length > 254) return respond({ error: 'Email tidak valid.' }, 400);
  const admin = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: invitation, error: inviteError } = await admin.auth.admin.inviteUserByEmail(body.email.trim().toLowerCase(), { redirectTo: appOrigin, data: { full_name } });
  if (inviteError || !invitation.user) return respond({ error: inviteError?.message || 'Undangan gagal.' }, 400);
  const { data, error } = await caller.from('profiles').insert({ id: invitation.user.id, email: body.email.trim().toLowerCase(), ...changes }).select().single();
  if (error) {
    // Fail closed: an invited Auth user without active profile has no business data access.
    // Do not silently delete Auth users. Operator can repair profile after examining the failure.
    console.error('team-admin profile creation failed', { code: error.code, userId: invitation.user.id });
    return respond({ error: 'Undangan dikirim tetapi profil belum tersimpan. Administrator perlu memeriksa konfigurasi keanggotaan.' }, 500);
  }
  return respond({ profile: data, invitation_sent: true }, 201);
});
