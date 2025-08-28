import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { ProductsModule } from './products/products.module';
import { CartsModule } from './carts/carts.module';
import { AgentModule } from './agent/agent.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    WhatsappModule,
    ProductsModule,
    CartsModule,
    AgentModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
