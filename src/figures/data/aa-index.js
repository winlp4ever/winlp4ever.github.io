// Artificial Analysis Intelligence Index v4.3.2 with release dates, shared by every post that charts the frontier.
// AA re-scores older models on the current version, so update this one file when it does.
// Source: the AA block on openrouter.ai/rankings and artificialanalysis.ai, read 2026-10-06 and checked 2026-10-12.

// each model that set a new record for closed models: [release date, score, name]
export const CLOSED = [['2025-11-24', 29.1, 'Opus 4.5'], ['2025-12-11', 30.4, 'GPT-5.2'], ['2026-02-05', 31.9, 'Opus 4.6'], ['2026-02-24', 32.5, 'GPT-5.3 Codex'],
  ['2026-03-05', 39, 'GPT-5.4'], ['2026-04-16', 40.7, 'Opus 4.7'], ['2026-05-28', 41.8, 'Opus 4.8'], ['2026-06-09', 49.6, 'Fable 5'],
  ['2026-07-23', 50.8, 'Opus 5'], ['2026-08-03', 53.4, 'Qwen3.8 Max'], ['2026-09-21', 57.6, 'Opus 5.5']];
// the same for open-weight models
export const OPEN = [['2026-02-11', 27.9, 'GLM-5'], ['2026-04-23', 30.4, 'V4 Pro'], ['2026-06-16', 33.7, 'GLM-5.2'],
  ['2026-07-15', 43.6, 'Kimi K3'], ['2026-08-16', 44.8, 'GLM-5.3'], ['2026-09-21', 46.3, 'MiMo-V2.6-Pro']];
// days since 1970-01-01, for date arithmetic
export const D = (s) => Date.parse(s + 'T00:00:00Z') / 864e5;
// the first closed record at or above a score
export const firstClosed = (score) => CLOSED.find((r) => r[1] >= score) || null;
