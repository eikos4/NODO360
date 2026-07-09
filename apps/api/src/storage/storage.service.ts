import { Injectable, Logger } from '@nestjs/common';
import { extname, join } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { randomUUID } from 'crypto';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly uploadsDir = join(process.cwd(), 'uploads');

  constructor() {
    if (!existsSync(this.uploadsDir)) {
      mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  /**
   * Sube un archivo.
   * NOTA PARA PRODUCCIÓN: Si despliegas en Render/Heroku, debes cambiar esta implementación
   * para usar AWS S3, Cloudinary o Supabase Storage.
   */
  async uploadFile(file: any, hostUrl: string): Promise<string> {
    try {
      // 1. AWS S3 / Cloudinary Implementation here:
      // const result = await cloudinary.uploader.upload(file.buffer, ...);
      // return result.secure_url;

      // 2. Fallback to Local Disk (Not recommended for ephemeral servers)
      const uniqueName = `${Date.now()}-${randomUUID()}${extname(file.originalname)}`;
      const filePath = join(this.uploadsDir, uniqueName);
      
      writeFileSync(filePath, file.buffer);
      
      return `${hostUrl}/uploads/${uniqueName}`;
    } catch (error) {
      this.logger.error('Error subiendo archivo', error);
      throw new Error('No se pudo subir el archivo');
    }
  }
}
