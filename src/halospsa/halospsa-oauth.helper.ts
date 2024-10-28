import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';  // Helper to convert Observables to Promises

@Injectable()
export class HaloPsaOAuthHelper {
  private tokenUrl = process.env.HALOPSA_AUTH_URL;
  private clientId = process.env.HALOPSA_CLIENT_ID;
  private clientSecret = process.env.HALOPSA_CLIENT_SECRET;
  private scope = process.env.HALOPSA_SCOPE;

  constructor(private readonly httpService: HttpService) {}  // Inject HttpService

  // Function to get access token using client credentials and scope
  async getAccessToken(): Promise<string> {
    const authData = {
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'client_credentials',
      scope: this.scope,  // Including the scope in the token request
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post(this.tokenUrl, new URLSearchParams(authData), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        })
      );

      // Return the access token from the response
      return response.data.access_token;
    } catch (error) {
      throw new Error('Error getting OAuth token from HaloPSA: ' + error.message);
    }
  }
}
