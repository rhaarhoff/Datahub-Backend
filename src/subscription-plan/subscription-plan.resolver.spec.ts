import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionPlanResolver } from './subscription-plan.resolver';
import { SubscriptionPlanService } from './subscription-plan.service';
import { CreateSubscriptionPlanInput } from './dto/create-subscription-plan.input';
import { NotFoundException } from '@nestjs/common';
import { SubscriptionPlan } from './models/subscription-plan.model';

describe('SubscriptionPlanResolver', () => {
  let resolver: SubscriptionPlanResolver;
  let service: SubscriptionPlanService;

  // Mock plan omitting optional fields (trialPeriodDays, deletedAt)
  const mockPlan: Omit<SubscriptionPlan, 'trialPeriodDays' | 'deletedAt'> = {
    id: 1,
    name: 'Test Plan',
    description: 'Test Description',
    price: 100,
    billingCycle: 'MONTHLY',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPlans: Omit<SubscriptionPlan, 'trialPeriodDays' | 'deletedAt'>[] = [
    mockPlan,
  ];

  // Mock service with all method stubs returning mock values
  const mockSubscriptionPlanService = {
    create: jest.fn().mockResolvedValue(mockPlan),
    bulkCreate: jest.fn().mockResolvedValue(mockPlans),
    findAll: jest.fn().mockResolvedValue(mockPlans),
    findOne: jest.fn().mockResolvedValue(mockPlan),
    update: jest.fn().mockResolvedValue(mockPlan),
    remove: jest.fn().mockResolvedValue(mockPlan),
    findAllDeleted: jest.fn().mockResolvedValue(mockPlans),
    restore: jest.fn().mockResolvedValue(mockPlan),
    hardRemove: jest.fn().mockResolvedValue(undefined),
  };

  // Set up the module and resolver
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionPlanResolver,
        {
          provide: SubscriptionPlanService,
          useValue: mockSubscriptionPlanService,
        },
      ],
    }).compile();

    resolver = module.get<SubscriptionPlanResolver>(SubscriptionPlanResolver);
    service = module.get<SubscriptionPlanService>(SubscriptionPlanService);
  });

  // Clean up after each test case
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  // Test for creating a subscription plan
  describe('createSubscriptionPlan', () => {
    it('should create a subscription plan successfully', async () => {
      const createInput: CreateSubscriptionPlanInput = {
        name: 'Test Plan',
        description: 'Test Description',
        price: 100,
        billingCycle: 'MONTHLY',
      };

      const result = await resolver.createSubscriptionPlan(createInput);

      expect(result).toEqual(mockPlan);
      expect(service.create).toHaveBeenCalledWith(createInput);
    });
  });

  // Test for retrieving a subscription plan by ID
  describe('findOne', () => {
    it('should retrieve a subscription plan by ID', async () => {
      const result = await resolver.findOne(1, false);

      expect(result).toEqual(mockPlan);
      expect(service.findOne).toHaveBeenCalledWith(1, false);
    });

    it('should throw NotFoundException if plan not found', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(null);
      await expect(resolver.findOne(1, false)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // Test for restoring a subscription plan (soft-deleted)
  describe('restoreSubscriptionPlan', () => {
    it('should restore a soft-deleted subscription plan', async () => {
      // Mock a soft-deleted plan (with trialPeriodDays and deletedAt)
      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: 1,
        name: 'Test Plan',
        description: 'Test Description',
        price: 100,
        billingCycle: 'MONTHLY',
        trialPeriodDays: 14, // Optional field added in this context
        deletedAt: new Date(), // Mark as soft-deleted
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Mock the restore method to return the restored plan with deletedAt set to null
      jest.spyOn(service, 'restore').mockResolvedValue({
        id: 1,
        name: 'Test Plan',
        description: 'Test Description',
        price: 100,
        billingCycle: 'MONTHLY',
        trialPeriodDays: 14,
        deletedAt: null, // After restoration, this should be null
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await resolver.restoreSubscriptionPlan(1);

      expect(result.deletedAt).toBeNull(); // After restoration, deletedAt should be null
      expect(service.restore).toHaveBeenCalledWith(1);
    });
  });
});
