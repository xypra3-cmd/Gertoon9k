import { describe, expect, it } from 'vitest';
import { normalizePhone, parseCardText } from '../src/cardText';

describe('parseCardText (on-device business card OCR)', () => {
  it('Mongolian card: «Овог Нэр», title, ХХК, phone, e-mail, web, address', () => {
    const r = parseCardText(['МАНДАЛ ДААТГАЛ ХХК', 'Ганбаатар Сараа', 'Даатгалын зөвлөх', 'Утас: 8800-1122', 'saraa@mandal.mn', 'www.mandal.mn', 'СБД, 1-р хороо, Энхтайвны өргөн чөлөө'].join('\n'));
    expect(r).toMatchObject({
      last_name: 'Ганбаатар',
      first_name: 'Сараа',
      title: 'Даатгалын зөвлөх',
      company: 'МАНДАЛ ДААТГАЛ ХХК',
      phone: '8800 1122',
      email: 'saraa@mandal.mn',
      website: 'https://www.mandal.mn',
      address: 'СБД, 1-р хороо, Энхтайвны өргөн чөлөө',
    });
  });

  it('Latin card: «First Last», +976, CEO, LLC', () => {
    const r = parseCardText('Bold Bat\nCEO & Founder\nNomad Tech LLC\nTel: +976 9911 2233\nE-mail: Bold@NomadTech.mn\nnomadtech.mn');
    expect(r).toMatchObject({ first_name: 'Bold', last_name: 'Bat', title: 'CEO & Founder', company: 'Nomad Tech LLC', phone: '+976 9911 2233', email: 'bold@nomadtech.mn', website: 'https://nomadtech.mn' });
  });

  it('initial + name «Б.Болд» and an unlabelled brand line', () => {
    const r = parseCardText('GOBI\nБ.Болд\nБорлуулалтын менежер\n99112233');
    expect(r).toMatchObject({ last_name: 'Б.', first_name: 'Болд', title: 'Борлуулалтын менежер', company: 'GOBI', phone: '9911 2233' });
  });

  it('never invents values from noise', () => {
    expect(parseCardText('')).toEqual({ first_name: '', last_name: '', title: '', company: '', phone: '', email: '', website: '', address: '' });
    expect(parseCardText('12\n---\n').phone).toBe('');
  });

  it('normalizePhone', () => {
    expect(normalizePhone('+976-8800-1122')).toBe('+976 8800 1122');
    expect(normalizePhone('(976) 88001122')).toBe('+976 8800 1122');
    expect(normalizePhone('+1 415 555 0100')).toBe('+1 415 555 0100');
  });
});
