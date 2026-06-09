import { Controller, Get, Post, Delete, Param, Query, Body, Headers } from '@nestjs/common';

/**
 * /api/agents/* — Shared agent management (history, versioning, delete, ignored labels).
 * Mirrors the Python server's agents endpoints exactly.
 */
@Controller('api/agents')
export class AgentsController {
  @Get('history')
  agentHistory(@Query('url') url: string) {
    return { stub: true, endpoint: 'GET /api/agents/history', url };
  }

  @Get('version')
  agentVersion(@Query('url') url: string, @Query('v') v: number) {
    return { stub: true, endpoint: 'GET /api/agents/version', url, v };
  }

  @Get('runs')
  agentRuns(@Query('url') url: string, @Query('v') v: number) {
    return { stub: true, endpoint: 'GET /api/agents/runs', url, v };
  }

  @Post('revert')
  revertAgent(@Body() body: { url: string; version: number }) {
    return { stub: true, endpoint: 'POST /api/agents/revert', ...body };
  }

  @Get(':env/:client/:flowId/delete_preview')
  deletePreview(
    @Param('env') env: string,
    @Param('client') client: string,
    @Param('flowId') flowId: string,
  ) {
    return { run_count: 0, scenario_count: 0, kb_version_dirs: 0 };
  }

  @Delete(':env/:client/:flowId')
  deleteAgent(
    @Param('env') env: string,
    @Param('client') client: string,
    @Param('flowId') flowId: string,
    @Query('confirm') confirm: string,
  ) {
    const agentKey = `${env}/${client}/${flowId}`;
    return { stub: true, endpoint: 'DELETE /api/agents/:env/:client/:flowId', agent_key: agentKey, confirm };
  }

  @Get(':env/:client/:flowId/ignored_labels')
  listIgnoredLabels(
    @Param('env') env: string,
    @Param('client') client: string,
    @Param('flowId') flowId: string,
  ) {
    return { labels: [] };
  }

  @Post(':env/:client/:flowId/ignored_labels')
  addIgnoredLabels(
    @Param('env') env: string,
    @Param('client') client: string,
    @Param('flowId') flowId: string,
    @Body() body: { labels: string[] },
  ) {
    return { labels: body.labels || [] };
  }

  @Delete(':env/:client/:flowId/ignored_labels')
  removeIgnoredLabel(
    @Param('env') env: string,
    @Param('client') client: string,
    @Param('flowId') flowId: string,
    @Query('label') label: string,
  ) {
    return { labels: [] };
  }
}
