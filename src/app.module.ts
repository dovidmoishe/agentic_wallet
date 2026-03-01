import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { WalletModule } from './wallet/wallet.module.js';
import { AgentModule } from './agent/agent.module.js';
import databaseConfig from './config/database.config.js';
import { Agent } from './agent/entities/agent.entity.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get('database.url'),
        ssl: configService.get('database.ssl'),
        connectTimeoutMS: configService.get('database.connectTimeoutMS'),
        statementTimeoutMS: configService.get('database.statementTimeoutMS'),
        acquireConnectionTimeout: configService.get('database.acquireConnectionTimeout'),
        retryAttempts: configService.get('database.retryAttempts'),
        retryDelay: configService.get('database.retryDelay'),
        entities: [Agent],
        synchronize: configService.get('database.synchronize'),
        logging: configService.get('database.logging'),
      }),
      inject: [ConfigService],
    }),
    WalletModule,
    AgentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
