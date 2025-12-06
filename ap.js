// VoteNow — Application de vote sécurisée - VERSION COMPLÈTE ET PROFESSIONNELLE

// ========== CONSTANTES ==========
const LS_CANDIDATES = 'votenow_candidates';
const LS_VOTES = 'votenow_votes';
const LS_VOTED_IDS = 'votenow_voted_ids';
const LS_SESSION_ADMIN = 'sessionAdmin';
const LS_VOTING_OPEN = 'votenow_voting_open';
const LS_VOTERS = 'votenow_voters';
const LS_CURRENT_VOTER = 'votenow_current_voter';

const ADMINS = [
  { id: "admin01", code: "code123" },
  { id: "admin02", code: "code456" },
  { id: "admin03", code: "code789" }
];

let sessionAdmin = null;
let currentVoter = null;

// ========== INITIALISATION DOM ==========
function initDOM() {
  sessionAdmin = loadJSON(LS_SESSION_ADMIN, null);
  currentVoter = loadJSON(LS_CURRENT_VOTER, null);
}

// ========== UTILITAIRES ==========
function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.error(`Erreur chargement ${key}:`, e);
    return fallback;
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Erreur sauvegarde ${key}:`, e);
  }
}

function escapeHTML(str) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(str).replace(/[&<>"']/g, s => map[s]);
}

function cryptoRandomId() {
  return 'C' + Math.random().toString(36).slice(2, 8);
}

function generateVoteIdentifier() {
  const time = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `VOT-${time}-${rand}`;
}

function showMessage(element, text, type = 'success') {
  if (!element) return;
  element.textContent = text;
  element.className = `message ${type}`;
  setTimeout(() => {
    element.textContent = '';
    element.className = 'message';
  }, 4000);
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve('');
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Erreur lecture fichier'));
    reader.readAsDataURL(file);
  });
}

// ========== SÉLECTEURS DOM ==========
const tabButtons = document.querySelectorAll('.tab-btn');
const tabs = {
  vote: document.getElementById('tab-vote'),
  results: document.getElementById('tab-results'),
  candidates: document.getElementById('tab-candidates'),
  admin: document.getElementById('tab-admin')
};

// Vote section
const candidateListVote = document.getElementById('candidateListVote');
const voterRegistrationForm = document.getElementById('voterRegistrationForm');
const voterRegistrationMsg = document.getElementById('voterRegistrationMsg');
const voterIdentifierDisplay = document.getElementById('voterIdentifierDisplay');
const voteForm = document.getElementById('voteForm');
const voteMsg = document.getElementById('voteMsg');

// Results section
const resultsTable = document.getElementById('resultsTable');
const winnerBox = document.getElementById('winnerBox');
const barChart = document.getElementById('barChart');
const voteCount = document.getElementById('voteCount');

// Candidates section
const candidatesPageList = document.getElementById('candidatesPageList');

// Admin section
const adminLogin = document.getElementById('admin-login');
const adminPanel = document.getElementById('admin-panel');
const adminLoginForm = document.getElementById('admin-login-form');
const adminLogoutBtn = document.getElementById('admin-logout');
const adminLoginMessage = document.getElementById('admin-login-message');
const adminInfo = document.getElementById('admin-info');
const createCandidateForm = document.getElementById('createCandidateForm');
const adminMsg = document.getElementById('adminMsg');
const candidateListAdmin = document.getElementById('candidateListAdmin');
const adminHeader = adminPanel ? adminPanel.querySelector('.admin-header') : null;

// PDF modal
const pdfModal = document.getElementById('pdfModal');
const pdfViewer = document.getElementById('pdfViewer');
const pdfCloseBtn = document.getElementById('pdfCloseBtn');
const pdfDownloadLink = document.getElementById('pdfDownloadLink');
const pdfOpenNewTab = document.getElementById('pdfOpenNewTab');

// Edit modal
const editCandidateModal = document.getElementById('editCandidateModal');
const editCandidateForm = editCandidateModal ? document.getElementById('editCandidateForm') : null;
const editCloseBtn = editCandidateModal ? document.getElementById('editCloseBtn') : null;
const editCancelBtn = editCandidateModal ? document.getElementById('editCancelBtn') : null;
const editMsg = editCandidateModal ? document.getElementById('editMsg') : null;

// Admin stats
const adminVoteCount = document.getElementById('adminVoteCount');
const adminVoterCount = document.getElementById('adminVoterCount');
const adminParticipationRate = document.getElementById('adminParticipationRate');
const adminVotesList = document.getElementById('adminVotesList');
const adminResetVotesBtn = document.getElementById('adminResetVotesBtn');
const adminExportVotesBtn = document.getElementById('adminExportVotesBtn');
const adminViewReportBtn = document.getElementById('adminViewReportBtn');

let editingCandidateId = null;

// ========== MODÈLE - DONNÉES ==========
function getCandidates() { return loadJSON(LS_CANDIDATES, []); }
function setCandidates(arr) { saveJSON(LS_CANDIDATES, arr); }
function getVotes() { return loadJSON(LS_VOTES, []); }
function setVotes(arr) { saveJSON(LS_VOTES, arr); }
function getVotedIds() { return loadJSON(LS_VOTED_IDS, []); }
function setVotedIds(arr) { saveJSON(LS_VOTED_IDS, arr); }
function getVoters() { return loadJSON(LS_VOTERS, []); }
function setVoters(arr) { saveJSON(LS_VOTERS, arr); }

function hasVoted(voterId) {
  const ids = new Set(getVotedIds().map(x => String(x).trim().toLowerCase()));
  return ids.has(String(voterId).trim().toLowerCase());
}

function getVoterByIne(ine) {
  return getVoters().find(v => String(v.ine).trim().toLowerCase() === String(ine).trim().toLowerCase());
}

// ========== GESTION VOTE OUVERT/FERMÉ ==========
function isVotingOpen() {
  const raw = localStorage.getItem(LS_VOTING_OPEN);
  return raw === null ? true : JSON.parse(raw) === true;
}

function setVotingOpen(open) {
  saveJSON(LS_VOTING_OPEN, !!open);
  updateVotingStateUI();
  renderAdminVotingToggle();
  renderSiteStatusBanner();
}

function updateVotingStateUI() {
  const open = isVotingOpen();
  if (voteForm) {
    const inputs = voteForm.querySelectorAll('input, button[type="submit"]');
    inputs.forEach(el => el.disabled = !open || !currentVoter);
  }
  renderSiteStatusBanner();
}

function renderSiteStatusBanner() {
  let banner = document.getElementById('siteStatusBanner');
  const open = isVotingOpen();

  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'siteStatusBanner';
    banner.style.cssText = 'position: sticky; top: 64px; z-index: 999; text-align: center; padding: 10px 12px; font-weight: 600; display: none;';
    document.body.insertBefore(banner, document.querySelector('main'));
  }

  if (!open) {
    banner.textContent = '🔒 Les votes sont fermés — Vous pouvez consulter les candidats et les résultats.';
    banner.style.background = '#fffbeb';
    banner.style.color = '#92400e';
    banner.style.borderBottom = '1px solid #f59e0b';
    banner.style.display = 'block';
  } else {
    banner.style.display = 'none';
  }
}

// ========== INSCRIPTION VOTANT ==========
if (voterRegistrationForm) {
  voterRegistrationForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const firstname = document.getElementById('voterFirstname').value.trim();
    const lastname = document.getElementById('voterLastname').value.trim();
    const ine = document.getElementById('voterIne').value.trim();

    if (!firstname || !lastname || !ine) {
      showMessage(voterRegistrationMsg, '⚠️ Veuillez remplir tous les champs', 'warning');
      return;
    }

    if (getVoterByIne(ine)) {
      showMessage(voterRegistrationMsg, '❌ Cet INE est déjà inscrit.', 'error');
      return;
    }

    const voteId = generateVoteIdentifier();
    const voters = getVoters();
    voters.push({
      id: cryptoRandomId(),
      firstname,
      lastname,
      ine,
      voteId,
      timestamp: Date.now()
    });
    setVoters(voters);

    currentVoter = { firstname, lastname, ine, voteId };
    saveJSON(LS_CURRENT_VOTER, currentVoter);

    voterRegistrationForm.reset();
    document.getElementById('voteIdentifierId').value = voteId;

    showVoterIdentifier(voteId, firstname, lastname);
    showMessage(voterRegistrationMsg, '✅ Inscription réussie ! Votre identifiant est généré.', 'success');
    renderCandidatesForVote();
    updateVotingStateUI();
  });
}

function showVoterIdentifier(voteId, firstname, lastname) {
  if (!voterIdentifierDisplay) return;

  voterIdentifierDisplay.innerHTML = `
    <div class="card" style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border-left: 4px solid #2563eb; text-align: center;">
      <p style="margin: 0 0 12px 0; font-size: 0.95rem; color: #1e40af;">✅ Bienvenue ${escapeHTML(firstname)} ${escapeHTML(lastname)}!</p>
      <p style="margin: 0 0 8px 0; color: #1e40af; font-size: 0.9rem;">Votre identifiant de vote :</p>
      <h3 style="margin: 8px 0 16px 0; color: #1e40af; font-family: monospace; letter-spacing: 2px; font-size: 1.4rem;">${escapeHTML(voteId)}</h3>
      <p style="margin: 0 0 12px 0; font-size: 0.85rem; color: #1e40af;">Cet identifiant est prérempli dans le formulaire ci-dessous</p>
      <button type="button" class="btn btn-primary" onclick="logoutVoter()">Se déconnecter</button>
    </div>
  `;
  voterIdentifierDisplay.classList.remove('hidden');
  voterRegistrationForm.style.display = 'none';
}

window.logoutVoter = function() {
  currentVoter = null;
  localStorage.removeItem(LS_CURRENT_VOTER);
  voterIdentifierDisplay.classList.add('hidden');
  voterRegistrationForm.style.display = 'block';
  voterRegistrationForm.reset();
  document.getElementById('voteIdentifierId').value = '';
  renderCandidatesForVote();
  updateVotingStateUI();
};

// ========== GESTION ADMIN ==========
if (adminLoginForm) {
  adminLoginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('admin-id').value.trim();
    const code = document.getElementById('admin-code').value.trim();
    const match = ADMINS.find(a => a.id === id && a.code === code);

    if (match) {
      sessionAdmin = { logged: true, adminId: id, timestamp: Date.now() };
      saveJSON(LS_SESSION_ADMIN, sessionAdmin);
      showMessage(adminLoginMessage, '✅ Connexion réussie', 'success');
      adminLoginForm.reset();
      showAdminPanel();
    } else {
      showMessage(adminLoginMessage, '❌ Identifiants incorrects', 'error');
    }
  });
}

if (adminLogoutBtn) {
  adminLogoutBtn.addEventListener('click', () => {
    sessionAdmin = null;
    localStorage.removeItem(LS_SESSION_ADMIN);
    adminLoginForm.reset();
    hideAdminPanel();
    showMessage(adminLoginMessage, '✅ Déconnecté', 'success');
  });
}

function showAdminPanel() {
  adminLogin.classList.add('hidden');
  adminPanel.classList.remove('hidden');
  adminInfo.textContent = `🔐 Connecté : ${sessionAdmin.adminId}`;
  renderCandidatesForAdmin();
  renderAdminVotingToggle();
  updateVoteStatistics();

  // Rafraîchir les statistiques toutes les 2 secondes
  if (!window.adminStatsInterval) {
    window.adminStatsInterval = setInterval(() => {
      if (sessionAdmin) updateVoteStatistics();
    }, 2000);
  }
}

function hideAdminPanel() {
  adminPanel.classList.add('hidden');
  adminLogin.classList.remove('hidden');
  adminInfo.textContent = '';

  // Arrêter le rafraîchissement
  if (window.adminStatsInterval) {
    clearInterval(window.adminStatsInterval);
    window.adminStatsInterval = null;
  }
}

function initAdminSession() {
  if (sessionAdmin && sessionAdmin.logged) {
    if (ADMINS.some(a => a.id === sessionAdmin.adminId)) {
      showAdminPanel();
    } else {
      sessionAdmin = null;
      localStorage.removeItem(LS_SESSION_ADMIN);
      hideAdminPanel();
    }
  } else {
    hideAdminPanel();
  }
}

function renderAdminVotingToggle() {
  if (!adminHeader) return;
  let toggle = adminHeader.querySelector('.admin-vote-toggle');
  if (!toggle) {
    toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'btn admin-vote-toggle';
    toggle.style.marginLeft = '12px';
    toggle.addEventListener('click', () => {
      const open = isVotingOpen();
      setVotingOpen(!open);
      showMessage(adminMsg, !open ? '✅ Votes rouverts' : '✅ Votes fermés', 'success');
    });
    adminHeader.appendChild(toggle);
  }
  const isOpen = isVotingOpen();
  toggle.textContent = isOpen ? '🔓 Fermer les votes' : '🔒 Ouvrir les votes';
}

// ========== NAVIGATION ONGLETS ==========
tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;

    if (tab === 'admin' && !sessionAdmin) {
      adminLoginMessage.textContent = '⚠️ Connexion requise';
      adminLoginMessage.className = 'message warning';
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      Object.values(tabs).forEach(s => s && s.classList.remove('active'));
      tabs.admin.classList.add('active');
      adminLogin.classList.remove('hidden');
      adminPanel.classList.add('hidden');
      return;
    }

    tabButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    Object.values(tabs).forEach(s => s && s.classList.remove('active'));
    tabs[tab].classList.add('active');

    if (tab === 'vote') {
      renderCandidatesForVote();
      updateVotingStateUI();
    }
    else if (tab === 'admin' && sessionAdmin) {
      renderCandidatesForAdmin();
      updateVoteStatistics();
    }
    else if (tab === 'results') renderResults();
    else if (tab === 'candidates') renderCandidatesPage();
  });
});

// ========== RENDU - CANDIDATS VOTE ==========
function renderCandidatesForVote() {
  const candidates = getCandidates();

  if (candidates.length === 0) {
    candidateListVote.innerHTML = '<div class="hint">Aucun candidat disponible.</div>';
    return;
  }

  candidateListVote.innerHTML = candidates
    .map(c => {
      const photo = c.photoUrl || '';
      const imgTag = photo
        ? `<img src="${photo}" alt="${escapeHTML(c.name)}" class="candidate-photo" onerror="this.onerror=null;this.src='../assets/avatar.png'">`
        : `<div class="candidate-photo placeholder">👤</div>`;

      return `
        <div class="candidate-card">
          <div style="display: flex; gap: 16px; align-items: flex-start;">
            <div style="flex: 0 0 100px;">${imgTag}</div>
            <div style="flex: 1;">
              <h4>${escapeHTML(c.name)}</h4>
              <p style="color: #6b7280; margin: 8px 0;">"${escapeHTML(c.slogan)}"</p>
              <label class="radio-row">
                <input type="radio" name="candidateId" value="${c.id}" ${!isVotingOpen() || !currentVoter ? 'disabled' : ''}>
                <span>Voter pour ${escapeHTML(c.name)}</span>
              </label>
            </div>
          </div>
        </div>
      `;
    })
    .join('');
}

// ========== RENDU - CANDIDATS ADMIN ==========
function renderCandidatesForAdmin() {
  if (!sessionAdmin) {
    candidateListAdmin.innerHTML = '<div class="hint">Veuillez vous connecter.</div>';
    return;
  }

  const candidates = getCandidates();

  if (candidates.length === 0) {
    candidateListAdmin.innerHTML = '<div class="hint">Aucun candidat. Ajoutez-en ci-dessus.</div>';
    return;
  }

  candidateListAdmin.innerHTML = candidates
    .map((c, idx) => `
      <div class="candidate-card">
        <div style="display: flex; justify-content: space-between; align-items: start; gap: 12px;">
          <div style="flex: 1;">
            <h4 style="margin: 0 0 4px 0;">${idx + 1}. ${escapeHTML(c.name)}</h4>
            <p style="color: #6b7280; margin: 0; font-size: 0.9rem;">"${escapeHTML(c.slogan)}"</p>
          </div>
          <div style="display: flex; gap: 6px; flex-shrink: 0;">
            <button type="button" class="btn btn-primary" onclick="openEditCandidateModal('${c.id}')" style="padding: 8px 12px; font-size: 0.85rem;">✏️</button>
            <button type="button" class="btn btn-danger" onclick="deleteCandidate('${c.id}')" style="padding: 8px 12px; font-size: 0.85rem;">🗑️</button>
          </div>
        </div>
      </div>
    `)
    .join('');
}

// ========== GESTION CANDIDATS ==========
window.deleteCandidate = function(id) {
  if (!sessionAdmin) {
    showMessage(adminMsg, '❌ Vous devez être connecté', 'error');
    return;
  }

  if (!confirm('Êtes-vous sûr de vouloir supprimer ce candidat ?')) return;

  const candidates = getCandidates().filter(c => c.id !== id);
  setCandidates(candidates);
  renderCandidatesForAdmin();
  renderCandidatesForVote();
  renderResults();
  showMessage(adminMsg, '✅ Candidat supprimé', 'success');
};

if (createCandidateForm) {
  createCandidateForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!sessionAdmin) {
      showMessage(adminMsg, '❌ Vous devez être connecté', 'error');
      return;
    }

    const name = document.getElementById('candidateName').value.trim();
    const slogan = document.getElementById('candidateSlogan').value.trim();
    const photoFile = document.getElementById('candidatePhotoFile').files[0];
    const pdfFile = document.getElementById('candidatePdfFile').files[0];

    if (!name || !slogan) {
      showMessage(adminMsg, '⚠️ Tous les champs sont obligatoires', 'warning');
      return;
    }

    if (!photoFile) {
      showMessage(adminMsg, '⚠️ Sélectionnez une photo', 'warning');
      return;
    }

    if (!pdfFile) {
      showMessage(adminMsg, '⚠️ Sélectionnez un PDF', 'warning');
      return;
    }

    try {
      const photoData = await readFileAsDataURL(photoFile);
      const pdfData = await readFileAsDataURL(pdfFile);

      const candidates = getCandidates();
      candidates.push({
        id: cryptoRandomId(),
        name,
        slogan,
        photoUrl: photoData,
        pdfUrl: pdfData
      });
      setCandidates(candidates);

      createCandidateForm.reset();
      showMessage(adminMsg, '✅ Candidat ajouté', 'success');
      renderCandidatesForAdmin();
      renderCandidatesForVote();
      renderResults();
    } catch (err) {
      console.error(err);
      showMessage(adminMsg, '❌ Erreur', 'error');
    }
  });
}

// ========== MODAL ÉDITION CANDIDAT ==========
if (editCloseBtn) {
  editCloseBtn.addEventListener('click', () => {
    editCandidateModal.classList.add('hidden');
    editingCandidateId = null;
  });
}

if (editCancelBtn) {
  editCancelBtn.addEventListener('click', () => {
    editCandidateModal.classList.add('hidden');
    editingCandidateId = null;
  });
}

if (editCandidateModal) {
  editCandidateModal.addEventListener('click', (e) => {
    if (e.target === editCandidateModal) {
      editCloseBtn.click();
    }
  });
}

if (editCandidateForm) {
  editCandidateForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!sessionAdmin || !editingCandidateId) {
      showMessage(editMsg, '❌ Erreur', 'error');
      return;
    }

    const name = document.getElementById('editCandidateName').value.trim();
    const slogan = document.getElementById('editCandidateSlogan').value.trim();
    const photoFile = document.getElementById('editCandidatePhotoFile').files[0];
    const pdfFile = document.getElementById('editCandidatePdfFile').files[0];

    if (!name || !slogan) {
      showMessage(editMsg, '⚠️ Le nom et le slogan sont obligatoires', 'warning');
      return;
    }

    try {
      const candidates = getCandidates();
      const idx = candidates.findIndex(c => c.id === editingCandidateId);

      if (idx === -1) {
        showMessage(editMsg, '❌ Candidat non trouvé', 'error');
        return;
      }

      let photoData = candidates[idx].photoUrl || '';
      let pdfData = candidates[idx].pdfUrl || '';

      if (photoFile) {
        photoData = await readFileAsDataURL(photoFile);
      }
      if (pdfFile) {
        pdfData = await readFileAsDataURL(pdfFile);
      }

      candidates[idx] = {
        ...candidates[idx],
        name,
        slogan,
        photoUrl: photoData,
        pdfUrl: pdfData
      };

      setCandidates(candidates);
      editCandidateForm.reset();
      editCandidateModal.classList.add('hidden');
      editingCandidateId = null;

      showMessage(editMsg, '✅ Candidat modifié avec succès', 'success');
      renderCandidatesForAdmin();
      renderCandidatesForVote();
      renderCandidatesPage();
      renderResults();

    } catch (err) {
      console.error(err);
      showMessage(editMsg, '❌ Erreur lors de la modification', 'error');
    }
  });
}

window.openEditCandidateModal = function(candidateId) {
  if (!sessionAdmin) {
    showMessage(adminMsg, '❌ Vous devez être connecté', 'error');
    return;
  }

  const candidates = getCandidates();
  const candidate = candidates.find(c => c.id === candidateId);

  if (!candidate) {
    showMessage(adminMsg, '❌ Candidat non trouvé', 'error');
    return;
  }

  editingCandidateId = candidateId;
  document.getElementById('editCandidateName').value = candidate.name;
  document.getElementById('editCandidateSlogan').value = candidate.slogan;
  document.getElementById('editCandidatePhotoFile').value = '';
  document.getElementById('editCandidatePdfFile').value = '';
  editMsg.textContent = '';
  editMsg.className = 'message';

  editCandidateModal.classList.remove('hidden');
};

// ========== CONTRÔLE VOTES EN DIRECT ==========
function updateVoteStatistics() {
  if (!sessionAdmin) return;

  const votes = getVotes();
  const voters = getVoters();
  const candidates = getCandidates();
  const totalVotes = votes.length;
  const totalVoters = voters.length;
  const participationRate = totalVoters > 0 ? Math.round((totalVotes / totalVoters) * 100) : 0;

  if (adminVoteCount) adminVoteCount.textContent = totalVotes;
  if (adminVoterCount) adminVoterCount.textContent = totalVoters;
  if (adminParticipationRate) adminParticipationRate.textContent = `${participationRate}%`;

  const tally = Object.fromEntries(candidates.map(c => [c.id, 0]));
  votes.forEach(v => {
    if (tally[v.candidateId] !== undefined) tally[v.candidateId]++;
  });

  const html = candidates
    .map(c => {
      const count = tally[c.id] || 0;
      const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
      return `
        <div style="padding: 12px; background: #f3f4f6; border-radius: 6px; margin-bottom: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <strong>${escapeHTML(c.name)}</strong>
            <span style="color: #2563eb; font-weight: 600;">${count} votes (${pct}%)</span>
          </div>
          <div style="width: 100%; height: 16px; background: #e5e7eb; border-radius: 4px; overflow: hidden;">
            <div style="width: ${Math.max(pct, 2)}%; height: 100%; background: linear-gradient(90deg, #2563eb 0%, #1e40af 100%);"></div>
          </div>
        </div>
      `;
    })
    .join('');

  if (adminVotesList) {
    adminVotesList.innerHTML = html || '<div class="hint">Aucun vote pour le moment</div>';
  }
}

// ========== RÉINITIALISER LES VOTES ==========
if (adminResetVotesBtn) {
  adminResetVotesBtn.addEventListener('click', () => {
    if (!sessionAdmin) {
      showMessage(adminMsg, '❌ Vous devez être connecté', 'error');
      return;
    }

    if (!confirm('⚠️ Êtes-vous sûr de vouloir réinitialiser TOUS les votes ? Cette action est irréversible !')) {
      return;
    }

    setVotes([]);
    setVotedIds([]);
    showMessage(adminMsg, '✅ Tous les votes ont été réinitialisés', 'success');
    renderResults();
    updateVoteStatistics();
  });
}

// ========== EXPORTER LES RÉSULTATS ==========
if (adminExportVotesBtn) {
  adminExportVotesBtn.addEventListener('click', () => {
    if (!sessionAdmin) {
      showMessage(adminMsg, '❌ Vous devez être connecté', 'error');
      return;
    }
    exportVotesAsHTML();
  });
}

if (adminViewReportBtn) {
  adminViewReportBtn.addEventListener('click', () => {
    if (!sessionAdmin) {
      showMessage(adminMsg, '❌ Vous devez être connecté', 'error');
      return;
    }
    viewVotesReport();
  });
}

function exportVotesAsHTML() {
  const votes = getVotes();
  const candidates = getCandidates();
  const voters = getVoters();
  const now = new Date();

  const tally = Object.fromEntries(candidates.map(c => [c.id, 0]));
  votes.forEach(v => {
    if (tally[v.candidateId] !== undefined) tally[v.candidateId]++;
  });

  const totalVotes = votes.length;
  const totalVoters = voters.length;
  const participationRate = totalVoters > 0 ? Math.round((totalVotes / totalVoters) * 100) : 0;

  let winner = null;
  let maxVotes = -1;
  candidates.forEach(c => {
    const count = tally[c.id] || 0;
    if (count > maxVotes) {
      maxVotes = count;
      winner = c;
    }
  });

  const htmlContent = generateReportHTML(winner, maxVotes, totalVotes, totalVoters, participationRate, candidates, tally, now, true);

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `resultats-vote-${Date.now()}.html`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showMessage(adminMsg, '✅ Résultats exportés en HTML', 'success');
}

function viewVotesReport() {
  const votes = getVotes();
  const candidates = getCandidates();
  const voters = getVoters();
  const now = new Date();

  const tally = Object.fromEntries(candidates.map(c => [c.id, 0]));
  votes.forEach(v => {
    if (tally[v.candidateId] !== undefined) tally[v.candidateId]++;
  });

  const totalVotes = votes.length;
  const totalVoters = voters.length;
  const participationRate = totalVoters > 0 ? Math.round((totalVotes / totalVoters) * 100) : 0;

  let winner = null;
  let maxVotes = -1;
  candidates.forEach(c => {
    const count = tally[c.id] || 0;
    if (count > maxVotes) {
      maxVotes = count;
      winner = c;
    }
  });

  const htmlContent = generateReportHTML(winner, maxVotes, totalVotes, totalVoters, participationRate, candidates, tally, now, false);

  const newWindow = window.open();
  if (newWindow) {
    newWindow.document.write(htmlContent);
    newWindow.document.close();
  }
}

function generateReportHTML(winner, maxVotes, totalVotes, totalVoters, participationRate, candidates, tally, now, isDownload) {
  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Résultats du Vote - VoteNow</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937; line-height: 1.6; padding: 20px; background: white; }
        .container { max-width: 900px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #2563eb; padding-bottom: 20px; }
        .header h1 { color: #2563eb; font-size: 2.5em; margin-bottom: 10px; }
        .header p { color: #6b7280; font-size: 1.1em; }
        .controls { text-align: center; margin-bottom: 20px; }
        .controls button { padding: 10px 16px; margin: 0 5px; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; background: #2563eb; color: white; }
        .controls button:hover { background: #1e40af; }
        .controls .close-btn { background: #e5e7eb; color: #1f2937; }
        .controls .close-btn:hover { background: #d1d5db; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px; }
        .stat-box { background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border-left: 4px solid #2563eb; padding: 15px; border-radius: 8px; text-align: center; }
        .stat-box .label { color: #1e40af; font-size: 0.85em; margin-bottom: 8px; font-weight: 500; }
        .stat-box .value { color: #1e40af; font-size: 1.8em; font-weight: 700; }
        .winner-section { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 2px solid #f59e0b; border-radius: 12px; padding: 25px; text-align: center; margin-bottom: 30px; }
        .winner-section h2 { color: #92400e; font-size: 1.8em; margin-bottom: 10px; }
        .winner-section .trophy { font-size: 3em; margin-bottom: 10px; }
        .results-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .results-table th { background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white; padding: 12px; text-align: left; font-weight: 600; }
        .results-table td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
        .results-table tr:nth-child(even) { background: #f9fafb; }
        .bar-item { margin-bottom: 20px; }
        .bar-label { display: flex; justify-content: space-between; margin-bottom: 6px; font-weight: 500; }
        .bar-fill-container { width: 100%; height: 25px; background: #e5e7eb; border-radius: 4px; overflow: hidden; }
        .bar-fill { height: 100%; background: linear-gradient(90deg, #2563eb 0%, #1e40af 100%); display: flex; align-items: center; justify-content: flex-end; padding-right: 8px; color: white; font-weight: 600; }
        .details-section { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 30px; }
        .details-section h3 { color: #2563eb; font-size: 1.3em; margin-bottom: 15px; }
        .details-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .detail-item { padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .detail-item:last-child { border-bottom: none; }
        .detail-label { color: #6b7280; font-size: 0.9em; font-weight: 500; margin-bottom: 4px; }
        .detail-value { color: #1f2937; font-size: 1.1em; font-weight: 600; }
        .footer { text-align: center; color: #6b7280; font-size: 0.9em; padding-top: 20px; border-top: 1px solid #e5e7eb; margin-top: 30px; }
        @media print { .controls { display: none; } }
      </style>
    </head>
    <body>
      <div class="container">
        ${!isDownload ? `
          <div class="controls">
            <button onclick="window.print()">🖨️ Imprimer / PDF</button>
            <button class="close-btn" onclick="window.close()">✖ Fermer</button>
          </div>
        ` : ''}
        
        <div class="header">
          <h1>🗳️ RÉSULTATS DU VOTE</h1>
          <p>Plateforme VoteNow - Élection en ligne sécurisée</p>
        </div>

        <div class="stats-grid">
          <div class="stat-box"><div class="label">Total des votes</div><div class="value">${totalVotes}</div></div>
          <div class="stat-box"><div class="label">Électeurs inscrits</div><div class="value">${totalVoters}</div></div>
          <div class="stat-box"><div class="label">Participation</div><div class="value">${participationRate}%</div></div>
          <div class="stat-box"><div class="label">Candidats</div><div class="value">${candidates.length}</div></div>
        </div>

        ${winner && maxVotes > 0 ? `
          <div class="winner-section">
            <div class="trophy">🏆</div>
            <h2>CANDIDAT GAGNANT</h2>
            <p style="font-size: 1.5em; margin: 15px 0; color: #92400e;">${escapeHTML(winner.name)}</p>
            <p style="color: #92400e; font-size: 1.3em; font-weight: 600;">${maxVotes} voix</p>
          </div>
        ` : '<div class="winner-section"><h2>Pas de résultats</h2></div>'}

        <table class="results-table">
          <tr><th style="width: 10%;">Rang</th><th style="width: 40%;">Candidat</th><th style="width: 25%; text-align: center;">Voix</th><th style="width: 25%; text-align: center;">%</th></tr>
          ${candidates.map((c, idx) => {
            const count = tally[c.id] || 0;
            const pct = totalVotes > 0 ? ((count / totalVotes) * 100).toFixed(2) : 0;
            return `<tr><td style="font-weight: 700; color: #2563eb;">#${idx + 1}</td><td>${escapeHTML(c.name)}</td><td style="text-align: center; font-weight: 600;">${count}</td><td style="text-align: center;">${pct}%</td></tr>`;
          }).join('')}
        </table>

        <h3 style="color: #2563eb; margin-bottom: 15px; margin-top: 30px;">📊 Graphique</h3>
        ${candidates.map(c => {
          const count = tally[c.id] || 0;
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          return `
            <div class="bar-item">
              <div class="bar-label"><span>${escapeHTML(c.name)}</span><span>${count} (${pct}%)</span></div>
              <div class="bar-fill-container"><div class="bar-fill" style="width: ${Math.max(pct, 5)}%;">${pct > 5 ? pct + '%' : ''}</div></div>
            </div>
          `;
        }).join('')}

        <div class="details-section">
          <h3>📋 Informations du scrutin</h3>
          <div class="details-grid">
            <div class="detail-item">
              <div class="detail-label">Date et heure du rapport</div>
              <div class="detail-value">${now.toLocaleString('fr-FR')}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Administrateur</div>
              <div class="detail-value">${sessionAdmin ? sessionAdmin.adminId : 'N/A'}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Électeurs abstentionnistes</div>
              <div class="detail-value">${totalVoters - totalVotes}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Taux d'abstention</div>
              <div class="detail-value">${totalVoters > 0 ? Math.round(((totalVoters - totalVotes) / totalVoters) * 100) : 0}%</div>
            </div>
          </div>
        </div>

        <div class="footer">
          <p>Document généré par VoteNow © 2025</p>
          <p>Ce rapport contient les résultats officiels du scrutin</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// ========== RENDU PAGE CANDIDATS ==========
function renderCandidatesPage() {
  const candidates = getCandidates();

  if (candidates.length === 0) {
    if (candidatesPageList) {
      candidatesPageList.innerHTML = '<div class="hint">Aucun candidat.</div>';
    }
    return;
  }

  const html = candidates.map(c => {
    const photo = c.photoUrl || '';
    const pdf = c.pdfUrl || '';
    const imgTag = photo
      ? `<img src="${photo}" alt="${escapeHTML(c.name)}" class="candidate-photo" onerror="this.onerror=null;this.src='../assets/avatar.png'">`
      : `<div class="candidate-photo placeholder">👤</div>`;

    const viewBtn = pdf
      ? `<button class="btn btn-primary" type="button" onclick="openPdfModal('${pdf}')">🔍 Voir le projet</button>`
      : `<button class="btn" type="button" disabled>Pas de projet</button>`;

    const downloadBtn = pdf
      ? `<a class="btn btn-primary" href="${pdf}" target="_blank" rel="noopener" download>⬇️ Télécharger</a>`
      : '';

    return `
      <div class="candidate-card">
        <div style="display: flex; gap: 16px; align-items: flex-start;">
          <div style="flex: 0 0 120px;">${imgTag}</div>
          <div style="flex: 1;">
            <h4>${escapeHTML(c.name)}</h4>
            <p style="color: #6b7280; margin: 8px 0; font-style: italic;">"${escapeHTML(c.slogan)}"</p>
            <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px;">
              ${viewBtn}
              ${downloadBtn}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  if (candidatesPageList) {
    candidatesPageList.innerHTML = html;
  }
}

// ========== PDF MODAL ==========
window.openPdfModal = function(url) {
  if (!url) return;
  if (pdfViewer) pdfViewer.src = url;
  if (pdfDownloadLink) pdfDownloadLink.href = url;
  if (pdfModal) pdfModal.classList.remove('hidden');
};

if (pdfCloseBtn) {
  pdfCloseBtn.addEventListener('click', () => {
    if (pdfModal) pdfModal.classList.add('hidden');
    if (pdfViewer) pdfViewer.src = '';
  });
}

if (pdfOpenNewTab) {
  pdfOpenNewTab.addEventListener('click', () => {
    if (pdfDownloadLink && pdfDownloadLink.href) {
      window.open(pdfDownloadLink.href, '_blank');
    }
  });
}

if (pdfModal) {
  pdfModal.addEventListener('click', (e) => {
    if (e.target === pdfModal) {
      if (pdfCloseBtn) pdfCloseBtn.click();
    }
  });
}

// ========== ANNULATION DE VOTE (DANS LES 2 MINUTES) ==========
const CANCEL_WINDOW = 2 * 60 * 1000;
const cancelIntervals = {};
const cancelTimeouts = {};

function enableCancelForVoter(voterId, voteTimestamp) {
  if (!voterId) return;
  const now = Date.now();
  const elapsed = now - voteTimestamp;
  let remaining = CANCEL_WINDOW - elapsed;
  if (remaining <= 0) return;

  const container = voterIdentifierDisplay || voteMsg || document.body;
  let btn = container.querySelector('#cancelVoteBtn');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'cancelVoteBtn';
    btn.type = 'button';
    btn.className = 'btn btn-danger';
    btn.style.marginTop = '12px';
    btn.addEventListener('click', () => undoVote(voterId));
    (container instanceof HTMLElement) && container.appendChild(btn);
  }

  function updateText() {
    const rem = Math.max(0, remaining);
    const mm = Math.floor(rem / 60000);
    const ss = Math.floor((rem % 60000) / 1000);
    btn.textContent = `Annuler mon vote (${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')})`;
  }

  if (cancelIntervals[voterId]) {
    clearInterval(cancelIntervals[voterId]);
    cancelIntervals[voterId] = null;
  }
  if (cancelTimeouts[voterId]) {
    clearTimeout(cancelTimeouts[voterId]);
    cancelTimeouts[voterId] = null;
  }

  updateText();
  cancelIntervals[voterId] = setInterval(() => {
    remaining -= 1000;
    if (remaining <= 0) {
      disableCancelForVoter(voterId);
    } else updateText();
  }, 1000);

  cancelTimeouts[voterId] = setTimeout(() => {
    disableCancelForVoter(voterId);
  }, remaining);
}

function disableCancelForVoter(voterId) {
  if (!voterId) return;
  const container = voterIdentifierDisplay || voteMsg || document.body;
  const btn = container.querySelector && container.querySelector('#cancelVoteBtn');
  if (btn && btn.parentNode) btn.parentNode.removeChild(btn);

  if (cancelIntervals[voterId]) {
    clearInterval(cancelIntervals[voterId]);
    cancelIntervals[voterId] = null;
  }
  if (cancelTimeouts[voterId]) {
    clearTimeout(cancelTimeouts[voterId]);
    cancelTimeouts[voterId] = null;
  }
}

function undoVote(voterId) {
  if (!voterId) return showMessage(voteMsg, '❌ Identifiant invalide', 'error');

  const votes = getVotes();
  let lastIndex = -1;
  let lastTs = -1;
  votes.forEach((v, i) => {
    if (String(v.voterId).trim().toLowerCase() === String(voterId).trim().toLowerCase()) {
      if ((v.timestamp || 0) > lastTs) {
        lastTs = v.timestamp || 0;
        lastIndex = i;
      }
    }
  });

  if (lastIndex === -1) {
    return showMessage(voteMsg, '❌ Aucun vote trouvé pour cet identifiant', 'error');
  }

  const now = Date.now();
  if (now - lastTs > CANCEL_WINDOW) {
    disableCancelForVoter(voterId);
    return showMessage(voteMsg, '⏱️ Délai d\'annulation dépassé (2 minutes)', 'warning');
  }

  votes.splice(lastIndex, 1);
  setVotes(votes);

  const voted = getVotedIds().filter(id => String(id).trim().toLowerCase() !== String(voterId).trim().toLowerCase());
  setVotedIds(voted);

  disableCancelForVoter(voterId);
  showMessage(voteMsg, '✅ Votre vote a été annulé — Veuillez ressaisir votre identifiant pour confirmer', 'success');
  renderResults();
  renderCandidatesForVote();
  updateVotingStateUI();
  requireVoteIdentifierEntry();
}

function requireVoteIdentifierEntry() {
  const input = document.getElementById('voteIdentifierId');
  if (!input || !voteForm) return;

  input.readOnly = false;
  input.value = '';
  input.focus();

  const submitBtn = voteForm.querySelector('button[type="submit"]');
  const radios = voteForm.querySelectorAll('input[name="candidateId"]');

  if (submitBtn) submitBtn.disabled = true;
  radios.forEach(r => r.disabled = true);

  function onInput() {
    const val = input.value.trim();
    if (currentVoter && val === currentVoter.voteId) {
      input.readOnly = true;
      if (submitBtn) submitBtn.disabled = false;
      radios.forEach(r => r.disabled = !isVotingOpen() ? true : false);
      input.removeEventListener('input', onInput);
      showMessage(voteMsg, '✅ Identifiant confirmé — vous pouvez voter', 'success');
    } else {
      if (submitBtn) submitBtn.disabled = true;
      radios.forEach(r => r.disabled = true);
    }
  }

  input.addEventListener('input', onInput);
  onInput();
}

// ========== VOTE ==========
if (voteForm) {
  voteForm.addEventListener('submit', (e) => {
    e.preventDefault();

    if (!isVotingOpen()) {
      showMessage(voteMsg, '🔒 Les votes sont fermés', 'warning');
      return;
    }

    if (!currentVoter) {
      showMessage(voteMsg, '⚠️ Veuillez vous inscrire d\'abord', 'warning');
      return;
    }

    const voterId = document.getElementById('voteIdentifierId').value.trim();
    const candidateRadio = document.querySelector('input[name="candidateId"]:checked');

    if (!voterId) {
      showMessage(voteMsg, '⚠️ Identifiant vide', 'warning');
      return;
    }

    if (voterId !== currentVoter.voteId) {
      showMessage(voteMsg, '❌ Identifiant incorrect', 'error');
      return;
    }

    if (!candidateRadio) {
      showMessage(voteMsg, '⚠️ Sélectionnez un candidat', 'warning');
      return;
    }

    if (hasVoted(voterId)) {
      showMessage(voteMsg, '❌ Vous avez déjà voté', 'error');
      return;
    }

    const timestamp = Date.now();
    const votes = getVotes();
    votes.push({ voterId, candidateId: candidateRadio.value, timestamp });
    setVotes(votes);

    const votedIds = getVotedIds();
    votedIds.push(voterId);
    setVotedIds(votedIds);

    showMessage(voteMsg, '✅ Vote enregistré ! Vous pouvez l\'annuler pendant 2 minutes.', 'success');
    renderResults();
    voteForm.reset();

    enableCancelForVoter(voterId, timestamp);
    updateVoteStatistics();
  });
}

// ========== RÉSULTATS ==========
function renderResults() {
  const candidates = getCandidates();
  const votes = getVotes();
  const totalVotes = votes.length;

  const tally = Object.fromEntries(candidates.map(c => [c.id, 0]));
  votes.forEach(v => {
    if (tally[v.candidateId] !== undefined) tally[v.candidateId]++;
  });

  const rows = candidates
    .map(c => {
      const count = tally[c.id] || 0;
      const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
      return `
        <div class="row">
          <strong>${escapeHTML(c.name)}</strong>
          <span>${count} voix ${totalVotes > 0 ? `(${pct}%)` : ''}</span>
        </div>
      `;
    })
    .join('');

  if (resultsTable) {
    resultsTable.innerHTML = rows || '<div class="hint">Aucun vote.</div>';
  }

  let winner = null;
  let maxVotes = -1;
  candidates.forEach(c => {
    const count = tally[c.id] || 0;
    if (count > maxVotes) {
      maxVotes = count;
      winner = c;
    }
  });

  if (winnerBox) {
    if (winner && maxVotes > 0) {
      winnerBox.innerHTML = `
        <div style="text-align: center;">
          <div style="font-size: 3rem; margin-bottom: 12px;">🏆</div>
          <h3 style="margin: 0 0 8px 0; color: #2563eb;">${escapeHTML(winner.name)}</h3>
          <p style="margin: 0; font-size: 1.2rem; font-weight: 600; color: #16a34a;">${maxVotes} voix</p>
        </div>
      `;
    } else {
      winnerBox.innerHTML = '<div class="hint">Pas de votes</div>';
    }
  }

  if (voteCount) {
    voteCount.innerHTML = `<strong>Total : ${totalVotes} votes</strong>`;
  }

  const chartHTML = candidates
    .map(c => {
      const count = tally[c.id] || 0;
      const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
      return `
        <div class="bar">
          <div class="label">${escapeHTML(c.name)}</div>
          <div class="bar-fill" style="width: ${Math.max(pct, 5)}%;"></div>
          <div class="value">${count} (${pct}%)</div>
        </div>
      `;
    })
    .join('');

  if (barChart) {
    barChart.innerHTML = chartHTML || '<div class="hint">Aucune données</div>';
  }

  updateVoteStatistics();
}

// ========== INITIALISATION ==========
document.addEventListener('DOMContentLoaded', () => {
  initDOM();

  const candidates = getCandidates();
  if (candidates.length === 0) {
    setCandidates([
      { id: cryptoRandomId(), name: 'Awa Diop', slogan: 'Ensemble, on avance!' },
      { id: cryptoRandomId(), name: 'Moussa Ndiaye', slogan: 'Transparence et action' },
      { id: cryptoRandomId(), name: 'Sokhna Fall', slogan: 'Proximité et efficacité' }
    ]);
  }

  if (localStorage.getItem(LS_VOTING_OPEN) === null) setVotingOpen(true);

  initAdminSession();
  renderCandidatesForVote();
  renderResults();
  updateVotingStateUI();
  renderSiteStatusBanner();

  if (currentVoter && voterIdentifierDisplay) {
    voterIdentifierDisplay.classList.remove('hidden');
    voterRegistrationForm.style.display = 'none';
    document.getElementById('voteIdentifierId').value = currentVoter.voteId;
    showVoterIdentifier(currentVoter.voteId, currentVoter.firstname, currentVoter.lastname);

    const votes = getVotes();
    let lastTs = -1;
    votes.forEach(v => {
      if (String(v.voterId).trim().toLowerCase() === String(currentVoter.voteId).trim().toLowerCase()) {
        if ((v.timestamp || 0) > lastTs) lastTs = v.timestamp || 0;
      }
    });
    if (lastTs > 0 && (Date.now() - lastTs) < CANCEL_WINDOW) {
      enableCancelForVoter(currentVoter.voteId, lastTs);
    }
  }
});

// Fin du fichier