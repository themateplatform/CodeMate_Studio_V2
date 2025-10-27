# Model Routing System

## Overview
BuildMate Studio uses an intelligent model routing system to select the optimal AI model for each task. Different models have different strengths, and the router automatically chooses the best one based on task type, context, and requirements.

## Supported Models

### Claude Sonnet 4.5 (Anthropic)
**Best for**: Repository auditing, architecture planning, automation reasoning

**Strengths**:
- Excellent structured analysis
- Long-form reasoning
- Complex planning tasks
- High reliability

**Configuration**:
```typescript
{
  provider: 'anthropic',
  model: 'claude-sonnet-4.5',
  temperature: 0.7,
  maxTokens: 8192,
  capabilities: ['repo-audit', 'architecture-planning', 'automation-reasoning', 'validation']
}
```

### GPT-5 Codex (OpenAI)
**Best for**: Code scaffolding, implementation, refactoring, test generation

**Strengths**:
- Specialized for code generation
- TypeScript/React expertise
- Accurate syntax
- Large context window

**Configuration**:
```typescript
{
  provider: 'openai',
  model: 'gpt-5-codex',
  temperature: 0.3,
  maxTokens: 16384,
  capabilities: ['code-scaffold', 'code-implementation', 'code-refactor', 'test-generation']
}
```

### GPT-5 (OpenAI)
**Best for**: General reasoning, validation, architecture planning

**Strengths**:
- Strong general reasoning
- Versatile across tasks
- Good balance of speed and quality

**Configuration**:
```typescript
{
  provider: 'openai',
  model: 'gpt-5',
  temperature: 0.7,
  maxTokens: 16384,
  capabilities: ['automation-reasoning', 'validation', 'architecture-planning']
}
```

### Gemini 2.5 Pro (Google)
**Best for**: Documentation, tutorials, clear narrative output

**Strengths**:
- Excellent documentation writing
- Clear explanations
- Well-structured content
- Cost-effective

**Configuration**:
```typescript
{
  provider: 'google',
  model: 'gemini-2.5-pro',
  temperature: 0.7,
  maxTokens: 8192,
  capabilities: ['documentation', 'validation']
}
```

### Grok Code Fast 1 (xAI)
**Best for**: Quick fixes, micro-refactors, fast iterations

**Strengths**:
- Very fast response time
- Good for small changes
- Cost-effective
- Reliable for simple tasks

**Configuration**:
```typescript
{
  provider: 'xai',
  model: 'grok-code-fast-1',
  temperature: 0.2,
  maxTokens: 4096,
  capabilities: ['quick-fix', 'code-refactor']
}
```

## Task Types

### Repository Audit
**Purpose**: Analyze existing codebase structure and patterns
**Recommended Model**: Claude Sonnet 4.5
**Reasoning**: Best at structured analysis and pattern recognition

### Architecture Planning
**Purpose**: Design application structure and data models
**Recommended Model**: Claude Sonnet 4.5
**Reasoning**: Excels at high-level planning and structured reasoning

### Code Scaffold
**Purpose**: Generate initial project structure
**Recommended Model**: GPT-5 Codex
**Reasoning**: Specialized for code generation with correct syntax

### Code Implementation
**Purpose**: Implement features and components
**Recommended Model**: GPT-5 Codex
**Reasoning**: Best code generation quality for TypeScript/React

### Code Refactor
**Purpose**: Improve existing code structure
**Recommended Model**: Grok Code Fast 1 (for quick fixes) or GPT-5 Codex (for complex refactoring)
**Reasoning**: Fast for simple changes, powerful for complex restructuring

### Test Generation
**Purpose**: Generate unit and integration tests
**Recommended Model**: GPT-5 Codex
**Reasoning**: Understands code context and testing patterns

### Documentation
**Purpose**: Generate README, API docs, tutorials
**Recommended Model**: Gemini 2.5 Pro
**Reasoning**: Clear narrative output and excellent explanations

### Quick Fix
**Purpose**: Small bug fixes and adjustments
**Recommended Model**: Grok Code Fast 1
**Reasoning**: Fast response time for simple changes

### Validation
**Purpose**: Check code quality, security, accessibility
**Recommended Model**: GPT-5 or Claude Sonnet 4.5
**Reasoning**: Strong reasoning for quality assessment

### Automation Reasoning
**Purpose**: Decide next steps in automation workflow
**Recommended Model**: Claude Sonnet 4.5 or GPT-5
**Reasoning**: Long-chain logic and decision-making

## Selection Algorithm

### 1. Filter by Capability
```typescript
const capableModels = modelRegistry.filter(model => 
  model.capabilities.includes(taskType)
)
```

### 2. Apply Context Filters

**Speed Priority**:
```typescript
if (preferSpeed) {
  candidates = candidates.filter(m => 
    m.model.includes('fast') || m.model.includes('turbo')
  )
}
```

**Quality Priority**:
```typescript
if (preferQuality) {
  candidates.sort((a, b) => 
    (b.costPerToken || 0) - (a.costPerToken || 0)
  )
}
```

**Budget Constraints**:
```typescript
if (budget === 'low') {
  candidates.sort((a, b) => 
    (a.costPerToken || 0) - (b.costPerToken || 0)
  )
}
```

### 3. Sort by Priority
```typescript
candidates.sort((a, b) => b.priority - a.priority)
```

### 4. Return Top Candidate
```typescript
return candidates[0]
```

## Usage Examples

### Basic Selection
```typescript
import { selectModel } from '@/buildmate';

const model = selectModel({
  taskType: 'code-implementation',
});

console.log(model.displayName); // "GPT-5 Codex"
```

### With Context
```typescript
const model = selectModel({
  taskType: 'code-refactor',
  preferSpeed: true,
  complexity: 'low',
});

console.log(model.displayName); // "Grok Code Fast 1"
```

### Get Recommended Model
```typescript
import { getRecommendedModel } from '@/buildmate';

const model = getRecommendedModel('documentation');
console.log(model.displayName); // "Gemini 2.5 Pro"
```

### List All Models for Task
```typescript
import { getModelsForTask } from '@/buildmate';

const models = getModelsForTask('architecture-planning');
models.forEach(m => console.log(m.displayName));
// Claude Sonnet 4.5
// GPT-5
// GPT-4 Turbo
```

### Explain Selection
```typescript
import { explainModelSelection } from '@/buildmate';

const explanation = explainModelSelection({
  taskType: 'code-scaffold',
  preferQuality: true,
});

console.log(explanation);
// Selected GPT-5 Codex for code-scaffold
// Reasoning: specialized for code generation, priority 10/10
```

## Adding New Models

### Register Custom Model
```typescript
import { registerModel } from '@/buildmate';

registerModel({
  provider: 'openai',
  model: 'gpt-6-preview',
  displayName: 'GPT-6 Preview',
  temperature: 0.7,
  maxTokens: 32768,
  capabilities: ['code-implementation', 'architecture-planning'],
  priority: 11,
  costPerToken: 0.000006,
});
```

### Override Model for Task
```typescript
const config = {
  modelOverride: 'gpt-6-preview',
};

await executeTask(task, config);
```

## Performance Considerations

### Token Usage
- **Planning**: 2,000-4,000 tokens
- **Code Generation**: 4,000-8,000 tokens
- **Documentation**: 1,000-3,000 tokens
- **Quick Fixes**: 500-1,500 tokens

### Response Times
- **Grok Code Fast 1**: 1-3 seconds
- **GPT-5 Codex**: 3-8 seconds
- **Claude Sonnet**: 5-10 seconds
- **Gemini Pro**: 3-7 seconds

### Cost Optimization
1. Use **Grok** for simple, frequent operations
2. Use **GPT-5 Codex** for complex code generation
3. Use **Gemini** for documentation (cost-effective)
4. Use **Claude** for critical planning (high accuracy)

## Best Practices

### 1. Let the Router Decide
Unless you have a specific reason, let the routing algorithm select the model:
```typescript
const model = selectModel({ taskType: 'code-implementation' });
```

### 2. Use Context Appropriately
Provide context to help the router make better decisions:
```typescript
const model = selectModel({
  taskType: 'code-refactor',
  complexity: 'high',
  preferQuality: true,
});
```

### 3. Monitor Performance
Track which models perform best for your use cases:
```typescript
const result = await executeTask(task);
console.log(`Model: ${result.metadata.modelUsed}`);
console.log(`Tokens: ${result.metadata.tokensUsed}`);
console.log(`Duration: ${result.metadata.duration}ms`);
```

### 4. Fallback Strategy
Always include fallback models in the registry:
```typescript
// GPT-4 Turbo and Claude 3.5 Sonnet serve as fallbacks
// when primary models are unavailable
```

## Troubleshooting

### Model Not Available
If a model fails, the system will:
1. Log the error
2. Try the next model in the priority list
3. Fall back to general-purpose models

### Poor Quality Output
If output quality is low:
1. Try increasing `preferQuality: true`
2. Use a higher-priority model explicitly
3. Adjust temperature (lower = more focused)

### Slow Response
If responses are too slow:
1. Use `preferSpeed: true`
2. Check task complexity
3. Consider using Grok for simple tasks

## Future Enhancements

### Planned Features
- **Performance tracking**: Automatic model performance monitoring
- **A/B testing**: Compare models for specific tasks
- **Custom routing rules**: Organization-specific preferences
- **Cost tracking**: Monitor token usage and costs
- **Model fine-tuning**: Custom models for specific patterns

### Experimental Models
As new models are released, they can be added to the registry:
- GPT-5 Advanced
- Claude Opus 4
- Gemini Ultra
- Custom fine-tuned models

## Conclusion

The model routing system is a core strength of BuildMate Studio. By intelligently selecting the right AI model for each task, we ensure optimal quality, performance, and cost-efficiency. The system is designed to be extensible, allowing new models to be added as they become available.
