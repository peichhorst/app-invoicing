export const LEAD_CSV_HEADERS = [
  'Name',
  'Company',
  'Email',
  'Phone',
  'Status',
  'Source',
  'Notes',
];

type LeadCsvField =
  | 'name'
  | 'companyName'
  | 'email'
  | 'phone'
  | 'status'
  | 'source'
  | 'notes';

export const LEAD_CSV_FIELD_MAP: Record<string, LeadCsvField> = {
  name: 'name',
  company: 'companyName',
  'company name': 'companyName',
  email: 'email',
  phone: 'phone',
  status: 'status',
  source: 'source',
  notes: 'notes',
};

export function normalizeLeadCsvHeader(value: string) {
  return value
    .replace(/^\ufeff/, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, ' ');
}
