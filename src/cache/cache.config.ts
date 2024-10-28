// src/cache/cache.config.ts
export default () => ({
    ttl: {
      session: parseInt(process.env.SESSION_TTL, 10) || 1800,
      featureAccess: parseInt(process.env.FEATURE_ACCESS_TTL, 10) || 3600,
      analytics: parseInt(process.env.ANALYTICS_TTL, 10) || 7200,
      bulkInsert: parseInt(process.env.CACHE_BULK_INSERT_TTL, 10) || 300,
      features: parseInt(process.env.FEATURES_TTL, 10) || 300,
      casbinPolicies: parseInt(process.env.CASBIN_POLICY_TTL, 10) || 600,
    },
  });
  