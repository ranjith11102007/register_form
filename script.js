(function () {
  'use strict';

  const STORAGE_KEY = 'students';

  const $ = (id) => document.getElementById(id);
  const themeToggle = $('themeToggle');
  const themeKey = 'siteTheme';

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem(themeKey, theme); } catch (e) {}
  }

  function initTheme() {
    let theme;
    try { theme = localStorage.getItem(themeKey); } catch (e) {}
    if (theme !== 'dark' && theme !== 'light') {
      theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    applyTheme(theme);
  }

  themeToggle.addEventListener('click', function () {
    const current = document.documentElement.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });

  initTheme();

  const form = $('studentForm');
  const tbody = $('recordsBody');
  const emptyNote = $('emptyNote');
  const recordCount = $('recordCount');
  const photoPreview = $('photoPreview');
  const toast = $('toast');

  let photoData = '';
  let toastTimer = null;

  function getStudents() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveStudents(students) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  function setError(field, message) {
    $('err-' + field).textContent = message || '';
  }

  function validate() {
    let valid = true;
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRe = /^[0-9]{10}$/;
    const zipRe = /^[0-9]{4,6}$/;
    const nameRe = /^[A-Za-z][A-Za-z .'-]{1,}$/;

    const rules = [
      ['fullName', () => nameRe.test(form.fullName.value.trim()) ? '' : 'Enter a valid full name (letters only).'],
      ['dob', () => form.dob.value ? todayCompare(form.dob.value) : 'Date of birth is required.'],
      ['gender', () => form.gender ? '' : 'Select a gender.'],
      ['email', () => emailRe.test(form.email.value.trim()) ? '' : 'Enter a valid email address.'],
      ['phone', () => phoneRe.test(form.phone.value.trim().replace(/\s/g, '')) ? '' : 'Enter a valid 10-digit phone number.'],
      ['street', () => form.street.value.trim() ? '' : 'Street address is required.'],
      ['city', () => form.city.value.trim() ? '' : 'City is required.'],
      ['state', () => form.state.value.trim() ? '' : 'State is required.'],
      ['zip', () => zipRe.test(form.zip.value.trim()) ? '' : 'Enter a valid ZIP code (4-6 digits).'],
      ['course', () => form.course.value.trim() ? '' : 'Course is required.'],
      ['enrollNo', () => form.enrollNo.value.trim() ? '' : 'Enrollment number is required.'],
      ['guardianName', () => nameRe.test(form.guardianName.value.trim()) ? '' : 'Enter a valid guardian name.'],
      ['guardianPhone', () => phoneRe.test(form.guardianPhone.value.trim().replace(/\s/g, '')) ? '' : 'Enter a valid 10-digit number.']
    ];

    rules.forEach(([field, check]) => {
      const msg = check();
      setError(field, msg);
      if (msg) valid = false;
    });

    return valid;
  }

  function todayCompare(dateStr) {
    const dob = new Date(dateStr);
    const today = new Date();
    if (isNaN(dob.getTime())) return 'Invalid date.';
    if (dob > today) return 'Date of birth cannot be in the future.';
    const age = today.getFullYear() - dob.getFullYear();
    if (age > 100) return 'Date of birth is too far in the past.';
    return '';
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function renderRecords() {
    const students = getStudents();
    recordCount.textContent = students.length + ' student' + (students.length === 1 ? '' : 's');
    tbody.innerHTML = '';

    emptyNote.style.display = students.length ? 'none' : 'block';

    students.forEach((s, index) => {
      const tr = document.createElement('tr');
      const avatarHtml = s.photo
        ? '<img class="avatar" src="' + s.photo + '" alt="photo">'
        : '<span class="avatar">–</span>';
      tr.innerHTML =
        '<td>' + avatarHtml + '</td>' +
        '<td>' + escapeHtml(s.fullName) + '</td>' +
        '<td>' + escapeHtml(s.course) + '</td>' +
        '<td>' + escapeHtml(s.email) + '</td>' +
        '<td>' + escapeHtml(s.phone) + '</td>' +
        '<td><button class="btn-danger" data-index="' + index + '">Delete</button></td>';
      tbody.appendChild(tr);
    });
  }

  function resetForm() {
    form.reset();
    setError('dob', '');
    photoData = '';
    photoPreview.textContent = 'No photo';
  }

  function onRecordClick(e) {
    const btn = e.target.closest('.btn-danger');
    if (!btn) return;
    const index = Number(btn.dataset.index);
    const students = getStudents();
    const removed = students.splice(index, 1)[0];
    saveStudents(students);
    renderRecords();
    showToast('Removed "' + removed.fullName + '".');
  }

  // Photo preview
  $('photo').addEventListener('change', function () {
    const file = this.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file.');
      this.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast('Image must be under 2 MB.');
      this.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = function () {
      photoData = reader.result;
      photoPreview.innerHTML = '<img src="' + photoData + '" alt="preview">';
    };
    reader.readAsDataURL(file);
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validate()) return;

    const students = getStudents();
    const hobbies = Array.from(form.querySelectorAll('input[name="hobby"]:checked'))
      .map((cb) => cb.value);

    const student = {
      fullName: form.fullName.value.trim(),
      dob: form.dob.value,
      gender: form.gender.value,
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      street: form.street.value.trim(),
      city: form.city.value.trim(),
      state: form.state.value.trim(),
      zip: form.zip.value.trim(),
      course: form.course.value.trim(),
      semester: form.semester.value,
      enrollNo: form.enrollNo.value.trim(),
      guardianName: form.guardianName.value.trim(),
      guardianPhone: form.guardianPhone.value.trim(),
      photo: photoData,
      bloodGroup: form.bloodGroup.value,
      hobbies: hobbies,
      comments: form.comments.value.trim(),
      registeredAt: new Date().toISOString()
    };

    students.push(student);
    saveStudents(students);
    resetForm();
    renderRecords();
    showToast('Student "' + student.fullName + '" registered successfully!');
  });

  $('btnReset').addEventListener('click', resetForm);
  tbody.addEventListener('click', onRecordClick);

  renderRecords();
})();