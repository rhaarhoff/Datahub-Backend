import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionPlanController } from './subscription-plan.controller';
import { SubscriptionPlanService } from './subscription-plan.service';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';
import { plainToInstance } from 'class-transformer';
import { SubscriptionPlanWithOptionalRelationsDto } from './dto/subscription-plan-with-optional-relations.dto';
import { SubscriptionPlan } from '@prisma/client';

describe('SubscriptionPlanController', () => {
  let controller: SubscriptionPlanController;
  let service: SubscriptionPlanService;

  const mockPlan: SubscriptionPlan = {
    id: 1,
    name: 'Test Plan',
    description: 'Test Description',
    price: 100,
    billingCycle: 'MONTHLY',
    trialPeriodDays: 14,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockPlans = [mockPlan];

  const mockSubscriptionPlanService = {
    create: jest.fn().mockResolvedValue(mockPlan),
    findAll: jest.fn().mockResolvedValue(mockPlans),
    findOne: jest.fn().mockResolvedValue(mockPlan),
    update: jest.fn().mockResolvedValue(mockPlan),
    remove: jest.fn().mockResolvedValue(mockPlan),
    findAllDeleted: jest.fn().mockResolvedValue(mockPlans),
    restore: jest.fn().mockResolvedValue(mockPlan),
    hardRemove: jest.fn().mockResolvedValue(undefined),
    bulkCreate: jest.fn().mockResolvedValue(mockPlans),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubscriptionPlanController],
      providers: [
        {
          provide: SubscriptionPlanService,
          useValue: mockSubscriptionPlanService,
        },
      ],
    }).compile();

    controller = module.get<SubscriptionPlanController>(SubscriptionPlanController);
    service = module.get<SubscriptionPlanService>(SubscriptionPlanService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a subscription plan successfully', async () => {
      const createDto: CreateSubscriptionPlanDto = {
        name: 'Test Plan',
        description: 'Test Description',
        price: 100,
        billingCycle: 'MONTHLY',
      };

      const expectedPlan = plainToInstance(SubscriptionPlanWithOptionalRelationsDto, mockPlan);

      const result = await controller.create(createDto);

      expect(result).toEqual(expectedPlan);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('bulkCreate', () => {
    it('should create subscription plans in bulk successfully', async () => {
      const createDtos: CreateSubscriptionPlanDto[] = [
        {
          name: 'Plan 1',
          description: 'Description for Plan 1',
          price: 100,
          billingCycle: 'MONTHLY',
        },
        {
          name: 'Plan 2',
          description: 'Description for Plan 2',
          price: 200,
          billingCycle: 'ANNUAL',
        },
      ];

      const expectedPlans = plainToInstance(SubscriptionPlanWithOptionalRelationsDto, mockPlans);

      const result = await controller.bulkCreate(createDtos);

      expect(result).toEqual(expectedPlans);
      expect(service.bulkCreate).toHaveBeenCalledWith(createDtos);
    });

    it('should throw an error for invalid bulk creation input', async () => {
      const createDtos: CreateSubscriptionPlanDto[] = [
        {
          name: '',
          description: 'Description with empty name',
          price: 100,
          billingCycle: 'MONTHLY',
        },
      ];

      jest.spyOn(service, 'bulkCreate').mockRejectedValueOnce(new Error('Invalid input'));

      await expect(controller.bulkCreate(createDtos)).rejects.toThrow('Invalid input');
      expect(service.bulkCreate).toHaveBeenCalledWith(createDtos);
    });
  });

  describe('findAll', () => {
    it('should retrieve all active subscription plans', async () => {
      const expectedPlans = plainToInstance(SubscriptionPlanWithOptionalRelationsDto, mockPlans);

      const result = await controller.findAll();

      expect(result).toEqual(expectedPlans);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should retrieve a subscription plan by ID', async () => {
      const expectedPlan = plainToInstance(SubscriptionPlanWithOptionalRelationsDto, mockPlan);

      const result = await controller.findOne(1, 'false');

      expect(result).toEqual(expectedPlan);
      expect(service.findOne).toHaveBeenCalledWith(1, false);
    });
  });

  describe('update', () => {
    it('should update a subscription plan by ID', async () => {
      const updateDto: UpdateSubscriptionPlanDto = {
        name: 'Updated Plan',
        description: 'Updated Description', // Description is required in the update as well
        price: 200,
      };

      const expectedPlan = plainToInstance(SubscriptionPlanWithOptionalRelationsDto, mockPlan);

      const result = await controller.update(1, updateDto);

      expect(result).toEqual(expectedPlan);
      expect(service.update).toHaveBeenCalledWith(1, updateDto);
    });
  });

  describe('remove', () => {
    it('should soft delete a subscription plan', async () => {
      await controller.remove(1);

      expect(service.remove).toHaveBeenCalledWith(1);
    });
  });

  describe('findAllDeleted', () => {
    it('should retrieve all soft-deleted subscription plans (recycle bin)', async () => {
      const expectedPlans = plainToInstance(SubscriptionPlanWithOptionalRelationsDto, mockPlans);

      const result = await controller.findAllDeleted();

      expect(result).toEqual(expectedPlans);
      expect(service.findAllDeleted).toHaveBeenCalled();
    });
  });

  describe('restore', () => {
    it('should restore a soft-deleted subscription plan', async () => {
      const expectedPlan = plainToInstance(SubscriptionPlanWithOptionalRelationsDto, mockPlan);

      const result = await controller.restore(1);

      expect(result).toEqual(expectedPlan);
      expect(service.restore).toHaveBeenCalledWith(1);
    });
  });

  describe('hardRemove', () => {
    it('should hard delete a subscription plan', async () => {
      await controller.hardRemove(1);

      expect(service.hardRemove).toHaveBeenCalledWith(1);
    });
  });
});

