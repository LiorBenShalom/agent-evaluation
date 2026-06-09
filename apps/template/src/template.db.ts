import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, ConnectionStates, Model } from 'mongoose';
import { MongoWrapper } from '@kaltura/services-mongo/mongo-wrapper';
import { PagerDto } from '@kaltura/services-mongo/pager.dto';
import { Template, TemplateDocument } from './entities/template.entity';

@Injectable()
export class TemplateDb {
  private readonly mongo;

  constructor(
    @InjectModel(Template.name) private model: Model<TemplateDocument>,
    @InjectConnection() private connection: Connection,
  ) {
    this.mongo = new MongoWrapper(this.model, Template);
  }

  alive() {
    return this.connection.readyState === ConnectionStates.connected;
  }

  async add(item: Template) {
    return this.mongo.add(item);
  }

  async getById(partnerId: number, id: string) {
    return this.mongo.findOneByFilter({ _id: id, partnerId, deletedAt: null });
  }

  async list(partnerId: number, pager = new PagerDto()) {
    const filter = { partnerId, deletedAt: null };
    const [items, totalCount] = await Promise.all([
      this.mongo.findByFilter(filter, pager),
      this.mongo.countByFilter(filter),
    ]);
    return { items, totalCount };
  }
}
