import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type RunDocument = HydratedDocument<Run>;

@Schema({ timestamps: true, collection: 'runs' })
export class Run {
  @Prop({ required: true })
  agentId: string;

  @Prop()
  agentName: string;

  @Prop({ default: 'pending', enum: ['pending', 'queued', 'running', 'done', 'stopped', 'error'] })
  state: string;

  @Prop({ default: 0 })
  total: number;

  @Prop({ default: 0 })
  completed: number;

  @Prop({ default: 0 })
  passed: number;

  @Prop({ default: 0 })
  needsWork: number;

  @Prop({ type: [String], default: [] })
  scenarioIds: string[];

  @Prop({ type: MongooseSchema.Types.Mixed })
  results: Record<string, any>;

  @Prop()
  owner: string;

  @Prop({ default: 'kaltura' })
  appMode: string;

  @Prop()
  startedAt: Date;

  @Prop()
  finishedAt: Date;
}

export const RunSchema = SchemaFactory.createForClass(Run);
