import { prisma } from '@estays/database';
import { resolveCountryTax, calculateTaxOnCommission, CountryTaxConfig } from '@estays/shared';
import { hotelRepository } from '../repositories/hotel.repository';

export class TaxService {
  async resolveForHotel(hotelId: string): Promise<CountryTaxConfig & { country: string; rate: number }> {
    const hotel = await hotelRepository.findById(hotelId);
    if (!hotel) return { ...resolveCountryTax(''), country: '', rate: 0 };

    const settings = await prisma.partnerFinanceSettings.findUnique({ where: { hotelId } });
    if (settings?.taxRate && Number(settings.taxRate) > 0) {
      return {
        type: (settings.taxType as CountryTaxConfig['type']) || 'GST',
        rate: Number(settings.taxRate),
        label: settings.taxLabel || `${settings.taxType} (${(Number(settings.taxRate) * 100).toFixed(0)}%)`,
        country: settings.taxCountry || hotel.country,
      };
    }

    const config = resolveCountryTax(hotel.country);
    return { ...config, country: hotel.country };
  }

  async syncFinanceSettingsFromCountry(hotelId: string) {
    const hotel = await hotelRepository.findById(hotelId);
    if (!hotel) return;

    const config = resolveCountryTax(hotel.country);
    await prisma.partnerFinanceSettings.upsert({
      where: { hotelId },
      create: {
        hotelId,
        taxRate: config.rate,
        taxType: config.type,
        taxLabel: config.label,
        taxCountry: hotel.country,
        currency: 'USD',
      },
      update: {
        taxRate: config.rate,
        taxType: config.type,
        taxLabel: config.label,
        taxCountry: hotel.country,
      },
    });
  }

  taxOnCommission(commission: number, config: CountryTaxConfig): number {
    return calculateTaxOnCommission(commission, config);
  }
}

export const taxService = new TaxService();
