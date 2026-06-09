import { Controller, Get } from '@nestjs/common';

@Controller('api')
export class HealthController {
  @Get('config')
  getConfig() {
    const defaultMode = (process.env.APP_MODE || 'kaltura').toLowerCase();
    return { default_mode: defaultMode === 'kaltura' || defaultMode === 'eself' ? defaultMode : 'kaltura' };
  }

  @Get('health/llm')
  healthLlm() {
    // TODO: implement real LLM ping
    return { ok: false, message: 'LLM not configured yet' };
  }

  @Get('ping')
  ping() {
    return { pong: true };
  }

  @Get('health')
  health() {
    return { status: 'ok', service: 'agent-eval', timestamp: new Date().toISOString() };
  }
}
