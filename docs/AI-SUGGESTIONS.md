# AI-Powered Spec Suggestions System

## Overview
The AI Suggestions System provides intelligent assistance throughout the specification creation process using OpenAI's GPT-4o-mini. It helps teams create better specifications with AI-powered analysis, content suggestions, text improvements, and automated user story generation.

## Features

### 1. **AI Spec Analysis**
Analyzes complete specifications to provide quality scores and actionable insights.

**Capabilities:**
- **Overall Quality Score** (0-100): Holistic assessment of specification completeness
- **Clarity Score** (0-100): Measures how well the spec communicates intent
- **Completeness Score** (0-100): Evaluates coverage of critical sections
- **Strengths**: Lists what's working well in the specification
- **Improvements**: Prioritized suggestions (high/medium/low) for enhancement
- **Missing Elements**: Identifies critical gaps that need addressing

**Usage:**
```tsx
<AISpecAnalysis specData={specData} />
```

**API Endpoint:**
```
POST /api/ai/analyze-spec
Content-Type: application/json

{
  "specData": {
    "title": "Task Management Platform",
    "purpose": "Enable teams to collaborate on tasks",
    "audience": "Small business teams",
    "problemStatement": "...",
    "proposedSolution": "...",
    "successMetrics": [...],
    "acceptanceCriteria": [...]
  }
}

Response:
{
  "analysis": {
    "overallScore": 85,
    "clarityScore": 90,
    "completenessScore": 80,
    "strengths": ["Clear purpose statement", "Well-defined audience"],
    "improvements": [
      {
        "suggestion": "Add specific user journeys",
        "priority": "high",
        "impact": "Better captures user experience"
      }
    ],
    "missingElements": ["Success metrics", "Data models"]
  },
  "tokensUsed": 1250
}
```

### 2. **AI Content Suggestions**
Context-aware content suggestions for specific specification fields.

**Supported Contexts:**
- `purpose`: Why the product exists
- `audience`: Target user demographics
- `problem`: Problem statement refinement
- `solution`: Solution overview ideas
- `acceptance`: Acceptance criteria suggestions
- `metrics`: Success metric recommendations

**Usage:**
```tsx
<AISuggestions
  context="purpose"
  label="Purpose"
  relatedContent={{
    title: specData.title,
    audience: specData.audience,
  }}
  onSelect={(suggestion) => setSpecData(prev => ({ ...prev, purpose: suggestion }))}
/>
```

**API Endpoint:**
```
POST /api/ai/suggest-content
Content-Type: application/json

{
  "context": "purpose",
  "relatedContent": {
    "title": "Task Management Platform",
    "audience": "Small business teams"
  }
}

Response:
{
  "suggestions": [
    "Enable small business teams to collaborate effectively on tasks...",
    "Provide a centralized platform for task management...",
    "Streamline team coordination through intuitive task tracking..."
  ],
  "tokensUsed": 450
}
```

### 3. **AI Text Improvement**
Improves existing text with three tone variations: formal, concise, and friendly.

**Features:**
- **Formal**: Professional, polished language suitable for stakeholder docs
- **Concise**: Clear, to-the-point version with reduced word count
- **Friendly**: Approachable, warm tone for team-facing content

**Usage:**
```tsx
<AITextImprover
  text={specData.purpose}
  onSelect={(improvedText) => setSpecData(prev => ({ ...prev, purpose: improvedText }))}
  triggerLabel="Improve with AI"
/>
```

**API Endpoint:**
```
POST /api/ai/improve-text
Content-Type: application/json

{
  "text": "This product helps teams manage tasks better"
}

Response:
{
  "variations": [
    {
      "tone": "formal",
      "text": "This platform facilitates enhanced task management capabilities for collaborative teams..."
    },
    {
      "tone": "concise",
      "text": "Streamlines team task management with intuitive collaboration tools."
    },
    {
      "tone": "friendly",
      "text": "Help your team tackle tasks together with ease and confidence!"
    }
  ],
  "tokensUsed": 320
}
```

### 4. **AI User Story Generation**
Automatically generates user stories with acceptance criteria based on specification data.

**Output Format:**
- User story in "As a [role], I want [goal], so that [benefit]" format
- Acceptance criteria (3-5 specific, testable conditions)
- Priority level (high/medium/low)

**Usage:**
```tsx
<AIUserStories
  specData={{
    title: specData.title,
    purpose: specData.purpose,
    audience: specData.audience,
    problemStatement: specData.problemStatement,
    proposedSolution: specData.solutionOverview,
  }}
  onExport={(stories) => exportToBacklog(stories)}
/>
```

**API Endpoint:**
```
POST /api/ai/generate-user-stories
Content-Type: application/json

{
  "specData": {
    "title": "Task Management Platform",
    "purpose": "Enable teams to collaborate on tasks",
    "audience": "Small business teams",
    "problemStatement": "Teams struggle with task coordination",
    "proposedSolution": "Centralized task management platform"
  }
}

Response:
{
  "stories": [
    {
      "story": "As a team manager, I want to create and assign tasks to team members, so that work is distributed effectively",
      "acceptanceCriteria": [
        "Can create tasks with title, description, and due date",
        "Can assign tasks to specific team members",
        "Assigned members receive notifications",
        "Task status can be updated by assignees",
        "Manager can view all team tasks in one dashboard"
      ],
      "priority": "high"
    },
    {
      "story": "As a team member, I want to view my assigned tasks, so that I know what work I need to complete",
      "acceptanceCriteria": [
        "Can filter tasks by assignment status",
        "Tasks show priority and due dates",
        "Can mark tasks as complete",
        "Completed tasks remain visible in history",
        "Can add comments to tasks"
      ],
      "priority": "high"
    }
  ],
  "tokensUsed": 890
}
```

## Integration with Spec Editor

### Overview Tab Integration
The AI features are seamlessly integrated into the Spec Editor's Overview tab:

1. **AI Spec Analysis Card**: Displayed at the top when viewing (not editing) a spec with content
2. **Field-Level AI Suggestions**: 
   - Purpose, Problem, Solution fields show AI suggestion cards when empty in edit mode
   - Text improvement buttons appear next to filled fields
3. **Inline Assistance**: Suggestions integrate directly into the editing workflow

### User Journeys Tab Integration
- **AI User Stories Generator**: Button in card header generates user stories from spec data
- **Export Capability**: Generated stories can be exported to project backlog

## Architecture

### Backend (`server/routes/ai-suggestions.ts`)
- **Authentication**: All endpoints require authenticated sessions
- **Rate Limiting**: Built-in quota detection (429 responses)
- **Error Handling**: Graceful fallbacks for API failures
- **Token Tracking**: Returns token usage for monitoring costs

### Frontend Components
- `AISpecAnalysis.tsx`: Full spec analysis with scores and insights
- `AISuggestions.tsx`: Context-aware content suggestion generator
- `AITextImprover.tsx`: Multi-tone text improvement modal
- `AIUserStories.tsx`: User story generator with accordion view

### OpenAI Configuration
```typescript
{
  model: "gpt-4o-mini",
  temperature: 0.7, // 0.8 for creative tasks like user stories
  response_format: { type: "json_object" },
  max_tokens: 2000, // 1500 for suggestions
}
```

## Environment Configuration

### Required Environment Variable
```bash
OPENAI_API_KEY=sk-...your-key-here...
```

### Setup Instructions
1. Obtain OpenAI API key from https://platform.openai.com/api-keys
2. Add to `.env` file in project root:
   ```
   OPENAI_API_KEY=sk-proj-...
   ```
3. Restart development server

### Production Deployment (Replit)
1. Go to Secrets tab in Replit project
2. Add secret: `OPENAI_API_KEY` with your API key value
3. Deploy - environment variable automatically available

## Cost Considerations

### GPT-4o-mini Pricing (as of 2024)
- Input: $0.150 per 1M tokens
- Output: $0.600 per 1M tokens

### Estimated Usage Per Action
- **Spec Analysis**: 1,000-1,500 tokens (~$0.001 per analysis)
- **Content Suggestions**: 300-600 tokens (~$0.0003 per request)
- **Text Improvement**: 200-400 tokens (~$0.0002 per improvement)
- **User Story Generation**: 800-1,200 tokens (~$0.0008 per generation)

### Cost Optimization Tips
- All responses use `response_format: json_object` for structured output
- Token limits prevent excessive usage (1500-2000 max)
- System prompts are concise yet effective
- Caching at component level prevents redundant API calls

## Security & Privacy

### Data Handling
- User specifications are sent to OpenAI API for processing
- No data is stored by OpenAI (zero retention as per OpenAI API policy)
- All requests include session authentication
- CSRF protection on all POST endpoints

### Access Control
- Requires authenticated user session
- Users can only analyze/improve their own specs
- Rate limiting prevents abuse

### Privacy Considerations
- Specification data temporarily processed by OpenAI
- Consider data sensitivity before using AI features
- Enterprise customers should review OpenAI's enterprise terms

## Testing Checklist

### Manual Testing
- [ ] AI Spec Analysis shows correct scores for complete specs
- [ ] AI Spec Analysis identifies missing elements accurately
- [ ] Content suggestions appear when fields are empty
- [ ] Content suggestions respect context (purpose vs problem vs solution)
- [ ] Text improvement shows all three tones (formal, concise, friendly)
- [ ] Text improvement preserves meaning while changing tone
- [ ] User stories generate with proper format (As a... I want... so that...)
- [ ] User stories include acceptance criteria (3-5 items)
- [ ] User stories show priority badges (high/medium/low)
- [ ] Copy buttons work correctly on all components
- [ ] Loading states display during API calls
- [ ] Error messages shown when API fails or quota exceeded
- [ ] Components disabled when prerequisites missing (e.g., empty spec)

### API Testing
```bash
# Test spec analysis
curl -X POST http://localhost:5000/api/ai/analyze-spec \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=..." \
  -d '{"specData":{"title":"Test","purpose":"Test purpose"}}'

# Test content suggestions
curl -X POST http://localhost:5000/api/ai/suggest-content \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=..." \
  -d '{"context":"purpose","relatedContent":{"title":"Test App"}}'

# Test text improvement
curl -X POST http://localhost:5000/api/ai/improve-text \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=..." \
  -d '{"text":"This is a test"}'

# Test user story generation
curl -X POST http://localhost:5000/api/ai/generate-user-stories \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=..." \
  -d '{"specData":{"title":"Test","purpose":"Test purpose"}}'
```

### Error Scenarios
- [ ] Graceful handling when OPENAI_API_KEY missing
- [ ] 429 response when quota exceeded
- [ ] 401 response when unauthenticated
- [ ] Timeout handling for slow API responses
- [ ] Invalid JSON handling from OpenAI

## Future Enhancements

### Planned Features
1. **AI Data Model Generation**: Generate database schemas from spec descriptions
2. **AI Journey Mapping**: Automatically create user journey flows
3. **AI Test Case Generation**: Generate test scenarios from acceptance criteria
4. **AI Risk Analysis**: Identify potential risks and dependencies
5. **Multi-language Support**: Generate specs in multiple languages
6. **Custom Prompts**: Allow users to customize AI prompts per organization
7. **AI Training**: Fine-tune on organization-specific spec patterns

### Performance Improvements
1. **Streaming Responses**: Show AI output incrementally as generated
2. **Background Processing**: Queue expensive operations
3. **Caching**: Cache frequent suggestions to reduce API calls
4. **Batch Operations**: Analyze multiple specs in single API call

### Integration Opportunities
1. **GitHub Integration**: Generate issues from user stories
2. **Jira Sync**: Export stories directly to Jira backlog
3. **Slack Notifications**: Alert team when AI suggests improvements
4. **Analytics Dashboard**: Track AI usage and cost per user/project

## Troubleshooting

### Common Issues

**Issue: "OpenAI API key not configured"**
- **Solution**: Add `OPENAI_API_KEY` to environment variables
- **Check**: Restart server after adding environment variable

**Issue: "Quota exceeded" errors**
- **Solution**: Check OpenAI account billing and limits
- **Check**: Review usage at https://platform.openai.com/usage

**Issue: AI responses seem off-topic**
- **Solution**: Ensure related content includes sufficient context
- **Check**: Review prompts in `server/routes/ai-suggestions.ts`

**Issue: Slow response times**
- **Solution**: GPT-4o-mini should respond within 2-5 seconds
- **Check**: Monitor OpenAI API status page
- **Check**: Verify network connectivity

**Issue: TypeScript errors in AI components**
- **Solution**: Ensure all shadcn/ui components installed (Dialog, Tabs, Accordion)
- **Check**: Run `npm run check` to validate types

## Deployment Status
✅ Backend API routes implemented and registered
✅ Frontend components created and integrated
✅ TypeScript validation passing
✅ Production build successful (597KB JS, 96KB CSS)
✅ Documentation complete
⏳ Awaiting deployment to production

## Related Documentation
- [Authentication System](./AUTHENTICATION.md)
- [Projects Management](./PROJECTS.md)
- [Integration Hub](./INTEGRATION-HUB.md)
- [API Reference](./API.md)

## License
Part of CodeMate Studio platform - see main LICENSE file.
