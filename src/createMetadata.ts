import { sourceCategories } from './sources.js';
// vvv Import RuleMetadata type vvv
import { RuleClassificationType, type RuleMetadata } from './RuleStore.js';
// ^^^ Import RuleMetadata type ^^^

// --- Helper Functions (for domain/selector extraction) ---
// You can copy these from the RuleProcessor class or refine them here

function cleanDomainPattern(originalRule: string): string | null {
    if (!originalRule || typeof originalRule !== 'string') return null;
    const trimmedRule = originalRule.trim();
    // Basic check: ignore scriptlet injections or rules starting with '$'
    if (trimmedRule.startsWith('$') || trimmedRule.includes('script:')) return null;
    try {
        // Remove AdGuard/uBO specific options starting with $
        const parts = trimmedRule.split('$', 1);
        let pattern = parts[0].replace(/^(@@)?(\|+)?/, ''); // Remove @@ or || prefixes
        if (pattern.endsWith('^')) pattern = pattern.slice(0, -1); // Remove trailing ^ separator
        pattern = pattern.trim();

        // Basic validation (very simplified) - avoid cosmetic selectors
        if (pattern.includes('#') || pattern.includes('(')) return null;

        return pattern || null; // Return pattern or null if empty
    } catch {
        return null; // Return null on error
    }
}

function extractSelector(originalRule: string): string | null {
     if (!originalRule || typeof originalRule !== 'string') return null;
     try {
         // Matches common cosmetic rule patterns (##, #@#, #?#, #$#)
         const match = originalRule.match(/(?:##|#@#|#\?#|#\$#|#\$\?#|#\.|\#\,)(.+)/);
         // Further split by $ if options exist, take only the selector part
         const selectorPart = match ? match[1].split('$', 1)[0].trim() : null;
         return selectorPart || null; // Return selector or null if empty/not found
     } catch {
         return null; // Return null on error
     }
}
// --- End Helper Functions ---


// --- Main Function ---

export function createRuleMetadata(
  source: string | string[],
  type: RuleClassificationType,
  rule: string
): RuleMetadata { // <<< Change return type here

  // vvv Change type annotation here vvv
  const metadata: RuleMetadata = {
    sources: Array.isArray(source) ? source : [source].filter(Boolean),
    dateAdded: new Date().toISOString(),
    // Initialize optional fields from RuleMetadata
    domain: undefined,
    selector: undefined,
    // Add other fields from RuleMetadata if they exist (e.g., name, version)
  };
  // ^^^ Change type annotation and fields ^^^

  // Add domain/selector based on type using helper functions
  if (type === 'blocking' || type === 'unblocking') {
      metadata.domain = cleanDomainPattern(rule) ?? undefined;
  } else if (type === 'cosmetic') {
      metadata.selector = extractSelector(rule) ?? undefined;
  }

  // --- REMOVED fields not in RuleMetadata ---
  // attribution: ...,
  // type: type, // Type is part of StoredRule, not RuleMetadata itself usually
  // lastUpdated: ...,
  // enabled: ...,
  // sourceInfo: { ... },
  // modifiers: ...,
  // comments: ...,
  // tags: [],
  // ---

  return metadata; // <<< Return the simpler RuleMetadata object
}


// --- Remove unused interfaces/helpers related to ExtendedRuleMetadata ---
// interface SourceInfo { ... }
// interface Modifier { ... }
// interface ExtendedRuleMetadata { ... }
// function getSourceCategory(...) { ... }
// function extractModifiers(...) { ... }
// function extractComments(...) { ... }
// ---
