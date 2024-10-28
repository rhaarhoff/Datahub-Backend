import { Test, TestingModule } from '@nestjs/testing';
import { FeatureResolver } from './feature.resolver';
import { FeatureService } from './feature.service';
import { CasbinHelperService } from '../casbin-integration/casbin-helper.service';
import { CreateFeatureInput } from '@feature-dto/create-feature.input';
import { UpdateFeatureInput } from '@feature-dto/update-feature.input';

describe('FeatureResolver', () => {
  let resolver: FeatureResolver;
  let featureService: FeatureService;
  let casbinHelperService: CasbinHelperService;

  const mockFeatureService = {
    listFeatures: jest.fn().mockResolvedValue([
      { id: 1, name: 'Feature 1', isPremium: false },
      { id: 2, name: 'Feature 2', isPremium: true },
    ]),
    findAll: jest.fn().mockResolvedValue([
      { id: 1, name: 'Feature 1', isPremium: false, tierId: 1 },
      { id: 2, name: 'Feature 2', isPremium: true, tierId: 1 },
    ]),
    getFeatureById: jest.fn().mockResolvedValue({
      id: 1,
      name: 'Test Feature',
      enabled: true,
    }),
    create: jest.fn().mockResolvedValue({ id: 1, name: 'New Feature' }),
    bulkCreate: jest.fn().mockResolvedValue([
      { id: 1, name: 'Feature 1', isPremium: false },
      { id: 2, name: 'Feature 2', isPremium: true },
    ]),
    update: jest.fn().mockResolvedValue({ id: 1, name: 'Updated Feature' }),
    remove: jest
      .fn()
      .mockResolvedValue({ id: 1, name: 'Soft Deleted Feature' }),
    restore: jest.fn().mockResolvedValue({ id: 1, name: 'Restored Feature' }),
    bulkRestore: jest.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]),
    hardRemove: jest.fn().mockResolvedValue({ id: 1, name: 'Deleted Feature' }),
    bulkRemove: jest.fn().mockResolvedValue({
      success: [{ id: 1 }, { id: 2 }],
      errors: [],
    }),
    bulkHardRemove: jest.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]),
    findAllDeleted: jest.fn().mockResolvedValue([
      { id: 1, name: 'Deleted Feature 1' },
      { id: 2, name: 'Deleted Feature 2' },
    ]),
  };

  const mockCasbinHelperService = {
    enforceAuthorization: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureResolver,
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

    resolver = module.get<FeatureResolver>(FeatureResolver);
    featureService = module.get<FeatureService>(FeatureService);
    casbinHelperService = module.get<CasbinHelperService>(CasbinHelperService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('listFeatures', () => {
    it('should call casbinHelperService.enforceAuthorization and featureService.listFeatures', async () => {
      const tenantId = 1;
      const skip = 0;
      const take = 10;
      const userId = 1;
      const ipAddress = '127.0.0.1';
      const userAgent = 'Mozilla';

      await resolver.listFeatures(
        tenantId,
        skip,
        take,
        userId,
        ipAddress,
        userAgent,
      );

      expect(casbinHelperService.enforceAuthorization).toHaveBeenCalledWith(
        userId,
        '/features',
        'read',
        tenantId,
      );
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
      const userId = 1;
      const ipAddress = '127.0.0.1';
      const userAgent = 'Mozilla';

      const result = await resolver.listFeatures(
        tenantId,
        skip,
        take,
        userId,
        ipAddress,
        userAgent,
      );

      expect(result).toEqual([
        { id: 1, name: 'Feature 1', isPremium: false },
        { id: 2, name: 'Feature 2', isPremium: true },
      ]);
    });
  });

  describe('findAll', () => {
    it('should call casbinHelperService.enforceAuthorization and featureService.findAll', async () => {
      const tenantId = 1;
      const userId = 1;
      const name = 'Feature';
      const tierId = 1;
      const isPremium = false;

      await resolver.findAll(tenantId, userId, name, tierId, isPremium);

      expect(casbinHelperService.enforceAuthorization).toHaveBeenCalledWith(
        userId,
        '/features',
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
      const isPremium = false;

      const result = await resolver.findAll(
        tenantId,
        userId,
        name,
        tierId,
        isPremium,
      );

      expect(result).toEqual([
        { id: 1, name: 'Feature 1', tierId: 1, isPremium: false },
        { id: 2, name: 'Feature 2', tierId: 1, isPremium: true },
      ]);
    });
  });

  describe('getFeatureById', () => {
    it('should call casbinHelperService.enforceAuthorization and featureService.getFeatureById', async () => {
      const id = 1;
      const tenantId = 1;
      const userId = 1;
      const includeDeleted = false;

      await resolver.getFeatureById(id, tenantId, includeDeleted, userId);

      expect(casbinHelperService.enforceAuthorization).toHaveBeenCalledWith(
        userId,
        `/features/${id}`,
        'read',
        tenantId,
      );
      expect(featureService.getFeatureById).toHaveBeenCalledWith(
        id,
        tenantId,
        includeDeleted,
      );
    });

    it('should return the requested feature', async () => {
      const id = 1;
      const tenantId = 1;
      const userId = 1;
      const includeDeleted = false;

      const result = await resolver.getFeatureById(
        id,
        tenantId,
        includeDeleted,
        userId,
      );

      expect(result).toEqual({
        id: 1,
        name: 'Test Feature',
        enabled: true,
      });
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
      const userAgent = 'Mozilla/5.0';

      await resolver.createFeature(
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
      const userAgent = 'Mozilla/5.0';

      const result = await resolver.createFeature(
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
          description: 'Desc 1',
          isPremium: false,
          enabled: true,
          tierId: 1,
        },
        {
          name: 'Feature 2',
          description: 'Desc 2',
          isPremium: true,
          enabled: true,
          tierId: 2,
        },
      ];
      const tenantId = 1;
      const userId = 1;
      const ipAddress = '127.0.0.1';
      const userAgent = 'Mozilla';

      await resolver.bulkCreateFeatures(
        createFeatureInputs,
        tenantId,
        userId,
        ipAddress,
        userAgent,
      );

      expect(casbinHelperService.enforceAuthorization).toHaveBeenCalledWith(
        userId,
        '/features/bulk-create',
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
          description: 'Desc 1',
          isPremium: false,
          enabled: true,
          tierId: 1,
        },
        {
          name: 'Feature 2',
          description: 'Desc 2',
          isPremium: true,
          enabled: true,
          tierId: 2,
        },
      ];
      const tenantId = 1;
      const userId = 1;
      const ipAddress = '127.0.0.1';
      const userAgent = 'Mozilla';

      const result = await resolver.bulkCreateFeatures(
        createFeatureInputs,
        tenantId,
        userId,
        ipAddress,
        userAgent,
      );

      expect(result).toEqual([
        { id: 1, name: 'Feature 1', isPremium: false },
        { id: 2, name: 'Feature 2', isPremium: true },
      ]);
    });
  });

  describe('updateFeature', () => {
    it('should call casbinHelperService.enforceAuthorization and featureService.update', async () => {
      const updateFeatureInput: UpdateFeatureInput = {
        name: 'Updated Feature',
        description: 'Updated description',
        isPremium: true,
        enabled: false,
        tierId: 2,
        id: 0,
      };
      const id = 1;
      const tenantId = 1;
      const userId = 1;
      const ipAddress = '127.0.0.1';
      const userAgent = 'Mozilla/5.0';

      await resolver.updateFeature(
        id,
        updateFeatureInput,
        tenantId,
        userId,
        ipAddress,
        userAgent,
      );

      expect(casbinHelperService.enforceAuthorization).toHaveBeenCalledWith(
        userId,
        `/features/update/${id}`,
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
        isPremium: true,
        enabled: false,
        tierId: 2,
        id: 0,
      };
      const id = 1;
      const tenantId = 1;
      const userId = 1;
      const ipAddress = '127.0.0.1';
      const userAgent = 'Mozilla/5.0';

      const result = await resolver.updateFeature(
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

  describe('removeFeature', () => {
    it('should call casbinHelperService.enforceAuthorization and featureService.remove', async () => {
      const id = 1;
      const tenantId = 1;
      const userId = 1;
      const ipAddress = '127.0.0.1';
      const userAgent = 'Mozilla/5.0';

      await resolver.removeFeature(id, tenantId, userId, ipAddress, userAgent);

      expect(casbinHelperService.enforceAuthorization).toHaveBeenCalledWith(
        userId,
        `/features/remove/${id}`,
        'delete',
        tenantId,
      );
      expect(featureService.remove).toHaveBeenCalledWith(
        id,
        tenantId,
        userId,
        ipAddress,
        userAgent,
      );
    });

    it('should return the soft-deleted feature', async () => {
      const id = 1;
      const tenantId = 1;
      const userId = 1;
      const ipAddress = '127.0.0.1';
      const userAgent = 'Mozilla/5.0';

      const result = await resolver.removeFeature(
        id,
        tenantId,
        userId,
        ipAddress,
        userAgent,
      );

      expect(result).toEqual({ id: 1, name: 'Soft Deleted Feature' });
    });
  });
  describe('bulkRemoveFeatures', () => {
    it('should call casbinHelperService.enforceAuthorization and featureService.bulkRemove', async () => {
      const featureIds = [1, 2];
      const tenantId = 1;
      const userId = 1;
      const ipAddress = '127.0.0.1';
      const userAgent = 'Mozilla/5.0';

      await resolver.bulkRemoveFeatures(
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

    it('should return true when bulkRemove succeeds', async () => {
      const featureIds = [1, 2];
      const tenantId = 1;
      const userId = 1;
      const ipAddress = '127.0.0.1';
      const userAgent = 'Mozilla/5.0';

      const result = await resolver.bulkRemoveFeatures(
        featureIds,
        tenantId,
        userId,
        ipAddress,
        userAgent,
      );

      expect(result).toBe(true);
    });

    it('should throw an error if bulkRemove encounters failures', async () => {
      mockFeatureService.bulkRemove.mockResolvedValueOnce({
        success: [],
        errors: [{ id: 1 }],
      });

      const featureIds = [1, 2];
      const tenantId = 1;
      const userId = 1;
      const ipAddress = '127.0.0.1';
      const userAgent = 'Mozilla/5.0';

      await expect(
        resolver.bulkRemoveFeatures(
          featureIds,
          tenantId,
          userId,
          ipAddress,
          userAgent,
        ),
      ).rejects.toThrow('Bulk remove encountered errors: 1 failed.');
    });
  });

  describe('bulkRestoreFeatures', () => {
    it('should call casbinHelperService.enforceAuthorization and featureService.bulkRestore', async () => {
      const featureIds = [1, 2];
      const tenantId = 1;
      const userId = 1;
      const ipAddress = '127.0.0.1';
      const userAgent = 'Mozilla/5.0';

      await resolver.bulkRestoreFeatures(
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

    it('should return true when bulkRestore succeeds', async () => {
      const featureIds = [1, 2];
      const tenantId = 1;
      const userId = 1;
      const ipAddress = '127.0.0.1';
      const userAgent = 'Mozilla/5.0';

      const result = await resolver.bulkRestoreFeatures(
        featureIds,
        tenantId,
        userId,
        ipAddress,
        userAgent,
      );

      expect(result).toBe(true);
    });

    it('should return false if no features are restored', async () => {
      mockFeatureService.bulkRestore.mockResolvedValueOnce([]);

      const featureIds = [1, 2];
      const tenantId = 1;
      const userId = 1;
      const ipAddress = '127.0.0.1';
      const userAgent = 'Mozilla/5.0';

      const result = await resolver.bulkRestoreFeatures(
        featureIds,
        tenantId,
        userId,
        ipAddress,
        userAgent,
      );

      expect(result).toBe(false);
    });
  });

  describe('restoreFeature', () => {
    it('should call casbinHelperService.enforceAuthorization and featureService.restore', async () => {
      const id = 1;
      const tenantId = 1;
      const userId = 1;
      const ipAddress = '127.0.0.1';
      const userAgent = 'Mozilla/5.0';

      await resolver.restoreFeature(id, tenantId, userId, ipAddress, userAgent);

      expect(casbinHelperService.enforceAuthorization).toHaveBeenCalledWith(
        userId,
        `/features/restore/${id}`,
        'restore',
        tenantId,
      );
      expect(featureService.restore).toHaveBeenCalledWith(
        id,
        tenantId,
        userId,
        ipAddress,
        userAgent,
      );
    });

    it('should return the restored feature', async () => {
      const id = 1;
      const tenantId = 1;
      const userId = 1;
      const ipAddress = '127.0.0.1';
      const userAgent = 'Mozilla/5.0';

      const result = await resolver.restoreFeature(
        id,
        tenantId,
        userId,
        ipAddress,
        userAgent,
      );

      expect(result).toEqual({ id: 1, name: 'Restored Feature' });
    });
  });

  describe('hardRemoveFeature', () => {
    it('should call casbinHelperService.enforceAuthorization and featureService.hardRemove', async () => {
      const id = 1;
      const tenantId = 1;
      const userId = 1;
      const ipAddress = '127.0.0.1';
      const userAgent = 'Mozilla/5.0';

      await resolver.hardRemoveFeature(
        id,
        tenantId,
        userId,
        ipAddress,
        userAgent,
      );

      expect(casbinHelperService.enforceAuthorization).toHaveBeenCalledWith(
        userId,
        `/features/hard-remove/${id}`,
        'delete',
        tenantId,
      );
      expect(featureService.hardRemove).toHaveBeenCalledWith(
        id,
        tenantId,
        userId,
        ipAddress,
        userAgent,
      );
    });

    it('should return the hard-deleted feature', async () => {
      const id = 1;
      const tenantId = 1;
      const userId = 1;
      const ipAddress = '127.0.0.1';
      const userAgent = 'Mozilla/5.0';

      const result = await resolver.hardRemoveFeature(
        id,
        tenantId,
        userId,
        ipAddress,
        userAgent,
      );

      expect(result).toEqual({ id: 1, name: 'Deleted Feature' });
    });
  });

  describe('bulkHardRemoveFeatures', () => {
    it('should call casbinHelperService.enforceAuthorization and featureService.bulkHardRemove', async () => {
      const featureIds = [1, 2];
      const tenantId = 1;
      const userId = 1;
      const ipAddress = '127.0.0.1';
      const userAgent = 'Mozilla/5.0';

      await resolver.bulkHardRemoveFeatures(
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

    it('should return true when bulkHardRemove succeeds', async () => {
      const featureIds = [1, 2];
      const tenantId = 1;
      const userId = 1;
      const ipAddress = '127.0.0.1';
      const userAgent = 'Mozilla/5.0';

      const result = await resolver.bulkHardRemoveFeatures(
        featureIds,
        tenantId,
        userId,
        ipAddress,
        userAgent,
      );

      expect(result).toBe(true);
    });

    it('should return false if no features are hard-removed', async () => {
      mockFeatureService.bulkHardRemove.mockResolvedValueOnce([]);

      const featureIds = [1, 2];
      const tenantId = 1;
      const userId = 1;
      const ipAddress = '127.0.0.1';
      const userAgent = 'Mozilla/5.0';

      const result = await resolver.bulkHardRemoveFeatures(
        featureIds,
        tenantId,
        userId,
        ipAddress,
        userAgent,
      );

      expect(result).toBe(false);
    });
  });

  describe('findAllDeleted', () => {
    it('should call casbinHelperService.enforceAuthorization and featureService.findAllDeleted', async () => {
      const tenantId = 1;
      const userId = 1;
      const skip = 0;
      const take = 10;

      await resolver.findAllDeleted(tenantId, userId, skip, take);

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

      const result = await resolver.findAllDeleted(
        tenantId,
        userId,
        skip,
        take,
      );

      expect(result).toEqual([
        { id: 1, name: 'Deleted Feature 1' },
        { id: 2, name: 'Deleted Feature 2' },
      ]);
    });
  });
});
