import { Controller, Get, Post, Put, Query, Body, Headers, Res } from '@nestjs/common';
import { Response } from 'express';

@Controller('api/tests')
export class PlanController {
  @Post('plan')
  plan(@Body() body: any) {
    return { situations: [] };
  }

  @Post('plan/stream')
  planStream(@Body() body: any, @Res() res: Response) {
    // SSE stub - sends a done event immediately
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');
    res.write(`data: ${JSON.stringify({ event: 'start', count: 0 })}\n\n`);
    res.write(`data: ${JSON.stringify({ event: 'done', total: 0 })}\n\n`);
    res.end();
  }

  @Put('draft')
  upsertDraft(@Body() body: any, @Headers('idempotency-key') key: string) {
    return { ok: true, key: key || 'default' };
  }

  @Get('draft')
  getDraft(@Query('key') key: string = 'default') {
    return { stub: true, endpoint: 'GET /api/tests/draft', key };
  }
}
