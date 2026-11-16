// One-off: writes data/providers.src.json with FICTIONAL sample listings for the prototype.
// After this, edit providers.src.json by hand (or replace it) and run `node tools/build-data.mjs`.
import { writeFileSync } from 'node:fs';

const N = {
  watertown:[42.3709,-71.1828,'Watertown, MA'],  cambridge:[42.3736,-71.1097,'Cambridge, MA'],
  somerville:[42.3876,-71.0995,'Somerville, MA'], brookline:[42.3318,-71.1212,'Brookline, MA'],
  newton:[42.3370,-71.2092,'Newton, MA'],         backbay:[42.3503,-71.0810,'Back Bay, Boston, MA'],
  jp:[42.3098,-71.1144,'Jamaica Plain, Boston, MA'], arlington:[42.4154,-71.1565,'Arlington, MA'],
  belmont:[42.3959,-71.1776,'Belmont, MA'],       waltham:[42.3765,-71.2356,'Waltham, MA'],
  medford:[42.4184,-71.1062,'Medford, MA'],       quincy:[42.2529,-71.0023,'Quincy, MA'],
  dorchester:[42.3016,-71.0676,'Dorchester, Boston, MA'], allston:[42.3539,-71.1337,'Allston, Boston, MA'],
  lexington:[42.4430,-71.2290,'Lexington, MA'],   melrose:[42.4584,-71.0662,'Melrose, MA'],
  needham:[42.2810,-71.2370,'Needham, MA'],       wellesley:[42.2968,-71.2924,'Wellesley, MA'],
  framingham:[42.2793,-71.4162,'Framingham, MA'], salem:[42.5195,-70.8967,'Salem, MA'],
};
const NE = ['MA','NH','RI','CT','VT','ME'];
let n = 0;
const out = [];
function p(name, services, modes, where, o = {}) {
  n++;
  const rec = {
    id: 'sample-' + String(n).padStart(3, '0'),
    name, services, modes,
    blurb: o.blurb,
    languages: o.languages || ['English'],
    insurance: !!o.insurance,
    cost: o.cost || '',
    credentials: o.credentials || '',
    phone: `(617) 555-01${String(n + 10).padStart(2, '0')}`,
    website: `https://example.com/${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    lastVerified: o.verified || '2026-11-0' + (1 + (n % 9)),
    sample: true,
  };
  if (where) {
    const [la, lo, area] = N[where];
    rec.lat = +(la + ((n * 37) % 11 - 5) * 0.0011).toFixed(5);
    rec.lng = +(lo + ((n * 53) % 11 - 5) * 0.0013).toFixed(5);
    rec.area = area;
  }
  if (modes.includes('home_visit')) rec.homeVisit = { radiusMiles: o.radius || 10 };
  if (modes.includes('virtual')) rec.virtual = o.states ? { states: o.states } : {};
  out.push(rec);
}

p('Birchwood Yoga Studio', ['yoga','pilates'], ['in_person'], 'watertown',
  { blurb: 'Small-group prenatal and mom-and-baby classes in a quiet studio.', credentials: 'RPYT prenatal yoga teachers', cost: '$$' });
p('Charles Bend Pilates', ['pilates'], ['in_person'], 'cambridge',
  { blurb: 'Reformer and mat pilates for pregnancy and gentle return to core work.', cost: '$$$' });
p('Little Lantern Fitness', ['fitness'], ['in_person','virtual'], 'somerville',
  { blurb: 'Strength and stamina coaching; babies welcome at stroller sessions.', states: NE, cost: '$$' });
p('Moving Mamas Stroller Fitness', ['fitness'], ['in_person'], 'arlington',
  { blurb: 'Outdoor stroller-based workouts, all fitness levels.', cost: '$' });
p('Harbor Pelvic Health PT', ['pelvic_floor','physio_chiro'], ['in_person'], 'brookline',
  { blurb: 'Pelvic floor, diastasis and C-section scar rehab with one-on-one sessions.', insurance: true, credentials: 'DPT, PRPC', languages: ['English','Spanish'], cost: '$$' });
p('Mend & Move Rehab', ['pelvic_floor'], ['in_person'], 'allston',
  { blurb: 'Postpartum recovery specialists; evening and Saturday appointments.', insurance: true, credentials: 'DPT', languages: ['English','Hindi'], cost: '$$', verified: '2026-03-10' });
p('Backbay Physical Therapy', ['physio_chiro'], ['in_person'], 'backbay',
  { blurb: 'Back, hip and pelvic pain care during pregnancy and after birth.', insurance: true, credentials: 'DPT', cost: '$$' });
p('Spine & Sprout Chiropractic', ['physio_chiro'], ['in_person'], 'salem',
  { blurb: 'Pregnancy-focused chiropractic care and gentle adjustments.', credentials: 'DC, Webster-certified', cost: '$$' });
p('Common Ground Childbirth Classes', ['childbirth_ed'], ['in_person','virtual'], 'arlington',
  { blurb: 'Evidence-based birth prep, newborn care and partner classes.', states: ['MA'], cost: 'Sliding scale', credentials: 'Certified childbirth educator' });
p('Stonebridge Birth Education', ['childbirth_ed'], ['virtual'], null,
  { blurb: 'Self-paced and live online birth preparation courses.', cost: '$', languages: ['English','Spanish'] });
p('Evergreen Doulas', ['doula'], ['home_visit'], 'newton',
  { blurb: 'Birth and postpartum doulas who come to your home or hospital.', radius: 12, cost: '$$$', credentials: 'Certified birth doulas', languages: ['English','Mandarin'] });
p('Moonrise Postpartum Doulas', ['doula'], ['home_visit'], 'jp',
  { blurb: 'Overnight and daytime postpartum support at home.', radius: 15, cost: '$$$', languages: ['English','Spanish','Portuguese'] });
p('Kindred Birth Collective', ['doula','childbirth_ed'], ['home_visit','virtual'], 'medford',
  { blurb: 'Doula team plus birth classes; community-rate spots available.', radius: 10, states: ['MA'], cost: 'Sliding scale' });
p('Nourish Table Nutrition', ['nutrition'], ['in_person','virtual'], 'waltham',
  { blurb: 'Meal planning for pregnancy, lactation and postpartum recovery.', insurance: true, credentials: 'RDN, LDN', states: ['MA'], cost: '$$' });
p('Sprout Dietitians', ['nutrition'], ['virtual'], null,
  { blurb: 'Online nutrition coaching for gestational diabetes and feeding.', insurance: true, credentials: 'RDN', states: NE, cost: '$$' });
p('Willow Perinatal Therapy', ['therapy'], ['in_person','virtual'], 'backbay',
  { blurb: 'Therapy for perinatal anxiety, depression and birth experiences.', insurance: true, credentials: 'LICSW, PMH-C', languages: ['English','Spanish'], states: ['MA'], cost: '$$' });
p('Open Door Counseling', ['therapy'], ['virtual'], null,
  { blurb: 'Telehealth counseling for new parents; evening slots.', insurance: true, states: ['MA'], cost: 'Sliding scale' });
p('Daybreak Dental Care', ['dentist'], ['in_person'], 'needham',
  { blurb: 'Gentle cleanings and pregnancy-friendly scheduling.', insurance: true, languages: ['English','Spanish'], cost: '$$' });
p('Brightline Family Dentistry', ['dentist'], ['in_person'], 'quincy',
  { blurb: 'Family dentist with early-morning and weekend hours.', insurance: true, languages: ['English','Vietnamese'], cost: '$$' });
p('Benefit Bridge Advisors', ['insurance'], ['virtual'], null,
  { blurb: 'Help with health plans, parental leave pay and dependent enrollment.', states: NE, cost: 'Free consult' });
p('Cedar Hollow Daycare', ['childcare'], ['in_person'], 'belmont',
  { blurb: 'Infant and toddler rooms; small ratios.', cost: '$$$' });
p('Tiny Steps Early Learning', ['childcare'], ['in_person'], 'dorchester',
  { blurb: 'Full-day care from 8 weeks; subsidy vouchers accepted.', insurance: false, languages: ['English','Haitian Creole'], cost: '$$' });
p('Sunnybrook Family Childcare', ['childcare'], ['in_person'], 'melrose',
  { blurb: 'Home-based family childcare with a small group.', cost: '$$' });
p('Latch & Learn Lactation', ['lactation'], ['home_visit','virtual'], 'cambridge',
  { blurb: 'Home visits and video consults for latch, supply and pumping.', radius: 10, states: NE, insurance: true, credentials: 'IBCLC' });
p('Milk & Honey Support', ['lactation'], ['in_person'], 'framingham',
  { blurb: 'Clinic visits, weigh-ins and weekly feeding drop-ins.', insurance: true, credentials: 'IBCLC', languages: ['English','Portuguese'] });
p('Gentle Hands Massage', ['massage'], ['in_person'], 'waltham',
  { blurb: 'Prenatal and postpartum massage with side-lying support.', credentials: 'Licensed massage therapist, prenatal certified', cost: '$$' });
p('Restore Bodywork', ['massage'], ['home_visit','in_person'], 'somerville',
  { blurb: 'Studio or at-home postpartum bodywork.', radius: 8, cost: '$$$' });
p('Circle of Mamas', ['support_groups'], ['in_person','virtual'], 'jp',
  { blurb: 'Weekly peer circles for new mothers; drop-in, no sign-up.', cost: 'Free' });
p('New Parent Lounge', ['support_groups'], ['in_person'], 'lexington',
  { blurb: 'Facilitated groups for the first year, with childcare in the room.', cost: 'Free' });
p('Evening Light Sleep Consulting', ['sleep'], ['virtual'], null,
  { blurb: 'Gentle sleep plans for newborns to toddlers, by video.', cost: '$$' });
p('Cradle to Dream Sleep', ['sleep'], ['home_visit','virtual'], 'wellesley',
  { blurb: 'Overnight help at home plus phone follow-up.', radius: 15, states: ['MA','NH','RI'], cost: '$$$' });
p('Return Ready Coaching', ['return_to_work'], ['virtual'], null,
  { blurb: 'Plan your leave, your return date and your first month back.', cost: '$$' });
p('Second Wind Career Coaching', ['return_to_work'], ['in_person','virtual'], 'backbay',
  { blurb: 'Career coaching and negotiation support for returning parents.', states: ['MA'], cost: '$$' });
p('Whole Woman Health Collective', ['sexual_repro'], ['in_person'], 'cambridge',
  { blurb: 'Postpartum check-ins, contraception and sexual health care.', insurance: true, credentials: 'WHNP', languages: ['English','Spanish'] });
p('Greenway OB-GYN & Wellness', ['sexual_repro'], ['in_person'], 'newton',
  { blurb: 'OB-GYN practice with postpartum and pelvic health visits.', insurance: true, verified: '2026-04-18' });

writeFileSync(new URL('../data/providers.src.json', import.meta.url), JSON.stringify(out, null, 2) + '\n');
console.log('wrote', out.length, 'sample providers');
