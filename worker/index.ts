const MEDIA_FOLDERS: Record<string, string> = {
  images: 'image',
  videos: 'video',
  pdfs: 'pdf'
}
const ONE_YEAR = 60 * 60 * 24 * 365;

const parseAllowedOrigins = (value: string | undefined) => new Set(
  (value ?? 'https://gian-i.media')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => new URL(value).origin)
);

const getRequestOrigin = (request:Request): (string | undefined) => {
  const origin = request.headers.get('origin');
  if (origin && origin !== 'null') return origin;

  const referer = request.headers.get('referer');
  if (!referer) return undefined;

  try {
    return new URL(referer).origin;
  } catch {
    return undefined;
  }
}

const checkOrigin = (request: Request, allowedOrigins: Set<string>): (Headers | null) => {
  const headers = new Headers({ 'Vary': 'Origin, Referer, Sec-Fetch-Site' });
  const origin = getRequestOrigin(request);

  if (origin) {
    if (!allowedOrigins.has(origin)) return null;
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Cross-Origin-Resource-Policy', 'cross-origin')
  }

  return headers;
}

const errorResponse = (status: (403 | 404 | 405 | 416), headers?: Headers) => {
  const messages = { 
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    416: 'Range Not Satisfiable'
  };
  const response = Response.json({ error: messages[status] }, { status });
  
  headers?.forEach((value, key) => response.headers.set(key, value));
  return response;
}

