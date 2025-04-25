import { StoredRule, RuleMetadata } from './RuleStore.js'; // Import necessary types

// --- Interfaces/Types ---

interface DeduplicatorStats {
  total: number;
  duplicates: number;
  merged: number;
  conflicts: number;
  skipped: number;
  uniqueRules?: number; // Added for final stats
  duplicateGroups?: number; // Added for final stats
  duplicatePercent?: string; // Added for final stats
}

// Define a type for the merged metadata, potentially extending RuleMetadata
interface MergedRuleMetadata extends RuleMetadata {
  alternatives?: string[]; // Add the alternatives property
}

export class RuleDeduplicator {
  // --- Properties with Types ---
  // private issues: Map<string, any>; // Seems unused, consider removing if not needed
  private filteredRules: Map<string, StoredRule>;
  private stats: DeduplicatorStats;

  constructor() {
    // this.issues = new Map(); // Remove if unused
    this.filteredRules = new Map();
    this.stats = {
      total: 0,
      duplicates: 0,
      merged: 0,
      conflicts: 0,
      skipped: 0,
    };
  }

  /**
   * Normalizes a rule string into a canonical key for deduplication.
   * @param rule The original rule string.
   * @returns A normalized string key, or an empty string if the rule is invalid/empty.
   */
  stripRule(rule: string | null | undefined): string { // Add parameter type and return type
    if (!rule) return '';
    try {
      const originalRule = rule; // Keep original for reference
      let stripped = rule;
      const isException = stripped.startsWith('@@');
      if (isException) {
        stripped = stripped.slice(2);
      }

      // 1. Extract and Normalize Key Modifiers/Selectors
      const parts = {
        domain: (stripped.match(/\$domain=([^,$/]+)/)?.[1] || '')
          .toLowerCase()
          .trim(),
        // Ensure modifiers are handled correctly even if no '$' is present
        modifiers: (stripped.match(/\$([^#]*?)(?:##|#\?#|#@#|$)/)?.[1] || '')
          .split(',')
          .map((m) => m.split('=')[0].toLowerCase().trim())
          .filter((m) => m && m !== 'domain') // Ensure 'domain' modifier itself isn't included here
          .sort()
          .join(','),
        selector: (stripped.match(/(?:##|#@#)(.+)/)?.[1] || '')
          .toLowerCase()
          .replace(/\s+/g, ' ')
          .trim(),
        extendedSelector: (stripped.match(/#\?#(.+)/)?.[1] || '')
          .toLowerCase()
          .replace(/\s+/g, ' ')
          .trim(),
      };

      // 2. Remove all modifiers, selectors, options from the core rule string
      stripped = stripped
        .replace(/\$.*$/, '') // Remove modifiers section
        .replace(/(?:##|#@#|#\?#).*$/, '') // Remove cosmetic/extended selectors
        .replace(/!\s*.*$/, ''); // Remove comments

      // 3. Refined Normalization of the Core Target String
      stripped = stripped
        .replace(/^(?:https?:\/\/)?(?:www\.)?/, '') // Remove http/https, www.
        .replace(/[?#].*$/, '') // Remove Query String and Anchor
        .replace(/[\^/]+$/, '') // Remove one or MORE trailing ^ or /
        .replace(/\.+$/, '') // Remove trailing dots
        .toLowerCase() // Lowercase the result
        .trim(); // Final trim

      // Handle cases where stripping leaves nothing
      if (
        !stripped &&
        (parts.modifiers || parts.selector || parts.extendedSelector)
      ) {
        stripped = 'modifier_or_selector_rule'; // Use a placeholder key
      } else if (!stripped) {
        // console.warn(`[stripRule] Stripping resulted in empty key for: ${originalRule}`);
        return ''; // Return empty string if truly empty after stripping
      }

      // 4. Build the Normalized Key
      const components = [
        stripped,
        parts.domain && `domain=${parts.domain}`,
        parts.modifiers && `mods=${parts.modifiers}`, // Keep mods= prefix for clarity
        parts.selector && `sel=${parts.selector}`,
        parts.extendedSelector && `extsel=${parts.extendedSelector}`,
      ].filter(Boolean); // Filter out empty strings

      let normalized = components.join('|');
      if (isException) normalized = '@@' + normalized;

      return normalized;
    } catch (error: any) { // Add type to error
      console.warn(`Failed to strip rule: ${rule}`, error.message);
      return rule; // Return original rule on error as a fallback key? Or empty string? Returning original might group errors.
    }
  }

  /**
   * Processes an array of StoredRule objects, deduplicates them, and merges metadata.
   * @param rules An array of StoredRule objects.
   * @returns A Promise resolving to an array of unique StoredRule objects with merged metadata.
   */
  async processRules(rules: StoredRule[]): Promise<StoredRule[]> { // Add parameter type and return type
    if (!Array.isArray(rules) || rules.length === 0) {
      console.warn('No rules to process');
      return [];
    }

    // Use StoredRule[] for the group value type
    const ruleGroups = new Map<string, StoredRule[]>();
    this.stats.total = rules.length;

    console.log(`\nProcessing ${rules.length} rules for deduplication...`);

    // First pass - group rules
    console.log('Starting rule grouping...');
    let processedCount = 0;
    for (const rule of rules) {
      processedCount++;
      try {
        // Check if rule and originalRule are valid
        if (!rule?.originalRule || typeof rule.originalRule !== 'string') {
          this.stats.skipped++;
          continue;
        }

        const stripped = this.stripRule(rule.originalRule);

        // Log periodically
        // if (processedCount % 5000 === 0) {
        //   console.log(`[${processedCount}/${rules.length}] Rule: ${rule.originalRule} -> Key: ${stripped}`);
        // }

        if (!stripped) {
          this.stats.skipped++;
          continue;
        }

        // Grouping logic
        const group = ruleGroups.get(stripped);
        if (group) {
          group.push(rule);
        } else {
          ruleGroups.set(stripped, [rule]);
        }
      } catch (error: any) { // Add type to error
        console.warn(
          'Failed to process rule:',
          rule?.originalRule || 'undefined',
          error.message
        );
        this.stats.skipped++;
      }
    }
    console.log(`Finished grouping ${processedCount} rules into ${ruleGroups.size} groups.`);

    // Second pass - identify and process duplicates
    this.filteredRules.clear(); // Ensure map is empty before filling
    for (const [stripped, group] of ruleGroups.entries()) { // Use entries() for clarity
      try {
        if (group.length > 1) {
          this.stats.duplicates += group.length - 1;
          const bestRule = this.selectBestRule(group);
          // Ensure metadata exists before merging, provide default if not
          bestRule.metadata = this.mergeMetadata(group, bestRule);
          this.filteredRules.set(stripped, bestRule);
          this.stats.merged++;
        } else if (group.length === 1) { // Handle single rule group explicitly
          this.filteredRules.set(stripped, group[0]);
        }
        // If group is somehow empty (shouldn't happen with above logic), do nothing
      } catch (error: any) { // Add type to error
        console.warn('Failed to process rule group:', stripped, error.message);
        this.stats.conflicts++;
        // Keep the first rule as fallback if group exists
        if (group && group.length > 0) {
            this.filteredRules.set(stripped, group[0]);
        }
      }
    }

    // Calculate final stats
    const finalStats: DeduplicatorStats = {
      ...this.stats,
      uniqueRules: this.filteredRules.size,
      duplicateGroups: ruleGroups.size - this.filteredRules.size, // Groups that had > 1 rule
      duplicatePercent: this.stats.total > 0
          ? ((this.stats.duplicates / this.stats.total) * 100).toFixed(2) + '%'
          : '0.00%',
    };
    this.stats = finalStats; // Update internal stats

    console.log('\nDeduplication complete!');
    console.table(finalStats); // Use console.table for better output

    return Array.from(this.filteredRules.values());
  }

  // generateHash seems unused, consider removing if not needed
  // generateHash(str: string): string { ... }

  /**
   * Selects the "best" rule from a group of duplicates based on a scoring system.
   * @param rules An array of StoredRule objects that are duplicates.
   * @returns The selected best StoredRule.
   */
  selectBestRule(rules: StoredRule[]): StoredRule { // Add parameter type and return type
    // Filter out potentially null/undefined rules first
    const validRules = rules.filter(r => r && r.originalRule);
    if (validRules.length === 0) {
        // Should not happen if grouping is correct, but handle defensively
        throw new Error("Cannot select best rule from empty or invalid group.");
    }
    if (validRules.length === 1) {
        return validRules[0];
    }

    return validRules.reduce((best, current) => {
      const currentScore = this.getRuleScore(current);
      const bestScore = this.getRuleScore(best);

      // Tie-breaking: prefer shorter original rule? Or rule from primary source?
      if (currentScore === bestScore) {
          // Example: Prefer shorter rule
          return (current.originalRule.length < best.originalRule.length) ? current : best;
      }

      return (currentScore > bestScore) ? current : best;
    }); // No need for initial value if we ensure validRules is not empty
  }

  /**
   * Merges metadata from a group of duplicate rules into the best rule's metadata.
   * @param group The array of duplicate StoredRule objects.
   * @param bestRule The StoredRule selected as the best.
   * @returns The merged RuleMetadata object.
   */
  mergeMetadata(group: StoredRule[], bestRule: StoredRule): MergedRuleMetadata { // Add parameter types and return type
    try {
      // Start with a copy of the best rule's metadata or an empty object
      const merged: MergedRuleMetadata = { ...(bestRule.metadata || {}) };

      // Combine sources
      const sources = new Set<string>(merged.sources || []); // Use Set<string>
      group.forEach((rule) => {
        // Ensure rule and metadata exist
        if (rule?.metadata?.sources) {
          rule.metadata.sources.forEach((source) => {
              if (typeof source === 'string') sources.add(source); // Ensure source is string
          });
        }
      });
      merged.sources = Array.from(sources);

      // Merge dates - keep earliest valid date
      const dates = group
        .map((rule) => rule?.metadata?.dateAdded) // Safely access dateAdded
        .filter((date): date is string => typeof date === 'string' && !isNaN(Date.parse(date))) // Ensure it's a valid date string
        .sort();
      if (dates.length > 0) {
        merged.dateAdded = dates[0];
      } else if (!merged.dateAdded) {
          // If no valid dates found and bestRule didn't have one, set a default
          merged.dateAdded = new Date().toISOString();
      }

      // Combine modifiers (assuming metadata.modifiers is array of strings for now)
      // If it's Modifier objects, merging needs different logic (e.g., based on type)
      const modifiers = new Set<string>(merged.modifiers || []); // Use Set<string>
      group.forEach((rule) => {
        if (rule?.metadata?.modifiers) {
          // Assuming modifiers is string[] based on getRuleScore logic
          rule.metadata.modifiers.forEach((mod: any) => { // Use any temporarily if type is uncertain
              if (typeof mod === 'string') modifiers.add(mod);
          });
        }
      });
      merged.modifiers = Array.from(modifiers);

      // Keep track of original rules (alternatives)
      merged.alternatives = group
        .filter((r) => r !== bestRule && r?.originalRule) // Ensure rule and originalRule exist
        .map((r) => r.originalRule); // Map guaranteed existing originalRule

      // Ensure essential fields exist if missing from bestRule's initial metadata
      if (!merged.lastUpdated) merged.lastUpdated = new Date().toISOString();
      // Add other defaults if necessary

      return merged;
    } catch (error: any) { // Add type to error
      console.warn('Failed to merge metadata:', error.message);
      // Return bestRule's metadata or a basic default on error
      return { ...(bestRule.metadata || {}), sources: bestRule.metadata?.sources || [] };
    }
  }

  /**
   * Calculates a score for a rule to help select the best among duplicates.
   * @param rule The StoredRule object to score.
   * @returns A numerical score.
   */
  getRuleScore(rule: StoredRule | null | undefined): number { // Add parameter type and return type
    let score = 0;
    if (!rule?.metadata || !rule.originalRule) return score; // Check originalRule too
    const originalRuleLower = rule.originalRule.toLowerCase(); // Safe now

    // Base scores
    if (rule.metadata.sources?.length) score += rule.metadata.sources.length * 2;
    // Assuming modifiers is string[] for scoring based on mergeMetadata logic
    if (Array.isArray(rule.metadata.modifiers) && rule.metadata.modifiers.length > 0) {
        score += rule.metadata.modifiers.length * 2;
    }
    if (rule.metadata.dateAdded) score += 5; // Consider date validity?

    // Bonus scores
    if (originalRuleLower.includes('$important')) score += 10;
    // Access sourceInfo safely
    if (rule.metadata.sourceInfo?.trusted) score += 15;
    // Access attribution safely
    if (rule.metadata.attribution?.toLowerCase().includes('daniel hipskind')) score += 20; // Lowercase for comparison

    // Domain-specific rules
    if (originalRuleLower.includes('$domain=')) score += 8;

    // Exact matches (needs refinement - what defines "exact"?)
    // This check is very basic, might need adjustment based on `stripRule` logic
    const corePart = rule.originalRule.split('$')[0].split('#')[0].trim();
    if (!/[*^|]/.test(corePart)) score += 5;

    return score;
  }
}
