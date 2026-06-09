import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AgentEvalConfig } from './agent-eval-config';

// Schemas
import { Agent, AgentSchema } from './schemas/agent.schema';
import { Scenario, ScenarioSchema } from './schemas/scenario.schema';
import { Run, RunSchema } from './schemas/run.schema';

// Controllers
import { HealthController } from './controllers/health.controller';
import { AssistantsController } from './controllers/assistants.controller';
import { KalturaController } from './controllers/kaltura.controller';
import { AgentsController } from './controllers/agents.controller';
import { ScenariosController } from './controllers/scenarios.controller';
import { RunsController } from './controllers/runs.controller';
import { PlanController } from './controllers/plan.controller';
import { ReportsController } from './controllers/reports.controller';
import { HistoryController } from './controllers/history.controller';
import { WebhooksController } from './controllers/webhooks.controller';

// Services
import { AgentsService } from './services/agents.service';
import { ScenariosService } from './services/scenarios.service';
import { RunsService } from './services/runs.service';
import { ReportsService } from './services/reports.service';
import { PlanService } from './services/plan.service';
import { HistoryService } from './services/history.service';

const mongoImports = AgentEvalConfig.mongoEnabled
  ? [
      MongooseModule.forRoot(AgentEvalConfig.mongoUrl),
      MongooseModule.forFeature([
        { name: Agent.name, schema: AgentSchema },
        { name: Scenario.name, schema: ScenarioSchema },
        { name: Run.name, schema: RunSchema },
      ]),
    ]
  : [];

@Module({
  imports: [
    ...mongoImports,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', '..', 'apps', 'agent-eval', 'static'),
      exclude: ['/api/(.*)'],
    }),
  ],
  controllers: [
    HealthController,
    AssistantsController,
    KalturaController,
    AgentsController,
    ScenariosController,
    RunsController,
    PlanController,
    ReportsController,
    HistoryController,
    WebhooksController,
  ],
  providers: [
    AgentsService,
    ScenariosService,
    RunsService,
    ReportsService,
    PlanService,
    HistoryService,
  ],
})
export class AgentEvalModule {}
