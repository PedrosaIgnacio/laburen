import { Injectable, Logger } from '@nestjs/common';
import { AgentService } from 'src/agent/agent.service';
import { WhatsAppWebhookPayload } from './dtos/whatsapp-webhook-payload.dto';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private CONTEXT_TIMEOUT_MS = 30 * 60 * 1000;

  constructor(
    private agent_service: AgentService,
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  async processNotification(payload: WhatsAppWebhookPayload) {
    if (!payload.entry[0].changes[0].value.messages) return;

    const { message, recipientNumber, messageId, timestamp } =
      this.processPayload(payload);

    const existing = await this.prisma.processedMessage.findUnique({
      where: { messageId },
    });

    if (existing) {
      this.logger.debug(
        `Mensaje ya procesado (messageId=${messageId}), ignorando.`,
      );
      return;
    }

    if (
      recipientNumber ===
      this.config.get<string>('WHATSAPP_META_MY_PHONE_NUMBER')
    ) {
      this.logger.debug('Mensaje desde mi propio número, ignorado.');
      return;
    }

    let conversation = await this.prisma.conversationContext.findUnique({
      where: { phoneNumber: recipientNumber },
    });

    const lastTimestamp = conversation?.lastTimestamp ?? 0;
    if (timestamp <= lastTimestamp) {
      this.logger.warn(
        `Mensaje con timestamp viejo/igual recibido. incoming=${timestamp}, last=${lastTimestamp}. Ignorado.`,
      );
      return;
    }

    await this.prisma.processedMessage.create({
      data: { messageId, timestamp },
    });

    let context: any[] = [];

    if (conversation) {
      const storedContext = conversation.context;
      if (Array.isArray(storedContext)) {
        context = storedContext as any[];
      } else {
        context = [];
      }
    }

    context.push({ role: 'user', content: message });

    const now = new Date();
    await this.prisma.conversationContext.upsert({
      where: { phoneNumber: recipientNumber },
      update: {
        context,
        lastActive: now,
        lastTimestamp: timestamp,
      },
      create: {
        phoneNumber: recipientNumber,
        context,
        lastActive: now,
        lastTimestamp: timestamp,
      },
    });

    const { output } = await this.agent_service.invoke(context);
    this.logger.debug(`AI Agent Reply: ${output}`);

    await axios.post(
      `${this.config.get<string>('API_GRAPH_FACEBOOK_BASE_URL')}/${this.config.get<string>('WHATSAPP_META_PHONE_NUMBER_ID')}/messages`,
      {
        messaging_product: 'whatsapp',
        to: this.normalizeRecipient(recipientNumber),
        type: 'text',
        text: { body: output },
      },
      {
        headers: {
          Authorization: `Bearer ${this.config.get<string>('WHATSAPP_META_ACCESS_TOKEN')}`,
        },
      },
    );
  }

  private processPayload(payload: WhatsAppWebhookPayload) {
    const lastEntry = payload.entry[payload.entry.length - 1];
    const lastChanges = lastEntry.changes[lastEntry.changes.length - 1];
    const lastMessage =
      lastChanges.value.messages &&
      lastChanges.value.messages[lastChanges.value.messages.length - 1];

    return {
      message: lastMessage?.text?.body ?? '',
      recipientNumber: lastMessage?.from ?? '',
      messageId: lastMessage?.id ?? '',
      timestamp: Number(
        lastMessage?.timestamp ?? Math.floor(Date.now() / 1000),
      ),
    };
  }

  private normalizeRecipient(raw: string): string {
    const withPlus = raw.startsWith('+') ? raw : `+${raw}`;
    const phoneNumber = parsePhoneNumberFromString(withPlus);

    if (!phoneNumber || !phoneNumber.isValid()) {
      throw new Error(`Número inválido: ${raw}`);
    }

    let e164: string = phoneNumber.number;

    if (
      phoneNumber.country === 'AR' &&
      phoneNumber.nationalNumber.startsWith('9')
    ) {
      e164 = `+${phoneNumber.countryCallingCode}${phoneNumber.nationalNumber.substring(1)}`;
    }
    if (
      phoneNumber.country === 'BR' &&
      phoneNumber.nationalNumber.length === 11 &&
      phoneNumber.nationalNumber.startsWith('9')
    ) {
      e164 = `+${phoneNumber.countryCallingCode}${phoneNumber.nationalNumber.substring(1)}`;
    }

    return e164.replace('+', '');
  }

  async clearExpiredContexts() {
    const cutoff = new Date(Date.now() - this.CONTEXT_TIMEOUT_MS);
    await this.prisma.conversationContext.deleteMany({
      where: { lastActive: { lt: cutoff } },
    });
  }
}
