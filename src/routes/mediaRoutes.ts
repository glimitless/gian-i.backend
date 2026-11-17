import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import path from 'node:path';

const router = express.Router();
const forbidden = () => Object.assign(new Error('Forbidden'), { status: 403 });

const ALLOWED_ORIGINS = new Set(
  (process.env.ALLOWED_ORIGINS ?? 'https://gian-i.media')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => new URL(value).origin)
)
const ASSETS_DIR = path.resolve(import.meta.dirname, '../../src/assets')
const MEDIA_FOLDERS = {
  images: 'image',
  videos: 'video',
  pdfs: 'pdf'
} as const;

const getRequestOrigin = (req: Request): (string | undefined) => {
  const origin = req.get('origin');
  if (origin && origin !== 'null') return origin;
  
  const referer = req.get('referer')
  if (!referer) return undefined;

  try {
    return new URL(referer).origin;
  } catch {
    return undefined;
  }
}


const restrictToAllowedOrigins = (req: Request, res: Response, next: NextFunction) => {
  res.vary('Origin');
  res.vary('Referer');
  res.vary('Sec-Fetch-Site');

  const origin = getRequestOrigin(req);
  const secFetchSite = req.get('sec-fetch-site');

  if(origin) {
    if (!ALLOWED_ORIGINS.has(origin)){
      next(forbidden());
      return;
    }
    res.set({
      'Access-Control-Allow-Origin': origin,
      'Cross-Origin-Resource-Policy': 'cross-origin'
    })
  }
  // No Origin/Referer: only trust the browser's own same-site / direct-navigation signal
  else if (
    secFetchSite !== 'same-origin' 
    && secFetchSite !== 'same-site' 
    && secFetchSite !== 'none'
  ) {
    next(forbidden());
    return;
  }

  next();
}

const handleDownload = (req: Request, res: Response, next: NextFunction) => {
  if (req.query.download !== undefined) {
    res.attachment(path.basename(req.path));
  }
  next();
}

for (const [prefix, folder] of Object.entries(MEDIA_FOLDERS)) {
  router.use(
    `/${prefix}`,
    restrictToAllowedOrigins,
    handleDownload,
    express.static(path.join(ASSETS_DIR, folder), {
      maxAge: '1yr',
      index: false,
      dotfiles: 'deny',
      fallthrough: false
    })
  )
}

router.use((err:{status?: number}, _req: Request, res: Response, next:NextFunction) => {
  if(err.status === 404 || err.status === 403) {
    res.status(err.status).json({ error: err.status === 404 ? 'Not Found' : 'Forbidden' });
    return;
  }
  next(err)
})

export default router;