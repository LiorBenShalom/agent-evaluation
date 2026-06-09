import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateTemplateDto {
  @ApiProperty({ example: 'My Template' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'A brief description of the template', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}
