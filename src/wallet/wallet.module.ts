import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletService } from './wallet.service';
import { CryptoService } from './crypto.service';
import { Agent } from '../agent/entities/agent.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Agent])],
  providers: [WalletService, CryptoService],
  exports: [WalletService, CryptoService],
})
export class WalletModule {}
