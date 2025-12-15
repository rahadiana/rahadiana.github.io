// ES module wrapper for AnalyticsCore
// This wrapper ensures the existing non-module `analytics-core.js` remains functional
// while exposing a proper module import for new consumers. It uses top-level await
// to load the legacy script (which attaches to globalThis) and then re-exports
// the resolved `AnalyticsCore` object.

// Load the native ES module implementation and attach to global for legacy consumers
import AnalyticsCoreDefault from './analytics-core.module.mjs';

if (!globalThis.AnalyticsCore) {
  globalThis.AnalyticsCore = AnalyticsCoreDefault;
}

export default globalThis.AnalyticsCore;
export const AnalyticsCore = globalThis.AnalyticsCore;
