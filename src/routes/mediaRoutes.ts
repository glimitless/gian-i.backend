import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { error } from 'node:console';
import path from 'node:path';

const router = express.Router();

const ALLOWED_ORIGINS = [
  'https://gian-i.media'
]
const ASSETS_DIR = path.resolve(import.meta.dirname, '../src/assets')
const MEDIA_FOLDERS = {
  images: 'image',
  videos: 'video',
  pdfs: 'pdf'
} as const;

const allowCrossOrigin = (_req: Request, res: Response, next: NextFunction) => {
  res.set({
    'Access-Control-Allow-Origin': 'https://gian-i.media',
    'Cross-Origin-Resource-Policy': 'cross-origin'
  });
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
    allowCrossOrigin,
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