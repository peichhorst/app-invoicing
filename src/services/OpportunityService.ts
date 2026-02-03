import prisma from '@/lib/prisma';
import { Opportunity, OpportunitySearchParams, OpportunityStage } from '@/types/opportunity';
import { Decimal } from '@prisma/client/runtime/library';

export class OpportunityService {
  /**
   * Create a new opportunity
   */
  static async create(userId: string, clientId: string, data: Partial<Opportunity>) {
    const opportunity = await prisma.opportunity.create({
      data: {
        userId,
        clientId,
        title: data.title || 'Untitled Opportunity',
        description: data.description,
        value: new Decimal(data.value || 0),
        currency: data.currency || 'USD',
        probability: data.probability || 0,
        stage: data.stage || 'prospect',
        pipelineId: data.pipelineId || 'default',
        assignedToId: data.assignedToId || userId, // default to creator
        estimatedCloseDate: data.estimatedCloseDate || undefined,
        actualCloseDate: data.actualCloseDate || undefined,
        source: data.source || 'direct',
        tags: data.tags || [],
        priority: data.priority || 'medium',
        nextActionDate: data.nextActionDate || undefined,
        nextAction: data.nextAction,
        notes: data.notes,
        customFields: data.customFields || undefined,
        lastActivityDate: new Date(), // Set to now when created
      },
    });

    return opportunity;
  }

  /**
   * Get opportunity by ID
   */
  static async getById(id: string, userId: string) {
    return await prisma.opportunity.findUnique({
      where: {
        id,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        client: {
          select: {
            id: true,
            companyName: true,
            contactName: true,
            email: true,
          }
        }
      }
    });
  }

  /**
   * Update an opportunity
   */
  static async update(id: string, userId: string, data: Partial<Opportunity>) {
    // Update last activity date
    const updateData: any = {
      ...data,
      lastActivityDate: new Date(),
      updatedAt: new Date(),
    };

    // Handle value as Decimal
    if (data.value !== undefined) {
      updateData.value = new Decimal(data.value);
    }

    const opportunity = await prisma.opportunity.update({
      where: {
        id,
        userId,
      },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        client: {
          select: {
            id: true,
            companyName: true,
            contactName: true,
          }
        }
      }
    });

    return opportunity;
  }

  /**
   * Delete an opportunity
   */
  static async delete(id: string, userId: string) {
    return await prisma.opportunity.delete({
      where: {
        id,
        userId,
      },
    });
  }

  /**
   * Search opportunities with filters
   */
  static async search(userId: string, params: OpportunitySearchParams = {}) {
    const {
      query,
      stage,
      source,
      priority,
      min_value,
      max_value,
      probability_min,
      probability_max,
      assigned_to,
      created_after,
      created_before,
      tags,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = params;

    const whereClause: any = {
      userId,
    };

    // Full-text search on title and description
    if (query) {
      whereClause.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ];
    }

    // Filter by stage
    if (stage && stage.length > 0) {
      whereClause.stage = { in: stage };
    }

    // Filter by source
    if (source && source.length > 0) {
      whereClause.source = { in: source };
    }

    // Filter by priority
    if (priority && priority.length > 0) {
      whereClause.priority = { in: priority };
    }

    // Value range filters
    if (min_value !== undefined) {
      whereClause.value = { gte: new Decimal(min_value) };
    }
    if (max_value !== undefined) {
      whereClause.value = { ...whereClause.value, lte: new Decimal(max_value) };
    }

    // Probability range filters
    if (probability_min !== undefined) {
      whereClause.probability = { gte: probability_min };
    }
    if (probability_max !== undefined) {
      whereClause.probability = { ...whereClause.probability, lte: probability_max };
    }

    // Assigned to filter
    if (assigned_to) {
      whereClause.assignedToId = assigned_to;
    }

    // Date range filters
    if (created_after) {
      whereClause.createdAt = { gte: created_after };
    }
    if (created_before) {
      whereClause.createdAt = { ...whereClause.createdAt, lte: created_before };
    }

    // Tags filter (opportunities that have ALL specified tags)
    if (tags && tags.length > 0) {
      whereClause.tags = {
        hasEvery: tags,
      };
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Sorting mapping
    const orderByMap: Record<string, 'asc' | 'desc'> = {};
    switch (sortBy) {
      case 'value':
        orderByMap.value = sortOrder;
        break;
      case 'probability':
        orderByMap.probability = sortOrder;
        break;
      case 'estimated_close_date':
        orderByMap.estimatedCloseDate = sortOrder;
        break;
      case 'created_at':
      default:
        orderByMap.createdAt = sortOrder;
        break;
    }

    const [opportunities, totalCount] = await Promise.all([
      prisma.opportunity.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              name: true,
            }
          },
          client: {
            select: {
              id: true,
              companyName: true,
              contactName: true,
            }
          }
        },
        orderBy: [orderByMap],
        skip,
        take: limit,
      }),
      prisma.opportunity.count({ where: whereClause }),
    ]);

    return {
      opportunities,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
    };
  }

  /**
   * Move opportunity to next stage in pipeline
   */
  static async moveStage(id: string, userId: string, newStage: OpportunityStage) {
    const opportunity = await prisma.opportunity.update({
      where: {
        id,
        userId,
      },
      data: {
        stage: newStage,
        lastActivityDate: new Date(),
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          }
        },
        client: {
          select: {
            id: true,
            companyName: true,
            contactName: true,
          }
        }
      }
    });

    return opportunity;
  }

  /**
   * Update opportunity probability
   */
  static async updateProbability(id: string, userId: string, probability: number) {
    if (probability < 0 || probability > 100) {
      throw new Error('Probability must be between 0 and 100');
    }

    const opportunity = await prisma.opportunity.update({
      where: {
        id,
        userId,
      },
      data: {
        probability,
        lastActivityDate: new Date(),
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          }
        },
        client: {
          select: {
            id: true,
            companyName: true,
            contactName: true,
          }
        }
      }
    });

    return opportunity;
  }

  /**
   * Get opportunity metrics
   */
  static async getMetrics(userId: string) {
    const [
      totalOpportunities,
      totalValue,
      averageDealSize,
      pipelineValueByStage,
      winRate,
      avgSalesCycle
    ] = await Promise.all([
      // Total opportunities
      prisma.opportunity.count({
        where: { userId }
      }),

      // Total pipeline value
      prisma.opportunity.aggregate({
        where: { userId },
        _sum: { value: true }
      }).then(result => result._sum.value),

      // Average deal size
      prisma.opportunity.aggregate({
        where: { userId },
        _avg: { value: true }
      }).then(result => result._avg.value),

      // Pipeline value by stage
      Promise.all([
        prisma.opportunity.groupBy({
          by: ['stage'],
          where: { userId },
          _count: { id: true },
          _sum: { value: true }
        })
      ]).then(([results]) => {
        const mapped: Record<OpportunityStage, { count: number; value: Decimal | null }> = {
          prospect: { count: 0, value: new Decimal(0) },
          qualified: { count: 0, value: new Decimal(0) },
          proposal_sent: { count: 0, value: new Decimal(0) },
          negotiation: { count: 0, value: new Decimal(0) },
          won: { count: 0, value: new Decimal(0) },
          lost: { count: 0, value: new Decimal(0) },
        };

        results.forEach(result => {
          if (result.stage in mapped) {
            mapped[result.stage as OpportunityStage] = {
              count: result._count.id,
              value: result._sum.value || new Decimal(0)
            };
          }
        });

        return mapped;
      }),

      // Win rate (won / (won + lost))
      prisma.opportunity.count({
        where: { 
          userId,
          stage: 'won'
        }
      }).then(won => {
        return prisma.opportunity.count({
          where: { 
            userId,
            stage: { in: ['won', 'lost'] }
          }
        }).then(total => {
          return total > 0 ? (won / total) * 100 : 0;
        });
      }),

      // Average sales cycle (days between creation and close for won deals)
      prisma.opportunity.aggregate({
        where: { 
          userId,
          stage: 'won',
          createdAt: { not: null },
          actualCloseDate: { not: null }
        },
        _avg: {
          // Calculate difference between createdAt and actualCloseDate in days
          // Note: This requires a custom calculation since Prisma doesn't have date diff functions
        }
      }).then(result => {
        // Placeholder - would need to calculate this differently
        return 0;
      })
    ]);

    return {
      totalOpportunities,
      totalValue: totalValue || new Decimal(0),
      averageDealSize: averageDealSize || new Decimal(0),
      winRate,
      avgSalesCycle: avgSalesCycle || 0,
      pipelineValueByStage,
    };
  }
}