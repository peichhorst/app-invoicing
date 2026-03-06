export type StripeFeeConfig = {
  rateBps: number;
  fixedCents: number;
  maxCents?: number | null;
};

export type StripeFeeBreakdown = {
  applyStripeFee: boolean;
  baseAmountCents: number;
  stripeFeeCents: number;
  totalAmountCents: number;
  rateBps: number;
  fixedCents: number;
  maxCents?: number | null;
};

const DEFAULT_RATE_BPS = Number(process.env.STRIPE_FEE_RATE_BPS ?? 290); // 2.90%
const DEFAULT_FIXED_CENTS = Number(process.env.STRIPE_FEE_FIXED_CENTS ?? 30); // $0.30
const DEFAULT_ACH_RATE_BPS = Number(process.env.STRIPE_FEE_ACH_RATE_BPS ?? 80); // 0.80%
const DEFAULT_ACH_FIXED_CENTS = Number(process.env.STRIPE_FEE_ACH_FIXED_CENTS ?? 0); // $0.00
const DEFAULT_ACH_MAX_CENTS = Number(process.env.STRIPE_FEE_ACH_MAX_CENTS ?? 500); // $5.00

export type StripeFeePaymentMethod = 'card' | 'us_bank_account';

const clampInt = (value: number, fallback: number) => {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.round(value));
};

export const getStripeFeeConfig = (): StripeFeeConfig => {
  return {
    rateBps: clampInt(DEFAULT_RATE_BPS, 290),
    fixedCents: clampInt(DEFAULT_FIXED_CENTS, 30),
  };
};

export const getStripeFeeConfigForMethod = (
  method: StripeFeePaymentMethod,
): StripeFeeConfig => {
  if (method === 'us_bank_account') {
    return {
      rateBps: clampInt(DEFAULT_ACH_RATE_BPS, 80),
      fixedCents: clampInt(DEFAULT_ACH_FIXED_CENTS, 0),
      maxCents: clampInt(DEFAULT_ACH_MAX_CENTS, 500),
    };
  }
  return getStripeFeeConfig();
};

export const isTruthyFlag = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return false;
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
};

const calculateGrossForNet = (netCents: number, config: StripeFeeConfig): number => {
  const safeNet = Math.max(0, Math.round(netCents));
  if (safeNet === 0) return 0;
  const denominator = 1 - config.rateBps / 10000;
  if (denominator <= 0) return safeNet;
  return Math.ceil((safeNet + config.fixedCents) / denominator);
};

export const buildStripeFeeBreakdown = (
  baseAmountCents: number,
  applyStripeFee: boolean,
  feeConfig: StripeFeeConfig = getStripeFeeConfig(),
): StripeFeeBreakdown => {
  const safeBase = Math.max(0, Math.round(baseAmountCents));
  if (!applyStripeFee || safeBase === 0) {
    return {
      applyStripeFee: false,
      baseAmountCents: safeBase,
      stripeFeeCents: 0,
      totalAmountCents: safeBase,
      rateBps: feeConfig.rateBps,
      fixedCents: feeConfig.fixedCents,
    };
  }

  const gross = calculateGrossForNet(safeBase, feeConfig);
  let fee = Math.max(0, gross - safeBase);
  if (typeof feeConfig.maxCents === 'number' && Number.isFinite(feeConfig.maxCents)) {
    fee = Math.min(fee, Math.max(0, Math.round(feeConfig.maxCents)));
  }
  const total = safeBase + fee;

  return {
    applyStripeFee: true,
    baseAmountCents: safeBase,
    stripeFeeCents: fee,
    totalAmountCents: total,
    rateBps: feeConfig.rateBps,
    fixedCents: feeConfig.fixedCents,
    maxCents: feeConfig.maxCents ?? null,
  };
};
