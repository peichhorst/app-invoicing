import { ProductStatus, ProductType } from '@prisma/client';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const SAFE_PRODUCT_FIELDS = {
  select: {
    id: true,
    name: true,
    slug: true,
    description: true,
    features: true,
    type: true,
    unitAmount: true,
    currency: true,
    interval: true,
    intervalCount: true,
    tags: true,
    sortOrder: true,
  },
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tagParam = url.searchParams.get('tags');
  const typeParam = url.searchParams.get('type')?.toUpperCase();
  const q = url.searchParams.get('q')?.trim();
  const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
  const perPage = Math.min(100, Math.max(1, Number(url.searchParams.get('per_page') ?? 20)));

  const where: any = { status: ProductStatus.ACTIVE };
  if (typeParam && Object.values(ProductType).includes(typeParam as ProductType)) {
    where.type = typeParam as ProductType;
  }
  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
    ];
  }
  if (tagParam) {
    const tags = tagParam.split(',').map((tag) => tag.trim()).filter(Boolean);
    if (tags.length) {
      where.tags = { array_contains: tags };
    }
  }

  const products = await prisma.product.findMany({
    where,
    orderBy: [
      { sortOrder: 'asc' },
      { updatedAt: 'desc' },
    ],
    skip: (page - 1) * perPage,
    take: perPage,
    ...SAFE_PRODUCT_FIELDS,
  });

  return NextResponse.json(products, {
    headers: { 'Cache-Control': 'public, max-age=60' },
  });
}
