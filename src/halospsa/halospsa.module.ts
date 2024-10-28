import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios'; // Import HttpModule
import { HalospsaClientService } from './halospsa.service';
import { HalospsaController } from './halospsa.controller';
import { HaloPsaApiHelper } from './halospsa-api.helper';
import { HaloPsaOAuthHelper } from './halospsa-oauth.helper'; // Import OAuth Helper

@Module({
  imports: [HttpModule],  // Import HttpModule to handle HTTP requests
  controllers: [HalospsaController],
  providers: [HalospsaClientService, HaloPsaApiHelper, HaloPsaOAuthHelper], // Register OAuthHelper as a provider
})
export class HalospsaModule {}
