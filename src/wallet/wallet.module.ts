import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletService } from './wallet.service.js';
import { CryptoService } from './crypto.service.js';
import { Agent } from '../agent/entities/agent.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Agent])],
  providers: [WalletService, CryptoService],
  exports: [WalletService, CryptoService],
})
export class WalletModule {}
