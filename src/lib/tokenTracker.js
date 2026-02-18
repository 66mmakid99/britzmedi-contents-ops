/**
 * Token Usage Tracker
 * - 세션별 / 일별 토큰 사용량 추적
 * - 비용 계산 (USD + KRW)
 * - localStorage에 일별 누적 저장
 */

// Claude Sonnet 4.5 가격 (USD per 1M tokens)
const PRICING = {
  'claude-sonnet-4-5-20250929': {
    input: 3.00,
    output: 15.00,
    label: 'Claude Sonnet 4.5',
  },
};

const KRW_PER_USD = 1450;

export function calculateCost(inputTokens, outputTokens, model = 'claude-sonnet-4-5-20250929') {
  const pricing = PRICING[model] || PRICING['claude-sonnet-4-5-20250929'];
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  const totalUSD = inputCost + outputCost;
  const totalKRW = totalUSD * KRW_PER_USD;
  return { inputCost, outputCost, totalUSD, totalKRW, model: pricing.label };
}

export function formatCost(totalUSD, totalKRW) {
  const usd = totalUSD < 0.01 ? `$${totalUSD.toFixed(4)}` : `$${totalUSD.toFixed(3)}`;
  const krw = `₩${Math.round(totalKRW).toLocaleString()}`;
  return `${usd} (${krw})`;
}

export function formatTokens(count) {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
}

export class SessionTracker {
  constructor() {
    this.reset();
  }

  reset() {
    this.calls = [];
    this.totalInput = 0;
    this.totalOutput = 0;
    this.callCount = 0;
  }

  addCall(step, usage) {
    if (!usage) return;
    const entry = {
      step,
      inputTokens: usage.input_tokens || 0,
      outputTokens: usage.output_tokens || 0,
      timestamp: Date.now(),
    };
    this.calls.push(entry);
    this.totalInput += entry.inputTokens;
    this.totalOutput += entry.outputTokens;
    this.callCount += 1;
    addToDailyTotal(entry.inputTokens, entry.outputTokens);
  }

  getSummary() {
    const cost = calculateCost(this.totalInput, this.totalOutput);
    return {
      inputTokens: this.totalInput,
      outputTokens: this.totalOutput,
      callCount: this.callCount,
      calls: this.calls,
      ...cost,
    };
  }
}

const DAILY_KEY_PREFIX = 'bm-token-usage-';

function getTodayKey() {
  return DAILY_KEY_PREFIX + new Date().toISOString().slice(0, 10);
}

function addToDailyTotal(inputTokens, outputTokens) {
  try {
    const key = getTodayKey();
    const existing = JSON.parse(localStorage.getItem(key) || '{"input":0,"output":0,"calls":0}');
    existing.input += inputTokens;
    existing.output += outputTokens;
    existing.calls += 1;
    localStorage.setItem(key, JSON.stringify(existing));
  } catch { /* localStorage unavailable */ }
}

export function getDailyTotal() {
  try {
    const key = getTodayKey();
    const data = JSON.parse(localStorage.getItem(key) || '{"input":0,"output":0,"calls":0}');
    const cost = calculateCost(data.input, data.output);
    return { inputTokens: data.input, outputTokens: data.output, callCount: data.calls, ...cost };
  } catch {
    return { inputTokens: 0, outputTokens: 0, callCount: 0, totalUSD: 0, totalKRW: 0 };
  }
}

export function getUsageHistory(days = 7) {
  const history = [];
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = DAILY_KEY_PREFIX + date.toISOString().slice(0, 10);
    try {
      const data = JSON.parse(localStorage.getItem(key) || '{"input":0,"output":0,"calls":0}');
      const cost = calculateCost(data.input, data.output);
      history.push({ date: date.toISOString().slice(0, 10), ...data, ...cost });
    } catch {
      history.push({ date: date.toISOString().slice(0, 10), input: 0, output: 0, calls: 0, totalUSD: 0, totalKRW: 0 });
    }
  }
  return history.reverse();
}
