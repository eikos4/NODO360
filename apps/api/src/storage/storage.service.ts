import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly uploadsDir = join(process.cwd(), 'uploads');
  private readonly cloudinaryReady: boolean;

  constructor(private readonly config: ConfigService) {
    if (!existsSync(this.uploadsDir)) {
      mkdirSync(this.uploadsDir, { recursive: true });
    }

    const url = this.config.get<string>('CLOUDINARY_URL');
    const cloudName = this.config.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.config.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.config.get<string>('CLOUDINARY_API_SECRET');

    if (url) {
      process.env.CLOUDINARY_URL = url;
      cloudinary.config(true);
      this.cloudinaryReady = true;
    } else if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
      this.cloudinaryReady = true;
    } else {
      this.cloudinaryReady = false;
    }

    this.logger.log(
      this.cloudinaryReady
        ? 'Storage: Cloudinary (persistente)'
        : 'Storage: disco local (solo desarrollo — se pierde en Render)',
    );
  }

  /**
   * Sube un archivo a Cloudinary si está configurado; si no, a disco local.
   * Devuelve una URL pública permanente (Cloudinary) o /uploads/... (local).
   */
  async uploadFile(file: any, hostUrl?: string, folder = 'nodo360'): Promise<string> {
    const buffer = this.toBuffer(file);
    const original = file.originalname || `file-${Date.now()}`;
    const uniqueName = `${Date.now()}-${randomUUID()}${extname(original)}`;

    if (this.cloudinaryReady) {
      return this.uploadToCloudinary(buffer, uniqueName, folder, file.mimetype);
    }

    const filePath = join(this.uploadsDir, uniqueName);
    writeFileSync(filePath, buffer);
    const base = (hostUrl ?? '').replace(/\/$/, '');
    return `${base}/uploads/${uniqueName}`;
  }

  private toBuffer(file: any): Buffer {
    if (file?.buffer && Buffer.isBuffer(file.buffer)) return file.buffer;
    if (file?.path) return readFileSync(file.path);
    throw new Error('Archivo sin contenido');
  }

  private uploadToCloudinary(
    buffer: Buffer,
    filename: string,
    folder: string,
    mimeType?: string,
  ): Promise<string> {
    const resourceType = this.resourceType(mimeType, filename);
    const publicId = filename.replace(/\.[^.]+$/, '');

    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: publicId,
          resource_type: resourceType,
          overwrite: false,
        },
        (err, result) => {
          if (err || !result?.secure_url) {
            this.logger.error('Cloudinary upload falló', err);
            reject(new Error('No se pudo subir el archivo'));
            return;
          }
          resolve(result.secure_url);
        },
      );
      stream.end(buffer);
    });
  }

  private resourceType(mimeType: string | undefined, filename: string): 'image' | 'video' | 'raw' | 'auto' {
    if (mimeType?.startsWith('image/')) return 'image';
    if (mimeType?.startsWith('audio/') || mimeType?.startsWith('video/')) return 'video';
    if (/\.(webm|ogg|mp3|m4a|wav)$/i.test(filename)) return 'video';
    if (/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|txt|csv)$/i.test(filename)) return 'raw';
    return 'auto';
  }
}
