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
   seasonally adaptable blueprint line drawing modeled directly off the 
   modular chest harness structure. Only the accent styles change. */
function heroArt(season) {
  return `
    <svg viewBox="0 0 320 320" fill="none" xmlns="http://w3.org" role="img" aria-label="Rotating system status ring with a technical harness schematic">
      <!-- Outer Rotating UI Status Framework (Preserved) -->
      <g class="hud-ring-rotate" style="transform-origin:160px 160px;">
        <circle cx="160" cy="160" r="140" stroke="var(--line)" stroke-width="1.5" stroke-dasharray="2 8"/>
      </g>
      <circle cx="160" cy="160" r="112" stroke="var(--accent)" stroke-width="1.5" opacity="0.4"/>
      <g stroke="var(--accent-2)" stroke-width="2">
        <path d="M160 20 L160 40 M160 280 L160 300 M20 160 L40 160 M280 160 L300 160"/>
      </g>

      <!-- Accurate Custom Harness Line-Art Group -->
      <g stroke="var(--accent)" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
        
        <!-- Main Upper Back & Padded Yoke Silhouette -->
        <path d="M120 70 C140 75, 180 75, 200 70 C225 65, 240 85, 235 110 C230 130, 205 165, 195 190 C185 215, 135 215, 125 190 C115 165, 90 130, 85 110 C80 85, 95 65, 120 70 Z" opacity="0.3" stroke-width="1.5" stroke-dasharray="3 3"/>
        
        <!-- Yoke Padding Grid Gridlines Matrix -->
        <path d="M160 73 L160 213 M132 105 C150 108, 170 108, 188 105 M112 145 C140 150, 180 150, 208 145 M112 180 C140 183, 180 183, 208 180" stroke-width="1" opacity="0.4"/>

        <!-- Primary Left and Right Shoulder Straps -->
        <path d="M110 70 L148 165 L151 210" />
        <path d="M210 70 L172 165 L169 210" />

        <!-- Dual Top Shoulder Adjustment Buckles -->
        <rect x="100" y="95" width="16" height="12" rx="2" stroke="var(--accent-2)" stroke-width="2"/>
        <line x1="100" y1="101" x2="116" y2="101" stroke="var(--accent-2)"/>
        
        <rect x="204" y="95" width="16" height="12" rx="2" stroke="var(--accent-2)" stroke-width="2"/>
        <line x1="204" y1="101" x2="220" y2="101" stroke="var(--accent-2)"/>

        <!-- Middle Sternum Cross-Straps & Lower Girth Line -->
        <path d="M92 195 L145 195 M175 195 L228 195" />
        
        <!-- Left and Right Heavy Duty Base Webbing Buckles -->
        <rect x="124" y="188" width="16" height="14" rx="2" stroke="var(--accent)" stroke-width="2"/>
        <rect x="180" y="188" width="16" height="14" rx="2" stroke="var(--accent)" stroke-width="2"/>

        <!-- Central Sternal Attachment Loop (Slimmed Down Drop Tab) -->
        <rect x="153" y="170" width="14" height="42" rx="2" stroke="var(--accent-2)" stroke-width="2.5" fill="none"/>
        <line x1="153" y1="184" x2="167" y2="184" stroke="var(--accent-2)" stroke-width="1.5"/>
        <line x1="153" y1="198" x2="167" y2="198" stroke="var(--accent-2)" stroke-width="1.5"/>

        <!-- Refined, Proportional Locking Carabiner Clip -->
        <path d="M156 212 L154 246 C154 256, 166 256, 166 246 L164 212" stroke="var(--accent)" stroke-width="3"/>
        <path d="M164 216 L164 238" stroke="var(--accent)" stroke-width="1.5" opacity="0.7"/>
        <!-- Vertical Screw Gate Lock Assembly Nut Detail -->
        <rect x="161" y="218" width="6" height="14" rx="1" fill="var(--accent-2)" stroke="none"/>
      </g>
    </svg>`;
}

/* Dynamically populates the item grid on index.html (skips dedicated product pages) */
function renderProductGallery(config, season) {
  if (document.body.dataset.page === 'product') return;

  const container = document.getElementById('galleryContainer');
  if (!container) return;

  container.innerHTML = '';

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
        <a href="${product.url || '#'}" class="view-btn">View Details</a>
      </div>
    `;

    container.appendChild(card);
  });
}

/* Populates a dedicated product page using its matching ID inside config.products */
function renderProductById(config, productId) {
  if (!config.products || !Array.isArray(config.products)) return;

  const product = config.products.find(p => p.id === productId);
  if (!product) return;

  document.title = `AS | ${product.title}`;

  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el && text !== undefined) el.textContent = text;
  };

  setText('product-tagline', product.tagline || '');
  setText('product-title', product.title);
  setText('product-price', product.price);
  setText('product-badge', product.badge);
  setText('product-description', product.description);

  // Wire Discord CTA button
  const ctaBtn = document.getElementById('product-cta-btn');
  if (ctaBtn) {
    if (product.ctaText) ctaBtn.textContent = product.ctaText;
    if (product.ctaUrl) ctaBtn.href = product.ctaUrl;
  }

  // Populate main image + thumbnail strip from gallery array (or fallback to primary image)
  const images = (product.gallery && product.gallery.length)
    ? product.gallery
    : [{ src: product.image, alt: product.title }];

  const mainImg = document.getElementById('mainProductImg');
  if (mainImg && images[0]) {
    mainImg.src = images[0].src;
    mainImg.alt = images[0].alt || product.title;
  }

  const thumbStrip = document.getElementById('thumbStrip');
  if (thumbStrip) {
    thumbStrip.innerHTML = images.map((img, idx) => `
      <button type="button" class="thumb-btn ${idx === 0 ? 'active' : ''}" data-src="${img.src}" data-alt="${img.alt || product.title}">
        <img src="${img.src}" alt="${img.alt || product.title}">
      </button>
    `).join('');

    thumbStrip.querySelectorAll('.thumb-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (mainImg) {
          mainImg.src = btn.dataset.src;
          mainImg.alt = btn.dataset.alt;
        }
        thumbStrip.querySelectorAll('.thumb-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }

  // Populate technical specs cards from JSON
  const specsGrid = document.getElementById('product-specs-grid');
  if (specsGrid && Array.isArray(product.specs)) {
    specsGrid.innerHTML = product.specs.map(spec => `
      <div class="service-card hud-panel">
        <h3>${spec.title}</h3>
        <span class="price mono">${spec.tag}</span>
        <p>${spec.detail}</p>
      </div>
    `).join('');
  }
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
