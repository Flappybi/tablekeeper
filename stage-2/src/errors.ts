export class ApiError extends Error { constructor(public status: number, public code: string) { super(code.replaceAll('_', ' ')); } }
export function check(value: any, status = 422, code = 'validation_failed'): asserts value { if (!value) throw new ApiError(status, code); }
export const object = (v: any) => v !== null && typeof v === 'object' && !Array.isArray(v);
export const integer = (v: any, min: number, max = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(v) && v >= min && v <= max;
export function body(v: any) { check(object(v), 400, 'malformed_request'); return v; }
export function text(v: any) { check(v !== undefined); check(typeof v === 'string', 400, 'malformed_request'); check(v.length > 0 && v.length <= 64); return v as string; }
export function canonical(v: any): string { if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`; if (object(v)) return `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`; return JSON.stringify(v); }
