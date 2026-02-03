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

interface Company {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

interface Invoice {
  id: string;
  clientId: string;
  companyId: string;
  amount: number;
  status: string;
  dueDate: string; // ISO string
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  companyId: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

interface Opportunity {
  id: string;
  title: string;
  value: number;
  status: string;
  companyId: string;
  clientId?: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: string;
  startDate: string; // ISO string
  endDate?: string; // ISO string
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

interface MockData {
  sessions: Session[];
  users: User[];
  companies: Company[];
  invoices: Invoice[];
  clients: Client[];
  opportunities: Opportunity[];
  subscriptions: Subscription[];
}

// Simple file-based mock Prisma client for development
class MockPrismaClient {
  private dataFile: string;
  private data: MockData;

  constructor() {
    this.dataFile = path.join(process.cwd(), 'mock-data.json');
    this.data = {
      sessions: [],
      users: [],
      companies: [],
      invoices: [],
      clients: [],
      opportunities: [],
      subscriptions: []
    };
    this.initData();
  }

  private async initData() {
    try {
      const fileContent = await fs.readFile(this.dataFile, 'utf-8');
      this.data = JSON.parse(fileContent);
    } catch (error) {
      // File doesn't exist, initialize with empty data
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

    findFirst: async ({ where, include }: { where: { token?: string; userId?: string }; include?: any }) => {
      let session: Session | undefined;
      
      if (where.token) {
        session = this.data.sessions.find(s => s.token === where.token);
      } else if (where.userId) {
        session = this.data.sessions.find(s => s.userId === where.userId);
      }
      
      if (!session) return null;
      
      // Apply include logic similar to findUnique
      if (include?.user && session.userId) {
        const user = this.data.users.find(u => u.id === session.userId);
        if (user) {
          (session as any).user = user;
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

    update: async ({ where, data }: { where: { id?: string; token?: string }; data: Partial<Session> }) => {
      let sessionToUpdate: Session | undefined;
      let index: number = -1;
      
      if (where.id) {
        index = this.data.sessions.findIndex(s => s.id === where.id);
      } else if (where.token) {
        index = this.data.sessions.findIndex(s => s.token === where.token);
      }
      
      if (index === -1) return null;
      
      sessionToUpdate = this.data.sessions[index];
      const updatedSession = { ...sessionToUpdate, ...data, updatedAt: new Date().toISOString() };
      this.data.sessions[index] = updatedSession;
      
      await this.saveData();
      return updatedSession;
    },

    delete: async ({ where }: { where: { id?: string; token?: string } }) => {
      let index: number = -1;
      
      if (where.id) {
        index = this.data.sessions.findIndex(s => s.id === where.id);
      } else if (where.token) {
        index = this.data.sessions.findIndex(s => s.token === where.token);
      }
      
      if (index === -1) return null;
      
      const deletedSession = this.data.sessions.splice(index, 1)[0];
      await this.saveData();
      return deletedSession;
    },

    deleteMany: async ({ where }: { where: { token?: string; userId?: string } }) => {
      let initialLength = this.data.sessions.length;
      
      if (where.token) {
        this.data.sessions = this.data.sessions.filter(s => s.token !== where.token);
      } else if (where.userId) {
        this.data.sessions = this.data.sessions.filter(s => s.userId !== where.userId);
      }
      
      const deletedCount = initialLength - this.data.sessions.length;
      await this.saveData();
      return { count: deletedCount };
    },

    count: async ({ where }: { where?: { token?: string; userId?: string } }) => {
      let filteredSessions = this.data.sessions;
      
      if (where?.token) {
        filteredSessions = filteredSessions.filter(s => s.token === where.token);
      }
      if (where?.userId) {
        filteredSessions = filteredSessions.filter(s => s.userId === where.userId);
      }
      
      return filteredSessions.length;
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

    findFirst: async ({ where, orderBy, select }: { where?: any; orderBy?: any; select?: any }) => {
      let users = this.data.users;
      
      if (where?.email) {
        users = users.filter(u => u.email === where.email);
      }
      if (where?.id) {
        users = users.filter(u => u.id === where.id);
      }
      
      // Apply additional filters as needed
      if (where?.AND) {
        where.AND.forEach((condition: any) => {
          if (condition.email) {
            users = users.filter(u => u.email === condition.email);
          }
        });
      }
      
      if (orderBy) {
        // Simple sorting implementation
        users.sort((a, b) => {
          const sortField = Object.keys(orderBy)[0];
          const sortOrder = orderBy[sortField];
          if (a[sortField] < b[sortField]) return sortOrder === 'asc' ? -1 : 1;
          if (a[sortField] > b[sortField]) return sortOrder === 'asc' ? 1 : -1;
          return 0;
        });
      }
      
      return users.length > 0 ? users[0] : null;
    },

    findMany: async ({ where, orderBy, select, skip, take }: { where?: any; orderBy?: any; select?: any; skip?: number; take?: number }) => {
      let users = [...this.data.users];
      
      if (where?.email) {
        users = users.filter(u => u.email === where.email);
      }
      if (where?.id) {
        users = users.filter(u => u.id === where.id);
      }
      if (where?.companyId) {
        users = users.filter(u => u.companyId === where.companyId);
      }
      
      if (orderBy) {
        // Simple sorting implementation
        users.sort((a, b) => {
          const sortField = Object.keys(orderBy)[0];
          const sortOrder = orderBy[sortField];
          if (a[sortField] < b[sortField]) return sortOrder === 'asc' ? -1 : 1;
          if (a[sortField] > b[sortField]) return sortOrder === 'asc' ? 1 : -1;
          return 0;
        });
      }
      
      if (skip) {
        users = users.slice(skip);
      }
      if (take) {
        users = users.slice(0, take);
      }
      
      return users;
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
    },

    update: async ({ where, data }: { where: { id?: string; email?: string }; data: Partial<User> }) => {
      let userToUpdate: User | undefined;
      let index: number = -1;
      
      if (where.id) {
        index = this.data.users.findIndex(u => u.id === where.id);
      } else if (where.email) {
        index = this.data.users.findIndex(u => u.email === where.email);
      }
      
      if (index === -1) return null;
      
      userToUpdate = this.data.users[index];
      const updatedUser = { ...userToUpdate, ...data, updatedAt: new Date().toISOString() };
      this.data.users[index] = updatedUser;
      
      await this.saveData();
      return updatedUser;
    },

    delete: async ({ where }: { where: { id?: string; email?: string } }) => {
      let index: number = -1;
      
      if (where.id) {
        index = this.data.users.findIndex(u => u.id === where.id);
      } else if (where.email) {
        index = this.data.users.findIndex(u => u.email === where.email);
      }
      
      if (index === -1) return null;
      
      const deletedUser = this.data.users.splice(index, 1)[0];
      await this.saveData();
      return deletedUser;
    },

    count: async ({ where }: { where?: { email?: string } }) => {
      let filteredUsers = this.data.users;
      
      if (where?.email) {
        filteredUsers = filteredUsers.filter(u => u.email === where.email);
      }
      
      return filteredUsers.length;
    }
  };

  // Company operations
  company = {
    findUnique: async ({ where }: { where: { id?: string; name?: string } }) => {
      let company: Company | undefined;
      
      if (where.id) {
        company = this.data.companies.find(c => c.id === where.id);
      } else if (where.name) {
        company = this.data.companies.find(c => c.name === where.name);
      }
      
      return company || null;
    },

    findFirst: async ({ where }: { where?: any }) => {
      let companies = this.data.companies;
      
      if (where?.id) {
        companies = companies.filter(c => c.id === where.id);
      }
      if (where?.ownerId) {
        companies = companies.filter(c => c.ownerId === where.ownerId);
      }
      
      return companies.length > 0 ? companies[0] : null;
    },

    findMany: async ({ where, orderBy, select, skip, take }: { where?: any; orderBy?: any; select?: any; skip?: number; take?: number }) => {
      let companies = [...this.data.companies];
      
      if (where?.id) {
        companies = companies.filter(c => c.id === where.id);
      }
      if (where?.ownerId) {
        companies = companies.filter(c => c.ownerId === where.ownerId);
      }
      
      if (orderBy) {
        // Simple sorting implementation
        companies.sort((a, b) => {
          const sortField = Object.keys(orderBy)[0];
          const sortOrder = orderBy[sortField];
          if (a[sortField] < b[sortField]) return sortOrder === 'asc' ? -1 : 1;
          if (a[sortField] > b[sortField]) return sortOrder === 'asc' ? 1 : -1;
          return 0;
        });
      }
      
      if (skip) {
        companies = companies.slice(skip);
      }
      if (take) {
        companies = companies.slice(0, take);
      }
      
      return companies;
    },

    create: async ({ data }: { data: Omit<Company, 'id' | 'createdAt' | 'updatedAt'> }) => {
      const newCompany: Company = {
        id: randomUUID(),
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      this.data.companies.push(newCompany);
      await this.saveData();
      return newCompany;
    },

    update: async ({ where, data }: { where: { id?: string; name?: string }; data: Partial<Company> }) => {
      let companyToUpdate: Company | undefined;
      let index: number = -1;
      
      if (where.id) {
        index = this.data.companies.findIndex(c => c.id === where.id);
      } else if (where.name) {
        index = this.data.companies.findIndex(c => c.name === where.name);
      }
      
      if (index === -1) return null;
      
      companyToUpdate = this.data.companies[index];
      const updatedCompany = { ...companyToUpdate, ...data, updatedAt: new Date().toISOString() };
      this.data.companies[index] = updatedCompany;
      
      await this.saveData();
      return updatedCompany;
    },

    delete: async ({ where }: { where: { id?: string; name?: string } }) => {
      let index: number = -1;
      
      if (where.id) {
        index = this.data.companies.findIndex(c => c.id === where.id);
      } else if (where.name) {
        index = this.data.companies.findIndex(c => c.name === where.name);
      }
      
      if (index === -1) return null;
      
      const deletedCompany = this.data.companies.splice(index, 1)[0];
      await this.saveData();
      return deletedCompany;
    },

    count: async ({ where }: { where?: any }) => {
      let filteredCompanies = this.data.companies;
      
      if (where?.ownerId) {
        filteredCompanies = filteredCompanies.filter(c => c.ownerId === where.ownerId);
      }
      
      return filteredCompanies.length;
    }
  };

  // Invoice operations
  invoice = {
    findUnique: async ({ where }: { where: { id?: string } }) => {
      if (!where.id) return null;
      const invoice = this.data.invoices.find(i => i.id === where.id);
      return invoice || null;
    },

    findMany: async ({ where, orderBy, select, skip, take }: { where?: any; orderBy?: any; select?: any; skip?: number; take?: number }) => {
      let invoices = [...this.data.invoices];
      
      if (where?.clientId) {
        invoices = invoices.filter(i => i.clientId === where.clientId);
      }
      if (where?.companyId) {
        invoices = invoices.filter(i => i.companyId === where.companyId);
      }
      if (where?.status) {
        invoices = invoices.filter(i => i.status === where.status);
      }
      
      if (orderBy) {
        // Simple sorting implementation
        invoices.sort((a, b) => {
          const sortField = Object.keys(orderBy)[0];
          const sortOrder = orderBy[sortField];
          if (a[sortField] < b[sortField]) return sortOrder === 'asc' ? -1 : 1;
          if (a[sortField] > b[sortField]) return sortOrder === 'asc' ? 1 : -1;
          return 0;
        });
      }
      
      if (skip) {
        invoices = invoices.slice(skip);
      }
      if (take) {
        invoices = invoices.slice(0, take);
      }
      
      return invoices;
    },

    create: async ({ data }: { data: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'> }) => {
      const newInvoice: Invoice = {
        id: randomUUID(),
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      this.data.invoices.push(newInvoice);
      await this.saveData();
      return newInvoice;
    },

    update: async ({ where, data }: { where: { id: string }; data: Partial<Invoice> }) => {
      const index = this.data.invoices.findIndex(i => i.id === where.id);
      
      if (index === -1) return null;
      
      const invoiceToUpdate = this.data.invoices[index];
      const updatedInvoice = { ...invoiceToUpdate, ...data, updatedAt: new Date().toISOString() };
      this.data.invoices[index] = updatedInvoice;
      
      await this.saveData();
      return updatedInvoice;
    },

    delete: async ({ where }: { where: { id: string } }) => {
      const index = this.data.invoices.findIndex(i => i.id === where.id);
      
      if (index === -1) return null;
      
      const deletedInvoice = this.data.invoices.splice(index, 1)[0];
      await this.saveData();
      return deletedInvoice;
    },

    count: async ({ where }: { where?: any }) => {
      let filteredInvoices = this.data.invoices;
      
      if (where?.clientId) {
        filteredInvoices = filteredInvoices.filter(i => i.clientId === where.clientId);
      }
      if (where?.companyId) {
        filteredInvoices = filteredInvoices.filter(i => i.companyId === where.companyId);
      }
      
      return filteredInvoices.length;
    }
  };

  // Client operations
  client = {
    findUnique: async ({ where }: { where: { id?: string; email?: string } }) => {
      let client: Client | undefined;
      
      if (where.id) {
        client = this.data.clients.find(c => c.id === where.id);
      } else if (where.email) {
        client = this.data.clients.find(c => c.email === where.email);
      }
      
      return client || null;
    },

    findFirst: async ({ where }: { where?: any }) => {
      let clients = this.data.clients;
      
      if (where?.id) {
        clients = clients.filter(c => c.id === where.id);
      }
      if (where?.email) {
        clients = clients.filter(c => c.email === where.email);
      }
      if (where?.companyId) {
        clients = clients.filter(c => c.companyId === where.companyId);
      }
      
      return clients.length > 0 ? clients[0] : null;
    },

    findMany: async ({ where, orderBy, select, skip, take }: { where?: any; orderBy?: any; select?: any; skip?: number; take?: number }) => {
      let clients = [...this.data.clients];
      
      if (where?.companyId) {
        clients = clients.filter(c => c.companyId === where.companyId);
      }
      if (where?.email) {
        clients = clients.filter(c => c.email === where.email);
      }
      
      if (orderBy) {
        // Simple sorting implementation
        clients.sort((a, b) => {
          const sortField = Object.keys(orderBy)[0];
          const sortOrder = orderBy[sortField];
          if (a[sortField] < b[sortField]) return sortOrder === 'asc' ? -1 : 1;
          if (a[sortField] > b[sortField]) return sortOrder === 'asc' ? 1 : -1;
          return 0;
        });
      }
      
      if (skip) {
        clients = clients.slice(skip);
      }
      if (take) {
        clients = clients.slice(0, take);
      }
      
      return clients;
    },

    create: async ({ data }: { data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'> }) => {
      const newClient: Client = {
        id: randomUUID(),
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      this.data.clients.push(newClient);
      await this.saveData();
      return newClient;
    },

    update: async ({ where, data }: { where: { id: string }; data: Partial<Client> }) => {
      const index = this.data.clients.findIndex(c => c.id === where.id);
      
      if (index === -1) return null;
      
      const clientToUpdate = this.data.clients[index];
      const updatedClient = { ...clientToUpdate, ...data, updatedAt: new Date().toISOString() };
      this.data.clients[index] = updatedClient;
      
      await this.saveData();
      return updatedClient;
    },

    delete: async ({ where }: { where: { id: string } }) => {
      const index = this.data.clients.findIndex(c => c.id === where.id);
      
      if (index === -1) return null;
      
      const deletedClient = this.data.clients.splice(index, 1)[0];
      await this.saveData();
      return deletedClient;
    },

    count: async ({ where }: { where?: any }) => {
      let filteredClients = this.data.clients;
      
      if (where?.companyId) {
        filteredClients = filteredClients.filter(c => c.companyId === where.companyId);
      }
      
      return filteredClients.length;
    }
  };

  // Opportunity operations
  opportunity = {
    findUnique: async ({ where }: { where: { id?: string } }) => {
      if (!where.id) return null;
      const opportunity = this.data.opportunities.find(o => o.id === where.id);
      return opportunity || null;
    },

    findMany: async ({ where, orderBy, select, skip, take }: { where?: any; orderBy?: any; select?: any; skip?: number; take?: number }) => {
      let opportunities = [...this.data.opportunities];
      
      if (where?.companyId) {
        opportunities = opportunities.filter(o => o.companyId === where.companyId);
      }
      if (where?.clientId) {
        opportunities = opportunities.filter(o => o.clientId === where.clientId);
      }
      if (where?.status) {
        opportunities = opportunities.filter(o => o.status === where.status);
      }
      
      if (orderBy) {
        // Simple sorting implementation
        opportunities.sort((a, b) => {
          const sortField = Object.keys(orderBy)[0];
          const sortOrder = orderBy[sortField];
          if (a[sortField] < b[sortField]) return sortOrder === 'asc' ? -1 : 1;
          if (a[sortField] > b[sortField]) return sortOrder === 'asc' ? 1 : -1;
          return 0;
        });
      }
      
      if (skip) {
        opportunities = opportunities.slice(skip);
      }
      if (take) {
        opportunities = opportunities.slice(0, take);
      }
      
      return opportunities;
    },

    create: async ({ data }: { data: Omit<Opportunity, 'id' | 'createdAt' | 'updatedAt'> }) => {
      const newOpportunity: Opportunity = {
        id: randomUUID(),
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      this.data.opportunities.push(newOpportunity);
      await this.saveData();
      return newOpportunity;
    },

    update: async ({ where, data }: { where: { id: string }; data: Partial<Opportunity> }) => {
      const index = this.data.opportunities.findIndex(o => o.id === where.id);
      
      if (index === -1) return null;
      
      const opportunityToUpdate = this.data.opportunities[index];
      const updatedOpportunity = { ...opportunityToUpdate, ...data, updatedAt: new Date().toISOString() };
      this.data.opportunities[index] = updatedOpportunity;
      
      await this.saveData();
      return updatedOpportunity;
    },

    delete: async ({ where }: { where: { id: string } }) => {
      const index = this.data.opportunities.findIndex(o => o.id === where.id);
      
      if (index === -1) return null;
      
      const deletedOpportunity = this.data.opportunities.splice(index, 1)[0];
      await this.saveData();
      return deletedOpportunity;
    },

    count: async ({ where }: { where?: any }) => {
      let filteredOpportunities = this.data.opportunities;
      
      if (where?.companyId) {
        filteredOpportunities = filteredOpportunities.filter(o => o.companyId === where.companyId);
      }
      if (where?.clientId) {
        filteredOpportunities = filteredOpportunities.filter(o => o.clientId === where.clientId);
      }
      
      return filteredOpportunities.length;
    }
  };

  // Subscription operations
  subscription = {
    findUnique: async ({ where }: { where: { id?: string; userId?: string } }) => {
      let subscription: Subscription | undefined;
      
      if (where.id) {
        subscription = this.data.subscriptions.find(s => s.id === where.id);
      } else if (where.userId) {
        subscription = this.data.subscriptions.find(s => s.userId === where.userId);
      }
      
      return subscription || null;
    },

    findMany: async ({ where, orderBy, select, skip, take }: { where?: any; orderBy?: any; select?: any; skip?: number; take?: number }) => {
      let subscriptions = [...this.data.subscriptions];
      
      if (where?.userId) {
        subscriptions = subscriptions.filter(s => s.userId === where.userId);
      }
      if (where?.status) {
        subscriptions = subscriptions.filter(s => s.status === where.status);
      }
      
      if (orderBy) {
        // Simple sorting implementation
        subscriptions.sort((a, b) => {
          const sortField = Object.keys(orderBy)[0];
          const sortOrder = orderBy[sortField];
          if (a[sortField] < b[sortField]) return sortOrder === 'asc' ? -1 : 1;
          if (a[sortField] > b[sortField]) return sortOrder === 'asc' ? 1 : -1;
          return 0;
        });
      }
      
      if (skip) {
        subscriptions = subscriptions.slice(skip);
      }
      if (take) {
        subscriptions = subscriptions.slice(0, take);
      }
      
      return subscriptions;
    },

    create: async ({ data }: { data: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'> }) => {
      const newSubscription: Subscription = {
        id: randomUUID(),
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      this.data.subscriptions.push(newSubscription);
      await this.saveData();
      return newSubscription;
    },

    update: async ({ where, data }: { where: { id: string; userId?: string }; data: Partial<Subscription> }) => {
      let index: number = -1;
      
      if (where.id) {
        index = this.data.subscriptions.findIndex(s => s.id === where.id);
      } else if (where.userId) {
        index = this.data.subscriptions.findIndex(s => s.userId === where.userId);
      }
      
      if (index === -1) return null;
      
      const subscriptionToUpdate = this.data.subscriptions[index];
      const updatedSubscription = { ...subscriptionToUpdate, ...data, updatedAt: new Date().toISOString() };
      this.data.subscriptions[index] = updatedSubscription;
      
      await this.saveData();
      return updatedSubscription;
    },

    delete: async ({ where }: { where: { id: string } }) => {
      const index = this.data.subscriptions.findIndex(s => s.id === where.id);
      
      if (index === -1) return null;
      
      const deletedSubscription = this.data.subscriptions.splice(index, 1)[0];
      await this.saveData();
      return deletedSubscription;
    },

    count: async ({ where }: { where?: any }) => {
      let filteredSubscriptions = this.data.subscriptions;
      
      if (where?.userId) {
        filteredSubscriptions = filteredSubscriptions.filter(s => s.userId === where.userId);
      }
      if (where?.status) {
        filteredSubscriptions = filteredSubscriptions.filter(s => s.status === where.status);
      }
      
      return filteredSubscriptions.length;
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