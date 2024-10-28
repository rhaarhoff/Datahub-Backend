import { Injectable } from '@nestjs/common';
import { HaloPsaApiHelper } from './halospsa-api.helper';
import { PrismaService } from '../prisma/prisma.service';
import { HaloPsaClientDto } from './dto/halo-psa-client.dto';
import { ValidationPipe } from '@nestjs/common';

@Injectable()
export class HalospsaClientService {
  constructor(
    private readonly apiHelper: HaloPsaApiHelper,
    private readonly prisma: PrismaService, // PrismaService injection
  ) {}

  // Fetch a list of clients from HaloPSA
  async fetchClients(queryParams?: any): Promise<HaloPsaClientDto[]> {
    const response = await this.apiHelper.get('/Client', queryParams);
    const clients = response.clients;

    // Validate and transform the clients using the HaloPsaClientDto
    for (const client of clients) {
      const clientDto = new HaloPsaClientDto();
      Object.assign(clientDto, client);

      const validationPipe = new ValidationPipe({ transform: true });
      await validationPipe.transform(clientDto, {
        type: 'body',
        metatype: HaloPsaClientDto,
      });
    }

    return clients;
  }

  // Fetch a single client by ID from HaloPSA
  async fetchClientById(
    clientId: number,
    queryParams?: { includedetails?: boolean; includeactivity?: boolean },
  ) {
    try {
      const client = await this.apiHelper.get(
        `/Client/${clientId}`,
        queryParams,
      );

      // Validate the single client using the DTO
      const clientDto = new HaloPsaClientDto();
      Object.assign(clientDto, client);

      const validationPipe = new ValidationPipe({ transform: true });
      await validationPipe.transform(clientDto, {
        type: 'body',
        metatype: HaloPsaClientDto,
      });

      return client;
    } catch (error) {
      throw new Error(`Failed to GET data from /Client/${clientId}`);
    }
  }

  // Create or update clients
  async addOrUpdateClients(clients: Array<HaloPsaClientDto>) {
    // Validate and transform each client using the DTO
    for (const client of clients) {
      const validationPipe = new ValidationPipe({ transform: true });
      await validationPipe.transform(client, {
        type: 'body',
        metatype: HaloPsaClientDto,
      });
    }

    return this.apiHelper.post('/Client', { root: clients });
  }

  // Delete a client by ID
  async deleteClient(clientId: number) {
    return this.apiHelper.delete(`/Client/${clientId}`);
  }

  // Sync clients (fetch, validate, and upsert into the database)
  async syncClients() {
    const clients = await this.fetchClients(); // Fetch clients from HaloPSA

    for (const client of clients) {
      // Use halopsa_id for upserting clients in the database
      await this.prisma.customer.upsert({
        where: { halopsa_id: client.id }, // Match by halopsa_id (HaloPSA client ID)
        update: {
          // Update existing fields in the database
          name: client.name,
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
          override_org_name: client.override_org_name,
          override_org_phone: client.override_org_phone,
          override_org_email: client.override_org_email,
          override_org_website: client.override_org_website,
          mailbox_override: client.mailbox_override,
          calldate: client.calldate,
          pritech: client.pritech,
          sectech: client.sectech,
          accountmanagertech: client.accountmanagertech,
          thirdpartynhdapiurl: client.thirdpartynhdapiurl,
          xeroid: client.xeroid,
          xero_tenant_id: client.xero_tenant_id,
          accountsid: client.accountsid,
          client_to_invoice: client.client_to_invoice,
          itglue_id: client.itglue_id,
          qbo_company_id: client.qbo_company_id,
          kashflow_tenant_id: client.kashflow_tenant_id,
          sentinel_subscription_id: client.sentinel_subscription_id,
          sentinel_workspace_name: client.sentinel_workspace_name,
          sentinel_resource_group_name: client.sentinel_resource_group_name,
          default_currency_code: client.default_currency_code,
          client_to_invoice_recurring: client.client_to_invoice_recurring,
          dbc_company_id: client.dbc_company_id,
          customertype: client.customertype,
          ticket_invoices_for_each_site: client.ticket_invoices_for_each_site,
          is_vip: client.is_vip,
          percentage_to_survey: client.percentage_to_survey,
          overridepdftemplatequote: client.overridepdftemplatequote,
        },
        create: {
          // Create new client record with the necessary fields
          halopsa_id: client.id, // Use the HaloPSA client ID as halopsa_id
          name: client.name,
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
          override_org_name: client.override_org_name,
          override_org_phone: client.override_org_phone,
          override_org_email: client.override_org_email,
          override_org_website: client.override_org_website,
          mailbox_override: client.mailbox_override,
          calldate: client.calldate,
          pritech: client.pritech,
          sectech: client.sectech,
          accountmanagertech: client.accountmanagertech,
          thirdpartynhdapiurl: client.thirdpartynhdapiurl,
          xeroid: client.xeroid,
          xero_tenant_id: client.xero_tenant_id,
          accountsid: client.accountsid,
          client_to_invoice: client.client_to_invoice,
          itglue_id: client.itglue_id,
          qbo_company_id: client.qbo_company_id,
          kashflow_tenant_id: client.kashflow_tenant_id,
          sentinel_subscription_id: client.sentinel_subscription_id,
          sentinel_workspace_name: client.sentinel_workspace_name,
          sentinel_resource_group_name: client.sentinel_resource_group_name,
          default_currency_code: client.default_currency_code,
          client_to_invoice_recurring: client.client_to_invoice_recurring,
          dbc_company_id: client.dbc_company_id,
          customertype: client.customertype,
          ticket_invoices_for_each_site: client.ticket_invoices_for_each_site,
          is_vip: client.is_vip,
          percentage_to_survey: client.percentage_to_survey,
          overridepdftemplatequote: client.overridepdftemplatequote,
        },
      });
    }

    return { message: 'Client sync completed' };
  }
}
