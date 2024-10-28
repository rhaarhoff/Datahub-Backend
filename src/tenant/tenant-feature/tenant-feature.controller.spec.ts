import { Test, TestingModule } from '@nestjs/testing';
import { TenantFeatureController } from './tenant-feature.controller';
import { TenantFeatureService } from './tenant-feature.service';
import { UpdateTenantFeatureDto } from './dto/update-tenant-feature.dto';

describe('TenantFeatureController', () => {
  let controller: TenantFeatureController;
  let service: TenantFeatureService;

  const mockTenantFeatureService = {
    updateTenantFeatures: jest.fn(),
    getTenantFeatures: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TenantFeatureController],
      providers: [
        {
          provide: TenantFeatureService,
          useValue: mockTenantFeatureService,
        },
      ],
    }).compile();

    controller = module.get<TenantFeatureController>(TenantFeatureController);
    service = module.get<TenantFeatureService>(TenantFeatureService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('updateTenantFeatures', () => {
    it('should update tenant features successfully', async () => {
      const tenantId = '101';
      const tenantIdNumber = parseInt(tenantId, 10);
      const updateTenantFeatureDto: UpdateTenantFeatureDto = {
        tenantId: tenantIdNumber,
        featureId: 1,
        enabled: true,
        newPlanId: 1, // Assuming newPlanId is a property in UpdateTenantFeatureDto
      };
      const resultMessage = `Tenant features updated for tenant ${tenantId} with plan ${updateTenantFeatureDto.newPlanId}`;

      jest.spyOn(service, 'updateTenantFeatures').mockResolvedValueOnce(resultMessage);

      const req = {} as Request; // Mock request object
      const result = await controller.updateTenantFeatures(tenantIdNumber, updateTenantFeatureDto, req);
      expect(result).toBe(resultMessage);
      expect(service.updateTenantFeatures).toHaveBeenCalledWith(
        tenantIdNumber,
        updateTenantFeatureDto.newPlanId,
      );
    });

    it('should throw an error if tenant features update fails', async () => {
      const tenantId = '101';
      const tenantIdNumber = parseInt(tenantId, 10);
      const updateTenantFeatureDto: UpdateTenantFeatureDto = {
        tenantId: tenantIdNumber,
        featureId: 1,
        enabled: true,
        newPlanId: 1,
      };

      jest.spyOn(service, 'updateTenantFeatures').mockRejectedValueOnce(new Error('Update Failed'));

      await expect(controller.updateTenantFeatures(tenantIdNumber, updateTenantFeatureDto)).rejects.toThrow(
        'Update Failed',
      );
    });
  });

  describe('getTenantFeatures', () => {
    it('should return tenant features successfully', async () => {
      const tenantId = '101';
      const tenantIdNumber = parseInt(tenantId, 10);
      const tenantFeatures = [
        { tenantId: tenantIdNumber, featureId: 1, enabled: true },
        { tenantId: tenantIdNumber, featureId: 2, enabled: true },
      ];

      jest.spyOn(service, 'getTenantFeatures').mockResolvedValueOnce(tenantFeatures);

      const result = await controller.getTenantFeatures(tenantIdNumber);
      expect(result).toBe(tenantFeatures);
      expect(service.getTenantFeatures).toHaveBeenCalledWith(tenantIdNumber);
    });

    it('should throw an error if tenant features retrieval fails', async () => {
      const tenantId = '101';
      const tenantIdNumber = parseInt(tenantId, 10);

      jest.spyOn(service, 'getTenantFeatures').mockRejectedValueOnce(new Error('Retrieval Failed'));

      await expect(controller.getTenantFeatures(tenantIdNumber)).rejects.toThrow('Retrieval Failed');
    });
  });
});
