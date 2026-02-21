function splitRuleAndRegex(rule) {
  const value = String(rule || '').trim();
  if (!value) {
    return { mainRule: '', regexPairs: [] };
  }

  const parts = value.split('##');
  if (parts.length < 3) {
    return { mainRule: value, regexPairs: [] };
  }

  const mainRule = parts.shift().trim();
  const regexPairs = [];

  for (let i = 0; i < parts.length; i += 2) {
    const pattern = parts[i];
    const replacement = parts[i + 1] ?? '';
    if (!pattern) continue;
    regexPairs.push({ pattern, replacement });
  }

  return { mainRule, regexPairs };
}

function applyRegexPairs(input, regexPairs = []) {
  let result = input == null ? '' : String(input);

  for (const { pattern, replacement } of regexPairs) {
    try {
      const regexp = new RegExp(pattern, 'gms');
      result = result.replace(regexp, replacement);
    } catch (_) {
      // ignore invalid regex to keep flow robust
    }
  }

  return result;
}

function applyReplaceRegexSpec(input, replaceRegexSpec) {
  const content = input == null ? '' : String(input);
  if (!replaceRegexSpec) return content;

  const spec = String(replaceRegexSpec).trim();
  if (!spec) return content;

  let result = content;

  if (spec.includes('##')) {
    const segments = spec.split('##').filter((s) => s !== '');
    for (let i = 0; i < segments.length; i += 2) {
      const pattern = segments[i];
      const replacement = segments[i + 1] ?? '';
      if (!pattern) continue;
      try {
        result = result.replace(new RegExp(pattern, 'gms'), replacement);
      } catch (_) {
        // ignore
      }
    }
    return result;
  }

  const lines = spec.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    const arrow = line.indexOf('=>');
    if (arrow > -1) {
      const pattern = line.slice(0, arrow).trim();
      const replacement = line.slice(arrow + 2);
      if (!pattern) continue;
      try {
        result = result.replace(new RegExp(pattern, 'gms'), replacement);
      } catch (_) {
        // ignore
      }
    }
  }

  return result;
}

module.exports = {
  splitRuleAndRegex,
  applyRegexPairs,
  applyReplaceRegexSpec,
};
