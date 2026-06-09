/* eslint-disable no-console */

/**
 * Without this line we get a Node warning of:
 * "MaxListenersExceededWarning: Possible EventEmitter memory leak detected. 11 exit listeners added to [process].
 *  MaxListeners is 10. Use emitter.setMaxListeners() to increase limit"
 * Looks like a Nestjs issue.
 */
process.setMaxListeners(17);
/**
 * Otel first.
 */
import '@kaltura/services-common/otel-tracer';
import { TemplateModule } from './template.module';
import { AppLogger, createWebApp } from '@kaltura/services-common';
import { TemplateConfig } from './template-config';
import { welcomeMessage } from 'shared/utils';

async function bootstrap(): Promise<void> {
  const logger = new AppLogger('main');
  const serverPort = TemplateConfig.templatePort;

  logger.debug(`Starting Template server on port [${serverPort}]`);
  const app = await createWebApp(TemplateModule, { apiTitle: 'template' });
  app.enableShutdownHooks();
  await app.listen(serverPort);
}

bootstrap()
  .then(async () => await welcomeMessage('template', TemplateConfig.templatePort))
  .catch(e => {
    console.error('Template server failed to start:', e.message);
    process.exit(1);
  });
