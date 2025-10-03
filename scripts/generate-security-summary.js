#!/usr/bin/env node
/**
 * Usage: node scripts/generate-security-summary.js reports/security/npm-audit.json
 * Outputs a markdown summary to stdout.
 */
const fs = require("fs");

const file = process.argv[2] || "reports/security/npm-audit.json";
let json;
try {
  json = JSON.parse(fs.readFileSync(file, "utf8"));
} catch (e) {
  console.log(`# Security Summary
No audit report found at ${file}.`);
  process.exit(0);
}

const advisories = json.vulnerabilities || json.advisories || {}; // npm v9 vs v10 shapes
let counts = { critical: 0, high: 0, moderate: 0, low: 0 };

let items = [];
if (json.vulnerabilities) {
  // npm v10 format
  for (const [name, v] of Object.entries(json.vulnerabilities)) {
    const severity = v.severity || "unknown";
    if (counts[severity] !== undefined)
      counts[severity] += v.via?.length ? v.via.length : 1;
    items.push({
      module: name,
      severity,
      via:
        v.via
          ?.map((x) => (typeof x === "string" ? x : x.title))
          .filter(Boolean) || [],
      fixAvailable: v.fixAvailable
        ? typeof v.fixAvailable === "object"
          ? v.fixAvailable.name
          : true
        : false,
    });
  }
} else if (json.advisories) {
  // npm v7/8/9 format
  for (const adv of Object.values(json.advisories)) {
    counts[adv.severity] = (counts[adv.severity] || 0) + 1;
    items.push({
      module: adv.module_name,
      severity: adv.severity,
      via: [adv.title],
      fixAvailable: !!adv.fix_available,
    });
  }
}

const total = Object.values(counts).reduce((a, b) => a + b, 0);
console.log(`# Security Summary

**Total vulnerabilities:** ${total}
- Critical: **${counts.critical}**
- High: **${counts.high}**
- Moderate: ${counts.moderate}
- Low: ${counts.low}

## Top findings
${
  items
    .slice(0, 5)
    .map(
      (it) => `- **${it.severity.toUpperCase()}** in \`${it.module}\` ${
        it.fixAvailable ? "(fix available)" : "(no direct fix)"
      }  
  What: ${it.via[0] || "See audit JSON"}  
  Suggested action: ${
    it.fixAvailable
      ? "Update dependency"
      : "Consider pinning/patching or replacing package"
  }`
    )
    .join("\n") || "- None"
}

## How issues were addressed
- If **fix available** → we will update the impacted package (e.g. \`npm update <name>\` or bump in package.json).
- If **no direct fix** → we’ll evaluate replacing the dependency, pinning safe versions, or suppressing false positives with justification.

(See full report: \`reports/security/npm-audit.json\`)
`);
