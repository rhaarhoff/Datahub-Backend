CREATE OR REPLACE FUNCTION log_impersonation_start(
    impersonator_id INT,
    impersonated_id INT,
    tenant_id INT,
    ip_address TEXT,
    user_agent TEXT
) RETURNS VOID AS $$
BEGIN
    INSERT INTO "AuditLog"(
        action,
        impersonatorId,
        impersonatedId,
        tenantId,
        ipAddress,
        userAgent,
        timestamp
    ) VALUES (
        'IMPERSONATION_START',
        impersonator_id,
        impersonated_id,
        tenant_id,
        ip_address,
        user_agent,
        NOW()
    );
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION log_feature_access(
    user_id INT,
    tenant_id INT,
    feature_id INT,
    ip_address TEXT,
    user_agent TEXT
) RETURNS VOID AS $$
BEGIN
    INSERT INTO "AuditLog"(
        action,
        userId,
        tenantId,
        ipAddress,
        userAgent,
        timestamp
    ) VALUES (
        'FEATURE_ACCESS',
        user_id,
        tenant_id,
        ip_address,
        user_agent,
        NOW()
    );
END;
$$ LANGUAGE plpgsql;


CREATE TRIGGER trigger_log_impersonation_start
AFTER INSERT ON "UserImpersonationTable"  -- Replace with the actual table tracking impersonation
FOR EACH ROW
EXECUTE FUNCTION log_impersonation_start(
    NEW.impersonatorId,
    NEW.impersonatedId,
    NEW.tenantId,
    NEW.ipAddress,
    NEW.userAgent
);

CREATE OR REPLACE FUNCTION log_user_update()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO "AuditLog"(
        action,
        userId,
        tenantId,
        ipAddress,
        userAgent,
        timestamp
    ) VALUES (
        'USER_UPDATED',
        NEW.id,
        NEW.tenantId,
        current_setting('app.current_ip_address'),  -- Assume IP address is stored as a session variable
        current_setting('app.current_user_agent'),  -- Assume user agent is stored as a session variable
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_update_trigger
AFTER UPDATE ON "User"
FOR EACH ROW
EXECUTE FUNCTION log_user_update();


CREATE OR REPLACE FUNCTION log_user_login(
    user_id INT,
    tenant_id INT,
    ip_address TEXT,
    user_agent TEXT
) RETURNS VOID AS $$
BEGIN
    INSERT INTO "AuditLog"(
        action,
        userId,
        tenantId,
        ipAddress,
        userAgent,
        timestamp
    ) VALUES (
        'LOGIN',
        user_id,
        tenant_id,
        ip_address,
        user_agent,
        NOW()
    );
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION log_user_logout(
    user_id INT,
    tenant_id INT,
    ip_address TEXT,
    user_agent TEXT
) RETURNS VOID AS $$
BEGIN
    INSERT INTO "AuditLog"(
        action,
        userId,
        tenantId,
        ipAddress,
        userAgent,
        timestamp
    ) VALUES (
        'LOGOUT',
        user_id,
        tenant_id,
        ip_address,
        user_agent,
        NOW()
    );
END;
$$ LANGUAGE plpgsql;


