import { Test, TestingModule } from '@nestjs/testing';
import { FeatureTierService } from './feature-tier.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

// Define Mock Types for Clarity
type MockedPrismaService = {
  featureTier: {
    create: jest.Mock;
    findUnique: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  feature: {
    findMany: jest.Mock;
  };
};

describe('FeatureTierService', () => {
  let service: FeatureTierService;
  let prisma: MockedPrismaService;

  beforeEach(async () => {
    prisma = {
      featureTier: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      feature: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureTierService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<FeatureTierService>(FeatureTierService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new feature tier', async () => {
      const createDto = { name: 'Pro', description: 'Pro Tier' };

      prisma.featureTier.findUnique.mockResolvedValue(null);
      prisma.featureTier.create.mockResolvedValue({ id: 1, ...createDto });

      const result = await service.create(createDto);

      expect(prisma.featureTier.findUnique).toHaveBeenCalledWith({
        where: { name: createDto.name },
      });
      expect(prisma.featureTier.create).toHaveBeenCalledWith({
        data: createDto,
      });
      expect(result).toEqual({ id: 1, ...createDto });
    });

    it('should throw BadRequestException if the feature tier name already exists', async () => {
      const createDto = { name: 'Pro', description: 'Pro Tier' };

      prisma.featureTier.findUnique.mockResolvedValue({ id: 1, ...createDto });

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );

      expect(prisma.featureTier.findUnique).toHaveBeenCalledWith({
        where: { name: createDto.name },
      });
    });
  });

  describe('findAll', () => {
    it('should return all feature tiers without deleted ones', async () => {
      const featureTiers = [{ id: 1, name: 'Pro', deletedAt: null }];

      prisma.featureTier.findMany.mockResolvedValue(featureTiers);

      const result = await service.findAll();

      expect(prisma.featureTier.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        where: { deletedAt: null },
      });
      expect(result).toEqual(featureTiers);
    });

    it('should include soft-deleted feature tiers when includeDeleted is true', async () => {
      const featureTiers = [{ id: 1, name: 'Pro', deletedAt: new Date() }];

      prisma.featureTier.findMany.mockResolvedValue(featureTiers);

      const result = await service.findAll(10, 0, true);

      expect(prisma.featureTier.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        where: {},
      });
      expect(result).toEqual(featureTiers);
    });
  });

  describe('findOne', () => {
    it('should return a feature tier by ID', async () => {
      const featureTier = { id: 1, name: 'Pro', deletedAt: null };

      prisma.featureTier.findUnique.mockResolvedValue(featureTier);

      const result = await service.findOne(1);

      expect(prisma.featureTier.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual(featureTier);
    });

    it('should throw NotFoundException if the feature tier does not exist', async () => {
      prisma.featureTier.findUnique.mockResolvedValue(null);

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);

      expect(prisma.featureTier.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });

  describe('update', () => {
    it('should update a feature tier', async () => {
      const updateDto = { name: 'Updated Pro' };
      const existingTier = { id: 1, name: 'Pro', deletedAt: null };

      // Mock finding the existing feature tier to update
      prisma.featureTier.findUnique.mockResolvedValueOnce(existingTier);

      // Mock checking for a name conflict (should not find any tier with the new name)
      prisma.featureTier.findUnique.mockResolvedValueOnce(null);

      // Mock the update operation
      prisma.featureTier.update.mockResolvedValue({ id: 1, ...updateDto });

      const result = await service.update(1, updateDto);

      expect(prisma.featureTier.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });

      expect(prisma.featureTier.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: updateDto,
      });

      expect(result).toEqual({ id: 1, ...updateDto });
    });

    it('should throw NotFoundException if the feature tier does not exist or is soft-deleted', async () => {
      prisma.featureTier.findUnique.mockResolvedValue(null);

      await expect(service.update(1, { name: 'Updated Pro' })).rejects.toThrow(
        NotFoundException,
      );

      expect(prisma.featureTier.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });

  describe('remove', () => {
    it('should soft-delete a feature tier', async () => {
      const existingTier = { id: 1, name: 'Pro', deletedAt: null };

      prisma.featureTier.findUnique.mockResolvedValue(existingTier);
      prisma.feature.findMany.mockResolvedValue([]); // No associated features
      prisma.featureTier.update.mockResolvedValue({
        id: 1,
        deletedAt: new Date(),
      });

      const result = await service.remove(1);

      expect(prisma.featureTier.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(prisma.feature.findMany).toHaveBeenCalledWith({
        where: { tierId: 1 },
      });
      expect(prisma.featureTier.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deletedAt: expect.any(Date) },
      });
      expect(result).toEqual({ id: 1, deletedAt: expect.any(Date) });
    });

    it('should throw NotFoundException if the feature tier does not exist or is already deleted', async () => {
      prisma.featureTier.findUnique.mockResolvedValue(null);

      await expect(service.remove(1)).rejects.toThrow(NotFoundException);

      expect(prisma.featureTier.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });

  describe('restore', () => {
    it('should restore a soft-deleted feature tier', async () => {
      const deletedTier = { id: 1, name: 'Pro', deletedAt: new Date() };

      prisma.featureTier.findUnique.mockResolvedValue(deletedTier);
      prisma.featureTier.update.mockResolvedValue({ id: 1, deletedAt: null });

      const result = await service.restore(1);

      expect(prisma.featureTier.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(prisma.featureTier.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deletedAt: null },
      });
      expect(result).toEqual({ id: 1, deletedAt: null });
    });

    it('should throw NotFoundException if the feature tier is not soft-deleted', async () => {
      const existingTier = { id: 1, name: 'Pro', deletedAt: null };

      prisma.featureTier.findUnique.mockResolvedValue(existingTier);

      await expect(service.restore(1)).rejects.toThrow(NotFoundException);

      expect(prisma.featureTier.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });
});
