import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

@Injectable()
export class CryptoService {
  encrypt(data: string, key: Buffer): { data: string; iv: string; tag: string } {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    return {
      data: encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
    };
  }

  decrypt(payload: { data: string; iv: string; tag: string }, key: Buffer): string {
    const decipher = createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(payload.iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(payload.tag, 'hex'));
    
    let decrypted = decipher.update(payload.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
