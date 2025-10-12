import { Router } from 'express';
import { verifySupabaseJWT, supabaseAdmin } from '../supabaseClient';

const router = Router();

// Return the current user based on Authorization: Bearer <access_token>
router.get('/user', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    const user = await verifySupabaseJWT(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    // Optionally fetch extended user profile from users table
    try {
      const { data } = await supabaseAdmin.from('users').select('*').eq('id', user.id).single();
      const safeUser = data || { id: user.id, email: user.email };
      return res.json(safeUser);
    } catch (err) {
      // If users table doesn't exist or query fails, fallback to basic user
      return res.json({ id: user.id, email: user.email });
    }
  } catch (error) {
    console.error('/api/auth/user error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
