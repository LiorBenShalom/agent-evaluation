import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import {
  AppLogger,
  getCurrentPartnerId,
  getCurrentUserId,
  KalturaSessionManager,
  listResponse,
  ListResponseType,
} from '@kaltura/services-common';
import { CreateTemplateDto } from './dto/create-template.dto';
import { ListTemplateDto } from './dto/list-template.dto';
import { Template } from './entities/template.entity';
import { TemplateDb } from './template.db';
import { TemplateConfig } from './template-config';
import { KalturaClientService } from '@kaltura/services-common/kaltura-client-module/kaltura-client.service';
import { SystemPingAction } from '@kaltura/node-typescript-client/api/types/SystemPingAction';

@Injectable()
export class TemplateService implements OnApplicationShutdown {
  private readonly logger = new AppLogger(TemplateService.name);
  constructor(
    private readonly kalturaSessionManager: KalturaSessionManager,
    private readonly kalturaClientService: KalturaClientService,
    private readonly templateDb: TemplateDb,
  ) {}

  public async create(dto: CreateTemplateDto): Promise<Template> {
    this.logger.log(`Creating template`, dto);
    const item = new Template();
    item.partnerId = getCurrentPartnerId() as number;
    item.createdBy = (getCurrentUserId() as string) || 'n/a';
    item.name = dto.name;
    item.description = dto.description;
    return this.templateDb.add(item);
  }

  public async list(dto: ListTemplateDto): Promise<ListResponseType<Template>> {
    const { items, totalCount } = await this.templateDb.list(getCurrentPartnerId() as number, dto.pager);
    return listResponse(items, totalCount);
  }

  /**
   * Example use of KalturaClientService
   */
  public async pingKaltura(): Promise<boolean | null> {
    const client = this.kalturaClientService.createClient();
    const impersonatedClient = await this.kalturaClientService.createImpersonatedClient();
    const ping1 = await client.request(new SystemPingAction());
    const ping2 = await impersonatedClient.request(new SystemPingAction());
    return ping1 && ping2;
  }

  /**
   * Example use of KalturaSessionManager
   * kalturaSessionManager uses internal memory LRU cache.
   * Gets an impersonated admin session for the current partner and user
   */
  private async getImpersonatedAdminKs(): Promise<string> {
    const currentPartnerId = getCurrentPartnerId()!;
    const currentUserId = getCurrentUserId()!;
    return this.kalturaSessionManager.getImpersonatedAdminSession(currentPartnerId, currentUserId);
  }

  /**
   * Example use of KalturaSessionManager
   * kalturaSessionManager uses internal memory LRU cache.
   * Gets an impersonated user session for the current partner and user
   */
  private async getImpersonatedUserKs(): Promise<string> {
    const currentPartnerId = getCurrentPartnerId()!;
    const currentUserId = getCurrentUserId()!;
    return await this.kalturaSessionManager.getImpersonatedUserSession(currentPartnerId, currentUserId, {
      privileges: 'disableentitlement',
      expiry: 86400,
    });
  }

  /**
   * Example use of KalturaSessionManager
   * kalturaSessionManager uses internal memory LRU cache.
   * Gets a service admin session
   */
  private async getServiceAdminKs(): Promise<string> {
    return await this.kalturaSessionManager.getServiceAdminSession();
  }

  public get generatedId() {
    return Math.random().toString().split('.')[1].substring(0, TemplateConfig.templateIdLength);
  }

  public async onApplicationShutdown(signal: string): Promise<void> {
    this.logger.debug(`Template server shut down with signal ${signal}`);
  }

  public async healthCheck(): Promise<boolean> {
    return this.templateDb.alive();
  }
}
