const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'campusai-test-'));
process.env.DATABASE_PATH=path.join(temp,'isolated.sqlite');
process.env.ADMIN_PASSWORD='test-only-password';
process.env.SESSION_SECRET='test-session-secret-that-is-long-enough';
process.env.APP_URL='http://localhost:3000';
process.env.CAMPAIGN_END_DATE='2026-11-03';
const {app,db}=require('../src/server');
const {dashboardData}=require('../src/campaign');
let server,base,cookie='';
before(async()=>{server=app.listen(0);await new Promise(r=>server.once('listening',r));base=`http://127.0.0.1:${server.address().port}`;});
after(async()=>{await new Promise(r=>server.close(r));db.close();fs.rmSync(temp,{recursive:true,force:true});});
async function request(url,opts={}){const r=await fetch(base+url,{...opts,headers:{...(opts.body?{'Content-Type':'application/json'}:{}),...(cookie?{cookie}:{}),...opts.headers}});const set=r.headers.get('set-cookie');if(set)cookie=set.split(';')[0];return r;}
const payload=extra=>({fullName:'Test Student',email:'student@example.edu',college:'Test Engineering College',branch:'Computer Science',academicYear:'Final year',...extra});
async function register(body){return request('/api/register',{method:'POST',body:JSON.stringify(body)});}
async function login(){return request('/api/admin/login',{method:'POST',body:JSON.stringify({password:'test-only-password'})});}

test('14. empty database has zero metrics and safe null CPR values',async()=>{
  const d=dashboardData(db,{startDate:'2026-10-28',endDate:'2026-11-04'});assert.equal(d.total,0);assert.equal(d.remaining,500);assert.ok(d.byChannel.every(c=>c.cpr===null));
  const unauthorized=await request('/api/admin/dashboard');assert.equal(unauthorized.status,401);
});
test('1. valid final-year registration persists and returns a unique identifier',async()=>{
  const r=await register(payload());const data=await r.json();assert.equal(r.status,201);assert.match(data.registrationId,/^REG/);assert.equal(data.referralAttributed,false);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM registrations').get().n,1);
});
test('2. invalid email is rejected server-side',async()=>{const r=await register(payload({email:'not-an-email'}));assert.equal(r.status,400);});
test('3. missing required fields are rejected',async()=>{const r=await register({fullName:'Missing'});assert.equal(r.status,400);});
test('malformed null JSON body is handled as a validation error',async()=>{const r=await register(null);assert.equal(r.status,400);});
test('4. duplicate email is rejected after normalization',async()=>{const r=await register(payload({email:' STUDENT@EXAMPLE.EDU '}));assert.equal(r.status,409);});
test('5. valid referral code is stored and attributed once',async()=>{
  db.prepare('INSERT INTO ambassadors(id,name,college,referral_code) VALUES(?,?,?,?)').run('a1','Asha','Test College','AMB102');
  const r=await register(payload({email:'ref@example.edu',referralCode:'amb102'}));const data=await r.json();assert.equal(r.status,201);assert.equal(data.referralAttributed,true);
  const saved=db.prepare('SELECT ambassador_id,referral_code,channel FROM registrations WHERE email=?').get('ref@example.edu');assert.deepEqual(saved,{ambassador_id:'a1',referral_code:'AMB102',channel:'ambassadors'});
});
test('6. invalid referral code creates no false attribution',async()=>{
  const r=await register(payload({email:'unknown@example.edu',referralCode:'NOTREAL'}));const data=await r.json();assert.equal(r.status,201);assert.equal(data.referralAttributed,false);assert.equal(data.referralWarning,true);
  const saved=db.prepare('SELECT ambassador_id,referral_code,channel FROM registrations WHERE email=?').get('unknown@example.edu');assert.equal(saved.ambassador_id,null);assert.equal(saved.referral_code,null);assert.equal(saved.channel,'direct');
});
test('UTM source maps to a single campaign channel when no valid referral code is present',async()=>{
  const r=await register(payload({email:'utm@example.edu',utmSource:'whatsapp'}));assert.equal(r.status,201);
  assert.equal(db.prepare('SELECT channel FROM registrations WHERE email=?').get('utm@example.edu').channel,'communities');
});
test('7. duplicate ambassador referral code is prevented by SQLite',()=>{
  assert.throws(()=>db.prepare('INSERT INTO ambassadors(id,name,college,referral_code) VALUES(?,?,?,?)').run('a2','Other','Other College','amb102'),{code:'SQLITE_CONSTRAINT_UNIQUE'});
});
test('8. admin authentication accepts configured password and rejects wrong password',async()=>{
  const bad=await request('/api/admin/login',{method:'POST',body:JSON.stringify({password:'wrong'})});assert.equal(bad.status,401);
  const good=await login();assert.equal(good.status,200);assert.match(cookie,/campusai\.sid=/);
  assert.match(good.headers.get('set-cookie'),/HttpOnly/i);assert.match(good.headers.get('set-cookie'),/SameSite=Strict/i);
});
test('9. protected admin API requires authentication',async()=>{
  cookie='';const r=await request('/api/admin/dashboard');assert.equal(r.status,401);await login();
});
test('10. dashboard metrics derive from registrations, channels, and spend',()=>{
  db.prepare('UPDATE channel_budgets SET spend_paise=10000 WHERE channel=?').run('ambassadors');
  const d=dashboardData(db,{startDate:'2026-10-28',endDate:'2026-11-03'});assert.equal(d.total,4);assert.equal(d.byChannel.find(c=>c.channel==='ambassadors').registrations,1);assert.equal(d.byChannel.find(c=>c.channel==='ambassadors').cpr,100);assert.equal(d.spend,100);assert.equal(d.budget,2000);assert.equal(d.byChannel.reduce((sum,c)=>sum+c.allocation,0),2000);
});
test('11. cost per registration is unavailable when count is zero',()=>{
  const c=dashboardData(db).byChannel.find(x=>x.channel==='paid');assert.equal(c.registrations,0);assert.equal(c.cpr,null);
});
test('12. demo registration is simulated separately, attributed in the labeled dashboard, and resettable',async()=>{
  db.prepare('DELETE FROM registrations').run();db.prepare('DELETE FROM ambassadors').run();db.prepare('UPDATE channel_budgets SET spend_paise=0').run();
  db.prepare('INSERT INTO ambassadors(id,name,college,referral_code) VALUES(?,?,?,?)').run('pre-demo','Preserve Me','Existing College','KEEP1');
  const guarded=await request('/api/admin/demo/load',{method:'POST'});assert.equal(guarded.status,409);assert.equal(db.prepare('SELECT COUNT(*) n FROM ambassadors').get().n,1);
  db.prepare('DELETE FROM ambassadors').run();
  const load=await request('/api/admin/demo/load',{method:'POST'});assert.equal(load.status,200);assert.equal(db.prepare("SELECT value FROM campaign_config WHERE key='demo_mode'").get().value,'true');
  const addDuringDemo=await request('/api/admin/ambassadors',{method:'POST',body:JSON.stringify({name:'Unexpected',college:'Demo College'})});assert.equal(addDuringDemo.status,409);
  const priorAttributed=db.prepare("SELECT COUNT(*) n FROM registrations WHERE ambassador_id='amb-demo-1'").get().n;
  const simulated=await register(payload({email:'demo-flow@example.edu',referralCode:'AMB102'}));const simulatedData=await simulated.json();assert.equal(simulated.status,201);assert.equal(simulatedData.demoMode,true);assert.equal(simulatedData.referralAttributed,true);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM registrations').get().n,48);assert.equal(db.prepare('SELECT COUNT(*) n FROM demo_registrations').get().n,1);
  const d=dashboardData(db);assert.equal(d.demoMode,true);assert.equal(d.total,49);assert.equal(d.ambassadors.find(a=>a.referral_code==='AMB102').registrations,priorAttributed+1);assert.ok(d.recent.some(r=>r.email==='demo-flow@example.edu'));
  await login();const listed=await request('/api/admin/registrations');assert.ok((await listed.json()).registrations.some(r=>r.email==='demo-flow@example.edu'));
  const demoCsv=await request('/api/admin/export/registrations.csv');assert.match(await demoCsv.text(),/demo-flow@example\.edu/);
  const duplicate=await register(payload({email:'DEMO-FLOW@example.edu'}));assert.equal(duplicate.status,409);
  const reset=await request('/api/admin/demo/reset',{method:'POST'});assert.equal(reset.status,200);assert.equal(db.prepare('SELECT COUNT(*) n FROM registrations').get().n,0);assert.equal(db.prepare('SELECT COUNT(*) n FROM ambassadors').get().n,0);assert.equal(db.prepare("SELECT value FROM campaign_config WHERE key='demo_mode'").get().value,'false');
  assert.equal(db.prepare('SELECT COUNT(*) n FROM demo_registrations').get().n,0);
});
test('13. registration CSV export includes headers and is protected',async()=>{
  cookie='';const denied=await request('/api/admin/export/registrations.csv');assert.equal(denied.status,401);await login();await register(payload({email:'csv@example.edu'}));
  const r=await request('/api/admin/export/registrations.csv');assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/text\/csv/);const csv=await r.text();assert.match(csv,/"full_name","email"/);assert.match(csv,/csv@example\.edu/);
  const ambassadors=await request('/api/admin/export/ambassadors.csv');assert.equal(ambassadors.status,200);assert.match(await ambassadors.text(),/"id","name","college","referral_code","registrations"/);
});
test('registration audience restriction accepts only final-year students',async()=>{const r=await register(payload({email:'junior@example.edu',academicYear:'Third year'}));assert.equal(r.status,400);});
