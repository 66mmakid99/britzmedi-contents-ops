// =====================================================
// Section parsing / assembly utilities
// Extracted from Create.jsx for testability
// =====================================================

/**
 * Parse raw AI output into [{ label, text }] sections.
 */
export function parseSections(raw) {
  if (!raw) return [];
  const regex = /\[([^\]]+)\]/g;
  const sections = [];
  let lastIdx = 0;
  let lastLabel = null;
  let match;
  while ((match = regex.exec(raw)) !== null) {
    if (lastLabel !== null) {
      sections.push({ label: lastLabel, text: raw.slice(lastIdx, match.index).trim() });
    }
    lastLabel = match[1];
    lastIdx = match.index + match[0].length;
  }
  if (lastLabel !== null) {
    sections.push({ label: lastLabel, text: raw.slice(lastIdx).trim() });
  }
  if (sections.length === 0 && raw.trim()) {
    sections.push({ label: '전체', text: raw.trim() });
  }
  return sections;
}

/**
 * Assemble sections back to raw text WITH labels.
 */
export function assembleSections(sections) {
  return sections.map((s) => `[${s.label}]\n${s.text}`).join('\n\n');
}

/**
 * Assemble sections as plain text WITHOUT labels.
 * Used for clipboard copy (라벨 제외).
 */
export function assembleTextOnly(sections) {
  return sections.map((s) => s.text).join('\n\n');
}
