import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export type UserRole = 'USER' | 'ADMIN' | 'OWNER' | 'SUPERADMIN';

type CurrentUser = Awaited<ReturnType<typeof getCurrentUser>>;

export type AuthenticatedUser = NonNullable<CurrentUser> & {
  role: UserRole | string;
  companyId?: string | null;
};

/**
 * Higher-order function to wrap API routes with authentication and authorization
 * @param handler The API route handler function
 * @param allowedRoles Array of roles that are allowed to access this route
 * @returns A new handler function with auth checks
 */
export function withAuth<T = any>(
  handler: (req: NextRequest, ctx: any, user: AuthenticatedUser) => Promise<T>,
  allowedRoles: UserRole[] = ['USER', 'ADMIN', 'OWNER', 'SUPERADMIN']
) {
  return async (req: NextRequest, ctx: any) => {
    // Get the authenticated user
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - No user session' },
        { status: 401 }
      );
    }

    // Check if user has required role
    if (!allowedRoles.includes(user.role as UserRole)) {
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions' },
        { status: 403 }
      );
    }

    // Pass the authenticated user to the handler
    return handler(req, ctx, user);
  };
}

/**
 * Verifies if a user has access to a specific resource based on their role and company
 */
export function canAccessResource(user: AuthenticatedUser, resource: any, resourceType: 'client' | 'invoice' | 'user' | 'lead' | 'proposal' | 'contract' | 'recurringInvoice'): boolean {
  if (user.role === 'SUPERADMIN') {
    return true; // Superadmins can access everything
  }
  
  switch(resourceType) {
    case 'client':
      if (user.role === 'OWNER' || user.role === 'ADMIN') {
        // Owners and admins can access any client in their company
        return resource.companyId === user.companyId;
      } else {
        // Regular users can only access clients assigned to them
        return resource.assignedToId === user.id;
      }
      
    case 'invoice':
    case 'proposal':
    case 'contract':
    case 'recurringInvoice':
      // These belong to users, so check if the user owns them
      return resource.userId === user.id;
      
    case 'user':
      if (user.role === 'OWNER' || user.role === 'ADMIN') {
        // Owners and admins can access any user in their company
        return resource.companyId === user.companyId;
      } else {
        // Regular users can only access themselves
        return resource.id === user.id;
      }
      
    case 'lead':
      if (user.role === 'OWNER' || user.role === 'ADMIN') {
        // Owners and admins can access any lead in their company
        return resource.companyId === user.companyId;
      } else {
        // Regular users can only access leads assigned to them
        return resource.assignedToId === user.id;
      }
      
    default:
      return false;
  }
}

/**
 * Creates a Prisma client instance that is pre-filtered by the user's company/ownership
 * This ensures that queries automatically only return data the user is authorized to see
 */
export function getScopedDb(user: AuthenticatedUser) {
  // For SUPERADMIN users, return the full Prisma client (no restrictions)
  if (user.role === 'SUPERADMIN') {
    return prisma;
  }

  // For OWNER users, restrict to their company's data
  if (user.role === 'OWNER') {
    return {
      ...prisma,
      user: {
        ...prisma.user,
        findUnique: (args: any) => prisma.user.findUnique({
          ...args,
          where: {
            ...args.where,
            companyId: user.companyId,
          },
        }),
        findUniqueOrThrow: (args: any) => prisma.user.findUniqueOrThrow({
          ...args,
          where: {
            ...args.where,
            companyId: user.companyId,
          },
        }),
        findFirst: (args: any) => prisma.user.findFirst({
          ...args,
          where: {
            ...args.where,
            companyId: user.companyId,
          },
        }),
        findMany: (args: any) => prisma.user.findMany({
          ...args,
          where: {
            ...args.where,
            companyId: user.companyId,
          },
        }),
        update: (args: any) => prisma.user.update({
          ...args,
          where: {
            ...args.where,
            companyId: user.companyId,
          },
        }),
        delete: (args: any) => prisma.user.delete({
          ...args,
          where: {
            ...args.where,
            companyId: user.companyId,
          },
        }),
      },
      client: {
        ...prisma.client,
        findUnique: (args: any) => prisma.client.findUnique({
          ...args,
          where: {
            ...args.where,
            companyId: user.companyId,
          },
        }),
        findUniqueOrThrow: (args: any) => prisma.client.findUniqueOrThrow({
          ...args,
          where: {
            ...args.where,
            companyId: user.companyId,
          },
        }),
        findFirst: (args: any) => prisma.client.findFirst({
          ...args,
          where: {
            ...args.where,
            companyId: user.companyId,
          },
        }),
        findMany: (args: any) => prisma.client.findMany({
          ...args,
          where: {
            ...args.where,
            companyId: user.companyId,
          },
        }),
        update: (args: any) => prisma.client.update({
          ...args,
          where: {
            ...args.where,
            companyId: user.companyId,
          },
        }),
        delete: (args: any) => prisma.client.delete({
          ...args,
          where: {
            ...args.where,
            companyId: user.companyId,
          },
        }),
      },
      invoice: {
        ...prisma.invoice,
        findUnique: (args: any) => prisma.invoice.findUnique({
          ...args,
          where: {
            ...args.where,
            userId: user.id, // Users can only access their own invoices
          },
        }),
        findUniqueOrThrow: (args: any) => prisma.invoice.findUniqueOrThrow({
          ...args,
          where: {
            ...args.where,
            userId: user.id, // Users can only access their own invoices
          },
        }),
        findFirst: (args: any) => prisma.invoice.findFirst({
          ...args,
          where: {
            ...args.where,
            userId: user.id, // Users can only access their own invoices
          },
        }),
        findMany: (args: any) => prisma.invoice.findMany({
          ...args,
          where: {
            ...args.where,
            userId: user.id, // Users can only access their own invoices
          },
        }),
        update: (args: any) => prisma.invoice.update({
          ...args,
          where: {
            ...args.where,
            userId: user.id, // Users can only access their own invoices
          },
        }),
        delete: (args: any) => prisma.invoice.delete({
          ...args,
          where: {
            ...args.where,
            userId: user.id, // Users can only access their own invoices
          },
        }),
      },
      // Add other models as needed with appropriate scoping
      proposal: {
        ...prisma.proposal,
        findUnique: (args: any) => prisma.proposal.findUnique({
          ...args,
          where: {
            ...args.where,
            userId: user.id, // Users can only access their own proposals
          },
        }),
        findUniqueOrThrow: (args: any) => prisma.proposal.findUniqueOrThrow({
          ...args,
          where: {
            ...args.where,
            userId: user.id, // Users can only access their own proposals
          },
        }),
        findFirst: (args: any) => prisma.proposal.findFirst({
          ...args,
          where: {
            ...args.where,
            userId: user.id, // Users can only access their own proposals
          },
        }),
        findMany: (args: any) => prisma.proposal.findMany({
          ...args,
          where: {
            ...args.where,
            userId: user.id, // Users can only access their own proposals
          },
        }),
        update: (args: any) => prisma.proposal.update({
          ...args,
          where: {
            ...args.where,
            userId: user.id, // Users can only access their own proposals
          },
        }),
        delete: (args: any) => prisma.proposal.delete({
          ...args,
          where: {
            ...args.where,
            userId: user.id, // Users can only access their own proposals
          },
        }),
      },
      contract: {
        ...prisma.contract,
        findUnique: (args: any) => prisma.contract.findUnique({
          ...args,
          where: {
            ...args.where,
            userId: user.id, // Users can only access their own contracts
          },
        }),
        findUniqueOrThrow: (args: any) => prisma.contract.findUniqueOrThrow({
          ...args,
          where: {
            ...args.where,
            userId: user.id, // Users can only access their own contracts
          },
        }),
        findFirst: (args: any) => prisma.contract.findFirst({
          ...args,
          where: {
            ...args.where,
            userId: user.id, // Users can only access their own contracts
          },
        }),
        findMany: (args: any) => prisma.contract.findMany({
          ...args,
          where: {
            ...args.where,
            userId: user.id, // Users can only access their own contracts
          },
        }),
        update: (args: any) => prisma.contract.update({
          ...args,
          where: {
            ...args.where,
            userId: user.id, // Users can only access their own contracts
          },
        }),
        delete: (args: any) => prisma.contract.delete({
          ...args,
          where: {
            ...args.where,
            userId: user.id, // Users can only access their own contracts
          },
        }),
      },
      recurringInvoice: {
        ...prisma.recurringInvoice,
        findUnique: (args: any) => prisma.recurringInvoice.findUnique({
          ...args,
          where: {
            ...args.where,
            userId: user.id, // Users can only access their own recurring invoices
          },
        }),
        findUniqueOrThrow: (args: any) => prisma.recurringInvoice.findUniqueOrThrow({
          ...args,
          where: {
            ...args.where,
            userId: user.id, // Users can only access their own recurring invoices
          },
        }),
        findFirst: (args: any) => prisma.recurringInvoice.findFirst({
          ...args,
          where: {
            ...args.where,
            userId: user.id, // Users can only access their own recurring invoices
          },
        }),
        findMany: (args: any) => prisma.recurringInvoice.findMany({
          ...args,
          where: {
            ...args.where,
            userId: user.id, // Users can only access their own recurring invoices
          },
        }),
        update: (args: any) => prisma.recurringInvoice.update({
          ...args,
          where: {
            ...args.where,
            userId: user.id, // Users can only access their own recurring invoices
          },
        }),
        delete: (args: any) => prisma.recurringInvoice.delete({
          ...args,
          where: {
            ...args.where,
            userId: user.id, // Users can only access their own recurring invoices
          },
        }),
      },
      lead: {
        ...prisma.lead,
        findUnique: (args: any) => prisma.lead.findUnique({
          ...args,
          where: {
            ...args.where,
            companyId: user.companyId,
          },
        }),
        findUniqueOrThrow: (args: any) => prisma.lead.findUniqueOrThrow({
          ...args,
          where: {
            ...args.where,
            companyId: user.companyId,
          },
        }),
        findFirst: (args: any) => prisma.lead.findFirst({
          ...args,
          where: {
            ...args.where,
            companyId: user.companyId,
          },
        }),
        findMany: (args: any) => prisma.lead.findMany({
          ...args,
          where: {
            ...args.where,
            companyId: user.companyId,
          },
        }),
        update: (args: any) => prisma.lead.update({
          ...args,
          where: {
            ...args.where,
            companyId: user.companyId,
          },
        }),
        delete: (args: any) => prisma.lead.delete({
          ...args,
          where: {
            ...args.where,
            companyId: user.companyId,
          },
        }),
      },
      company: {
        ...prisma.company,
        findUnique: (args: any) => prisma.company.findUnique({
          ...args,
          where: {
            ...args.where,
            id: user.companyId!, // Users can only access their own company
          },
        }),
        findUniqueOrThrow: (args: any) => prisma.company.findUniqueOrThrow({
          ...args,
          where: {
            ...args.where,
            id: user.companyId!, // Users can only access their own company
          },
        }),
        findFirst: (args: any) => prisma.company.findFirst({
          ...args,
          where: {
            ...args.where,
            id: user.companyId!, // Users can only access their own company
          },
        }),
        findMany: (args: any) => prisma.company.findMany({
          ...args,
          where: {
            ...args.where,
            id: user.companyId!, // Users can only access their own company
          },
        }),
        update: (args: any) => prisma.company.update({
          ...args,
          where: {
            ...args.where,
            id: user.companyId!, // Users can only access their own company
          },
        }),
        delete: (args: any) => prisma.company.delete({
          ...args,
          where: {
            ...args.where,
            id: user.companyId!, // Users can only access their own company
          },
        }),
      },
    };
  }

  // For ADMIN users, restrict to their company's data
  if (user.role === 'ADMIN') {
    return {
      ...prisma,
      user: {
        ...prisma.user,
        findUnique: (args: any) => prisma.user.findUnique({
          ...args,
          where: {
            ...args.where,
            companyId: user.companyId,
          },
        }),
        findUniqueOrThrow: (args: any) => prisma.user.findUniqueOrThrow({
          ...args,
          where: {
            ...args.where,
            companyId: user.companyId,
          },
        }),
        findFirst: (args: any) => prisma.user.findFirst({
          ...args,
          where: {
            ...args.where,
            companyId: user.companyId,
          },
        }),
        findMany: (args: any) => prisma.user.findMany({
          ...args,
          where: {
            ...args.where,
            companyId: user.companyId,
          },
        }),
        update: (args: any) => prisma.user.update({
          ...args,
          where: {
            ...args.where,
            companyId: user.companyId,
          },
        }),
        delete: (args: any) => prisma.user.delete({
          ...args,
          where: {
            ...args.where,
            companyId: user.companyId,
          },
        }),
      },
      client: {
        ...prisma.client,
        findUnique: (args: any) => prisma.client.findUnique({
          ...args,
          where: {
            ...args.where,
            companyId: user.companyId,
          },
        }),
        findUniqueOrThrow: (args: any) => prisma.client.findUniqueOrThrow({
          ...args,
          where: {
            ...args.where,
            companyId: user.companyId,
          },
        }),
        findFirst: (args: any) => prisma.client.findFirst({
          ...args,
          where: {
            ...args.where,
            companyId: user.companyId,
          },
        }),
        findMany: (args: any) => prisma.client.findMany({
          ...args,
          where: {
            ...args.where,
            companyId: user.companyId,
          },
        }),
        update: (args: any) => prisma.client.update({
          ...args,
          where: {
            ...args.where,
            companyId: user.companyId,
          },
        }),
        delete: (args: any) => prisma.client.delete({
          ...args,
          where: {
            ...args.where,
            companyId: user.companyId,
          },
        }),
      },
      invoice: {
        ...prisma.invoice,
        findUnique: (args: any) => prisma.invoice.findUnique({
          ...args,
          where: {
            ...args.where,
            userId: user.id, // Users can only access their own invoices
          },
        }),
        findUniqueOrThrow: (args: any) => prisma.invoice.findUniqueOrThrow({
          ...args,
          where: {
            ...args.where,
            userId: user.id, // Users can only access their own invoices
          },
        }),
        findFirst: (args: any) => prisma.invoice.findFirst({
          ...args,
          where: {
            ...args.where,
            userId: user.id, // Users can only access their own invoices
          },
        }),
        findMany: (args: any) => prisma.invoice.findMany({
          ...args,
          where: {
            ...args.where,
            userId: user.id, // Users can only access their own invoices
          },
        }),
        update: (args: any) => prisma.invoice.update({
          ...args,
          where: {
            ...args.where,
            userId: user.id, // Users can only access their own invoices
          },
        }),
        delete: (args: any) => prisma.invoice.delete({
          ...args,
          where: {
            ...args.where,
            userId: user.id, // Users can only access their own invoices
          },
        }),
      },
      // Similar scoped access for other models for ADMIN
      proposal: {
        ...prisma.proposal,
        findUnique: (args: any) => prisma.proposal.findUnique({
          ...args,
          where: {
            ...args.where,
            userId: user.id,
          },
        }),
        findUniqueOrThrow: (args: any) => prisma.proposal.findUniqueOrThrow({
          ...args,
          where: {
            ...args.where,
            userId: user.id,
          },
        }),
        findFirst: (args: any) => prisma.proposal.findFirst({
          ...args,
          where: {
            ...args.where,
            userId: user.id,
          },
        }),
        findMany: (args: any) => prisma.proposal.findMany({
          ...args,
          where: {
            ...args.where,
            userId: user.id,
          },
        }),
        update: (args: any) => prisma.proposal.update({
          ...args,
          where: {
            ...args.where,
            userId: user.id,
          },
        }),
        delete: (args: any) => prisma.proposal.delete({
          ...args,
          where: {
            ...args.where,
            userId: user.id,
          },
        }),
      },
      contract: {
        ...prisma.contract,
        findUnique: (args: any) => prisma.contract.findUnique({
          ...args,
          where: {
            ...args.where,
            userId: user.id,
          },
        }),
        findUniqueOrThrow: (args: any) => prisma.contract.findUniqueOrThrow({
          ...args,
          where: {
            ...args.where,
            userId: user.id,
          },
        }),
        findFirst: (args: any) => prisma.contract.findFirst({
          ...args,
          where: {
            ...args.where,
            userId: user.id,
          },
        }),
        findMany: (args: any) => prisma.contract.findMany({
          ...args,
          where: {
            ...args.where,
            userId: user.id,
          },
        }),
        update: (args: any) => prisma.contract.update({
          ...args,
          where: {
            ...args.where,
            userId: user.id,
          },
        }),
        delete: (args: any) => prisma.contract.delete({
          ...args,
          where: {
            ...args.where,
            userId: user.id,
          },
        }),
      },
      recurringInvoice: {
        ...prisma.recurringInvoice,
        findUnique: (args: any) => prisma.recurringInvoice.findUnique({
          ...args,
          where: {
            ...args.where,
            userId: user.id,
          },
        }),
        findUniqueOrThrow: (args: any) => prisma.recurringInvoice.findUniqueOrThrow({
          ...args,
          where: {
            ...args.where,
            userId: user.id,
          },
        }),
        findFirst: (args: any) => prisma.recurringInvoice.findFirst({
          ...args,
          where: {
            ...args.where,
            userId: user.id,
          },
        }),
        findMany: (args: any) => prisma.recurringInvoice.findMany({
          ...args,
          where: {
            ...args.where,
            userId: user.id,
          },
        }),
        update: (args: any) => prisma.recurringInvoice.update({
          ...args,
          where: {
            ...args.where,
            userId: user.id,
          },
        }),
        delete: (args: any) => prisma.recurringInvoice.delete({
          ...args,
          where: {
            ...args.where,
            userId: user.id,
          },
        }),
      },
      lead: {
        ...prisma.lead,
        findUnique: (args: any) => prisma.lead.findUnique({
          ...args,
          where: {
            ...args.where,
            companyId: user.companyId,
          },
        }),
        findUniqueOrThrow: (args: any) => prisma.lead.findUniqueOrThrow({
          ...args,
          where: {
            ...args.where,
            companyId: user.companyId,
          },
        }),
        findFirst: (args: any) => prisma.lead.findFirst({
          ...args,
          where: {
            ...args.where,
            companyId: user.companyId,
          },
        }),
        findMany: (args: any) => prisma.lead.findMany({
          ...args,
          where: {
            ...args.where,
            companyId: user.companyId,
          },
        }),
        update: (args: any) => prisma.lead.update({
          ...args,
          where: {
            ...args.where,
            companyId: user.companyId,
          },
        }),
        delete: (args: any) => prisma.lead.delete({
          ...args,
          where: {
            ...args.where,
            companyId: user.companyId,
          },
        }),
      },
      company: {
        ...prisma.company,
        findUnique: (args: any) => prisma.company.findUnique({
          ...args,
          where: {
            ...args.where,
            id: user.companyId!,
          },
        }),
        findUniqueOrThrow: (args: any) => prisma.company.findUniqueOrThrow({
          ...args,
          where: {
            ...args.where,
            id: user.companyId!,
          },
        }),
        findFirst: (args: any) => prisma.company.findFirst({
          ...args,
          where: {
            ...args.where,
            id: user.companyId!,
          },
        }),
        findMany: (args: any) => prisma.company.findMany({
          ...args,
          where: {
            ...args.where,
            id: user.companyId!,
          },
        }),
        update: (args: any) => prisma.company.update({
          ...args,
          where: {
            ...args.where,
            id: user.companyId!,
          },
        }),
        delete: (args: any) => prisma.company.delete({
          ...args,
          where: {
            ...args.where,
            id: user.companyId!,
          },
        }),
      },
    };
  }

  // For regular USERs, they can only access their own records
  return {
    ...prisma,
    user: {
      ...prisma.user,
      findUnique: (args: any) => prisma.user.findUnique({
        ...args,
        where: {
          ...args.where,
          id: user.id, // Regular users can only access their own user data
        },
      }),
      findUniqueOrThrow: (args: any) => prisma.user.findUniqueOrThrow({
        ...args,
        where: {
          ...args.where,
          id: user.id, // Regular users can only access their own user data
        },
      }),
      findFirst: (args: any) => prisma.user.findFirst({
        ...args,
        where: {
          ...args.where,
          id: user.id, // Regular users can only access their own user data
        },
      }),
      findMany: (args: any) => prisma.user.findMany({
        ...args,
        where: {
          ...args.where,
          id: user.id, // Regular users can only access their own user data
        },
      }),
      update: (args: any) => prisma.user.update({
        ...args,
        where: {
          ...args.where,
          id: user.id, // Regular users can only access their own user data
        },
      }),
      delete: (args: any) => prisma.user.delete({
        ...args,
        where: {
          ...args.where,
          id: user.id, // Regular users can only access their own user data
        },
      }),
    },
    client: {
      ...prisma.client,
      findUnique: (args: any) => prisma.client.findUnique({
        ...args,
        where: {
          ...args.where,
          assignedToId: user.id, // Regular users can only access clients assigned to them
        },
      }),
      findUniqueOrThrow: (args: any) => prisma.client.findUniqueOrThrow({
        ...args,
        where: {
          ...args.where,
          assignedToId: user.id, // Regular users can only access clients assigned to them
        },
      }),
      findFirst: (args: any) => prisma.client.findFirst({
        ...args,
        where: {
          ...args.where,
          assignedToId: user.id, // Regular users can only access clients assigned to them
        },
      }),
      findMany: (args: any) => prisma.client.findMany({
        ...args,
        where: {
          ...args.where,
          assignedToId: user.id, // Regular users can only access clients assigned to them
        },
      }),
      update: (args: any) => prisma.client.update({
        ...args,
        where: {
          ...args.where,
          assignedToId: user.id, // Regular users can only access clients assigned to them
        },
      }),
      delete: (args: any) => prisma.client.delete({
        ...args,
        where: {
          ...args.where,
          assignedToId: user.id, // Regular users can only access clients assigned to them
        },
      }),
    },
    invoice: {
      ...prisma.invoice,
      findUnique: (args: any) => prisma.invoice.findUnique({
        ...args,
        where: {
          ...args.where,
          userId: user.id, // Regular users can only access their own invoices
        },
      }),
      findUniqueOrThrow: (args: any) => prisma.invoice.findUniqueOrThrow({
        ...args,
        where: {
          ...args.where,
          userId: user.id, // Regular users can only access their own invoices
        },
      }),
      findFirst: (args: any) => prisma.invoice.findFirst({
        ...args,
        where: {
          ...args.where,
          userId: user.id, // Regular users can only access their own invoices
        },
      }),
      findMany: (args: any) => prisma.invoice.findMany({
        ...args,
        where: {
          ...args.where,
          userId: user.id, // Regular users can only access their own invoices
        },
      }),
      update: (args: any) => prisma.invoice.update({
        ...args,
        where: {
          ...args.where,
          userId: user.id, // Regular users can only access their own invoices
        },
      }),
      delete: (args: any) => prisma.invoice.delete({
        ...args,
        where: {
          ...args.where,
          userId: user.id, // Regular users can only access their own invoices
        },
      }),
    },
    // Similar scoped access for other models for regular USERs
    proposal: {
      ...prisma.proposal,
      findUnique: (args: any) => prisma.proposal.findUnique({
        ...args,
        where: {
          ...args.where,
          userId: user.id,
        },
      }),
      findUniqueOrThrow: (args: any) => prisma.proposal.findUniqueOrThrow({
        ...args,
        where: {
          ...args.where,
          userId: user.id,
        },
      }),
      findFirst: (args: any) => prisma.proposal.findFirst({
        ...args,
        where: {
          ...args.where,
          userId: user.id,
        },
      }),
      findMany: (args: any) => prisma.proposal.findMany({
        ...args,
        where: {
          ...args.where,
          userId: user.id,
        },
      }),
      update: (args: any) => prisma.proposal.update({
        ...args,
        where: {
          ...args.where,
          userId: user.id,
        },
      }),
      delete: (args: any) => prisma.proposal.delete({
        ...args,
        where: {
          ...args.where,
          userId: user.id,
        },
      }),
    },
    contract: {
      ...prisma.contract,
      findUnique: (args: any) => prisma.contract.findUnique({
        ...args,
        where: {
          ...args.where,
          userId: user.id,
        },
      }),
      findUniqueOrThrow: (args: any) => prisma.contract.findUniqueOrThrow({
        ...args,
        where: {
          ...args.where,
          userId: user.id,
        },
      }),
      findFirst: (args: any) => prisma.contract.findFirst({
        ...args,
        where: {
          ...args.where,
          userId: user.id,
        },
      }),
      findMany: (args: any) => prisma.contract.findMany({
        ...args,
        where: {
          ...args.where,
          userId: user.id,
        },
      }),
      update: (args: any) => prisma.contract.update({
        ...args,
        where: {
          ...args.where,
          userId: user.id,
        },
      }),
      delete: (args: any) => prisma.contract.delete({
        ...args,
        where: {
          ...args.where,
          userId: user.id,
        },
      }),
    },
    recurringInvoice: {
      ...prisma.recurringInvoice,
      findUnique: (args: any) => prisma.recurringInvoice.findUnique({
        ...args,
        where: {
          ...args.where,
          userId: user.id,
        },
      }),
      findUniqueOrThrow: (args: any) => prisma.recurringInvoice.findUniqueOrThrow({
        ...args,
        where: {
          ...args.where,
          userId: user.id,
        },
      }),
      findFirst: (args: any) => prisma.recurringInvoice.findFirst({
        ...args,
        where: {
          ...args.where,
          userId: user.id,
        },
      }),
      findMany: (args: any) => prisma.recurringInvoice.findMany({
        ...args,
        where: {
          ...args.where,
          userId: user.id,
        },
      }),
      update: (args: any) => prisma.recurringInvoice.update({
        ...args,
        where: {
          ...args.where,
          userId: user.id,
        },
      }),
      delete: (args: any) => prisma.recurringInvoice.delete({
        ...args,
        where: {
          ...args.where,
          userId: user.id,
        },
      }),
    },
    lead: {
      ...prisma.lead,
      findUnique: (args: any) => prisma.lead.findUnique({
        ...args,
        where: {
          ...args.where,
          assignedToId: user.id, // Regular users can only access leads assigned to them
        },
      }),
      findUniqueOrThrow: (args: any) => prisma.lead.findUniqueOrThrow({
        ...args,
        where: {
          ...args.where,
          assignedToId: user.id, // Regular users can only access leads assigned to them
        },
      }),
      findFirst: (args: any) => prisma.lead.findFirst({
        ...args,
        where: {
          ...args.where,
          assignedToId: user.id, // Regular users can only access leads assigned to them
        },
      }),
      findMany: (args: any) => prisma.lead.findMany({
        ...args,
        where: {
          ...args.where,
          assignedToId: user.id, // Regular users can only access leads assigned to them
        },
      }),
      update: (args: any) => prisma.lead.update({
        ...args,
        where: {
          ...args.where,
          assignedToId: user.id, // Regular users can only access leads assigned to them
        },
      }),
      delete: (args: any) => prisma.lead.delete({
        ...args,
        where: {
          ...args.where,
          assignedToId: user.id, // Regular users can only access leads assigned to them
        },
      }),
    },
    company: {
      ...prisma.company,
      findUnique: (args: any) => prisma.company.findUnique({
        ...args,
        where: {
          ...args.where,
          id: user.companyId!, // Regular users can only access their own company
        },
      }),
      findUniqueOrThrow: (args: any) => prisma.company.findUniqueOrThrow({
        ...args,
        where: {
          ...args.where,
          id: user.companyId!,
        },
      }),
      findFirst: (args: any) => prisma.company.findFirst({
        ...args,
        where: {
          ...args.where,
          id: user.companyId!,
        },
      }),
      findMany: (args: any) => prisma.company.findMany({
        ...args,
        where: {
          ...args.where,
          id: user.companyId!,
        },
      }),
      update: (args: any) => prisma.company.update({
        ...args,
        where: {
          ...args.where,
          id: user.companyId!,
        },
      }),
      delete: (args: any) => prisma.company.delete({
        ...args,
        where: {
          ...args.where,
          id: user.companyId!,
        },
      }),
    },
  };
}
