import { Router } from 'express';

const router = Router();

async function getSupabaseAdminSafe() {
  try {
    const mod = await import('../supabaseClient');
    const { supabaseAdmin, verifySupabaseJWT } = mod as any;
    return { supabaseAdmin, verifySupabaseJWT };
  } catch (e: any) {
    throw new Error('Supabase admin not configured on server');
  }
}

function isAdminEmail(email?: string | null) {
  const list = (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (!email) return false;
  return list.includes(email.toLowerCase());
}

router.use(async (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    const token = auth.slice(7);
    const { verifySupabaseJWT } = await getSupabaseAdminSafe();
    const user = await verifySupabaseJWT(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (!isAdminEmail(user.email)) return res.status(403).json({ error: 'Forbidden' });
    (req as any).currentUser = user;
    next();
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Internal Server Error' });
  }
});

router.get('/users', async (_req, res) => {
  try {
    const { supabaseAdmin } = await getSupabaseAdminSafe();
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 100 });
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ users: data.users });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Internal Server Error' });
  }
});

router.post('/users', async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email) return res.status(400).json({ error: 'email required' });
    const { supabaseAdmin } = await getSupabaseAdminSafe();

    if (password && password.length >= 6) {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true });
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ user: data.user });
    } else {
      const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ user: data.user });
    }
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Internal Server Error' });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { supabaseAdmin } = await getSupabaseAdminSafe();
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Internal Server Error' });
  }
});

export default router;
