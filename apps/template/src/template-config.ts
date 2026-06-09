import { Env } from '@kaltura/commons-utils';

export class TemplateConfig {
  static readonly templateIdLength = Env.optNum('TEMPLATE_ID_LENGTH', 4);
  static readonly templatePort = Env.optNum('TEMPLATE_PORT', 3000);
  static readonly mongoUrl = Env.secret('TEMPLATE_MONGO_URL');
}

// eslint-disable-next-line no-console
console.log('TemplateConfig loaded:', TemplateConfig);
