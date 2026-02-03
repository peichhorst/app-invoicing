declare module 'psl' {
  export interface ParseResult {
    tld?: string;
    sld?: string;
    domain?: string;
    subdomain?: string;
    listed?: boolean;
    input?: string;
  }

  export function parse(value: string): ParseResult;

  export default {
    parse,
  };
}
