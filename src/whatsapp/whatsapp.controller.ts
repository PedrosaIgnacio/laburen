import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhatsAppWebhookPayload } from './dtos/whatsapp-webhook-payload.dto';
import { WhatsappService } from './whatsapp.service';
import { Request, Response } from 'express';

@Controller('whatsapp')
export class WhatsappController {
  constructor(
    private config: ConfigService,
    private whatsapp_service: WhatsappService,
  ) {}
  @Get('webhook')
  async syncWebhook(@Req() req, @Res() res) {
    const {
      'hub.mode': mode,
      'hub.challenge': challenge,
      'hub.verify_token': token,
    } = req.query;

    if (
      mode === 'subscribe' &&
      token === this.config.get<string>('WHATSAPP_META_ACCESS_TOKEN')
    ) {
      console.log('WEBHOOK VERIFIED');
      res.status(200).send(challenge);
    } else {
      res.status(403).end();
    }
  }
  @Post('webhook')
  async processNotification(@Req() req: Request, @Res() res: Response) {
    const whatsapp_webhook_payload: WhatsAppWebhookPayload = req.body;
    await this.whatsapp_service.processNotification(whatsapp_webhook_payload);
    return res.status(200);
  }
}
