import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtUser } from '../auth/auth.types';
import { PropertyAccessService } from '../auth/property-access.service';
import { AssistantService } from './assistant.service';

class ChatDto {
  @IsString()
  @MaxLength(4000)
  message!: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  @Matches(/^V\d{3}$/i, { message: 'propertyId must match V###' })
  propertyId?: string;

  @IsOptional()
  @IsString()
  @IsIn(['ru', 'en'])
  locale?: string;
}

@Controller('assistant')
@Throttle({ default: { limit: 40, ttl: 60_000 } })
export class AssistantController {
  constructor(
    private readonly assistant: AssistantService,
    private readonly propertyAccess: PropertyAccessService,
  ) {}

  @Post('chat')
  async chat(@Body() body: ChatDto, @CurrentUser() user: JwtUser) {
    this.propertyAccess.assertPortfolioScope(user, body.propertyId);
    await this.propertyAccess.assertPropertyAccess(user, body.propertyId);
    return this.assistant.chat(body);
  }
}
