import { Controller, Get, Post, Patch, Param, Body, Headers } from '@nestjs/common';

@Controller('api')
export class ReportsController {
  @Get('reports/:runId')
  getReport(@Param('runId') runId: string) {
    return {
      run_id: runId,
      assistant_name: '',
      assistant_url: '',
      finished_at: null,
      pass_rate: 0,
      passed_count: 0,
      total_count: 0,
      summary: '',
      failure_topics: [],
      watch_topics: [],
      narrative_summary: null,
      situations: [],
      kb_version: null,
      kb_captured_at: null,
      app_mode: 'kaltura',
      kaltura_agent_name: null,
      kaltura_avatar_id: null,
      genie_mode: 'chat',
    };
  }

  @Patch('reports/:runId/situations/:situationId/verdict')
  overrideVerdict(
    @Param('runId') runId: string,
    @Param('situationId') situationId: string,
    @Body() body: { pass_fail: string | null; reason: string },
  ) {
    return { stub: true, endpoint: 'PATCH verdict', run_id: runId, situation_id: situationId, ...body };
  }

  @Post('reports/:runId/situations/:situationId/findings/:findingIndex/dispute')
  disputeFinding(
    @Param('runId') runId: string,
    @Param('situationId') situationId: string,
    @Param('findingIndex') findingIndex: number,
    @Body() body: { message: string },
  ) {
    return { stub: true, endpoint: 'POST dispute', run_id: runId, situation_id: situationId, finding_index: findingIndex };
  }

  @Post('reports/:runId/kb_fixes/agentic')
  startAgenticSession(@Param('runId') runId: string) {
    return { session_id: `stub_session_${Date.now()}` };
  }

  @Post('reports/:runId/kb_fixes/apply')
  applyKbFixes(@Param('runId') runId: string, @Body() body: any) {
    return { stub: true, endpoint: 'POST /api/reports/:runId/kb_fixes/apply', run_id: runId };
  }

  @Post('reports/:runId/rerun')
  rerun(@Param('runId') runId: string) {
    return { run_id: `rerun_stub_${Date.now()}` };
  }

  @Get('agentic_sessions/:sessionId')
  getAgenticSession(@Param('sessionId') sessionId: string) {
    return {
      phase: 'done',
      current_action: null,
      investigation: [],
      result: null,
      elapsed_seconds: 0,
    };
  }
}
