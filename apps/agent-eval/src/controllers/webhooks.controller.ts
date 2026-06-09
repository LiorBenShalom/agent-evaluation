import { Controller, Post, Body } from '@nestjs/common';

@Controller('api/webhooks')
export class WebhooksController {
  @Post('flow_deleted')
  flowDeleted(@Body() body: { env: string; client: string; flow_id: string }) {
    return { agent_key: `${body.env}/${body.client}/${body.flow_id}`, status: 'nothing_to_delete' };
  }
}
