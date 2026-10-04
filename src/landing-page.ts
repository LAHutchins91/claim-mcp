import { landingConnectLead } from "./connect-page.js";

export function landingPage(appBaseUrl: string, supabaseUrl: string, supabaseAnonKey: string) {
  const supabaseUrlJson = JSON.stringify(supabaseUrl);
  const supabaseAnonKeyJson = JSON.stringify(supabaseAnonKey);
  const appBaseUrlJson = JSON.stringify(appBaseUrl);
  const connectLead = landingConnectLead(appBaseUrl);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Claim</title>
  <link rel="icon" href="/icon.svg">
  <style>
    :root{color-scheme:dark;--bg:#14120e;--line:#3a342a;--text:#f6f1e7;--muted:#cbbfaa;--accent:#e4b15a;--ink:#221e18}
    *{box-sizing:border-box} body{margin:0;background:radial-gradient(circle at 80% -10%,#3a2a14 0,transparent 32%),var(--bg);color:var(--text);font-family:Inter,ui-sans-serif,system-ui,sans-serif}
    .shell{max-width:980px;margin:0 auto;padding:28px 20px 72px}.nav{display:flex;justify-content:space-between;align-items:center;margin-bottom:48px}.brand{font-weight:800;letter-spacing:-.04em;font-size:22px}
    h1{font-size:clamp(44px,7vw,76px);line-height:.95;letter-spacing:-.05em;margin:12px 0} p{color:var(--muted);font-size:18px;line-height:1.6}
    .card{background:linear-gradient(180deg,#2a241c,#1a1713);border:1px solid var(--line);border-radius:22px;padding:22px}
    .actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:22px}.btn{appearance:none;border:0;border-radius:12px;padding:12px 16px;font-weight:750;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center}
    .primary{background:var(--accent);color:#1a140c}.secondary{background:var(--ink);color:var(--text);border:1px solid var(--line)}
    .plans{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:18px}.plan{border:1px solid var(--line);border-radius:20px;padding:22px;background:#1a1713}.plan ul{padding-left:18px;color:var(--text)}
    .account{display:none;margin-top:18px}.account.show{display:block}.error,.notice{display:none;margin-top:14px;padding:12px;border-radius:12px}.error.show{display:block;background:#3a1c1c;color:#ffd0d0}.notice.show{display:block;background:#1d2a1e;color:#d7f5d4}
    label{display:block;margin:12px 0 6px;color:var(--muted)} input,textarea,select{width:100%;padding:11px;border-radius:10px;border:1px solid var(--line);background:#120f0c;color:var(--text);font:inherit} textarea{min-height:90px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.footer{margin-top:56px;display:flex;gap:16px;flex-wrap:wrap;color:#9c917f}
    [hidden]{display:none!important} pre{white-space:pre-wrap;overflow-wrap:anywhere} @media(max-width:760px){.plans,.grid{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <main class="shell">
    <nav class="nav"><div class="brand">Claim</div><span id="servicePill">Brand guide</span></nav>
    <section>
      <p class="eyebrow">Approved language for every assistant</p>
      <h1 id="heroTitle">Do not invent the promise.</h1>
      <p id="heroDescription">Claim stores a brand’s approved claims, current offers, proof, voice, and banned phrases, then checks a draft before an assistant can invent a guarantee or a discount.</p>
      ${connectLead}
      <div class="actions" id="signedOutActions"><button class="btn primary" id="googleBtn" type="button">Continue with Google</button><a class="btn secondary" href="#plans">See plans</a></div>
      <div class="card account" id="accountCard"><div id="userEmail"></div><div id="subscriptionStatus">Checking account…</div><div class="actions"><button class="btn secondary" id="signOutBtn" type="button">Sign out</button></div></div>
      <div class="actions" id="proActions" hidden><a class="btn primary" href="/app">Open brand workspace</a></div>
      <button class="btn secondary" id="refreshAccount" type="button" hidden>Refresh subscription status</button>
      <div class="notice" id="notice" role="status"></div>
      <div class="error" id="error" role="alert"></div>
    </section>
    <section id="plans">
      <h2>Start with a 14-day trial</h2>
      <p>Then continue on Pro. Secure checkout and subscription billing are handled by Stripe.</p>
      <div class="plans">
        <article class="plan"><h3>Monthly</h3><p>Pro, billed each month after the trial.</p><ul><li>Approved claims and proof</li><li>Current offers</li><li>Voice and banned phrases</li><li>Draft checks</li></ul><button class="btn secondary checkout" type="button" data-plan="monthly">Start monthly trial</button></article>
        <article class="plan"><h3>Yearly</h3><p>Pro, billed once a year after the same 14-day trial.</p><ul><li>Everything in Monthly</li><li>One annual billing cycle</li><li>ChatGPT, Claude, Gemini, Grok, and Cursor</li><li>Any Streamable HTTP OAuth client</li></ul><button class="btn primary checkout" type="button" data-plan="annual">Start yearly trial</button></article>
      </div>
    </section>
    <section id="workspace" hidden>
      <h2>Brand workspace</h2>
      <p>Save the guide here, or ask a connected assistant to save it. The check uses the same rules as the Claim tool.</p>
      <div class="grid">
        <form class="card" id="brandForm"><h3>New brand</h3><label for="brandName">Name</label><input id="brandName" required maxlength="200"><button class="btn primary" type="submit">Create brand</button></form>
        <div class="card"><h3>Your brands</h3><label for="brandSelect">Open</label><select id="brandSelect"><option value="">Choose a brand</option></select><p id="workspaceMessage" role="status"></p></div>
      </div>
      <div id="editor" hidden>
        <form class="card" id="voiceForm"><h3>Voice</h3><label for="voiceSummary">How the brand sounds</label><textarea id="voiceSummary" required maxlength="4000"></textarea><label for="voiceTraits">Traits, separated by commas</label><input id="voiceTraits" maxlength="400"><button class="btn primary" type="submit">Save voice</button></form>
        <form class="card" id="claimForm"><h3>Approved claim</h3><label for="claimStatement">Exact statement</label><textarea id="claimStatement" required maxlength="12000"></textarea><label for="claimStatus">Status</label><select id="claimStatus"><option>APPROVED</option><option>RETIRED</option></select><button class="btn primary" type="submit">Save claim</button></form>
        <form class="card" id="offerForm"><h3>Offer</h3><label for="offerName">Name</label><input id="offerName" required maxlength="200"><label for="offerTerms">Exact terms</label><textarea id="offerTerms" required maxlength="12000"></textarea><label><input id="offerActive" type="checkbox" checked> Active</label><button class="btn primary" type="submit">Save offer</button></form>
        <form class="card" id="proofForm"><h3>Proof</h3><label for="proofTitle">Title</label><input id="proofTitle" required maxlength="200"><label for="proofSource">Source</label><input id="proofSource" required maxlength="500"><label for="proofSummary">What it shows</label><textarea id="proofSummary" required maxlength="12000"></textarea><button class="btn primary" type="submit">Save proof</button></form>
        <form class="card" id="phraseForm"><h3>Banned phrase</h3><label for="phrase">Phrase</label><input id="phrase" required minlength="2" maxlength="200"><button class="btn primary" type="submit">Ban phrase</button></form>
        <form class="card" id="checkForm"><h3>Check a draft</h3><label for="draft">Draft copy</label><textarea id="draft" required maxlength="12000"></textarea><button class="btn primary" type="submit">Check draft</button><pre id="checkResult"></pre></form>
        <section class="card"><h3>Saved guide</h3><pre id="guide"></pre></section>
      </div>
    </section>
    <footer class="footer"><a href="/connect">Connect an assistant</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/support">Support</a><a href="/data">Your data</a><a href="/health">System health</a></footer>
  </main>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.115.0/dist/umd/supabase.js"></script>
  <script>
  (function(){
    var SUPABASE_URL=${supabaseUrlJson};
    var SUPABASE_ANON_KEY=${supabaseAnonKeyJson};
    var APP_BASE_URL=${appBaseUrlJson};
    var token='', current=null, isPro=false, profileReady=false, brands=[], selected='';
    function el(id){return document.getElementById(id)}
    function showError(msg){el('error').textContent=msg; el('error').classList.add('show')}
    function clearError(){el('error').classList.remove('show')}
    function renderAccess(pro, ready){
      isPro=pro; profileReady=ready;
      el('plans').hidden=pro;
      el('proActions').hidden=!pro || location.pathname==='/app';
      el('workspace').hidden=!(pro && location.pathname==='/app');
      el('heroTitle').textContent=pro?'Your brand guide is ready.':'Do not invent the promise.';
      document.querySelectorAll('.checkout').forEach(function(btn){btn.disabled=!ready||pro});
    }
    function setSignedOut(){token=''; current=null; renderAccess(false,true); el('refreshAccount').hidden=true; el('signedOutActions').hidden=false; el('accountCard').classList.remove('show')}
    function setSignedIn(session){
      current=session; token=session.access_token||'';
      if(!token){setSignedOut(); return}
      el('userEmail').textContent=session.user.email||'Signed in';
      el('signedOutActions').hidden=true; el('accountCard').classList.add('show');
    }
    async function api(path, options){
      var opts=options||{}; opts.headers=Object.assign({apikey:SUPABASE_ANON_KEY}, opts.headers||{});
      if(token) opts.headers.Authorization='Bearer '+token;
      var response=await fetch(SUPABASE_URL+path, opts);
      var body=await response.text();
      if(!response.ok) throw Error('Request failed');
      return body?JSON.parse(body):null;
    }
    async function loadProfile(session){
      el('refreshAccount').hidden=false;
      try{
        var rows=await api('/rest/v1/profiles?id=eq.'+encodeURIComponent(session.user.id)+'&select=subscription_status');
        var status=rows&&rows[0]&&rows[0].subscription_status;
        var pro=status==='trialing'||status==='active';
        renderAccess(pro, true);
        el('subscriptionStatus').textContent=pro?(status==='trialing'?'Claim Pro · 14-day trial in progress':'Claim Pro · Active'):'Signed in · start a 14-day trial below';
        if(pro && location.pathname==='/app') await loadBrands();
      }catch(e){renderAccess(false,false); el('subscriptionStatus').textContent='Unable to confirm the subscription. Refresh and retry.'}
    }
    function say(message){el('workspaceMessage').textContent=message}
    async function loadBrands(preferred){
      var rows=await api('/rest/v1/claim_brands?select=id,name&order=updated_at.desc&limit=50');
      brands=rows||[];
      el('brandSelect').replaceChildren(new Option('Choose a brand',''));
      brands.forEach(function(brand){el('brandSelect').add(new Option(brand.name, brand.id))});
      selected=brands.some(function(brand){return brand.id===preferred})?preferred:'';
      el('brandSelect').value=selected;
      await loadGuide();
    }
    async function loadGuide(){
      el('editor').hidden=!selected;
      el('guide').textContent='';
      if(!selected) return;
      var id=encodeURIComponent(selected);
      var guide={
        brand:(await api('/rest/v1/claim_brands?id=eq.'+id+'&select=id,name,voice_summary,voice_traits'))[0],
        claims:await api('/rest/v1/claim_approved_claims?brand_id=eq.'+id+'&select=id,statement,status,revision&order=updated_at.desc'),
        offers:await api('/rest/v1/claim_offers?brand_id=eq.'+id+'&select=id,name,terms,active,revision&order=updated_at.desc'),
        proof:await api('/rest/v1/claim_proof?brand_id=eq.'+id+'&select=id,title,source,summary,claim_id'),
        banned_phrases:await api('/rest/v1/claim_banned_phrases?brand_id=eq.'+id+'&select=id,phrase,note')
      };
      el('guide').textContent=JSON.stringify(guide,null,2);
      el('voiceSummary').value=guide.brand.voice_summary||'';
      el('voiceTraits').value=(guide.brand.voice_traits||[]).join(', ');
    }
    el('brandSelect').onchange=function(){selected=this.value; loadGuide().catch(function(){say('Could not load that brand.')})};
    async function save(work, done){
      try{await work(); say(done)}
      catch(error){say(error.message||'Could not save. Your text is still here.')}
    }
    el('brandForm').onsubmit=function(event){
      event.preventDefault();
      var name=el('brandName').value.trim(); if(!name||!current) return;
      var form=this;
      return save(async function(){
        var rows=await api('/rest/v1/claim_brands',{method:'POST',headers:{'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify({owner_id:current.user.id,name:name,voice_traits:[]})});
        form.reset(); await loadBrands(rows[0].id);
      }, 'Brand created.');
    };
    el('voiceForm').onsubmit=function(event){
      event.preventDefault(); if(!selected) return;
      var traits=el('voiceTraits').value.split(',').map(function(item){return item.trim()}).filter(Boolean);
      return save(async function(){
        await api('/rest/v1/claim_brands?id=eq.'+encodeURIComponent(selected),{method:'PATCH',headers:{'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({voice_summary:el('voiceSummary').value.trim(),voice_traits:traits,updated_at:new Date().toISOString()})});
        await loadGuide();
      }, 'Voice saved.');
    };
    el('claimForm').onsubmit=function(event){
      event.preventDefault(); if(!selected) return;
      var form=this;
      return save(async function(){
        await api('/rest/v1/claim_approved_claims',{method:'POST',headers:{'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({brand_id:selected,statement:el('claimStatement').value.trim(),status:el('claimStatus').value})});
        form.reset(); await loadGuide();
      }, 'Claim saved.');
    };
    el('offerForm').onsubmit=function(event){
      event.preventDefault(); if(!selected) return;
      var form=this;
      return save(async function(){
        await api('/rest/v1/claim_offers',{method:'POST',headers:{'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({brand_id:selected,name:el('offerName').value.trim(),terms:el('offerTerms').value.trim(),active:el('offerActive').checked})});
        form.reset(); el('offerActive').checked=true; await loadGuide();
      }, 'Offer saved.');
    };
    el('proofForm').onsubmit=function(event){
      event.preventDefault(); if(!selected) return;
      var form=this;
      return save(async function(){
        await api('/rest/v1/claim_proof',{method:'POST',headers:{'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({brand_id:selected,title:el('proofTitle').value.trim(),source:el('proofSource').value.trim(),summary:el('proofSummary').value.trim()})});
        form.reset(); await loadGuide();
      }, 'Proof saved.');
    };
    el('phraseForm').onsubmit=function(event){
      event.preventDefault(); if(!selected) return;
      var form=this;
      return save(async function(){
        await api('/rest/v1/claim_banned_phrases',{method:'POST',headers:{'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({brand_id:selected,phrase:el('phrase').value.trim()})});
        form.reset(); await loadGuide();
      }, 'Banned phrase saved.');
    };
    el('checkForm').onsubmit=async function(event){
      event.preventDefault();
      el('checkResult').textContent='Checking…';
      try{
        var response=await fetch('/api/check',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({brandId:selected,draft:el('draft').value})});
        var body=await response.json();
        el('checkResult').textContent=body.error||JSON.stringify(body,null,2);
      }catch(error){el('checkResult').textContent=error.message||'Could not check this draft.'}
    };
    function resumePlugin(){
      try{
        var saved=sessionStorage.getItem('claimPluginReturn'); if(!saved) return false;
        sessionStorage.removeItem('claimPluginReturn');
        var pending=JSON.parse(saved);
        if(!pending||Date.now()-pending.createdAt>600000) return false;
        location.assign(pending.id?'/oauth/consent?authorization_id='+encodeURIComponent(pending.id):'/connections');
        return true;
      }catch(e){return false}
    }
    var client=null;
    async function init(){
      if(!SUPABASE_URL||!SUPABASE_ANON_KEY||!window.supabase){setSignedOut(); showError('Google sign-in is not configured yet.'); return}
      client=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{auth:{flowType:'implicit',persistSession:true,detectSessionInUrl:true,autoRefreshToken:true}});
      var result=await client.auth.getSession();
      var session=result.data&&result.data.session;
      if(session){ if(resumePlugin()) return; setSignedIn(session); await loadProfile(session); }
      else setSignedOut();
      client.auth.onAuthStateChange(function(_event, session){
        if(session){setSignedIn(session); loadProfile(session)} else setSignedOut();
      });
    }
    el('googleBtn').onclick=async function(){
      clearError(); if(!client){showError('Google sign-in is still loading.'); return}
      this.disabled=true;
      var result=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:APP_BASE_URL+'/'}});
      if(result.error){this.disabled=false; showError(result.error.message||'Google sign-in failed.')}
    };
    el('signOutBtn').onclick=async function(){ if(client) await client.auth.signOut(); setSignedOut(); location.href='/'; };
    el('refreshAccount').onclick=function(){ if(current) loadProfile(current); };
    document.querySelectorAll('.checkout').forEach(function(btn){
      btn.onclick=async function(){
        clearError();
        if(!token){showError('Sign in with Google first.'); return}
        btn.disabled=true;
        try{
          var response=await fetch('/billing/checkout',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({plan:btn.getAttribute('data-plan')})});
          var data=await response.json();
          if(!response.ok) throw Error(data.error||'Unable to start checkout');
          location.href=data.url;
        }catch(error){showError(error.message); btn.disabled=false}
      };
    });
    var checkout=new URLSearchParams(location.search).get('checkout');
    if(checkout==='success'){el('notice').textContent='Checkout completed. Your subscription is being confirmed.'; el('notice').classList.add('show')}
    if(checkout==='cancelled') showError('Checkout was cancelled. No changes were made.');
    init();
  })();
  </script>
</body></html>`;
}
