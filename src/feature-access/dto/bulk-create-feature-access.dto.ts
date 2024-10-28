import { CreateFeatureAccessDto } from './create-feature-access.dto';
import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class BulkCreateFeatureAccessDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFeatureAccessDto)
  featureAccessRecords: CreateFeatureAccessDto[];
}
