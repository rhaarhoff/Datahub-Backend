

-- Enable RLS on the Tenant table
ALTER TABLE "Tenant" ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for the Tenant table
CREATE POLICY tenant_policy
  ON "Tenant"
  FOR SELECT
  USING ("id" = current_setting('app.current_tenant_id')::int);


-- Enable RLS on the UserTenant table
ALTER TABLE "UserTenant" ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for the UserTenant table
CREATE POLICY user_tenant_policy
  ON "UserTenant"
  FOR SELECT
  USING ("tenantId" = current_setting('app.current_tenant_id')::int
         AND "userId" = current_setting('app.current_user_id')::int);


-- Enable RLS on the UserRole table
ALTER TABLE "UserRole" ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for the UserRole table
CREATE POLICY user_role_policy
  ON "UserRole"
  FOR SELECT
  USING ("tenantId" = current_setting('app.current_tenant_id')::int
         AND "userId" = current_setting('app.current_user_id')::int);

-- Enable RLS on the TenantFeature table
ALTER TABLE "TenantFeature" ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for the TenantFeature table
CREATE POLICY tenant_feature_policy
  ON "TenantFeature"
  FOR SELECT
  USING ("tenantId" = current_setting('app.current_tenant_id')::int);


-- Enable RLS on the FeatureAccess table
ALTER TABLE "FeatureAccess" ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for the FeatureAccess table
CREATE POLICY tenant_feature_access
  ON "FeatureAccess"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM "UserRole" ur
      JOIN "TenantFeature" tf ON ur."tenantId" = tf."tenantId"
      WHERE
        ur."userId" = current_setting('app.current_user_id')::int
        AND ur."roleId" = "FeatureAccess"."userRoleId"
        AND tf."featureId" = "FeatureAccess"."featureId"
        AND "FeatureAccess"."hasAccess" = true
    )
  );

-- Enable RLS on the AuditLog table
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for the AuditLog table
CREATE POLICY audit_log_policy
  ON "AuditLog"
  FOR SELECT
  USING (
    "tenantId" = current_setting('app.current_tenant_id')::int
    OR current_setting('app.current_role') = 'SUPERADMIN'
  );


-- Enable RLS on the SubscriptionPlan table
ALTER TABLE "SubscriptionPlan" ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for the SubscriptionPlan table
CREATE POLICY subscription_plan_policy
  ON "SubscriptionPlan"
  FOR SELECT
  USING (
    "id" IN (SELECT "subscriptionPlanId" FROM "Tenant"
             WHERE "id" = current_setting('app.current_tenant_id')::int)
  );


CREATE POLICY user_role_update_policy
  ON "UserRole"
  FOR UPDATE
  USING ("tenantId" = current_setting('app.current_tenant_id')::int
         AND "userId" = current_setting('app.current_user_id')::int);

CREATE POLICY tenant_feature_insert_policy
  ON "TenantFeature"
  FOR INSERT
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id')::int);


