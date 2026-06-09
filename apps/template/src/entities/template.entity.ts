import { Prop, Schema } from '@nestjs/mongoose';
import { MongoUtils } from '@kaltura/services-mongo/mongo-utils';
import { Document } from 'mongoose';

export type TemplateDocument = Template & Document;

@Schema()
export class Template {
  @Prop()
  id: string;

  @Prop({ type: Date, default: Date.now, required: true })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now, required: true })
  updatedAt: Date;

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;

  @Prop({ required: true })
  partnerId: number;

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop()
  createdBy?: string;
}

export const TemplateSchema = MongoUtils.createSchemaForClass(Template);

TemplateSchema.index({ partnerId: 1, deletedAt: 1 });
