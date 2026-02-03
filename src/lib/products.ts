import { ProductInterval, ProductStatus, ProductType } from '@prisma/client';
import { z } from 'zod';

const sanitizeSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

export const slugifyProduct = (value: string) => sanitizeSlug(value ?? '');

const arrayOfStrings = z.array(z.string().trim()).optional();

const normalizeList = (values: Array<string | null | undefined>) =>
  values
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter((value) => value.length > 0);

export const serializeProductList = (values?: Array<string | null | undefined> | null) =>
  JSON.stringify(normalizeList(values ?? []));

export const parseProductList = (value?: string | string[] | null) => {
  if (!value) return [];
  if (Array.isArray(value)) return normalizeList(value);
  const trimmed = value.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return normalizeList(parsed);
  } catch {
    // fall through to comma parsing
  }
  return normalizeList(trimmed.split(','));
};

export const buildProductListContainsFilter = (value: string) => ({
  contains: JSON.stringify(value),
});

export const productPayloadSchema = z
  .object({
    name: z.string().trim().min(1),
    slug: z.string().trim().optional(),
    description: z.string().trim().optional(),
    features: arrayOfStrings,
    tags: arrayOfStrings,
    type: z.nativeEnum(ProductType),
    status: z.nativeEnum(ProductStatus).optional(),
    unitAmount: z.number().int().min(0),
    currency: z.string().trim().toLowerCase().default('usd'),
    interval: z.nativeEnum(ProductInterval).optional().nullable(),
    intervalCount: z.number().int().optional(),
    sortOrder: z.number().int().optional(),
    stripeProductId: z.string().trim().optional(),
    stripePriceId: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === ProductType.SUBSCRIPTION) {
      if (!data.interval) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Subscription products require an interval',
          path: ['interval'],
        });
      }
      const count = data.intervalCount ?? 0;
      if (count < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Subscription products require intervalCount >= 1',
          path: ['intervalCount'],
        });
      }
    } else if (data.type === ProductType.ONE_TIME) {
      if (data.interval) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'One-time products cannot have an interval',
          path: ['interval'],
        });
      }
    }
  });

export type ProductPayload = z.infer<typeof productPayloadSchema>;

export type NormalizedProductPayload = Omit<ProductPayload, 'features' | 'tags'> & {
  features: string;
  tags: string;
  slug: string;
};

export function normalizeProductPayload(body: unknown): NormalizedProductPayload {
  const base =
    body && typeof body === 'object' ? { ...(body as Record<string, unknown>) } : body;
  if (base && typeof base === 'object') {
    if ('features' in base) {
      base.features = parseProductList(base.features as string | string[] | null);
    }
    if ('tags' in base) {
      base.tags = parseProductList(base.tags as string | string[] | null);
    }
  }
  const payload = productPayloadSchema.parse(base);
  const normalizedSlug = slugifyProduct(payload.slug ?? payload.name);
  return {
    ...payload,
    slug: normalizedSlug,
    features: serializeProductList(payload.features),
    tags: serializeProductList(payload.tags),
  };
}
