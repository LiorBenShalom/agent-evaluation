import {
  DefaultAppModule,
  DefaultModule,
  KalturaSessionManager,
  SharedConfig,
} from '@kaltura/services-common';
import { TemplateController } from './template.controller';
import { TemplateService } from './template.service';
import { HealthChecker } from './health/health-check.provider';
import { KalturaClientModule } from '@kaltura/services-common/kaltura-client-module/kaltura-client.module';
import { MongooseModule } from '@nestjs/mongoose';
import { TemplateConfig } from './template-config';
import { Template, TemplateSchema } from './entities/template.entity';
import { TemplateDb } from './template.db';
import { getMongoFactory } from '../../../shared/mongo-local-factory';

const mongoUrl = TemplateConfig.mongoUrl.get();
const mongooseModule = SharedConfig.localDev
  ? MongooseModule.forRootAsync(getMongoFactory(mongoUrl))
  : MongooseModule.forRoot(mongoUrl);

@DefaultModule(HealthChecker, {
  imports: [
    KalturaClientModule.forRoot({
      clientTag: 'ovp-ms-template/template',
      endpointUrl: SharedConfig.kaltura.endPoint,
    }),
    mongooseModule,
    MongooseModule.forFeature([{ name: Template.name, schema: TemplateSchema }]),
  ],
  providers: [TemplateService, KalturaSessionManager, TemplateDb],
  controllers: [TemplateController],
})
export class TemplateModule extends DefaultAppModule {}
