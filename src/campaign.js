const crypto = require('node:crypto');
const { CHANNELS } = require('./db');

const slug = (s) => String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '');
function deriveChannel(ref, utm) {
  if (ref) return 'ambassadors';
  const source = String(utm || '').toLowerCase();
  if (!source) return 'direct';
  if (/ambassador/.test(source)) return 'ambassadors';
  if (/club/.test(source)) return 'clubs';
  if (/whatsapp|community|telegram|discord/.test(source)) return 'communities';
  if (/paid|sponsored|cpc|ads/.test(source)) return 'paid';
  if (/instagram|linkedin|social|youtube/.test(source)) return 'organic';
  return 'direct';
}
function dashboardData(db, { now = new Date(), startDate = '2026-10-28', endDate = '2026-11-03' } = {}) {
  const target = Number(db.prepare("SELECT value FROM campaign_config WHERE key='target'").get()?.value || 500);
  const demoMode = db.prepare("SELECT value FROM campaign_config WHERE key='demo_mode'").get()?.value === 'true';
  const registrations = demoMode ? 'all_registrations' : 'registrations';
  const total = db.prepare(`SELECT COUNT(*) AS n FROM ${registrations}`).get().n;
  const totals = db.prepare('SELECT COALESCE(SUM(spend_paise),0) AS spend,COALESCE(SUM(allocation_paise),0) AS budget FROM channel_budgets').get();
  const spend = totals.spend / 100;
  const budget = totals.budget / 100;
  const byChannel = db.prepare(`SELECT b.channel,b.label,b.target,b.allocation_paise,b.spend_paise,COUNT(r.id) registrations
    FROM channel_budgets b LEFT JOIN ${registrations} r ON r.channel=b.channel
    GROUP BY b.channel ORDER BY b.target DESC,b.label`).all().map(x => ({
      ...x, spend: x.spend_paise / 100, allocation: x.allocation_paise / 100, share: total ? x.registrations / total * 100 : 0,
      cpr: x.registrations ? x.spend_paise / 100 / x.registrations : null,
      variance: x.registrations - x.target,
      status: x.registrations >= x.target && x.target ? 'On plan' : x.registrations ? 'Building' : 'Needs data'
    }));
  const byDay = db.prepare(`SELECT date(created_at) day,COUNT(*) registrations FROM ${registrations}
    WHERE date(created_at)>=date(?) AND date(created_at)<=date(?) GROUP BY date(created_at) ORDER BY day`).all(startDate,endDate);
  const daily = [];
  for (let i=0;i<7;i++) { const d=new Date(`${startDate}T12:00:00Z`); d.setUTCDate(d.getUTCDate()+i); const key=d.toISOString().slice(0,10); daily.push({day:key,registrations:byDay.find(x=>x.day===key)?.registrations||0}); }
  const ambassadors = db.prepare(`SELECT a.id,a.name,a.college,a.referral_code,COUNT(r.id) registrations
    FROM ambassadors a LEFT JOIN ${registrations} r ON r.ambassador_id=a.id GROUP BY a.id ORDER BY registrations DESC,a.name`).all();
  const recent = db.prepare(`SELECT id,full_name,email,college,branch,academic_year,channel,referral_code,created_at FROM ${registrations} ORDER BY created_at DESC LIMIT 100`).all();
  const daysRemaining = Math.max(1, Math.ceil((new Date(`${endDate}T23:59:59`) - now) / 86400000));
  const achieved = target ? total / target * 100 : 0;
  const remaining = Math.max(0, target - total);
  return { target,total,remaining,achieved,spend,budget,budgetRemaining:budget-spend,demoMode,byChannel,daily,ambassadors,recent,daysRemaining,requiredDaily:remaining/daysRemaining };
}
function recommendations(data) {
  const out=[];
  const amb=data.byChannel.find(x=>x.channel==='ambassadors');
  if (amb && amb.registrations>=10) out.push({observation:'Ambassador referrals are producing registrations.',metric:`${amb.registrations} attributed registrations`,action:'Prioritize follow-up with active ambassadors and recruit similar campus networks.',reason:'The channel has enough observed activity to compare operationally.',evidence:'Observed; moderate confidence'});
  else out.push({observation:'There is not enough ambassador activity to judge channel quality yet.',metric:`${amb?.registrations||0} attributed registrations (10 needed for this rule)`,action:'Continue distribution through ambassadors and collect more registrations before changing priorities.',reason:'Small samples can make channel performance misleading.',evidence:'Insufficient data'});
  for (const c of data.byChannel.filter(x=>x.spend>0 && x.registrations<5)) out.push({observation:`${c.label} has spend with few recorded registrations.`,metric:`${c.spend.toLocaleString('en-IN',{style:'currency',currency:'INR'})} spend; ${c.registrations} registrations`,action:'Review audience, placement, and tracking before approving more spend.',reason:'The current sample does not support scaling this spend.',evidence:'Observed; low sample'});
  if (data.requiredDaily>0) out.push({observation:`${data.remaining} registrations remain against the ${data.target} goal.`,metric:`${data.requiredDaily.toFixed(1)} registrations per day needed over ${data.daysRemaining} days`,action:'Compare the next daily results with this required pace and shift effort toward channels producing verified registrations.',reason:'This is a pace calculation from the current count and campaign window, not a forecast.',evidence:'Calculated estimate'});
  const top=data.ambassadors[0];
  if (top?.registrations>=5) out.push({observation:`${top.name} currently leads ambassador referrals.`,metric:`${top.registrations} attributed registrations`,action:'Ask for the distribution format or campus group that worked and reuse it with similar networks.',reason:'A single leading ambassador is a useful learning signal, not proof of repeatable performance.',evidence:'Observed; moderate confidence'});
  return out;
}
function newId(prefix) { return `${prefix}${crypto.randomBytes(5).toString('hex').toUpperCase()}`; }
function ambassadorCode(name, college, exists) {
  const base=`${slug(name).slice(0,4)||'CAMP'}${slug(college).slice(0,3)||'AI'}`.toUpperCase();
  let code=base, n=2; while (exists(code)) code=`${base}${n++}`; return code;
}
module.exports={deriveChannel,dashboardData,recommendations,newId,ambassadorCode};
