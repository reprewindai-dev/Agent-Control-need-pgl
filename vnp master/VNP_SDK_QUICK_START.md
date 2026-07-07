# VNP Agent SDK Quick-Start Guide

**What it does:** One-line API selection for agents based on real VNP scores.

**Use case:** Route your agent to the best-performing API without manual switching.

---

## PYTHON QUICK START

### Install
```bash
pip install vnp-sdk
```

### Basic Usage
```python
from vnp import select_best_api

# Select best API
best = select_best_api(['openai', 'anthropic', 'together'])

print(f"Best API: {best.api}")
print(f"Score: {best.score}")
print(f"Confidence: {best.confidence}%")
print(f"Endpoint: {best.uri}")
```

**Output:**
```
Best API: anthropic
Score: 89.2
Confidence: 95.8%
Endpoint: https://api.anthropic.com/v1
```

---

### Add Constraints
```python
# Only APIs with <500ms latency
best = select_best_api(
    ['openai', 'anthropic', 'together'],
    constraint='latency < 500ms'
)

# Only APIs with <1% error rate
best = select_best_api(
    ['openai', 'anthropic'],
    constraint='error_rate < 1%'
)

# Only APIs with >99.9% availability
best = select_best_api(
    ['openai', 'anthropic'],
    constraint='availability > 99.9%'
)
```

---

### Get Alternatives
```python
# See what else is available
best = select_best_api(['openai', 'anthropic', 'together'])

print(f"First choice: {best.api} ({best.score})")
print("Fallbacks:")
for alt in best.alternatives:
    print(f"  - {alt['api']}: {alt['score']}")
```

**Output:**
```
First choice: anthropic (89.2)
Fallbacks:
  - openai: 87.4
  - together: 84.1
```

---

### Check Single API Score
```python
from vnp import get_api_score

score = get_api_score('openai')

if score:
    print(f"OpenAI Score: {score.composite_score}")
    print(f"  Latency: {score.p99_latency_ms}ms")
    print(f"  Error Rate: {score.error_rate_pct}%")
    print(f"  Availability: {score.availability_pct}%")
    print(f"  Measurement Count: {score.measurement_count:,}")
else:
    print("API not found in VNP")
```

---

### Use in Agent Routing
```python
import anthropic
import requests
from vnp import select_best_api

def call_best_image_generation_api(prompt: str, num_images: int = 1):
    """Route image generation to best-performing API"""
    
    # Select best API for this use case
    best = select_best_api(
        candidates=['openai', 'together', 'replicate'],
        constraint='latency < 1000ms'
    )
    
    print(f"Using {best.api} (score: {best.score})")
    
    # Call the selected API
    if best.api == 'openai':
        response = requests.post(
            f"{best.uri}/images/generations",
            headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
            json={
                "prompt": prompt,
                "n": num_images,
                "size": "1024x1024"
            }
        )
    elif best.api == 'together':
        response = requests.post(
            f"{best.uri}/images/generations",
            headers={"Authorization": f"Bearer {TOGETHER_API_KEY}"},
            json={
                "model": "stabilityai/stable-diffusion-3",
                "prompt": prompt,
                "steps": 20
            }
        )
    
    return response.json()

# Use it
images = call_best_image_generation_api("a cat wearing sunglasses")
```

---

### Caching & Performance
```python
# SDK automatically caches scores for 5 minutes
# First call: ~200ms (hits VNP API)
# Second call: <1ms (from cache)

from vnp import select_best_api
import time

# First call
start = time.time()
best1 = select_best_api(['openai', 'anthropic'])
print(f"First call: {(time.time() - start) * 1000:.1f}ms")

# Second call (cached)
start = time.time()
best2 = select_best_api(['openai', 'anthropic'])
print(f"Second call: {(time.time() - start) * 1000:.1f}ms")  # ~1ms
```

---

## JAVASCRIPT/TYPESCRIPT QUICK START

### Install
```bash
npm install @vnp/sdk
```

### Basic Usage
```typescript
import { selectBestAPI } from '@vnp/sdk';

const best = await selectBestAPI({
  candidates: ['openai', 'anthropic', 'together']
});

console.log(`Best API: ${best.api}`);
console.log(`Score: ${best.score}`);
console.log(`Confidence: ${best.confidence}%`);
console.log(`Endpoint: ${best.uri}`);
```

---

### Add Constraints
```typescript
// Only APIs with <500ms latency
const best = await selectBestAPI({
  candidates: ['openai', 'anthropic', 'together'],
  constraint: 'latency < 500ms'
});

// Only APIs with <1% error rate
const best = await selectBestAPI({
  candidates: ['openai', 'anthropic'],
  constraint: 'error_rate < 1%'
});
```

---

### Use in LLM Agent
```typescript
import { selectBestAPI } from '@vnp/sdk';
import Anthropic from '@anthropic-ai/sdk';

async function callBestLLMAPI(userPrompt: string) {
  // Select best text generation API
  const best = await selectBestAPI({
    candidates: ['openai', 'anthropic', 'together'],
    constraint: 'latency < 500ms'
  });

  console.log(`Routing to ${best.api}`);

  if (best.api === 'openai') {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: userPrompt }]
    });
    return response.choices[0].message.content;
  } 
  else if (best.api === 'anthropic') {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 1024,
      messages: [{ role: 'user', content: userPrompt }]
    });
    return response.content[0].type === 'text' ? response.content[0].text : '';
  }

  throw new Error(`Unknown API: ${best.api}`);
}

// Use it
const response = await callBestLLMAPI('Explain quantum computing in 50 words');
console.log(response);
```

---

### Get Alternatives
```typescript
const best = await selectBestAPI({
  candidates: ['openai', 'anthropic', 'together'],
  fallbackChain: 3
});

console.log(`First choice: ${best.api} (${best.score})`);
console.log('Fallbacks:');
best.alternatives.forEach(alt => {
  console.log(`  - ${alt.api}: ${alt.score}`);
});
```

---

### Error Handling
```typescript
import { selectBestAPI } from '@vnp/sdk';

try {
  const best = await selectBestAPI({
    candidates: ['unknown-api-1', 'unknown-api-2']
  });
} catch (error) {
  if (error.message.includes('No VNP scores found')) {
    console.log('No APIs found in VNP. Using fallback...');
    // Use hardcoded fallback
  } else {
    console.error('Unexpected error:', error);
  }
}
```

---

## COMMON PATTERNS

### Pattern 1: Multi-Modal Routing
```python
from vnp import select_best_api

use_cases = {
    'text': ['openai', 'anthropic', 'together'],
    'image': ['openai', 'replicate', 'stability-ai'],
    'embedding': ['openai', 'cohere'],
}

# Select best for each
for use_case, candidates in use_cases.items():
    best = select_best_api(candidates)
    print(f"{use_case}: {best.api}")
```

---

### Pattern 2: Cost + Performance Trade-off
```python
# Select based on constraint
def smart_select(task_type: str, budget: str):
    """Select API based on task and budget"""
    
    candidates = {
        'text_fast': ['openai', 'anthropic'],
        'text_cheap': ['together', 'cohere'],
        'image_quality': ['openai', 'stability-ai'],
        'image_cheap': ['replicate', 'together'],
    }
    
    key = f"{task_type}_{budget}"
    return select_best_api(candidates[key])

# Use it
best = smart_select('text', 'fast')  # Gets OpenAI or Anthropic
best = smart_select('text', 'cheap')  # Gets Together or Cohere
```

---

### Pattern 3: Fallback Chain
```python
from vnp import select_best_api

def call_api_with_fallback(candidates: list, prompt: str):
    """Call API with automatic fallback on error"""
    
    best = select_best_api(candidates)
    
    for attempt, api in enumerate([best.api] + [a['api'] for a in best.alternatives]):
        try:
            print(f"Attempt {attempt + 1}: Using {api}")
            response = call_llm(api, prompt)
            return response
        except Exception as e:
            print(f"  Failed: {e}")
            if attempt == len(best.alternatives):
                raise
            continue

# Use it
response = call_api_with_fallback(
    ['openai', 'anthropic', 'together'],
    "Write a haiku about coding"
)
```

---

### Pattern 4: Health Check + Auto-Switch
```python
import time
from vnp import get_api_score

class AdaptiveRouter:
    def __init__(self, primary_api: str, fallback_apis: list):
        self.primary = primary_api
        self.fallbacks = fallback_apis
        self.last_switch = 0
    
    def get_best_api(self):
        """Switch to fallback if primary score drops"""
        
        score = get_api_score(self.primary)
        
        if score and score.composite_score < 70:
            # Primary is degraded, switch
            print(f"Primary {self.primary} score dropped to {score.composite_score}")
            self.primary = self.fallbacks[0]
            self.fallbacks = [self.primary] + self.fallbacks[1:]
            self.last_switch = time.time()
        
        return self.primary

# Use it
router = AdaptiveRouter('openai', ['anthropic', 'together'])
api_to_use = router.get_best_api()
```

---

## TROUBLESHOOTING

### "No VNP scores found for..."
**Cause:** API not yet measured by VNP  
**Solution:** Check spelling, or add new API to VNP

### "Connection timeout"
**Cause:** VNP API unreachable  
**Solution:** Check network, verify `api.vnp.io` is accessible

### "Constraint not met"
**Cause:** No APIs passed your constraints  
**Solution:** Loosen constraint or add more candidates

---

## NEXT STEPS

- Read full SDK docs: https://docs.vnp.io/sdk
- Check VNP methodology: https://docs.vnp.io/methodology
- Join community: https://github.com/VeklomNP
- File issues: https://github.com/VeklomNP/sdk-python/issues

---

**Questions?** Email support@vnp.io
