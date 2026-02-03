import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

// Define interfaces matching the Prisma schema
interface Session {
  id: string;
  token: string;
  userId: string;
  createdAt: string; // ISO string
  expiresAt?: string; // ISO string
}

interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: string;
  planTier: string;
  proTrialEndsAt?: string; // ISO string
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  companyId?: string;
}

interface MockData {
  sessions: Session[];
  users: User[];
}

// Simple file-based mock Prisma client for development
class MockPrismaClient {
  private dataFile: string;
  private data: MockData = { sessions: [], users: [] };

  constructor() {
    this.dataFile = path.join(process.cwd(), 'mock-data.json');
    this.initData();
  }

  private async initData() {
    try {
      const fileContent = await fs.readFile(this.dataFile, 'utf-8');
      this.data = JSON.parse(fileContent);
    } catch (error) {
      // File doesn't exist, initialize with empty data
      this.data = { sessions: [], users: [] };
      await this.saveData();
    }
  }

  private async saveData() {
    await fs.writeFile(this.dataFile, JSON.stringify(this.data, null, 2));
  }

  // Session operations
  session = {
    findUnique: async ({ where, include }: { where: { token?: string; id?: string }; include?: any }) => {
      let session: Session | undefined;
      
      if (where.token) {
        session = this.data.sessions.find(s => s.token === where.token);
      } else if (where.id) {
        session = this.data.sessions.find(s => s.id === where.id);
      }
      
      if (!session) return null;
      
      // If include.user is requested, fetch the associated user
      if (include?.user && session.userId) {
        const user = this.data.users.find(u => u.id === session.userId);
        if (user) {
          (session as any).user = user;
          
          // If the user includes company or positionCustom, add those as well
          if (include.user.include?.company) {
            (session as any).user.company = null; // Mock for now
          }
          if (include.user.include?.positionCustom) {
            (session as any).user.positionCustom = null; // Mock for now
          }
        }
      }
      
      return session;
    },

    create: async ({ data }: { data: Omit<Session, 'id'> }) => {
      const newSession: Session = {
        id: randomUUID(),
        ...data,
        createdAt: new Date(data.createdAt || new Date()).toISOString(),
      };
      
      this.data.sessions.push(newSession);
      await this.saveData();
      return newSession;
    },

    delete: async ({ where }: { where: { id?: string; token?: string } }) => {
      if (where.id) {
        this.data.sessions = this.data.sessions.filter(s => s.id !== where.id);
      } else if (where.token) {
        this.data.sessions = this.data.sessions.filter(s => s.token !== where.token);
      }
      await this.saveData();
      return { count: 1 };
    },

    deleteMany: async ({ where }: { where: { token?: string } }) => {
      const initialLength = this.data.sessions.length;
      if (where.token) {
        this.data.sessions = this.data.sessions.filter(s => s.token !== where.token);
      }
      const deletedCount = initialLength - this.data.sessions.length;
      await this.saveData();
      return { count: deletedCount };
    }
  };

  // User operations
  user = {
    findUnique: async ({ where }: { where: { id?: string; email?: string } }) => {
      let user: User | undefined;
      
      if (where.id) {
        user = this.data.users.find(u => u.id === where.id);
      } else if (where.email) {
        user = this.data.users.find(u => u.email === where.email);
      }
      
      return user || null;
    },

    create: async ({ data }: { data: Omit<User, 'id' | 'createdAt' | 'updatedAt'> }) => {
      const newUser: User = {
        id: randomUUID(),
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      this.data.users.push(newUser);
      await this.saveData();
      return newUser;
    }
  };

  // Additional helper methods for compatibility
  $connect = async () => {
    // No-op for mock client
  };

  $disconnect = async () => {
    // No-op for mock client
  };
}

export { MockPrismaClient };