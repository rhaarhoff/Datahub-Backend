import { Test, TestingModule } from '@nestjs/testing';
import { HaloPsaOAuthHelper } from './halospsa-oauth.helper';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { AxiosResponse, InternalAxiosRequestConfig } from 'axios'; // Import Axios types

describe('HaloPsaOAuthHelper', () => {
  let oauthHelper: HaloPsaOAuthHelper;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HaloPsaOAuthHelper,
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
          },
        },
      ],
    }).compile();

    oauthHelper = module.get<HaloPsaOAuthHelper>(HaloPsaOAuthHelper);
    httpService = module.get<HttpService>(HttpService);
  });

  it('should return access token on successful request', async () => {
    const token = 'mockAccessToken';
    
    // Properly mock the AxiosResponse object
    const response: AxiosResponse = {
      data: { access_token: token },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {
        headers: {}, // Required property in InternalAxiosRequestConfig
        method: 'POST',
        url: process.env.HALOPSA_AUTH_URL,
      } as InternalAxiosRequestConfig,
    };

    // Mock the HttpService post request to return the AxiosResponse
    jest.spyOn(httpService, 'post').mockReturnValue(of(response));

    const result = await oauthHelper.getAccessToken();

    expect(result).toEqual(token);
    expect(httpService.post).toHaveBeenCalledWith(
      process.env.HALOPSA_AUTH_URL,
      expect.any(URLSearchParams),  // Ensure the correct payload is sent
      expect.any(Object),
    );
  });

  it('should throw an error if the token request fails', async () => {
    // Mock the HttpService post request to throw an error
    jest.spyOn(httpService, 'post').mockImplementation(() => {
      throw new Error('Request failed');
    });

    await expect(oauthHelper.getAccessToken()).rejects.toThrow(
      'Error getting OAuth token from HaloPSA: Request failed',
    );
  });
});
