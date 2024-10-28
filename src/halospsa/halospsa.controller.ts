import { Controller, Get } from '@nestjs/common';
import { HalospsaClientService } from './halospsa.service';

@Controller('halospsa')
export class HalospsaController {
  constructor(private readonly halospsaClientService: HalospsaClientService) {}

  @Get('sync-clients')
  async syncClients() {
    return await this.halospsaClientService.syncClients();
  }
}
