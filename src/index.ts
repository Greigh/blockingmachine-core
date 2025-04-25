// Export necessary functions/modules from the core package

export { fetchContent } from './fetch.js';
export { RuleDeduplicator } from './RuleDuplicator.js';
export { parseFilterList, downloadAndParseSource, RuleProcessor } from './RuleProcessor.js'; // Added downloadAndParseSource here
export { RuleStore, type StoredRule, type RuleMetadata, type RuleStats } from './RuleStore.js'; // Export RuleStore and its types
export { createRuleMetadata } from './createMetadata.js';
export { sourceCategories } from './sources.js';

// Add any other exports needed by other packages