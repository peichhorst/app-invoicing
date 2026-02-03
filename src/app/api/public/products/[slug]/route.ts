import { ProductStatus } from '@prisma/client';
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

export async function GET(
  _request: Request,
  context: { params: Promise<Record<string, string | string[] | undefined>> },
) {
  const params = await context.params;
  const slug = typeof params?.slug === 'string' ? params.slug : undefined;
  if (!slug) {
    return NextResponse.json({ error: 'Missing product slug' }, { status: 400 });
  }

  const product = await prisma.product.findFirst({
    where: { slug, status: ProductStatus.ACTIVE },
    ...SAFE_PRODUCT_FIELDS,
  });
  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }
  return NextResponse.json(product, {
    headers: { 'Cache-Control': 'public, max-age=60' },
  });
}
