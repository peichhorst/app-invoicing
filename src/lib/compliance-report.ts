import prisma from '@/lib/prisma';

type ComplianceReportEntry = {
  overall: {
    acknowledged: number;
    total: number;
    percentage: number;
  };
  byPosition: {
    position: string;
    acknowledged: number;
    total: number;
    percentage: number;
  }[];
  perResource: {
    resourceId: string;
    title: string;
    acknowledged: number;
    total: number;
  }[];
};

const DEFAULT_POSITION = 'Unassigned';

export function resolveSince(period?: string): Date | null {
  if (period === '30') {
    return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  }
  return null;
}

export async function buildComplianceReport(companyId: string, since?: Date | null): Promise<ComplianceReportEntry> {
  const resourceWhere: Record<string, unknown> = { companyId, requiresAcknowledgment: true };
  if (since) {
    resourceWhere.createdAt = { gte: since };
  }

  const [resources, users, positions] = await Promise.all([
    prisma.resource.findMany({
      where: resourceWhere,
      select: {
        id: true,
        title: true,
        visibleToPositions: true,
        acknowledgments: {
          where: since
            ? {
                acknowledgedAt: { gte: since },
              }
            : undefined,
          select: {
            userId: true,
          },
        },
      },
    }),
    prisma.user.findMany({
      where: { companyId },
      select: { id: true, positionId: true },
    }),
    prisma.position.findMany({
      where: { companyId },
      select: { id: true, name: true },
    }),
  ]);

  const userPosition = new Map(users.map((user) => [user.id, user.positionId]));
  const positionNameById = new Map(positions.map((pos) => [pos.id, pos.name]));
  const getPositionKey = (userId: string) => {
    const id = userPosition.get(userId);
    return (id && positionNameById.get(id)) ?? DEFAULT_POSITION;
  };

  const companyUserIds = new Set(users.map((user) => user.id));

  const getAllowedIds = (resource: typeof resources[number]) => {
    if (!resource.visibleToPositions || resource.visibleToPositions.length === 0) {
      return new Set(companyUserIds);
    }
    const allowed = users
      .filter((user) => user.positionId && resource.visibleToPositions.includes(user.positionId))
      .map((user) => user.id);
    return new Set(allowed);
  };

  const perResource = resources.map((resource) => {
    const allowedSet = getAllowedIds(resource);
    const acknowledged = resource.acknowledgments.filter((ack) => allowedSet.has(ack.userId)).length;
    return {
      resourceId: resource.id,
      title: resource.title,
      acknowledged,
      total: allowedSet.size,
    };
  });

  const overallAcknowledged = perResource.reduce((sum, entry) => sum + entry.acknowledged, 0);
  const totalRequired = perResource.reduce((sum, entry) => sum + entry.total, 0);
  const overallPercentage = totalRequired ? Math.round((overallAcknowledged / totalRequired) * 100) : 0;

  const positionStats: Record<string, { total: number; acknowledged: number }> = {};
  const addPosition = (position: string) => {
    if (!positionStats[position]) {
      positionStats[position] = { total: 0, acknowledged: 0 };
    }
    return positionStats[position];
  };

  resources.forEach((resource) => {
    const allowedSet = getAllowedIds(resource);
    allowedSet.forEach((userId) => {
      const key = getPositionKey(userId);
      addPosition(key).total += 1;
    });
    resource.acknowledgments.forEach((ack) => {
      if (!allowedSet.has(ack.userId)) return;
      const key = getPositionKey(ack.userId);
      addPosition(key).acknowledged += 1;
    });
  });

  const byPosition = Object.entries(positionStats).map(([position, values]) => {
    const percentage = values.total ? Math.round((values.acknowledged / values.total) * 100) : 0;
    return {
      position,
      acknowledged: values.acknowledged,
      total: values.total,
      percentage,
    };
  });

  return {
    overall: {
      acknowledged: overallAcknowledged,
      total: totalRequired,
      percentage: overallPercentage,
    },
    byPosition,
    perResource,
  };
}
