import { auth, db, googleProvider } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Global variables
let currentUser = null;
let pendingTemplate = null;

// Toast helper
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

// Update UI based on auth state
// Update UI based on auth state (Desktop + Mobile)
function updateNavUI(user) {
  const navActions = document.getElementById('navActions');
  const userNav = document.getElementById('userNav');
  const userAvatar = document.getElementById('userAvatar');
  const userNameNav = document.getElementById('userNameNav');
  
  // Desktop menu
  if (user) {
    if (navActions) navActions.style.display = 'none';
    if (userNav) userNav.style.display = 'flex';
    const name = user.displayName || user.email;
    if (userNameNav) userNameNav.textContent = name.split(' ')[0];
    if (userAvatar) userAvatar.textContent = (name[0] || 'U').toUpperCase();
  } else {
    if (navActions) navActions.style.display = 'flex';
    if (userNav) userNav.style.display = 'none';
  }
  
  // ========== MOBILE MENU UPDATE ==========
  const mobileActions = document.querySelector('.mobile-menu .mobile-actions');
  const mobileUserNav = document.querySelector('.mobile-menu .mobile-user-nav');
  
  if (user) {
    // Logged in - hide login/signup, show user info and logout
    if (mobileActions) mobileActions.style.display = 'none';
    
    if (mobileUserNav) {
      mobileUserNav.style.display = 'flex';
      const mobileAvatar = mobileUserNav.querySelector('.mobile-user-avatar');
      const mobileName = mobileUserNav.querySelector('.mobile-user-name');
      const mobileLogoutBtn = mobileUserNav.querySelector('.mobile-logout-btn');
      
      if (mobileAvatar) {
        const name = user.displayName || user.email;
        mobileAvatar.textContent = (name[0] || 'U').toUpperCase();
      }
      if (mobileName) {
        const name = user.displayName || user.email;
        mobileName.textContent = name.split(' ')[0];
      }
      if (mobileLogoutBtn) {
        mobileLogoutBtn.onclick = () => handleLogout();
      }
    } else {
      // Create mobile user nav if not exists
      const mobileMenu = document.getElementById('mobileMenu');
      if (mobileMenu && mobileActions) {
        const newMobileUserNav = document.createElement('div');
        newMobileUserNav.className = 'mobile-user-nav';
        newMobileUserNav.style.cssText = 'display: flex; align-items: center; gap: 12px; margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border);';
        newMobileUserNav.innerHTML = `
          <div class="mobile-user-avatar" style="width: 38px; height: 38px; border-radius: 50%; background: var(--primary-light); color: var(--primary-dark); display: flex; align-items: center; justify-content: center; font-weight: 700;">${(user.displayName || user.email)[0].toUpperCase()}</div>
          <span class="mobile-user-name" style="font-weight: 600; flex: 1;">${(user.displayName || user.email).split(' ')[0]}</span>
          <button class="btn btn-outline btn-sm mobile-logout-btn">Logout</button>
        `;
        mobileActions.parentNode.insertBefore(newMobileUserNav, mobileActions.nextSibling);
        mobileActions.style.display = 'none';
        
        const mobileLogoutBtn = newMobileUserNav.querySelector('.mobile-logout-btn');
        if (mobileLogoutBtn) mobileLogoutBtn.onclick = () => handleLogout();
      }
    }
  } else {
    // Logged out - hide user nav, show login/signup
    if (mobileActions) mobileActions.style.display = 'flex';
    if (mobileUserNav) mobileUserNav.style.display = 'none';
  }
}
// Handle logout
async function handleLogout() {
  try {
    await signOut(auth);
    showToast('Logged out successfully!', 'success');
    window.location.href = 'index.html';
  } catch (err) {
    showToast('Error logging out: ' + err.message, 'error');
  }
}

// Scroll to section function - FIXED
window.scrollToSection = function(sectionId) {
  const element = document.getElementById(sectionId);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
  }
};

// Handle start creating - FIXED
window.handleStartCreating = function() {
  if (currentUser) {
    window.location.href = 'builder.html';
  } else {
    window.location.href = 'login.html';
  }
};

// Handle use template - FIXED
window.handleUseTemplate = function(template) {
  if (currentUser) {
    sessionStorage.setItem('selectedTemplate', template);
    window.location.href = 'builder.html';
  } else {
    sessionStorage.setItem('pendingTemplate', template);
    window.location.href = 'login.html';
  }
};

// FAQ Toggle - FIXED
window.toggleFaq = function(questionElement) {
  questionElement.classList.toggle('open');
  const answer = questionElement.nextElementSibling;
  if (answer) answer.classList.toggle('open');
};

// Mobile menu toggle - FIXED
window.toggleMobileMenu = function() {
  const menu = document.getElementById('mobileMenu');
  if (menu) menu.classList.toggle('open');
};

// Password visibility toggle (for auth pages if needed)
window.togglePass = function(inputId, element) {
  const inp = document.getElementById(inputId);
  const icon = element.querySelector('i');
  if (inp) {
    if (inp.type === 'password') {
      inp.type = 'text';
      if (icon) icon.className = 'fas fa-eye-slash';
    } else {
      inp.type = 'password';
      if (icon) icon.className = 'fas fa-eye';
    }
  }
};

// Show page function (if needed for any inline calls)
window.showPage = function(pageId) {
  // For landing page, just scroll to top
  window.scrollTo(0, 0);
};

// Check if user is logged in on landing page
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  updateNavUI(user);
  
  // Check for pending template from session storage
  const pending = sessionStorage.getItem('pendingTemplate');
  if (pending && user) {
    sessionStorage.removeItem('pendingTemplate');
    sessionStorage.setItem('selectedTemplate', pending);
    window.location.href = 'builder.html';
  }
});

// Initialize event listeners when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, setting up event listeners');
  
  // Get all FAQ questions and attach click handlers
  const faqQuestions = document.querySelectorAll('.faq-question');
  faqQuestions.forEach(question => {
    // Remove any existing listeners and add new one
    question.removeEventListener('click', window.toggleFaq);
    question.addEventListener('click', function() {
      window.toggleFaq(this);
    });
  });
  
  // Get all "Use This Template" buttons
  const useTemplateBtns = document.querySelectorAll('.use-template-btn');
  useTemplateBtns.forEach(btn => {
    btn.removeEventListener('click', btn._listener);
    const template = btn.getAttribute('data-template');
    btn._listener = function() {
      window.handleUseTemplate(template);
    };
    btn.addEventListener('click', btn._listener);
  });
  
  // Get "Start Creating Resume" button
  const startCreatingBtn = document.getElementById('startCreatingBtn');
  if (startCreatingBtn) {
    startCreatingBtn.removeEventListener('click', startCreatingBtn._listener);
    startCreatingBtn._listener = function() {
      window.handleStartCreating();
    };
    startCreatingBtn.addEventListener('click', startCreatingBtn._listener);
  }
  
  // Get "View Templates" button
  const viewTemplatesBtn = document.getElementById('viewTemplatesBtn');
  if (viewTemplatesBtn) {
    viewTemplatesBtn.removeEventListener('click', viewTemplatesBtn._listener);
    viewTemplatesBtn._listener = function() {
      window.scrollToSection('templates');
    };
    viewTemplatesBtn.addEventListener('click', viewTemplatesBtn._listener);
  }
  
  // Get CTA button
  const ctaStartBtn = document.getElementById('ctaStartBtn');
  if (ctaStartBtn) {
    ctaStartBtn.removeEventListener('click', ctaStartBtn._listener);
    ctaStartBtn._listener = function() {
      window.handleStartCreating();
    };
    ctaStartBtn.addEventListener('click', ctaStartBtn._listener);
  }
  
  // Navigation links
  const navLinks = {
    'navHowItWorks': 'how-it-works',
    'navTemplates': 'templates',
    'navTestimonials': 'testimonials',
    'navFaq': 'faq'
  };
  
  for (const [id, section] of Object.entries(navLinks)) {
    const el = document.getElementById(id);
    if (el) {
      el.removeEventListener('click', el._listener);
      el._listener = function(e) {
        e.preventDefault();
        window.scrollToSection(section);
      };
      el.addEventListener('click', el._listener);
    }
  }
  
  // Mobile navigation links
  const mobileLinks = {
    'mobileHowItWorks': 'how-it-works',
    'mobileTemplates': 'templates',
    'mobileTestimonials': 'testimonials',
    'mobileFaq': 'faq'
  };
  
  for (const [id, section] of Object.entries(mobileLinks)) {
    const el = document.getElementById(id);
    if (el) {
      el.removeEventListener('click', el._listener);
      el._listener = function(e) {
        e.preventDefault();
        window.scrollToSection(section);
        window.toggleMobileMenu();
      };
      el.addEventListener('click', el._listener);
    }
  }
  
  // Footer links
  const footerLinks = document.querySelectorAll('.footer-link-how, .footer-link-templates, .footer-link-faq');
  footerLinks.forEach(link => {
    link.removeEventListener('click', link._listener);
    link._listener = function(e) {
      e.preventDefault();
      const href = link.getAttribute('href');
      if (href) {
        const sectionId = href.substring(1);
        window.scrollToSection(sectionId);
      }
    };
    link.addEventListener('click', link._listener);
  });
  
  // Logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.removeEventListener('click', logoutBtn._listener);
    logoutBtn._listener = function() {
      handleLogout();
    };
    logoutBtn.addEventListener('click', logoutBtn._listener);
  }
  
  // Hamburger menu
  const hamburger = document.getElementById('hamburger');
  if (hamburger) {
    hamburger.removeEventListener('click', hamburger._listener);
    hamburger._listener = function() {
      window.toggleMobileMenu();
    };
    hamburger.addEventListener('click', hamburger._listener);
  }
  
  // Close mobile menu when clicking a link inside mobile menu
  const mobileLinksAll = document.querySelectorAll('.mobile-menu a, .mobile-menu button');
  mobileLinksAll.forEach(link => {
    link.addEventListener('click', () => {
      const menu = document.getElementById('mobileMenu');
      if (menu) menu.classList.remove('open');
    });
  });
});