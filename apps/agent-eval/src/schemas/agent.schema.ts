import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AgentDocument = HydratedDocument<Agent>;

@Schema({ timestamps: true, collection: 'agents' })
export class Agent {
  @Prop({ required: true })
  name: string;

  @Prop()
  originalUrl: string;

  @Prop()
  env: string;

  @Prop()
  client: string;

  @Prop()
  flowId: string;

  @Prop()
  imageUrl: string;

  @Prop()
  kalturaAgentId: string;

  @Prop()
  kalturaPartnerId: number;

  @Prop({ default: 0 })
  passRate: number;

  @Prop({ default: 0 })
  testsRun: number;

  @Prop({ default: 'active' })
  status: string;
}

export const AgentSchema = SchemaFactory.createForClass(Agent);
