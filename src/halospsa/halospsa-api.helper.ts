import { Injectable } from '@nestjs/common';
import { HaloPsaOAuthHelper } from './halospsa-oauth.helper'; // Assuming OAuth Helper is in the same folder
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs'; // To convert Observables to Promises

@Injectable()
export class HaloPsaApiHelper {
  constructor(
    private readonly oauthHelper: HaloPsaOAuthHelper, // Inject OAuth Helper
    private readonly httpService: HttpService         // Inject HttpService
  ) {}

  // Common function to make GET requests
  async get(endpoint: string, queryParams?: Record<string, any>): Promise<any> {
    const token = await this.oauthHelper.getAccessToken();  // Get OAuth2 token

    // Build the query string from queryParams if provided
    const queryString = queryParams ? `?${new URLSearchParams(queryParams).toString()}` : '';

    // Configuring the request
    const config = {
      method: 'get',
      url: `${process.env.HALOPSA_BASE_URL}${endpoint}${queryString}`, // Base URL + endpoint + query string
      headers: { Authorization: `Bearer ${token}` },  // Attach token in the Authorization header
    };

    try {
      // Perform the request and return the response data
      const response = await firstValueFrom(this.httpService.request(config));
      return response.data;
    } catch (error) {
      console.error(`Error making GET request to ${endpoint}:`, error.message);
      throw new Error(`Failed to GET data from ${endpoint}`);
    }
  }

  // Common function to make POST requests
  async post(endpoint: string, data: any): Promise<any> {
    const token = await this.oauthHelper.getAccessToken();  // Get OAuth2 token

    // Configuring the POST request
    const config = {
      method: 'post',
      url: `${process.env.HALOPSA_BASE_URL}${endpoint}`,
      headers: {
        Authorization: `Bearer ${token}`,  // Attach token in the Authorization header
        'Content-Type': 'application/json',  // Set content type
      },
      data,  // Pass the data for POST request
    };

    try {
      // Perform the request and return the response data
      const response = await firstValueFrom(this.httpService.request(config));
      return response.data;
    } catch (error) {
      console.error(`Error making POST request to ${endpoint}:`, error.message);
      throw new Error(`Failed to POST data to ${endpoint}`);
    }
  }

  // Common function to make DELETE requests
  async delete(endpoint: string): Promise<any> {
    const token = await this.oauthHelper.getAccessToken();  // Get OAuth2 token

    // Configuring the DELETE request
    const config = {
      method: 'delete',
      url: `${process.env.HALOPSA_BASE_URL}${endpoint}`,
      headers: { Authorization: `Bearer ${token}` },  // Attach token in the Authorization header
    };

    try {
      // Perform the request and return the response data
      const response = await firstValueFrom(this.httpService.request(config));
      return response.data;
    } catch (error) {
      console.error(`Error making DELETE request to ${endpoint}:`, error.message);
      throw new Error(`Failed to DELETE data from ${endpoint}`);
    }
  }
}
