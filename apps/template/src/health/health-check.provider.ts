import { HealthCheckProvider } from '@kaltura/services-common';
import { Injectable } from '@nestjs/common';
import { TemplateService } from '../template.service';

@Injectable()
export class HealthChecker implements HealthCheckProvider {
  constructor(private readonly templateService: TemplateService) {}
  checks(): Record<string, Promise<unknown>> {
    return {
      template: this.templateService.healthCheck(),
    };
  }
}
