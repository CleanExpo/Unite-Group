(() => {
  document.documentElement.classList.add('js');
  // Mobile menu
  const btn = document.querySelector('.menu-btn');
  const nav = document.getElementById('nav');
  if (btn && nav) btn.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(open));
  });

  // Reveal on scroll (CSS turns this off for reduced motion)
  const items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -10% 0px' });
    items.forEach((el) => io.observe(el));
  } else items.forEach((el) => el.classList.add('in'));

  // Booking form -> /api/enquiry -> Unite-Group CRM
  const form = document.getElementById('enquiry');
  if (!form) return;
  const started = form.querySelector('[name=started_at]');
  if (started) started.value = String(Date.now());

  const params = new URLSearchParams(location.search);
  const pre = params.get('problem');
  if (pre) form.querySelectorAll('[name=problems]').forEach((c) => { if (c.value === pre) c.checked = true; });
  const svc = params.get('service');
  if (svc) { const s = form.querySelector('[name=service]'); if (s) s.value = svc; }

  const status = form.querySelector('.form-status');
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    status.className = 'form-status';
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());
    data.problems = fd.getAll('problems');
    const submit = form.querySelector('button[type=submit]');
    submit.disabled = true;
    status.textContent = 'Sending…';
    try {
      const res = await fetch('/api/enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) { location.href = '/book/thanks/'; return; }
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'send_failed');
    } catch (err) {
      status.className = 'form-status err';
      status.textContent = err.message && err.message !== 'send_failed' && !err.message.includes('fetch')
        ? err.message
        : 'Sorry, that didn’t send. Please call 03 7075 1932 and we’ll take it over the phone.';
      submit.disabled = false;
    }
  });
})();
