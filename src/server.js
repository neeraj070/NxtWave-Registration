require('dotenv').config();
const express = require('express');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const crypto = require('node:crypto');
const path = require('node:path');
const { openDatabase } = require('./db');
const { deriveChannel, dashboardData, recommendations, newId, ambassadorCode } = require('./campaign');

const app = express();
if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) throw new Error('SESSION_SECRET must be set in production.');
const db = openDatabase();
const PORT = Number(process.env.PORT || 3000);
const APP_URL = (process.env.APP_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
if (!process.env.SESSION_SECRET) console.warn('SESSION_SECRET is unset; using an ephemeral development secret. Set it in .env to keep local sessions stable.');
app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : false);
app.use(express.json({ limit: '32kb' }));
app.use(express.urlencoded({ extended: false, limit: '32kb' }));
app.use('/vendor/chart', express.static(path.join(__dirname,'..','node_modules','chart.js','dist')));
app.use(session({ name:'campusai.sid', secret:sessionSecret, resave:false, saveUninitialized:false,
  cookie:{ httpOnly:true, sameSite:'strict', secure:process.env.NODE_ENV==='production', maxAge:8*60*60*1000 } }));
app.use((req,res,next)=>{if(!req.body||typeof req.body!=='object'||Array.isArray(req.body))req.body={};next();});
app.use(express.static(path.join(__dirname,'..','public')));
const loginLimit=rateLimit({windowMs:15*60*1000,limit:10,standardHeaders:true,legacyHeaders:false,message:{error:'Too many login attempts. Try again in 15 minutes.'}});
const registrationLimit=rateLimit({windowMs:60*60*1000,limit:30,standardHeaders:true,legacyHeaders:false,message:{error:'Registration attempts are temporarily limited. Please try again later.'}});
const requireAdmin=(req,res,next)=>req.session?.admin ? next() : res.status(401).json({error:'Admin login required.'});
const text=(v,max=160)=>typeof v==='string'?v.trim().slice(0,max):'';
const emailPattern=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const allowedBranches=new Set(['Computer Science','Information Technology','Electronics & Communication','Electrical Engineering','Mechanical Engineering','Civil Engineering','Other engineering branch']);

app.get('/',(req,res)=>res.sendFile(path.join(__dirname,'..','public','register.html')));
app.get('/register',(req,res)=>res.sendFile(path.join(__dirname,'..','public','register.html')));
app.get('/admin',(req,res)=>res.sendFile(path.join(__dirname,'..','public','admin.html')));
app.get('/api/public/config',(req,res)=>res.json({appUrl:APP_URL,workshop:'Build Your First AI Project in 60 Minutes',demoMode:db.prepare("SELECT value FROM campaign_config WHERE key='demo_mode'").get()?.value==='true'}));
app.post('/api/register',registrationLimit,(req,res)=>{
  const demoMode=db.prepare("SELECT value FROM campaign_config WHERE key='demo_mode'").get()?.value==='true';
  const fullName=text(req.body.fullName,100), email=text(req.body.email,254).toLowerCase(), college=text(req.body.college,140), branch=text(req.body.branch,100), academicYear=text(req.body.academicYear,40);
  if(!fullName||!email||!college||!branch||!academicYear) return res.status(400).json({error:'Please complete all required fields.'});
  if(!emailPattern.test(email)) return res.status(400).json({error:'Enter a valid email address.'});
  if(!allowedBranches.has(branch)) return res.status(400).json({error:'Select a valid engineering branch.'});
  if(academicYear!=='Final year') return res.status(400).json({error:'This workshop campaign is for final-year engineering students.'});
  const rawRef=text(req.body.referralCode,32); const amb=rawRef ? db.prepare('SELECT id,referral_code FROM ambassadors WHERE referral_code=? COLLATE NOCASE').get(rawRef) : null;
  const ref=amb?.referral_code || null;
  const utm=text(req.body.utmSource,100);
  const {deriveChannel}=require('./campaign');
  const channel=ref?'ambassadors':(utm==='follow_up'?'recovery':deriveChannel(null,utm));
  try {
    const id=newId('REG');
    const emailExists=db.prepare('SELECT 1 FROM registrations WHERE email=? COLLATE NOCASE UNION ALL SELECT 1 FROM demo_registrations WHERE email=? COLLATE NOCASE LIMIT 1').get(email,email);
    if(emailExists)return res.status(409).json({error:'This email address is already registered.'});
    const table=demoMode?'demo_registrations':'registrations';
    db.prepare(`INSERT INTO ${table}(id,full_name,email,college,branch,academic_year,ambassador_id,referral_code,channel,utm_source) VALUES(?,?,?,?,?,?,?,?,?,?)`)
      .run(id,fullName,email,college,branch,academicYear,amb?.id||null,ref,channel,utm||null);
    return res.status(201).json({ok:true,registrationId:id,referralAttributed:Boolean(amb),referralWarning:Boolean(rawRef&&!amb),demoMode,message:demoMode?'Demo registration saved separately from campaign records.':'You’re registered. Your registration ID is shown below.'});
  } catch(e) {
    if(e.code==='SQLITE_CONSTRAINT_UNIQUE') return res.status(409).json({error:'This email address is already registered.'});
    console.error(e); return res.status(500).json({error:'Registration could not be saved. Please try again.'});
  }
});

app.post('/api/admin/login',loginLimit,async(req,res)=>{
  const expected=process.env.ADMIN_PASSWORD||''; const submitted=String(req.body.password||'');
  // Compare fixed length digests to avoid revealing password length or timing.
  const a=crypto.createHash('sha256').update(expected).digest(); const b=crypto.createHash('sha256').update(submitted).digest();
  const valid=Boolean(expected) && crypto.timingSafeEqual(a,b);
  if(!valid) return res.status(401).json({error:'Incorrect admin password.'});
  req.session.regenerate(err=>{ if(err)return res.status(500).json({error:'Could not start admin session.'}); req.session.admin=true; res.json({ok:true}); });
});
app.post('/api/admin/logout',requireAdmin,(req,res)=>req.session.destroy(()=>{res.clearCookie('campusai.sid');res.json({ok:true});}));
app.get('/api/admin/me',requireAdmin,(req,res)=>res.json({ok:true}));
app.get('/api/admin/dashboard',requireAdmin,(req,res)=>{const data=dashboardData(db,{endDate:process.env.CAMPAIGN_END_DATE||'2026-11-03'});res.json({...data,recommendations:recommendations(data),appUrl:APP_URL});});
app.get('/api/admin/registrations',requireAdmin,(req,res)=>{
  const q=text(req.query.q,100).toLowerCase(), channel=text(req.query.channel,40);
  const source=db.prepare("SELECT value FROM campaign_config WHERE key='demo_mode'").get()?.value==='true'?'all_registrations':'registrations';
  const rows=db.prepare(`SELECT id,full_name,email,college,branch,academic_year,channel,referral_code,created_at FROM ${source}
    WHERE (?='' OR lower(full_name) LIKE ? OR lower(email) LIKE ? OR lower(college) LIKE ?)
    AND (?='' OR channel=?) ORDER BY created_at DESC`).all(q,`%${q}%`,`%${q}%`,`%${q}%`,channel,channel);
  res.json({registrations:rows});
});
app.get('/api/admin/ambassadors',requireAdmin,(req,res)=>{
  const college=text(req.query.college,140);
  const source=db.prepare("SELECT value FROM campaign_config WHERE key='demo_mode'").get()?.value==='true'?'all_registrations':'registrations';
  res.json({ambassadors:db.prepare(`SELECT a.id,a.name,a.college,a.referral_code,a.created_at,COUNT(r.id) registrations
    FROM ambassadors a LEFT JOIN ${source} r ON r.ambassador_id=a.id WHERE (?='' OR a.college=?) GROUP BY a.id ORDER BY registrations DESC,a.name`).all(college,college)});
});
app.post('/api/admin/ambassadors',requireAdmin,(req,res)=>{
  if(db.prepare("SELECT value FROM campaign_config WHERE key='demo_mode'").get()?.value==='true') return res.status(409).json({error:'Reset the synthetic demo dataset before adding campaign ambassadors.'});
  const name=text(req.body.name,100), college=text(req.body.college,140); if(!name||!college)return res.status(400).json({error:'Name and college are required.'});
  const code=ambassadorCode(name,college,c=>Boolean(db.prepare('SELECT 1 FROM ambassadors WHERE referral_code=? COLLATE NOCASE').get(c)));
  const id=newId('AMB'); db.prepare('INSERT INTO ambassadors(id,name,college,referral_code) VALUES(?,?,?,?)').run(id,name,college,code);
  res.status(201).json({id,name,college,referralCode:code,referralLink:`${APP_URL}/register?ref=${encodeURIComponent(code)}`});
});
app.put('/api/admin/channels/:channel/spend',requireAdmin,(req,res)=>{
  const cents=Number(req.body.spend); if(!Number.isFinite(cents)||cents<0||cents>2000)return res.status(400).json({error:'Spend must be between ₹0 and ₹2,000.'});
  const channel=text(req.params.channel,40); const exists=db.prepare('SELECT 1 FROM channel_budgets WHERE channel=?').get(channel); if(!exists)return res.status(404).json({error:'Unknown channel.'});
  const otherSpend=db.prepare('SELECT COALESCE(SUM(spend_paise),0) p FROM channel_budgets WHERE channel<>?').get(channel).p;
  const totalBudget=db.prepare('SELECT COALESCE(SUM(allocation_paise),0) p FROM channel_budgets').get().p;
  if(otherSpend+Math.round(cents*100)>totalBudget)return res.status(400).json({error:`Total campaign spend cannot exceed the allocated ${new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(totalBudget/100)} budget.`});
  db.prepare('UPDATE channel_budgets SET spend_paise=? WHERE channel=?').run(Math.round(cents*100),channel); res.json({ok:true});
});
app.get('/api/admin/export/:kind.csv',requireAdmin,(req,res)=>{
  const kind=req.params.kind;
  let rows,headers;
  const source=db.prepare("SELECT value FROM campaign_config WHERE key='demo_mode'").get()?.value==='true'?'all_registrations':'registrations';
  if(kind==='registrations') { headers=['id','full_name','email','college','branch','academic_year','channel','referral_code','created_at']; rows=db.prepare(`SELECT ${headers.join(',')} FROM ${source} ORDER BY created_at DESC`).all(); }
  else if(kind==='ambassadors') { headers=['id','name','college','referral_code','registrations']; rows=db.prepare(`SELECT a.id,a.name,a.college,a.referral_code,COUNT(r.id) registrations FROM ambassadors a LEFT JOIN ${source} r ON r.ambassador_id=a.id GROUP BY a.id ORDER BY registrations DESC`).all(); }
  else return res.status(404).json({error:'Unknown CSV export.'});
  const esc=v=>{let value=String(v??'');if(/^[\s]*[=+@\-]/.test(value))value=`'${value}`;return `"${value.replaceAll('"','""')}"`;};
  res.type('text/csv').attachment(`${kind}.csv`).send([headers.map(esc).join(','),...rows.map(r=>headers.map(h=>esc(r[h])).join(','))].join('\r\n'));
});
app.post('/api/admin/demo/reset',requireAdmin,(req,res)=>{
  if(db.prepare("SELECT value FROM campaign_config WHERE key='demo_mode'").get()?.value!=='true') return res.status(409).json({error:'The current database is not marked as a demo dataset.'});
  const tx=db.transaction(()=>{
    db.prepare('DELETE FROM demo_registrations').run(); db.prepare('DELETE FROM registrations').run(); db.prepare('DELETE FROM ambassadors').run();
    db.prepare('UPDATE channel_budgets SET spend_paise=0').run();
    db.prepare("UPDATE campaign_config SET value='false' WHERE key='demo_mode'").run();
  }); tx(); res.json({ok:true,message:'Demo data removed. The database is now empty.'});
});
app.post('/api/admin/demo/load',requireAdmin,(req,res)=>{
  const currentCount=db.prepare('SELECT COUNT(*) n FROM registrations').get().n;
  const ambassadorCount=db.prepare('SELECT COUNT(*) n FROM ambassadors').get().n;
  const currentlyDemo=db.prepare("SELECT value FROM campaign_config WHERE key='demo_mode'").get()?.value==='true';
  if((currentCount>0||ambassadorCount>0)&&!currentlyDemo) return res.status(409).json({error:'The database contains non-demo campaign records. Export or use a separate empty database before loading synthetic records.'});
  const tx=db.transaction(()=>{
    db.prepare('DELETE FROM demo_registrations').run(); db.prepare('DELETE FROM registrations').run(); db.prepare('DELETE FROM ambassadors').run();
    const people=[['Maya Rao','IIT Hyderabad','AMB102'],['Arjun Nair','NIT Calicut','AMB103'],['Isha Kulkarni','PES University','AMB104'],['Rohan Das','VIT Vellore','AMB105'],['Ananya Sen','Jadavpur University','AMB106']];
    const addA=db.prepare('INSERT INTO ambassadors(id,name,college,referral_code) VALUES(?,?,?,?)'); people.forEach((p,i)=>addA.run(`amb-demo-${i+1}`,p[0],p[1],p[2]));
    const addR=db.prepare('INSERT INTO registrations(id,full_name,email,college,branch,academic_year,ambassador_id,referral_code,channel,utm_source,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)');
    const rows=[]; const channels=['ambassadors','ambassadors','clubs','communities','paid','organic','recovery','direct'];
    for(let i=0;i<48;i++){
      const day=28+Math.floor(i/8), date=`2026-10-${String(day).padStart(2,'0')}`;
      const channel=channels[i%channels.length], person=i%5;
      const ambassador=channel==='ambassadors'?person:null;
      rows.push([`demo-${i+1}`,`Demo Student ${String(i+1).padStart(2,'0')}`,`demo.student${i+1}@example.test`,`Demo Institute ${i%6+1}`,['Computer Science','Electronics','Mechanical','Information Technology'][i%4],'Final year',ambassador===null?null:`amb-demo-${ambassador+1}`,ambassador===null?null:people[ambassador][2],channel,`demo_${channel}`,`${date}T${String(9+i%10).padStart(2,'0')}:${String(i%60).padStart(2,'0')}:00`]);
    }
    rows.forEach(row=>addR.run(...row));
    const spend={ambassadors:400,clubs:250,communities:200,paid:350,recovery:50,organic:0,direct:0};
    for(const [ch,amt] of Object.entries(spend))db.prepare('UPDATE channel_budgets SET spend_paise=? WHERE channel=?').run(amt*100,ch);
    db.prepare("UPDATE campaign_config SET value='true' WHERE key='demo_mode'").run();
  }); tx(); res.json({ok:true,message:'Synthetic demonstration dataset loaded.',demoMode:true});
});

app.get('/health',(req,res)=>res.json({ok:true}));
app.use((err,req,res,next)=>{
  if(err.type==='entity.parse.failed') return res.status(400).json({error:'Request body must be valid JSON.'});
  if(err.type==='entity.too.large') return res.status(413).json({error:'Request body is too large.'});
  console.error(err);res.status(500).json({error:'Unexpected server error.'});
});
if(require.main===module) app.listen(PORT,()=>console.log(`CampusAI Growth Hub running at ${APP_URL}`));
module.exports={app,db,APP_URL};
