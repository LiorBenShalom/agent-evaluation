import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type ScenarioDocument = HydratedDocument<Scenario>;

@Schema({ timestamps: true, collection: 'scenarios' })
export class Scenario {
  @Prop({ required: true })
  title: string;

  @Prop()
  description: string;

  @Prop()
  businessGoal: string;

  @Prop({ type: MongooseSchema.Types.Mixed })
  userPersona: Record<string, any>;

  @Prop()
  openingMessage: string;

  @Prop({ default: 10 })
  maxTurns: number;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: MongooseSchema.Types.Mixed })
  judgeCriteria: Record<string, any>;

  @Prop()
  agentId: string;

  @Prop()
  agentKey: string;

  @Prop({ default: 'kaltura' })
  appMode: string;
}

export const ScenarioSchema = SchemaFactory.createForClass(Scenario);
