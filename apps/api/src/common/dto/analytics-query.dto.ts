import { IsDateString, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

/** Matches synthetic dataset ids (V001…). */
export class AnalyticsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(16)
  @Matches(/^V\d{3}$/i, { message: 'propertyId must match V###' })
  propertyId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
