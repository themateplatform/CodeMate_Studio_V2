# BuildMate Studio - Freemium Getting Started

Quick setup guide for the freemium user funnel: Intake → Scope → Concepts → Pricing → Build → Deploy.

## 5-Minute Setup

### 1. Prerequisites
```bash
node --version  # 18+
npm --version   # 9+
git --version
```

### 2. Clone & Install
```bash
git clone https://github.com/themateplatform/CodeMate_Studio_V2.git
cd CodeMate_Studio_V2
npm install
```

### 3. Configure Environment
```bash
cp .env.example .env
```

Edit `.env`:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/buildmate
SESSION_SECRET=dev-secret-change-in-production
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLIC_KEY=pk_test_xxx
OPENAI_API_KEY=sk-xxx
NODE_ENV=development
PORT=5000
```

### 4. Database
```bash
npm run db:push
```

### 5. Start
```bash
npm run dev
```

Visit: `http://localhost:5000`

---

## The 6-Stage Funnel

### Stage 1: Intake (FREE)
- User describes project
- Selects: greenfield OR completion
- Chooses integrations, brand preference
- **API**: `POST /api/intake`

### Stage 2: Scope (FREE)
- Auto-generated scope document
- User approves or requests revisions
- **API**: `POST /api/scope/generate`, `POST /api/scope/approve`

### Stage 3: Concepts (FREE)
- 3 mood boards (colors, fonts, vibes)
- User selects one
- **API**: `POST /api/concepts/generate`, `POST /api/concepts/select`

### Stage 4: Pricing (PAYMENT GATE)
- Price calculated: $300-$7,500
- Itemized breakdown shown
- Stripe checkout
- **API**: `POST /api/pricing/calculate`, `POST /api/pricing/checkout`

### Stage 5: Build (PAID)
- Code generation runs
- Real-time progress updates
- ~15 minutes for complete build
- **API**: `POST /api/build/start`, `GET /api/build/:id/progress`

### Stage 6: Deploy (PAID)
- User selects platform (Vercel, Netlify, etc.)
- Gets deployment instructions
- **API**: `POST /api/deploy/select`

---

## Testing the Flow

### Without Payment
1. Complete stages 1-3 (all FREE)
2. Use Stripe test card: `4242 4242 4242 4242`
3. Any future expiry + any CVC

### Key Routes
```
GET  /                  → Landing page
GET  /intake            → Stage 1 form
GET  /scope/:buildId    → Stage 2 review
GET  /concepts/:buildId → Stage 3 selector
GET  /pricing/:buildId  → Stage 4 gate
GET  /build/:buildId    → Stage 5 monitor
GET  /deploy/:buildId   → Stage 6 instructions
```

---

## Commands Reference

```bash
npm run dev              # Dev (Express port 5000, Vite port 8080)
npm run build            # Production build
npm start                # Run production
npm run db:push          # Update database schema
npm run check            # TypeScript check
npm run test             # Unit tests
npm run test:e2e         # E2E tests
npm run test:coverage    # Coverage report
```

---

## API Endpoints Quick Reference

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/intake` | Save project details |
| POST | `/api/scope/generate` | Generate scope |
| POST | `/api/scope/approve` | Approve scope |
| POST | `/api/concepts/generate` | Generate mood boards |
| POST | `/api/concepts/select` | Select a mood board |
| POST | `/api/pricing/calculate` | Calculate price |
| POST | `/api/pricing/checkout` | Create Stripe session |
| POST | `/api/webhooks/stripe` | Stripe payment webhook |
| POST | `/api/build/start` | Start code generation |
| GET | `/api/build/:id/progress` | Check build progress |
| POST | `/api/deploy/select` | Choose platform |
| GET | `/api/builds` | List user's builds |
| GET | `/api/builds/:id` | Get build details |

---

## Directory Structure

```
client/src/
├── pages/
│   ├── intake.tsx       # Stage 1 form
│   ├── scope.tsx        # Stage 2 review
│   ├── concepts.tsx     # Stage 3 selector
│   ├── pricing.tsx      # Stage 4 payment
│   ├── build.tsx        # Stage 5 monitor
│   └── deploy.tsx       # Stage 6 setup
├── components/          # UI components
├── lib/                 # API client, utilities
└── App.tsx

server/
├── routes/
│   ├── intake.ts
│   ├── scope.ts
│   ├── concepts.ts
│   ├── pricing.ts
│   ├── build.ts
│   └── deploy.ts
├── generator/           # Code generation pipeline
├── github/              # Repo analysis & PR creation
├── db.ts
└── index.ts

shared/
└── schema.ts            # Database schema (Drizzle)

docs/
├── FREEMIUM-MODEL.md
├── ARCHITECTURE.md
└── IMPLEMENTATION-ROADMAP.md
```

---

## Common Development Tasks

### Add a Route
1. `server/routes/myfeature.ts`:
   ```typescript
   export function registerMyRoutes(app: Express, csrf: RequestHandler) {
     app.post("/api/my-feature", csrf, async (req, res) => {
       // Implementation
     });
   }
   ```

2. Register in `server/routes.ts`:
   ```typescript
   import { registerMyRoutes } from "./routes/myfeature";
   registerMyRoutes(app, csrfProtection);
   ```

### Add Database Table
1. `shared/schema.ts`:
   ```typescript
   export const myTable = pgTable("my_table", {
     id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
     name: text("name").notNull(),
   });
   ```

2. Apply:
   ```bash
   npm run db:push
   ```

### Update Frontend Component
```tsx
// client/src/pages/example.tsx
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';

export default function Example() {
  const { data } = useQuery({
    queryKey: ['/api/data'],
    queryFn: () => fetch('/api/data').then(r => r.json()),
  });

  return <Button>Click me</Button>;
}
```

---

## Testing

### Unit Tests
```bash
npm run test
```

File: `**/*.test.ts` or `**/*.spec.ts`

### E2E Tests
```bash
npm run test:e2e
```

File: `e2e/**/*.spec.ts`

### Coverage
```bash
npm run test:coverage
```

---

## Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `DATABASE_URL` | PostgreSQL connection | `postgresql://...` |
| `SESSION_SECRET` | Session encryption | Random string |
| `GITHUB_CLIENT_ID` | OAuth app ID | `Iv1.xxxx` |
| `GITHUB_CLIENT_SECRET` | OAuth secret | `secret` |
| `STRIPE_SECRET_KEY` | Stripe secret | `sk_test_...` |
| `STRIPE_PUBLIC_KEY` | Stripe public | `pk_test_...` |
| `OPENAI_API_KEY` | OpenAI API key | `sk-...` |
| `NODE_ENV` | Environment | `development` or `production` |
| `PORT` | Server port | `5000` |

---

## Troubleshooting

**Database connection failed**
- Check `DATABASE_URL` format
- Verify PostgreSQL running
- Create DB: `createdb buildmate`

**Stripe errors**
- Verify secret/public keys in `.env`
- Use test cards in dev mode

**GitHub OAuth failing**
- Callback URL: `http://localhost:5000/api/auth/github/callback`
- Match GitHub OAuth app settings

**Vite HMR issues (Codespaces)**
- HMR overlay disabled by default
- Changes auto-reload

---

## Next Steps

1. Read [`FREEMIUM-MODEL.md`](./FREEMIUM-MODEL.md) — Business model details
2. Review [`ARCHITECTURE.md`](./ARCHITECTURE.md) — Technical design
3. See [`IMPLEMENTATION-ROADMAP.md`](./IMPLEMENTATION-ROADMAP.md) — Development plan
4. Check [`.github/copilot-instructions.md`](../.github/copilot-instructions.md) — For extending BuildMate

---

**Ready? Visit `http://localhost:5000` and try the intake form!**
