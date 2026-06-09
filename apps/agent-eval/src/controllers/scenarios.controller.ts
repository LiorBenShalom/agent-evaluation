import { Controller, Get, Post, Put, Delete, Param, Query, Body } from '@nestjs/common';

@Controller('api')
export class ScenariosController {
  @Get('situations/library')
  library() {
    return [];
  }

  @Get('situations/from_other_agents')
  fromOtherAgents(@Query('url') url: string) {
    return { stub: true, endpoint: 'GET /api/situations/from_other_agents', url, scenarios: [] };
  }

  @Get('taxonomy')
  taxonomy() {
    return { stub: true, endpoint: 'GET /api/taxonomy' };
  }

  @Get('scenarios/all')
  allScenarios() {
    return [];
  }

  // NOTE: specific routes MUST come before :sid parameterized route
  @Post('situations/scripted')
  createScripted(@Body() body: any) {
    return { stub: true, endpoint: 'POST /api/situations/scripted', ...body };
  }

  @Post('situations/generate')
  generate(@Body() body: { assistant_url: string; topic: string; sentiment?: string }) {
    return { stub: true, endpoint: 'POST /api/situations/generate', ...body };
  }

  @Post('situations/import')
  importSituations(@Body() body: { ids: string[] }) {
    return { stub: true, endpoint: 'POST /api/situations/import', ids: body.ids };
  }

  @Post('situations/bulk_delete')
  bulkDelete(@Body() body: { ids: string[] }) {
    return { deleted: body.ids || [], ok: true };
  }

  @Post('situations/bulk_update')
  bulkUpdate(@Body() body: { ids: string[]; op: string; value: any }) {
    return { stub: true, endpoint: 'POST /api/situations/bulk_update', ...body };
  }

  @Post('situations')
  createSituation(@Body() body: any) {
    return { stub: true, endpoint: 'POST /api/situations', ...body };
  }

  @Get('situations/:sid')
  getSituation(@Param('sid') sid: string) {
    return { stub: true, endpoint: 'GET /api/situations/:sid', id: sid };
  }

  @Put('situations/:sid')
  updateSituation(@Param('sid') sid: string, @Body() body: any) {
    return { stub: true, endpoint: 'PUT /api/situations/:sid', id: sid, ...body };
  }

  @Delete('situations/:sid')
  deleteSituation(@Param('sid') sid: string) {
    return { ok: true, id: sid };
  }
}
