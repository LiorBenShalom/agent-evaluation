import { ApiPropertyOptional } from '@nestjs/swagger';
import { PagerDto } from '@kaltura/services-mongo/pager.dto';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ListTemplateDto {
  @ApiPropertyOptional({ example: { offset: 0, limit: 30 } })
  @IsOptional()
  @ValidateNested()
  @Type(() => PagerDto)
  pager?: PagerDto;
}
