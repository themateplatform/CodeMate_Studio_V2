import { Router } from 'express';
import { openAIClient } from '../services/openaiClient';
import { supabaseAdmin, verifySupabaseJWT } from '../supabaseClient';

const router = Router();

type RequestUser = {
  id: string;
  email?: string | null;
};

router.use(async (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = auth.slice(7);
    const user = await verifySupabaseJWT(token);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    (req as any).currentUser = user as RequestUser;
    next();
  } catch (error) {
    console.error('App Builder auth guard failed', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

async function recordAudit(user: RequestUser, action: string, metadata: Record<string, unknown>) {
  try {
    await supabaseAdmin.from('audit_logs').insert({
      user_id: user.id,
      action,
      resource: 'app_builder',
      metadata,
    });
  } catch (error) {
    console.warn('Failed to record audit log', error);
  }
}

router.post('/intake', async (req, res) => {
  try {
    const { input, context } = req.body as { input?: string; context?: Array<{ content: string }> };
    if (!input || input.trim().length === 0) {
      return res.status(400).json({ error: 'Input is required' });
    }

    const contextMessages = Array.isArray(context)
      ? context.map((message) => String(message.content || '')).filter(Boolean)
      : [];

    const analysis = await openAIClient.analyzeRequirements(input, contextMessages);

    await recordAudit((req as any).currentUser, 'app_builder_intake', {
      requirementsCount: Array.isArray(analysis?.requirements) ? analysis.requirements.length : 0,
    });

    return res.json({
      requirements: Array.isArray(analysis?.requirements) ? analysis.requirements : [],
      followUpQuestions: analysis?.followUpQuestions ?? null,
      completed: Boolean(analysis?.completed),
    });
  } catch (error: any) {
    console.error('Intake processing failed', error);
    return res.status(500).json({ error: 'Failed to process intake' });
  }
});

router.post('/enhance', async (req, res) => {
  try {
    const { requirements } = req.body;
    const result = await openAIClient.suggestEnhancements(requirements);
    await recordAudit((req as any).currentUser, 'app_builder_enhancements', {
      enhancements: Array.isArray(result?.enhancements) ? result.enhancements.length : 0,
    });
    return res.json({
      enhancements: Array.isArray(result?.enhancements) ? result.enhancements : [],
      competitors: Array.isArray(result?.competitors) ? result.competitors : [],
    });
  } catch (error) {
    console.error('Enhancement analysis failed', error);
    return res.status(500).json({ error: 'Failed to analyze enhancements' });
  }
});

router.post('/discover', async (req, res) => {
  try {
    const { requirements, enhancements } = req.body;
    const result = await openAIClient.discoverResources(requirements, enhancements);
    await recordAudit((req as any).currentUser, 'app_builder_discover', {
      agents: Array.isArray(result?.aiAgents) ? result.aiAgents.length : 0,
    });
    return res.json({
      aiAgents: Array.isArray(result?.aiAgents) ? result.aiAgents : [],
      mcpServers: Array.isArray(result?.mcpServers) ? result.mcpServers : [],
    });
  } catch (error) {
    console.error('Discovery phase failed', error);
    return res.status(500).json({ error: 'Failed to discover resources' });
  }
});

router.post('/brief', async (req, res) => {
  try {
    const brief = await openAIClient.createDesignBrief(req.body);
    await recordAudit((req as any).currentUser, 'app_builder_brief', {
      hasBrief: Boolean(brief),
    });
    return res.json({ brief });
  } catch (error) {
    console.error('Design brief generation failed', error);
    return res.status(500).json({ error: 'Failed to generate design brief' });
  }
});

router.post('/implement', async (req, res) => {
  try {
    const plan = await openAIClient.planImplementation(req.body);
    await recordAudit((req as any).currentUser, 'app_builder_implementation', {
      hasPlan: Boolean(plan),
    });
    return res.json({ plan });
  } catch (error) {
    console.error('Implementation planning failed', error);
    return res.status(500).json({ error: 'Failed to plan implementation' });
  }
});

export default router;
