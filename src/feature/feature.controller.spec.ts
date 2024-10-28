import { Test, TestingModule } from '@nestjs/testing';
import { FeatureController } from './feature.controller';
import { FeatureService } from './feature.service';
import { CasbinHelperService } from '../casbin-integration/casbin-helper.service';
import { CreateFeatureInput } from '@feature-dto/create-feature.input';
import { MaxTakePipe } from '../pipes/max-take/max-take.pipe';
import { UpdateFeatureInput } from '@feature-dto/update-feature.input';

describe('FeatureController', () => {
  let controller: FeatureController;
  let featureService: FeatureService;
  let casbinHelperService: CasbinHelperService;

  const mockFeatureService = {
    create: jest.fn().mockResolvedValue({ id: 1, name: 'New Feature' }),
    bulkCreate: jest.fn().mockResolvedValue([
      { id: 1, name: 'Feature 1' },
      { id: 2, name: 'Feature 2' },
    ]),
    getFeatureById: jest
      .fn()
      .mockResolvedValue({ id: 1, name: 'Test Feature' }),
    findAllWithPagination: jest.fn().mockResolvedValue([
      { id: 1, name: 'Feature 1' },
      { id: 2, name: 'Feature 2' },
    ]),
    remove: jest.fn().mockResolvedValue(null),
    findAllDeletedWithPagination: jest.fn().mockResolvedValue([
      { id: 3, name: 'Deleted Feature 1' },
      { id: 4, name: 'Deleted Feature 2' },
    ]),
    restore: jest.fn().mockResolvedValue({ id: 1, name: 'Restored Feature' }),
    hardRemove: jest.fn().mockResolvedValue(null),
    toggleFeatureStatus: jest
      .fn()
      .mockResolvedValue({ id: 1, name: 'Test Feature', enabled: true }),
    listFeatures: jest.fn().mockResolvedValue([
      {
        id: 1,
        name: 'Test Feature',
        description: 'Test feature description',
        tierId: 1,
        isPremium: false,
        enabled: true,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]),
    bulkRemove: jest.fn().mockResolvedValue({
      success: [
        { id: 1, status: 'fulfilled' },
        { id: 2, status: 'fulfilled' },
      ],
      errors: [],
    }),
    bulkRestore: jest.fn().mockResolvedValue([
      { id: 1, status: 'fulfilled' },
      { id: 2, status: 'fulfilled' },
    ]),
    bulkHardRemove: jest.fn().mockResolvedValue(null),
    update: jest.fn().mockResolvedValue({ id: 1, name: 'Updated Feature' }),
    findAllDeleted: jest.fn().mockResolvedValue([
      { id: 1, name: 'Deleted Feature 1', deletedAt: new Date() },
      { id: 2, name: 'Deleted Feature 2', deletedAt: new Date() },
    ]),
    findAll: jest.fn().mockResolvedValue([
      { id: 1, name: 'Feature 1', isPremium: false, tierId: 1 },
      { id: 2, name: 'Feature 2', isPremium: true, tierId: 2 },
    ]),
  };

  const mockCasbinHelperService = {
    enforceAuthorization: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FeatureController],
      providers: [
        {
          provide: FeatureService,
          useValue: mockFeatureService,
        },
        {
          provide: CasbinHelperService,
          useValue: mockCasbinHelperService,
        },
      ],
    }).compile();

    controller = module.get<FeatureController>(FeatureController);
    featureService = module.get<FeatureService>(FeatureService);
    casbinHelperService = module.get<CasbinHelperService>(CasbinHelperService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('listFeatures', () => {
    it('should call featureService.listFeatures with tenantId, skip, and take', async () => {
      const tenantId = 1;
      const skip = 0;
      const take = 10;

      await controller.listFeatures(tenantId, skip, take);

      expect(featureService.listFeatures).toHaveBeenCalledWith(
        tenantId,
        skip,
        take,
      );
    });

    it('should return a list of features', async () => {
      const tenantId = 1;
      const skip = 0;
      const take = 10;

      const result = await controller.listFeatures(tenantId, skip, take);

      expect(result).toEqual([
        expect.objectContaining({
          id: 1,
          name: 'Test Feature',
          description: 'Test feature description',
          tierId: 1,
          isPremium: false,
          enabled: true,
          deletedAt: null,
        }),
      ]);
    });

    it('should limit the take value to 1000 if more than 1000 is provided', async () => {
      const tenantId = 1;
      const skip = 0;
      const take = 1500; // More than 1000, expect it to be capped

      // Manually apply the MaxTakePipe
      const maxTakePipe = new MaxTakePipe(1000);
      const transformedTake = maxTakePipe.transform(take);

      // Clear the mock before running the test
      (featureService.listFeatures as jest.Mock).mockClear();

      await controller.listFeatures(tenantId, skip, transformedTake);

      // Ensure that the service was called with the take value capped at 1000
      expect(featureService.listFeatures).toHaveBeenCalledWith(
        tenantId,
        skip,
        1000,
      );
    });
  });

  describe('createFeature', () => {
    it('should call casbinHelperService.enforceAuthorization and featureService.create', async () => {
      const createFeatureInput: CreateFeatureInput = {
        name: 'Test Feature',
        description: 'Test description',
        isPremium: false,
        enabled: true,
        tierId: 1,
      };
      const tenantId = 1;
      const userId = 1;
      const ipAddress = '127.0.0.1';
      const userAgent = 'Mozilla';

      await controller.createFeature(
        createFeatureInput,
        tenantId,
        userId,
        ipAddress,
        userAgent,
      );

      expect(casbinHelperService.enforceAuthorization).toHaveBeenCalledWith(
        userId,
        '/features/create',
        'create',
        tenantId,
      );
      expect(featureService.create).toHaveBeenCalledWith(
        createFeatureInput,
        tenantId,
        userId,
        ipAddress,
        userAgent,
      );
    });

    it('should return the created feature', async () => {
      const createFeatureInput: CreateFeatureInput = {
        name: 'Test Feature',
        description: 'Test description',
        isPremium: false,
        enabled: true,
        tierId: 1,
      };
      const tenantId = 1;
      const userId = 1;
      const ipAddress = '127.0.0.1';
      const userAgent = 'Mozilla';

      const result = await controller.createFeature(
        createFeatureInput,
        tenantId,
        userId,
        ipAddress,
        userAgent,
      );

      expect(result).toEqual({ id: 1, name: 'New Feature' });
    });
  });

  describe('bulkCreateFeatures', () => {
    it('should call casbinHelperService.enforceAuthorization and featureService.bulkCreate', async () => {
      const createFeatureInputs: CreateFeatureInput[] = [
        {
          name: 'Feature 1',
          description: 'Description 1',
          isPremium: false,
          enabled: true,
          tierId: 1,
        },
        {
          name: 'Feature 2',
          description: 'Description 2',
          isPremium: false,
          enabled: true,
          tierId: 1,
        },
      ];
      const tenantId = 1;
      const userId = 1;
      const ipAddress = '127.0.0.1';
      const userAgent = 'Mozilla';

      await controller.bulkCreateFeatures(
        createFeatureInputs,
        tenantId,
        userId,
        ipAddress,
        userAgent,
      );

      expect(casbinHelperService.enforceAuthorization).toHaveBeenCalledWith(
        userId,
        '/features/bulk',
        'create',
        tenantId,
      );
      expect(featureService.bulkCreate).toHaveBeenCalledWith(
        createFeatureInputs,
        tenantId,
        userId,
        ipAddress,
        userAgent,
      );
    });

    it('should return the bulk created features', async () => {
      const createFeatureInputs: CreateFeatureInput[] = [
        {
          name: 'Feature 1',
          description: 'Description 1',
          isPremium: false,
          enabled: true,
          tierId: 1,
        },
        {
          name: 'Feature 2',
          description: 'Description 2',
          isPremium: false,
          enabled: true,
          tierId: 1,
        },
      ];
      const tenantId = 1;
      const userId = 1;
      const ipAddress = '127.0.0.1';
      const userAgent = 'Mozilla';

      const result = await controller.bulkCreateFeatures(
        createFeatureInputs,
        tenantId,
        userId,
        ipAddress,
        userAgent,
      );

      expect(result).toEqual([
        { id: 1, name: 'Feature 1' },
        { id: 2, name: 'Feature 2' },
      ]);
    });
  });

  describe('getFeatureById', () => {
    it('should call casbinHelperService.enforceAuthorization and featureService.getFeatureById', async () => {
      const featureId = 1;
      const tenantId = 1;
      const userId = 1;

      await controller.getFeatureById(featureId, tenantId, userId);

      expect(casbinHelperService.enforceAuthorization).toHaveBeenCalledWith(
        userId,
        `/features/${featureId}`,
        'read',
        tenantId,
      );
      expect(featureService.getFeatureById).toHaveBeenCalledWith(
        featureId,
        tenantId,
      );
    });

    it('should return the feature with the specified ID', async () => {
      const featureId = 1;
      const tenantId = 1;
      const userId = 1;

      const result = await controller.getFeatureById(
        featureId,
        tenantId,
        userId,
      );

      expect(result).toEqual({ id: 1, name: 'Test Feature' });
    });
  });

  describe('updateFeature', () => {
    it('should call casbinHelperService.enforceAuthorization and featureService.update', async () => {
      const updateFeatureInput: UpdateFeatureInput = {
        name: 'Updated Feature',
        description: 'Updated description',
        isPremium: false,
        enabled: true,
        tierId: 1,
        id: 0,
      };
      const id = 1;
      const tenantId = 1;
      const userId = 1;
      const ipAddress = '127.0.0.1';
      const userAgent = 'Mozilla';

      await controller.updateFeature(
        id,
        updateFeatureInput,
        tenantId,
        userId,
        ipAddress,
        userAgent,
      );

      expect(casbinHelperService.enforceAuthorization).toHaveBeenCalledWith(
        userId,
        `/features/update`,
        'update',
        tenantId,
      );

      expect(featureService.update).toHaveBeenCalledWith(
        id,
        updateFeatureInput,
        tenantId,
        userId,
        ipAddress,
        userAgent,
      );
    });

    it('should return the updated feature', async () => {
      const updateFeatureInput: UpdateFeatureInput = {
        name: 'Updated Feature',
        description: 'Updated description',
        isPremium: false,
        enabled: true,
        tierId: 1,
        id: 0,
      };
      const id = 1;
      const tenantId = 1;
      const userId = 1;
      const ipAddress = '127.0.0.1';
      const userAgent = 'Mozilla';

      const result = await controller.updateFeature(
        id,
        updateFeatureInput,
        tenantId,
        userId,
        ipAddress,
        userAgent,
      );

      expect(result).toEqual({ id: 1, name: 'Updated Feature' });
    });
  });

  describe('findAllWithPagination', () => {
    it('should call casbinHelperService.enforceAuthorization and featureService.findAllWithPagination', async () => {
      const tenantId = 1;
      const userId = 1;
      const skip = 0;
      const take = 10;
      const name = 'Test Feature';
      const tierId = 1;
      const isPremium = false;

      await controller.findAllFeatures(
        tenantId,
        userId,
        skip,
        take,
        name,
        tierId,
        isPremium,
      );

      expect(casbinHelperService.enforceAuthorization).toHaveBeenCalledWith(
        userId,
        '/features',
        'read',
        tenantId,
      );
      expect(featureService.findAllWithPagination).toHaveBeenCalledWith(
        tenantId,
        { name, tierId, isPremium },
        skip,
        take,
      );
    });

    it('should return the list of features with pagination', async () => {
      const tenantId = 1;
      const userId = 1;
      const skip = 0;
      const take = 10;
      const name = 'Test Feature';
      const tierId = 1;
      const isPremium = false;

      const result = await controller.findAllFeatures(
        tenantId,
        userId,
        skip,
        take,
        name,
        tierId,
        isPremium,
      );

      expect(result).toEqual([
        { id: 1, name: 'Feature 1' },
        { id: 2, name: 'Feature 2' },
      ]);
    });
  });

  describe('Soft Delete', () => {
    it('should call casbinHelperService.enforceAuthorization and featureService.remove', async () => {
      const featureId = 1;
      const tenantId = 1;
      const userId = 1;
      const ipAddress = '127.0.0.1';
      const userAgent = 'Mozilla';

      await controller.remove(
        featureId,
        tenantId,
        userId,
        ipAddress,
        userAgent,
      );

      expect(casbinHelperService.enforceAuthorization).toHaveBeenCalledWith(
        userId,
        `/features/${featureId}`,
        'delete',
        tenantId,
      );
      expect(featureService.remove).toHaveBeenCalledWith(
        featureId,
        tenantId,
        userId,
        ipAddress,
        userAgent,
      );
    });

    it('should return NO_CONTENT after the feature is soft-deleted', async () => {
      const featureId = 1;
      const tenantId = 1;
      const userId = 1;
      const ipAddress = '127.0.0.1';
      const userAgent = 'Mozilla';

      const result = await controller.remove(
        featureId,
        tenantId,
        userId,
        ipAddress,
        userAgent,
      );

      expect(result).toBeUndefined(); // No content should return undefined in NestJS
    });
  });

  describe('bulkRemoveFeatures', () => {
    it('should call casbinHelperService.enforceAuthorization and featureService.bulkRemove', async () => {
      const featureIds = [1, 2];
      const tenantId = 1;
      const userId = 1;
      const ipAddress = '127.0.0.1';
      const userAgent = 'Mozilla';

      await controller.bulkRemoveFeatures(
        featureIds,
        tenantId,
        userId,
        ipAddress,
        userAgent,
      );

      expect(casbinHelperService.enforceAuthorization).toHaveBeenCalledWith(
        userId,
        '/features/bulk-remove',
        'delete',
        tenantId,
      );

      expect(featureService.bulkRemove).toHaveBeenCalledWith(
        featureIds,
        tenantId,
        userId,
        ipAddress,
        userAgent,
      );
    });

    it('should return the bulk removal result', async () => {
      const featureIds = [1, 2];
      const tenantId = 1;
      const userId = 1;
      const ipAddress = '127.0.0.1';
      const userAgent = 'Mozilla';

      const result = await controller.bulkRemoveFeatures(
        featureIds,
        tenantId,
        userId,
        ipAddress,
        userAgent,
      );

      expect(result).toEqual({
        success: [
          { id: 1, status: 'fulfilled' },
          { id: 2, status: 'fulfilled' },
        ],
        errors: [],
      });
    });
  });

  describe('findAllDeletedWithPagination', () => {
    it('should call casbinHelperService.enforceAuthorization and featureService.findAllDeletedWithPagination', async () => {
      const tenantId = 1;
      const userId = 1;
      const skip = 0;
      const take = 10;

      await controller.findAllDeletedFeatures(tenantId, userId, skip, take);

      expect(casbinHelperService.enforceAuthorization).toHaveBeenCalledWith(
        userId,
        '/features/recycle-bin',
        'read',
        tenantId,
      );
      expect(featureService.findAllDeletedWithPagination).toHaveBeenCalledWith(
        tenantId,
        skip,
        take,
      );
    });

    it('should return the list of deleted features with pagination', async () => {
      const tenantId = 1;
      const userId = 1;
      const skip = 0;
      const take = 10;

      const result = await controller.findAllDeletedFeatures(
        tenantId,
        userId,
        skip,
        take,
      );

      expect(result).toEqual([
        { id: 3, name: 'Deleted Feature 1' },
        { id: 4, name: 'Deleted Feature 2' },
      ]);
    });
  });

  describe('restoreFeature', () => {
    it('should call casbinHelperService.enforceAuthorization and featureService.restore', async () => {
      const featureId = 1;
      const tenantId = 1;
      const userId = 1;
      const ipAddress = '127.0.0.1';
      const userAgent = 'Mozilla';

      await controller.restoreFeature(
        featureId,
        tenantId,
        userId,
        ipAddress,
        userAgent,
      );

      expect(casbinHelperService.enforceAuthorization).toHaveBeenCalledWith(
        userId,
        `/features/restore/${featureId}`,
        'restore',
        tenantId,
      );
      expect(featureService.restore).toHaveBeenCalledWith(
        featureId,
        tenantId,
        userId,
        ipAddress,
        userAgent,
      );
    });

    it('should return the restored feature', async () => {
      const featureId = 1;
      const tenantId = 1;
      const userId = 1;
      const ipAddress = '127.0.0.1';
      const userAgent = 'Mozilla';

      const result = await controller.restoreFeature(
        featureId,
        tenantId,
        userId,
        ipAddress,
        userAgent,
      );

      expect(result).toEqual({ id: 1, name: 'Restored Feature' });
    });
  });

  describe('bulkRestoreFeatures', () => {
    it('should call casbinHelperService.enforceAuthorization and featureService.bulkRestore', async () => {
      const featureIds = [1, 2];
      const tenantId = 1;
      const userId = 1;
      const ipAddress = '127.0.0.1';
      const userAgent = 'Mozilla';

      await controller.bulkRestoreFeatures(
        featureIds,
        tenantId,
        userId,
        ipAddress,
        userAgent,
      );

      expect(casbinHelperService.enforceAuthorization).toHaveBeenCalledWith(
        userId,
        '/features/bulk-restore',
        'restore',
        tenantId,
      );

      expect(featureService.bulkRestore).toHaveBeenCalledWith(
        featureIds,
        tenantId,
        userId,
        ipAddress,
        userAgent,
      );
    });

    it('should return the bulk restored features', async () => {
      const featureIds = [1, 2];
      const tenantId = 1;
      const userId = 1;
      const ipAddress = '127.0.0.1';
      const userAgent = 'Mozilla';

      const result = await controller.bulkRestoreFeatures(
        featureIds,
        tenantId,
        userId,
        ipAddress,
        userAgent,
      );

      expect(result).toEqual([
        { id: 1, status: 'fulfilled' },
        { id: 2, status: 'fulfilled' },
      ]);
    });
  });

  describe('hardRemoveFeature', () => {
    it('should call casbinHelperService.enforceAuthorization and featureService.hardRemove', async () => {
      const featureId = 1;
      const tenantId = 1;
      const userId = 1;

      await controller.hardRemoveFeature(featureId, tenantId, userId);

      expect(casbinHelperService.enforceAuthorization).toHaveBeenCalledWith(
        userId,
        `/features/hard-remove/${featureId}`,
        'delete',
        tenantId,
      );
      expect(featureService.hardRemove).toHaveBeenCalledWith(
        featureId,
        tenantId,
        userId,
        '127.0.0.1',
        'system',
      );
    });

    it('should return NO_CONTENT after the feature is hard-deleted', async () => {
      const featureId = 1;
      const tenantId = 1;
      const userId = 1;

      const result = await controller.hardRemoveFeature(
        featureId,
        tenantId,
        userId,
      );

      expect(result).toBeUndefined(); // Since the return type for hard delete is void/undefined
    });
  });

  describe('bulkHardRemoveFeatures', () => {
    it('should call casbinHelperService.enforceAuthorization and featureService.bulkHardRemove', async () => {
      const featureIds = [1, 2, 3];
      const tenantId = 1;
      const userId = 1;
      const ipAddress = '127.0.0.1';
      const userAgent = 'Mozilla';

      await controller.bulkHardRemoveFeatures(
        featureIds,
        tenantId,
        userId,
        ipAddress,
        userAgent,
      );

      expect(casbinHelperService.enforceAuthorization).toHaveBeenCalledWith(
        userId,
        '/features/bulk-hard-remove',
        'delete',
        tenantId,
      );

      expect(featureService.bulkHardRemove).toHaveBeenCalledWith(
        featureIds,
        tenantId,
        userId,
        ipAddress,
        userAgent,
      );
    });

    it('should return NO_CONTENT after the features are permanently deleted', async () => {
      const featureIds = [1, 2, 3];
      const tenantId = 1;
      const userId = 1;
      const ipAddress = '127.0.0.1';
      const userAgent = 'Mozilla';

      const result = await controller.bulkHardRemoveFeatures(
        featureIds,
        tenantId,
        userId,
        ipAddress,
        userAgent,
      );

      expect(result).toBeUndefined(); // NO_CONTENT returns no body
    });
  });

  describe('toggleFeatureStatus', () => {
    it('should call casbinHelperService.enforceAuthorization and featureService.toggleFeatureStatus', async () => {
      const featureId = 1;
      const tenantId = 1;
      const userId = 1;

      await controller.toggleFeatureStatus(featureId, tenantId, userId);

      expect(casbinHelperService.enforceAuthorization).toHaveBeenCalledWith(
        userId,
        `/features/toggle-status/${featureId}`,
        'update',
        tenantId,
      );
      expect(featureService.toggleFeatureStatus).toHaveBeenCalledWith(
        featureId,
        tenantId,
      );
    });

    it('should return the updated feature with the toggled status', async () => {
      const featureId = 1;
      const tenantId = 1;
      const userId = 1;

      const result = await controller.toggleFeatureStatus(
        featureId,
        tenantId,
        userId,
      );

      expect(result).toEqual({ id: 1, name: 'Test Feature', enabled: true });
    });
  });

  describe('findAllDeleted', () => {
    it('should call casbinHelperService.enforceAuthorization and featureService.findAllDeleted', async () => {
      const tenantId = 1;
      const userId = 1;
      const skip = 0;
      const take = 10;

      await controller.findAllDeleted(tenantId, userId, skip, take);

      expect(casbinHelperService.enforceAuthorization).toHaveBeenCalledWith(
        userId,
        '/features/recycle-bin',
        'read',
        tenantId,
      );

      expect(featureService.findAllDeleted).toHaveBeenCalledWith(
        tenantId,
        skip,
        take,
      );
    });

    it('should return a list of soft-deleted features', async () => {
      const tenantId = 1;
      const userId = 1;
      const skip = 0;
      const take = 10;

      const result = await controller.findAllDeleted(
        tenantId,
        userId,
        skip,
        take,
      );

      expect(result).toEqual([
        { id: 1, name: 'Deleted Feature 1', deletedAt: expect.any(Date) },
        { id: 2, name: 'Deleted Feature 2', deletedAt: expect.any(Date) },
      ]);
    });

    it('should limit the take value to 1000 if more than 1000 is provided', async () => {
      const tenantId = 1;
      const userId = 1;
      const skip = 0;
      const take = 1500; // More than 1000, expect it to be capped

      // Manually apply the MaxTakePipe
      const maxTakePipe = new MaxTakePipe(1000);
      const transformedTake = maxTakePipe.transform(take);

      // Clear the mock before running the test
      (featureService.findAllDeleted as jest.Mock).mockClear();

      await controller.findAllDeleted(tenantId, userId, skip, transformedTake);

      // Ensure that the service was called with the take value capped at 1000
      expect(featureService.findAllDeleted).toHaveBeenCalledWith(
        tenantId,
        skip,
        1000,
      );
    });
  });

  describe('findAllActive', () => {
    it('should call casbinHelperService.enforceAuthorization and featureService.findAll', async () => {
      const tenantId = 1;
      const userId = 1;
      const name = 'Feature';
      const tierId = 1;
      const isPremium = true;

      await controller.findAllActive(tenantId, userId, name, tierId, isPremium);

      expect(casbinHelperService.enforceAuthorization).toHaveBeenCalledWith(
        userId,
        '/features/active',
        'read',
        tenantId,
      );

      expect(featureService.findAll).toHaveBeenCalledWith(
        tenantId,
        name,
        tierId,
        isPremium,
      );
    });

    it('should return a list of active features', async () => {
      const tenantId = 1;
      const userId = 1;
      const name = 'Feature';
      const tierId = 1;
      const isPremium = true;

      const result = await controller.findAllActive(
        tenantId,
        userId,
        name,
        tierId,
        isPremium,
      );

      expect(result).toEqual([
        { id: 1, name: 'Feature 1', isPremium: false, tierId: 1 },
        { id: 2, name: 'Feature 2', isPremium: true, tierId: 2 },
      ]);
    });

    it('should return all active features when no filters are provided', async () => {
      const tenantId = 1;
      const userId = 1;

      const result = await controller.findAllActive(tenantId, userId);

      expect(result).toEqual([
        { id: 1, name: 'Feature 1', isPremium: false, tierId: 1 },
        { id: 2, name: 'Feature 2', isPremium: true, tierId: 2 },
      ]);
    });
  });
});
