import { Controller, Get, Post, Delete, Param, Query, Body, Headers } from '@nestjs/common';

@Controller('api')
export class RunsController {
  @Post('tests/run')
  startRun(@Body() body: any) {
    return { run_id: `stub_${Date.now()}` };
  }

  @Get('runs')
  listRuns(@Query('state') state: string) {
    return { runs: [], cursor: null };
  }

  @Get('tests/:runId/status')
  runStatus(@Param('runId') runId: string) {
    return {
      run_id: runId,
      state: 'done',
      total: 0,
      completed: 0,
      passed: 0,
      needs_work: 0,
      current_title: null,
      message: null,
    };
  }

  @Get('tests/:runId/kb-status')
  runKbStatus(@Param('runId') runId: string) {
    return { stub: true, endpoint: 'GET /api/tests/:runId/kb-status', run_id: runId };
  }

  @Post('tests/:runId/stop')
  stopRun(@Param('runId') runId: string) {
    return { ok: true };
  }

  @Post('tests/:runId/proceed')
  proceedRun(@Param('runId') runId: string) {
    return { ok: true };
  }

  @Delete('tests/:runId')
  deleteRun(@Param('runId') runId: string) {
    return { ok: true, run_id: runId };
  }

  @Post('tests/bulk_delete')
  bulkDelete(@Body() body: { ids: string[] }) {
    return { deleted: body.ids || [], skipped: [], ok: true };
  }
}
