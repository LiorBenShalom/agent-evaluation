import { Body } from '@nestjs/common';
import {
  AppLogger,
  KalturaAction,
  KalturaController,
  ListResponse,
  ListResponseType,
} from '@kaltura/services-common';
import { TemplateService } from './template.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { ListTemplateDto } from './dto/list-template.dto';
import { Template } from './entities/template.entity';

@KalturaController('template', 'template')
export class TemplateController {
  private readonly logger = new AppLogger(TemplateController.name);
  constructor(private readonly service: TemplateService) {}

  @KalturaAction('create', 'Create and persist a template')
  async create(@Body() dto: CreateTemplateDto): Promise<Template> {
    return await this.service.create(dto);
  }

  @KalturaAction('list', 'List templates for the current partner', ListResponse(Template))
  async list(@Body() dto: ListTemplateDto): Promise<ListResponseType<Template>> {
    return await this.service.list(dto);
  }

  @KalturaAction('pingKalturaExample', 'Example usage of Kaltura client')
  async pingKalturaExample(): Promise<boolean> {
    const result = await this.service.pingKaltura();
    return result!;
  }
}
