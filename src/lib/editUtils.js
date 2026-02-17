/**
 * Edit metrics and formatting utilities for Content Intelligence tracking
 */

/**
 * 두 텍스트의 변경량을 계산
 */
export function calculateEditMetrics(before, after) {
  if (!before || !after) return { editDistance: 0, editRatio: 0 };

  const beforeLen = before.length;
  const afterLen = after.length;

  let changes = 0;
  const maxLen = Math.max(beforeLen, afterLen);
  const minLen = Math.min(beforeLen, afterLen);

  for (let i = 0; i < minLen; i++) {
    if (before[i] !== after[i]) changes++;
  }
  changes += (maxLen - minLen);

  return {
    editDistance: changes,
    editRatio: maxLen > 0 ? parseFloat((changes / maxLen).toFixed(4)) : 0,
  };
}

/**
 * 검수 결과를 edit_reason 문자열로 포맷
 */
export function formatReviewReason(reviewResults) {
  if (!reviewResults?.issues?.length) return null;

  const reds = reviewResults.issues
    .filter(i => i.severity === 'red' || i.severity === 'critical')
    .map(i => `🔴${i.category}: ${i.message}`);
  const yellows = reviewResults.issues
    .filter(i => i.severity === 'yellow')
    .map(i => `🟡${i.category}: ${i.message}`);

  return [...reds, ...yellows].join(' | ');
}

/**
 * autoFix 결과를 edit_pattern 문자열로 포맷
 */
export function formatFixPattern(fixes) {
  if (!fixes?.length) return null;
  return fixes.map(f => f.description).join(' | ');
}
