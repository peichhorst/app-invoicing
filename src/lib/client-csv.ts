export const CLIENT_CSV_HEADERS = [
  'Company',
  'Contact name',
  'Email',
  'Phone',
  'Address line 1',
  'Address line 2',
  'City',
  'State',
  'Postal code',
  'Country',
  'Notes',
];

type ClientCsvField =
  | 'companyName'
  | 'contactName'
  | 'email'
  | 'phone'
  | 'addressLine1'
  | 'addressLine2'
  | 'city'
  | 'state'
  | 'postalCode'
  | 'country'
  | 'notes';

export const CLIENT_CSV_FIELD_MAP: Record<string, ClientCsvField> = {
  company: 'companyName',
  'company name': 'companyName',
  contact: 'contactName',
  'contact name': 'contactName',
  email: 'email',
  phone: 'phone',
  'address line 1': 'addressLine1',
  'address line 2': 'addressLine2',
  city: 'city',
  state: 'state',
  'postal code': 'postalCode',
  country: 'country',
  notes: 'notes',
};

export function normalizeCsvHeader(value: string) {
  return value
    .replace(/^\ufeff/, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, ' ');
}
