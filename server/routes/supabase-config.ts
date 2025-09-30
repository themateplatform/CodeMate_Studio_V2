import { Router } from 'express';

const router = Router();

// Provide Supabase configuration to client
router.get('/api/supabase/config', (req, res) => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({ 
      error: 'Supabase configuration not available on server' 
    });
  }

  res.json({
    url: supabaseUrl,
    anonKey: supabaseAnonKey
  });
});

export default router;