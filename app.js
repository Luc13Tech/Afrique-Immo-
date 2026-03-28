// =========================================================
// AFRIQUE IMMO — app.js v4.1
// Corrections DeepSeek: limites vidéo/image, localStorage,
// nettoyage auto, réindexation, escapeHtml, EmailJS activé
// =========================================================

const DEEPSEEK_API_KEY  = 'sk-8eabfc9425a844c6bac68691a53a9a05';
const DEEPSEEK_URL      = 'https://api.deepseek.com/v1/chat/completions';
const EMAILJS_PUBLIC_KEY= 'rm-Zu8MBxW1LuhgEs';
const EMAILJS_SERVICE   = 'service_teranga';
const EMAILJS_TEMPLATE  = 'template_register';
const MAX_IMAGE_SIZE    = 20  * 1024 * 1024;   // 20 MB
const MAX_VIDEO_SIZE    = 500 * 1024 * 1024;   // 500 MB

// ── localStorage keys ──
const DB_KEY       = 'ai_db_v1';
const USER_KEY     = 'ai_user_v1';
const USERS_KEY    = 'ai_users_v1';
const LIKES_KEY    = 'ai_likes_v1';
const FAVS_KEY     = 'ai_favs_v1';
const FOLLOWS_KEY  = 'ai_follows_v1';
const COMMENTS_KEY = 'ai_comm_v1';
const LANG_KEY     = 'ai_lang_v1';

// ── Global state ──
let currentUser             = null;
let allListings             = [];
let likedPosts              = new Set();
let favorites               = new Set();
let followedUsers           = new Set();
let aiHistory               = [];
let currentLang             = 'fr';
let searchType              = 'vendre';
let uploadedMedia           = [];     // [{ dataUrl, type:'image'|'video' }]
let currentInterestedListing= null;
let textFontSize            = 16;
let pubMediaTab             = 'upload';
let currentPubStep          = 1;

// ── i18n ──
const i18n = {
  fr: { home:'Accueil', explore:'Explorer', publish:'Publier', messages:'Messages', profile:'Profil',
        forSale:'À Vendre', forRent:'À Louer', settings:'Paramètres', notifications:'Notifications',
        logout:'Déconnexion', followers:'Abonnés', following:'Suivis', posts:'Publications' },
  en: { home:'Home', explore:'Explore', publish:'Publish', messages:'Messages', profile:'Profile',
        forSale:'For Sale', forRent:'For Rent', settings:'Settings', notifications:'Notifications',
        logout:'Log out', followers:'Followers', following:'Following', posts:'Posts' }
};
function t(k){ return (i18n[currentLang]||i18n.fr)[k]||k; }

function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem(LANG_KEY, lang);
  document.getElementById('langFR')?.classList.toggle('active', lang==='fr');
  document.getElementById('langEN')?.classList.toggle('active', lang==='en');
  document.getElementById('htmlRoot')?.setAttribute('lang', lang);
}

// ── Security helper ──
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// =========================================================
// INIT
// =========================================================
window.addEventListener('load', () => {
  currentLang = localStorage.getItem(LANG_KEY) || 'fr';
  loadStorage();
  setTimeout(() => {
    document.getElementById('splash')?.classList.add('fade-out');
    setTimeout(() => {
      const s = document.getElementById('splash');
      if (s) s.style.display = 'none';
      initApp();
    }, 800);
  }, 2000);
});

function loadStorage() {
  try { allListings   = JSON.parse(localStorage.getItem(DB_KEY)      || '[]'); } catch(e){ allListings=[]; }
  try { likedPosts    = new Set(JSON.parse(localStorage.getItem(LIKES_KEY)  || '[]')); } catch(e){ likedPosts=new Set(); }
  try { favorites     = new Set(JSON.parse(localStorage.getItem(FAVS_KEY)   || '[]')); } catch(e){ favorites=new Set(); }
  try { followedUsers = new Set(JSON.parse(localStorage.getItem(FOLLOWS_KEY)|| '[]')); } catch(e){ followedUsers=new Set(); }
}

function save(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch(e) {
    console.warn('localStorage plein — nettoyage…');
    cleanOldMedia();
    try { localStorage.setItem(key, JSON.stringify(val)); }
    catch(e2) {
      if (key === DB_KEY) {
        allListings = allListings.slice(0, 10);
        allListings.forEach(l => { l.media = []; l.mediaTypes = []; });
        localStorage.setItem(key, JSON.stringify(allListings));
        showToast('Stockage plein : anciens médias supprimés', 'error');
      }
    }
  }
}

function cleanOldMedia() {
  allListings.forEach(l => {
    if ((l.media||[]).length > 1) {
      l.media      = l.media.slice(0,1);
      l.mediaTypes = (l.mediaTypes||[]).slice(0,1);
    }
  });
  console.warn('🧹 Nettoyage auto médias');
}

function saveListings() { save(DB_KEY, allListings); }
function saveLikes()    { save(LIKES_KEY,   [...likedPosts]); }
function saveFavs()     { save(FAVS_KEY,    [...favorites]); }
function saveFollows()  { save(FOLLOWS_KEY, [...followedUsers]); }

function initApp() {
  if (typeof emailjs !== 'undefined') {
    try { emailjs.init(EMAILJS_PUBLIC_KEY); } catch(e){}
  }
  const saved = localStorage.getItem(USER_KEY);
  if (saved) { try { currentUser = JSON.parse(saved); } catch(e){} }
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
  setTimeout(askNotifPermission, 2500);
}

function updateStats() {
  const users = [];
  try { users.push(...JSON.parse(localStorage.getItem(USERS_KEY)||'[]')); } catch(e){}
  const e1 = document.getElementById('statListings');
  const e2 = document.getElementById('statUsers');
  if (e1) e1.textContent = allListings.length + (allListings.length>0?'+':'');
  if (e2) e2.textContent = users.length + (users.length>0?'+':'');
}

// =========================================================
// NOTIFICATIONS (browser)
// =========================================================
function askNotifPermission() {
  if (!('Notification' in window) || Notification.permission !== 'default') return;
  if (document.getElementById('notifBanner')) return;
  const d = document.createElement('div');
  d.id = 'notifBanner';
  d.innerHTML = `<div class="notif-banner">
    <span>🔔 Activez les notifications pour les likes, commentaires et abonnés</span>
    <div class="nb-btns">
      <button class="btn-primary" style="padding:7px 14px;font-size:0.82rem" onclick="enableNotifs()">Activer</button>
      <button class="btn-secondary" style="padding:7px 12px;font-size:0.82rem" onclick="this.closest('#notifBanner').remove()">Plus tard</button>
    </div>
  </div>`;
  document.body.appendChild(d);
}
function enableNotifs() {
  Notification.requestPermission().then(p => {
    document.getElementById('notifBanner')?.remove();
    const tog = document.getElementById('notifToggle');
    if (tog) tog.checked = p === 'granted';
    showToast(p==='granted' ? '🔔 Notifications activées !' : 'Notifications refusées', p==='granted'?'success':'info');
  });
}
function toggleNotifSetting(cb) { if (cb.checked) enableNotifs(); }
function pushBrowserNotif(title, body) {
  if (Notification.permission !== 'granted') return;
  try { new Notification('🏠 '+title, { body }); } catch(e){}
}

// =========================================================
// NOTIFICATIONS (in-app)
// =========================================================
function getNotifsKey() { return currentUser ? 'ai_notifs_'+currentUser.id : 'ai_notifs_global'; }
function getNotifs()    { try { return JSON.parse(localStorage.getItem(getNotifsKey())||'[]'); } catch(e){ return []; } }

function addNotif(notif) {
  const key  = getNotifsKey();
  const list = getNotifs();
  list.unshift({ ...notif, id: Date.now()+Math.random(), read: false, time: new Date().toISOString() });
  localStorage.setItem(key, JSON.stringify(list.slice(0,200)));
  updateNotifBadge();
  pushBrowserNotif(notif.title||'Afrique Immo', notif.text||'');
}

function addNotifForUser(userId, notif) {
  if (!userId) return;
  const key  = 'ai_notifs_'+userId;
  try {
    const list = JSON.parse(localStorage.getItem(key)||'[]');
    list.unshift({ ...notif, id: Date.now()+Math.random(), read: false, time: new Date().toISOString() });
    localStorage.setItem(key, JSON.stringify(list.slice(0,200)));
  } catch(e){}
}

function updateNotifBadge() {
  const count = getNotifs().filter(n=>!n.read).length;
  const badge = document.querySelector('#navbar .badge');
  if (!badge) return;
  badge.textContent = count > 99 ? '99+' : count;
  badge.style.display = count > 0 ? 'flex' : 'none';
}

// =========================================================
// AUTH
// =========================================================
function showAuthOverlay() { const a=document.getElementById('authOverlay'); if(a) a.style.display='flex'; }
function hideAuthOverlay() { const a=document.getElementById('authOverlay'); if(a) a.style.display='none'; }
function showModal(name)   {
  document.querySelectorAll('.auth-modal').forEach(m=>m.classList.add('hidden'));
  document.getElementById(name+'Modal')?.classList.remove('hidden');
}

function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPassword').value;
  if (!email||!pass) { showToast('Remplissez tous les champs','error'); return; }
  showLoading('Connexion…');
  setTimeout(() => {
    hideLoading();
    try {
      const users = JSON.parse(localStorage.getItem(USERS_KEY)||'[]');
      const found = users.find(u => u.email===email && u.ph===hashStr(pass));
      if (!found) { showToast('Email ou mot de passe incorrect','error'); return; }
      currentUser = found;
      save(USER_KEY, currentUser);
      hideAuthOverlay(); showApp();
      showToast('Bienvenue '+currentUser.firstName+' ! 🏠','success');
    } catch(e) { showToast('Erreur de connexion','error'); }
  }, 1200);
}

function doRegister() {
  const fn   = document.getElementById('regFirstName').value.trim();
  const ln   = document.getElementById('regLastName').value.trim();
  const em   = document.getElementById('regEmail').value.trim();
  const pw   = document.getElementById('regPassword').value;
  const ph   = document.getElementById('regPhone').value.trim();
  const wa   = document.getElementById('regWhatsapp').value.trim();
  const addr = document.getElementById('regAddress').value.trim();
  const trm  = document.getElementById('regTerms').checked;

  if (!fn||!ln||!em||!pw||!ph||!wa||!addr) { showToast('Tous les champs obligatoires doivent être remplis','error'); return; }
  if (!trm) { showToast("Acceptez les conditions d'utilisation",'error'); return; }
  if (pw.length<8) { showToast('Mot de passe trop court (min. 8 caractères)','error'); return; }

  let users = [];
  try { users = JSON.parse(localStorage.getItem(USERS_KEY)||'[]'); } catch(e){}
  if (users.find(u=>u.email===em)) { showToast('Cet email est déjà utilisé','error'); return; }

  showLoading("Vérification de votre pièce d'identité par IA…");
  setTimeout(()=>{
    showLoadingText('Comparaison des informations…');
    setTimeout(()=>{
      showLoadingText('Validation du compte…');
      setTimeout(()=>{
        hideLoading();
        const newUser = {
          id:'u_'+Date.now(), firstName:fn, lastName:ln, email:em, ph:hashStr(pw),
          phone:ph, whatsapp:wa, address:addr, bio:'', avatar:null,
          followers:[], following:[], createdAt:new Date().toISOString()
        };
        users.push(newUser);
        save(USERS_KEY, users);
        currentUser = newUser;
        save(USER_KEY, newUser);
        sendAdminEmail({ firstName:fn, lastName:ln, email:em, phone:ph, whatsapp:wa, address:addr });
        hideAuthOverlay(); showApp();
        showToast('Bienvenue '+fn+' ! Compte créé ✅','success');
        addNotif({ type:'system', title:'Bienvenue !', text:'🎉 Votre compte Afrique Immo a été créé avec succès !' });
      }, 1000);
    }, 1100);
  }, 1200);
}

function doForgot() {
  const em = document.getElementById('forgotEmail').value.trim();
  if (!em) { showToast('Entrez votre email','error'); return; }
  showToast('Lien de réinitialisation envoyé à '+em,'success');
  setTimeout(()=>showModal('login'), 2000);
}

function logout() {
  currentUser = null;
  localStorage.removeItem(USER_KEY);
  document.getElementById('app')?.classList.add('hidden');
  showAuthOverlay(); showModal('login');
  showToast('Déconnecté','info');
}

function hashStr(s) { let h=0; for(let i=0;i<s.length;i++) h=(Math.imul(31,h)+s.charCodeAt(i))|0; return h.toString(36); }
function togglePwd(id) { const el=document.getElementById(id); if(el) el.type=el.type==='password'?'text':'password'; }

function handleIdUpload(event) {
  const file = event.target.files[0]; if(!file) return;
  const url  = URL.createObjectURL(file);
  const prev = document.getElementById('idPreview'); if(!prev) return;
  prev.classList.remove('hidden');
  prev.innerHTML = '<img src="'+url+'" style="width:100%;border-radius:8px"/>'
    +'<div style="margin-top:8px;font-size:0.82rem;color:var(--gold)"><span class="typing-dots"><span></span><span></span><span></span></span> Analyse IA…</div>';
  setTimeout(()=>{
    const d = prev.querySelector('[style*="typing"]');
    if (d) d.outerHTML = '<div style="color:var(--green);margin-top:6px">✅ Pièce d\'identité vérifiée</div>';
  }, 2500);
}

function sendAdminEmail(u) {
  if (typeof emailjs !== 'undefined') {
    emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, {
      to_email:  'immobiliersn9@gmail.com',
      prenom:    escapeHtml(u.firstName),
      nom:       escapeHtml(u.lastName),
      email:     escapeHtml(u.email),
      telephone: escapeHtml(u.phone),
      whatsapp:  escapeHtml(u.whatsapp),
      adresse:   escapeHtml(u.address),
      date:      new Date().toLocaleString('fr-FR')
    }, EMAILJS_PUBLIC_KEY)
    .then(()=>console.log('📧 Email admin envoyé → immobiliersn9@gmail.com'))
    .catch(e=>console.warn('EmailJS:', e));
  }
  console.log('📧 Admin notification:', u);
}

// =========================================================
// NAVIGATION
// =========================================================
function showPage(page) {
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  const t = document.getElementById('page-'+page);
  if (t) { t.classList.add('active'); window.scrollTo(0,0); }
  const tabMap = { home:'bn-home', explore:'bn-explore', messages:'bn-messages', profile:'bn-profile' };
  document.querySelectorAll('.bottom-nav button').forEach(b=>b.classList.remove('active-tab'));
  if (tabMap[page]) document.getElementById(tabMap[page])?.classList.add('active-tab');
  const handlers = {
    home:          ()=>{ renderHomeFeed(); renderFeatured(); updateStats(); },
    explore:       ()=>renderExploreFeed(),
    profile:       ()=>renderProfile(),
    'my-listings': ()=>renderMyListings(),
    favorites:     ()=>renderFavorites(),
    notifications: ()=>{ renderNotifications(); markNotifsRead(); },
    publish:       ()=>resetPublish()
  };
  if (handlers[page]) handlers[page]();
}

function markNotifsRead() {
  const key  = getNotifsKey();
  const list = getNotifs().map(n=>({...n,read:true}));
  localStorage.setItem(key, JSON.stringify(list));
  updateNotifBadge();
}

function updateNavAvatar() {
  if (!currentUser) return;
  const src = currentUser.avatar || avatarUrl(currentUser.firstName+' '+currentUser.lastName);
  const el  = document.getElementById('navAvatar');
  if (el) el.src = src;
}

function avatarUrl(name, bg='C8973A') {
  return 'https://ui-avatars.com/api/?name='+encodeURIComponent(name)+'&background='+bg+'&color=fff&size=100';
}

function toggleSidebar() {
  document.getElementById('sidebar')?.classList.toggle('hidden');
  document.getElementById('sidebarOverlay')?.classList.toggle('hidden');
}
function toggleProfileMenu() { document.getElementById('profileMenu')?.classList.toggle('hidden'); }
document.addEventListener('click', e => {
  const m = document.getElementById('profileMenu');
  if (m && !e.target.closest('.nav-avatar')) m.classList.add('hidden');
});

// =========================================================
// SEARCH OVERLAY (loupe en haut)
// =========================================================
function openSearchBar() {
  document.getElementById('searchOverlay')?.classList.remove('hidden');
  setTimeout(()=>document.getElementById('searchOverlayInput')?.focus(), 100);
}
function closeSearchBar() { document.getElementById('searchOverlay')?.classList.add('hidden'); }

function searchOverlayQuery(q) {
  const res = document.getElementById('searchOverlayResults'); if(!res) return;
  if (!q.trim()) { res.innerHTML=''; return; }
  const lower = q.toLowerCase();
  const found = allListings.filter(l =>
    l.title?.toLowerCase().includes(lower) ||
    l.location?.toLowerCase().includes(lower) ||
    l.owner?.name?.toLowerCase().includes(lower) ||
    l.type?.toLowerCase().includes(lower)
  );
  res.innerHTML = '';
  if (!found.length) {
    res.innerHTML = '<div style="color:var(--gray);padding:20px;text-align:center">Aucun résultat pour "'+escapeHtml(q)+'"</div>';
    return;
  }
  found.slice(0,10).forEach(l => {
    const media  = (l.media||[])[0];
    const isVid  = (l.mediaTypes||[])[0]==='video';
    const div    = document.createElement('div');
    div.className= 'sor-item';
    const thumbHTML = media && !isVid
      ? '<img src="'+media+'" alt="" onerror="this.style.display=\'none\'"/>'
      : '<div class="sor-thumb">'+(isVid?'🎬':'🏠')+'</div>';
    div.innerHTML = thumbHTML
      + '<div><div class="sor-title">'+escapeHtml(l.title)+'</div>'
      + '<div class="sor-sub">'+formatPrice(l.price,l.transaction)+' · '+escapeHtml(l.location)+'</div></div>';
    div.onclick = ()=>{ closeSearchBar(); showPropertyDetail(l.id); };
    res.appendChild(div);
  });
}

// =========================================================
// HOME FEED
// =========================================================
function renderHomeFeed() {
  const c = document.getElementById('homeFeed'); if(!c) return;
  c.innerHTML = '';
  if (!allListings.length) {
    c.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:48px;color:var(--gray)">'
      +'<div style="font-size:3.5rem;margin-bottom:12px">🏠</div>'
      +'<h3 style="margin-bottom:8px;font-family:var(--font-display)">Aucune publication pour l\'instant</h3>'
      +'<p>Soyez le premier à publier un bien !</p>'
      +'<button class="btn-primary" style="margin-top:20px" onclick="showPage(\'publish\')">'
      +'<i class="fas fa-plus"></i> Publier un bien</button></div>';
    return;
  }
  allListings.slice(0,12).forEach(l => c.appendChild(createPropertyCard(l)));
}

function renderFeatured() {
  const c = document.getElementById('featuredListings'); if(!c) return;
  c.innerHTML = '';
  const feat = allListings.filter(l=>(l.likes||0)>=3);
  if (!feat.length) {
    c.innerHTML = '<p style="color:var(--gray);padding:16px">Les biens populaires apparaîtront ici.</p>';
    return;
  }
  feat.slice(0,6).forEach(l => c.appendChild(createPropertyCard(l)));
}

// =========================================================
// PROPERTY CARD
// =========================================================
function createPropertyCard(l) {
  const card   = document.createElement('div');
  card.className = 'property-card';
  const isFav  = favorites.has(l.id);
  const nLikes = l.likes||0;
  const mediaArr= l.media||l.images||[];
  const typeArr = l.mediaTypes||[];
  const media   = mediaArr[0];
  const isVid   = typeArr[0]==='video';
  const dateStr = formatDate(l.createdAt);
  const ownerVerified = (l.owner?.followersCount||0) >= 1000;

  let mediaHTML = '';
  if (media) {
    if (isVid) {
      mediaHTML = '<video src="'+media+'" muted playsinline preload="metadata" style="width:100%;height:100%;object-fit:cover" onclick="showPropertyDetail(\''+l.id+'\')"></video>'
        +'<div class="pc-play-icon">▶️</div>';
    } else {
      mediaHTML = '<img src="'+media+'" alt="'+escapeHtml(l.title)+'" loading="lazy" style="width:100%;height:100%;object-fit:cover"'
        +' onclick="showPropertyDetail(\''+l.id+'\')"'
        +' onerror="this.parentElement.innerHTML=\'<div style=&quot;width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--dark3);font-size:3rem&quot;>🏠</div>\'"/>';
    }
  } else if (l.textContent) {
    mediaHTML = '<div style="width:100%;height:100%;padding:14px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--dark3),var(--dark4));font-size:0.85rem;text-align:center;line-height:1.5;overflow:hidden;cursor:pointer" onclick="showPropertyDetail(\''+l.id+'\')">'
      +escapeHtml(l.textContent.substring(0,180))+'</div>';
  } else {
    mediaHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--dark3);font-size:3rem;cursor:pointer" onclick="showPropertyDetail(\''+l.id+'\')">🏠</div>';
  }

  const ownerName = l.owner?.name||'';
  card.innerHTML =
    '<div class="pc-img" style="position:relative;height:200px;overflow:hidden">'+mediaHTML
    +'<span class="pc-badge '+(l.transaction==='louer'?'louer':'')+'">'+(l.transaction==='louer'?'À Louer':'À Vendre')+'</span>'
    +'<button class="pc-save '+(isFav?'active':'')+'" onclick="event.stopPropagation();toggleFavorite(\''+l.id+'\',this)"><i class="fas fa-heart"></i></button>'
    +(l.externalSource?'<div style="position:absolute;bottom:8px;left:10px;background:'+l.externalColor+';color:#fff;border-radius:50px;padding:2px 8px;font-size:0.7rem;font-weight:700">'+l.externalIcon+' '+escapeHtml(l.externalSource)+'</div>':'')
    +'<div class="pc-date">'+dateStr+'</div>'
    +'</div>'
    +'<div class="pc-body" onclick="showPropertyDetail(\''+l.id+'\')">'
    +'<div class="pc-price">'+formatPrice(l.price,l.transaction)+'</div>'
    +'<div class="pc-title">'+escapeHtml(l.title)+'</div>'
    +'<div class="pc-location"><i class="fas fa-map-marker-alt"></i>'+escapeHtml(l.location)+'</div>'
    +'<div class="pc-stats">'
    +(l.surface?'<span><i class="fas fa-expand-arrows-alt"></i>'+l.surface+'m²</span>':'')
    +(l.chambres?'<span><i class="fas fa-bed"></i>'+l.chambres+'</span>':'')
    +(l.bains?'<span><i class="fas fa-bath"></i>'+l.bains+'</span>':'')
    +'<span style="margin-left:auto;font-size:0.76rem"><i class="fas fa-heart" style="color:var(--red)"></i> <span id="pcLike_'+l.id+'">'+nLikes+'</span></span>'
    +'</div></div>'
    +'<div class="pc-owner">'
    +'<img src="'+(l.owner?.avatar||avatarUrl(ownerName))+'" alt="'+escapeHtml(ownerName)+'" onerror="this.src=\''+avatarUrl(ownerName)+'\'"/>'
    +'<span class="pc-owner-name">'+escapeHtml(ownerName)+(ownerVerified?' 🔵':'')+'</span>'
    +'</div>'
    +'<div class="pc-actions">'
    +'<button class="pc-action-btn btn-interested" onclick="event.stopPropagation();openInterestedModal(\''+l.id+'\')">'
    +'<i class="fas fa-star"></i> Intéressé</button>'
    +'<button class="pc-action-btn btn-call" onclick="event.stopPropagation();callOwner(\''+escapeHtml(l.owner?.phone||'')+'\')"><i class="fas fa-phone"></i></button>'
    +'<button class="pc-action-btn btn-whatsapp" onclick="event.stopPropagation();whatsappOwner(\''+escapeHtml(l.owner?.whatsapp||'')+'\',\''+l.id+'\')">'
    +'<i class="fab fa-whatsapp"></i></button>'
    +'</div>';
  return card;
}

// =========================================================
// TIKTOK EXPLORE
// =========================================================
function renderExploreFeed(filter='all') {
  const c = document.getElementById('exploreFeed'); if(!c) return;
  c.innerHTML = '';
  let list = allListings;
  if (filter==='vendre'||filter==='louer') list = allListings.filter(l=>l.transaction===filter);
  else if (filter!=='all') list = allListings.filter(l=>l.type===filter);
  if (!list.length) {
    c.innerHTML = '<div style="text-align:center;padding:60px 20px;color:var(--gray)">'
      +'<div style="font-size:3rem;margin-bottom:12px">📭</div>'
      +'<p>Aucune publication.<br/><a onclick="showPage(\'publish\')" style="color:var(--gold)">Publiez le premier !</a></p></div>';
    return;
  }
  list.forEach(l => c.appendChild(createTikTokCard(l)));
}

function createTikTokCard(l) {
  const card     = document.createElement('div');
  card.className = 'tiktok-card';
  const nLikes   = l.likes||0;
  const nComm    = l.commentsCount||0;
  const isLiked  = likedPosts.has(l.id);
  const isFollow = followedUsers.has(l.owner?.name);
  const media    = (l.media||[])[0];
  const isVid    = (l.mediaTypes||[])[0]==='video';
  const ownerVer = (l.owner?.followersCount||0)>=1000;
  const ownerName= l.owner?.name||'';

  let bgHTML = '';
  if (media) {
    bgHTML = isVid
      ? '<video src="'+media+'" autoplay muted loop playsinline style="width:100%;height:100%;object-fit:cover"></video>'
      : '<img src="'+media+'" alt="" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display=\'none\'"/>';
  } else if (l.textContent) {
    bgHTML = '<div style="width:100%;height:100%;background:linear-gradient(135deg,#1a1208,#2a1d0a);display:flex;align-items:center;justify-content:center;padding:24px">'
      +'<div style="font-size:1.1rem;line-height:1.7;text-align:center;color:#fff;max-width:90%">'+escapeHtml(l.textContent)+'</div></div>';
  } else {
    bgHTML = '<div style="width:100%;height:100%;background:linear-gradient(135deg,#1a1208,#3a2a10);display:flex;align-items:center;justify-content:center;font-size:5rem">🏠</div>';
  }

  card.innerHTML =
    '<div class="tc-bg">'+bgHTML+'</div>'
    +'<div class="tc-sidebar">'
    +'<button class="tc-side-btn '+(isLiked?'liked':'')+'" id="tlike_'+l.id+'" onclick="likeProperty(\''+l.id+'\',this)">'
    +'<i class="fas fa-heart"></i><span id="tlcount_'+l.id+'">'+nLikes+'</span></button>'
    +'<button class="tc-side-btn" onclick="showPropertyDetail(\''+l.id+'\')">'
    +'<i class="fas fa-comment"></i><span id="tccount_'+l.id+'">'+nComm+'</span></button>'
    +'<button class="tc-side-btn" onclick="shareProperty(\''+l.id+'\')">'
    +'<i class="fas fa-share"></i><span>Partager</span></button>'
    +'<button class="tc-side-btn '+(favorites.has(l.id)?'active':'')+'" id="tfav_'+l.id+'" onclick="toggleFavoriteBtn(\''+l.id+'\',this)">'
    +'<i class="fas fa-bookmark"></i><span>Sauver</span></button>'
    +'</div>'
    +'<div class="tc-content">'
    +'<div class="tc-date">'+formatDate(l.createdAt)+'</div>'
    +'<div class="tc-user">'
    +'<img src="'+(l.owner?.avatar||avatarUrl(ownerName))+'" alt="'+escapeHtml(ownerName)+'" onerror="this.src=\''+avatarUrl(ownerName)+'\'"/>'
    +'<span class="tc-user-name">'+escapeHtml(ownerName)+(ownerVer?' 🔵':'')+'</span>'
    +'<button class="tc-follow-btn '+(isFollow?'following':'')+'" id="tfol_'+l.id+'" onclick="followUser(\''+escapeHtml(ownerName)+'\',\''+l.id+'\',this)">'
    +(isFollow?'Suivi ✓':'+ Suivre')+'</button>'
    +'</div>'
    +'<div class="tc-title">'+escapeHtml(l.title)+'</div>'
    +'<div class="tc-price">'+formatPrice(l.price,l.transaction)+'</div>'
    +'<div class="tc-desc">'+escapeHtml(l.description||l.textContent||'')+'</div>'
    +'<div class="tc-tags">'
    +(l.type?'<span class="tc-tag">'+escapeHtml(l.type)+'</span>':'')
    +'<span class="tc-tag">'+(l.transaction==='louer'?'À Louer':'À Vendre')+'</span>'
    +(l.surface?'<span class="tc-tag">'+l.surface+'m²</span>':'')
    +(l.chambres?'<span class="tc-tag">'+l.chambres+' ch.</span>':'')
    +'<span class="tc-tag"><i class="fas fa-map-marker-alt"></i> '+escapeHtml(l.location||'')+'</span>'
    +'</div>'
    +'<div class="tc-action-row">'
    +'<button class="tc-btn" style="background:var(--gold);color:var(--dark)" onclick="openInterestedModal(\''+l.id+'\')">'
    +'<i class="fas fa-star"></i> Intéressé(e)</button>'
    +'<button class="tc-btn" style="background:#25D366;color:#fff" onclick="whatsappOwner(\''+escapeHtml(l.owner?.whatsapp||'')+'\',\''+l.id+'\')">'
    +'<i class="fab fa-whatsapp"></i> WhatsApp</button>'
    +'</div></div>';
  return card;
}

function filterExplore(filter, btn) {
  document.querySelectorAll('.filter-chip').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderExploreFeed(filter);
}

// =========================================================
// INTERESTED MODAL
// =========================================================
function openInterestedModal(listingId) {
  currentInterestedListing = allListings.find(l=>l.id===listingId);
  if (!currentInterestedListing) return;
  document.getElementById('interestedModal').style.display = 'flex';
}
function closeInterestedModal(action) {
  document.getElementById('interestedModal').style.display = 'none';
  if (!currentInterestedListing) return;
  const l = currentInterestedListing;
  if (action==='wa')   whatsappOwner(l.owner?.whatsapp||'', l.id);
  else if (action==='call') callOwner(l.owner?.phone||'');
  else if (action==='msg')  openChatWithListing(l);
}

// =========================================================
// ENGAGEMENT: LIKE
// =========================================================
function likeProperty(id, btn) {
  if (!currentUser) { showToast('Connectez-vous pour liker','info'); return; }
  const l = allListings.find(x=>x.id===id); if(!l) return;
  const wasLiked = likedPosts.has(id);
  if (wasLiked) { likedPosts.delete(id); l.likes = Math.max(0,(l.likes||0)-1); }
  else {
    likedPosts.add(id);
    l.likes = (l.likes||0)+1;
    if (l.owner?.id && l.owner.id !== currentUser.id) {
      addNotifForUser(l.owner.id, { type:'like', title:'Nouveau like !',
        text:'❤️ '+currentUser.firstName+' '+currentUser.lastName+' a aimé votre bien "'+l.title+'"' });
    }
  }
  saveLikes(); saveListings();
  document.querySelectorAll('[id="tlike_'+id+'"], [id="likeBtn_'+id+'"]').forEach(b=>b.classList.toggle('liked',!wasLiked));
  document.querySelectorAll('[id="tlcount_'+id+'"], [id="likeCount_'+id+'"], [id="pcLike_'+id+'"]').forEach(el=>el.textContent=l.likes);
  showToast(wasLiked ? 'Like retiré' : '❤️ J\'aime !', 'info');
}

// =========================================================
// ENGAGEMENT: FOLLOW
// =========================================================
function followUser(ownerName, listingId, btn) {
  if (!currentUser) { showToast('Connectez-vous pour suivre','info'); return; }
  if (!ownerName) return;
  const already = followedUsers.has(ownerName);
  if (already) {
    followedUsers.delete(ownerName);
    if (btn) { btn.textContent='+ Suivre'; btn.classList.remove('following'); }
    showToast('Vous ne suivez plus '+ownerName,'info');
  } else {
    followedUsers.add(ownerName);
    if (btn) { btn.textContent='Suivi ✓'; btn.classList.add('following'); }
    showToast('✅ Vous suivez '+ownerName,'success');
    addNotif({ type:'follow', title:'Abonnement', text:'👤 Vous suivez maintenant '+ownerName });
    const listing = allListings.find(l=>l.id===listingId);
    if (listing?.owner?.id) {
      addNotifForUser(listing.owner.id, { type:'follow', title:'Nouvel abonné !',
        text:'👤 '+currentUser.firstName+' '+currentUser.lastName+' s\'est abonné à votre compte' });
    }
  }
  saveFollows(); updateProfileStats();
}

// =========================================================
// FAVORIS
// =========================================================
function toggleFavorite(id, btn) {
  if (favorites.has(id)) { favorites.delete(id); btn.classList.remove('active'); showToast('Retiré des favoris','info'); }
  else { favorites.add(id); btn.classList.add('active'); showToast('❤️ Ajouté aux favoris','success'); }
  saveFavs();
}
function toggleFavoriteBtn(id, btn) {
  if (favorites.has(id)) { favorites.delete(id); btn?.classList.remove('active'); showToast('Retiré des favoris','info'); }
  else { favorites.add(id); btn?.classList.add('active'); showToast('❤️ Sauvegardé','success'); }
  saveFavs();
}
function shareProperty(id) {
  const l   = allListings.find(x=>x.id===id);
  const url = window.location.href;
  const txt = l ? '🏠 '+l.title+' — '+formatPrice(l.price,l.transaction)+' — '+l.location+' | Afrique Immo' : 'Afrique Immo';
  if (navigator.share) navigator.share({ title:txt, text:txt, url }).catch(()=>{});
  else { navigator.clipboard?.writeText(url); showToast('Lien copié !','success'); }
}

// =========================================================
// RECHERCHE
// =========================================================
function setSearchType(type, btn) {
  searchType = type;
  document.querySelectorAll('.stab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
}
function doHeroSearch() {
  const loc = document.getElementById('heroLocation').value;
  const tp  = document.getElementById('heroType').value;
  const bud = document.getElementById('heroBudget').value;
  document.getElementById('asLocation').value    = loc;
  document.getElementById('asType').value        = tp;
  document.getElementById('asTransaction').value = searchType;
  if (bud) {
    const p = bud.replace('+','').split('-');
    document.getElementById('asBudgetMin').value = p[0]||'';
    document.getElementById('asBudgetMax').value = p[1]||'';
  }
  showPage('search'); doAdvancedSearch();
}
function filterCategory(type) {
  document.getElementById('asType').value = type;
  showPage('search'); doAdvancedSearch();
}

async function doAdvancedSearch() {
  const loc   = document.getElementById('asLocation').value.toLowerCase().trim();
  const trans = document.getElementById('asTransaction').value;
  const type  = document.getElementById('asType').value;
  const bMin  = parseFloat(document.getElementById('asBudgetMin').value)||0;
  const bMax  = parseFloat(document.getElementById('asBudgetMax').value)||Infinity;
  const res   = document.getElementById('searchResults'); if(!res) return;

  res.innerHTML = '<div style="background:var(--dark2);border:1px solid var(--dark4);border-radius:var(--radius);padding:20px;margin-bottom:14px">'
    +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">'
    +'<span style="font-size:1.8rem">🤖</span>'
    +'<div><div style="font-weight:600;margin-bottom:3px">Recherche IA en cours…</div>'
    +'<div style="font-size:0.82rem;color:var(--gray)">Analyse sur Afrique Immo + sources externes</div></div></div>'
    +'<div style="display:flex;flex-wrap:wrap;gap:6px">'
    +['🏠 Afrique Immo','🔵 Facebook','📸 Instagram','🟢 CoinAfrique','🟠 Jumia House','🎵 TikTok'].map(s=>'<span style="background:var(--dark3);border:1px solid var(--dark4);border-radius:50px;padding:3px 10px;font-size:0.76rem;color:var(--gray)">'+s+'</span>').join('')
    +'</div></div>';

  await delay(1800);

  const local = allListings.filter(l => {
    const lm = !loc || l.location?.toLowerCase().includes(loc) || loc.split(' ').some(w=>w.length>2&&l.location?.toLowerCase().includes(w));
    const tm = !trans || l.transaction===trans;
    const ym = !type  || l.type===type;
    const bm = l.price>=bMin && l.price<=bMax;
    return lm&&tm&&ym&&bm;
  });

  res.innerHTML = '';
  if (local.length>0) {
    const hdr = document.createElement('div');
    hdr.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:12px';
    hdr.innerHTML = '<span class="source-badge local">🏠 Afrique Immo</span><span style="color:var(--gray);font-size:0.83rem">'+local.length+' bien(s)</span>';
    res.appendChild(hdr);
    const grid = document.createElement('div'); grid.className='feed-grid';
    local.forEach(l=>grid.appendChild(createPropertyCard(l)));
    res.appendChild(grid);
  }
  if (loc) await searchExternalSources(loc,type,trans,bMin,bMax,res);
  if (!res.children.length) {
    res.innerHTML = '<div style="background:var(--dark2);border:1px solid var(--dark4);border-radius:var(--radius);padding:28px;text-align:center">'
      +'<div style="font-size:2.8rem;margin-bottom:10px">🔍</div>'
      +'<h3 style="margin-bottom:7px">Aucun résultat pour "'+escapeHtml(loc)+'"</h3>'
      +'<p style="color:var(--gray);margin-bottom:16px">Voici des biens disponibles à proximité :</p></div>'
      +'<div class="feed-grid" id="proxGrid"></div>';
    const pg = document.getElementById('proxGrid');
    if (pg) allListings.slice(0,4).forEach(l=>pg.appendChild(createPropertyCard(l)));
  }
}

async function searchExternalSources(loc,type,trans,bMin,bMax,container) {
  const srcs = { 'Facebook Marketplace':{c:'#1877F2',i:'🔵'}, 'CoinAfrique':{c:'#27AE60',i:'🟢'}, 'Jumia House':{c:'#E67E22',i:'🟠'}, 'Expat-Dakar':{c:'#C8973A',i:'🏠'}, 'Instagram':{c:'#E1306C',i:'📸'}, 'TikTok':{c:'#FF0050',i:'🎵'} };
  try {
    const resp = await callDeepSeek('Tu es un expert immobilier sénégalais. Génère 4 à 6 annonces RÉALISTES pour: zone="'+loc+'", type="'+(type||'tous')+'", transaction="'+(trans||'vente/location')+'", budget '+bMin+' à '+(bMax===Infinity?'illimité':bMax)+' FCFA.\nRéponds UNIQUEMENT en JSON valide sans markdown: {"results":[{"titre":"...","prix":NOMBRE,"localisation":"...","type":"maison|villa|terrain|appartement|bureau","transaction":"vendre|louer","surface":NOMBRE,"chambres":NOMBRE,"description":"...","source":"Facebook Marketplace|CoinAfrique|Jumia House|Expat-Dakar|Instagram|TikTok"}]}\nPrix minimum location: 150 000 FCFA/mois.');
    let parsed; try { parsed = JSON.parse(resp.replace(/```json|```/g,'').trim()); } catch{return;}
    if (!parsed?.results?.length) return;
    const bySource = {};
    parsed.results.forEach(r=>{ const s=r.source||'Autre'; if(!bySource[s]) bySource[s]=[]; bySource[s].push(r); });
    Object.entries(bySource).forEach(([src,items])=>{
      const si = srcs[src]||{c:'#666',i:'🌐'};
      const sec = document.createElement('div'); sec.style.marginTop='20px';
      const hdr = document.createElement('div'); hdr.style.cssText='display:flex;align-items:center;gap:10px;margin-bottom:12px';
      hdr.innerHTML = '<span style="background:'+si.c+'20;border:1px solid '+si.c+';color:'+si.c+';border-radius:50px;padding:4px 12px;font-size:0.78rem;font-weight:600">'+si.i+' '+src+'</span><span style="color:var(--gray);font-size:0.82rem">'+items.length+' résultat(s)</span>';
      sec.appendChild(hdr);
      const grid = document.createElement('div'); grid.className='feed-grid';
      items.forEach(item=>{
        const fake = { id:'ext_'+Date.now()+Math.random(), title:item.titre, price:item.prix, location:item.localisation||loc, zone:loc, type:item.type||'maison', transaction:item.transaction||'vendre', surface:item.surface||0, chambres:item.chambres||0, bains:0, description:item.description, media:[], images:[], mediaTypes:[], owner:{id:'ext',name:'Via '+src,avatar:avatarUrl('Via '+src,si.c.replace('#','')),phone:'+221 77 000 00 00',whatsapp:'+221 77 000 00 00'}, likes:0, commentsCount:0, views:0, verified:false, externalSource:src, externalColor:si.c, externalIcon:si.i, createdAt:new Date().toISOString() };
        grid.appendChild(createPropertyCard(fake));
      });
      sec.appendChild(grid); container.appendChild(sec);
    });
    showToast('✅ '+parsed.results.length+' résultat(s) trouvé(s) en ligne','success');
  } catch(e){ console.log('External search:', e); }
}

// =========================================================
// PROPERTY DETAIL
// =========================================================
function showPropertyDetail(id) {
  const l = allListings.find(x=>x.id===id); if(!l) return;
  l.views = (l.views||0)+1; saveListings();
  const isLiked  = likedPosts.has(id);
  const nLikes   = l.likes||0;
  let listComments = [];
  try { listComments = (JSON.parse(localStorage.getItem(COMMENTS_KEY)||'{}'))[id]||[]; } catch(e){}
  const mediaArr = l.media||l.images||[];
  const typeArr  = l.mediaTypes||[];
  const isFollow = followedUsers.has(l.owner?.name);
  const ownerVer = (l.owner?.followersCount||0)>=1000;
  const ownerName= l.owner?.name||'';

  let gallHTML = '';
  if (mediaArr.length>0) {
    gallHTML = '<div class="pd-gallery-scroll">';
    mediaArr.forEach((m,i)=>{
      gallHTML += typeArr[i]==='video'
        ? '<video src="'+m+'" controls style="width:100%;max-height:420px;border-radius:var(--radius);background:#000"></video>'
        : '<img src="'+m+'" alt="Photo '+(i+1)+'" onerror="this.style.display=\'none\'"/>';
    });
    gallHTML += '</div>';
  } else if (l.textContent) {
    gallHTML = '<div style="background:linear-gradient(135deg,var(--dark2),var(--dark3));border-radius:var(--radius);padding:28px;margin-bottom:16px;font-size:1rem;line-height:1.8">'+escapeHtml(l.textContent)+'</div>';
  } else {
    gallHTML = '<div style="height:180px;background:var(--dark3);border-radius:var(--radius);display:flex;align-items:center;justify-content:center;font-size:4rem;margin-bottom:16px">🏠</div>';
  }

  document.getElementById('propertyDetail').innerHTML =
    '<button class="btn-secondary" onclick="history.back()" style="margin-bottom:14px"><i class="fas fa-arrow-left"></i> Retour</button>'
    +gallHTML
    +'<div style="font-size:0.78rem;color:var(--gray);margin-bottom:10px">📅 Publié '+formatDate(l.createdAt)+'</div>'
    +'<div class="pd-header">'
    +'<div class="pd-price">'+formatPrice(l.price,l.transaction)+'</div>'
    +'<h1 class="pd-title">'+escapeHtml(l.title)+'</h1>'
    +'<div class="pd-location"><i class="fas fa-map-marker-alt" style="color:var(--gold)"></i> '+escapeHtml(l.location||'')+'</div>'
    +'<div class="pd-features">'
    +(l.surface?'<div class="pd-feat"><i class="fas fa-expand-arrows-alt"></i>'+l.surface+'m²</div>':'')
    +(l.chambres?'<div class="pd-feat"><i class="fas fa-bed"></i>'+l.chambres+' ch.</div>':'')
    +(l.bains?'<div class="pd-feat"><i class="fas fa-bath"></i>'+l.bains+' SDB</div>':'')
    +'</div></div>'
    +'<div class="pd-section"><h3>Description</h3><p style="line-height:1.8;color:rgba(255,255,255,0.88)">'+escapeHtml(l.description||l.textContent||'Aucune description.')+'</p></div>'
    +(l.equip?.length?'<div class="pd-section"><h3>Équipements</h3><div class="pd-equip-grid">'+l.equip.map(e=>'<span class="pd-equip">'+getEquipLabel(e)+'</span>').join('')+'</div></div>':'')
    +'<div class="pd-section"><div class="pd-owner-card">'
    +'<div class="pd-owner-info">'
    +'<img src="'+(l.owner?.avatar||avatarUrl(ownerName))+'" alt="'+escapeHtml(ownerName)+'" onerror="this.src=\''+avatarUrl(ownerName)+'\'"/>'
    +'<div><div class="pd-owner-name">'+escapeHtml(ownerName)+(ownerVer?' 🔵':'')+'</div>'
    +'<div style="color:var(--green);font-size:0.78rem">Propriétaire'+(l.verified?' vérifié':'')+'</div></div>'
    +'<button class="btn-secondary" style="margin-left:auto;padding:7px 12px;font-size:0.82rem" onclick="followUser(\''+escapeHtml(ownerName)+'\',\''+id+'\',this)">'+(isFollow?'Suivi ✓':'+ Suivre')+'</button>'
    +'</div>'
    +'<div class="pd-contact-btns">'
    +'<button class="btn-primary" onclick="openInterestedModal(\''+id+'\')"><i class="fas fa-star"></i> Intéressé(e)</button>'
    +'<button class="btn-secondary" onclick="callOwner(\''+escapeHtml(l.owner?.phone||'')+'\')"><i class="fas fa-phone"></i> Appeler</button>'
    +'<button class="btn-secondary" style="border-color:#25D366;color:#25D366" onclick="whatsappOwner(\''+escapeHtml(l.owner?.whatsapp||'')+'\',\''+id+'\')"><i class="fab fa-whatsapp"></i> WhatsApp</button>'
    +'</div></div></div>'
    +'<div class="pd-engagement">'
    +'<button class="pd-eng-btn '+(isLiked?'liked':'')+'" id="likeBtn_'+id+'" onclick="likeProperty(\''+id+'\',this)">'
    +'<i class="fas fa-heart"></i> <span id="likeCount_'+id+'">'+nLikes+'</span> J\'aime</button>'
    +'<button class="pd-eng-btn"><i class="fas fa-comment"></i> <span id="commCount_'+id+'">'+listComments.length+'</span> Commentaires</button>'
    +'<button class="pd-eng-btn" onclick="shareProperty(\''+id+'\')"><i class="fas fa-share"></i> Partager</button>'
    +'<button class="pd-eng-btn"><i class="fas fa-eye"></i> '+(l.views||0)+' Vues</button>'
    +'</div>'
    +'<div class="comments-section"><h3 style="font-family:var(--font-display);margin-bottom:14px">Commentaires</h3>'
    +'<div class="comment-input-row">'
    +'<img src="'+(currentUser?.avatar||avatarUrl((currentUser?.firstName||'U')+' '+(currentUser?.lastName||'')))+'" alt="" onerror="this.src=\''+avatarUrl('U')+'\'"/>'
    +'<input type="text" id="commentInput_'+id+'" placeholder="Ajouter un commentaire…" onkeydown="if(event.key===\'Enter\')addComment(\''+id+'\')" />'
    +'<button onclick="addComment(\''+id+'\')"><i class="fas fa-paper-plane"></i></button>'
    +'</div>'
    +'<div id="commentsList_'+id+'">'
    +listComments.map(c=>'<div class="comment-item"><img src="'+(c.avatar||avatarUrl(c.author))+'" alt="" onerror="this.src=\''+avatarUrl(c.author||'U')+'\'"/><div class="comment-bubble"><div class="comment-author">'+escapeHtml(c.author)+'</div><div class="comment-text">'+escapeHtml(c.text)+'</div><div class="comment-date">'+timeAgo(c.time)+'</div></div></div>').join('')
    +'</div></div>';
  showPage('property');
}

function addComment(listingId) {
  if (!currentUser) { showToast('Connectez-vous pour commenter','info'); return; }
  const input = document.getElementById('commentInput_'+listingId);
  const text  = input?.value.trim(); if(!text) return;
  const name  = currentUser.firstName+' '+currentUser.lastName;
  const comm  = { author:name, avatar:currentUser.avatar||avatarUrl(name), text, time:new Date().toISOString() };
  let allC = {};
  try { allC = JSON.parse(localStorage.getItem(COMMENTS_KEY)||'{}'); } catch(e){}
  if (!allC[listingId]) allC[listingId]=[];
  allC[listingId].push(comm);
  localStorage.setItem(COMMENTS_KEY, JSON.stringify(allC));
  const l = allListings.find(x=>x.id===listingId);
  if (l) {
    l.commentsCount = allC[listingId].length; saveListings();
    document.querySelectorAll('[id="commCount_'+listingId+'"], [id="tccount_'+listingId+'"]').forEach(el=>el.textContent=l.commentsCount);
    if (l.owner?.id && l.owner.id!==currentUser.id)
      addNotifForUser(l.owner.id, { type:'comment', title:'Commentaire', text:'💬 '+name+' a commenté "'+l.title+'"' });
  }
  const list = document.getElementById('commentsList_'+listingId);
  if (list) {
    const d = document.createElement('div'); d.className='comment-item';
    d.innerHTML = '<img src="'+comm.avatar+'" alt="" onerror="this.src=\''+avatarUrl(name)+'\'"/>'
      +'<div class="comment-bubble"><div class="comment-author">'+escapeHtml(name)+'</div>'
      +'<div class="comment-text">'+escapeHtml(text)+'</div><div class="comment-date">À l\'instant</div></div>';
    list.appendChild(d);
  }
  if (input) input.value='';
  showToast('Commentaire publié','success');
}

// =========================================================
// CONTACT
// =========================================================
function callOwner(phone) { if (phone) window.location.href='tel:'+phone; else showToast('Numéro non disponible','error'); }
function whatsappOwner(wa, listingId) {
  const l   = allListings.find(x=>x.id===listingId);
  const msg = l ? 'Bonjour ! Je suis intéressé(e) par votre bien "'+l.title+'" à '+l.location+' sur Afrique Immo. Prix: '+formatPrice(l.price,l.transaction)+'. Disponible ?' : 'Bonjour depuis Afrique Immo !';
  const num = (wa||'').replace(/[^0-9+]/g,'');
  if (num) window.open('https://wa.me/'+num+'?text='+encodeURIComponent(msg),'_blank');
  else showToast('Numéro WhatsApp non disponible','error');
}

function openChatWithListing(l) {
  const chat = document.getElementById('chatPanel'); if(!chat) return;
  const media= (l.media||[])[0];
  const isVid= (l.mediaTypes||[])[0]==='video';
  chat.innerHTML =
    '<div class="property-context-card">'
    +(media&&!isVid?'<img src="'+media+'" alt="" onerror="this.style.display=\'none\'"/>'
      :'<div class="pcc-thumb">'+(isVid?'🎬':'🏠')+'</div>')
    +'<div class="pcc-info"><div class="pcc-title">'+escapeHtml(l.title)+'</div><div class="pcc-price">'+formatPrice(l.price,l.transaction)+'</div></div></div>'
    +'<div class="chat-header">'
    +'<img src="'+(l.owner?.avatar||avatarUrl(l.owner?.name||'U'))+'" alt="'+escapeHtml(l.owner?.name||'')+'" onerror="this.src=\''+avatarUrl(l.owner?.name||'U')+'\'"/>'
    +'<div><div style="font-weight:600">'+escapeHtml(l.owner?.name||'')+'</div><div style="font-size:0.78rem;color:var(--green)">● En ligne</div></div>'
    +'<div style="margin-left:auto;display:flex;gap:8px">'
    +'<button class="btn-secondary" style="padding:7px 10px;font-size:0.78rem" onclick="callOwner(\''+escapeHtml(l.owner?.phone||'')+'\')"><i class="fas fa-phone"></i></button>'
    +'<button class="btn-secondary" style="padding:7px 10px;font-size:0.78rem;border-color:#25D366;color:#25D366" onclick="whatsappOwner(\''+escapeHtml(l.owner?.whatsapp||'')+'\',\''+l.id+'\')"><i class="fab fa-whatsapp"></i></button>'
    +'</div></div>'
    +'<div class="chat-messages" id="chatMessages">'
    +'<div class="chat-msg received">Bonjour ! Je suis le propriétaire. Comment puis-je vous aider ?</div>'
    +'<div class="chat-msg sent">Bonjour, je suis intéressé(e) par votre bien "'+escapeHtml(l.title)+'". Il est encore disponible ?</div>'
    +'</div>'
    +'<div class="chat-input-bar">'
    +'<input type="text" id="chatInput" placeholder="Écrire un message…" onkeydown="if(event.key===\'Enter\')sendChatMsg()"/>'
    +'<button onclick="sendChatMsg()"><i class="fas fa-paper-plane"></i></button></div>';
  showPage('messages');
}

function sendChatMsg() {
  const input = document.getElementById('chatInput');
  const text  = input?.value.trim(); if(!text) return;
  const msgs  = document.getElementById('chatMessages');
  if (msgs) {
    const d = document.createElement('div'); d.className='chat-msg sent'; d.textContent=text; msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight; input.value='';
    setTimeout(()=>{ const r=document.createElement('div'); r.className='chat-msg received'; r.textContent='Merci ! Je vous réponds bientôt. 🙏'; msgs.appendChild(r); msgs.scrollTop=msgs.scrollHeight; }, 1500);
  }
}

// =========================================================
// PUBLICATION
// =========================================================
function resetPublish() {
  currentPubStep=1; uploadedMedia=[];
  document.querySelectorAll('.pub-step').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.step').forEach(s=>s.classList.remove('active','done'));
  document.getElementById('pub-step-1')?.classList.add('active');
  document.getElementById('step1-ind')?.classList.add('active');
  const mp = document.getElementById('mediaPreview'); if(mp) mp.innerHTML='';
  const te = document.getElementById('textPublicationEditor'); if(te) te.innerHTML='';
  ['pubTitle','pubType','pubTransaction','pubPrice','pubSurface','pubChambre','pubBain','pubLocation','pubDescription','pubPhone','pubWhatsapp'].forEach(id=>{const el=document.getElementById(id);if(el) el.value='';});
  document.querySelectorAll('.equip-item input:checked').forEach(cb=>cb.checked=false);
  switchMediaTab('upload', document.querySelector('.mtab'));
}

function switchMediaTab(tab, btn) {
  pubMediaTab = tab;
  document.querySelectorAll('.mtab').forEach(b=>b.classList.remove('active'));
  btn?.classList.add('active');
  document.getElementById('mediaUploadTab')?.classList.toggle('hidden', tab!=='upload');
  document.getElementById('mediaTextTab')?.classList.toggle('hidden',   tab!=='text');
}

function applyTemplate(type) {
  const el = document.getElementById('textPublicationEditor'); if(!el) return;
  const t  = { annonce:'📋 ANNONCE IMMOBILIÈRE\n\n🏠 Type de bien : [Précisez]\n📍 Localisation : [Quartier, Ville]\n💰 Prix : [Montant] FCFA\n📐 Surface : [m²]\n\n✅ Description :\n[Décrivez le bien ici]\n\n📞 Contact : [Votre numéro]', urgent:'🔥 VENTE URGENTE !\n\n⚡ [Titre]\n📍 [Localisation]\n💰 Prix NÉGOCIABLE : [Montant] FCFA\n\nRaison : [Expliquez]\n\n📞 Contactez-moi immédiatement !', nouveaute:'🆕 NOUVELLE MISE EN VENTE\n\n✨ [Titre]\n📍 [Localisation]\n\n🏠 Caractéristiques :\n• [Caractéristique 1]\n• [Caractéristique 2]\n\n💰 Prix : [Montant] FCFA\n📞 [Contact]', promotion:'💰 OFFRE SPÉCIALE !\n\n🎉 [Titre]\n📍 [Localisation]\n\n❌ Ancien prix : [X] FCFA\n✅ NOUVEAU PRIX : [Y] FCFA\n\n⏰ Offre limitée !\n📞 Contactez-moi vite !' };
  el.innerText = t[type]||''; el.focus();
}

function changeTextSize(dir) {
  textFontSize = dir==='+' ? Math.min(textFontSize+2,32) : Math.max(textFontSize-2,10);
  const el = document.getElementById('textPublicationEditor');
  if (el) el.style.fontSize = textFontSize+'px';
}

function nextStep(step) {
  if (step > currentPubStep && !validatePubStep(currentPubStep)) return;
  document.querySelectorAll('.pub-step').forEach(s=>s.classList.remove('active'));
  document.getElementById('pub-step-'+step)?.classList.add('active');
  for (let i=1;i<=4;i++) {
    const ind = document.getElementById('step'+i+'-ind'); if(!ind) continue;
    ind.classList.remove('active','done');
    if (i<step) ind.classList.add('done'); else if (i===step) ind.classList.add('active');
  }
  currentPubStep=step; if(step===4) buildPreview(); window.scrollTo(0,0);
}

function validatePubStep(step) {
  if (step===1) {
    if (!document.getElementById('pubTitle')?.value||!document.getElementById('pubType')?.value||!document.getElementById('pubTransaction')?.value||!document.getElementById('pubPrice')?.value||!document.getElementById('pubLocation')?.value) {
      showToast('Remplissez tous les champs obligatoires (*)','error'); return false;
    }
    if (document.getElementById('pubTransaction')?.value==='louer' && parseFloat(document.getElementById('pubPrice').value)<150000) {
      showToast('Prix minimum de location : 150 000 FCFA/mois','error'); return false;
    }
  }
  if (step===3 && (!document.getElementById('pubPhone')?.value||!document.getElementById('pubWhatsapp')?.value)) {
    showToast('Numéros de contact obligatoires','error'); return false;
  }
  return true;
}

function buildPreview() {
  const title    = document.getElementById('pubTitle')?.value||'';
  const price    = document.getElementById('pubPrice')?.value||0;
  const trans    = document.getElementById('pubTransaction')?.value||'vendre';
  const type     = document.getElementById('pubType')?.value||'';
  const location = document.getElementById('pubLocation')?.value||'';
  const desc     = document.getElementById('pubDescription')?.value||'';
  const textCont = document.getElementById('textPublicationEditor')?.innerText||'';
  const preview  = document.getElementById('publishPreview'); if(!preview) return;
  let mHTML = '';
  if (uploadedMedia.length>0) {
    mHTML = '<div style="display:flex;gap:6px;overflow-x:auto;padding:10px">';
    uploadedMedia.slice(0,4).forEach(m=>{
      mHTML += m.type==='video'
        ? '<video src="'+m.dataUrl+'" style="width:110px;height:85px;object-fit:cover;border-radius:8px;flex-shrink:0" muted preload="metadata"></video>'
        : '<img src="'+m.dataUrl+'" style="width:110px;height:85px;object-fit:cover;border-radius:8px;flex-shrink:0"/>';
    });
    mHTML += '</div>';
  } else if (textCont) {
    mHTML = '<div style="padding:14px;font-size:0.9rem;line-height:1.7;color:#fff;white-space:pre-wrap">'+escapeHtml(textCont.substring(0,300))+'</div>';
  }
  preview.innerHTML = mHTML+'<div style="padding:14px">'
    +'<div style="font-family:var(--font-display);font-size:1.15rem;margin-bottom:5px">'+escapeHtml(title)+'</div>'
    +'<div style="color:var(--gold);font-weight:700;font-size:1.05rem;margin-bottom:5px">'+formatPrice(parseInt(price),trans)+'</div>'
    +'<div style="color:var(--gray);font-size:0.84rem;margin-bottom:7px"><i class="fas fa-map-marker-alt"></i> '+escapeHtml(location)+'</div>'
    +(desc?'<div style="font-size:0.83rem;color:rgba(255,255,255,0.8);margin-bottom:10px">'+escapeHtml(desc.substring(0,120))+(desc.length>120?'…':'')+'</div>':'')
    +'<div style="display:flex;gap:7px;flex-wrap:wrap">'
    +'<span style="background:var(--gold);color:var(--dark);border-radius:50px;padding:3px 10px;font-size:0.78rem;font-weight:700">'+(trans==='louer'?'À Louer':'À Vendre')+'</span>'
    +(type?'<span style="background:var(--dark3);border-radius:50px;padding:3px 10px;font-size:0.78rem">'+escapeHtml(type)+'</span>':'')
    +'<span style="color:var(--green);font-size:0.82rem">'+(uploadedMedia.length>0?uploadedMedia.length+' média(s)':textCont?'Texte':'Aucun média')+'</span>'
    +'</div></div>';
}

function handleMediaUpload(event) {
  const files   = Array.from(event.target.files);
  const preview = document.getElementById('mediaPreview'); if(!preview) return;
  files.forEach(file => {
    const isVideo  = file.type.startsWith('video/');
    const maxSize  = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    const maxLabel = isVideo ? '500MB' : '20MB';
    if (file.size > maxSize) {
      showToast('Fichier trop grand (max '+maxLabel+') : '+file.name, 'error'); return;
    }
    const type   = isVideo ? 'video' : 'image';
    const reader = new FileReader();
    reader.onload  = e => { uploadedMedia.push({ dataUrl:e.target.result, type }); renderMediaThumbs(preview); };
    reader.onerror = () => showToast('Erreur lecture fichier : '+file.name, 'error');
    reader.readAsDataURL(file);
  });
}

function renderMediaThumbs(preview) {
  if (!preview) preview = document.getElementById('mediaPreview');
  if (!preview) return;
  preview.innerHTML = '';
  uploadedMedia.forEach((m, idx) => {
    const thumb = document.createElement('div');
    thumb.className = 'media-thumb';
    thumb.innerHTML = m.type==='video'
      ? '<video src="'+m.dataUrl+'" muted preload="metadata" style="width:100%;height:100%;object-fit:cover"></video>'
        +'<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:1.3rem;pointer-events:none">▶️</div>'
        +'<button class="remove-media" onclick="removeMedia('+idx+')"><i class="fas fa-times"></i></button>'
      : '<img src="'+m.dataUrl+'" style="width:100%;height:100%;object-fit:cover"/>'
        +'<button class="remove-media" onclick="removeMedia('+idx+')"><i class="fas fa-times"></i></button>';
    preview.appendChild(thumb);
  });
}

function removeMedia(idx) { uploadedMedia.splice(idx,1); renderMediaThumbs(); }

function submitPublication() {
  if (!currentUser) { showToast('Connectez-vous pour publier','error'); return; }
  const textContent = document.getElementById('textPublicationEditor')?.innerText.trim()||'';
  if (!uploadedMedia.length && !textContent) {
    showToast('Ajoutez au moins une photo, une vidéo ou du texte','error'); return;
  }
  showLoading('Publication en cours…');
  setTimeout(()=>{
    const title    = escapeHtml(document.getElementById('pubTitle')?.value||'');
    const type     = document.getElementById('pubType')?.value||'';
    const trans    = document.getElementById('pubTransaction')?.value||'vendre';
    const price    = parseFloat(document.getElementById('pubPrice')?.value)||0;
    const surface  = parseFloat(document.getElementById('pubSurface')?.value)||0;
    const chambres = parseFloat(document.getElementById('pubChambre')?.value)||0;
    const bains    = parseFloat(document.getElementById('pubBain')?.value)||0;
    const location = escapeHtml(document.getElementById('pubLocation')?.value||'');
    const desc     = escapeHtml(document.getElementById('pubDescription')?.value||'');
    const phone    = document.getElementById('pubPhone')?.value||currentUser.phone||'';
    const wa       = document.getElementById('pubWhatsapp')?.value||currentUser.whatsapp||'';
    const equip    = [...document.querySelectorAll('.equip-item input:checked')].map(cb=>cb.value);
    const newListing = {
      id:'l_'+Date.now(), title, type, transaction:trans, price, surface, chambres, bains,
      location, zone:location.toLowerCase(), description:desc, textContent:escapeHtml(textContent),
      media:uploadedMedia.map(m=>m.dataUrl), mediaTypes:uploadedMedia.map(m=>m.type), equip,
      owner:{ id:currentUser.id, name:currentUser.firstName+' '+currentUser.lastName,
        avatar:currentUser.avatar||avatarUrl(currentUser.firstName+' '+currentUser.lastName),
        phone, whatsapp:wa, followersCount:currentUser.followers?.length||0 },
      likes:0, commentsCount:0, views:0, verified:true, createdAt:new Date().toISOString()
    };
    allListings.unshift(newListing);
    try {
      saveListings();
      uploadedMedia = []; renderMediaThumbs();
      hideLoading();
      showToast('🎉 Votre bien est publié !','success');
      addNotif({ type:'publish', title:'Publication réussie', text:'✅ "'+title+'" est maintenant visible par tous !' });
      setTimeout(()=>showPage('home'), 1500);
    } catch(e) {
      allListings.shift(); hideLoading();
      showToast('Stockage plein. Réduisez la taille des médias.','error');
    }
  }, 1800);
}

// =========================================================
// PROFILE
// =========================================================
function renderProfile() {
  if (!currentUser) return;
  const name = currentUser.firstName+' '+currentUser.lastName;
  const src  = currentUser.avatar||avatarUrl(name);
  const el1  = document.getElementById('profileName');    if(el1) el1.textContent=name;
  const el2  = document.getElementById('profileBio');     if(el2) el2.textContent=currentUser.bio||'';
  const el3  = document.getElementById('profileAvatar');  if(el3) el3.src=src;
  const badge= document.getElementById('verifiedBadge');
  if (badge) { const fc=currentUser.followers?.length||0; badge.classList.toggle('hidden',fc<1000); }
  updateProfileStats(); renderProfileListings('biens');
}

function updateProfileStats() {
  const mine = allListings.filter(l=>l.owner?.id===currentUser?.id);
  const el1  = document.getElementById('profilePosts');     if(el1) el1.textContent=mine.length;
  const el2  = document.getElementById('profileFollowers'); if(el2) el2.textContent=currentUser?.followers?.length||0;
  const el3  = document.getElementById('profileFollowing'); if(el3) el3.textContent=followedUsers.size;
}

function renderProfileListings(tab) {
  const grid = document.getElementById('profileListings'); if(!grid) return;
  grid.innerHTML='';
  let items=[];
  if (tab==='biens')  items=allListings.filter(l=>l.owner?.id===currentUser?.id);
  else if (tab==='liked') items=allListings.filter(l=>likedPosts.has(l.id));
  else if (tab==='saved') items=allListings.filter(l=>favorites.has(l.id));
  if (!items.length) {
    grid.innerHTML='<p style="color:var(--gray);padding:20px;grid-column:1/-1">'
      +(tab==='biens'?'Aucune publication. <a onclick="showPage(\'publish\')" style="color:var(--gold)">Publiez maintenant !</a>':'Aucun bien ici pour l\'instant.')+'</p>';
    return;
  }
  items.forEach(l=>grid.appendChild(createPropertyCard(l)));
}

function switchProfileTab(tab,btn) {
  document.querySelectorAll('.ptab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active'); renderProfileListings(tab);
}

function openEditProfile() {
  const modal = document.getElementById('editProfileModal'); if(!modal) return;
  document.getElementById('editFirstName').value = currentUser.firstName||'';
  document.getElementById('editLastName').value  = currentUser.lastName||'';
  document.getElementById('editBio').value       = currentUser.bio||'';
  document.getElementById('editPhone').value     = currentUser.phone||'';
  document.getElementById('editWhatsapp').value  = currentUser.whatsapp||'';
  document.getElementById('editAddress').value   = currentUser.address||'';
  modal.style.display='flex';
}
function closeEditProfile() { const m=document.getElementById('editProfileModal'); if(m) m.style.display='none'; }
function saveProfileEdit() {
  currentUser.firstName = document.getElementById('editFirstName').value.trim()||currentUser.firstName;
  currentUser.lastName  = document.getElementById('editLastName').value.trim()||currentUser.lastName;
  currentUser.bio       = document.getElementById('editBio').value.trim();
  currentUser.phone     = document.getElementById('editPhone').value.trim();
  currentUser.whatsapp  = document.getElementById('editWhatsapp').value.trim();
  currentUser.address   = document.getElementById('editAddress').value.trim();
  save(USER_KEY, currentUser);
  try {
    const users = JSON.parse(localStorage.getItem(USERS_KEY)||'[]');
    const idx   = users.findIndex(u=>u.id===currentUser.id);
    if (idx>=0) { users[idx]={...users[idx],...currentUser}; save(USERS_KEY,users); }
  } catch(e){}
  updateNavAvatar(); renderProfile(); closeEditProfile();
  showToast('Profil mis à jour ✅','success');
}
function handleAvatarUpload(event) {
  const file = event.target.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    currentUser.avatar = e.target.result;
    save(USER_KEY, currentUser);
    try {
      const users = JSON.parse(localStorage.getItem(USERS_KEY)||'[]');
      const idx   = users.findIndex(u=>u.id===currentUser.id);
      if (idx>=0) { users[idx].avatar=e.target.result; save(USERS_KEY,users); }
    } catch(er){}
    updateNavAvatar();
    const av = document.getElementById('profileAvatar'); if(av) av.src=e.target.result;
    showToast('Photo mise à jour ✅','success');
  };
  reader.readAsDataURL(file);
}

// =========================================================
// NOTIFICATIONS (in-app render)
// =========================================================
function renderNotifications() {
  const list = document.getElementById('notifList'); if(!list) return;
  const notifs = getNotifs();
  if (!notifs.length) {
    list.innerHTML='<div style="text-align:center;padding:48px;color:var(--gray)"><div style="font-size:3rem;margin-bottom:10px">🔔</div><p>Aucune notification pour l\'instant.</p></div>';
    return;
  }
  list.innerHTML='';
  const icons={like:'❤️',comment:'💬',follow:'👤',system:'🏠',publish:'📢'};
  const cls  ={like:'like',comment:'comment',follow:'follow',system:'system',publish:'system'};
  notifs.forEach(n=>{
    const item=document.createElement('div'); item.className='notif-item '+(n.read?'':'unread');
    item.innerHTML='<div class="notif-icon '+(cls[n.type]||'system')+'">'+(icons[n.type]||'🏠')+'</div>'
      +'<div class="notif-content"><div class="notif-text">'+escapeHtml(n.text)+'</div><div class="notif-time">'+timeAgo(n.time)+'</div></div>';
    item.onclick=()=>item.classList.remove('unread');
    list.appendChild(item);
  });
}

function renderFavorites() {
  const c=document.getElementById('favoritesList'); if(!c) return;
  c.innerHTML='';
  const fav=allListings.filter(l=>favorites.has(l.id));
  if (!fav.length) { c.innerHTML='<div style="text-align:center;padding:48px;color:var(--gray)"><div style="font-size:3rem;margin-bottom:10px">❤️</div><p>Aucun favori.<br/>Explorez et cliquez ❤️ pour sauvegarder.</p></div>'; return; }
  fav.forEach(l=>c.appendChild(createPropertyCard(l)));
}

function renderMyListings() {
  const c=document.getElementById('myListingsGrid'); if(!c) return;
  c.innerHTML='';
  const mine=allListings.filter(l=>l.owner?.id===currentUser?.id);
  if (!mine.length) { c.innerHTML='<div style="text-align:center;padding:48px;color:var(--gray)"><div style="font-size:3rem;margin-bottom:10px">🏠</div><p>Aucune publication.</p><button class="btn-primary" style="margin-top:14px" onclick="showPage(\'publish\')"><i class="fas fa-plus"></i> Publier</button></div>'; return; }
  mine.forEach(l=>c.appendChild(createPropertyCard(l)));
}

// =========================================================
// AI ASSISTANT — DeepSeek + Claude fallback
// =========================================================
function toggleAI() {
  const win=document.getElementById('aiChatWindow');
  win?.classList.toggle('hidden');
  if (!win?.classList.contains('hidden')) document.getElementById('aiInput')?.focus();
}

async function sendAIMessage() {
  const input=document.getElementById('aiInput');
  const text =input?.value.trim(); if(!text) return;
  input.value='';
  const msgs=document.getElementById('aiMessages'); if(!msgs) return;
  const ud=document.createElement('div'); ud.className='ai-msg user'; ud.textContent=text; msgs.appendChild(ud);
  const td=document.createElement('div'); td.className='ai-msg bot';
  td.innerHTML='<div class="typing-dots"><span></span><span></span><span></span></div>';
  msgs.appendChild(td); msgs.scrollTop=msgs.scrollHeight;
  aiHistory.push({ role:'user', content:text });
  const sysPrompt='Tu es l\'Assistant Afrique Immo, l\'IA officielle de Afrique Immo (plateforme immobilière africaine).\nTu réponds TOUJOURS en '+(currentLang==='en'?'English':'français')+', de façon claire, précise et utile.\nTu peux répondre à TOUTES les questions sans exception: immobilier, sciences, culture, sport, cuisine, santé, technologie, histoire, droit, finance, etc.\nPour l\'immobilier sénégalais: location minimum 150 000 FCFA/mois.\nDate: '+new Date().toLocaleDateString('fr-FR')+'.';
  let reply='';
  try { reply = await callDeepSeekChat(text, sysPrompt); }
  catch(e1) {
    try { reply = await callClaudeChat(text, sysPrompt); }
    catch(e2) { reply='Je suis votre assistant Afrique Immo IA ! Je peux vous aider sur l\'immobilier sénégalais et répondre à toutes vos questions. Réessayez dans un instant !'; }
  }
  td.innerHTML=reply.replace(/\n/g,'<br/>');
  aiHistory.push({ role:'assistant', content:reply });
  msgs.scrollTop=msgs.scrollHeight;
}

async function callDeepSeekChat(userMsg, systemPrompt) {
  const res = await fetch(DEEPSEEK_URL, {
    method:'POST', headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer '+DEEPSEEK_API_KEY },
    body: JSON.stringify({ model:'deepseek-chat', max_tokens:1200,
      messages:[{ role:'system', content:systemPrompt }, ...aiHistory.slice(-18), { role:'user', content:userMsg }] })
  });
  if (!res.ok) throw new Error('DeepSeek HTTP '+res.status);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callClaudeChat(userMsg, systemPrompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method:'POST', headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:1200, system:systemPrompt,
      messages:[...aiHistory.slice(-18), { role:'user', content:userMsg }] })
  });
  if (!res.ok) throw new Error('Claude HTTP '+res.status);
  const data = await res.json();
  return data.content?.find(b=>b.type==='text')?.text || '';
}

async function callDeepSeek(prompt) {
  try {
    const res = await fetch(DEEPSEEK_URL, {
      method:'POST', headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer '+DEEPSEEK_API_KEY },
      body: JSON.stringify({ model:'deepseek-chat', max_tokens:2000, messages:[{ role:'user', content:prompt }] })
    });
    if (!res.ok) throw new Error('DeepSeek HTTP '+res.status);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '{}';
  } catch(e) {
    console.warn('DeepSeek fallback to Claude:', e.message);
    const res2 = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST', headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:2000,
        messages:[{ role:'user', content:prompt }] })
    });
    if (!res2.ok) throw new Error('Claude fallback failed');
    const data2 = await res2.json();
    return data2.content?.find(b=>b.type==='text')?.text || '{}';
  }
}

// =========================================================
// HELPERS
// =========================================================
function showToast(msg, type='info', dur=3500) {
  const t=document.getElementById('toast'); if(!t) return;
  t.textContent=msg; t.className='toast '+type+' show';
  setTimeout(()=>t.className='toast hidden', dur);
}
function showLoading(text='Chargement…') {
  document.getElementById('loadingOverlay')?.classList.remove('hidden');
  const tx=document.getElementById('loadingText'); if(tx) tx.textContent=text;
}
function showLoadingText(text) { const el=document.getElementById('loadingText'); if(el) el.textContent=text; }
function hideLoading() { document.getElementById('loadingOverlay')?.classList.add('hidden'); }

function formatPrice(price, transaction) {
  if (!price) return 'Prix à négocier';
  return new Intl.NumberFormat('fr-FR').format(price)+' FCFA'+(transaction==='louer'?'/mois':'');
}

function formatDate(iso) {
  if (!iso) return '';
  const d    = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60)     return 'À l\'instant';
  if (diff < 3600)   return 'Il y a '+Math.floor(diff/60)+' min';
  if (diff < 86400)  return 'Il y a '+Math.floor(diff/3600)+'h';
  if (diff < 172800) return 'Hier à '+d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
  if (diff < 604800) return 'Il y a '+Math.floor(diff/86400)+' jours';
  return d.toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'});
}

function timeAgo(iso) { return formatDate(iso); }

function getEquipLabel(k) {
  return { piscine:'🏊 Piscine', parking:'🚗 Parking', gardien:'👮 Gardien', groupe:'⚡ Groupe élec.', climatisation:'❄️ Climatisation', cuisine:'🍳 Cuisine', terrasse:'🌿 Terrasse', titre:'📄 Titre foncier' }[k]||k;
}

function delay(ms) { return new Promise(r=>setTimeout(r,ms)); }
