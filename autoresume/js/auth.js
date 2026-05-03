import { auth, db, googleProvider } from './firebase-config.js';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup,
  updateProfile,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Helper functions
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
  }, 3000);
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

function showAlert(id, msg, isError = true) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = msg;
    el.classList.add('show');
    if (!isError) {
      setTimeout(() => {
        el.classList.remove('show');
      }, 3000);
    }
  }
}

function hideAlert(id) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = '';
    el.classList.remove('show');
  }
}

function showError(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('show');
}

function hideError(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('show');
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getDefaultResumeData() {
  return { 
    firstName: '', lastName: '', jobTitle: '', email: '', phone: '', 
    location: '', linkedin: '', website: '', summary: '', skills: [], 
    experience: [], education: [], projects: [], certifications: [], 
    templateId: 'classic' 
  };
}

function getAuthError(code) {
  const errors = {
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/email-already-in-use': 'This email is already registered. Please log in.',
    'auth/weak-password': 'Password should be at least 6 characters.',
    'auth/invalid-email': 'Invalid email address.',
    'auth/too-many-requests': 'Too many failed attempts. Please try later.',
    'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
    'auth/invalid-credential': 'Invalid email or password.',
  };
  return errors[code] || 'An error occurred. Please try again.';
}

// Password strength checker
function checkStrength(val) {
  const fill = document.getElementById('strengthFill');
  const text = document.getElementById('strengthText');
  if (!fill || !text) return;
  
  let strength = 0;
  if (val.length >= 6) strength++;
  if (val.length >= 10) strength++;
  if (/[A-Z]/.test(val)) strength++;
  if (/[0-9]/.test(val)) strength++;
  if (/[^A-Za-z0-9]/.test(val)) strength++;
  
  const levels = [
    { pct: '20%', color: '#ef4444', label: 'Very Weak' },
    { pct: '40%', color: '#f97316', label: 'Weak' },
    { pct: '60%', color: '#eab308', label: 'Fair' },
    { pct: '80%', color: '#22c55e', label: 'Strong' },
    { pct: '100%', color: '#16a34a', label: 'Very Strong' },
  ];
  
  if (val.length === 0) {
    fill.style.width = '0%';
    text.textContent = '';
    return;
  }
  
  const lvl = levels[Math.min(strength - 1, 4)];
  fill.style.width = lvl.pct;
  fill.style.background = lvl.color;
  text.textContent = lvl.label;
  text.style.color = lvl.color;
}

// Signup handler
async function handleSignup(e) {
  e.preventDefault();
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;
  const confirm = document.getElementById('signupConfirm').value;
  const terms = document.getElementById('termsCheck').checked;
  let valid = true;

  hideAlert('signupError');
  hideAlert('signupSuccess');
  
  if (!name) { showError('signupNameError'); valid = false; } 
  else { hideError('signupNameError'); }
  
  if (!validateEmail(email)) { showError('signupEmailError'); valid = false; } 
  else { hideError('signupEmailError'); }
  
  if (password.length < 6) { showError('signupPassError'); valid = false; } 
  else { hideError('signupPassError'); }
  
  if (password !== confirm) { showError('signupConfirmError'); valid = false; } 
  else { hideError('signupConfirmError'); }
  
  if (!terms) { showError('signupTermsError'); valid = false; } 
  else { hideError('signupTermsError'); }
  
  if (!valid) return;

  const btn = document.getElementById('signupBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
  
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    await setDoc(doc(db, 'users', cred.user.uid), {
      name, email, createdAt: serverTimestamp(),
      resumeData: getDefaultResumeData()
    });
    
    showToast('Account created successfully!', 'success');
    
    // Redirect after short delay
    setTimeout(() => {
      const pendingTemplate = sessionStorage.getItem('pendingTemplate');
      if (pendingTemplate) {
        sessionStorage.removeItem('pendingTemplate');
        sessionStorage.setItem('selectedTemplate', pendingTemplate);
        window.location.href = 'builder.html';
      } else {
        window.location.href = 'index.html';
      }
    }, 1500);
  } catch (err) {
    showAlert('signupError', getAuthError(err.code), true);
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
  }
}

// Login handler
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  let valid = true;

  hideAlert('loginError');
  hideAlert('loginSuccess');
  
  if (!validateEmail(email)) { showError('loginEmailError'); valid = false; } 
  else { hideError('loginEmailError'); }
  
  if (password.length < 6) { showError('loginPassError'); valid = false; } 
  else { hideError('loginPassError'); }
  
  if (!valid) return;

  const btn = document.getElementById('loginBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
  
  try {
    await signInWithEmailAndPassword(auth, email, password);
    showToast('Login successful!', 'success');
    
    // Redirect after short delay
    setTimeout(() => {
      const pendingTemplate = sessionStorage.getItem('pendingTemplate');
      if (pendingTemplate) {
        sessionStorage.removeItem('pendingTemplate');
        sessionStorage.setItem('selectedTemplate', pendingTemplate);
        window.location.href = 'builder.html';
      } else {
        window.location.href = 'index.html';
      }
    }, 1000);
  } catch (err) {
    showAlert('loginError', getAuthError(err.code), true);
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Log In';
  }
}

// Google login
async function handleGoogleLogin() {
  const btn = document.getElementById('googleLoginBtn') || document.getElementById('googleSignupBtn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
  }
  
  showLoading('Signing in with Google...');
  
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    const docRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      await setDoc(docRef, { 
        name: user.displayName, 
        email: user.email, 
        createdAt: serverTimestamp(), 
        resumeData: getDefaultResumeData() 
      });
    }
    
    hideLoading();
    showToast('Signed in successfully!', 'success');
    
    // Redirect after short delay
    setTimeout(() => {
      const pendingTemplate = sessionStorage.getItem('pendingTemplate');
      if (pendingTemplate) {
        sessionStorage.removeItem('pendingTemplate');
        sessionStorage.setItem('selectedTemplate', pendingTemplate);
        window.location.href = 'builder.html';
      } else {
        window.location.href = 'index.html';
      }
    }, 1000);
  } catch (err) {
    hideLoading();
    showToast('Google sign-in failed: ' + err.message, 'error');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" /> Continue with Google';
    }
  }
}

// Forgot password
async function handleForgotPassword() {
  const email = document.getElementById('loginEmail').value.trim();
  if (!validateEmail(email)) {
    showToast('Please enter your email first.', 'error');
    return;
  }
  try {
    await sendPasswordResetEmail(auth, email);
    showToast('Password reset email sent! Check your inbox.', 'success');
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

// Toggle password visibility
window.togglePass = function(inputId, element) {
  const inp = document.getElementById(inputId);
  const icon = element.querySelector('i');
  if (inp.type === 'password') {
    inp.type = 'text';
    icon.className = 'fas fa-eye-slash';
  } else {
    inp.type = 'password';
    icon.className = 'fas fa-eye';
  }
};

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  // Signup form
  const signupForm = document.getElementById('signupForm');
  if (signupForm) {
    signupForm.addEventListener('submit', handleSignup);
  }
  
  // Login form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
  
  // Google buttons
  const googleLoginBtn = document.getElementById('googleLoginBtn');
  if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', handleGoogleLogin);
  }
  
  const googleSignupBtn = document.getElementById('googleSignupBtn');
  if (googleSignupBtn) {
    googleSignupBtn.addEventListener('click', handleGoogleLogin);
  }
  
  // Forgot password
  const forgotBtn = document.getElementById('forgotPasswordBtn');
  if (forgotBtn) {
    forgotBtn.addEventListener('click', (e) => {
      e.preventDefault();
      handleForgotPassword();
    });
  }
  
  // Password strength checker
  const passInput = document.getElementById('signupPassword');
  if (passInput) {
    passInput.addEventListener('input', (e) => checkStrength(e.target.value));
  }
});