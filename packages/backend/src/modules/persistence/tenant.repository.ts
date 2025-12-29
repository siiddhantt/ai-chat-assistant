import { getDb } from "../../config/database.js";
import {
  AuthProvider,
  Customer,
  Tenant,
  User,
  UserRole,
} from "../../types/index.js";

export class UserRepository {
  async findById(id: string): Promise<User | null> {
    const db = getDb();
    const result = await db`
      SELECT 
        id, email, phone, password_hash as "passwordHash", name, role,
        auth_provider as "authProvider", auth_provider_id as "authProviderId",
        fingerprint_id as "fingerprintId", email_verified as "emailVerified",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM users WHERE id = ${id}
    `;
    return result[0] ? this.mapRowToUser(result[0]) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const db = getDb();
    const result = await db`
      SELECT 
        id, email, phone, password_hash as "passwordHash", name, role,
        auth_provider as "authProvider", auth_provider_id as "authProviderId",
        fingerprint_id as "fingerprintId", email_verified as "emailVerified",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM users WHERE email = ${email.toLowerCase()}
    `;
    return result[0] ? this.mapRowToUser(result[0]) : null;
  }

  async findByFingerprint(fingerprintId: string): Promise<User | null> {
    const db = getDb();
    const result = await db`
      SELECT 
        id, email, phone, password_hash as "passwordHash", name, role,
        auth_provider as "authProvider", auth_provider_id as "authProviderId",
        fingerprint_id as "fingerprintId", email_verified as "emailVerified",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM users WHERE fingerprint_id = ${fingerprintId}
    `;
    return result[0] ? this.mapRowToUser(result[0]) : null;
  }

  async findByAuthProvider(
    provider: AuthProvider,
    providerId: string
  ): Promise<User | null> {
    const db = getDb();
    const result = await db`
      SELECT 
        id, email, phone, password_hash as "passwordHash", name, role,
        auth_provider as "authProvider", auth_provider_id as "authProviderId",
        fingerprint_id as "fingerprintId", email_verified as "emailVerified",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM users WHERE auth_provider = ${provider} AND auth_provider_id = ${providerId}
    `;
    return result[0] ? this.mapRowToUser(result[0]) : null;
  }

  async create(data: {
    email?: string;
    phone?: string;
    passwordHash?: string;
    name?: string;
    role: UserRole;
    authProvider: AuthProvider;
    authProviderId?: string;
    fingerprintId?: string;
    emailVerified?: boolean;
  }): Promise<User> {
    const db = getDb();
    const result = await db`
      INSERT INTO users (
        email, phone, password_hash, name, role, 
        auth_provider, auth_provider_id, fingerprint_id, email_verified
      ) VALUES (
        ${data.email?.toLowerCase() ?? null}, 
        ${data.phone ?? null},
        ${data.passwordHash ?? null}, 
        ${data.name ?? null}, 
        ${data.role},
        ${data.authProvider}, 
        ${data.authProviderId ?? null}, 
        ${data.fingerprintId ?? null},
        ${data.emailVerified ?? false}
      )
      RETURNING 
        id, email, phone, password_hash as "passwordHash", name, role,
        auth_provider as "authProvider", auth_provider_id as "authProviderId",
        fingerprint_id as "fingerprintId", email_verified as "emailVerified",
        created_at as "createdAt", updated_at as "updatedAt"
    `;
    return this.mapRowToUser(result[0]);
  }

  async upgradeAnonymousUser(
    userId: string,
    data: {
      email?: string;
      phone?: string;
      passwordHash?: string;
      name?: string;
      authProvider: AuthProvider;
      authProviderId?: string;
    }
  ): Promise<User | null> {
    const db = getDb();
    const result = await db`
      UPDATE users SET
        email = COALESCE(${data.email?.toLowerCase() ?? null}, email),
        phone = COALESCE(${data.phone ?? null}, phone),
        password_hash = COALESCE(${data.passwordHash ?? null}, password_hash),
        name = COALESCE(${data.name ?? null}, name),
        auth_provider = ${data.authProvider},
        auth_provider_id = ${data.authProviderId ?? null},
        email_verified = ${data.email ? false : true},
        updated_at = NOW()
      WHERE id = ${userId}
      RETURNING 
        id, email, phone, password_hash as "passwordHash", name, role,
        auth_provider as "authProvider", auth_provider_id as "authProviderId",
        fingerprint_id as "fingerprintId", email_verified as "emailVerified",
        created_at as "createdAt", updated_at as "updatedAt"
    `;
    return result[0] ? this.mapRowToUser(result[0]) : null;
  }

  async update(
    id: string,
    data: Partial<Pick<User, "email" | "name" | "emailVerified">>
  ): Promise<User | null> {
    const db = getDb();
    const result = await db`
      UPDATE users SET
        email = COALESCE(${data.email?.toLowerCase() ?? null}, email),
        name = COALESCE(${data.name ?? null}, name),
        email_verified = COALESCE(${
          data.emailVerified ?? null
        }, email_verified),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING 
        id, email, phone, password_hash as "passwordHash", name, role,
        auth_provider as "authProvider", auth_provider_id as "authProviderId",
        fingerprint_id as "fingerprintId", email_verified as "emailVerified",
        created_at as "createdAt", updated_at as "updatedAt"
    `;
    return result[0] ? this.mapRowToUser(result[0]) : null;
  }

  private mapRowToUser(row: Record<string, unknown>): User {
    return {
      id: row.id as string,
      email: row.email as string | undefined,
      phone: row.phone as string | undefined,
      passwordHash: row.passwordHash as string | undefined,
      name: row.name as string | undefined,
      role: row.role as UserRole,
      authProvider: row.authProvider as AuthProvider,
      authProviderId: row.authProviderId as string | undefined,
      fingerprintId: row.fingerprintId as string | undefined,
      emailVerified: row.emailVerified as boolean,
      createdAt: new Date(row.createdAt as string).toISOString(),
      updatedAt: new Date(row.updatedAt as string).toISOString(),
    };
  }
}

export class TenantRepository {
  async findById(id: string): Promise<Tenant | null> {
    const db = getDb();
    const result = await db`
      SELECT id, slug, name, owner_id as "ownerId", settings,
        created_at as "createdAt", updated_at as "updatedAt"
      FROM tenants WHERE id = ${id}
    `;
    return result[0] ? this.mapRowToTenant(result[0]) : null;
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    const db = getDb();
    const result = await db`
      SELECT id, slug, name, owner_id as "ownerId", settings,
        created_at as "createdAt", updated_at as "updatedAt"
      FROM tenants WHERE slug = ${slug.toLowerCase()}
    `;
    return result[0] ? this.mapRowToTenant(result[0]) : null;
  }

  async findByOwnerId(ownerId: string): Promise<Tenant | null> {
    const db = getDb();
    const result = await db`
      SELECT id, slug, name, owner_id as "ownerId", settings,
        created_at as "createdAt", updated_at as "updatedAt"
      FROM tenants WHERE owner_id = ${ownerId}
    `;
    return result[0] ? this.mapRowToTenant(result[0]) : null;
  }

  async create(data: {
    slug: string;
    name: string;
    ownerId: string;
    settings?: Record<string, unknown>;
  }): Promise<Tenant> {
    const db = getDb();
    const result = await db`
      INSERT INTO tenants (slug, name, owner_id, settings)
      VALUES (${data.slug.toLowerCase()}, ${data.name}, ${
      data.ownerId
    }, ${JSON.stringify(data.settings || {})})
      RETURNING id, slug, name, owner_id as "ownerId", settings,
        created_at as "createdAt", updated_at as "updatedAt"
    `;
    return this.mapRowToTenant(result[0]);
  }

  async update(
    id: string,
    data: Partial<Pick<Tenant, "name" | "settings">>
  ): Promise<Tenant | null> {
    const db = getDb();
    const result = await db`
      UPDATE tenants SET
        name = COALESCE(${data.name ?? null}, name),
        settings = COALESCE(${
          data.settings ? JSON.stringify(data.settings) : null
        }::jsonb, settings),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, slug, name, owner_id as "ownerId", settings,
        created_at as "createdAt", updated_at as "updatedAt"
    `;
    return result[0] ? this.mapRowToTenant(result[0]) : null;
  }

  private mapRowToTenant(row: Record<string, unknown>): Tenant {
    return {
      id: row.id as string,
      slug: row.slug as string,
      name: row.name as string,
      ownerId: row.ownerId as string,
      settings: (row.settings || {}) as Tenant["settings"],
      createdAt: new Date(row.createdAt as string).toISOString(),
      updatedAt: new Date(row.updatedAt as string).toISOString(),
    };
  }
}

export class CustomerRepository {
  async findById(id: string): Promise<Customer | null> {
    const db = getDb();
    const result = await db`
      SELECT id, tenant_id as "tenantId", visitor_id as "visitorId", user_id as "userId",
        email, name, metadata, created_at as "createdAt", updated_at as "updatedAt"
      FROM customers WHERE id = ${id}
    `;
    return result[0] ? this.mapRowToCustomer(result[0]) : null;
  }

  async findByVisitorId(
    tenantId: string,
    visitorId: string
  ): Promise<Customer | null> {
    const db = getDb();
    const result = await db`
      SELECT id, tenant_id as "tenantId", visitor_id as "visitorId", user_id as "userId",
        email, name, metadata, created_at as "createdAt", updated_at as "updatedAt"
      FROM customers WHERE tenant_id = ${tenantId} AND visitor_id = ${visitorId}
    `;
    return result[0] ? this.mapRowToCustomer(result[0]) : null;
  }

  async findByUserId(userId: string): Promise<Customer[]> {
    const db = getDb();
    const result = await db`
      SELECT id, tenant_id as "tenantId", visitor_id as "visitorId", user_id as "userId",
        email, name, metadata, created_at as "createdAt", updated_at as "updatedAt"
      FROM customers WHERE user_id = ${userId}
    `;
    return result.map((row: Record<string, unknown>) =>
      this.mapRowToCustomer(row)
    );
  }

  async findOrCreate(tenantId: string, visitorId: string): Promise<Customer> {
    const existing = await this.findByVisitorId(tenantId, visitorId);
    if (existing) return existing;

    const db = getDb();
    const result = await db`
      INSERT INTO customers (tenant_id, visitor_id)
      VALUES (${tenantId}, ${visitorId})
      ON CONFLICT (tenant_id, visitor_id) DO UPDATE SET updated_at = NOW()
      RETURNING id, tenant_id as "tenantId", visitor_id as "visitorId", user_id as "userId",
        email, name, metadata, created_at as "createdAt", updated_at as "updatedAt"
    `;
    return this.mapRowToCustomer(result[0]);
  }

  async linkToUser(
    customerId: string,
    userId: string
  ): Promise<Customer | null> {
    const db = getDb();
    const result = await db`
      UPDATE customers SET user_id = ${userId}, updated_at = NOW()
      WHERE id = ${customerId}
      RETURNING id, tenant_id as "tenantId", visitor_id as "visitorId", user_id as "userId",
        email, name, metadata, created_at as "createdAt", updated_at as "updatedAt"
    `;
    return result[0] ? this.mapRowToCustomer(result[0]) : null;
  }

  async linkAllByVisitorToUser(
    visitorId: string,
    userId: string
  ): Promise<number> {
    const db = getDb();
    const result = await db`
      UPDATE customers SET user_id = ${userId}, updated_at = NOW()
      WHERE visitor_id = ${visitorId} AND user_id IS NULL
    `;
    return result.count;
  }

  async update(
    id: string,
    data: Partial<Pick<Customer, "email" | "name" | "metadata">>
  ): Promise<Customer | null> {
    const db = getDb();
    const result = await db`
      UPDATE customers SET
        email = COALESCE(${data.email ?? null}, email),
        name = COALESCE(${data.name ?? null}, name),
        metadata = COALESCE(${
          data.metadata ? JSON.stringify(data.metadata) : null
        }::jsonb, metadata),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, tenant_id as "tenantId", visitor_id as "visitorId", user_id as "userId",
        email, name, metadata, created_at as "createdAt", updated_at as "updatedAt"
    `;
    return result[0] ? this.mapRowToCustomer(result[0]) : null;
  }

  private mapRowToCustomer(row: Record<string, unknown>): Customer {
    return {
      id: row.id as string,
      tenantId: row.tenantId as string,
      visitorId: row.visitorId as string,
      userId: row.userId as string | undefined,
      email: row.email as string | undefined,
      name: row.name as string | undefined,
      metadata: (row.metadata || {}) as Record<string, unknown>,
      createdAt: new Date(row.createdAt as string).toISOString(),
      updatedAt: new Date(row.updatedAt as string).toISOString(),
    };
  }
}
