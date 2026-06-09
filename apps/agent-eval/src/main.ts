import { NestFactory } from '@nestjs/core';
import { AgentEvalModule } from './agent-eval.module';
import { AgentEvalConfig } from './agent-eval-config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AgentEvalModule);
  app.enableCors();
  app.enableShutdownHooks();

  const port = AgentEvalConfig.port;
  await app.listen(port, '0.0.0.0');
  console.log(`Agent Eval server is up 👉 http://0.0.0.0:${port}/api`);
}

bootstrap().catch(e => {
  console.error('Agent Eval server failed to start:', e.message);
  process.exit(1);
});
