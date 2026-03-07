import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service.js';
import { CryptoService } from './crypto.service.js';
import { DatabaseModule } from '../database/database.module.js';

@Module({
  imports: [DatabaseModule],
  providers: [WalletService, CryptoService],
  exports: [WalletService, CryptoService],
})
export class WalletModule {}
