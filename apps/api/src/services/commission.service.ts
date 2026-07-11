import { CommissionType } from '@estays/database';
import { DEFAULT_PLATFORM_COMMISSION_RATE } from '@estays/shared';
import { commissionRepository } from '../repositories/commission.repository';
import { taxService } from './tax.service';
import { parseDecimal } from '../utils/helpers';

export interface CommissionResult {
  commissionAmount: number;
  partnerReceivable: number;
  platformReceivable: number;
  taxAmount: number;
  taxType: string;
  taxLabel: string;
  taxRate: number;
  ruleType: CommissionType;
  ruleName: string;
}

export class CommissionService {
  async calculate(
    hotelId: string,
    finalAmount: number,
    paymentCategory: 'PAID_ONLINE' | 'PAY_AT_HOTEL',
    at = new Date()
  ): Promise<CommissionResult> {
    const rule = await commissionRepository.findActiveForHotel(hotelId, at);
    const amount = finalAmount;

    let commission = 0;
    let ruleType: CommissionType = 'PERCENTAGE';
    let ruleName = 'Default 15%';

    if (rule) {
      ruleType = rule.type;
      ruleName = rule.name;
      switch (rule.type) {
        case 'FLAT':
          commission = parseDecimal(rule.flatAmount);
          break;
        case 'PERCENTAGE':
          commission = amount * parseDecimal(rule.percentageRate);
          break;
        case 'PROMOTIONAL':
          commission = amount * parseDecimal(rule.promotionalRate ?? rule.percentageRate);
          break;
        case 'ZERO':
          commission = 0;
          break;
      }
    } else {
      commission = amount * DEFAULT_PLATFORM_COMMISSION_RATE;
    }

    commission = Math.round(commission * 100) / 100;

    const taxConfig = await taxService.resolveForHotel(hotelId);
    const taxAmount = taxService.taxOnCommission(commission, taxConfig);

    if (paymentCategory === 'PAID_ONLINE') {
      return {
        commissionAmount: commission,
        partnerReceivable: Math.round((amount - commission) * 100) / 100,
        platformReceivable: commission,
        taxAmount,
        taxType: taxConfig.type,
        taxLabel: taxConfig.label,
        taxRate: taxConfig.rate,
        ruleType,
        ruleName,
      };
    }

    return {
      commissionAmount: commission,
      partnerReceivable: amount,
      platformReceivable: commission,
      taxAmount,
      taxType: taxConfig.type,
      taxLabel: taxConfig.label,
      taxRate: taxConfig.rate,
      ruleType,
      ruleName,
    };
  }
}

export const commissionService = new CommissionService();
