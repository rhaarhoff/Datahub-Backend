// src/casbin/prisma-adapter.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '@prisma-service/prisma.service';
import { Adapter, Helper, Model } from 'casbin';

@Injectable()
export class PrismaAdapterService implements Adapter {
  constructor(private readonly prismaService: PrismaService) {}

  async loadPolicy(model: Model): Promise<void> {
    const lines = await this.prismaService.casbinRule.findMany();
    for (const line of lines) {
      Helper.loadPolicyLine(
        `${line.ptype}, ${line.v0 || ''}, ${line.v1 || ''}, ${line.v2 || ''}, ${line.v3 || ''}, ${line.v4 || ''}, ${line.v5 || ''}`,
        model,
      );
    }
  }

  async savePolicy(model: Model): Promise<boolean> {
    try {
      await this.prismaService.casbinRule.deleteMany(); // Clear existing policies
      const policyRuleAST = model.model.get('p') || new Map();
      const policies = [];
  
      for (const [ptype, ast] of policyRuleAST.entries()) {
        for (const rule of ast.policy) {
          const policy = {
            ptype,
            v0: rule[0] || null,
            v1: rule[1] || null,
            v2: rule[2] || null,
            v3: rule[3] || null,
            v4: rule[4] || null,
            v5: rule[5] || null,
          };
          policies.push(policy);
        }
      }
  
      if (policies.length > 0) {
        await this.prismaService.casbinRule.createMany({
          data: policies,
        });
      }
  
      return true; // Return true to indicate success
    } catch (error) {
      // Log the error
      console.error('Error saving policies to database:', error);
      return false; // Return false to indicate failure
    }
  }
  

  async addPolicy(sec: string, ptype: string, rule: string[]): Promise<void> {
    await this.prismaService.casbinRule.create({
      data: {
        ptype,
        v0: rule[0] || null,
        v1: rule[1] || null,
        v2: rule[2] || null,
        v3: rule[3] || null,
        v4: rule[4] || null,
        v5: rule[5] || null,
      },
    });
  }

  async removePolicy(sec: string, ptype: string, rule: string[]): Promise<void> {
    await this.prismaService.casbinRule.deleteMany({
      where: {
        ptype,
        v0: rule[0] || undefined,
        v1: rule[1] || undefined,
        v2: rule[2] || undefined,
        v3: rule[3] || undefined,
        v4: rule[4] || undefined,
        v5: rule[5] || undefined,
      },
    });
  }

  async removeFilteredPolicy(
    sec: string,
    ptype: string,
    fieldIndex: number,
    ...fieldValues: string[]
  ): Promise<void> {
    const whereClause: Record<string, string | undefined> = { ptype };

    for (let i = 0; i < fieldValues.length; i++) {
      if (fieldValues[i] !== '') {
        whereClause[`v${fieldIndex + i}`] = fieldValues[i];
      }
    }

    await this.prismaService.casbinRule.deleteMany({ where: whereClause });
  }
}
