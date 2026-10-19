import { Body, Controller, Post } from '@nestjs/common';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';
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
  propertyId?: string;

  @IsOptional()
  @IsString()
  locale?: string;
}

@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistant: AssistantService) {}

  @Post('chat')
  chat(@Body() body: ChatDto) {
    return this.assistant.chat(body);
  }
}
