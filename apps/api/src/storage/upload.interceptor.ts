import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { extname } from 'path';
import { BadRequestException } from '@nestjs/common';

type UploadKind = 'image' | 'document' | 'audio';

const FILTERS: Record<UploadKind, RegExp> = {
  image: /\.(jpg|jpeg|png|gif|webp|heic|heif|bmp|avif|tif|tiff)$/i,
  document: /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|png|jpg|jpeg|gif|zip|txt|csv)$/i,
  audio: /\.(webm|ogg|mp3|m4a|aac|wav|mp4|3gp)$/i,
};

const MESSAGES: Record<UploadKind, string> = {
  image: 'Sube una imagen (jpg, png, gif, webp, heic, bmp u otra foto del celular)',
  document: 'Tipo de archivo no permitido',
  audio: 'Solo audio',
};

export function memoryUpload(opts: { maxBytes: number; kind: UploadKind }) {
  return FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: opts.maxBytes },
    fileFilter: (_req, file, cb) => {
      const nameOk = FILTERS[opts.kind].test(extname(file.originalname || ''));
      const mimeOk =
        opts.kind === 'audio'
          ? /^audio\//i.test(file.mimetype)
            || /^(video\/webm|video\/mp4|application\/octet-stream)/i.test(file.mimetype)
            || nameOk
          : opts.kind === 'image'
            ? nameOk || /^image\//i.test(file.mimetype)
            : nameOk;
      cb(mimeOk ? null : new BadRequestException(MESSAGES[opts.kind]), mimeOk);
    },
  });
}
