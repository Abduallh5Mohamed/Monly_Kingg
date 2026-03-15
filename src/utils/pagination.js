// SECURITY FIX [M-06]: Centralized pagination sanitizer with strict page/limit caps.
export function safePaginate(query, defaultLimit = 20, maxLimit = 100) {
  const pageRaw = Number.parseInt(query?.page, 10);
  const limitRaw = Number.parseInt(query?.limit, 10);

  const page = Number.isFinite(pageRaw) ? Math.max(1, pageRaw) : 1;
  const limitBase = Number.isFinite(limitRaw) ? limitRaw : defaultLimit;
  const limit = Math.min(maxLimit, Math.max(1, limitBase));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}
