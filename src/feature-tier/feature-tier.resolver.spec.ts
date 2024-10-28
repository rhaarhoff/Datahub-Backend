import { Test, TestingModule } from '@nestjs/testing';
import { FeatureTierResolver } from './feature-tier.resolver';
import { FeatureTierService } from './feature-tier.service';
import { CreateFeatureTierInput } from './dto/create-feature-tier.input';
import { UpdateFeatureTierInput } from './dto/update-feature-tier.input';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { FeatureTier } from '@prisma/client'; // Prisma-generated type

describe('FeatureTierResolver', () => {
  let resolver: FeatureTierResolver;
  let service: FeatureTierService;

  beforeEach(async () => {
    const mockService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      restore: jest.fn(),
      findDeleted: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureTierResolver,
        {
          provide: FeatureTierService,
          useValue: mockService,
        },
      ],
    }).compile();

    resolver = module.get<FeatureTierResolver>(FeatureTierResolver);
    service = module.get<FeatureTierService>(FeatureTierService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('createFeatureTier', () => {
    it('should create a new feature tier', async () => {
      const createInput: CreateFeatureTierInput = { name: 'Pro', description: 'Pro Tier Description' };

      const createdTier: FeatureTier = {
        id: 1,
        name: 'Pro',
        description: 'Pro Tier Description',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      jest.spyOn(service, 'create').mockResolvedValue(createdTier);

      const result = await resolver.createFeatureTier(createInput);

      expect(service.create).toHaveBeenCalledWith(createInput);
      expect(result).toEqual(createdTier);
    });

    it('should throw BadRequestException if the feature tier name already exists', async () => {
      const createInput: CreateFeatureTierInput = { name: 'Pro', description: 'Pro Tier Description' };

      jest
        .spyOn(service, 'create')
        .mockRejectedValue(new BadRequestException('Feature tier with this name already exists'));

      await expect(resolver.createFeatureTier(createInput)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return all feature tiers', async () => {
      const featureTiers: FeatureTier[] = [
        {
          id: 1,
          name: 'Pro',
          description: 'Pro Tier',
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ];

      jest.spyOn(service, 'findAll').mockResolvedValue(featureTiers);

      const result = await resolver.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual(featureTiers);
    });
  });

  describe('findOne', () => {
    it('should return a feature tier by ID', async () => {
      const featureTier: FeatureTier = {
        id: 1,
        name: 'Pro',
        description: 'Pro Tier',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(featureTier);

      const result = await resolver.findOne(1);

      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(featureTier);
    });

    it('should throw NotFoundException if the feature tier does not exist', async () => {
      jest.spyOn(service, 'findOne').mockRejectedValue(new NotFoundException());

      await expect(resolver.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateFeatureTier', () => {
    it('should update a feature tier', async () => {
      const updateInput: UpdateFeatureTierInput = { name: 'Updated Pro', description: 'Updated Pro Description' };

      const updatedTier: FeatureTier = {
        id: 1,
        name: 'Updated Pro',
        description: 'Updated Pro Description',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      jest.spyOn(service, 'update').mockResolvedValue(updatedTier);

      const result = await resolver.updateFeatureTier(1, updateInput);

      expect(service.update).toHaveBeenCalledWith(1, updateInput);
      expect(result).toEqual(updatedTier);
    });

    it('should throw NotFoundException if the feature tier does not exist', async () => {
      const updateInput: UpdateFeatureTierInput = { name: 'Updated Pro', description: 'Updated Pro Description' };

      jest.spyOn(service, 'update').mockRejectedValue(new NotFoundException());

      await expect(resolver.updateFeatureTier(1, updateInput)).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeFeatureTier', () => {
    it('should soft-delete a feature tier', async () => {
      const result: FeatureTier = {
        id: 1,
        name: 'Pro',
        description: 'Pro Tier',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: new Date(),
      };

      jest.spyOn(service, 'remove').mockResolvedValue(result);

      const res = await resolver.removeFeatureTier(1);

      expect(service.remove).toHaveBeenCalledWith(1);
      expect(res).toEqual(result);
    });

    it('should throw NotFoundException if the feature tier does not exist', async () => {
      jest.spyOn(service, 'remove').mockRejectedValue(new NotFoundException());

      await expect(resolver.removeFeatureTier(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('restoreFeatureTier', () => {
    it('should restore a soft-deleted feature tier', async () => {
      const restoredTier: FeatureTier = {
        id: 1,
        name: 'Pro',
        description: 'Pro Tier',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null, // deletedAt is null after restoration
      };

      jest.spyOn(service, 'restore').mockResolvedValue(restoredTier);

      const result = await resolver.restoreFeatureTier(1);

      expect(service.restore).toHaveBeenCalledWith(1);
      expect(result).toEqual(restoredTier);
    });
  });

  describe('findDeleted', () => {
    it('should return all soft-deleted feature tiers', async () => {
      const deletedFeatureTiers: FeatureTier[] = [
        {
          id: 1,
          name: 'Pro',
          description: 'Pro Tier',
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: new Date(), // deletedAt set for deleted items
        },
      ];

      jest.spyOn(service, 'findDeleted').mockResolvedValue(deletedFeatureTiers);

      const result = await resolver.findDeleted();

      expect(service.findDeleted).toHaveBeenCalled();
      expect(result).toEqual(deletedFeatureTiers);
    });
  });
});
