// Add this explicit export for FilterMetaConfig
export type { FilterMetaConfig } from './config/meta.js';

// Make sure other exports are also included
export { defaultFilterMeta } from './config/meta.js';
export { createPaths } from './config/paths.js';
export { defaultPerformance } from './config/performance.js';
export { exportWithOptions } from './export/index.js';
export { RuleType, RuleModifier, RuleMetadata } from './RuleStore.js';
export { FilterFormat, generateFilterList } from './export/advanced-formatter.js';
export { RuleDeduplicator } from './RuleDeduplicator.js';
export { downloadAndParseSource, parseFilterList } from './RuleProcessor.js';
export { RuleStore } from './RuleStore.js';

// Other type exports
export type { ExportOptions, FilterListMetadata, SupportedFormat } from './types.js';

// Other existing exports
export * from './RuleStore.js';
export * from './RuleProcessor.js';
export * from './cli-exports.js';
export * from './export/advanced-formatter.js';
export * from './export/formatters.js';

