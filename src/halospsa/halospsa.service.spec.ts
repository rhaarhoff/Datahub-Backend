import { Test, TestingModule } from '@nestjs/testing';
import { HalospsaClientService } from './halospsa.service';
import { PrismaService } from '../prisma/prisma.service';
import { HaloPsaApiHelper } from './halospsa-api.helper';
import { HaloPsaOAuthHelper } from './halospsa-oauth.helper'; // Ensure OAuthHelper is imported
import { HttpModule } from '@nestjs/axios';
import { HaloPsaClientDto } from './dto/halo-psa-client.dto';
import { ValidationPipe } from '@nestjs/common';

// Helper function to create a mock client
const createMockClient = (): HaloPsaClientDto => ({
  id: Math.floor(Math.random() * 10000),
  name: 'TEST-CUSTOMER-' + Math.floor(Math.random() * 10000),
  inactive: Math.random() < 0.5,
  colour: '#' + Math.floor(Math.random() * 16777215).toString(16),
  toplevel_id: Math.floor(Math.random() * 10),
  toplevel_name: 'Test Area ' + Math.floor(Math.random() * 10),
  item_tax_code: Math.floor(Math.random() * 100),
  service_tax_code: Math.floor(Math.random() * 100),
  taxable: Math.random() < 0.5,
  confirmemail: Math.floor(Math.random() * 10000),
  actionemail: Math.floor(Math.random() * 10000),
  clearemail: Math.floor(Math.random() * 10000),
  messagegroup_id: Math.floor(Math.random() * 1000),
  mailbox_override: Math.floor(Math.random() * 10),
  calldate: new Date(Date.now() - Math.floor(Math.random() * 10000000000)).toISOString(),
  pritech: Math.floor(Math.random() * 10),
  sectech: Math.floor(Math.random() * 10),
  accountmanagertech: Math.floor(Math.random() * 10),
  xero_tenant_id: '',
  client_to_invoice: Math.floor(Math.random() * 10000),
  itglue_id: Math.random().toString(36).substring(2, 18),
  qbo_company_id: Math.random().toString(36).substring(2, 18),
  sentinel_subscription_id: '',
  sentinel_workspace_name: '',
  sentinel_resource_group_name: '',
  default_currency_code: Math.floor(Math.random() * 100),
  client_to_invoice_recurring: Math.floor(Math.random() * 100),
  dbc_company_id: Math.random().toString(36).substring(2, 18),
  customertype: Math.floor(Math.random() * 10),
  ticket_invoices_for_each_site: Math.random() < 0.5,
  is_vip: Math.random() < 0.5,
  percentage_to_survey: Math.floor(Math.random() * 100),
  overridepdftemplatequote: Math.floor(Math.random() * 100),
});

// Helper function to create a mock Prisma customer
const createMockCustomer = (client: HaloPsaClientDto) => ({
  id: 1,
  halopsa_id: client.id,
  name: client.name,
  email: 'test@example.com',
  phone: '123456789',
  inactive: client.inactive,
  colour: client.colour,
  toplevel_id: client.toplevel_id,
  toplevel_name: client.toplevel_name,
  item_tax_code: client.item_tax_code,
  service_tax_code: client.service_tax_code,
  taxable: client.taxable,
  confirmemail: client.confirmemail,
  actionemail: client.actionemail,
  clearemail: client.clearemail,
  messagegroup_id: client.messagegroup_id,
  override_org_name: null,
  override_org_phone: null,
  override_org_email: null,
  override_org_website: null,
  mailbox_override: client.mailbox_override,
  calldate: new Date(client.calldate),
  pritech: client.pritech,
  sectech: client.sectech,
  accountmanagertech: client.accountmanagertech,
  thirdpartynhdapiurl: null,
  xeroid: null,
  xero_tenant_id: null,
  accountsid: null,
  client_to_invoice: client.client_to_invoice,
  itglue_id: client.itglue_id,
  qbo_company_id: client.qbo_company_id,
  kashflow_tenant_id: null,
  sentinel_subscription_id: null,
  sentinel_workspace_name: null,
  sentinel_resource_group_name: null,
  default_currency_code: client.default_currency_code,
  client_to_invoice_recurring: client.client_to_invoice_recurring,
  dbc_company_id: client.dbc_company_id,
  customertype: client.customertype,
  ticket_invoices_for_each_site: client.ticket_invoices_for_each_site,
  is_vip: client.is_vip,
  percentage_to_survey: client.percentage_to_survey,
  overridepdftemplatequote: client.overridepdftemplatequote,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('HalospsaClientService', () => {
  let service: HalospsaClientService;
  let prisma: PrismaService;
  let apiHelper: HaloPsaApiHelper;
  let mockClient: HaloPsaClientDto;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [HalospsaClientService, PrismaService, HaloPsaApiHelper, HaloPsaOAuthHelper],
    }).compile();

    service = module.get<HalospsaClientService>(HalospsaClientService);
    prisma = module.get<PrismaService>(PrismaService);
    apiHelper = module.get<HaloPsaApiHelper>(HaloPsaApiHelper);

    mockClient = createMockClient(); // Generate a new mock client for each test
  });

  afterEach(async () => {
    jest.spyOn(apiHelper, 'delete').mockResolvedValue({});
    await service.deleteClient(mockClient.id);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should sync valid client data to the database', async () => {
    const upsertSpy = jest.spyOn(prisma.customer, 'upsert').mockResolvedValue(createMockCustomer(mockClient));
    jest.spyOn(apiHelper, 'get').mockResolvedValue({ clients: [mockClient] });

    const result = await service.syncClients();
    expect(result).toEqual({ message: 'Client sync completed' });
    expect(upsertSpy).toHaveBeenCalledWith(expect.objectContaining({ where: { halopsa_id: mockClient.id } }));

    upsertSpy.mockRestore();
  });

  it('should fetch a single client by ID', async () => {
    jest.spyOn(apiHelper, 'get').mockResolvedValue(mockClient);
    const result = await service.fetchClientById(mockClient.id);

    expect(result).toEqual(mockClient);
    expect(apiHelper.get).toHaveBeenCalledWith(`/Client/${mockClient.id}`, undefined);
  });

  it('should throw validation error for invalid client data', async () => {
    const invalidClient = { ...mockClient, name: null };
    jest.spyOn(apiHelper, 'get').mockResolvedValue({ clients: [invalidClient] });

    await expect(service.syncClients()).rejects.toThrow();
  });

  it('should handle API 404 error', async () => {
    jest.spyOn(apiHelper, 'get').mockRejectedValue({ response: { status: 404, statusText: 'Not Found' } });
    await expect(service.fetchClientById(999)).rejects.toThrow('Failed to GET data from /Client/999');
  });

  it('should handle no clients returned from API', async () => {
    jest.spyOn(apiHelper, 'get').mockResolvedValue({ clients: [] });
    const upsertSpy = jest.spyOn(prisma.customer, 'upsert').mockResolvedValue(createMockCustomer(mockClient));

    const result = await service.syncClients();
    expect(result).toEqual({ message: 'Client sync completed' });
    expect(upsertSpy).not.toHaveBeenCalled();
  });

  it('should handle clients with partial data', async () => {
    const partialClient = { ...mockClient, name: null }; // Client with missing name
    jest.spyOn(apiHelper, 'get').mockResolvedValue({ clients: [partialClient] });

    await expect(service.syncClients()).rejects.toThrow('Bad Request Exception');
  });

  it('should handle Prisma upsert errors', async () => {
    jest.spyOn(prisma.customer, 'upsert').mockRejectedValue(new Error('Database error'));
    jest.spyOn(apiHelper, 'get').mockResolvedValue({ clients: [mockClient] });

    await expect(service.syncClients()).rejects.toThrow('Database error');
  });
});
