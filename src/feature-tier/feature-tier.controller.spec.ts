import { Test, TestingModule } from '@nestjs/testing';
import { FeatureTierController } from './feature-tier.controller';
import { FeatureTierService } from './feature-tier.service';
import { CreateFeatureTierDto } from './dto/create-feature-tier.dto';
import { UpdateFeatureTierDto } from './dto/update-feature-tier.dto';
import {
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  ValidationPipe,
} from '@nestjs/common';

describe('FeatureTierController', () => {
  let controller: FeatureTierController;
  let service: FeatureTierService;

  beforeEach(async () => {
    const mockService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      restore: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FeatureTierController],
      providers: [
        {
          provide: FeatureTierService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<FeatureTierController>(FeatureTierController);
    service = module.get<FeatureTierService>(FeatureTierService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new feature tier with a valid name and description', async () => {
      const createDto: CreateFeatureTierDto = {
        name: 'Pro',
        description: 'Pro Tier Description',
      }; // Valid DTO with both name and description
      const createdTier = {
        id: 1,
        name: 'Pro',
        description: 'Pro Tier Description',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      jest.spyOn(service, 'create').mockResolvedValue(createdTier);

      const result = await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(createdTier);
    });

    it('should throw BadRequestException if the name is missing or empty', async () => {
      const createDto: CreateFeatureTierDto = { name: '', description: 'Pro Tier Description' }; // Invalid DTO with empty name

      const validationPipe = new ValidationPipe({ transform: true });

      await expect(
        validationPipe.transform(createDto, {
          type: 'body',
          metatype: CreateFeatureTierDto,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if the name is too long', async () => {
      const createDto: CreateFeatureTierDto = { name: 'a'.repeat(256), description: 'Pro Tier Description' }; // Name too long

      jest
        .spyOn(service, 'create')
        .mockRejectedValue(new BadRequestException('Name too long'));

      await expect(controller.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if the feature tier name already exists', async () => {
      const createDto: CreateFeatureTierDto = { name: 'Pro', description: 'Pro Tier Description' }; // Duplicate name

      jest
        .spyOn(service, 'create')
        .mockRejectedValue(
          new BadRequestException('Feature tier with this name already exists'),
        );

      await expect(controller.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw InternalServerErrorException for unexpected errors', async () => {
      const createDto: CreateFeatureTierDto = { name: 'Pro', description: 'Pro Tier Description' };

      jest
        .spyOn(service, 'create')
        .mockRejectedValue(
          new InternalServerErrorException('Unexpected error'),
        );

      await expect(controller.create(createDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findAll', () => {
    it('should return all feature tiers', async () => {
      const featureTiers = [
        {
          id: 1,
          name: 'Pro',
          description: null, // No description for this feature tier
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      jest.spyOn(service, 'findAll').mockResolvedValue(featureTiers);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual(featureTiers);
    });

    it('should return an empty array if no feature tiers exist', async () => {
      jest.spyOn(service, 'findAll').mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a feature tier by ID', async () => {
      const featureTier = {
        id: 1,
        name: 'Pro',
        description: 'Pro Tier', // Description provided here
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(featureTier);

      const result = await controller.findOne('1');

      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(featureTier);
    });

    it('should throw NotFoundException if the feature tier does not exist', async () => {
      jest.spyOn(service, 'findOne').mockRejectedValue(new NotFoundException());

      await expect(controller.findOne('1')).rejects.toThrow(NotFoundException);

      expect(service.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('update', () => {
    it('should update a feature tier', async () => {
      const updateDto: UpdateFeatureTierDto = { name: 'Updated Pro', description: 'Updated Description' }; // Updated description
      const updatedTier = {
        id: 1,
        name: 'Updated Pro',
        description: 'Updated Description',
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(service, 'update').mockResolvedValue(updatedTier);

      const result = await controller.update('1', updateDto);

      expect(service.update).toHaveBeenCalledWith(1, updateDto);
      expect(result).toEqual(updatedTier);
    });

    it('should throw BadRequestException if the name is invalid', async () => {
      const updateDto: UpdateFeatureTierDto = { name: '', description: 'Updated Description' }; // Invalid name

      jest
        .spyOn(service, 'update')
        .mockRejectedValue(new BadRequestException('Invalid name'));

      await expect(controller.update('1', updateDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw InternalServerErrorException if the service throws an unexpected error', async () => {
      const updateDto: UpdateFeatureTierDto = { name: 'Updated Pro', description: 'Updated Description' };

      jest
        .spyOn(service, 'update')
        .mockRejectedValue(
          new InternalServerErrorException('Unexpected error'),
        );

      await expect(controller.update('1', updateDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('remove', () => {
    it('should soft-delete a feature tier', async () => {
      const result = {
        id: 1,
        name: 'Pro',
        description: 'Pro Tier',
        deletedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(service, 'remove').mockResolvedValue(result);

      const res = await controller.remove('1');

      expect(service.remove).toHaveBeenCalledWith(1);
      expect(res).toEqual(result);
    });

    it('should throw InternalServerErrorException if the service fails', async () => {
      jest
        .spyOn(service, 'remove')
        .mockRejectedValue(
          new InternalServerErrorException('Unexpected error'),
        );

      await expect(controller.remove('1')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('restore', () => {
    it('should restore a soft-deleted feature tier', async () => {
      const restoredTier = {
        id: 1,
        name: 'Pro',
        description: 'Restored Description', // Optional description added during restore
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(service, 'restore').mockResolvedValue(restoredTier);

      const result = await controller.restore('1');

      expect(service.restore).toHaveBeenCalledWith(1);
      expect(result).toEqual(restoredTier);
    });
  });
});
