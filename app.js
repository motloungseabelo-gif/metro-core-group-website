'use strict';

(() => {
  const header = document.querySelector('.site-header');
  const menuButton = document.querySelector('.menu-toggle');
  const mobileNav = document.querySelector('#mobile-nav');
  const dialog = document.querySelector('#brief-dialog');
  const form = document.querySelector('#brief-form');
  const formView = document.querySelector('#brief-form-view');
  const resultView = document.querySelector('#brief-result-view');
  const serviceSelect = document.querySelector('#service-select');
  const copyStatus = document.querySelector('#copy-status');
  let briefText = '';
  let dialogOpener = null;
  let focusBeforeMenu = null;

  const setMenu = (open) => {
    mobileNav.hidden = !open;
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  };

  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    focusBeforeMenu = menuButton;
    setMenu(open);
    if (open) mobileNav.querySelector('a').focus({ preventScroll: true });
  });

  mobileNav.addEventListener('click', (event) => {
    if (event.target.closest('a, button')) setMenu(false);
  });

  document.addEventListener('click', (event) => {
    if (!header.contains(event.target) && !mobileNav.hidden) setMenu(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !mobileNav.hidden) {
      setMenu(false);
      focusBeforeMenu?.focus();
    }
  });

  const desktopQuery = window.matchMedia('(min-width: 801px)');
  desktopQuery.addEventListener('change', () => {
    if (desktopQuery.matches) setMenu(false);
  });

  // A single passive scroll listener only changes the header's border.
  let scrollQueued = false;
  const updateHeader = () => {
    header.classList.toggle('scrolled', window.scrollY > 12);
    scrollQueued = false;
  };
  window.addEventListener('scroll', () => {
    if (!scrollQueued) {
      scrollQueued = true;
      window.requestAnimationFrame(updateHeader);
    }
  }, { passive: true });
  updateHeader();

  const services = [...document.querySelectorAll('details.service')];
  services.forEach((service) => {
    service.addEventListener('toggle', () => {
      if (service.open) services.forEach((other) => {
        if (other !== service && other.open) other.open = false;
      });
    });
  });

  const openHashService = () => {
    const service = services.find((entry) => '#' + entry.id === window.location.hash);
    if (service) {
      services.forEach((other) => { other.open = other === service; });
      window.requestAnimationFrame(() => service.scrollIntoView({ block: 'start' }));
    }
  };
  window.addEventListener('hashchange', openHashService);
  openHashService();

  const openBrief = (button) => {
    dialogOpener = button;
    const chosenService = button.dataset.service;
    if (chosenService) {
      serviceSelect.value = chosenService;
      formView.hidden = false;
      resultView.hidden = true;
      dialog.setAttribute('aria-labelledby', 'brief-title');
    }
    setMenu(false);
    dialog.showModal();
    document.body.classList.add('dialog-open');
    dialog.scrollTop = 0;
  };

  document.querySelectorAll('[data-open-brief]').forEach((button) => {
    button.addEventListener('click', () => openBrief(button));
  });
  document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('dialog-open');
    if (dialogOpener && dialogOpener.getClientRects().length) dialogOpener.focus({ preventScroll: true });
    else menuButton.focus({ preventScroll: true });
  });

  const valueOf = (data, key) => String(data.get(key) || '').trim();

  const buildBrief = (data) => {
    const name = valueOf(data, 'clientName');
    const organisation = valueOf(data, 'organisation');
    return [
      'METRO CORE GROUP (PTY) LTD',
      'PROJECT ENQUIRY BRIEF',
      '',
      `Prepared: ${new Intl.DateTimeFormat('en-ZA', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Johannesburg' }).format(new Date())}`,
      ...(name ? [`Name: ${name}`] : []),
      ...(organisation ? [`Organisation: ${organisation}`] : []),
      '',
      `Service: ${valueOf(data, 'service')}`,
      `Location: ${valueOf(data, 'location')}`,
      `Ideal timeframe: ${valueOf(data, 'timeframe')}`,
      '',
      'PROJECT REQUIREMENTS',
      valueOf(data, 'scope'),
      '',
      'Prepared for sharing with Metro Core Group. This brief has not been sent.'
    ].join('\n');
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const scope = document.querySelector('#project-scope');
    const location = document.querySelector('#project-location');
    scope.setCustomValidity(scope.value.trim().length < 15 ? 'Please describe your requirements in at least 15 characters.' : '');
    location.setCustomValidity(location.value.trim() ? '' : 'Please enter a town, city or province.');
    if (!form.reportValidity()) return;
    briefText = buildBrief(new FormData(form));
    document.querySelector('#brief-preview').textContent = briefText;
    formView.hidden = true;
    resultView.hidden = false;
    dialog.setAttribute('aria-labelledby', 'result-title');
    copyStatus.textContent = '';
    dialog.scrollTop = 0;
    document.querySelector('#result-title').focus({ preventScroll: true });
  });

  ['#project-scope', '#project-location'].forEach((selector) => {
    document.querySelector(selector).addEventListener('input', (event) => event.target.setCustomValidity(''));
  });

  document.querySelector('#edit-brief').addEventListener('click', () => {
    resultView.hidden = true;
    formView.hidden = false;
    dialog.setAttribute('aria-labelledby', 'brief-title');
    dialog.scrollTop = 0;
    serviceSelect.focus({ preventScroll: true });
  });

  document.querySelector('#download-brief').addEventListener('click', () => {
    if (!briefText) return;
    const blob = new Blob(['\uFEFF' + briefText], { type: 'text/plain;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = 'Metro_Core_Group_Project_Brief.txt';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  });

  document.querySelector('#copy-brief').addEventListener('click', async () => {
    if (!briefText) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(briefText);
      copyStatus.textContent = 'Brief copied. It is ready to share.';
    } catch {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(document.querySelector('#brief-preview'));
      selection.removeAllRanges();
      selection.addRange(range);
      copyStatus.textContent = 'Your brief is selected. Use your device’s Copy command, or download it instead.';
    }
  });

  document.querySelector('#year').textContent = String(new Date().getFullYear());
})();
