import { Test, TestingModule } from '@nestjs/testing';
import { HalospsaController } from './halospsa.controller';
import { HalospsaClientService } from './halospsa.service';

describe('HalospsaController', () => {
  let controller: HalospsaController;
  let service: HalospsaClientService;

  const mockService = {
    syncClients: jest.fn().mockResolvedValue({ message: 'Client sync completed' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HalospsaController],
      providers: [
        {
          provide: HalospsaClientService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<HalospsaController>(HalospsaController);
    service = module.get<HalospsaClientService>(HalospsaClientService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call syncClients and return a success message', async () => {
    const result = await controller.syncClients();
    expect(result).toEqual({ message: 'Client sync completed' });
    expect(service.syncClients).toHaveBeenCalled();
  });
});
