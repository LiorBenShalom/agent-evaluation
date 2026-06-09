import { Controller, Get, Delete, Param, Query, Headers, HttpException, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import * as kalturaClient from '../clients/kaltura.client';
import axios from 'axios';

/**
 * /api/kaltura/* — Kaltura Agentic API endpoints.
 * Mirrors the Python server's kaltura endpoints exactly.
 * Now makes REAL calls to the Kaltura Agentic API.
 */
@Controller('api/kaltura')
export class KalturaController {
  private extractKs(auth: string): string {
    const ks = (auth || '').trim();
    if (ks.toLowerCase().startsWith('bearer ')) return ks.slice(7).trim();
    return ks;
  }

  @Get('agents')
  async listAgents(@Headers('authorization') auth: string, @Query('limit') limit: number = 100) {
    const ks = this.extractKs(auth);
    if (!ks) throw new HttpException('Missing Authorization header', HttpStatus.UNAUTHORIZED);
    try {
      const data = await kalturaClient.listAgents(ks, 0, limit);
      return data?.objects || [];
    } catch (e: any) {
      this.handleError(e);
    }
  }

  @Get('agent')
  async getAgent(@Headers('authorization') auth: string, @Query('agent_id') agentId: string) {
    const ks = this.extractKs(auth);
    if (!ks) throw new HttpException('Missing Authorization header', HttpStatus.UNAUTHORIZED);
    if (!agentId) throw new HttpException('agent_id is required', HttpStatus.BAD_REQUEST);
    try {
      return await kalturaClient.getAgent(ks, agentId);
    } catch (e: any) {
      this.handleError(e);
    }
  }

  @Get('intellect')
  async getIntellect(@Headers('authorization') auth: string, @Query('agent_id') agentId: string) {
    const ks = this.extractKs(auth);
    if (!ks) throw new HttpException('Missing Authorization header', HttpStatus.UNAUTHORIZED);
    if (!agentId) throw new HttpException('agent_id is required', HttpStatus.BAD_REQUEST);
    try {
      const agent = await kalturaClient.getAgent(ks, agentId);
      const intellectId = agent?.intellect?.configId;
      if (!intellectId) throw new HttpException('Agent has no intellect configId', HttpStatus.NOT_FOUND);
      return await kalturaClient.getIntellect(ks, parseInt(intellectId, 10));
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      this.handleError(e);
    }
  }

  @Get('agent-avatar-id')
  async getAvatarId(@Headers('authorization') auth: string, @Query('agent_id') agentId: string) {
    const ks = this.extractKs(auth);
    if (!ks) throw new HttpException('Missing Authorization header', HttpStatus.UNAUTHORIZED);
    try {
      const agent = await kalturaClient.getAgent(ks, agentId);
      const avatarIds = agent?.avatarIds || [];
      return { avatar_id: avatarIds[0] || null };
    } catch (e: any) {
      this.handleError(e);
    }
  }

  @Get('avatar-image')
  async getAvatarImage(@Headers('authorization') auth: string, @Query('agent_id') agentId: string, @Res() res: Response) {
    const ks = this.extractKs(auth);
    if (!ks) throw new HttpException('Missing Authorization header', HttpStatus.UNAUTHORIZED);
    try {
      const agent = await kalturaClient.getAgent(ks, agentId);
      const avatarIds = agent?.avatarIds || [];
      if (!avatarIds.length) throw new HttpException('Agent has no avatarIds', HttpStatus.NOT_FOUND);

      const avatar = await kalturaClient.getAvatar(ks, avatarIds[0]);
      const imageUrl = avatar?.previewImageUrl || avatar?.imageUrl || avatar?.thumbnailUrl;
      if (!imageUrl) throw new HttpException('Avatar has no image URL', HttpStatus.NOT_FOUND);

      const imgResp = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 10000 });
      const contentType = (imgResp.headers['content-type'] as string) || 'image/jpeg';
      res.setHeader('Content-Type', contentType);
      res.send(Buffer.from(imgResp.data));
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      this.handleError(e);
    }
  }

  @Get('knowledge')
  async getKnowledge(@Headers('authorization') auth: string, @Query('agent_id') agentId: string) {
    const ks = this.extractKs(auth);
    if (!ks) throw new HttpException('Missing Authorization header', HttpStatus.UNAUTHORIZED);
    if (!agentId) throw new HttpException('agent_id is required', HttpStatus.BAD_REQUEST);
    try {
      const agent = await kalturaClient.getAgent(ks, agentId);
      const intellectId = agent?.intellect?.configId;
      if (!intellectId) return { kb_text: '', media_text: '', documents_text: '' };
      const intellect = await kalturaClient.getStudioIntellect(ks, parseInt(intellectId, 10));
      // TODO: extract KB sections from intellect prompts
      return { intellect, kb_text: '', media_text: '', documents_text: '' };
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      this.handleError(e);
    }
  }

  @Get('agents/:agentId/delete_preview')
  async deletePreview(@Param('agentId') agentId: string) {
    // TODO: count artifacts in DB for this agent
    return { run_count: 0, scenario_count: 0, kb_version_dirs: 0 };
  }

  @Delete('agents/:agentId')
  async deleteAgentEndpoint(@Param('agentId') agentId: string, @Query('confirm') confirm: string) {
    if (confirm !== agentId) {
      throw new HttpException(
        `Confirmation does not match. Expected ${agentId}, got ${confirm}`,
        HttpStatus.BAD_REQUEST,
      );
    }
    // TODO: delete from DB + optionally from Kaltura
    return { ok: true, agent_id: agentId };
  }

  private handleError(e: any): never {
    const status = e?.response?.status;
    const message = e?.response?.data?.message || e?.message || 'Kaltura API error';
    if (status === 401 || status === 403) {
      throw new HttpException('Invalid or expired KS token', HttpStatus.UNAUTHORIZED);
    }
    if (status === 404) {
      throw new HttpException(message, HttpStatus.NOT_FOUND);
    }
    throw new HttpException(`Kaltura API error: ${message}`, HttpStatus.BAD_GATEWAY);
  }
}
