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
    const tabs = Array.from(gallery.querySelectorAll('[data-image]'));
    const title = gallery.querySelector('[data-gallery-title]');
    const description = gallery.querySelector('[data-gallery-description]');
    const icon = gallery.querySelector('[data-gallery-icon]');
    const progress = gallery.querySelector('[data-gallery-progress]');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const intervalMs = 4000;
    let activeIndex = 0;
    let timer = null;

    tabs.forEach((tab) => {
      const preload = new Image();
      preload.src = tab.dataset.image;
    });

    const restartProgress = () => {
      if (!progress) return;
      progress.classList.remove('running');
      void progress.offsetWidth;
      progress.classList.add('running');
    };

    const schedule = () => {
      window.clearTimeout(timer);
      restartProgress();
      timer = window.setTimeout(() => show((activeIndex + 1) % tabs.length), intervalMs);
    };

    const show = (index) => {
      activeIndex = (index + tabs.length) % tabs.length;
      const selected = tabs[activeIndex];
      tabs.forEach((candidate, candidateIndex) => {
        const active = candidateIndex === activeIndex;
        candidate.classList.toggle('active', active);
        candidate.setAttribute('aria-selected', String(active));
      });
      image.classList.add('changing');
      window.setTimeout(() => {
        image.src = selected.dataset.image;
        image.alt = selected.dataset.alt;
        image.classList.remove('changing');
      }, 130);
      if (title) title.textContent = selected.dataset.title || selected.textContent.trim();
      if (description) description.textContent = selected.dataset.description || '';
      if (icon) {
        icon.innerHTML = `<i data-lucide="${selected.dataset.icon || 'monitor'}"></i>`;
        window.lucide?.createIcons();
      }
      const rail = selected.parentElement;
      rail?.scrollTo({ left: selected.offsetLeft - (rail.clientWidth - selected.clientWidth) / 2, behavior: reducedMotion ? 'auto' : 'smooth' });
      schedule();
    };

    tabs.forEach((button, index) => button.addEventListener('click', () => show(index)));
    gallery.querySelector('[data-gallery-prev]')?.addEventListener('click', () => show(activeIndex - 1));
    gallery.querySelector('[data-gallery-next]')?.addEventListener('click', () => show(activeIndex + 1));
    schedule();
  });

  const lightbox = document.querySelector('[data-image-lightbox]');
  const lightboxImage = lightbox?.querySelector('[data-image-lightbox-image]');
  const lightboxTitle = lightbox?.querySelector('[data-image-lightbox-title]');
  document.querySelectorAll('[data-image-popout]').forEach((button) => {
    button.addEventListener('click', () => {
      const source = button.querySelector('img');
      if (!lightbox || !lightboxImage || !source) return;
      lightboxImage.src = source.currentSrc || source.src;
      lightboxImage.alt = source.alt;
      if (lightboxTitle) lightboxTitle.textContent = button.dataset.imageTitle || source.alt;
      lightbox.showModal();
    });
  });
  lightbox?.querySelector('[data-image-lightbox-close]')?.addEventListener('click', () => lightbox.close());
  lightbox?.addEventListener('click', (event) => {
    if (event.target === lightbox) lightbox.close();
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
