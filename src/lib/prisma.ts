import { PrismaClient } from '@prisma/client';
import { PrismaPg as PrismaPgAdapter } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const RealPrismaClient = PrismaClient;
const PrismaPg = PrismaPgAdapter;
const pg = { Pool };
const realPrismaAvailable = true;

// Create a wrapper class around Prisma client initialization and delegates.
class PrismaWrapper {
  [key: string]: any;
  private prismaClient: any;
  private magicLinks: Array<{ token: string; email: string; expiresAt: Date; createdAt: Date }> = [];
  private products: Array<Record<string, any>> = [];
  private passwordResetTokens: Array<{ id: string; token: string; userId: string; used: boolean; expiresAt: Date; createdAt: Date }> = [];
  private positions: Array<Record<string, any>> = [];
  private bookings: Array<Record<string, any>> = [];
  private availabilities: Array<Record<string, any>> = [];
  public magicLink: {
    findUnique: ({ where }: { where: { token?: string } }) => Promise<any>;
    findFirst: ({ where }: { where?: { token?: string; email?: string } }) => Promise<any>;
    create: ({ data }: { data: { token: string; email: string; expiresAt: Date } }) => Promise<any>;
    delete: ({ where }: { where: { token?: string } }) => Promise<any>;
    deleteMany: ({ where }: { where?: { email?: string } }) => Promise<{ count: number }>;
  };
  public product: {
    findMany: ({ where, orderBy, skip, take }: { where?: any; orderBy?: any; skip?: number; take?: number }) => Promise<any[]>;
    findFirst: ({ where, orderBy }: { where?: any; orderBy?: any }) => Promise<any | null>;
    findUnique: ({ where }: { where: { id?: string; slug?: string } }) => Promise<any | null>;
    create: ({ data }: { data: any }) => Promise<any>;
    update: ({ where, data }: { where: { id: string }; data: any }) => Promise<any>;
  };
  public passwordResetToken: {
    findUnique: ({ where }: { where: { token?: string } }) => Promise<any>;
    create: ({ data }: { data: { token: string; userId: string; expiresAt: Date } }) => Promise<any>;
    update: ({ where, data }: { where: { token?: string }; data: { used?: boolean } }) => Promise<any>;
  };
  public position: {
    findMany: ({ where, orderBy, select }: { where?: any; orderBy?: any; select?: any }) => Promise<any[]>;
    findFirst: ({ where, orderBy, select }: { where?: any; orderBy?: any; select?: any }) => Promise<any | null>;
    create: ({ data }: { data: any }) => Promise<any>;
    update: ({ where, data }: { where: { id: string }; data: any }) => Promise<any>;
    delete: ({ where }: { where: { id: string } }) => Promise<any>;
    count: ({ where }: { where?: any }) => Promise<number>;
    upsert: ({ where, create, update }: { where: { id?: string; companyId_name?: { companyId: string; name: string } }; create: any; update: any }) => Promise<any>;
  };
  public booking: {
    findMany: ({ where, include, select, orderBy }: { where?: any; include?: any; select?: any; orderBy?: any }) => Promise<any[]>;
    findFirst: ({ where, include, select }: { where?: any; include?: any; select?: any }) => Promise<any | null>;
    findUnique: ({ where, include, select }: { where: { id?: string }; include?: any; select?: any }) => Promise<any | null>;
    create: ({ data }: { data: any }) => Promise<any>;
  };
  public availability: {
    findMany: ({ where, orderBy, select }: { where?: any; orderBy?: any; select?: any }) => Promise<any[]>;
    findFirst: ({ where, select }: { where?: any; select?: any }) => Promise<any | null>;
    deleteMany: ({ where }: { where?: any }) => Promise<{ count: number }>;
    upsert: ({ where, create, update }: { where: { id?: string; userId_dayOfWeek?: { userId: string; dayOfWeek: number } }; create: any; update: any }) => Promise<any>;
  };

  constructor() {
    const ensureQueryParam = (url: string, key: string, value: string) => {
      try {
        const parsed = new URL(url);
        if (!parsed.searchParams.has(key)) {
          parsed.searchParams.set(key, value);
        }
        return parsed.toString();
      } catch {
        return url;
      }
    };

    const normalizeDatabaseUrl = (url?: string) => {
      if (!url) return url;
      try {
        const parsed = new URL(url);
        const isSupabasePooler = parsed.hostname.endsWith('.pooler.supabase.com');
        const usesTransactionPooler =
          parsed.port === '6543' || parsed.searchParams.get('pgbouncer') === 'true';
        if (isSupabasePooler && usesTransactionPooler) {
          let normalized = ensureQueryParam(url, 'pgbouncer', 'true');
          normalized = ensureQueryParam(normalized, 'statement_cache_size', '0');
          return normalized;
        }
      } catch {
        return url;
      }
      return url;
    };

    const resolvedDatabaseUrl = normalizeDatabaseUrl(
      process.env.DATABASE_URL || process.env.DIRECT_URL,
    );

    if (realPrismaAvailable && RealPrismaClient && PrismaPg && pg) {
      let connectionString = resolvedDatabaseUrl || process.env.DATABASE_URL;

      if (!connectionString) {
        this.prismaClient = this.createUnavailableClient('DATABASE_URL is not configured');
      } else {
        connectionString = connectionString.replace(/[?&]sslmode=[^&]*/g, '');

        const needsSSL = connectionString.includes('supabase') ||
          connectionString.includes('amazonaws') ||
          !connectionString.includes('localhost');

        const poolConfig: any = {
          connectionString,
          connectionTimeoutMillis: 10000,
        };

        if (needsSSL) {
          poolConfig.ssl = { rejectUnauthorized: false };
        }

        const pool = new pg.Pool(poolConfig);
        const adapter = new PrismaPg(pool);

        this.prismaClient = new RealPrismaClient({
          adapter,
          log: ['error', 'warn'],
        });
      }
    } else {
      this.prismaClient = this.createUnavailableClient(
        'Prisma dependencies are unavailable at runtime',
      );
    }

    this.magicLink = this.getDelegateOrUnavailable('magicLink');
    this.product = this.getDelegateOrUnavailable('product');
    this.passwordResetToken = this.getDelegateOrUnavailable('passwordResetToken');
    this.position = this.getDelegateOrUnavailable('position');
    this.booking = this.getDelegateOrUnavailable('booking');
    this.availability = this.getDelegateOrUnavailable('availability');
  }

  // Proxy all properties to the underlying client
  get session() {
    return this.prismaClient.session;
  }

  get user() {
    return this.prismaClient.user;
  }

  get company() {
    return this.getDelegateOrUnavailable('company');
  }

  get invoice() {
    return this.getDelegateOrUnavailable('invoice');
  }

  get client() {
    return this.getDelegateOrUnavailable('client');
  }

  get payment() {
    return this.getDelegateOrUnavailable('payment');
  }

  private getDelegateOrUnavailable(delegateName: string) {
    const delegate = this.prismaClient?.[delegateName];
    if (delegate) {
      return delegate;
    }
    return this.createUnavailableClient(`Prisma delegate "${delegateName}" is unavailable`)[delegateName];
  }

  private createUnavailableClient(reason: string) {
    const makeError = () => new Error(`Database unavailable: ${reason}. Mock data is disabled.`);

    const throwingDelegate = new Proxy(
      {},
      {
        get: (_target, prop) => {
          if (typeof prop !== 'string') return undefined;
          return async () => {
            throw makeError();
          };
        },
      },
    );

    return new Proxy(
      {
        __databaseUnavailable: true,
        __databaseUnavailableReason: reason,
        $connect: async () => {
          throw makeError();
        },
        $disconnect: async () => undefined,
        $transaction: async () => {
          throw makeError();
        },
      },
      {
        get: (target, prop) => {
          if (prop in target) {
            return (target as any)[prop];
          }
          return throwingDelegate;
        },
      },
    );
  }

  private createMagicLinkDelegate() {
    return {
      findUnique: async ({ where }: { where: { token?: string } }) => {
        if (!where?.token) {
          console.warn('MagicLink findUnique missing token in mock');
          return null;
        }
        return this.magicLinks.find(link => link.token === where.token) ?? null;
      },
      findFirst: async ({ where }: { where?: { token?: string; email?: string } }) => {
        if (where?.token) {
          return this.magicLinks.find(link => link.token === where.token) ?? null;
        }
        if (where?.email) {
          return this.magicLinks.find(link => link.email === where.email) ?? null;
        }
        console.warn('MagicLink findFirst not implemented in mock');
        return null;
      },
      create: async ({ data }: { data: { token: string; email: string; expiresAt: Date } }) => {
        const record = {
          token: data.token,
          email: data.email,
          expiresAt: data.expiresAt,
          createdAt: new Date(),
        };
        this.magicLinks.push(record);
        return record;
      },
      delete: async ({ where }: { where: { token?: string } }) => {
        if (!where?.token) {
          console.warn('MagicLink delete missing token in mock');
          return null;
        }
        const index = this.magicLinks.findIndex(link => link.token === where.token);
        if (index === -1) {
          return null;
        }
        const [removed] = this.magicLinks.splice(index, 1);
        return removed ?? null;
      },
      deleteMany: async ({ where }: { where?: { email?: string } }) => {
        if (!where?.email) {
          const count = this.magicLinks.length;
          this.magicLinks = [];
          return { count };
        }
        const before = this.magicLinks.length;
        this.magicLinks = this.magicLinks.filter(link => link.email !== where.email);
        return { count: before - this.magicLinks.length };
      },
    };
  }

  private createProductDelegate() {
    return {
      findMany: async ({ where, orderBy, skip, take }: { where?: any; orderBy?: any; skip?: number; take?: number }) => {
        let products = [...this.products];
        if (where?.status) {
          products = products.filter((product) => product.status === where.status);
        }
        if (where?.type) {
          products = products.filter((product) => product.type === where.type);
        }
        if (orderBy) {
          const sortField = Object.keys(orderBy)[0];
          const sortOrder = orderBy[sortField];
          products.sort((a, b) => {
            if (a[sortField] < b[sortField]) return sortOrder === 'asc' ? -1 : 1;
            if (a[sortField] > b[sortField]) return sortOrder === 'asc' ? 1 : -1;
            return 0;
          });
        }
        if (typeof skip === 'number') {
          products = products.slice(skip);
        }
        if (typeof take === 'number') {
          products = products.slice(0, take);
        }
        return products;
      },
      findFirst: async ({ where }: { where?: any }) => {
        if (!where) {
          return this.products[0] ?? null;
        }
        if (where.id) {
          return this.products.find((product) => product.id === where.id) ?? null;
        }
        if (where.slug) {
          return this.products.find((product) => product.slug === where.slug) ?? null;
        }
        return this.products[0] ?? null;
      },
      findUnique: async ({ where }: { where: { id?: string; slug?: string } }) => {
        if (where.id) {
          return this.products.find((product) => product.id === where.id) ?? null;
        }
        if (where.slug) {
          return this.products.find((product) => product.slug === where.slug) ?? null;
        }
        return null;
      },
      create: async ({ data }: { data: any }) => {
        const record = { ...data, id: data?.id ?? `mock-product-${this.products.length + 1}` };
        this.products.push(record);
        return record;
      },
      update: async ({ where, data }: { where: { id: string }; data: any }) => {
        const index = this.products.findIndex((product) => product.id === where.id);
        if (index === -1) {
          const record = { ...data, id: where.id };
          this.products.push(record);
          return record;
        }
        this.products[index] = { ...this.products[index], ...data };
        return this.products[index];
      },
    };
  }

  private createPasswordResetTokenDelegate() {
    return {
      findUnique: async ({ where }: { where: { token?: string } }) => {
        if (!where?.token) {
          console.warn('PasswordResetToken findUnique missing token in mock');
          return null;
        }
        return this.passwordResetTokens.find((token) => token.token === where.token) ?? null;
      },
      create: async ({ data }: { data: { token: string; userId: string; expiresAt: Date } }) => {
        const record = {
          id: `mock-password-reset-${this.passwordResetTokens.length + 1}`,
          token: data.token,
          userId: data.userId,
          expiresAt: data.expiresAt,
          used: false,
          createdAt: new Date(),
        };
        this.passwordResetTokens.push(record);
        return record;
      },
      update: async ({ where, data }: { where: { token?: string }; data: { used?: boolean } }) => {
        if (!where?.token) {
          console.warn('PasswordResetToken update missing token in mock');
          return null;
        }
        const index = this.passwordResetTokens.findIndex((token) => token.token === where.token);
        if (index === -1) {
          return null;
        }
        this.passwordResetTokens[index] = {
          ...this.passwordResetTokens[index],
          ...data,
        };
        return this.passwordResetTokens[index];
      },
    };
  }

  private createPositionDelegate() {
    return {
      findMany: async ({ where, orderBy }: { where?: any; include?: any; select?: any; orderBy?: any }) => {
        let positions = [...this.positions];
        if (where?.companyId) {
          positions = positions.filter((position) => position.companyId === where.companyId);
        }
        if (orderBy) {
          const sortField = Object.keys(orderBy)[0];
          const sortOrder = orderBy[sortField];
          positions.sort((a, b) => {
            if (a[sortField] < b[sortField]) return sortOrder === 'asc' ? -1 : 1;
            if (a[sortField] > b[sortField]) return sortOrder === 'asc' ? 1 : -1;
            return 0;
          });
        }
        return positions;
      },
      findFirst: async ({ where, orderBy, select }: { where?: any; orderBy?: any; select?: any }) => {
        let positions = [...this.positions];
        if (where?.companyId) {
          positions = positions.filter((position) => position.companyId === where.companyId);
        }
        if (where?.id) {
          positions = positions.filter((position) => position.id === where.id);
        }
        if (where?.name) {
          positions = positions.filter((position) => position.name === where.name);
        }
        if (orderBy) {
          const sortField = Object.keys(orderBy)[0];
          const sortOrder = orderBy[sortField];
          positions.sort((a, b) => {
            if (a[sortField] < b[sortField]) return sortOrder === 'asc' ? -1 : 1;
            if (a[sortField] > b[sortField]) return sortOrder === 'asc' ? 1 : -1;
            return 0;
          });
        }
        const first = positions[0] ?? null;
        if (!first || !select) return first;
        return Object.keys(select).reduce((acc, key) => {
          if (select[key]) acc[key] = first[key];
          return acc;
        }, {} as Record<string, any>);
      },
      create: async ({ data }: { data: any }) => {
        const record = {
          ...data,
          id: data?.id ?? `mock-position-${this.positions.length + 1}`,
          createdAt: data?.createdAt ?? new Date(),
          updatedAt: data?.updatedAt ?? new Date(),
        };
        this.positions.push(record);
        return record;
      },
      update: async ({ where, data }: { where: { id: string }; data: any }) => {
        const index = this.positions.findIndex((position) => position.id === where.id);
        if (index === -1) {
          const record = { ...data, id: where.id };
          this.positions.push(record);
          return record;
        }
        this.positions[index] = { ...this.positions[index], ...data, updatedAt: new Date() };
        return this.positions[index];
      },
      delete: async ({ where }: { where: { id: string } }) => {
        const index = this.positions.findIndex((position) => position.id === where.id);
        if (index === -1) return null;
        const [removed] = this.positions.splice(index, 1);
        return removed ?? null;
      },
      count: async ({ where }: { where?: any }) => {
        let positions = [...this.positions];
        if (where?.companyId) {
          positions = positions.filter((position) => position.companyId === where.companyId);
        }
        return positions.length;
      },
      upsert: async ({ where, create, update }: { where: { id?: string; companyId_name?: { companyId: string; name: string } }; create: any; update: any }) => {
        const match = where?.id
          ? this.positions.find((position) => position.id === where.id)
          : this.positions.find(
              (position) =>
                position.companyId === where.companyId_name?.companyId &&
                position.name === where.companyId_name?.name,
            );
        if (!match) {
          const record = {
            ...create,
            id: create?.id ?? `mock-position-${this.positions.length + 1}`,
            createdAt: create?.createdAt ?? new Date(),
            updatedAt: create?.updatedAt ?? new Date(),
          };
          this.positions.push(record);
          return record;
        }
        Object.assign(match, update, { updatedAt: new Date() });
        return match;
      },
    };
  }

  private createBookingDelegate() {
    return {
      findMany: async ({ where, orderBy }: { where?: any; orderBy?: any; select?: any }) => {
        let bookings = [...this.bookings];
        if (where?.userId) {
          bookings = bookings.filter((booking) => booking.userId === where.userId);
        }
        if (orderBy) {
          const sortField = Object.keys(orderBy)[0];
          const sortOrder = orderBy[sortField];
          bookings.sort((a, b) => {
            if (a[sortField] < b[sortField]) return sortOrder === 'asc' ? -1 : 1;
            if (a[sortField] > b[sortField]) return sortOrder === 'asc' ? 1 : -1;
            return 0;
          });
        }
        return bookings;
      },
      findFirst: async ({ where }: { where?: any; include?: any; select?: any }) => {
        if (!where) return this.bookings[0] ?? null;
        if (where.id) {
          return this.bookings.find((booking) => booking.id === where.id) ?? null;
        }
        if (where.userId) {
          return this.bookings.find((booking) => booking.userId === where.userId) ?? null;
        }
        return this.bookings[0] ?? null;
      },
      findUnique: async ({ where }: { where: { id?: string }; include?: any; select?: any }) => {
        if (!where?.id) return null;
        return this.bookings.find((booking) => booking.id === where.id) ?? null;
      },
      create: async ({ data }: { data: any }) => {
        const record = {
          ...data,
          id: data?.id ?? `mock-booking-${this.bookings.length + 1}`,
          createdAt: data?.createdAt ?? new Date(),
        };
        this.bookings.push(record);
        return record;
      },
    };
  }

  private createAvailabilityDelegate() {
    return {
      findMany: async ({ where, orderBy }: { where?: any; orderBy?: any; select?: any }) => {
        let availabilities = [...this.availabilities];
        if (where?.userId) {
          availabilities = availabilities.filter((availability) => availability.userId === where.userId);
        }
        if (orderBy) {
          const sortField = Object.keys(orderBy)[0];
          const sortOrder = orderBy[sortField];
          availabilities.sort((a, b) => {
            if (a[sortField] < b[sortField]) return sortOrder === 'asc' ? -1 : 1;
            if (a[sortField] > b[sortField]) return sortOrder === 'asc' ? 1 : -1;
            return 0;
          });
        }
        return availabilities;
      },
      findFirst: async ({ where }: { where?: any; select?: any }) => {
        let availabilities = [...this.availabilities];
        if (where?.userId) {
          availabilities = availabilities.filter((availability) => availability.userId === where.userId);
        }
        if (where?.dayOfWeek !== undefined) {
          availabilities = availabilities.filter((availability) => availability.dayOfWeek === where.dayOfWeek);
        }
        return availabilities[0] ?? null;
      },
      deleteMany: async ({ where }: { where?: any }) => {
        const before = this.availabilities.length;
        if (where?.userId) {
          this.availabilities = this.availabilities.filter((availability) => availability.userId !== where.userId);
        } else {
          this.availabilities = [];
        }
        return { count: before - this.availabilities.length };
      },
      upsert: async ({ where, create, update }: { where: { id?: string; userId_dayOfWeek?: { userId: string; dayOfWeek: number } }; create: any; update: any }) => {
        const match = where?.id
          ? this.availabilities.find((availability) => availability.id === where.id)
          : this.availabilities.find(
              (availability) =>
                availability.userId === where.userId_dayOfWeek?.userId &&
                availability.dayOfWeek === where.userId_dayOfWeek?.dayOfWeek,
            );
        if (!match) {
          const record = {
            ...create,
            id: create?.id ?? `mock-availability-${this.availabilities.length + 1}`,
          };
          this.availabilities.push(record);
          return record;
        }
        Object.assign(match, update);
        return match;
      },
    };
  }

  // Proxy other methods as needed
  async $connect() {
    if (this.prismaClient.$connect) {
      return this.prismaClient.$connect();
    }
  }

  async $disconnect() {
    if (this.prismaClient.$disconnect) {
      return this.prismaClient.$disconnect();
    }
  }

  async $transaction<T>(action: ((tx: PrismaWrapper) => Promise<T>) | Promise<T>[]) {
    if (this.prismaClient.$transaction) {
      return this.prismaClient.$transaction(action as any);
    }
    if (typeof action === 'function') {
      return action(this);
    }
    return Promise.all(action);
  }
}

// Create a singleton instance
declare global {
  // Allow global `prisma` in development to prevent multiple instances
  var prisma: PrismaWrapper | undefined;
}

const prisma = global.prisma ?? new PrismaWrapper();
const prismaProxy = new Proxy(prisma as any, {
  get(target, prop, receiver) {
    if (prop in target) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value === 'function') {
        return value.bind(target);
      }
      return value;
    }

    const client = (target as any).prismaClient;
    const value = client?.[prop as keyof typeof client];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  }
}) as PrismaWrapper;

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prismaProxy;
export { prismaProxy as prisma };
