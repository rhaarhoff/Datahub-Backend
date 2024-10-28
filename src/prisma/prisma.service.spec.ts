import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

describe('PrismaService (Integration with real DB)', () => {
  let service: PrismaService;

  const testEmail = 'jane.doe@example.com';
  const johnEmail = 'john.doe@example.com';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);

    // Connect to the database
    await service.onModuleInit();
  });

  afterEach(async () => {
    // Clean up test data after each test to avoid conflicts with unique constraints
    await service.customer.deleteMany({ where: { email: testEmail } });
    await service.customer.deleteMany({ where: { email: johnEmail } });
  });

  afterAll(async () => {
    // Ensure Prisma client is disconnected after all tests
    await service.onModuleDestroy();
  });

  it('should create a customer in the real database', async () => {
    const customerData = {
      name: 'Jane Doe',
      email: testEmail,
      toplevel_id: 1,
      toplevel_name: 'Top Level Test',
      item_tax_code: 1,
      service_tax_code: 1,
      taxable: false, // or true, depending on your use case
    };

    // Call the real Prisma service method to create a customer
    const result = await service.customer.create({ data: customerData });

    // Verify the customer was created in the database
    expect(result).toMatchObject({
      name: 'Jane Doe',
      email: testEmail,
      phone: null,
    });
  });

  it('should retrieve customers from the real database', async () => {
    const customerData = {
      name: 'John Doe',
      email: johnEmail,
      toplevel_id: 1,
      toplevel_name: 'Top Level Test',
      item_tax_code: 1,
      service_tax_code: 1,
      taxable: false, // or true
    };

    // Insert a test customer
    await service.customer.create({ data: customerData });

    // Retrieve customers
    const result = await service.customer.findMany();

    // Verify that at least one customer is retrieved
    expect(result.length).toBeGreaterThan(0);
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'John Doe',
          email: johnEmail,
        }),
      ])
    );
  });
});
