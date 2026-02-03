import { ProductStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { normalizeProductPayload, parseProductList } from '@/lib/products';
import { generateUniqueProductSlug, requireAdminUser } from '../utils';
import { ZodError } from 'zod';

function extractRouteId(request: Request) {
  const url = new URL(request.url);
  const segments = url.pathname.split('/').filter(Boolean);
  return segments[segments.length - 1] ?? null;
}

export async function GET(request: Request) {
  const user = await requireAdminUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const id = extractRouteId(request);
  if (!id) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }
  return NextResponse.json({
    ...product,
    tags: parseProductList(product.tags),
    features: parseProductList(product.features),
  });
}

export async function PATCH(request: Request) {
  const user = await requireAdminUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const id = extractRouteId(request);
  if (!id) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const normalized = normalizeProductPayload({ ...existing, ...body });
    const uniqueSlug = await generateUniqueProductSlug(prisma, normalized.slug, existing.id);
    const updated = await prisma.product.update({
      where: { id: existing.id },
      data: { ...normalized, slug: uniqueSlug },
    });
    return NextResponse.json({
      ...updated,
      tags: parseProductList(updated.tags),
      features: parseProductList(updated.features),
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Update product failed', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(_request: Request) {
  const user = await requireAdminUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const id = extractRouteId(_request);
  if (!id) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  const archived = await prisma.product.update({
    where: { id: existing.id },
    data: { status: ProductStatus.ARCHIVED },
  });
  return NextResponse.json(archived);
}
