import { Controller, Get } from '@nestjs/common';
import { DataQualityService } from './data-quality.service';

@Controller('data-quality')
export class DataQualityController {
  constructor(private readonly service: DataQualityService) {}

  @Get('issues')
  issues() {
    return this.service.listIssues();
  }
}
