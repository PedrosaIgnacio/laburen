import { Module } from '@nestjs/common';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { AgentService } from 'src/agent/agent.service';
import { PrismaService } from 'src/common/prisma.service';

@Module({
  controllers: [WhatsappController],
  providers: [WhatsappService, AgentService, PrismaService],
})
export class WhatsappModule {}
