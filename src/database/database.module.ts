import { Global, Module } from '@nestjs/common';
import { JsonDbService } from './json-db.service.js';

@Global()
@Module({
  providers: [JsonDbService],
  exports: [JsonDbService],
})
export class DatabaseModule {}
