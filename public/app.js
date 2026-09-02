document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) window.lucide.createIcons();

  const header = document.querySelector('[data-header]');
  const updateHeader = () => header?.classList.toggle('scrolled', window.scrollY > 16);
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  const toggle = document.querySelector('[data-nav-toggle]');
  const nav = document.querySelector('[data-nav]');
  toggle?.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    toggle.innerHTML = `<i data-lucide="${open ? 'x' : 'menu'}"></i>`;
    window.lucide?.createIcons();
  });

  document.querySelectorAll('[data-gallery]').forEach((gallery) => {
    const image = gallery.querySelector('[data-gallery-image]');
    gallery.querySelectorAll('[data-image]').forEach((button) => {
      button.addEventListener('click', () => {
        gallery.querySelectorAll('[data-image]').forEach((candidate) => {
          const active = candidate === button;
          candidate.classList.toggle('active', active);
          candidate.setAttribute('aria-selected', String(active));
        });
        image.classList.add('changing');
        window.setTimeout(() => {
          image.src = button.dataset.image;
          image.alt = button.dataset.alt;
          image.classList.remove('changing');
        }, 130);
      });
    });
  });

  document.querySelectorAll('[data-copy]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(button.dataset.copy);
        const original = button.innerHTML;
        button.innerHTML = '<i data-lucide="check"></i>';
        button.setAttribute('title', 'Copied');
        window.lucide?.createIcons();
        window.setTimeout(() => { button.innerHTML = original; button.setAttribute('title', 'Copy license key'); window.lucide?.createIcons(); }, 1800);
      } catch {
        window.prompt('Copy your Mortal Nexus license key:', button.dataset.copy);
      }
    });
  });
});
