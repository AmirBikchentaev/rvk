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
import { PropertyValidationService } from '../common/property-validation.service';
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
    private readonly properties: PropertyValidationService,
  ) {}

  @Post('chat')
  async chat(@Body() body: ChatDto) {
    await this.properties.assertKnownProperty(body.propertyId);
    return this.assistant.chat(body);
  }
}
