import { ProductStatus, ProductType } from '@prisma/client';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { buildProductListContainsFilter, normalizeProductPayload, parseProductList } from '@/lib/products';
import { ZodError } from 'zod';
import { generateUniqueProductSlug, requireAdminUser } from './utils';

export async function GET(request: Request) {
  const user = await requireAdminUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const url = new URL(request.url);
  const statusParam = url.searchParams.get('status')?.toUpperCase();
  const typeParam = url.searchParams.get('type')?.toUpperCase();
  const q = url.searchParams.get('q')?.trim();
  const tag = url.searchParams.get('tag')?.trim();

  const where: any = {};
  if (statusParam && Object.values(ProductStatus).includes(statusParam as ProductStatus)) {
    where.status = statusParam as ProductStatus;
  }
  if (typeParam && Object.values(ProductType).includes(typeParam as ProductType)) {
    where.type = typeParam as ProductType;
  }
  if (tag) {
    where.tags = buildProductListContainsFilter(tag);
  }
  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
    ];
  }

  const products = await prisma.product.findMany({
    where,
    orderBy: [
      { sortOrder: 'asc' },
      { updatedAt: 'desc' },
    ],
  });
  return NextResponse.json(
    products.map((product) => ({
      ...product,
      tags: parseProductList(product.tags),
      features: parseProductList(product.features),
    })),
  );
}

export async function POST(request: Request) {
  const user = await requireAdminUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const normalized = normalizeProductPayload(body);
    const uniqueSlug = await generateUniqueProductSlug(prisma, normalized.slug);
    const product = await prisma.product.create({
      data: { ...normalized, slug: uniqueSlug },
    });
    return NextResponse.json({
      ...product,
      tags: parseProductList(product.tags),
      features: parseProductList(product.features),
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Create product failed', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
