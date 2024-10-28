import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class MaxTakePipe implements PipeTransform {
  constructor(private readonly maxTake: number) {}

  transform(value: any) {
    const take = parseInt(value, 10);
    if (isNaN(take) || take <= 0) {
      throw new BadRequestException('Invalid number for take parameter');
    }
    return Math.min(take, this.maxTake);
  }
}
