import * as crypto from 'crypto';

export class CacheKeyGenerator {
  private static readonly MAX_KEY_LENGTH = 200;


  static generate(...parts: unknown[]): string {
    const stringParts = parts.map((part) => {
      if (part === null || part === undefined) return 'null';
      if (typeof part === 'object') return JSON.stringify(part);
      return String(part);
    });
    let key = stringParts.join(':');
    key = key.replace(/[\x00-\x1F\x7F]/g, '');
    if (key.length > this.MAX_KEY_LENGTH) {                                                                                                                         
      key = `LONG_KEY:${crypto.createHash('md5').update(key).digest('hex')}`;
    }

    return key;
  }
}