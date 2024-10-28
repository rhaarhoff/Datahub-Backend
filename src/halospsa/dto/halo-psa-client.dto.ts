import { IsInt, IsString, IsBoolean, IsOptional, IsDateString, IsPositive, IsIn } from 'class-validator';

export class HaloPsaClientDto {
  // Use halopsa_id for the external HaloPSA client ID
  @IsInt()
  id: number;

  @IsString()
  name: string;

  @IsBoolean()
  inactive: boolean;

  @IsString()
  @IsOptional()
  colour?: string;

  @IsInt()
  toplevel_id: number;

  @IsString()
  toplevel_name: string;

  @IsInt()
  item_tax_code: number;

  @IsInt()
  service_tax_code: number;

  @IsBoolean()
  taxable: boolean;

  @IsInt()
  @IsOptional()
  confirmemail?: number;

  @IsInt()
  @IsOptional()
  actionemail?: number;

  @IsInt()
  @IsOptional()
  clearemail?: number;

  @IsInt()
  @IsOptional()
  messagegroup_id?: number;

  @IsString()
  @IsOptional()
  override_org_name?: string;

  @IsString()
  @IsOptional()
  override_org_phone?: string;

  @IsString()
  @IsOptional()
  override_org_email?: string;

  @IsString()
  @IsOptional()
  override_org_website?: string;

  @IsInt()
  @IsOptional()
  mailbox_override?: number;

  @IsDateString()
  @IsOptional()
  calldate?: string;

  @IsInt()
  @IsOptional()
  pritech?: number;

  @IsInt()
  @IsOptional()
  sectech?: number;

  @IsInt()
  @IsOptional()
  accountmanagertech?: number;

  @IsString()
  @IsOptional()
  thirdpartynhdapiurl?: string;

  @IsString()
  @IsOptional()
  xeroid?: string;

  @IsString()
  @IsOptional()
  xero_tenant_id?: string;

  @IsString()
  @IsOptional()
  accountsid?: string;

  @IsInt()
  @IsOptional()
  client_to_invoice?: number;

  @IsString()
  @IsOptional()
  itglue_id?: string;

  @IsString()
  @IsOptional()
  qbo_company_id?: string;

  @IsInt()
  @IsOptional()
  kashflow_tenant_id?: number;

  @IsString()
  @IsOptional()
  sentinel_subscription_id?: string;

  @IsString()
  @IsOptional()
  sentinel_workspace_name?: string;

  @IsString()
  @IsOptional()
  sentinel_resource_group_name?: string;

  @IsInt()
  @IsOptional()
  default_currency_code?: number;

  @IsInt()
  @IsOptional()
  client_to_invoice_recurring?: number;

  @IsString()
  @IsOptional()
  dbc_company_id?: string;

  @IsInt()
  @IsOptional()
  customertype?: number;

  @IsBoolean()
  @IsOptional()
  ticket_invoices_for_each_site?: boolean;

  @IsBoolean()
  @IsOptional()
  is_vip?: boolean;

  @IsInt()
  @IsOptional()
  percentage_to_survey?: number;

  @IsInt()
  @IsOptional()
  overridepdftemplatequote?: number;
}
