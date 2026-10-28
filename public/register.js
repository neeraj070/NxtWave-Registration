const form=document.querySelector('#registration-form');
const params=new URLSearchParams(location.search);
const ref=params.get('ref')||'';
if(ref) form.elements.referralCode.value=ref;
const utm=params.get('utm_source')||params.get('utm_medium')||'';
form.elements.utmSource.value=utm;
fetch('/api/public/config').then(r=>r.json()).then(c=>{if(c.demoMode)document.querySelector('#demo-registration-notice').hidden=false;}).catch(()=>{});
const errorBox=document.querySelector('#form-error');
form.addEventListener('submit',async e=>{
  e.preventDefault(); errorBox.hidden=true;
  if(!form.reportValidity()) return;
  const button=form.querySelector('button[type=submit]');button.disabled=true;button.innerHTML='<span class="spinner"></span> Saving your registration…';
  const payload=Object.fromEntries(new FormData(form).entries());
  try{
    const response=await fetch('/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const data=await response.json();
    if(!response.ok) throw new Error(data.error||'Registration failed. Please try again.');
    form.hidden=true;document.querySelector('#success-card').hidden=false;document.querySelector('#registration-id').textContent=data.registrationId;
    document.querySelector('#success-copy').textContent=data.demoMode?'Simulated demo registration saved separately from campaign records. '+(data.referralWarning?'The referral code could not be verified, so no referral was attributed.':data.referralAttributed?'Your ambassador referral was attributed.':'No ambassador referral was attributed.'):(data.referralWarning?'Your registration was saved. The referral code could not be verified, so no referral was attributed.':data.message);
    document.querySelector('#success-card').scrollIntoView({behavior:'smooth',block:'center'});
  }catch(err){errorBox.textContent=err.message;errorBox.hidden=false;button.disabled=false;button.innerHTML='Register for free <span aria-hidden="true">→</span>';}
});
