import { IsString, IsOptional, IsEnum, IsInt, IsDate, IsNotEmpty } from 'class-validator';
import { TenantStatus } from '@prisma/client';

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  domain?: string;

  @IsEnum(TenantStatus)
  @IsOptional()
  status?: TenantStatus;

  @IsInt()
  @IsOptional()
  subscriptionPlanId?: number;

  @IsDate()
  @IsOptional()
  subscriptionStartDate?: Date;

  @IsDate()
  @IsOptional()
  subscriptionEndDate?: Date;
}
