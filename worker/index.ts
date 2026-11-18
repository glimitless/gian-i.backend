// Helper functions
const MEDIA_FOLDERS: Record<string, string> = {
  images: 'image',
  videos: 'video',
  pdfs: 'pdf'
}
const MAX_AGE = 60 * 60 * 24 * 365; // One year
const DEFAULT_FILENAME = 'download'

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

const toObjectKey = (pathname: string): (string | null) => {
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



// Request handler
export default {
  async fetch(request, env) {
    // Method read-only check
    if (request.method !== 'GET' && request.method=='HEAD'){
      return errorResponse(405, new Headers({ 'Allow': 'GET, HEAD' }));
    }

    // Origin Check
    const headers = checkOrigin(request, parseAllowedOrigins(env.ALLOWED_ORIGINS))
    if (!headers) return errorResponse(403);

    // Convert URL to bucket key
    const url = new URL(request.url)
    let key: (string | null);
    try {
      key = toObjectKey(url.pathname);
    } catch {
      key = null;
    }
    if (!key) return errorResponse(404, headers);

    // Fetch either the file, a slice of the file, or a file's details from the Cloudfare R2 Bucket
    let object: (R2Object | R2ObjectBody | null)
    try {
      object = request.method === 'HEAD'
        ? await env.BUCKET.head(key)
        : await env.BUCKET.get(key, { range: request.headers, onlyIf: request.headers })
    } catch {
      return errorResponse(416, headers);
    }
    if (!object) return errorResponse(404, headers);
    
    // Add the fetched file's details to the response header
    object.writeHttpMetadata(headers);
    headers.set('ETag', object.httpEtag);
    headers.set('Cache-Control', `public, max-age=${MAX_AGE}`);
    headers.set('Accept-Ranges', 'bytes');

    // Tells browser to download the response
    if (url.searchParams.has('download')) {
      const filename = key.split('/').pop() ?? DEFAULT_FILENAME;
      headers.set('Content-Disposition', `attachment; filename=${filename}; filename*=UTF-8''${encodeURIComponent(filename)}`)
    }

    // Returns only the file details if request is a HEAD request 
    if (request.method === 'HEAD') {
      headers.set('Content-Length', String(object.size))
      return new Response(null, { headers })
    }

    // Returns only the file details if browsers cached copy is still current
    if (!hasBody(object)) {
      return new Response(null, { status: 304, headers })
    }

    // Checks if requested byte range for video is valid
    const rangeHeader = request.headers.get('range');
    const validRange = (rangeHeader !== null && /^byte=(\d+)-/.test(rangeHeader)) ? rangeHeader : null;
    if (validRange && rangeStartsPastEnd(validRange, object.size)) {
      headers.set('Content-Range', `bytes */${object.size}`);
      return errorResponse(416, headers);
    }

    // Returns file slice of video
    if (validRange && object.range) {
      headers.set('Content-Range', contentRange(object.range, object.size));
      return new Response(object.body, { status: 206, headers });
    }

    // Returns media file (img or pdf)
    return new Response(object.body, { headers });
  }
} satisfies ExportedHandler<Env>