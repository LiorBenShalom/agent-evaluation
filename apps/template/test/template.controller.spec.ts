import './test-init';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule } from '@nestjs/mongoose';
import { KalturaSessionManager, SharedConfig } from '@kaltura/services-common';
import { KalturaClientModule } from '@kaltura/services-common/kaltura-client-module/kaltura-client.module';
import { KsPermissionsGuard } from '@kaltura/services-common/guard/ks-permissions.guard';
import { KalturaThrottlerGuard } from '@kaltura/services-common/guard/kaltura-throttle.guard';
import { TemplateController } from '../src/template.controller';
import { TemplateService } from '../src/template.service';
import { TemplateDb } from '../src/template.db';
import { Template, TemplateSchema } from '../src/entities/template.entity';
import { mockKalturaRequestContextMiddleware } from './utils';

process.setMaxListeners(0);

const TEST_PARTNER_ID = 7777;

describe('TemplateController (e2e)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const mongoUri = mongod.getUri();

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        KalturaClientModule.forRoot({
          clientTag: 'testing',
          endpointUrl: SharedConfig.kaltura.endPoint,
        }),
        MongooseModule.forRoot(mongoUri),
        MongooseModule.forFeature([{ name: Template.name, schema: TemplateSchema }]),
      ],
      controllers: [TemplateController],
      providers: [
        TemplateService,
        TemplateDb,
        {
          provide: KalturaSessionManager,
          useValue: { getImpersonatedAdminSession: jest.fn(), execute: jest.fn() },
        },
      ],
    })
      .overrideGuard(KsPermissionsGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(KalturaThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    app.use(mockKalturaRequestContextMiddleware({ partnerId: TEST_PARTNER_ID }));

    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    if (mongod) {
      await mongod.stop();
    }
  });

  describe('POST /template/create', () => {
    it('should create a template and return it with id and partnerId', async () => {
      const response = await request(app.getHttpServer())
        .post('/template/create')
        .send({ name: 'My Template', description: 'A test template' })
        .expect(200);

      expect(response.body.id).toBeDefined();
      expect(response.body.name).toBe('My Template');
      expect(response.body.description).toBe('A test template');
      expect(response.body.partnerId).toBe(TEST_PARTNER_ID);
      expect(response.body.createdAt).toBeDefined();
    });

    it('should create a template without description', async () => {
      const response = await request(app.getHttpServer())
        .post('/template/create')
        .send({ name: 'No Description' })
        .expect(200);

      expect(response.body.id).toBeDefined();
      expect(response.body.name).toBe('No Description');
    });

    it('should return 400 when name is missing', async () => {
      await request(app.getHttpServer())
        .post('/template/create')
        .send({ description: 'missing name' })
        .expect(400);
    });
  });

  describe('POST /template/list', () => {
    it('should return paged templates for the current partner', async () => {
      await request(app.getHttpServer()).post('/template/create').send({ name: 'List Template A' });
      await request(app.getHttpServer()).post('/template/create').send({ name: 'List Template B' });

      const response = await request(app.getHttpServer())
        .post('/template/list')
        .send({})
        .expect(200);

      expect(Array.isArray(response.body.objects)).toBe(true);
      expect(response.body.totalCount).toBeGreaterThanOrEqual(2);
      expect(
        response.body.objects.every((t: { partnerId: number }) => t.partnerId === TEST_PARTNER_ID),
      ).toBe(true);
    });

    it('should respect pager offset and limit', async () => {
      const response = await request(app.getHttpServer())
        .post('/template/list')
        .send({ pager: { offset: 0, limit: 1 } })
        .expect(200);

      expect(response.body.objects).toHaveLength(1);
      expect(response.body.totalCount).toBeGreaterThan(1);
    });
  });
});
