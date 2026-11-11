/* Shared engine: loads config.json, decides the active season out of
   spring / summer / autumn / winter, and applies the theme. Each page
   then calls its own render function with the loaded config + season. */

async function loadSiteConfig() {
  const res = await fetch('config.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('Could not load config.json');
  return res.json();
}

function pad(n) { return String(n).padStart(2, '0'); }

function getSeason(config, now = new Date()) {
  const mmdd = `${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const entries = [
    ['spring', config.season.springStart],
    ['summer', config.season.summerStart],
    ['autumn', config.season.autumnStart],
    ['winter', config.season.winterStart],
  ].sort((a, b) => (a[1] < b[1] ? -1 : 1));

  // Default to the last season of the year (wraps around for dates
  // before the first configured start, e.g. January before springStart).
  let current = entries[entries.length - 1][0];
  for (const [name, start] of entries) {
    if (mmdd >= start) current = name;
    else break;
  }
  return current;
}

function applySeasonTheme(season) {
  document.documentElement.setAttribute('data-season', season);
}

function setActiveNav() {
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('nav.site-nav a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === path) link.setAttribute('aria-current', 'page');
  });
}

function fillHeaderFooter(config) {
  document.querySelectorAll('[data-brand]').forEach(el => { el.textContent = config.business.name; });
  document.querySelectorAll('[data-phone]').forEach(el => {
    el.textContent = config.business.phone;
    if (el.tagName === 'A') el.href = `tel:${config.business.phone.replace(/[^\d+]/g, '')}`;
  });
  document.querySelectorAll('[data-email]').forEach(el => {
    el.textContent = config.business.email;
    if (el.tagName === 'A') el.href = `mailto:${config.business.email}`;
  });
  document.querySelectorAll('[data-address]').forEach(el => { el.textContent = config.business.address; });
  document.querySelectorAll('[data-hours]').forEach(el => { el.textContent = config.business.hours; });
}

/* A single HUD-ring frame (rotating dashed ring + corner ticks) wraps a
   harness-specific modular configuration icon in the middle. Same frame every
   season; only the icon vectors and the accent colors change. */
function heroArt(season) {
  const icons = {
    // Spring Theme: X-strap layout with soft floral alignment points
    spring: `
      <g stroke="var(--accent)" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path d="M110 110 L210 210 M210 110 L110 210"/>
        <circle cx="160" cy="160" r="14" stroke="var(--accent)" stroke-width="2.5" fill="none"/>
        <line x1="160" y1="95" x2="160" y2="120" stroke="var(--accent-2)" />
        <line x1="160" y1="200" x2="160" y2="225" stroke="var(--accent-2)" />
        <circle cx="110" cy="110" r="4" fill="var(--accent-2)" stroke="none"/>
        <circle cx="210" cy="110" r="4" fill="var(--accent-2)" stroke="none"/>
      </g>`,
    // Summer Theme: Heavy vertical dual-strap cage style with center harness ring
    summer: `
      <g stroke="var(--accent)" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path d="M130 90 L130 230 M190 90 L190 230"/>
        <path d="M110 130 L210 130 M110 190 L210 190"/>
        <circle cx="130" cy="130" r="5" fill="var(--accent-2)" stroke="none"/>
        <circle cx="190" cy="130" r="5" fill="var(--accent-2)" stroke="none"/>
        <circle cx="130" cy="190" r="5" fill="var(--accent-2)" stroke="none"/>
        <circle cx="190" cy="190" r="5" fill="var(--accent-2)" stroke="none"/>
      </g>`,
    // Autumn Theme: Asymmetrical cross-chest dynamic frame setup (MK 1 Beta modular layout)
    autumn: `
      <g stroke="var(--accent)" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path d="M120 100 C150 130, 160 150, 200 220"/>
        <path d="M120 150 C150 150, 170 140, 200 100"/>
        <path d="M100 190 L220 190"/>
        <circle cx="160" cy="148" r="8" stroke="var(--accent-2)" stroke-width="2"/>
        <circle cx="120" cy="100" r="4" fill="var(--accent)" stroke="none"/>
        <circle cx="200" cy="100" r="4" fill="var(--accent-2)" stroke="none"/>
      </g>`,
    // Winter Theme: Multi-point heavy geometric interlocking overlay structure
    winter: `
      <g stroke="var(--accent)" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="160,85 215,130 160,235 105,130" stroke="var(--accent)"/>
        <line x1="105" y1="130" x2="215" y2="130" stroke="var(--accent-2)" stroke-dasharray="4 4"/>
        <circle cx="160" cy="130" r="10" stroke="var(--accent)" fill="none"/>
        <circle cx="160" cy="85" r="4" fill="var(--accent-2)" stroke="none"/>
        <circle cx="160" cy="235" r="4" fill="var(--accent-2)" stroke="none"/>
      </g>`,
  };

  return `
    <svg viewBox="0 0 320 320" fill="none" xmlns="http://w3.org" role="img" aria-label="Rotating system status ring with a seasonal configuration schematic">
      <g class="hud-ring-rotate" style="transform-origin:160px 160px;">
        <circle cx="160" cy="160" r="140" stroke="var(--line)" stroke-width="1.5" stroke-dasharray="2 8"/>
      </g>
      <circle cx="160" cy="160" r="112" stroke="var(--accent)" stroke-width="1.5" opacity="0.5"/>
      <g stroke="var(--accent-2)" stroke-width="2">
        <path d="M160 20 L160 40 M160 280 L160 300 M20 160 L40 160 M280 160 L300 160"/>
      </g>
      ${icons[season]}
    </svg>`;
}

/* Dynamically populates the item grid with badges and pricing rules 
   filtering solely by the active seasonal inventory array */
function renderProductGallery(config, season) {
  const container = document.getElementById('galleryContainer');
  if (!container) return; // Keeps pages without a gallery section safe from errors

  container.innerHTML = '';

  // If there are no products config rules set up yet, stop execution safely
  if (!config.products || !Array.isArray(config.products)) return;

  const seasonalProducts = config.products.filter(item => item.season === season);

  seasonalProducts.forEach(product => {
    const card = document.createElement('div');
    card.className = 'gallery-item';

    card.innerHTML = `
      ${product.badge ? `
        <div class="item-badges">
          <span class="badge badge-${product.badgeType || 'stock'}">${product.badge}</span>
        </div>
      ` : ''}
      <img src="${product.image}" alt="${product.title}" class="gallery-img">
      <div class="gallery-overlay">
        <h3 class="product-title">${product.title}</h3>
        <p class="product-tag">${season.toUpperCase()} COLLECTION</p>
        <span class="product-price">${product.price || ''}</span>
        <a href="#" class="view-btn">View Details</a>
      </div>
    `;

    container.appendChild(card);
  });
}

/* Initializes shared chrome (header/footer/nav/theme) and returns
   { config, season } so the page-specific script can render its content. */
async function initSite() {
  const config = await loadSiteConfig();
  const season = getSeason(config);
  applySeasonTheme(season);
  fillHeaderFooter(config);
  setActiveNav();
  
  // Fire off automatic parsing engine for the products module grid frame
  renderProductGallery(config, season);
  
  return { config, season };
}
