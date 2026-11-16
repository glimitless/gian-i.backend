import express from 'express';
import type { Request, Response, NextFunction } from 'express';
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

const allowCrossOrigin = (req: Request, res: Response, next: NextFunction) => {

  res.set({
    'Access-Control-Allow-Origin': 'https://gian-i.media',
    'Cross-Origin-Resource-Policy': 'cross-origin'
  })
  next();
}





export default router;