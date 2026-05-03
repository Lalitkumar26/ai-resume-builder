import { auth, db, GEMINI_URL } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";


// ===================== APP STATE =====================
let currentUser = null;
let currentTemplate = 'classic';
let autoSaveTimer = null;
let experienceCount = 0;
let educationCount = 0;
let projectsCount = 0;
let certificationsCount = 0;
let skills = [];
let resumeCurrentColor = "#16a34a";

// ===================== HELPER FUNCTIONS =====================
function showToast(msg, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => { 
    toast.style.animation = 'slideOut 0.3s ease forwards'; 
    setTimeout(() => toast.remove(), 300); 
  }, 3500);
}

function showLoading(text = 'Loading...') {
  const overlay = document.getElementById('loadingOverlay');
  const textEl = document.getElementById('loadingText');
  if (textEl) textEl.textContent = text;
  if (overlay) overlay.classList.add('show');
}

function hideLoading() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.classList.remove('show');
}

function safe(s) { 
  return s ? String(s).replace(/</g,'&lt;').replace(/>/g,'&gt;') : ''; 
}

function nl2br(s) { 
  return s ? safe(s).replace(/\n/g, '<br>') : ''; 
}

// ===================== COLLECT RESUME DATA =====================
function collectResumeData() {
  const firstName = document.getElementById('f_firstName')?.value.trim() || '';
  const lastName = document.getElementById('f_lastName')?.value.trim() || '';
  const experience = [];
  
  document.querySelectorAll('#experienceList .dynamic-entry').forEach(el => {
    experience.push({
      title: el.querySelector('.exp-title')?.value || '',
      company: el.querySelector('.exp-company')?.value || '',
      start: el.querySelector('.exp-start')?.value || '',
      end: el.querySelector('.exp-end')?.value || '',
      desc: el.querySelector('textarea')?.value || ''
    });
  });
  
  const education = [];
  document.querySelectorAll('#educationList .dynamic-entry').forEach(el => {
    education.push({
      degree: el.querySelector('.edu-degree')?.value || '',
      institution: el.querySelector('.edu-institution')?.value || '',
      year: el.querySelector('.edu-year')?.value || '',
      gpa: el.querySelector('.edu-gpa')?.value || ''
    });
  });
  
  const projects = [];
  document.querySelectorAll('#projectsList .dynamic-entry').forEach(el => {
    projects.push({
      name: el.querySelector('.proj-name')?.value || '',
      tech: el.querySelector('.proj-tech')?.value || '',
      link: el.querySelector('.proj-link')?.value || '',
      desc: el.querySelector('textarea')?.value || ''
    });
  });
  
  const certifications = [];
  document.querySelectorAll('#certificationsList .dynamic-entry').forEach(el => {
    certifications.push({
      name: el.querySelector('.cert-name')?.value || '',
      org: el.querySelector('.cert-org')?.value || '',
      date: el.querySelector('.cert-date')?.value || ''
    });
  });
  
  return {
    firstName, lastName,
    jobTitle: document.getElementById('f_jobTitle')?.value.trim() || '',
    email: document.getElementById('f_email')?.value.trim() || '',
    phone: document.getElementById('f_phone')?.value.trim() || '',
    location: document.getElementById('f_location')?.value.trim() || '',
    linkedin: document.getElementById('f_linkedin')?.value.trim() || '',
    website: document.getElementById('f_website')?.value.trim() || '',
    summary: document.getElementById('f_summary')?.value.trim() || '',
    skills: [...skills], 
    experience, education, projects, certifications,
    templateId: currentTemplate
  };
}

// ===================== TEMPLATE RENDERERS =====================
function renderClassic(d) {
  const name = [d.firstName, d.lastName].filter(Boolean).join(' ') || 'Your Name';
  const contacts = [d.email, d.phone, d.location, d.linkedin].filter(Boolean);
  return `<div class="resume-classic">
    <div class="rc-header">
      <div class="rc-name">${safe(name)}</div>
      ${d.jobTitle ? `<div class="rc-role">${safe(d.jobTitle)}</div>` : ''}
      ${contacts.length ? `<div class="rc-contact">${contacts.map(c => `<span><i class="fas fa-circle" style="font-size:0.4rem;color:var(--primary);"></i> ${safe(c)}</span>`).join('')}</div>` : ''}
    </div>
    ${d.summary ? `<div class="rc-section"><div class="rc-section-title">Professional Summary</div><div class="rc-summary">${nl2br(d.summary)}</div></div>` : ''}
    ${d.experience.length ? `<div class="rc-section"><div class="rc-section-title">Work Experience</div>${d.experience.map(e => `<div class="rc-entry"><div class="rc-entry-header"><div class="rc-entry-title">${safe(e.title)}</div><div class="rc-entry-date">${safe(e.start)}${e.end ? ' – ' + safe(e.end) : ''}</div></div>${e.company ? `<div class="rc-entry-company">${safe(e.company)}</div>` : ''}${e.desc ? `<div class="rc-entry-desc">${nl2br(e.desc)}</div>` : ''}</div>`).join('')}</div>` : ''}
    ${d.education.length ? `<div class="rc-section"><div class="rc-section-title">Education</div>${d.education.map(e => `<div class="rc-entry"><div class="rc-entry-header"><div class="rc-entry-title">${safe(e.degree)}</div><div class="rc-entry-date">${safe(e.year)}</div></div>${e.institution ? `<div class="rc-entry-company">${safe(e.institution)}</div>` : ''}${e.gpa ? `<div class="rc-entry-desc">GPA: ${safe(e.gpa)}</div>` : ''}</div>`).join('')}</div>` : ''}
    ${d.skills.length ? `<div class="rc-section"><div class="rc-section-title">Skills</div><div class="rc-skills-wrap">${d.skills.map(s => `<span class="rc-skill">${safe(s)}</span>`).join('')}</div></div>` : ''}
    ${d.projects.length ? `<div class="rc-section"><div class="rc-section-title">Projects</div>${d.projects.map(p => `<div class="rc-entry"><div class="rc-entry-header"><div class="rc-entry-title">${safe(p.name)}</div>${p.tech ? `<div class="rc-entry-date">${safe(p.tech)}</div>` : ''}</div>${p.link ? `<div class="rc-entry-company">${safe(p.link)}</div>` : ''}${p.desc ? `<div class="rc-entry-desc">${nl2br(p.desc)}</div>` : ''}</div>`).join('')}</div>` : ''}
    ${d.certifications.length ? `<div class="rc-section"><div class="rc-section-title">Certifications</div>${d.certifications.map(c => `<div class="rc-entry"><div class="rc-entry-header"><div class="rc-entry-title">${safe(c.name)}</div><div class="rc-entry-date">${safe(c.date)}</div></div>${c.org ? `<div class="rc-entry-company">${safe(c.org)}</div>` : ''}</div>`).join('')}</div>` : ''}
  </div>`;
}

function renderModern(d) {
  const name = [d.firstName, d.lastName].filter(Boolean).join(' ') || 'Your Name';
  const initials = [(d.firstName||'?')[0], (d.lastName||'')[0]].filter(Boolean).join('').toUpperCase();
  return `<div class="resume-modern">
    <div class="rm-sidebar">
      <div class="rm-avatar">${initials}</div>
      <div class="rm-name">${safe(name)}</div>
      ${d.jobTitle ? `<div class="rm-role">${safe(d.jobTitle)}</div>` : ''}
      <div class="rm-section-title">Contact</div>
      ${d.email ? `<div class="rm-contact-item"><i class="fas fa-envelope"></i> ${safe(d.email)}</div>` : ''}
      ${d.phone ? `<div class="rm-contact-item"><i class="fas fa-phone"></i> ${safe(d.phone)}</div>` : ''}
      ${d.location ? `<div class="rm-contact-item"><i class="fas fa-map-marker-alt"></i> ${safe(d.location)}</div>` : ''}
      ${d.linkedin ? `<div class="rm-contact-item"><i class="fab fa-linkedin"></i> ${safe(d.linkedin)}</div>` : ''}
      ${d.website ? `<div class="rm-contact-item"><i class="fas fa-globe"></i> ${safe(d.website)}</div>` : ''}
      ${d.skills.length ? `<div class="rm-section-title">Skills</div>${d.skills.map(s => `<div class="rm-skill-item"><div class="rm-skill-name">${safe(s)}</div><div class="rm-skill-bar"><div class="rm-skill-fill" style="width:80%"></div></div></div>`).join('')}` : ''}
    </div>
    <div class="rm-main">
      <div class="rm-main-title">${safe(name)}</div>
      ${d.jobTitle ? `<div class="rm-main-role">${safe(d.jobTitle)}</div>` : ''}
      ${d.summary ? `<div class="rm-section"><div class="rm-section-heading">About Me</div><div class="rm-summary">${nl2br(d.summary)}</div></div>` : ''}
      ${d.experience.length ? `<div class="rm-section"><div class="rm-section-heading">Experience</div>${d.experience.map(e => `<div class="rm-entry"><div class="rm-entry-top"><div class="rm-entry-title">${safe(e.title)}</div><div class="rm-entry-date">${safe(e.start)}${e.end ? ' – ' + safe(e.end) : ''}</div></div>${e.company ? `<div class="rm-entry-sub">${safe(e.company)}</div>` : ''}${e.desc ? `<div class="rm-entry-desc">${nl2br(e.desc)}</div>` : ''}</div>`).join('')}</div>` : ''}
      ${d.education.length ? `<div class="rm-section"><div class="rm-section-heading">Education</div>${d.education.map(e => `<div class="rm-entry"><div class="rm-entry-top"><div class="rm-entry-title">${safe(e.degree)}</div><div class="rm-entry-date">${safe(e.year)}</div></div>${e.institution ? `<div class="rm-entry-sub">${safe(e.institution)}</div>` : ''}${e.gpa ? `<div class="rm-entry-desc">GPA: ${safe(e.gpa)}</div>` : ''}</div>`).join('')}</div>` : ''}
      ${d.projects.length ? `<div class="rm-section"><div class="rm-section-heading">Projects</div>${d.projects.map(p => `<div class="rm-entry"><div class="rm-entry-top"><div class="rm-entry-title">${safe(p.name)}</div>${p.tech ? `<div class="rm-entry-date">${safe(p.tech)}</div>` : ''}</div>${p.link ? `<div class="rm-entry-sub">${safe(p.link)}</div>` : ''}${p.desc ? `<div class="rm-entry-desc">${nl2br(p.desc)}</div>` : ''}</div>`).join('')}</div>` : ''}
      ${d.certifications.length ? `<div class="rm-section"><div class="rm-section-heading">Certifications</div>${d.certifications.map(c => `<div class="rm-entry"><div class="rm-entry-top"><div class="rm-entry-title">${safe(c.name)}</div><div class="rm-entry-date">${safe(c.date)}</div></div>${c.org ? `<div class="rm-entry-sub">${safe(c.org)}</div>` : ''}</div>`).join('')}</div>` : ''}
    </div>
  </div>`;
}

function renderCreative(d) {
  const name = [d.firstName, d.lastName].filter(Boolean).join(' ') || 'Your Name';
  const initials = [(d.firstName||'?')[0], (d.lastName||'')[0]].filter(Boolean).join('').toUpperCase();
  return `<div class="resume-creative">
    <div class="rcc-header">
      <div class="rcc-avatar">${initials}</div>
      <div class="rcc-header-info">
        <div class="rcc-name">${safe(name)}</div>
        ${d.jobTitle ? `<div class="rcc-role">${safe(d.jobTitle)}</div>` : ''}
        <div class="rcc-contacts">
          ${d.email ? `<span class="rcc-contact-item"><i class="fas fa-envelope"></i> ${safe(d.email)}</span>` : ''}
          ${d.phone ? `<span class="rcc-contact-item"><i class="fas fa-phone"></i> ${safe(d.phone)}</span>` : ''}
          ${d.location ? `<span class="rcc-contact-item"><i class="fas fa-map-marker-alt"></i> ${safe(d.location)}</span>` : ''}
          ${d.linkedin ? `<span class="rcc-contact-item"><i class="fab fa-linkedin"></i> ${safe(d.linkedin)}</span>` : ''}
        </div>
      </div>
    </div>
    <div class="rcc-body">
      <div class="rcc-main">
        ${d.summary ? `<div class="rcc-section"><div class="rcc-section-title">Profile</div><div class="rcc-summary">${nl2br(d.summary)}</div></div>` : ''}
        ${d.experience.length ? `<div class="rcc-section"><div class="rcc-section-title">Experience</div>${d.experience.map(e => `<div class="rcc-entry"><div class="rcc-entry-title">${safe(e.title)}</div>${e.company ? `<div class="rcc-entry-sub">${safe(e.company)}</div>` : ''}<div class="rcc-entry-date">${safe(e.start)}${e.end ? ' – ' + safe(e.end) : ''}</div>${e.desc ? `<div class="rcc-entry-desc">${nl2br(e.desc)}</div>` : ''}</div>`).join('')}</div>` : ''}
        ${d.education.length ? `<div class="rcc-section"><div class="rcc-section-title">Education</div>${d.education.map(e => `<div class="rcc-entry"><div class="rcc-entry-title">${safe(e.degree)}</div>${e.institution ? `<div class="rcc-entry-sub">${safe(e.institution)}</div>` : ''}<div class="rcc-entry-date">${safe(e.year)}${e.gpa ? ' | GPA: '+safe(e.gpa) : ''}</div></div>`).join('')}</div>` : ''}
        ${d.projects.length ? `<div class="rcc-section"><div class="rcc-section-title">Projects</div>${d.projects.map(p => `<div class="rcc-entry"><div class="rcc-entry-title">${safe(p.name)}</div>${p.tech ? `<div class="rcc-entry-sub">${safe(p.tech)}</div>` : ''}${p.desc ? `<div class="rcc-entry-desc">${nl2br(p.desc)}</div>` : ''}</div>`).join('')}</div>` : ''}
      </div>
      <div class="rcc-sidebar">
        ${d.skills.length ? `<div class="rcc-sidebar-section"><div class="rcc-sidebar-title">Skills</div>${d.skills.map(s => `<div class="rcc-skill-item"><span>${safe(s)}</span><span class="rcc-skill-dot">●</span></div>`).join('')}</div>` : ''}
        ${d.certifications.length ? `<div class="rcc-sidebar-section"><div class="rcc-sidebar-title">Certifications</div>${d.certifications.map(c => `<div class="rcc-entry" style="padding-left:0;border-left:none;margin-bottom:10px;"><div style="font-size:0.85rem;font-weight:600;">${safe(c.name)}</div>${c.org ? `<div style="font-size:0.78rem;color:var(--primary);font-weight:600;">${safe(c.org)}</div>` : ''}${c.date ? `<div style="font-size:0.76rem;color:var(--text-light);">${safe(c.date)}</div>` : ''}</div>`).join('')}</div>` : ''}
        ${d.website || d.linkedin ? `<div class="rcc-sidebar-section"><div class="rcc-sidebar-title">Links</div>${d.website ? `<div style="font-size:0.83rem;margin-bottom:6px;"><i class="fas fa-globe" style="color:var(--primary);margin-right:5px;"></i>${safe(d.website)}</div>` : ''}${d.linkedin ? `<div style="font-size:0.83rem;"><i class="fab fa-linkedin" style="color:var(--primary);margin-right:5px;"></i>${safe(d.linkedin)}</div>` : ''}</div>` : ''}
      </div>
    </div>
  </div>`;
}

// ===================== UPDATE PREVIEW =====================
function updatePreview() {
  const data = collectResumeData();
  const preview = document.getElementById('resumePreview');
  if (!preview) return;
  
  if (currentTemplate === 'classic') preview.innerHTML = renderClassic(data);
  else if (currentTemplate === 'modern') preview.innerHTML = renderModern(data);
  else if (currentTemplate === 'creative') preview.innerHTML = renderCreative(data);
  
  updateProgress(data);
  scheduleAutoSave(data);
  applyResumeColor(resumeCurrentColor);
}

function updateProgress(data) {
  let filled = 0, total = 6;
  if (data.firstName || data.lastName) filled++;
  if (data.jobTitle) filled++;
  if (data.email) filled++;
  if (data.summary) filled++;
  if (data.experience.length > 0) filled++;
  if (data.skills.length > 0) filled++;
  const pct = Math.round((filled / total) * 100);
  const progressFill = document.getElementById('progressFill');
  const progressPct = document.getElementById('progressPct');
  if (progressFill) progressFill.style.width = pct + '%';
  if (progressPct) progressPct.textContent = pct + '%';
}

// ===================== DYNAMIC ENTRIES =====================
function addExperience() {
  experienceCount++;
  const id = 'exp_' + experienceCount;
  const div = document.createElement('div');
  div.className = 'dynamic-entry';
  div.id = id;
  div.innerHTML = `
    <button class="remove-entry" onclick="window.removeEntry('${id}')"><i class="fas fa-times"></i></button>
    <div class="form-row">
      <div class="builder-form-group">
        <label class="builder-label">Job Title</label>
        <input type="text" class="builder-input exp-title" placeholder="e.g. Software Engineer" oninput="updatePreview()" />
      </div>
      <div class="builder-form-group">
        <label class="builder-label">Company</label>
        <input type="text" class="builder-input exp-company" placeholder="e.g. Google" oninput="updatePreview()" />
      </div>
    </div>
    <div class="form-row">
      <div class="builder-form-group">
        <label class="builder-label">Start Date</label>
        <input type="text" class="builder-input exp-start" placeholder="Jan 2020" oninput="updatePreview()" />
      </div>
      <div class="builder-form-group">
        <label class="builder-label">End Date</label>
        <input type="text" class="builder-input exp-end" placeholder="Dec 2023 / Present" oninput="updatePreview()" />
      </div>
    </div>
    <div class="builder-form-group">
      <label class="builder-label">Description</label>
      <textarea class="builder-input builder-textarea" style="min-height:75px;" placeholder="Describe your responsibilities..." oninput="updatePreview()"></textarea>
    </div>
    <button class="ai-btn" onclick="window.aiImproveExperience(this)">
      <i class="fas fa-magic"></i> ✨ AI Improve Description
      <i class="fas fa-spinner ai-loading"></i>
    </button>`;
  const container = document.getElementById('experienceList');
  if (container) container.appendChild(div);
  updatePreview();
}

function addEducation() {
  educationCount++;
  const id = 'edu_' + educationCount;
  const div = document.createElement('div');
  div.className = 'dynamic-entry';
  div.id = id;
  div.innerHTML = `
    <button class="remove-entry" onclick="window.removeEntry('${id}')"><i class="fas fa-times"></i></button>
    <div class="form-row">
      <div class="builder-form-group">
        <label class="builder-label">Degree</label>
        <input type="text" class="builder-input edu-degree" placeholder="e.g. B.Sc Computer Science" oninput="updatePreview()" />
      </div>
      <div class="builder-form-group">
        <label class="builder-label">Institution</label>
        <input type="text" class="builder-input edu-institution" placeholder="e.g. MIT" oninput="updatePreview()" />
      </div>
    </div>
    <div class="form-row">
      <div class="builder-form-group">
        <label class="builder-label">Year</label>
        <input type="text" class="builder-input edu-year" placeholder="2018 - 2022" oninput="updatePreview()" />
      </div>
      <div class="builder-form-group">
        <label class="builder-label">GPA / Grade</label>
        <input type="text" class="builder-input edu-gpa" placeholder="e.g. 3.8 / 4.0" oninput="updatePreview()" />
      </div>
    </div>`;
  const container = document.getElementById('educationList');
  if (container) container.appendChild(div);
  updatePreview();
}

function addProject() {
  projectsCount++;
  const id = 'proj_' + projectsCount;
  const div = document.createElement('div');
  div.className = 'dynamic-entry';
  div.id = id;
  div.innerHTML = `
    <button class="remove-entry" onclick="window.removeEntry('${id}')"><i class="fas fa-times"></i></button>
    <div class="form-row">
      <div class="builder-form-group">
        <label class="builder-label">Project Name</label>
        <input type="text" class="builder-input proj-name" placeholder="e.g. E-commerce App" oninput="updatePreview()" />
      </div>
      <div class="builder-form-group">
        <label class="builder-label">Technologies</label>
        <input type="text" class="builder-input proj-tech" placeholder="e.g. React, Node.js" oninput="updatePreview()" />
      </div>
    </div>
    <div class="builder-form-group">
      <label class="builder-label">Project Link</label>
      <input type="text" class="builder-input proj-link" placeholder="https://..." oninput="updatePreview()" />
    </div>
    <div class="builder-form-group">
      <label class="builder-label">Description</label>
      <textarea class="builder-input builder-textarea" style="min-height:70px;" placeholder="Describe the project..." oninput="updatePreview()"></textarea>
    </div>
    <button class="ai-btn" onclick="window.aiImproveProject(this)">
      <i class="fas fa-magic"></i> ✨ AI Improve Description
      <i class="fas fa-spinner ai-loading"></i>
    </button>`;
  const container = document.getElementById('projectsList');
  if (container) container.appendChild(div);
  updatePreview();
}

function addCertification() {
  certificationsCount++;
  const id = 'cert_' + certificationsCount;
  const div = document.createElement('div');
  div.className = 'dynamic-entry';
  div.id = id;
  div.innerHTML = `
    <button class="remove-entry" onclick="window.removeEntry('${id}')"><i class="fas fa-times"></i></button>
    <div class="form-row">
      <div class="builder-form-group">
        <label class="builder-label">Certificate Name</label>
        <input type="text" class="builder-input cert-name" placeholder="e.g. AWS Solutions Architect" oninput="updatePreview()" />
      </div>
      <div class="builder-form-group">
        <label class="builder-label">Issuing Org</label>
        <input type="text" class="builder-input cert-org" placeholder="e.g. Amazon" oninput="updatePreview()" />
      </div>
    </div>
    <div class="builder-form-group">
      <label class="builder-label">Date</label>
      <input type="text" class="builder-input cert-date" placeholder="e.g. March 2023" oninput="updatePreview()" />
    </div>`;
  const container = document.getElementById('certificationsList');
  if (container) container.appendChild(div);
  updatePreview();
}

window.removeEntry = function(id) {
  const el = document.getElementById(id);
  if (el) { el.remove(); updatePreview(); }
};

// ===================== SKILLS =====================
function addSkill() {
  const inp = document.getElementById('skillInput');
  const val = inp?.value.trim();
  if (!val || skills.includes(val)) { if (inp) inp.value = ''; return; }
  skills.push(val);
  renderSkills();
  if (inp) inp.value = '';
  updatePreview();
}

function removeSkill(s) {
  skills = skills.filter(x => x !== s);
  renderSkills();
  updatePreview();
}

function renderSkills() {
  const container = document.getElementById('skillsList');
  if (!container) return;
  container.innerHTML = skills.map(s => `
    <div class="skill-tag">${safe(s)}<button onclick="window.removeSkill('${s}')"><i class="fas fa-times"></i></button></div>
  `).join('');
}

window.removeSkill = removeSkill;

// ===================== AUTO SAVE =====================
function scheduleAutoSave(data) {
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => saveResumeData(data), 1500);
  const status = document.getElementById('autoSaveStatus');
  if (status) status.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Saving...';
}



async function saveResumeData(data) {
  if (!currentUser) return;
  
  try {
    await setDoc(doc(db, 'users', currentUser.uid), { 
      resumeData: data, 
      updatedAt: serverTimestamp() 
    }, { merge: true });

    const status = document.getElementById('autoSaveStatus');
    if (status) status.innerHTML = '<i class="fas fa-check-circle" style="color:var(--primary)"></i> All changes saved';

  } catch(e) {
    console.error("FIREBASE ERROR:", e); // 👈 IMPORTANT
    const status = document.getElementById('autoSaveStatus');
    if (status) status.innerHTML = '<i class="fas fa-exclamation-circle" style="color:#ef4444"></i> Save failed';
  }
}

async function loadResumeData() {
  if (!currentUser) return;
  try {
    const snap = await getDoc(doc(db, 'users', currentUser.uid));
    if (snap.exists()) {
      const data = snap.data().resumeData;
      if (data) populateForm(data);
    }
  } catch(e) { console.log('Load error', e); }
}

function populateForm(data) {
  const set = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined) el.value = val; };
  set('f_firstName', data.firstName);
  set('f_lastName', data.lastName);
  set('f_jobTitle', data.jobTitle);
  set('f_email', data.email);
  set('f_phone', data.phone);
  set('f_location', data.location);
  set('f_linkedin', data.linkedin);
  set('f_website', data.website);
  set('f_summary', data.summary);
  
  skills = data.skills || [];
  renderSkills();
  
  if (data.experience) {
    data.experience.forEach(e => { 
      addExperience(); 
      const last = document.querySelector('#experienceList .dynamic-entry:last-child'); 
      if (last) {
        if (last.querySelector('.exp-title')) last.querySelector('.exp-title').value = e.title || '';
        if (last.querySelector('.exp-company')) last.querySelector('.exp-company').value = e.company || '';
        if (last.querySelector('.exp-start')) last.querySelector('.exp-start').value = e.start || '';
        if (last.querySelector('.exp-end')) last.querySelector('.exp-end').value = e.end || '';
        if (last.querySelector('textarea')) last.querySelector('textarea').value = e.desc || '';
      }
    });
  }
  
  if (data.education) {
    data.education.forEach(e => { 
      addEducation(); 
      const last = document.querySelector('#educationList .dynamic-entry:last-child'); 
      if (last) {
        if (last.querySelector('.edu-degree')) last.querySelector('.edu-degree').value = e.degree || '';
        if (last.querySelector('.edu-institution')) last.querySelector('.edu-institution').value = e.institution || '';
        if (last.querySelector('.edu-year')) last.querySelector('.edu-year').value = e.year || '';
        if (last.querySelector('.edu-gpa')) last.querySelector('.edu-gpa').value = e.gpa || '';
      }
    });
  }
  
  if (data.projects) {
    data.projects.forEach(p => { 
      addProject(); 
      const last = document.querySelector('#projectsList .dynamic-entry:last-child'); 
      if (last) {
        if (last.querySelector('.proj-name')) last.querySelector('.proj-name').value = p.name || '';
        if (last.querySelector('.proj-tech')) last.querySelector('.proj-tech').value = p.tech || '';
        if (last.querySelector('.proj-link')) last.querySelector('.proj-link').value = p.link || '';
        if (last.querySelector('textarea')) last.querySelector('textarea').value = p.desc || '';
      }
    });
  }
  
  if (data.certifications) {
    data.certifications.forEach(c => { 
      addCertification(); 
      const last = document.querySelector('#certificationsList .dynamic-entry:last-child'); 
      if (last) {
        if (last.querySelector('.cert-name')) last.querySelector('.cert-name').value = c.name || '';
        if (last.querySelector('.cert-org')) last.querySelector('.cert-org').value = c.org || '';
        if (last.querySelector('.cert-date')) last.querySelector('.cert-date').value = c.date || '';
      }
    });
  }
  
  if (data.templateId) { 
    currentTemplate = data.templateId; 
    updateTemplateBtns();
  }
  
  updatePreview();
}

function updateTemplateBtns() {
  document.querySelectorAll('.tpl-btn').forEach(btn => {
    const tpl = btn.getAttribute('data-template');
    btn.classList.toggle('active', tpl === currentTemplate);
  });
}

// ===================== TEMPLATE SWITCHING =====================
function switchTemplate(tpl, btn) {
  currentTemplate = tpl;
  updateTemplateBtns();
  updatePreview();
}

// ===================== PDF DOWNLOAD =====================

// ===================== PDF DOWNLOAD WITH PERFECT PAGE MARGINS =====================
// ===================== PDF DOWNLOAD WITH PROPER 4-SIDE MARGINS =====================
// ===================== PDF DOWNLOAD - DIRECT DOWNLOAD WITH PROPER MARGINS =====================
// ===================== PDF DOWNLOAD - SIRF PAGE BREAK KE LIYE MARGIN =====================
// ===================== PDF DOWNLOAD - FIRST PAGE BOTTOM + SECOND PAGE TOP MARGIN =====================
// ===================== PDF DOWNLOAD - SMART PAGE BREAK =====================
// ===================== PDF DOWNLOAD - PERFECT PAGE BREAK =====================
// ===================== PDF DOWNLOAD - SIMPLE (DEFAULT HTML2PDF) =====================
function downloadPDF() {
  const firstName = document.getElementById('f_firstName')?.value || '';
  const lastName = document.getElementById('f_lastName')?.value || '';
  const name = [firstName, lastName].filter(Boolean).join('_') || 'Resume';
  const element = document.getElementById('resumePreview');
  if (!element) return;
  
  showLoading('Generating PDF...');
  
  const opt = {
    margin: [0, 0, 10, 0],
    filename: `${name}_Resume.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };
  
  html2pdf().set(opt).from(element).save().then(() => {
    hideLoading();
    showToast('Resume downloaded successfully!', 'success');
  }).catch((error) => {
    console.error('PDF error:', error);
    hideLoading();
    showToast('PDF download failed. Please try again.', 'error');
  });
}
// ===================== GEMINI AI FUNCTIONS =====================
async function callGemini(prompt) {
  try {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    if (!response.ok) throw new Error('AI request failed');
    const json = await response.json();
    return json.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch (e) {
    console.error('Gemini error:', e);
    return '';
  }
}

async function aiGenerateSummary() {
  const jobTitle = document.getElementById('f_jobTitle')?.value.trim() || '';
  const firstName = document.getElementById('f_firstName')?.value.trim() || '';
  const lastName = document.getElementById('f_lastName')?.value.trim() || '';
  const name = [firstName, lastName].filter(Boolean).join(' ');
  const exp = Array.from(document.querySelectorAll('.exp-title')).map(el => el.value).filter(Boolean);
  const skillList = skills.join(', ');
  
  if (!jobTitle) { 
    showToast('Please enter your job title first!', 'error'); 
    return; 
  }
  
  const btnText = document.getElementById('aiSummaryBtnText');
  const loader = document.getElementById('aiSummaryLoader');
  if (btnText) btnText.textContent = 'Generating...';
  if (loader) loader.classList.add('show');
  
  try {
    const prompt = `Write a professional resume summary for ${name || 'a professional'} applying as a ${jobTitle}. ${exp.length ? 'Previous roles: ' + exp.join(', ') + '.' : ''} ${skillList ? 'Skills: ' + skillList + '.' : ''} Write 3-4 impactful sentences. Only return the summary text, no extra formatting.`;
    const result = await callGemini(prompt);
    const summaryEl = document.getElementById('f_summary');
    if (summaryEl && result) {
      summaryEl.value = result.trim();
      updatePreview();
      showToast('Summary generated!', 'success');
    }
  } catch(e) {
    showToast('AI generation failed. Check your API key.', 'error');
  } finally {
    if (btnText) btnText.textContent = '✨ AI Generate Summary';
    if (loader) loader.classList.remove('show');
  }
}

async function aiSuggestSkills() {
  const jobTitle = document.getElementById('f_jobTitle')?.value.trim() || '';
  if (!jobTitle) { 
    showToast('Please enter your job title first!', 'error'); 
    return; 
  }
  
  const btnText = document.getElementById('aiSkillsBtnText');
  const loader = document.getElementById('aiSkillsLoader');
  if (btnText) btnText.textContent = 'Suggesting...';
  if (loader) loader.classList.add('show');
  
  try {
    const prompt = `List 8-10 key technical and soft skills for a ${jobTitle}. Return only a comma-separated list of skill names, no numbers, no extra text, no formatting.`;
    const result = await callGemini(prompt);
    if (result) {
      const newSkills = result.split(',').map(s => s.trim().replace(/^[-•*]\s*/, '')).filter(s => s.length > 0 && s.length < 40);
      newSkills.forEach(s => { if (!skills.includes(s)) skills.push(s); });
      renderSkills();
      updatePreview();
      showToast(`${newSkills.length} skills suggested!`, 'success');
    }
  } catch(e) {
    showToast('AI suggestion failed. Check your API key.', 'error');
  } finally {
    if (btnText) btnText.textContent = '✨ AI Suggest Skills';
    if (loader) loader.classList.remove('show');
  }
}

window.aiImproveExperience = async function(btn) {
  const entry = btn.closest('.dynamic-entry');
  const textarea = entry.querySelector('textarea');
  const title = entry.querySelector('.exp-title')?.value || '';
  const company = entry.querySelector('.exp-company')?.value || '';
  const desc = textarea?.value || '';
  
  if (!desc && !title) { 
    showToast('Please enter job title/description first!', 'error'); 
    return; 
  }
  
  const loader = btn.querySelector('.ai-loading');
  btn.disabled = true;
  if (loader) loader.classList.add('show');
  
  try {
    const prompt = `Improve this job description for a ${title} at ${company}: "${desc || 'No description provided yet. Write 3 impactful bullet-point style responsibilities for this role.'}". Write 3-4 impactful achievement-focused bullet points using action verbs. Use • bullet points. Return only the improved text.`;
    const result = await callGemini(prompt);
    if (textarea && result) {
      textarea.value = result.trim();
      updatePreview();
      showToast('Description improved!', 'success');
    }
  } catch(e) {
    showToast('AI improvement failed. Check your API key.', 'error');
  } finally {
    btn.disabled = false;
    if (loader) loader.classList.remove('show');
  }
};

window.aiImproveProject = async function(btn) {
  const entry = btn.closest('.dynamic-entry');
  const textarea = entry.querySelector('textarea');
  const name = entry.querySelector('.proj-name')?.value || '';
  const tech = entry.querySelector('.proj-tech')?.value || '';
  const desc = textarea?.value || '';
  
  if (!name && !desc) { 
    showToast('Please enter project name first!', 'error'); 
    return; 
  }
  
  const loader = btn.querySelector('.ai-loading');
  btn.disabled = true;
  if (loader) loader.classList.add('show');
  
  try {
    const prompt = `Write an impressive project description for a resume about a project called "${name}" built with "${tech}". Current description: "${desc || 'Not provided'}". Write 2-3 impactful sentences highlighting impact, technologies, and achievements. Return only the description text.`;
    const result = await callGemini(prompt);
    if (textarea && result) {
      textarea.value = result.trim();
      updatePreview();
      showToast('Project description improved!', 'success');
    }
  } catch(e) {
    showToast('AI improvement failed. Check your API key.', 'error');
  } finally {
    btn.disabled = false;
    if (loader) loader.classList.remove('show');
  }
};

// ===================== RESUME COLOR CHANGER =====================
function shadeResumeColor(color, percent) {
  let R, G, B;
  if (color.startsWith('#')) {
    R = parseInt(color.substring(1,3), 16);
    G = parseInt(color.substring(3,5), 16);
    B = parseInt(color.substring(5,7), 16);
  } else {
    return color;
  }
  
  R = Math.min(255, Math.max(0, R + (R * percent / 100)));
  G = Math.min(255, Math.max(0, G + (G * percent / 100)));
  B = Math.min(255, Math.max(0, B + (B * percent / 100)));
  
  return `#${Math.round(R).toString(16).padStart(2,'0')}${Math.round(G).toString(16).padStart(2,'0')}${Math.round(B).toString(16).padStart(2,'0')}`;
}

function applyResumeColor(color) {
  resumeCurrentColor = color;
  const darkerColor = shadeResumeColor(color, -20);
  const darkerColor2 = shadeResumeColor(color, -35);
  const lightColor = shadeResumeColor(color, 70);
  
  let styleEl = document.getElementById('resume-dynamic-styles');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'resume-dynamic-styles';
    document.head.appendChild(styleEl);
  }
  
  styleEl.innerHTML = `
    .resume-classic .rc-header { border-bottom-color: ${color} !important; }
    .resume-classic .rc-section-title { color: ${color} !important; border-bottom-color: ${lightColor} !important; }
    .resume-classic .rc-skill { background: ${lightColor} !important; color: ${darkerColor2} !important; }
    .resume-classic .rc-entry-company { color: ${color} !important; }
    .resume-classic .rc-contact i { color: ${color} !important; }
    .resume-modern .rm-sidebar { background: ${darkerColor2} !important; }
    .resume-modern .rm-main-role { color: ${color} !important; }
    .resume-modern .rm-section-heading { color: ${color} !important; border-bottom-color: ${lightColor} !important; }
    .resume-modern .rm-skill-tag { background: ${lightColor} !important; color: ${darkerColor2} !important; }
    .resume-modern .rm-skill-fill { background: ${color} !important; }
    .resume-modern .rm-entry-sub { color: ${color} !important; }
    .resume-modern .rm-contact-item i { color: ${color} !important; }
    .resume-modern .rm-avatar { background: ${color} !important; }
    .resume-creative .rcc-header { background: linear-gradient(135deg, ${color}, ${darkerColor}) !important; }
    .resume-creative .rcc-section-title { color: ${color} !important; }
    .resume-creative .rcc-section-title::after { background: ${lightColor} !important; }
    .resume-creative .rcc-entry-sub { color: ${color} !important; }
    .resume-creative .rcc-sidebar-title { color: ${color} !important; border-bottom-color: ${lightColor} !important; }
    .resume-creative .rcc-skill-dot { color: ${color} !important; }
    .resume-creative .rcc-tag { background: ${lightColor} !important; color: ${darkerColor2} !important; }
    .resume-creative .rcc-contact-item i { color: ${color} !important; }
    .resume-creative .rcc-avatar { background: ${color} !important; }
    .rc-skill, .rm-skill-tag, .rcc-tag { background: ${lightColor} !important; color: ${darkerColor2} !important; }
    .resume-wrapper .btn-primary, .resume-wrapper .btn-outline { background: ${color} !important; border-color: ${color} !important; }
    .resume-classic a, .resume-modern a, .resume-creative a { color: ${color} !important; }
  `;
  
  if (currentUser) {
    localStorage.setItem(`resumeColor_${currentUser.uid}`, color);
  }
}

function toggleResumeColorPanel() {
  const panel = document.getElementById('resumeColorPanel');
  if (panel) panel.classList.toggle('open');
}

function applyResumeCustomColor(color) {
  applyResumeColor(color);
  document.querySelectorAll('.resume-color-option').forEach(opt => {
    opt.classList.remove('active');
  });
}

function resetResumeColor() {
  applyResumeColor('#16a34a');
  const customPicker = document.getElementById('resumeCustomColorPicker');
  if (customPicker) customPicker.value = '#16a34a';
  document.querySelectorAll('.resume-color-option').forEach(opt => {
    if (opt.dataset.color === '#16a34a') {
      opt.classList.add('active');
    } else {
      opt.classList.remove('active');
    }
  });
  if (currentUser) {
    localStorage.removeItem(`resumeColor_${currentUser.uid}`);
  }
  showToast('Resume color reset to default green!', 'success');
}

function loadSavedResumeColor() {
  if (currentUser) {
    const savedColor = localStorage.getItem(`resumeColor_${currentUser.uid}`);
    if (savedColor) {
      applyResumeColor(savedColor);
      const customPicker = document.getElementById('resumeCustomColorPicker');
      if (customPicker) customPicker.value = savedColor;
      document.querySelectorAll('.resume-color-option').forEach(opt => {
        if (opt.dataset.color === savedColor) {
          opt.classList.add('active');
        } else {
          opt.classList.remove('active');
        }
      });
    }
  }
}

// ===================== MOBILE TABS =====================
function switchBuilderTab(tab, btn) {
  document.querySelectorAll('.builder-tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  
  const formPanel = document.getElementById('formPanel');
  const previewPanel = document.getElementById('previewPanel');
  
  if (tab === 'form') {
    if (formPanel) {
      formPanel.classList.add('mobile-active');
      formPanel.style.display = 'flex';
    }
    if (previewPanel) {
      previewPanel.classList.remove('mobile-active');
      previewPanel.style.display = 'none';
    }
  } else {
    if (previewPanel) {
      previewPanel.classList.add('mobile-active');
      previewPanel.style.display = 'flex';
    }
    if (formPanel) {
      formPanel.classList.remove('mobile-active');
      formPanel.style.display = 'none';
    }
  }
}

// ===================== ACCORDION TOGGLE =====================
function toggleAccordion(header) {
  header.classList.toggle('open');
  const body = header.nextElementSibling;
  if (body) body.classList.toggle('open');
}

// ===================== LOGOUT =====================
async function handleLogout() {
  try {
    await signOut(auth);
    showToast('Logged out successfully!', 'success');
    window.location.href = 'index.html';
  } catch (err) {
    showToast('Error logging out: ' + err.message, 'error');
  }
}

// ===================== INITIALIZATION =====================
document.addEventListener('DOMContentLoaded', () => {
  // Check if user is logged in
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      
      // Check for selected template from session storage
      const selectedTemplate = sessionStorage.getItem('selectedTemplate');
      if (selectedTemplate) {
        currentTemplate = selectedTemplate;
        sessionStorage.removeItem('selectedTemplate');
        updateTemplateBtns();
      }
      
      await loadResumeData();
      loadSavedResumeColor();
    } else {
      // Redirect to login if not logged in
      window.location.href = 'login.html';
    }
  });
  
  // Setup event listeners
  const addExperienceBtn = document.getElementById('addExperienceBtn');
  if (addExperienceBtn) addExperienceBtn.addEventListener('click', addExperience);
  
  const addEducationBtn = document.getElementById('addEducationBtn');
  if (addEducationBtn) addEducationBtn.addEventListener('click', addEducation);
  
  const addProjectBtn = document.getElementById('addProjectBtn');
  if (addProjectBtn) addProjectBtn.addEventListener('click', addProject);
  
  const addCertificationBtn = document.getElementById('addCertificationBtn');
  if (addCertificationBtn) addCertificationBtn.addEventListener('click', addCertification);
  
  const addSkillBtn = document.getElementById('addSkillBtn');
  if (addSkillBtn) addSkillBtn.addEventListener('click', addSkill);
  
  const skillInput = document.getElementById('skillInput');
  if (skillInput) {
    skillInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addSkill();
      }
    });
  }
  
  const downloadPdfBtn = document.getElementById('downloadPdfBtn');
  if (downloadPdfBtn) downloadPdfBtn.addEventListener('click', downloadPDF);
  
  const builderLogoutBtn = document.getElementById('builderLogoutBtn');
  if (builderLogoutBtn) builderLogoutBtn.addEventListener('click', handleLogout);
  
  const aiSummaryBtn = document.getElementById('aiSummaryBtn');
  if (aiSummaryBtn) aiSummaryBtn.addEventListener('click', aiGenerateSummary);
  
  const aiSkillsBtn = document.getElementById('aiSkillsBtn');
  if (aiSkillsBtn) aiSkillsBtn.addEventListener('click', aiSuggestSkills);
  
  // Template switcher buttons
  document.querySelectorAll('.tpl-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const template = btn.getAttribute('data-template');
      if (template) switchTemplate(template, btn);
    });
  });
  
  // Mobile tab buttons
  document.querySelectorAll('.builder-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      if (tab) switchBuilderTab(tab, btn);
    });
  });
  
  // Accordion headers
  document.querySelectorAll('.accordion-header').forEach(header => {
    header.addEventListener('click', () => toggleAccordion(header));
  });
  
  // Form input listeners for real-time preview
  const formInputs = ['f_firstName', 'f_lastName', 'f_jobTitle', 'f_email', 'f_phone', 
                      'f_location', 'f_linkedin', 'f_website', 'f_summary'];
  formInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updatePreview);
  });
  
  // Color picker functionality
  const resumeColorToggleBtn = document.getElementById('resumeColorToggleBtn');
  if (resumeColorToggleBtn) {
    resumeColorToggleBtn.addEventListener('click', toggleResumeColorPanel);
  }
  
  document.querySelectorAll('.resume-color-option').forEach(option => {
    option.addEventListener('click', function() {
      const color = this.dataset.color;
      applyResumeColor(color);
      document.querySelectorAll('.resume-color-option').forEach(opt => opt.classList.remove('active'));
      this.classList.add('active');
      const customPicker = document.getElementById('resumeCustomColorPicker');
      if (customPicker) customPicker.value = color;
    });
  });
  
  const customColorPicker = document.getElementById('resumeCustomColorPicker');
  if (customColorPicker) {
    customColorPicker.addEventListener('change', (e) => {
      applyResumeCustomColor(e.target.value);
    });
  }
  
  const resetColorBtn = document.getElementById('resetColorBtn');
  if (resetColorBtn) {
    resetColorBtn.addEventListener('click', resetResumeColor);
  }
  
  // Close color panel when clicking outside
  document.addEventListener('click', function(event) {
    const container = document.querySelector('.resume-color-picker-container');
    const panel = document.getElementById('resumeColorPanel');
    if (container && !container.contains(event.target) && panel && panel.classList.contains('open')) {
      panel.classList.remove('open');
    }
  });
  
  // Initial preview
  updatePreview();
});

// Make functions available globally
window.updatePreview = updatePreview;
window.switchTemplate = switchTemplate;
window.addSkill = addSkill;
window.addExperience = addExperience;
window.addEducation = addEducation;
window.addProject = addProject;
window.addCertification = addCertification;
window.toggleAccordion = toggleAccordion;
window.switchBuilderTab = switchBuilderTab;
window.toggleResumeColorPanel = toggleResumeColorPanel;
window.applyResumeCustomColor = applyResumeCustomColor;
window.resetResumeColor = resetResumeColor;