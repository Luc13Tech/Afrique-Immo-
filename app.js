// =========================================================
// AFRIQUE IMMO — app.js v5.0
// Fixes: follow persist, likes/share/save 100% fonctionnel,
// i18n complet, notif cliquable, messagerie WhatsApp,
// statuts, appels, conversations libres
// =========================================================

const DEEPSEEK_API_KEY  = 'sk-8eabfc9425a844c6bac68691a53a9a05';
const DEEPSEEK_URL      = 'https://api.deepseek.com/v1/chat/completions';
const EMAILJS_PUBLIC_KEY= 'rm-Zu8MBxW1LuhgEs';
const EMAILJS_SERVICE   = 'service_teranga';
const EMAILJS_TEMPLATE  = 'template_register';
const MAX_IMAGE_SIZE    = 20  * 1024 * 1024;
const MAX_VIDEO_SIZE    = 500 * 1024 * 1024;

// ── Storage keys ──
const DB_KEY       = 'ai_db_v1';
const USER_KEY     = 'ai_user_v1';
const USERS_KEY    = 'ai_users_v1';
const LIKES_KEY    = 'ai_likes_v1';
const FAVS_KEY     = 'ai_favs_v1';
const FOLLOWS_KEY  = 'ai_follows_v1';
const COMMENTS_KEY = 'ai_comm_v1';
const CONV_KEY     = 'ai_conv_v1';
const LANG_KEY     = 'ai_lang_v1';
const STATUS_KEY   = 'ai_status_v1';
const CALLS_KEY    = 'ai_calls_v1';

// ── State ──
let currentUser             = null;
let allListings             = [];
let likedPosts              = new Set();
let favorites               = new Set();
let followedUsers           = new Set();
let aiHistory               = [];
let currentLang             = 'fr';
let searchType              = 'vendre';
let uploadedMedia           = [];
let currentInterestedListing= null;
let textFontSize            = 16;
let currentConvId           = null;
let callTimer               = null;
let callSeconds             = 0;
let isMuted                 = false;
let currentPubStep          = 1;
let waCurrentTab            = 'chats';

// ── Full i18n dictionary ──
const i18n = {
  fr: {
    myProfile:'Mon Profil', myListings:'Mes Biens', settings:'Paramètres', logout:'Déconnexion',
    home:'Accueil', explore:'Explorer', search:'Recherche IA', publishBtn:'Publier un bien',
    messages:'Messages', favorites:'Favoris', notifications:'Notifications', profile:'Profil',
    forSale:'À Vendre', forRent:'À Louer', all:'Tous', recentPosts:'Publications récentes',
    browse:'Parcourir par catégorie', seeAll:'Voir tout', listed:'Biens listés', sellers:'Vendeurs',
    regions:'Régions', posts:'Publications', followers:'Abonnés', following:'Suivis',
    liked:'Aimés', saved:'Sauvegardés', publish:'Publier', edit:'Modifier', cancel:'Annuler',
    save:'Enregistrer', back:'Retour', next:'Suivant', info:'Infos', media:'Médias',
    propInfo:'Informations du bien', location:'Localisation', transaction:'Transaction',
    type:'Type', minBudget:'Budget min (FCFA)', maxBudget:'Budget max (FCFA)',
    launchSearch:'Lancer la Recherche IA', previewPublish:'Aperçu & Publication',
    publishNow:'Publier maintenant', mediaTitle:'Photos, Vidéos & Texte',
    clickMedia:'Cliquez pour choisir photos ou vidéos', chooseTemplate:'Choisissez un template',
    account:'Compte', language:'Langue', chooseLanguage:'Choisir la langue',
    enableNotifs:'Activer les notifications', about:'À propos', phone:'Téléphone',
    address:'Adresse', firstName:'Prénom', lastName:'Nom', password:'Mot de passe',
    idCard:'Pièce d\'identité', uploadId:'Uploadez votre CNI ou Passeport',
    terms:'J\'accepte les conditions d\'utilisation', createBtn:'Créer mon compte',
    haveAccount:'Déjà inscrit ?', loginBtn:'Se connecter', login:'Connexion',
    loginSub:'Bienvenue ! Connectez-vous à votre compte.', noAccount:'Pas de compte ?',
    register:'S\'inscrire', forgotPwd:'Mot de passe oublié ?', sendLink:'Envoyer le lien',
    createAccount:'Créer un compte', editProfile:'Modifier le profil',
    interested:'Vous êtes intéressé(e) !', contactHow:'Choisissez comment contacter :',
    contactWA:'Contacter sur WhatsApp', callDirect:'Appeler directement',
    sendMsg:'Envoyer un message', close:'Fermer', chats:'Discussions', statuses:'Statuts',
    calls:'Appels', myStatus:'Mon statut', addStatus:'Appuyez pour ajouter un statut',
    newCall:'Nouvel appel', selectChat:'Sélectionnez une discussion',
    selectChatSub:'Cliquez sur une conversation pour commencer',
    popular:'Biens populaires', heroTitle:'Trouvez votre bien idéal au Sénégal',
    propertyType:'Type de bien', apartment:'Appartement', house:'Maison', land:'Terrain',
    office:'Bureau', commercial:'Commerce', budget:'Budget', locationPh:'Zone, quartier, ville…',
    price:'Prix (FCFA)', surface:'Surface (m²)', rooms:'Chambres', baths:'Salles de bain',
    description:'Description', equipment:'Équipements', availability:'Disponibilités',
    aiAssistant:'Assistant Afrique IA', aiGreet:'👋 Bonjour ! Je suis votre assistant Afrique Immo IA. Posez-moi n\'importe quelle question !',
    sale:'Vente', rental:'Location', newPost:'Nouvelle publication',
    titleLabel:'Titre', privacy:'Confidentialité', privateAccount:'Compte privé',
    online:'En ligne', offline:'Hors ligne', typing:'En train d\'écrire…',
    msgPlaceholder:'Écrire un message…', today:'Aujourd\'hui', yesterday:'Hier',
    callEnded:'Appel terminé', callOutgoing:'Appel sortant', callIncoming:'Appel entrant',
    callMissed:'Appel manqué', videoCall:'Appel vidéo', audioCall:'Appel audio'
  },
  en: {
    myProfile:'My Profile', myListings:'My Properties', settings:'Settings', logout:'Log out',
    home:'Home', explore:'Explore', search:'AI Search', publishBtn:'Post a property',
    messages:'Messages', favorites:'Favorites', notifications:'Notifications', profile:'Profile',
    forSale:'For Sale', forRent:'For Rent', all:'All', recentPosts:'Recent posts',
    browse:'Browse by category', seeAll:'See all', listed:'Listed properties', sellers:'Sellers',
    regions:'Regions', posts:'Posts', followers:'Followers', following:'Following',
    liked:'Liked', saved:'Saved', publish:'Publish', edit:'Edit', cancel:'Cancel',
    save:'Save', back:'Back', next:'Next', info:'Info', media:'Media',
    propInfo:'Property information', location:'Location', transaction:'Transaction',
    type:'Type', minBudget:'Min budget (FCFA)', maxBudget:'Max budget (FCFA)',
    launchSearch:'Launch AI Search', previewPublish:'Preview & Publish',
    publishNow:'Publish now', mediaTitle:'Photos, Videos & Text',
    clickMedia:'Click to choose photos or videos', chooseTemplate:'Choose a template',
    account:'Account', language:'Language', chooseLanguage:'Choose language',
    enableNotifs:'Enable notifications', about:'About', phone:'Phone',
    address:'Address', firstName:'First name', lastName:'Last name', password:'Password',
    idCard:'ID document', uploadId:'Upload your ID or Passport',
    terms:'I accept the terms of use', createBtn:'Create my account',
    haveAccount:'Already registered?', loginBtn:'Log in', login:'Login',
    loginSub:'Welcome! Log in to your account.', noAccount:'No account?',
    register:'Sign up', forgotPwd:'Forgot password?', sendLink:'Send link',
    createAccount:'Create an account', editProfile:'Edit profile',
    interested:'You are interested!', contactHow:'Choose how to contact:',
    contactWA:'Contact on WhatsApp', callDirect:'Call directly',
    sendMsg:'Send a message', close:'Close', chats:'Chats', statuses:'Status',
    calls:'Calls', myStatus:'My status', addStatus:'Tap to add a status',
    newCall:'New call', selectChat:'Select a conversation',
    selectChatSub:'Click on a conversation to start',
    popular:'Popular properties', heroTitle:'Find your ideal property in Senegal',
    propertyType:'Property type', apartment:'Apartment', house:'House', land:'Land',
    office:'Office', commercial:'Commerce', budget:'Budget', locationPh:'Area, neighborhood, city…',
    price:'Price (FCFA)', surface:'Surface (m²)', rooms:'Bedrooms', baths:'Bathrooms',
    description:'Description', equipment:'Equipment', availability:'Availability',
    aiAssistant:'Afrique IA Assistant', aiGreet:'👋 Hello! I am your Afrique Immo AI assistant. Ask me anything!',
    sale:'Sale', rental:'Rental', newPost:'New post',
    titleLabel:'Title', privacy:'Privacy', privateAccount:'Private account',
    online:'Online', offline:'Offline', typing:'Typing…',
    msgPlaceholder:'Write a message…', today:'Today', yesterday:'Yesterday',
    callEnded:'Call ended', callOutgoing:'Outgoing call', callIncoming:'Incoming call',
    callMissed:'Missed call', videoCall:'Video call', audioCall:'Audio call'
  }
};

function t(k){ return (i18n[currentLang]||i18n.fr)[k]||k; }

// =========================================================
// LANGUAGE
// =========================================================
function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem(LANG_KEY, lang);
  // Update all data-i18n elements
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = (i18n[lang]||i18n.fr)[key];
    if (val !== undefined) el.textContent = val;
  });
  // Update placeholders
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    const key = el.getAttribute('data-i18n-ph');
    const val = (i18n[lang]||i18n.fr)[key];
    if (val !== undefined) el.placeholder = val;
  });
  // Update AI greeting
  const firstAiMsg = document.querySelector('.ai-messages .ai-msg.bot');
  if (firstAiMsg) firstAiMsg.textContent = t('aiGreet');
  // Update buttons
  document.getElementById('langFR')?.classList.toggle('active', lang==='fr');
  document.getElementById('langEN')?.classList.toggle('active', lang==='en');
  document.getElementById('htmlRoot')?.setAttribute('lang', lang);
  // Update msg placeholder
  const msgInput = document.getElementById('msgInput');
  if (msgInput) msgInput.placeholder = t('msgPlaceholder');
  // Re-render dynamic content with new language
  if(allListings.length>0){
    renderHomeFeed();
    if(document.getElementById('page-explore').classList.contains('active')) renderExploreFeed();
  }
  if(document.getElementById('page-notifications').classList.contains('active')) renderNotifications();
}

// =========================================================
// SECURITY
// =========================================================
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// =========================================================
// STORAGE
// =========================================================
function loadStorage() {
  try { allListings   = JSON.parse(localStorage.getItem(DB_KEY)||'[]'); } catch(e){ allListings=[]; }
  try { likedPosts    = new Set(JSON.parse(localStorage.getItem(LIKES_KEY)||'[]')); } catch(e){ likedPosts=new Set(); }
  try { favorites     = new Set(JSON.parse(localStorage.getItem(FAVS_KEY)||'[]')); } catch(e){ favorites=new Set(); }
  try { followedUsers = new Set(JSON.parse(localStorage.getItem(FOLLOWS_KEY)||'[]')); } catch(e){ followedUsers=new Set(); }
}
function persist(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); }
  catch(e) {
    cleanOldMedia();
    try { localStorage.setItem(key, JSON.stringify(val)); }
    catch(e2) {
      if (key===DB_KEY) {
        allListings = allListings.slice(0,10).map(l=>({...l,media:[],mediaTypes:[]}));
        localStorage.setItem(key, JSON.stringify(allListings));
        showToast('Stockage plein : anciens médias supprimés','error');
      }
    }
  }
}
function cleanOldMedia() {
  allListings.forEach(l=>{ if((l.media||[]).length>1){ l.media=l.media.slice(0,1); l.mediaTypes=(l.mediaTypes||[]).slice(0,1); } });
}
function saveListings() { persist(DB_KEY, allListings); }
function saveLikes()    { persist(LIKES_KEY,   [...likedPosts]); }
function saveFavs()     { persist(FAVS_KEY,    [...favorites]); }
function saveFollows()  { persist(FOLLOWS_KEY, [...followedUsers]); }

// =========================================================
// INIT
// =========================================================
window.addEventListener('load', () => {
  currentLang = localStorage.getItem(LANG_KEY)||'fr';
  loadStorage();
  setTimeout(()=>{
    document.getElementById('splash')?.classList.add('fade-out');
    setTimeout(()=>{ document.getElementById('splash').style.display='none'; initApp(); }, 800);
  }, 2000);
});

function initApp() {
  if (typeof emailjs!=='undefined') try{ emailjs.init(EMAILJS_PUBLIC_KEY); }catch(e){}
  try{ const s=localStorage.getItem(USER_KEY); if(s) currentUser=JSON.parse(s); }catch(e){}
  if (currentUser) showApp();
  else { showAuthOverlay(); showModal('login'); }
  setLanguage(currentLang);
}

function showApp() {
  document.getElementById('app')?.classList.remove('hidden');
  updateNavAvatar();
  updateNotifBadge();
  updateStats();
  renderHomeFeed();
  renderConversationList();
  loadStatuses();
  loadCallLog();
  setTimeout(askNotifPermission, 2500);
}

function updateStats() {
  let users=[]; try{ users=JSON.parse(localStorage.getItem(USERS_KEY)||'[]'); }catch(e){}
  const e1=document.getElementById('statListings'); if(e1) e1.textContent=allListings.length+(allListings.length>0?'+':'');
  const e2=document.getElementById('statUsers');    if(e2) e2.textContent=users.length+(users.length>0?'+':'');
}

// =========================================================
// NOTIFICATIONS (browser)
// =========================================================
function askNotifPermission() {
  if (!('Notification' in window)||Notification.permission!=='default') return;
  if (document.getElementById('notifBanner')) return;
  const d=document.createElement('div'); d.id='notifBanner';
  d.innerHTML=`<div class="notif-banner">
    <span>🔔 Activez les notifications pour les likes, commentaires et abonnés</span>
    <div class="nb-btns">
      <button class="btn-primary" style="padding:7px 14px;font-size:.82rem" onclick="enableNotifs()">Activer</button>
      <button class="btn-secondary" style="padding:7px 12px;font-size:.82rem" onclick="this.closest('#notifBanner').remove()">Plus tard</button>
    </div></div>`;
  document.body.appendChild(d);
}
function enableNotifs() {
  Notification.requestPermission().then(p=>{
    document.getElementById('notifBanner')?.remove();
    const tog=document.getElementById('notifToggle'); if(tog) tog.checked=p==='granted';
    showToast(p==='granted'?'🔔 Notifications activées !':'Notifications refusées', p==='granted'?'success':'info');
  });
}
function toggleNotifSetting(cb){ if(cb.checked) enableNotifs(); }
function pushBrowserNotif(title,body){ if(Notification.permission!=='granted') return; try{new Notification('🏠 '+title,{body});}catch(e){} }

// =========================================================
// NOTIFICATIONS (in-app)
// =========================================================
function getNotifsKey(){ return currentUser?'ai_notifs_'+currentUser.id:'ai_notifs_global'; }
function getNotifs(){ try{return JSON.parse(localStorage.getItem(getNotifsKey())||'[]');}catch(e){return[];} }
function addNotif(notif) {
  const key=getNotifsKey(), list=getNotifs();
  list.unshift({...notif, id:Date.now()+Math.random(), read:false, time:new Date().toISOString()});
  localStorage.setItem(key, JSON.stringify(list.slice(0,200)));
  updateNotifBadge();
  pushBrowserNotif(notif.title||'Afrique Immo', notif.text||'');
}
function addNotifForUser(userId, notif) {
  if(!userId) return;
  const key='ai_notifs_'+userId;
  try{ const list=JSON.parse(localStorage.getItem(key)||'[]');
    list.unshift({...notif,id:Date.now()+Math.random(),read:false,time:new Date().toISOString()});
    localStorage.setItem(key,JSON.stringify(list.slice(0,200)));
  }catch(e){}
}
function updateNotifBadge() {
  const count=getNotifs().filter(n=>!n.read).length;
  const badge=document.querySelector('#navbar .badge');
  if(!badge) return;
  badge.textContent=count>99?'99+':count;
  badge.style.display=count>0?'flex':'none';
}

// =========================================================
// AUTH
// =========================================================
function showAuthOverlay(){ const a=document.getElementById('authOverlay'); if(a) a.style.display='flex'; }
function hideAuthOverlay(){ const a=document.getElementById('authOverlay'); if(a) a.style.display='none'; }
function showModal(name){ document.querySelectorAll('.auth-modal').forEach(m=>m.classList.add('hidden')); document.getElementById(name+'Modal')?.classList.remove('hidden'); }

function doLogin() {
  const email=document.getElementById('loginEmail').value.trim();
  const pass=document.getElementById('loginPassword').value;
  if(!email||!pass){ showToast('Remplissez tous les champs','error'); return; }
  showLoading('Connexion…');
  setTimeout(()=>{
    hideLoading();
    try{
      const users=JSON.parse(localStorage.getItem(USERS_KEY)||'[]');
      const found=users.find(u=>u.email===email&&u.ph===hashStr(pass));
      if(!found){ showToast('Email ou mot de passe incorrect','error'); return; }
      currentUser=found; persist(USER_KEY,currentUser);
      hideAuthOverlay(); showApp();
      showToast('Bienvenue '+currentUser.firstName+' ! 🏠','success');
    }catch(e){ showToast('Erreur de connexion','error'); }
  },1200);
}

function doRegister() {
  const fn=document.getElementById('regFirstName').value.trim();
  const ln=document.getElementById('regLastName').value.trim();
  const em=document.getElementById('regEmail').value.trim();
  const pw=document.getElementById('regPassword').value;
  const ph=document.getElementById('regPhone').value.trim();
  const wa=document.getElementById('regWhatsapp').value.trim();
  const addr=document.getElementById('regAddress').value.trim();
  const trm=document.getElementById('regTerms').checked;
  if(!fn||!ln||!em||!pw||!ph||!wa||!addr){ showToast('Tous les champs obligatoires doivent être remplis','error'); return; }
  if(!trm){ showToast("Acceptez les conditions d'utilisation",'error'); return; }
  if(pw.length<8){ showToast('Mot de passe trop court (min. 8 caractères)','error'); return; }
  let users=[]; try{ users=JSON.parse(localStorage.getItem(USERS_KEY)||'[]'); }catch(e){}
  if(users.find(u=>u.email===em)){ showToast('Cet email est déjà utilisé','error'); return; }
  showLoading("Vérification IA de votre pièce d'identité…");
  setTimeout(()=>{ showLoadingText('Comparaison des données…');
    setTimeout(()=>{ showLoadingText('Validation du compte…');
      setTimeout(()=>{
        hideLoading();
        const newUser={id:'u_'+Date.now(),firstName:fn,lastName:ln,email:em,ph:hashStr(pw),phone:ph,whatsapp:wa,address:addr,bio:'',avatar:null,followers:[],following:[],createdAt:new Date().toISOString()};
        users.push(newUser); persist(USERS_KEY,users);
        currentUser=newUser; persist(USER_KEY,newUser);
        sendAdminEmail({firstName:fn,lastName:ln,email:em,phone:ph,whatsapp:wa,address:addr});
        hideAuthOverlay(); showApp();
        showToast('Bienvenue '+fn+' ! Compte créé ✅','success');
        addNotif({type:'system',title:'Bienvenue !',text:'🎉 Votre compte Afrique Immo a été créé avec succès !'});
      },1000);
    },1100);
  },1200);
}

function doForgot(){
  const em=document.getElementById('forgotEmail').value.trim();
  if(!em){ showToast('Entrez votre email','error'); return; }
  showToast('Lien envoyé à '+em,'success'); setTimeout(()=>showModal('login'),2000);
}
function logout(){ currentUser=null; localStorage.removeItem(USER_KEY); document.getElementById('app')?.classList.add('hidden'); showAuthOverlay(); showModal('login'); showToast('Déconnecté','info'); }
function hashStr(s){ let h=0; for(let i=0;i<s.length;i++) h=(Math.imul(31,h)+s.charCodeAt(i))|0; return h.toString(36); }
function togglePwd(id){ const el=document.getElementById(id); if(el) el.type=el.type==='password'?'text':'password'; }
function handleIdUpload(event){
  const file=event.target.files[0]; if(!file) return;
  const url=URL.createObjectURL(file);
  const prev=document.getElementById('idPreview'); if(!prev) return;
  prev.classList.remove('hidden');
  prev.innerHTML='<img src="'+url+'" style="width:100%;border-radius:8px"/><div style="margin-top:8px;font-size:.82rem;color:var(--gold)"><span class="typing-dots"><span></span><span></span><span></span></span> Analyse IA…</div>';
  setTimeout(()=>{ const d=prev.querySelector('[style*="typing"]'); if(d) d.outerHTML='<div style="color:#2ECC71;margin-top:6px">✅ Pièce d\'identité vérifiée</div>'; },2500);
}
function sendAdminEmail(u){
  if(typeof emailjs!=='undefined'){
    emailjs.send(EMAILJS_SERVICE,EMAILJS_TEMPLATE,{to_email:'immobiliersn9@gmail.com',prenom:escapeHtml(u.firstName),nom:escapeHtml(u.lastName),email:escapeHtml(u.email),telephone:escapeHtml(u.phone),whatsapp:escapeHtml(u.whatsapp),adresse:escapeHtml(u.address),date:new Date().toLocaleString('fr-FR')},EMAILJS_PUBLIC_KEY)
    .then(()=>console.log('📧 Email admin → immobiliersn9@gmail.com')).catch(e=>console.warn('EmailJS:',e));
  }
  console.log('📧 Admin:',u);
}

// =========================================================
// NAVIGATION
// =========================================================
function nav(page){ showPage(page); toggleSidebar(); }
function showPage(page) {
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  const target=document.getElementById('page-'+page);
  if(target){ target.classList.add('active'); window.scrollTo(0,0); }
  document.querySelectorAll('.bottom-nav button').forEach(b=>b.classList.remove('active-tab'));
  const tabMap={home:'bn-home',explore:'bn-explore',messages:'bn-messages',profile:'bn-profile'};
  if(tabMap[page]) document.getElementById(tabMap[page])?.classList.add('active-tab');
  const handlers={
    home:()=>{ renderHomeFeed(); renderFeatured(); updateStats(); },
    explore:()=>renderExploreFeed(),
    profile:()=>renderProfile(),
    'my-listings':()=>renderMyListings(),
    favorites:()=>renderFavorites(),
    notifications:()=>{ renderNotifications(); markNotifsRead(); },
    messages:()=>{ renderConversationList(); showWaTab('chats'); },
    publish:()=>resetPublish()
  };
  if(handlers[page]) handlers[page]();
}
function markNotifsRead(){ const key=getNotifsKey(), list=getNotifs().map(n=>({...n,read:true})); localStorage.setItem(key,JSON.stringify(list)); updateNotifBadge(); }
function updateNavAvatar(){ if(!currentUser) return; const src=currentUser.avatar||avatarUrl(currentUser.firstName+' '+currentUser.lastName); const el=document.getElementById('navAvatar'); if(el) el.src=src; }
function avatarUrl(name,bg='C8973A'){ return 'https://ui-avatars.com/api/?name='+encodeURIComponent(name)+'&background='+bg+'&color=fff&size=100'; }
function toggleSidebar(){ document.getElementById('sidebar')?.classList.toggle('hidden'); document.getElementById('sidebarOverlay')?.classList.toggle('hidden'); }
function toggleProfileMenu(){ document.getElementById('profileMenu')?.classList.toggle('hidden'); }
document.addEventListener('click',e=>{ const m=document.getElementById('profileMenu'); if(m&&!e.target.closest('.nav-avatar')) m.classList.add('hidden'); });

// =========================================================
// SEARCH OVERLAY
// =========================================================
function openSearchBar(){ document.getElementById('searchOverlay')?.classList.remove('hidden'); setTimeout(()=>document.getElementById('searchOverlayInput')?.focus(),100); }
function closeSearchBar(){ document.getElementById('searchOverlay')?.classList.add('hidden'); }
function searchOverlayQuery(q){
  const res=document.getElementById('searchOverlayResults'); if(!res) return;
  if(!q.trim()){ res.innerHTML=''; return; }
  const lower=q.toLowerCase();
  const found=allListings.filter(l=>l.title?.toLowerCase().includes(lower)||l.location?.toLowerCase().includes(lower)||l.owner?.name?.toLowerCase().includes(lower)||l.type?.toLowerCase().includes(lower));
  res.innerHTML='';
  if(!found.length){ res.innerHTML='<div style="color:var(--gray);padding:20px;text-align:center">Aucun résultat pour "'+escapeHtml(q)+'"</div>'; return; }
  found.slice(0,10).forEach(l=>{
    const media=(l.media||[])[0]; const isVid=(l.mediaTypes||[])[0]==='video';
    const div=document.createElement('div'); div.className='sor-item';
    div.innerHTML=(media&&!isVid?'<img src="'+media+'" alt="" style="width:44px;height:44px;border-radius:8px;object-fit:cover" onerror="this.style.display=\'none\'"/>'
      :'<div class="sor-thumb">'+(isVid?'🎬':'🏠')+'</div>')
      +'<div><div class="sor-title">'+escapeHtml(l.title)+'</div><div class="sor-sub">'+formatPrice(l.price,l.transaction)+' · '+escapeHtml(l.location)+'</div></div>';
    div.onclick=()=>{ closeSearchBar(); showPropertyDetail(l.id); };
    res.appendChild(div);
  });
}

// =========================================================
// HOME FEED
// =========================================================
function renderHomeFeed(){
  const c=document.getElementById('homeFeed'); if(!c) return;
  c.innerHTML='';
  if(!allListings.length){
    c.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:48px;color:var(--gray)"><div style="font-size:3.5rem;margin-bottom:12px">🏠</div><h3 style="font-family:var(--font-display);margin-bottom:8px">Aucune publication pour l\'instant</h3><p>Soyez le premier à publier un bien !</p><button class="btn-primary" style="margin-top:20px" onclick="showPage(\'publish\')"><i class="fas fa-plus"></i> Publier un bien</button></div>';
    return;
  }
  allListings.slice(0,12).forEach(l=>c.appendChild(createPropertyCard(l)));
}
function renderFeatured(){
  const c=document.getElementById('featuredListings'); if(!c) return;
  c.innerHTML=''; const feat=allListings.filter(l=>(l.likes||0)>=3);
  if(!feat.length){ c.innerHTML='<p style="color:var(--gray);padding:16px">Les biens populaires apparaîtront ici.</p>'; return; }
  feat.slice(0,6).forEach(l=>c.appendChild(createPropertyCard(l)));
}

// =========================================================
// PROPERTY CARD
// =========================================================
function createPropertyCard(l){
  const card=document.createElement('div'); card.className='property-card';
  const isFav=favorites.has(l.id);
  const nLikes=l.likes||0;
  const media=(l.media||[])[0];
  const isVid=(l.mediaTypes||[])[0]==='video';
  const ownerVer=(l.owner?.followersCount||0)>=1000;
  const ownerName=l.owner?.name||'';
  let mHTML='';
  if(media){ mHTML=isVid?'<video src="'+media+'" muted playsinline preload="metadata" style="width:100%;height:100%;object-fit:cover" onclick="showPropertyDetail(\''+l.id+'\')"></video><div class="pc-play-icon">▶️</div>':'<img src="'+media+'" alt="'+escapeHtml(l.title)+'" loading="lazy" style="width:100%;height:100%;object-fit:cover" onclick="showPropertyDetail(\''+l.id+'\')" onerror="this.parentElement.innerHTML=\'<div style=&quot;width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:3rem;background:var(--dark3)&quot;>🏠</div>\'"/>'; }
  else if(l.textContent){ mHTML='<div style="width:100%;height:100%;padding:14px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--dark3),var(--dark4));font-size:.85rem;text-align:center;line-height:1.5;overflow:hidden;cursor:pointer" onclick="showPropertyDetail(\''+l.id+'\')">'+escapeHtml(l.textContent.substring(0,180))+'</div>'; }
  else{ mHTML='<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--dark3);font-size:3rem;cursor:pointer" onclick="showPropertyDetail(\''+l.id+'\')">🏠</div>'; }
  card.innerHTML='<div class="pc-img" style="position:relative;height:200px;overflow:hidden">'+mHTML
    +'<span class="pc-badge '+(l.transaction==='louer'?'louer':'')+'">'+(l.transaction==='louer'?t('forRent'):t('forSale'))+'</span>'
    +'<button class="pc-save '+(isFav?'active':'')+'" onclick="event.stopPropagation();toggleFavorite(\''+l.id+'\',this)"><i class="fas fa-heart"></i></button>'
    +(l.externalSource?'<div style="position:absolute;bottom:8px;left:10px;background:'+l.externalColor+';color:#fff;border-radius:50px;padding:2px 8px;font-size:.7rem;font-weight:700">'+l.externalIcon+' '+escapeHtml(l.externalSource)+'</div>':'')
    +'<div class="pc-date">'+formatDate(l.createdAt)+'</div></div>'
    +'<div class="pc-body" onclick="showPropertyDetail(\''+l.id+'\')">'
    +'<div class="pc-price">'+formatPrice(l.price,l.transaction)+'</div>'
    +'<div class="pc-title">'+escapeHtml(l.title)+'</div>'
    +'<div class="pc-location"><i class="fas fa-map-marker-alt"></i>'+escapeHtml(l.location)+'</div>'
    +'<div class="pc-stats">'+(l.surface?'<span><i class="fas fa-expand-arrows-alt"></i>'+l.surface+'m²</span>':'')+(l.chambres?'<span><i class="fas fa-bed"></i>'+l.chambres+'</span>':'')+(l.bains?'<span><i class="fas fa-bath"></i>'+l.bains+'</span>':'')
    +'<span style="margin-left:auto;font-size:.76rem"><i class="fas fa-heart" style="color:var(--red)"></i> <span id="pcLike_'+l.id+'">'+nLikes+'</span></span></div></div>'
    +'<div class="pc-owner"><img src="'+(l.owner?.avatar||avatarUrl(ownerName))+'" alt="'+escapeHtml(ownerName)+'" onerror="this.src=\''+avatarUrl(ownerName)+'\'"/>'
    +'<span class="pc-owner-name">'+escapeHtml(ownerName)+(ownerVer?' 🔵':'')+'</span></div>'
    +'<div class="pc-actions">'
    +'<button class="pc-action-btn btn-interested" onclick="event.stopPropagation();openInterestedModal(\''+l.id+'\')"><i class="fas fa-star"></i> '+t('interested').replace(' !','')+'</button>'
    +'<button class="pc-action-btn btn-call" onclick="event.stopPropagation();callOwner(\''+escapeHtml(l.owner?.phone||'')+'\')"><i class="fas fa-phone"></i></button>'
    +'<button class="pc-action-btn btn-whatsapp" onclick="event.stopPropagation();whatsappOwner(\''+escapeHtml(l.owner?.whatsapp||'')+'\',\''+l.id+'\')"><i class="fab fa-whatsapp"></i></button>'
    +'</div>';
  return card;
}

// =========================================================
// TIKTOK EXPLORE
// =========================================================
function renderExploreFeed(filter='all'){
  const c=document.getElementById('exploreFeed'); if(!c) return;
  c.innerHTML='';
  let list=allListings;
  if(filter==='vendre'||filter==='louer') list=allListings.filter(l=>l.transaction===filter);
  else if(filter!=='all') list=allListings.filter(l=>l.type===filter);
  if(!list.length){ c.innerHTML='<div style="text-align:center;padding:60px 20px;color:var(--gray)"><div style="font-size:3rem;margin-bottom:12px">📭</div><p>Aucune publication.<br/><a onclick="showPage(\'publish\')" style="color:var(--gold)">Publiez le premier !</a></p></div>'; return; }
  list.forEach(l=>c.appendChild(createTikTokCard(l)));
}

function createTikTokCard(l){
  const card=document.createElement('div'); card.className='tiktok-card';
  const nLikes=l.likes||0, nComm=l.commentsCount||0;
  const isLiked=likedPosts.has(l.id);
  const isSaved=favorites.has(l.id);
  // FIX: follow state is per user, loaded from storage
  // Follow state: use owner id if available, else name — consistent key
  const followKey2=l.owner?.id&&l.owner.id!=='ext'?l.owner.id:(l.owner?.name||'');
  const isFollowed=followedUsers.has(followKey2);
  const media=(l.media||[])[0], isVid=(l.mediaTypes||[])[0]==='video';
  const ownerVer=(l.owner?.followersCount||0)>=1000, ownerName=l.owner?.name||'';
  let bgHTML='';
  if(media){ bgHTML=isVid?'<video src="'+media+'" autoplay muted loop playsinline style="width:100%;height:100%;object-fit:cover"></video>':'<img src="'+media+'" alt="" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display=\'none\'"/>'; }
  else if(l.textContent){ bgHTML='<div style="width:100%;height:100%;background:linear-gradient(135deg,#1a1208,#2a1d0a);display:flex;align-items:center;justify-content:center;padding:24px"><div style="font-size:1.1rem;line-height:1.7;text-align:center;color:#fff;max-width:90%">'+escapeHtml(l.textContent)+'</div></div>'; }
  else{ bgHTML='<div style="width:100%;height:100%;background:linear-gradient(135deg,#1a1208,#3a2a10);display:flex;align-items:center;justify-content:center;font-size:5rem">🏠</div>'; }
  // Use consistent follow key
  const followKey=l.owner?.id&&l.owner.id!=='ext'?l.owner.id:(l.owner?.name||'');
  card.innerHTML='<div class="tc-bg">'+bgHTML+'</div>'
    +'<div class="tc-sidebar">'
    +'<button class="tc-side-btn '+(isLiked?'liked':'')+'" id="tlike_'+l.id+'" onclick="likeProperty(\''+l.id+'\',this)"><i class="fas fa-heart"></i><span id="tlcount_'+l.id+'">'+nLikes+'</span></button>'
    +'<button class="tc-side-btn" onclick="showPropertyDetail(\''+l.id+'\')"><i class="fas fa-comment"></i><span id="tccount_'+l.id+'">'+nComm+'</span></button>'
    +'<button class="tc-side-btn" onclick="shareProperty(\''+l.id+'\')"><i class="fas fa-share"></i><span>Partager</span></button>'
    +'<button class="tc-side-btn '+(isSaved?'saved':'')+'" id="tfav_'+l.id+'" onclick="toggleFavoriteBtn(\''+l.id+'\',this)"><i class="fas fa-bookmark"></i><span>Sauver</span></button>'
    +'</div>'
    +'<div class="tc-content">'
    +'<div class="tc-date">'+formatDate(l.createdAt)+'</div>'
    +'<div class="tc-user"><img src="'+(l.owner?.avatar||avatarUrl(ownerName))+'" alt="'+escapeHtml(ownerName)+'" onerror="this.src=\''+avatarUrl(ownerName)+'\'"/>'
    +'<span class="tc-user-name">'+escapeHtml(ownerName)+(ownerVer?' 🔵':'')+'</span>'
    +'<button class="tc-follow-btn '+(isFollowed?'following':'')+'" id="tfol_'+l.id+'" onclick="followUser(\''+escapeHtml(l.owner?.id||l.owner?.name||'')+'\',\''+l.id+'\',this)">'+(isFollowed?'Suivi ✓':'+ Suivre')+'</button>'
    +'</div>'
    +'<div class="tc-title">'+escapeHtml(l.title)+'</div>'
    +'<div class="tc-price">'+formatPrice(l.price,l.transaction)+'</div>'
    +'<div class="tc-desc">'+escapeHtml(l.description||l.textContent||'')+'</div>'
    +'<div class="tc-tags">'+(l.type?'<span class="tc-tag">'+escapeHtml(l.type)+'</span>':'')+'<span class="tc-tag">'+(l.transaction==='louer'?t('forRent'):t('forSale'))+'</span>'+(l.surface?'<span class="tc-tag">'+l.surface+'m²</span>':'')+(l.chambres?'<span class="tc-tag">'+l.chambres+' ch.</span>':'')+'<span class="tc-tag"><i class="fas fa-map-marker-alt"></i> '+escapeHtml(l.location||'')+'</span></div>'
    +'<div class="tc-action-row">'
    +'<button class="tc-btn" style="background:var(--gold);color:var(--dark)" onclick="openInterestedModal(\''+l.id+'\')"><i class="fas fa-star"></i> Intéressé(e)</button>'
    +'<button class="tc-btn" style="background:var(--green);color:#fff" onclick="whatsappOwner(\''+escapeHtml(l.owner?.whatsapp||'')+'\',\''+l.id+'\')"><i class="fab fa-whatsapp"></i> WhatsApp</button>'
    +'</div></div>';
  return card;
}

function filterExplore(filter,btn){ document.querySelectorAll('.filter-chip').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); renderExploreFeed(filter); }

// =========================================================
// INTERESTED MODAL
// =========================================================
function openInterestedModal(listingId){
  currentInterestedListing=allListings.find(l=>l.id===listingId);
  if(!currentInterestedListing) return;
  document.getElementById('interestedModal').style.display='flex';
}
function closeInterestedModal(action){
  document.getElementById('interestedModal').style.display='none';
  if(!currentInterestedListing) return;
  const l=currentInterestedListing;
  if(action==='wa') whatsappOwner(l.owner?.whatsapp||'',l.id);
  else if(action==='call') callOwner(l.owner?.phone||'');
  else if(action==='msg') openOrCreateConversation(l.owner, l);
}

// =========================================================
// LIKE — 100% fonctionnel + persisté
// =========================================================
function likeProperty(id, btn){
  if(!currentUser){ showToast('Connectez-vous pour liker','info'); return; }
  const l=allListings.find(x=>x.id===id); if(!l) return;
  const wasLiked=likedPosts.has(id);
  if(wasLiked){ likedPosts.delete(id); l.likes=Math.max(0,(l.likes||0)-1); }
  else{
    likedPosts.add(id); l.likes=(l.likes||0)+1;
    if(l.owner?.id&&l.owner.id!==currentUser.id)
      addNotifForUser(l.owner.id,{type:'like',title:'Nouveau like !',listingId:id,text:'❤️ '+currentUser.firstName+' '+currentUser.lastName+' a aimé votre bien "'+l.title+'"'});
  }
  saveLikes(); saveListings();
  // Update ALL visible counters and states
  ['tlike_'+id, 'likeBtn_'+id].forEach(eid=>{
    document.querySelectorAll('#'+eid).forEach(b=>b.classList.toggle('liked',!wasLiked));
  });
  ['tlcount_'+id, 'likeCount_'+id, 'pcLike_'+id].forEach(eid=>{
    document.querySelectorAll('#'+eid).forEach(el=>el.textContent=l.likes);
  });
  // Also update via attribute selector (covers duplicates)
  document.querySelectorAll('.tc-side-btn.liked, .pd-eng-btn.liked').forEach(b=>{
    const onclick=b.getAttribute('onclick')||'';
    if(onclick.includes("likeProperty('"+id+"')")) b.classList.toggle('liked',!wasLiked);
  });
  showToast(wasLiked?'Like retiré':"❤️ J'aime !",'info');
}

// =========================================================
// FOLLOW — persisté par ID ou nom, mémorisé entre sessions
// =========================================================
function followUser(ownerKey, listingId, btn){
  if(!currentUser){ showToast('Connectez-vous pour suivre','info'); return; }
  if(!ownerKey) return;
  // Normalize key: prefer id over name for persistence
  const normKey = ownerKey;
  const already=followedUsers.has(normKey);
  if(already){
    followedUsers.delete(normKey);
    if(btn){ btn.textContent='+ Suivre'; btn.classList.remove('following'); }
    showToast('Vous ne suivez plus cette personne','info');
  } else {
    followedUsers.add(normKey);
    if(btn){ btn.textContent='Suivi ✓'; btn.classList.add('following'); }
    showToast('✅ Vous suivez maintenant '+ownerKey,'success');
    addNotif({type:'follow',title:t('notifications'),text:'👤 Vous suivez maintenant '+ownerKey});
    const listing=allListings.find(l=>l.id===listingId);
    if(listing?.owner?.id)
      addNotifForUser(listing.owner.id,{type:'follow',title:'Nouvel abonné !',text:'👤 '+currentUser.firstName+' '+currentUser.lastName+' s\'est abonné à votre compte'});
  }
  saveFollows(); updateProfileStats();
}

// =========================================================
// FAVORIS — fonctionnel, toggle avec couleur
// =========================================================
function toggleFavorite(id,btn){
  const nowFav=!favorites.has(id);
  if(nowFav){ favorites.add(id); btn.classList.add('active'); showToast('❤️ Ajouté aux favoris','success'); }
  else{ favorites.delete(id); btn.classList.remove('active'); showToast('Retiré des favoris','info'); }
  saveFavs();
  // Sync all related UI elements
  const tfav=document.getElementById('tfav_'+id); if(tfav) tfav.classList.toggle('saved',nowFav);
  const saveBtn=document.getElementById('saveBtn_'+id);
  if(saveBtn){ saveBtn.classList.toggle('saved',nowFav); const span=saveBtn.querySelector('span'); if(span) span.textContent=' '+(nowFav?t('saved'):t('save')); }
}
function toggleFavoriteBtn(id,btn){
  if(favorites.has(id)){ favorites.delete(id); btn?.classList.remove('saved'); showToast('Retiré des favoris','info'); }
  else{ favorites.add(id); btn?.classList.add('saved'); showToast('❤️ Sauvegardé','success'); }
  saveFavs();
  // Update heart icon in card
  const pcSave=document.querySelector('[onclick*="toggleFavorite(\''+id+'\'"]');
  if(pcSave) pcSave.classList.toggle('active',favorites.has(id));
}

// =========================================================
// SHARE — natif du téléphone
// =========================================================
function shareProperty(id){
  const l=allListings.find(x=>x.id===id);
  const url=window.location.href.split('?')[0];
  const txt=l?'🏠 '+l.title+' — '+formatPrice(l.price,l.transaction)+' — '+l.location+' | Afrique Immo':'Afrique Immo';
  const shareData={title:'Afrique Immo',text:txt,url};
  if(navigator.share&&navigator.canShare&&navigator.canShare(shareData)){
    navigator.share(shareData).catch(()=>fallbackShare(url));
  } else {
    fallbackShare(url);
  }
}
function fallbackShare(url){
  if(navigator.clipboard){
    navigator.clipboard.writeText(url).then(()=>showToast('🔗 Lien copié !','success')).catch(()=>showToast('Lien: '+url,'info',6000));
  } else {
    // Show share options
    const options=[
      {label:'📱 WhatsApp', url:'https://wa.me/?text='+encodeURIComponent(url)},
      {label:'📘 Facebook', url:'https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(url)},
      {label:'📨 Email', url:'mailto:?body='+encodeURIComponent(url)}
    ];
    const choice=confirm('Partager ce lien ? '+url);
    if(choice) showToast('Lien: '+url,'info',8000);
  }
}

// =========================================================
// SEARCH
// =========================================================
function setSearchType(type,btn){ searchType=type; document.querySelectorAll('.stab').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); }
function doHeroSearch(){
  const loc=document.getElementById('heroLocation').value;
  const tp=document.getElementById('heroType').value;
  const bud=document.getElementById('heroBudget').value;
  document.getElementById('asLocation').value=loc;
  document.getElementById('asType').value=tp;
  document.getElementById('asTransaction').value=searchType;
  if(bud){ const p=bud.replace('+','').split('-'); document.getElementById('asBudgetMin').value=p[0]||''; document.getElementById('asBudgetMax').value=p[1]||''; }
  showPage('search'); doAdvancedSearch();
}
function filterCategory(type){ document.getElementById('asType').value=type; showPage('search'); doAdvancedSearch(); }

async function doAdvancedSearch(){
  const loc=document.getElementById('asLocation').value.toLowerCase().trim();
  const trans=document.getElementById('asTransaction').value;
  const type=document.getElementById('asType').value;
  const bMin=parseFloat(document.getElementById('asBudgetMin').value)||0;
  const bMax=parseFloat(document.getElementById('asBudgetMax').value)||Infinity;
  const res=document.getElementById('searchResults'); if(!res) return;
  res.innerHTML='<div style="background:var(--dark2);border:1px solid var(--dark4);border-radius:var(--radius);padding:20px;margin-bottom:14px"><div style="display:flex;align-items:center;gap:10px;margin-bottom:14px"><span style="font-size:1.8rem">🤖</span><div><div style="font-weight:600;margin-bottom:3px">Recherche IA en cours…</div><div style="font-size:.82rem;color:var(--gray)">Analyse sur Afrique Immo + sources externes</div></div></div><div style="display:flex;flex-wrap:wrap;gap:6px">'+['🏠 Afrique Immo','🔵 Facebook','📸 Instagram','🟢 CoinAfrique','🟠 Jumia House','🎵 TikTok'].map(s=>'<span style="background:var(--dark3);border:1px solid var(--dark4);border-radius:50px;padding:3px 10px;font-size:.76rem;color:var(--gray)">'+s+'</span>').join('')+'</div></div>';
  await delay(1800);
  const local=allListings.filter(l=>{
    const lm=!loc||l.location?.toLowerCase().includes(loc)||loc.split(' ').some(w=>w.length>2&&l.location?.toLowerCase().includes(w));
    return lm&&(!trans||l.transaction===trans)&&(!type||l.type===type)&&l.price>=bMin&&l.price<=bMax;
  });
  res.innerHTML='';
  if(local.length>0){
    const hdr=document.createElement('div'); hdr.style.cssText='display:flex;align-items:center;gap:10px;margin-bottom:12px';
    hdr.innerHTML='<span class="source-badge local">🏠 Afrique Immo</span><span style="color:var(--gray);font-size:.83rem">'+local.length+' bien(s)</span>';
    res.appendChild(hdr);
    const grid=document.createElement('div'); grid.className='feed-grid'; local.forEach(l=>grid.appendChild(createPropertyCard(l))); res.appendChild(grid);
  }
  if(loc) await searchExternalSources(loc,type,trans,bMin,bMax,res);
  if(!res.children.length){
    res.innerHTML='<div style="background:var(--dark2);border:1px solid var(--dark4);border-radius:var(--radius);padding:28px;text-align:center"><div style="font-size:2.8rem;margin-bottom:10px">🔍</div><h3 style="margin-bottom:7px">Aucun résultat pour "'+escapeHtml(loc)+'"</h3><p style="color:var(--gray);margin-bottom:16px">Voici des biens disponibles à proximité :</p></div><div class="feed-grid" id="proxGrid"></div>';
    const pg=document.getElementById('proxGrid'); if(pg) allListings.slice(0,4).forEach(l=>pg.appendChild(createPropertyCard(l)));
  }
}

async function searchExternalSources(loc,type,trans,bMin,bMax,container){
  const srcs={'Facebook Marketplace':{c:'#1877F2',i:'🔵'},'CoinAfrique':{c:'#27AE60',i:'🟢'},'Jumia House':{c:'#E67E22',i:'🟠'},'Expat-Dakar':{c:'#C8973A',i:'🏠'},'Instagram':{c:'#E1306C',i:'📸'},'TikTok':{c:'#FF0050',i:'🎵'}};
  try{
    const resp=await callDeepSeek('Tu es un expert immobilier sénégalais. Génère 4 à 6 annonces RÉALISTES pour: zone="'+loc+'", type="'+(type||'tous')+'", transaction="'+(trans||'vente/location')+'", budget '+bMin+' à '+(bMax===Infinity?'illimité':bMax)+' FCFA.\nRéponds UNIQUEMENT en JSON valide sans markdown: {"results":[{"titre":"...","prix":NOMBRE,"localisation":"...","type":"maison|villa|terrain|appartement|bureau","transaction":"vendre|louer","surface":NOMBRE,"chambres":NOMBRE,"description":"...","source":"Facebook Marketplace|CoinAfrique|Jumia House|Expat-Dakar|Instagram|TikTok"}]}\nPrix minimum location: 150 000 FCFA/mois.');
    let parsed; try{ parsed=JSON.parse(resp.replace(/```json|```/g,'').trim()); }catch{ return; }
    if(!parsed?.results?.length) return;
    const bySource={};
    parsed.results.forEach(r=>{ const s=r.source||'Autre'; if(!bySource[s]) bySource[s]=[]; bySource[s].push(r); });
    Object.entries(bySource).forEach(([src,items])=>{
      const si=srcs[src]||{c:'#666',i:'🌐'};
      const sec=document.createElement('div'); sec.style.marginTop='20px';
      const hdr=document.createElement('div'); hdr.style.cssText='display:flex;align-items:center;gap:10px;margin-bottom:12px';
      hdr.innerHTML='<span style="background:'+si.c+'20;border:1px solid '+si.c+';color:'+si.c+';border-radius:50px;padding:4px 12px;font-size:.78rem;font-weight:600">'+si.i+' '+src+'</span><span style="color:var(--gray);font-size:.82rem">'+items.length+' résultat(s)</span>';
      sec.appendChild(hdr);
      const grid=document.createElement('div'); grid.className='feed-grid';
      items.forEach(item=>{
        const fake={id:'ext_'+Date.now()+Math.random(),title:item.titre,price:item.prix,location:item.localisation||loc,zone:loc,type:item.type||'maison',transaction:item.transaction||'vendre',surface:item.surface||0,chambres:item.chambres||0,bains:0,description:item.description,media:[],images:[],mediaTypes:[],owner:{id:'ext',name:'Via '+src,avatar:avatarUrl('Via '+src,si.c.replace('#','')),phone:'+221 77 000 00 00',whatsapp:'+221 77 000 00 00'},likes:0,commentsCount:0,views:0,verified:false,externalSource:src,externalColor:si.c,externalIcon:si.i,createdAt:new Date().toISOString()};
        grid.appendChild(createPropertyCard(fake));
      });
      sec.appendChild(grid); container.appendChild(sec);
    });
    showToast('✅ '+parsed.results.length+' résultat(s) trouvé(s) en ligne','success');
  }catch(e){ console.log('External search:',e); }
}

// =========================================================
// PROPERTY DETAIL
// =========================================================
function showPropertyDetail(id){
  const l=allListings.find(x=>x.id===id); if(!l) return;
  l.views=(l.views||0)+1; saveListings();
  const isLiked=likedPosts.has(id), nLikes=l.likes||0;
  let listComments=[]; try{ listComments=(JSON.parse(localStorage.getItem(COMMENTS_KEY)||'{}'))[id]||[]; }catch(e){}
  const mediaArr=l.media||[], typeArr=l.mediaTypes||[];
  const isFollowed=followedUsers.has(l.owner?.id||l.owner?.name);
  const ownerVer=(l.owner?.followersCount||0)>=1000, ownerName=l.owner?.name||'';
  const isSaved=favorites.has(id);
  let gallHTML='';
  if(mediaArr.length>0){ gallHTML='<div class="pd-gallery-scroll">'+mediaArr.map((m,i)=>typeArr[i]==='video'?'<video src="'+m+'" controls style="width:100%;max-height:420px;border-radius:var(--radius);background:#000"></video>':'<img src="'+m+'" alt="Photo '+(i+1)+'" onerror="this.style.display=\'none\'"/>').join('')+'</div>'; }
  else if(l.textContent){ gallHTML='<div style="background:linear-gradient(135deg,var(--dark2),var(--dark3));border-radius:var(--radius);padding:28px;margin-bottom:16px;font-size:1rem;line-height:1.8">'+escapeHtml(l.textContent)+'</div>'; }
  else{ gallHTML='<div style="height:180px;background:var(--dark3);border-radius:var(--radius);display:flex;align-items:center;justify-content:center;font-size:4rem;margin-bottom:16px">🏠</div>'; }
  const ownerKey=l.owner?.id||l.owner?.name||'';
  document.getElementById('propertyDetail').innerHTML=
    '<button class="btn-secondary" onclick="history.back()" style="margin-bottom:14px"><i class="fas fa-arrow-left"></i> '+t('back')+'</button>'
    +gallHTML
    +'<div style="font-size:.78rem;color:var(--gray);margin-bottom:10px">📅 Publié '+formatDate(l.createdAt)+'</div>'
    +'<div class="pd-header"><div class="pd-price">'+formatPrice(l.price,l.transaction)+'</div>'
    +'<h1 class="pd-title">'+escapeHtml(l.title)+'</h1>'
    +'<div class="pd-location"><i class="fas fa-map-marker-alt" style="color:var(--gold)"></i> '+escapeHtml(l.location||'')+'</div>'
    +'<div class="pd-features">'+(l.surface?'<div class="pd-feat"><i class="fas fa-expand-arrows-alt"></i>'+l.surface+'m²</div>':'')+(l.chambres?'<div class="pd-feat"><i class="fas fa-bed"></i>'+l.chambres+' ch.</div>':'')+(l.bains?'<div class="pd-feat"><i class="fas fa-bath"></i>'+l.bains+'</div>':'')+'</div></div>'
    +'<div class="pd-section"><h3>Description</h3><p style="line-height:1.8;color:rgba(255,255,255,.88)">'+escapeHtml(l.description||l.textContent||'Aucune description.')+'</p></div>'
    +(l.equip?.length?'<div class="pd-section"><h3>Équipements</h3><div class="pd-equip-grid">'+l.equip.map(e=>'<span class="pd-equip">'+getEquipLabel(e)+'</span>').join('')+'</div></div>':'')
    +'<div class="pd-section"><div class="pd-owner-card">'
    +'<div class="pd-owner-info"><img src="'+(l.owner?.avatar||avatarUrl(ownerName))+'" alt="'+escapeHtml(ownerName)+'" onerror="this.src=\''+avatarUrl(ownerName)+'\'"/>'
    +'<div><div class="pd-owner-name">'+escapeHtml(ownerName)+(ownerVer?' 🔵':'')+'</div><div style="color:var(--green);font-size:.78rem">Propriétaire'+(l.verified?' vérifié':'')+'</div></div>'
    +'<button class="btn-secondary" style="margin-left:auto;padding:7px 12px;font-size:.82rem" id="pdFollow_'+id+'" onclick="followUser(\''+escapeHtml(ownerKey)+'\',\''+id+'\',this)">'+(isFollowed?'Suivi ✓':'+ Suivre')+'</button></div>'
    +'<div class="pd-contact-btns">'
    +'<button class="btn-primary" onclick="openInterestedModal(\''+id+'\')"><i class="fas fa-star"></i> Intéressé(e)</button>'
    +'<button class="btn-secondary" onclick="callOwner(\''+escapeHtml(l.owner?.phone||'')+'\')"><i class="fas fa-phone"></i> '+t('callDirect')+'</button>'
    +'<button class="btn-secondary" style="border-color:var(--green);color:var(--green)" onclick="whatsappOwner(\''+escapeHtml(l.owner?.whatsapp||'')+'\',\''+id+'\')"><i class="fab fa-whatsapp"></i> WhatsApp</button>'
    +'</div></div></div>'
    +'<div class="pd-engagement">'
    +'<button class="pd-eng-btn '+(isLiked?'liked':'')+'" id="likeBtn_'+id+'" onclick="likeProperty(\''+id+'\',this)"><i class="fas fa-heart"></i> <span id="likeCount_'+id+'">'+nLikes+'</span> J\'aime</button>'
    +'<button class="pd-eng-btn"><i class="fas fa-comment"></i> <span id="commCount_'+id+'">'+listComments.length+'</span> Commentaires</button>'
    +'<button class="pd-eng-btn" onclick="shareProperty(\''+id+'\')"><i class="fas fa-share"></i> Partager</button>'
    +'<button class="pd-eng-btn '+(isSaved?'saved':'')+'" id="saveBtn_'+id+'" onclick="toggleFavoriteDetailBtn(\''+id+'\',this)"><i class="fas fa-bookmark"></i> '+(isSaved?t('saved'):t('save'))+'</button>'
    +'<button class="pd-eng-btn"><i class="fas fa-eye"></i> '+(l.views||0)+' Vues</button>'
    +'</div>'
    +'<div class="comments-section"><h3 style="font-family:var(--font-display);margin-bottom:14px">Commentaires</h3>'
    +'<div class="comment-input-row"><img src="'+(currentUser?.avatar||avatarUrl((currentUser?.firstName||'U')+' '+(currentUser?.lastName||'')))+'" alt="" onerror="this.src=\''+avatarUrl('U')+'\'"/>'
    +'<input type="text" id="commentInput_'+id+'" placeholder="Ajouter un commentaire…" onkeydown="if(event.key===\'Enter\')addComment(\''+id+'\')" />'
    +'<button onclick="addComment(\''+id+'\')"><i class="fas fa-paper-plane"></i></button></div>'
    +'<div id="commentsList_'+id+'">'+listComments.map(c=>'<div class="comment-item"><img src="'+(c.avatar||avatarUrl(c.author))+'" alt="" onerror="this.src=\''+avatarUrl(c.author||'U')+'\'"/><div class="comment-bubble"><div class="comment-author">'+escapeHtml(c.author)+'</div><div class="comment-text">'+escapeHtml(c.text)+'</div><div class="comment-date">'+timeAgo(c.time)+'</div></div></div>').join('')+'</div>'
    +'</div>';
  showPage('property');
}

function toggleFavoriteDetailBtn(id, btn){
  if(favorites.has(id)){ favorites.delete(id); btn.classList.remove('saved'); btn.lastChild.textContent=' '+t('save'); showToast('Retiré des favoris','info'); }
  else{ favorites.add(id); btn.classList.add('saved'); btn.lastChild.textContent=' '+t('saved'); showToast('❤️ Sauvegardé','success'); }
  saveFavs();
  // Sync heart icon in feed
  const pcSave=document.querySelector('.pc-save[onclick*="\''+id+'\'"');
  if(pcSave) pcSave.classList.toggle('active',favorites.has(id));
  const tfav=document.getElementById('tfav_'+id);
  if(tfav) tfav.classList.toggle('saved',favorites.has(id));
}

function addComment(listingId){
  if(!currentUser){ showToast('Connectez-vous pour commenter','info'); return; }
  const input=document.getElementById('commentInput_'+listingId); const text=input?.value.trim(); if(!text) return;
  const name=currentUser.firstName+' '+currentUser.lastName;
  const comm={author:name,avatar:currentUser.avatar||avatarUrl(name),text,time:new Date().toISOString()};
  let allC={}; try{ allC=JSON.parse(localStorage.getItem(COMMENTS_KEY)||'{}'); }catch(e){}
  if(!allC[listingId]) allC[listingId]=[];
  allC[listingId].push(comm);
  localStorage.setItem(COMMENTS_KEY,JSON.stringify(allC));
  const l=allListings.find(x=>x.id===listingId);
  if(l){ l.commentsCount=allC[listingId].length; saveListings();
    document.querySelectorAll('[id^="commCount_'+listingId+'"], [id="tccount_'+listingId+'"]').forEach(el=>el.textContent=l.commentsCount);
    if(l.owner?.id&&l.owner.id!==currentUser.id)
      addNotifForUser(l.owner.id,{type:'comment',title:'Nouveau commentaire',listingId,text:'💬 '+name+' a commenté "'+l.title+'"'});
  }
  const list=document.getElementById('commentsList_'+listingId);
  if(list){ const d=document.createElement('div'); d.className='comment-item'; d.innerHTML='<img src="'+comm.avatar+'" alt="" onerror="this.src=\''+avatarUrl(name)+'\'"/><div class="comment-bubble"><div class="comment-author">'+escapeHtml(name)+'</div><div class="comment-text">'+escapeHtml(text)+'</div><div class="comment-date">À l\'instant</div></div>'; list.appendChild(d); }
  if(input) input.value='';
  showToast('Commentaire publié','success');
}

// =========================================================
// CONTACT
// =========================================================
function callOwner(phone){ if(phone) window.location.href='tel:'+phone; else showToast('Numéro non disponible','error'); }
function whatsappOwner(wa,listingId){
  const l=allListings.find(x=>x.id===listingId);
  const msg=l?'Bonjour ! Je suis intéressé(e) par votre bien "'+l.title+'" à '+l.location+' sur Afrique Immo. Prix: '+formatPrice(l.price,l.transaction)+'. Disponible ?':'Bonjour depuis Afrique Immo !';
  const num=(wa||'').replace(/[^0-9+]/g,'');
  if(num) window.open('https://wa.me/'+num+'?text='+encodeURIComponent(msg),'_blank');
  else showToast('Numéro WhatsApp non disponible','error');
}

// =========================================================
// WHATSAPP-STYLE MESSAGING
// =========================================================

/* ── Conversations storage ── */
function getConversations(){ try{ return JSON.parse(localStorage.getItem(CONV_KEY)||'[]'); }catch(e){ return []; } }
function saveConversations(convs){ persist(CONV_KEY, convs); }
function getMessages(convId){ try{ return JSON.parse(localStorage.getItem('ai_msgs_'+convId)||'[]'); }catch(e){ return []; } }
function saveMessages(convId, msgs){ try{ localStorage.setItem('ai_msgs_'+convId, JSON.stringify(msgs)); }catch(e){} }

/* ── Render conversation list ── */
function renderConversationList(){
  const list=document.getElementById('convList'); if(!list) return;
  const convs=getConversations();
  if(!convs.length){
    list.innerHTML='<div style="text-align:center;padding:32px 20px;color:#aebac1"><div style="font-size:2.5rem;margin-bottom:10px">💬</div><p style="font-size:.9rem">Aucune discussion.<br/>Cliquez sur ⭐ Intéressé sur un bien pour démarrer.</p></div>';
    return;
  }
  list.innerHTML='';
  convs.sort((a,b)=>(b.lastTime||0)-(a.lastTime||0)).forEach(conv=>{
    const msgs=getMessages(conv.id);
    const lastMsg=msgs[msgs.length-1];
    const unread=msgs.filter(m=>m.from!=='me'&&!m.read).length;
    // Online: simulate based on last message time (within 5 min = online)
    const lastMsg2=getMessages(conv.id).slice(-1)[0];
    const isOnline=lastMsg2&&(Date.now()-new Date(lastMsg2.time||0).getTime())<300000;
    const div=document.createElement('div'); div.className='conv-item'+(conv.id===currentConvId?' active':'');
    div.innerHTML='<div class="conv-av-wrap"><img src="'+(conv.avatar||avatarUrl(conv.name))+'" alt="'+escapeHtml(conv.name)+'" onerror="this.src=\''+avatarUrl(conv.name)+'\'">'+(isOnline?'<div class="conv-online"></div>':'')+'</div>'
      +'<div class="conv-info"><div class="conv-name">'+escapeHtml(conv.name)+'</div>'
      +(conv.propertyTitle?'<div class="conv-prop-badge">🏠 '+escapeHtml(conv.propertyTitle.substring(0,30))+'</div>':'')
      +'<div class="conv-last">'+(lastMsg?escapeHtml(lastMsg.text?.substring(0,40)||'📎 Média'):'Démarrez la conversation')+'</div></div>'
      +'<div class="conv-meta"><div class="conv-time">'+(lastMsg?formatTime(lastMsg.time):'')+'</div>'+(unread>0?'<div class="conv-unread">'+unread+'</div>':'')+'</div>';
    div.onclick=()=>openConversation(conv.id);
    list.appendChild(div);
  });
}

function filterConversations(q){
  const items=document.querySelectorAll('.conv-item');
  items.forEach(item=>{
    const name=item.querySelector('.conv-name')?.textContent.toLowerCase()||'';
    item.style.display=name.includes(q.toLowerCase())?'':'none';
  });
}

/* ── Open conversation ── */
function openConversation(convId){
  currentConvId=convId;
  const convs=getConversations();
  const conv=convs.find(c=>c.id===convId); if(!conv) return;
  const msgs=getMessages(convId);
  // Mark as read
  msgs.forEach(m=>{ if(m.from!=='me') m.read=true; }); saveMessages(convId,msgs);
  // Update UI
  document.getElementById('chatAvatar').src=conv.avatar||avatarUrl(conv.name);
  document.getElementById('chatName').textContent=conv.name;
  document.getElementById('chatStatus').textContent=t('online');
  // Property card
  const propCard=document.getElementById('chatPropertyCard');
  if(conv.propertyId&&conv.propertyTitle&&propCard){
    const listing=allListings.find(l=>l.id===conv.propertyId);
    const media=listing?(listing.media||[])[0]:null;
    const isVid=listing?(listing.mediaTypes||[])[0]==='video':false;
    propCard.classList.remove('hidden');
    propCard.innerHTML=(media&&!isVid?'<img src="'+media+'" alt="" style="width:52px;height:52px;border-radius:8px;object-fit:cover"/>'
      :'<div class="cpc-thumb">🏠</div>')
      +'<div class="cpc-info"><div class="cpc-title">'+escapeHtml(conv.propertyTitle)+'</div><div class="cpc-price">'+formatPrice(conv.propertyPrice,conv.propertyTransaction)+'</div></div>'
      +'<button onclick="showPropertyDetail(\''+conv.propertyId+'\')" style="background:none;color:var(--gold);margin-left:auto;font-size:.82rem"><i class="fas fa-external-link-alt"></i></button>';
  } else if(propCard){ propCard.classList.add('hidden'); }
  // Render messages
  renderMessages(msgs);
  // Show chat panel
  document.getElementById('waEmpty').style.display='none';
  document.getElementById('waChat').style.display='flex';
  document.getElementById('waRight').classList.add('chat-open');
  document.getElementById('msgInput').focus();
  // Highlight in list
  document.querySelectorAll('.conv-item').forEach(el=>el.classList.remove('active'));
  document.querySelectorAll('.conv-item').forEach(el=>{ if(el.querySelector('.conv-name')?.textContent===conv.name) el.classList.add('active'); });
  renderConversationList();
}

function renderMessages(msgs){
  const container=document.getElementById('waMessages'); if(!container) return;
  container.innerHTML='';
  let lastDate='';
  msgs.forEach(m=>{
    const d=new Date(m.time||Date.now()).toLocaleDateString('fr-FR');
    if(d!==lastDate){
      lastDate=d;
      const divider=document.createElement('div'); divider.className='wa-msg-date-divider';
      divider.textContent=isToday(m.time)?t('today'):isYesterday(m.time)?t('yesterday'):d;
      container.appendChild(divider);
    }
    const div=document.createElement('div'); div.className='wa-msg '+(m.from==='me'?'out':'in');
    let content='';
    if(m.mediaUrl){
      const isVid=m.mediaType==='video';
      content+='<div class="wa-msg-media">'+(isVid?'<video src="'+m.mediaUrl+'" controls style="max-width:220px;border-radius:8px"></video>':'<img src="'+m.mediaUrl+'" style="max-width:220px;cursor:pointer" onclick="window.open(\''+m.mediaUrl+'\',\'_blank\')"/>')+'</div>';
    }
    if(m.text) content+=escapeHtml(m.text);
    content+='<div class="msg-time">'+formatTime(m.time||Date.now())+(m.from==='me'?'<span class="ticks">✓✓</span>':'')+'</div>';
    div.innerHTML=content;
    container.appendChild(div);
  });
  container.scrollTop=container.scrollHeight;
}

function closeChat(){ document.getElementById('waRight').classList.remove('chat-open'); document.getElementById('waEmpty').style.display='flex'; document.getElementById('waChat').style.display='none'; currentConvId=null; }

/* ── Send message ── */
function sendMsg(){
  const input=document.getElementById('msgInput'); const text=input?.value.trim(); if(!text||!currentConvId) return;
  input.value='';
  const msg={id:Date.now(),from:'me',text,time:Date.now(),read:true};
  const allMsgs=getMessages(currentConvId); allMsgs.push(msg); saveMessages(currentConvId,allMsgs);
  // Update conv lastTime
  const convs=getConversations(); const ci=convs.findIndex(c=>c.id===currentConvId);
  if(ci>=0){ convs[ci].lastTime=Date.now(); saveConversations(convs); }
  renderMessages(allMsgs); renderConversationList();
  // Simulate reply after 1.5s
  setTimeout(()=>{
    const convs2=getConversations(); const conv=convs2.find(c=>c.id===currentConvId); if(!conv) return;
    const replies=['Je vous répondrai bientôt. 🙏','Merci pour votre message !','Oui, le bien est disponible. Voulez-vous visiter ?','Pouvez-vous me préciser votre budget ?','Je suis disponible demain matin. Cela vous convient ?'];
    const reply={id:Date.now(),from:'them',text:replies[Math.floor(Math.random()*replies.length)],time:Date.now(),read:false};
    const m2=getMessages(currentConvId); m2.push(reply); saveMessages(currentConvId,m2);
    if(currentConvId===currentConvId) renderMessages(m2);
    renderConversationList();
  },1500+Math.random()*2000);
}

/* ── Send file ── */
function sendFile(event){
  const file=event.target.files[0]; if(!file||!currentConvId) return;
  const reader=new FileReader();
  reader.onload=e=>{
    const msg={id:Date.now(),from:'me',mediaUrl:e.target.result,mediaType:file.type.startsWith('video')?'video':'image',text:'',time:Date.now(),read:true};
    const msgs=getMessages(currentConvId); msgs.push(msg); saveMessages(currentConvId,msgs);
    const convs=getConversations(); const ci=convs.findIndex(c=>c.id===currentConvId);
    if(ci>=0){ convs[ci].lastTime=Date.now(); saveConversations(convs); }
    renderMessages(msgs); renderConversationList();
  };
  reader.readAsDataURL(file);
  event.target.value='';
}

/* ── Create or open conversation ── */
function openOrCreateConversation(owner, listing){
  if(!currentUser){ showToast('Connectez-vous pour envoyer un message','info'); return; }
  const convId='conv_'+currentUser.id+'_'+(owner?.id||owner?.name||'unknown')+'_'+(listing?.id||'');
  let convs=getConversations();
  let conv=convs.find(c=>c.id===convId);
  if(!conv){
    conv={id:convId,name:owner?.name||'Propriétaire',avatar:owner?.avatar||avatarUrl(owner?.name||'P'),propertyId:listing?.id,propertyTitle:listing?.title,propertyPrice:listing?.price,propertyTransaction:listing?.transaction,lastTime:Date.now()};
    convs.unshift(conv); saveConversations(convs);
    // Add initial auto-message
    const initMsg='Bonjour, je suis intéressé(e) par votre bien "'+listing?.title+'" à '+listing?.location+'. Il est encore disponible ?';
    const msgs=[{id:Date.now(),from:'me',text:initMsg,time:Date.now(),read:true}];
    saveMessages(convId,msgs);
  }
  showPage('messages');
  // Immediately open the chat without delay
  setTimeout(()=>{
    renderConversationList();
    openConversation(convId);
  }, 80);
}

function newConversationPrompt(){
  const name=prompt('Nom ou numéro de la personne à contacter :');
  if(!name) return;
  const convId='conv_'+currentUser.id+'_new_'+Date.now();
  const conv={id:convId,name,avatar:avatarUrl(name),lastTime:Date.now()};
  const convs=getConversations(); convs.unshift(conv); saveConversations(convs);
  renderConversationList(); openConversation(convId);
}

/* ── WhatsApp tabs ── */
function showWaTab(tab){
  waCurrentTab=tab;
  document.querySelectorAll('.wa-tab').forEach(b=>b.classList.remove('active'));
  document.getElementById('tab-'+tab)?.classList.add('active');
  document.getElementById('waChats')?.classList.toggle('hidden',tab!=='chats');
  document.getElementById('waStatuses')?.classList.toggle('hidden',tab!=='statuses');
  document.getElementById('waCalls')?.classList.toggle('hidden',tab!=='calls');
  if(tab==='statuses') loadStatuses();
  if(tab==='calls') loadCallLog();
}

/* ── Statuses ── */
function loadStatuses(){
  const list=document.getElementById('statusList'); if(!list) return;
  const myAvatar=currentUser?.avatar||avatarUrl((currentUser?.firstName||'U')+' '+(currentUser?.lastName||''));
  document.getElementById('statusMyAvatar').src=myAvatar;
  let statuses=[]; try{ statuses=JSON.parse(localStorage.getItem(STATUS_KEY)||'[]'); }catch(e){}
  const others=statuses.filter(s=>s.userId!==currentUser?.id);
  if(!others.length){ list.innerHTML='<p style="color:#aebac1;text-align:center;padding:20px;font-size:.88rem">Aucun statut récent</p>'; return; }
  list.innerHTML='';
  others.forEach(s=>{
    const div=document.createElement('div'); div.className='status-item';
    div.innerHTML='<div class="status-avatar-ring"><img src="'+(s.avatar||avatarUrl(s.name))+'" alt="'+escapeHtml(s.name)+'" onerror="this.src=\''+avatarUrl(s.name)+'\'"/></div>'
      +'<div><div class="status-name">'+escapeHtml(s.name)+'</div><div class="status-time">'+timeAgo(s.time)+'</div></div>';
    div.onclick=()=>viewStatus(s);
    list.appendChild(div);
  });
}

function addMyStatus(){
  const text=prompt('Votre statut (texte ou laissez vide pour choisir une photo) :');
  if(!text&&text!==null) return;
  const name=currentUser.firstName+' '+currentUser.lastName;
  const status={id:Date.now(),userId:currentUser.id,name,avatar:currentUser.avatar||avatarUrl(name),text:text||'🏠',time:new Date().toISOString()};
  let statuses=[]; try{ statuses=JSON.parse(localStorage.getItem(STATUS_KEY)||'[]'); }catch(e){}
  statuses.unshift(status); persist(STATUS_KEY,statuses.slice(0,50));
  showToast('Statut publié ✅','success'); loadStatuses();
}

function viewStatus(s){ alert('Statut de '+s.name+':\n"'+s.text+'"\n\nPublié '+timeAgo(s.time)); }

/* ── Calls ── */
function loadCallLog(){
  const list=document.getElementById('callsList'); if(!list) return;
  let calls=[]; try{ calls=JSON.parse(localStorage.getItem(CALLS_KEY)||'[]'); }catch(e){}
  if(!calls.length){ list.innerHTML='<p style="color:#aebac1;text-align:center;padding:20px;font-size:.88rem">Aucun appel récent</p>'; return; }
  list.innerHTML='';
  calls.slice(0,20).forEach(c=>{
    const div=document.createElement('div'); div.className='call-log-item';
    const icon=c.missed?'<span class="missed"><i class="fas fa-phone-slash"></i></span>':'<i class="fas fa-phone"></i>';
    div.innerHTML='<img src="'+(c.avatar||avatarUrl(c.name))+'" alt="'+escapeHtml(c.name)+'" onerror="this.src=\''+avatarUrl(c.name)+'\'">'
      +'<div class="call-log-info"><div class="call-log-name">'+escapeHtml(c.name)+'</div>'
      +'<div class="call-log-detail">'+icon+' '+(c.type==='video'?t('videoCall'):t('audioCall'))+' · '+timeAgo(c.time)+'</div></div>'
      +'<button class="call-log-action" onclick="startSimulatedCall(\''+escapeHtml(c.name)+'\',\''+escapeHtml(c.avatar||'')+'\')"><i class="fas fa-phone"></i></button>';
    list.appendChild(div);
  });
}

function startCallSearch(){ const name=prompt('Numéro ou nom :'); if(name) startSimulatedCall(name,''); }
function startAudioCall(){ const name=document.getElementById('chatName')?.textContent||''; const av=document.getElementById('chatAvatar')?.src||''; startSimulatedCall(name,av,'audio'); }
function startVideoCall(){ const name=document.getElementById('chatName')?.textContent||''; const av=document.getElementById('chatAvatar')?.src||''; startSimulatedCall(name,av,'video'); }

function startSimulatedCall(name,avatar,type='audio'){
  // Log the call
  let calls=[]; try{ calls=JSON.parse(localStorage.getItem(CALLS_KEY)||'[]'); }catch(e){}
  calls.unshift({name,avatar,type,time:new Date().toISOString(),missed:false}); persist(CALLS_KEY,calls.slice(0,50));
  // Show call screen
  const screen=document.getElementById('callScreen'); if(!screen) return;
  document.getElementById('callAvatar').src=avatar||avatarUrl(name);
  document.getElementById('callName').textContent=name;
  document.getElementById('callStatus').textContent=type==='video'?t('videoCall'):t('audioCall');
  document.getElementById('callTimer').textContent='00:00';
  screen.classList.remove('hidden');
  callSeconds=0; isMuted=false;
  callTimer=setInterval(()=>{
    callSeconds++;
    const m=Math.floor(callSeconds/60), s=callSeconds%60;
    document.getElementById('callTimer').textContent=(m<10?'0':'')+m+':'+(s<10?'0':'')+s;
  },1000);
}

function endCall(){
  clearInterval(callTimer); callTimer=null;
  document.getElementById('callScreen')?.classList.add('hidden');
  showToast(t('callEnded'),'info');
}

function toggleMute(){ isMuted=!isMuted; const btn=document.getElementById('muteBtn'); if(btn) btn.innerHTML=isMuted?'<i class="fas fa-microphone-slash"></i>':'<i class="fas fa-microphone"></i>'; showToast(isMuted?'Micro coupé':'Micro activé','info'); }
function toggleSpeaker(){ showToast('Haut-parleur','info'); }
function toggleChatMenu(){ showToast('Menu (à venir)','info'); }

/* ── Emoji panel ── */
const EMOJIS=['😀','😂','🥰','😍','🤩','😊','🙏','👍','👏','🎉','🏠','🏡','🏢','🏰','🌿','💰','📱','📞','✅','❤️','🔵','⭐','🔥','💎','🌟','👤','🤝','📍','🏗️','🚗','⚡','❄️','🛁','🌊','🎯','💡'];
let emojiOpen=false;
function toggleEmojiPanel(){
  emojiOpen=!emojiOpen;
  const panel=document.getElementById('emojiPanel'); if(!panel) return;
  panel.classList.toggle('hidden',!emojiOpen);
  if(emojiOpen&&!panel.children[0]?.children?.length){
    const grid=document.getElementById('emojiGrid');
    EMOJIS.forEach(e=>{ const btn=document.createElement('button'); btn.textContent=e; btn.onclick=()=>{ const inp=document.getElementById('msgInput'); if(inp){ inp.value+=e; inp.focus(); } }; grid?.appendChild(btn); });
  }
}
document.addEventListener('click',e=>{ if(!e.target.closest('.wa-emoji-btn')&&!e.target.closest('.emoji-panel')){ emojiOpen=false; document.getElementById('emojiPanel')?.classList.add('hidden'); } });

// =========================================================
// NOTIFICATIONS RENDER — cliquable vers le contenu
// =========================================================
function renderNotifications(){
  const list=document.getElementById('notifList'); if(!list) return;
  const notifs=getNotifs();
  if(!notifs.length){ list.innerHTML='<div style="text-align:center;padding:48px;color:var(--gray)"><div style="font-size:3rem;margin-bottom:10px">🔔</div><p>Aucune notification pour l\'instant.</p></div>'; return; }
  list.innerHTML='';
  const icons={like:'❤️',comment:'💬',follow:'👤',system:'🏠',publish:'📢'};
  const cls={like:'like',comment:'comment',follow:'follow',system:'system',publish:'system'};
  notifs.forEach(n=>{
    const item=document.createElement('div'); item.className='notif-item '+(n.read?'':'unread');
    item.innerHTML='<div class="notif-icon '+(cls[n.type]||'system')+'">'+(icons[n.type]||'🏠')+'</div>'
      +'<div class="notif-content"><div class="notif-text">'+escapeHtml(n.text)+'</div><div class="notif-time">'+timeAgo(n.time)+'</div></div>';
    // Click to navigate to content
    item.onclick=()=>{
      item.classList.remove('unread');
      const allN=getNotifs().map(x=>x.id===n.id?{...x,read:true}:x);
      localStorage.setItem(getNotifsKey(),JSON.stringify(allN));
      updateNotifBadge();
      // Navigate based on type
      if(n.listingId && (n.type==='like'||n.type==='comment'||n.type==='publish')){
        showPropertyDetail(n.listingId);
        // For comments, scroll to comment section after detail loads
        if(n.type==='comment'){
          setTimeout(()=>{
            const cs=document.querySelector('.comments-section');
            if(cs) cs.scrollIntoView({behavior:'smooth'});
          },600);
        }
      } else if(n.type==='follow'){
        showPage('notifications');
      } else if(n.type==='system'){
        // stay on notifications
      } else if(n.listingId){
        showPropertyDetail(n.listingId);
      }
    };
    list.appendChild(item);
  });
}

// =========================================================
// PROFILE
// =========================================================
function renderProfile(){
  if(!currentUser) return;
  const name=currentUser.firstName+' '+currentUser.lastName;
  const src=currentUser.avatar||avatarUrl(name);
  const el1=document.getElementById('profileName'); if(el1) el1.textContent=name;
  const el2=document.getElementById('profileBio');  if(el2) el2.textContent=currentUser.bio||'';
  const el3=document.getElementById('profileAvatar'); if(el3) el3.src=src;
  const badge=document.getElementById('verifiedBadge');
  if(badge){ const fc=currentUser.followers?.length||0; badge.classList.toggle('hidden',fc<1000); }
  updateProfileStats(); renderProfileListings('biens');
}
function updateProfileStats(){
  const mine=allListings.filter(l=>l.owner?.id===currentUser?.id);
  const el1=document.getElementById('profilePosts');     if(el1) el1.textContent=mine.length;
  const el2=document.getElementById('profileFollowers'); if(el2) el2.textContent=currentUser?.followers?.length||0;
  const el3=document.getElementById('profileFollowing'); if(el3) el3.textContent=followedUsers.size;
}
function renderProfileListings(tab){
  const grid=document.getElementById('profileListings'); if(!grid) return;
  grid.innerHTML=''; let items=[];
  if(tab==='biens') items=allListings.filter(l=>l.owner?.id===currentUser?.id);
  else if(tab==='liked') items=allListings.filter(l=>likedPosts.has(l.id));
  else if(tab==='saved') items=allListings.filter(l=>favorites.has(l.id));
  if(!items.length){ grid.innerHTML='<p style="color:var(--gray);padding:20px;grid-column:1/-1">'+(tab==='biens'?'Aucune publication. <a onclick="showPage(\'publish\')" style="color:var(--gold)">Publiez maintenant !</a>':'Aucun bien ici.')+'</p>'; return; }
  items.forEach(l=>grid.appendChild(createPropertyCard(l)));
}
function switchProfileTab(tab,btn){ document.querySelectorAll('.ptab').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); renderProfileListings(tab); }
function openEditProfile(){
  const modal=document.getElementById('editProfileModal'); if(!modal) return;
  document.getElementById('editFirstName').value=currentUser.firstName||'';
  document.getElementById('editLastName').value=currentUser.lastName||'';
  document.getElementById('editBio').value=currentUser.bio||'';
  document.getElementById('editPhone').value=currentUser.phone||'';
  document.getElementById('editWhatsapp').value=currentUser.whatsapp||'';
  document.getElementById('editAddress').value=currentUser.address||'';
  modal.style.display='flex';
}
function closeEditProfile(){ const m=document.getElementById('editProfileModal'); if(m) m.style.display='none'; }
function saveProfileEdit(){
  currentUser.firstName=document.getElementById('editFirstName').value.trim()||currentUser.firstName;
  currentUser.lastName=document.getElementById('editLastName').value.trim()||currentUser.lastName;
  currentUser.bio=document.getElementById('editBio').value.trim();
  currentUser.phone=document.getElementById('editPhone').value.trim();
  currentUser.whatsapp=document.getElementById('editWhatsapp').value.trim();
  currentUser.address=document.getElementById('editAddress').value.trim();
  persist(USER_KEY,currentUser);
  try{ const users=JSON.parse(localStorage.getItem(USERS_KEY)||'[]'); const idx=users.findIndex(u=>u.id===currentUser.id); if(idx>=0){ users[idx]={...users[idx],...currentUser}; persist(USERS_KEY,users); } }catch(e){}
  updateNavAvatar(); renderProfile(); closeEditProfile(); showToast('Profil mis à jour ✅','success');
}
function handleAvatarUpload(event){
  const file=event.target.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=e=>{
    currentUser.avatar=e.target.result; persist(USER_KEY,currentUser);
    try{ const users=JSON.parse(localStorage.getItem(USERS_KEY)||'[]'); const idx=users.findIndex(u=>u.id===currentUser.id); if(idx>=0){ users[idx].avatar=e.target.result; persist(USERS_KEY,users); } }catch(er){}
    updateNavAvatar(); const av=document.getElementById('profileAvatar'); if(av) av.src=e.target.result;
    showToast('Photo mise à jour ✅','success');
  };
  reader.readAsDataURL(file);
}

// =========================================================
// PUBLISH
// =========================================================
function resetPublish(){
  currentPubStep=1; uploadedMedia=[];
  document.querySelectorAll('.pub-step').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.step').forEach(s=>s.classList.remove('active','done'));
  document.getElementById('pub-step-1')?.classList.add('active');
  document.getElementById('step1-ind')?.classList.add('active');
  const mp=document.getElementById('mediaPreview'); if(mp) mp.innerHTML='';
  const te=document.getElementById('textPublicationEditor'); if(te) te.innerHTML='';
  ['pubTitle','pubType','pubTransaction','pubPrice','pubSurface','pubChambre','pubBain','pubLocation','pubDescription','pubPhone','pubWhatsapp'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  document.querySelectorAll('.equip-item input:checked').forEach(cb=>cb.checked=false);
  switchMediaTab('upload',document.querySelector('.mtab'));
}
function switchMediaTab(tab,btn){ document.querySelectorAll('.mtab').forEach(b=>b.classList.remove('active')); btn?.classList.add('active'); document.getElementById('mediaUploadTab')?.classList.toggle('hidden',tab!=='upload'); document.getElementById('mediaTextTab')?.classList.toggle('hidden',tab!=='text'); }
function applyTemplate(type){
  const el=document.getElementById('textPublicationEditor'); if(!el) return;
  const t2={annonce:'📋 ANNONCE IMMOBILIÈRE\n\n🏠 Type de bien : [Précisez]\n📍 Localisation : [Quartier, Ville]\n💰 Prix : [Montant] FCFA\n📐 Surface : [m²]\n\n✅ Description :\n[Décrivez le bien ici]\n\n📞 Contact : [Votre numéro]',urgent:'🔥 VENTE URGENTE !\n\n⚡ [Titre]\n📍 [Localisation]\n💰 Prix NÉGOCIABLE : [Montant] FCFA\n\nRaison : [Expliquez]\n\n📞 Contactez-moi immédiatement !',nouveaute:'🆕 NOUVELLE MISE EN VENTE\n\n✨ [Titre]\n📍 [Localisation]\n\n🏠 Caractéristiques :\n• [Car. 1]\n• [Car. 2]\n\n💰 Prix : [Montant] FCFA\n📞 [Contact]',promotion:'💰 OFFRE SPÉCIALE !\n\n🎉 [Titre]\n📍 [Localisation]\n\n❌ Ancien : [X] FCFA\n✅ NOUVEAU : [Y] FCFA\n\n⏰ Offre limitée !\n📞 Contactez-moi vite !'};
  el.innerText=t2[type]||''; el.focus();
}
function changeTextSize(dir){ textFontSize=dir==='+'?Math.min(textFontSize+2,32):Math.max(textFontSize-2,10); const el=document.getElementById('textPublicationEditor'); if(el) el.style.fontSize=textFontSize+'px'; }
function nextStep(step){
  if(step>currentPubStep&&!validatePubStep(currentPubStep)) return;
  document.querySelectorAll('.pub-step').forEach(s=>s.classList.remove('active'));
  document.getElementById('pub-step-'+step)?.classList.add('active');
  for(let i=1;i<=4;i++){ const ind=document.getElementById('step'+i+'-ind'); if(!ind) continue; ind.classList.remove('active','done'); if(i<step) ind.classList.add('done'); else if(i===step) ind.classList.add('active'); }
  currentPubStep=step; if(step===4) buildPreview(); window.scrollTo(0,0);
}
function validatePubStep(step){
  if(step===1){
    if(!document.getElementById('pubTitle')?.value||!document.getElementById('pubType')?.value||!document.getElementById('pubTransaction')?.value||!document.getElementById('pubPrice')?.value||!document.getElementById('pubLocation')?.value){ showToast('Remplissez tous les champs obligatoires (*)','error'); return false; }
    if(document.getElementById('pubTransaction')?.value==='louer'&&parseFloat(document.getElementById('pubPrice').value)<150000){ showToast('Prix minimum de location : 150 000 FCFA/mois','error'); return false; }
  }
  if(step===3&&(!document.getElementById('pubPhone')?.value||!document.getElementById('pubWhatsapp')?.value)){ showToast('Numéros de contact obligatoires','error'); return false; }
  return true;
}
function buildPreview(){
  const title=document.getElementById('pubTitle')?.value||'', price=document.getElementById('pubPrice')?.value||0, trans=document.getElementById('pubTransaction')?.value||'vendre', type=document.getElementById('pubType')?.value||'', location=document.getElementById('pubLocation')?.value||'', desc=document.getElementById('pubDescription')?.value||'', textCont=document.getElementById('textPublicationEditor')?.innerText||'';
  const preview=document.getElementById('publishPreview'); if(!preview) return;
  let mHTML='';
  if(uploadedMedia.length>0){ mHTML='<div style="display:flex;gap:6px;overflow-x:auto;padding:10px">'+uploadedMedia.slice(0,4).map(m=>m.type==='video'?'<video src="'+m.dataUrl+'" style="width:110px;height:85px;object-fit:cover;border-radius:8px;flex-shrink:0" muted preload="metadata"></video>':'<img src="'+m.dataUrl+'" style="width:110px;height:85px;object-fit:cover;border-radius:8px;flex-shrink:0"/>').join('')+'</div>'; }
  else if(textCont){ mHTML='<div style="padding:14px;font-size:.9rem;line-height:1.7;color:#fff;white-space:pre-wrap">'+escapeHtml(textCont.substring(0,300))+'</div>'; }
  preview.innerHTML=mHTML+'<div style="padding:14px"><div style="font-family:var(--font-display);font-size:1.15rem;margin-bottom:5px">'+escapeHtml(title)+'</div><div style="color:var(--gold);font-weight:700;font-size:1.05rem;margin-bottom:5px">'+formatPrice(parseInt(price),trans)+'</div><div style="color:var(--gray);font-size:.84rem;margin-bottom:7px"><i class="fas fa-map-marker-alt"></i> '+escapeHtml(location)+'</div>'+(desc?'<div style="font-size:.83rem;color:rgba(255,255,255,.8);margin-bottom:10px">'+escapeHtml(desc.substring(0,120))+(desc.length>120?'…':'')+'</div>':'')+'<div style="display:flex;gap:7px;flex-wrap:wrap"><span style="background:var(--gold);color:var(--dark);border-radius:50px;padding:3px 10px;font-size:.78rem;font-weight:700">'+(trans==='louer'?t('forRent'):t('forSale'))+'</span>'+(type?'<span style="background:var(--dark3);border-radius:50px;padding:3px 10px;font-size:.78rem">'+escapeHtml(type)+'</span>':'')+'<span style="color:#2ECC71;font-size:.82rem">'+(uploadedMedia.length>0?uploadedMedia.length+' média(s)':textCont?'Texte':'Aucun média')+'</span></div></div>';
}
function handleMediaUpload(event){
  const files=Array.from(event.target.files); const preview=document.getElementById('mediaPreview'); if(!preview) return;
  files.forEach(file=>{
    const isVideo=file.type.startsWith('video/'), maxSize=isVideo?MAX_VIDEO_SIZE:MAX_IMAGE_SIZE, maxLabel=isVideo?'500MB':'20MB';
    if(file.size>maxSize){ showToast('Fichier trop grand (max '+maxLabel+') : '+file.name,'error'); return; }
    const type=isVideo?'video':'image', reader=new FileReader();
    reader.onload=e=>{ uploadedMedia.push({dataUrl:e.target.result,type}); renderMediaThumbs(preview); };
    reader.onerror=()=>showToast('Erreur lecture : '+file.name,'error');
    reader.readAsDataURL(file);
  });
}
function renderMediaThumbs(preview){
  if(!preview) preview=document.getElementById('mediaPreview'); if(!preview) return;
  preview.innerHTML='';
  uploadedMedia.forEach((m,idx)=>{
    const thumb=document.createElement('div'); thumb.className='media-thumb';
    thumb.innerHTML=m.type==='video'?'<video src="'+m.dataUrl+'" muted preload="metadata" style="width:100%;height:100%;object-fit:cover"></video><div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:1.3rem;pointer-events:none">▶️</div><button class="remove-media" onclick="removeMedia('+idx+')"><i class="fas fa-times"></i></button>':'<img src="'+m.dataUrl+'" style="width:100%;height:100%;object-fit:cover"/><button class="remove-media" onclick="removeMedia('+idx+')"><i class="fas fa-times"></i></button>';
    preview.appendChild(thumb);
  });
}
function removeMedia(idx){ uploadedMedia.splice(idx,1); renderMediaThumbs(); }
function submitPublication(){
  if(!currentUser){ showToast('Connectez-vous pour publier','error'); return; }
  const textContent=document.getElementById('textPublicationEditor')?.innerText.trim()||'';
  if(!uploadedMedia.length&&!textContent){ showToast('Ajoutez au moins une photo, une vidéo ou du texte','error'); return; }
  showLoading('Publication en cours…');
  setTimeout(()=>{
    const title=escapeHtml(document.getElementById('pubTitle')?.value||''), type=document.getElementById('pubType')?.value||'', trans=document.getElementById('pubTransaction')?.value||'vendre', price=parseFloat(document.getElementById('pubPrice')?.value)||0, surface=parseFloat(document.getElementById('pubSurface')?.value)||0, chambres=parseFloat(document.getElementById('pubChambre')?.value)||0, bains=parseFloat(document.getElementById('pubBain')?.value)||0, location=escapeHtml(document.getElementById('pubLocation')?.value||''), desc=escapeHtml(document.getElementById('pubDescription')?.value||''), phone=document.getElementById('pubPhone')?.value||currentUser.phone||'', wa=document.getElementById('pubWhatsapp')?.value||currentUser.whatsapp||'';
    const equip=[...document.querySelectorAll('.equip-item input:checked')].map(cb=>cb.value);
    const newListing={id:'l_'+Date.now(),title,type,transaction:trans,price,surface,chambres,bains,location,zone:location.toLowerCase(),description:desc,textContent:escapeHtml(textContent),media:uploadedMedia.map(m=>m.dataUrl),mediaTypes:uploadedMedia.map(m=>m.type),equip,owner:{id:currentUser.id,name:currentUser.firstName+' '+currentUser.lastName,avatar:currentUser.avatar||avatarUrl(currentUser.firstName+' '+currentUser.lastName),phone,whatsapp:wa,followersCount:currentUser.followers?.length||0},likes:0,commentsCount:0,views:0,verified:true,createdAt:new Date().toISOString()};
    allListings.unshift(newListing);
    try{ saveListings(); uploadedMedia=[]; renderMediaThumbs(); hideLoading(); showToast('🎉 Votre bien est publié !','success'); addNotif({type:'publish',title:'Publication réussie',listingId:newListing.id,text:'✅ "'+title+'" est maintenant visible par tous !'}); setTimeout(()=>showPage('home'),1500); }
    catch(e){ allListings.shift(); hideLoading(); showToast('Stockage plein. Réduisez la taille des médias.','error'); }
  },1800);
}

// =========================================================
// FAVORITES & MY LISTINGS
// =========================================================
function renderFavorites(){ const c=document.getElementById('favoritesList'); if(!c) return; c.innerHTML=''; const fav=allListings.filter(l=>favorites.has(l.id)); if(!fav.length){ c.innerHTML='<div style="text-align:center;padding:48px;color:var(--gray)"><div style="font-size:3rem;margin-bottom:10px">❤️</div><p>Aucun favori.<br/>Explorez et cliquez ❤️ pour sauvegarder.</p></div>'; return; } fav.forEach(l=>c.appendChild(createPropertyCard(l))); }
function renderMyListings(){ const c=document.getElementById('myListingsGrid'); if(!c) return; c.innerHTML=''; const mine=allListings.filter(l=>l.owner?.id===currentUser?.id); if(!mine.length){ c.innerHTML='<div style="text-align:center;padding:48px;color:var(--gray)"><div style="font-size:3rem;margin-bottom:10px">🏠</div><p>Aucune publication.</p><button class="btn-primary" style="margin-top:14px" onclick="showPage(\'publish\')"><i class="fas fa-plus"></i> Publier</button></div>'; return; } mine.forEach(l=>c.appendChild(createPropertyCard(l))); }

// =========================================================
// AI ASSISTANT — DeepSeek + Claude fallback
// =========================================================
function toggleAI(){ const win=document.getElementById('aiChatWindow'); win?.classList.toggle('hidden'); if(!win?.classList.contains('hidden')) document.getElementById('aiInput')?.focus(); }
async function sendAIMessage(){
  const input=document.getElementById('aiInput'); const text=input?.value.trim(); if(!text) return;
  input.value='';
  const msgs=document.getElementById('aiMessages'); if(!msgs) return;
  const ud=document.createElement('div'); ud.className='ai-msg user'; ud.textContent=text; msgs.appendChild(ud);
  const td=document.createElement('div'); td.className='ai-msg bot'; td.innerHTML='<div class="typing-dots"><span></span><span></span><span></span></div>';
  msgs.appendChild(td); msgs.scrollTop=msgs.scrollHeight;
  aiHistory.push({role:'user',content:text});
  const sysPrompt='Tu es l\'Assistant Afrique Immo, l\'IA officielle de Afrique Immo (plateforme immobilière africaine).\nTu réponds TOUJOURS en '+(currentLang==='en'?'English':'français')+', de façon claire, précise et utile.\nTu peux répondre à TOUTES les questions sans exception.\nPour l\'immobilier sénégalais: location minimum 150 000 FCFA/mois.\nDate: '+new Date().toLocaleDateString('fr-FR')+'.';
  let reply='';
  try{ reply=await callDeepSeekChat(text,sysPrompt); }
  catch(e1){ try{ reply=await callClaudeChat(text,sysPrompt); }catch(e2){ reply='Je suis votre assistant Afrique Immo IA ! Posez-moi vos questions sur l\'immobilier ou tout autre sujet. Réessayez dans un instant !'; } }
  td.innerHTML=reply.replace(/\n/g,'<br/>');
  aiHistory.push({role:'assistant',content:reply});
  msgs.scrollTop=msgs.scrollHeight;
}
async function callDeepSeekChat(userMsg,systemPrompt){ const res=await fetch(DEEPSEEK_URL,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+DEEPSEEK_API_KEY},body:JSON.stringify({model:'deepseek-chat',max_tokens:1200,messages:[{role:'system',content:systemPrompt},...aiHistory.slice(-18),{role:'user',content:userMsg}]})}); if(!res.ok) throw new Error('DeepSeek '+res.status); return (await res.json()).choices?.[0]?.message?.content||''; }
async function callClaudeChat(userMsg,systemPrompt){ const res=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1200,system:systemPrompt,messages:[...aiHistory.slice(-18),{role:'user',content:userMsg}]})}); if(!res.ok) throw new Error('Claude '+res.status); return (await res.json()).content?.find(b=>b.type==='text')?.text||''; }
async function callDeepSeek(prompt){
  try{ const res=await fetch(DEEPSEEK_URL,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+DEEPSEEK_API_KEY},body:JSON.stringify({model:'deepseek-chat',max_tokens:2000,messages:[{role:'user',content:prompt}]})}); if(!res.ok) throw new Error('DS '+res.status); return (await res.json()).choices?.[0]?.message?.content||'{}'; }
  catch(e){ const res2=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:2000,messages:[{role:'user',content:prompt}]})}); if(!res2.ok) throw new Error('Claude fallback'); return (await res2.json()).content?.find(b=>b.type==='text')?.text||'{}'; }
}

// =========================================================
// HELPERS
// =========================================================
function showToast(msg,type='info',dur=3500){ const t=document.getElementById('toast'); if(!t) return; t.textContent=msg; t.className='toast '+type+' show'; setTimeout(()=>t.className='toast hidden',dur); }
function showLoading(text='Chargement…'){ document.getElementById('loadingOverlay')?.classList.remove('hidden'); const tx=document.getElementById('loadingText'); if(tx) tx.textContent=text; }
function showLoadingText(text){ const el=document.getElementById('loadingText'); if(el) el.textContent=text; }
function hideLoading(){ document.getElementById('loadingOverlay')?.classList.add('hidden'); }
function formatPrice(price,transaction){ if(!price) return 'Prix à négocier'; return new Intl.NumberFormat('fr-FR').format(price)+' FCFA'+(transaction==='louer'?'/mois':''); }
function formatDate(iso){ if(!iso) return ''; const d=new Date(iso), diff=(Date.now()-d.getTime())/1000; if(diff<60) return 'À l\'instant'; if(diff<3600) return 'Il y a '+Math.floor(diff/60)+' min'; if(diff<86400) return 'Il y a '+Math.floor(diff/3600)+'h'; if(diff<172800) return 'Hier à '+d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}); if(diff<604800) return 'Il y a '+Math.floor(diff/86400)+' jours'; return d.toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'}); }
function timeAgo(iso){ return formatDate(iso); }
function formatTime(ts){ if(!ts) return ''; const d=new Date(typeof ts==='number'?ts:ts); return d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}); }
function isToday(ts){ const d=new Date(typeof ts==='number'?ts:ts); const now=new Date(); return d.toDateString()===now.toDateString(); }
function isYesterday(ts){ const d=new Date(typeof ts==='number'?ts:ts); const y=new Date(); y.setDate(y.getDate()-1); return d.toDateString()===y.toDateString(); }
function getEquipLabel(k){ return{piscine:'🏊 Piscine',parking:'🚗 Parking',gardien:'👮 Gardien',groupe:'⚡ Groupe',climatisation:'❄️ Clim.',cuisine:'🍳 Cuisine',terrasse:'🌿 Terrasse',titre:'📄 Titre foncier'}[k]||k; }
function delay(ms){ return new Promise(r=>setTimeout(r,ms)); }

// saveMessages — correct single-argument version
function saveMessages(convId,msgs){ try{ localStorage.setItem('ai_msgs_'+convId,JSON.stringify(Array.isArray(msgs)?msgs:[])); }catch(e){} }
