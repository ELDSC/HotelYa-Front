import { expect, it } from 'vitest';
import { rateLabel } from '../../src/utils/rates';
import type { RateInfo } from '../../src/types/catalog';
const rate: RateInfo = { mode: 'HOUR', amount: 25, currency: 'PEN', packageHours: null, additionalHourAmount: null, simulated: true };
it('formats hourly, package, and nightly reference prices', () => {
    expect(rateLabel(rate)).toContain('25.00 por hora');
    expect(rateLabel({ ...rate, mode: 'PACKAGE', amount: 60, packageHours: 3, additionalHourAmount: 20 }))
        .toMatch(/60.00 por paquete de 3 horas.*20.00/);
    expect(rateLabel({ ...rate, mode: 'NIGHT', amount: 120 })).toContain('120.00 por noche');
});

it('omits an additional hourly charge when the owner only configures a package price', () => {
    expect(rateLabel({ ...rate, mode: 'PACKAGE', amount: 70, packageHours: 3 })).toContain('70.00 por paquete de 3 horas');
    expect(rateLabel({ ...rate, mode: 'PACKAGE', amount: 70, packageHours: 3 })).not.toContain('Hora adicional');
});
