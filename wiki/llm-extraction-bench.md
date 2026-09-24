# LLM extraction model bench

Compares OpenRouter / Groq models on the Hakomi weekend PDF against the seed fixture
[`backend/src/import/fixtures/hakomi-weekend-1.expected.json`](../backend/src/import/fixtures/hakomi-weekend-1.expected.json)
(45 activities, Fri–Sun).

**Current production pick:** `google/gemini-2.5-flash-lite` via OpenRouter  
(`LLM_PROVIDER=openrouter`, `OPENROUTER_MODEL=google/gemini-2.5-flash-lite`)

Re-run:

```bash
npm run test:extract --prefix backend -- --preset openrouter --threshold 0.6
npm run test:extract --prefix backend -- --list
```

## OpenRouter preset — 2026-09-24

Threshold 60% recall. PDF text length ~4770 chars.

| Model | Recall | Kind accuracy | Time | Result |
| --- | --- | --- | --- | --- |
| **openai/gpt-4.1** | **97.8%** (44/45) | **88.6%** | 22s | Best quality |
| **google/gemini-2.5-flash-lite** | **97.8%** (44/45) | 79.5% | **9.5s** | **Chosen default** (fast + cheap) |
| anthropic/claude-haiku-4.5 | 97.8% (44/45) | 81.8% | 23s | Strong kinds |
| google/gemini-2.5-flash | 97.8% (44/45) | 75.0% | 17s | Good |
| openai/gpt-4.1-mini | 97.8% (44/45) | 77.3% | 34s | Fine, slower than flash-lite |
| anthropic/claude-sonnet-4.5 | 95.6% (43/45) | 81.4% | 35s | Not worth extra cost here |
| deepseek/deepseek-chat-v3.1 | 97.8% (44/45) | 75.0% | 154s | Too slow |
| meta-llama/llama-3.3-70b-instruct | 91.1% (41/45) | 78.0% | 238s | Worse + slow |
| google/gemini-2.5-pro | — | — | — | Empty response |
| deepseek/deepseek-v3.2 | — | — | — | Invalid negative `startMinutes` / `endMinutes` |

### Shared gaps (all models)

- Calendar dates often invent Jan/Apr instead of **2026-09-18 … 2026-09-20** (prompt issue).
- Recurring title mismatch on Saturday’s children’s-song exercise (wording differs from seed).
- Kind misses cluster on ambiguous blocks: debriefs → `OTHER`, poem → `OTHER`/`CLOSING`, staff log-on → `STAFF` vs `LOGISTICS`.

### Recommendation

| Goal | Model |
| --- | --- |
| Default import | `google/gemini-2.5-flash-lite` |
| Best kind labels | `openai/gpt-4.1` |
| Avoid | `gemini-2.5-pro`, `deepseek-v3.2`, slow DeepSeek/Llama for this task |

Curated lists live in [`backend/scripts/extract-models.txt`](../backend/scripts/extract-models.txt).
