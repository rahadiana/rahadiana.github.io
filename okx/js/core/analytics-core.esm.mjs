// ESM wrapper re-exporting the native module implementation
import AnalyticsCoreDefault, * as Named from './analytics-core.module.mjs';

export default AnalyticsCoreDefault;
export const AnalyticsCore = AnalyticsCoreDefault;

// Re-export named utilities and primary functions
export const computeAllSmartMetrics = Named.computeAllSmartMetrics?.bind(AnalyticsCore) || AnalyticsCoreDefault.computeAllSmartMetrics?.bind(AnalyticsCore);
export const computeKyleLambda = Named.computeKyleLambda?.bind(AnalyticsCore) || AnalyticsCoreDefault.computeKyleLambda?.bind(AnalyticsCore);
export const computeVWAPBands = Named.computeVWAPBands?.bind(AnalyticsCore) || AnalyticsCoreDefault.computeVWAPBands?.bind(AnalyticsCore);
export const computeCVD = Named.computeCVD?.bind(AnalyticsCore) || AnalyticsCoreDefault.computeCVD?.bind(AnalyticsCore);
export const computeRVOL = Named.computeRVOL?.bind(AnalyticsCore) || AnalyticsCoreDefault.computeRVOL?.bind(AnalyticsCore);
export const normalizeKyleLambda = Named.normalizeKyleLambda?.bind(AnalyticsCore) || AnalyticsCoreDefault.normalizeKyleLambda?.bind(AnalyticsCore);
export const normalizeVWAP = Named.normalizeVWAP?.bind(AnalyticsCore) || AnalyticsCoreDefault.normalizeVWAP?.bind(AnalyticsCore);
export const normalizeCVD = Named.normalizeCVD?.bind(AnalyticsCore) || AnalyticsCoreDefault.normalizeCVD?.bind(AnalyticsCore);
export const normalizeRVOL = Named.normalizeRVOL?.bind(AnalyticsCore) || AnalyticsCoreDefault.normalizeRVOL?.bind(AnalyticsCore);
export const computeTier1Normalized = Named.computeTier1Normalized?.bind(AnalyticsCore) || AnalyticsCoreDefault.computeTier1Normalized?.bind(AnalyticsCore);
export const computeVPIN = Named.computeVPIN?.bind(AnalyticsCore) || AnalyticsCoreDefault.computeVPIN?.bind(AnalyticsCore);
export const computeHurstExponent = Named.computeHurstExponent?.bind(AnalyticsCore) || AnalyticsCoreDefault.computeHurstExponent?.bind(AnalyticsCore);
export const computeVolumeProfilePOC = Named.computeVolumeProfilePOC?.bind(AnalyticsCore) || AnalyticsCoreDefault.computeVolumeProfilePOC?.bind(AnalyticsCore);
export const computeDepthImbalance = Named.computeDepthImbalance?.bind(AnalyticsCore) || AnalyticsCoreDefault.computeDepthImbalance?.bind(AnalyticsCore);
export const calculateVolDurability = Named.calculateVolDurability?.bind(AnalyticsCore) || AnalyticsCoreDefault.calculateVolDurability?.bind(AnalyticsCore);
export const calculateVolRatio = Named.calculateVolRatio?.bind(AnalyticsCore) || AnalyticsCoreDefault.calculateVolRatio?.bind(AnalyticsCore);
export const safeDiv = Named.safeDiv || AnalyticsCoreDefault.safeDiv;
export const toNum = Named.toNum || AnalyticsCoreDefault.toNum;
