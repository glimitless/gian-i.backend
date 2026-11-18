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

const toBucketFilePath = (pathname: string): (string | null) => {
  const [, mediaType, ...rest] = pathname.split('/').map(decodeURIComponent);
  const folder = mediaType ? MEDIA_FOLDERS[mediaType] : undefined;

  if(!folder || rest.length === 0 || rest.some((segment) => segment === '' || segment.startsWith('.'))){
    return null;
  }
  return [folder, ...rest].join('/');
}

const contentRange = (range: R2Range, size: number) => {
  // offset is where the slice starts, length is how many bytes to send, and suffix means the last n bytes of a file.
  const { offset, length, suffix } = range as { offset?: number; length?: number; suffix?: number }

  const start = suffix !== undefined ? Math.max(size - suffix, 0) : (offset ?? 0);
  const end = (suffix !== undefined || length === undefined) ? size - 1 : start + length - 1;

  return `bytes ${start}-${Math.min(end, size - 1)}/${size}`;
}

const rangeStartsPastEnd = (rangeHeader: string, size: number) => {
  const start = /^byte=(\d+)-/.exec(rangeHeader)?.[1];
  return start !== undefined && Number(start) >= size;
}

const hasBody = (object: (R2Object | R2ObjectBody)): object is R2ObjectBody => 'body' in object;