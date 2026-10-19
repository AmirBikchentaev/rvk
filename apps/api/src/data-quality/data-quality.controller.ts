import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtUser } from '../auth/auth.types';
import { Roles } from '../auth/roles.decorator';
import { DataQualityService } from './data-quality.service';

@Controller('data-quality')
export class DataQualityController {
  constructor(private readonly service: DataQualityService) {}

  @Roles('admin', 'viewer')
  @Get('issues')
  async issues(@CurrentUser() user: JwtUser) {
    const payload = await this.service.listIssues();
    return this.service.filterIssuesForUser(payload, user);
  }
}
