import { Controller, Get, Query } from '@nestjs/common';

@Controller('api')
export class HistoryController {
  @Get('history')
  history() {
    return [];
  }

  @Get('stats/scenarios')
  statsScenarios(@Query('source') source: string = 'all', @Query('ids') ids?: string) {
    return { stub: true, endpoint: 'GET /api/stats/scenarios', source, total: 0 };
  }

  @Get('stats/runs')
  statsRuns(@Query('limit') limit?: number) {
    return { stub: true, endpoint: 'GET /api/stats/runs', total: 0, pass_rate: 0 };
  }
}
