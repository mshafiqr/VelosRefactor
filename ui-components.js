/* ============================================================
   VELOS — Shared UI Components (Extraction Phase 2b)
   ============================================================
   Scope: renders the .vx-topbar / .vx-sidebar markup shared across
   admin.html, admin-jkns.html, admin-yearly.html (the "dashboard"
   cluster) and dispatch.html, borang-permohonan.html, log-pemandu.html
   (the "minimal" cluster), plus the toggle/backdrop/clock/submenu
   behavior identical across all six. See velos-shared.css's Phase 2a
   header for the CSS half of this same split.

   Every string below (icon paths, hrefs, labels, class lists) was
   transcribed verbatim from the six files' existing markup before
   this extraction -- see the extraction script in this session's
   scratchpad. Two real inconsistencies were found and are preserved
   deliberately, not fixed here:
   - NG999 links: dashboard cluster uses the full external URL,
     target=_blank; minimal cluster uses a relative path, target=_self.
   - "Kenderaan" link: admin.html points at portal-kenderaan-admin.html
     ("Kenderaan (Penyelia)"); every other file points at plain
     portal-kenderaan.html ("Kenderaan").
   Both were confirmed with the system developer as pre-existing
   behavior to carry forward as-is, not bugs to fix in this pass.
   ============================================================ */

(function (global) {
  'use strict';

  var ICONS = {
    hamburger: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V10"/><path d="M9 21v-6h6v6"/></svg>',
    logPemandu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13l1.5-4.5A2 2 0 0 1 6.4 7h11.2a2 2 0 0 1 1.9 1.5L21 13"/><rect x="2.5" y="13" width="19" height="5" rx="1.5"/><circle cx="7" cy="18.5" r="1.5"/><circle cx="17" cy="18.5" r="1.5"/></svg>',
    permohonan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/><path d="M14 2v5h5"/><path d="M8 13h8M8 17h8M8 9h3"/></svg>',
    vcc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="4" width="14" height="17" rx="1.5"/><rect x="9" y="2" width="6" height="3.5" rx="1"/><path d="M8.5 11h7M8.5 14.5h7M8.5 18h4.5"/></svg>',
    kenderaan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="12" height="9" rx="1"/><path d="M14 9h4l3 3v3h-7z"/><circle cx="6.5" cy="17.5" r="1.6"/><circle cx="17" cy="17.5" r="1.6"/></svg>',
    mecc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8M12 16v4"/></svg>',
    supervisor: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v6c0 5-3 8.5-7 9.5-4-1-7-4.5-7-9.5v-6z"/><path d="M9 12l2 2 4-4.2"/></svg>',
    about: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 11h1v5h1"/></svg>',
    dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    logPergerakan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-7.2 7-12a7 7 0 0 0-14 0c0 4.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.3"/></svg>',
    laporan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M11 20V4M18 20v-7"/><path d="M2 20h20"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
    pesakit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7"/><path d="M9 7h8v8"/></svg>',
    kenderaanBahanApi: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21V6a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v15"/><path d="M3 21h11"/><path d="M13 9h2.2L18 11.8V17a1.5 1.5 0 0 1-3 0v-1a1 1 0 0 0-1-1h-1"/><path d="M6.5 7.5h4"/></svg>',
    laporanStaf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.2"/><path d="M5 20c0-4 3-6.5 7-6.5s7 2.5 7 6.5"/></svg>',
    permohonanVcc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="4" width="14" height="17" rx="1.5"/><rect x="9" y="2" width="6" height="3.5" rx="1"/><path d="M8.5 13.5l2 2 4-4.5"/></svg>',
    jkns: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3h6l4 4v14H6V3z"/><path d="M14 3v4h4M9 12h6M9 16h6"/></svg>',
    yearly: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/></svg>',
    konfigurasi: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 3v2.2M12 18.8V21M21 12h-2.2M5.2 12H3M18.4 5.6l-1.5 1.5M7.1 16.9l-1.5 1.5M18.4 18.4l-1.5-1.5M7.1 7.1 5.6 5.6"/></svg>',
    sistem: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.5l7 3v6c0 5-3 8.5-7 9.5-4-1-7-4.5-7-9.5v-6z"/><path d="M9 12l2 2 4-4.2"/></svg>'
  };

  function iconSpan(name) {
    return '<span class="vx-sidebar-icon">' + ICONS[name] + '</span>';
  }

  function textSpan(label, tag) {
    var html = '<span class="vx-sidebar-text">' + label + '</span>';
    if (tag) html += '<span class="vx-portal-tag">' + tag + '</span>';
    return html;
  }

  /* ==================== TOPBAR ==================== */
  function renderVxTopbar(opts) {
    var extraClass = opts.extraClass || '';
    var toggleExtraClass = opts.toggleExtraClass || '';
    var toggle =
      '<button class="vx-sidebar-toggle-floating' + toggleExtraClass + '" id="vxSidebarToggle" onclick="window.vxToggleSidebar()" title="Buka/Tutup menu" aria-label="Buka/Tutup menu">\n' +
      '      ' + ICONS.hamburger + '\n' +
      '    </button>';

    var left =
      '<div class="vx-topbar-left">\n' +
      '    ' + toggle + '\n' +
      '    <img src="https://i.postimg.cc/3RHFdSvp/Jata-Negara.png" alt="Jata Negara">\n' +
      '    <img src="https://i.postimg.cc/LXM3nC1j/HPTS.png" alt="Hospital Pitas">\n' +
      '  </div>';

    var right;
    if (opts.cluster === 'dashboard') {
      var sync = opts.showSync
        ? '\n    <button id="btnRefreshTop" onclick="window.refreshDataSilently()" class="vx-topbar-sync hide-print" title="Segerak semula kapasiti kenderaan"> 🔄  Sync Data</button>'
        : '';
      right =
        '<div class="vx-topbar-right">\n' +
        '    <span class="vx-status-badge"><span class="vx-status-dot">●</span> Sistem Aktif</span>\n' +
        '    <span class="vx-role-badge">Edisi 4 · Versi 1.0</span>\n' +
        '    <span class="vx-clock" id="vxClock">--:--</span>' + sync + '\n' +
        '    <button id="btnLogout" onclick="window.doLogout()" class="btn-logout-top hide-print">Log Keluar</button>\n' +
        '  </div>';
    } else {
      right =
        '<div class="vx-topbar-right">\n' +
        '    <button type="button" id="btnLogout" class="btn-logout">Log Keluar</button>\n' +
        '  </div>';
    }

    return (
      '<header class="vx-topbar' + extraClass + '" id="vxTopbar">\n' +
      '  ' + left + '\n' +
      '  <div class="vx-topbar-title">' + opts.title + '</div>\n' +
      '  ' + right + '\n' +
      '</header>'
    );
  }

  /* ==================== SIDEBAR ==================== */
  function link(tagOpts) {
    // tagOpts: { classes, attrs (string), attrsBefore (string, optional), icon, label, tag }
    return (
      '<' + tagOpts.tag + (tagOpts.attrsBefore || '') + ' class="' + tagOpts.classes + '"' + tagOpts.attrs + '>\n' +
      '    ' + iconSpan(tagOpts.icon) + textSpan(tagOpts.label, tagOpts.portalTag) + '\n' +
      '  </' + tagOpts.tag + '>'
    );
  }

  function crossPageButton(icon, label, tag, href, target, active) {
    var t = target === '_blank' ? "window.open('" + href + "','_blank','noopener')" : "window.open('" + href + "','_self')";
    var classes = active ? 'vx-sidebar-link vx-active' : 'vx-sidebar-link';
    return link({ tag: 'button', classes: classes, attrs: ' onclick="' + t + '"', icon: icon, label: label, portalTag: tag });
  }

  function activeDisabled(icon, label, tag) {
    return link({ tag: 'button', classes: 'vx-sidebar-link vx-active', attrs: ' disabled title="Portal semasa"', icon: icon, label: label, portalTag: tag });
  }

  function inPageAnchor(icon, label, hash) {
    return link({ tag: 'a', attrsBefore: ' href="#' + hash + '"', classes: 'vx-sidebar-link', attrs: ' data-vx-section="' + hash + '"', icon: icon, label: label });
  }

  function divider() {
    return '<hr class="vx-sidebar-divider">';
  }

  function sectionLabel(text) {
    return '<div class="vx-sidebar-section-label">' + text + '</div>';
  }

  function renderVxSidebar(opts) {
    var extraClass = opts.extraClass || '';
    var parts = [];

    // Laman Utama
    if (opts.homeAsAnchor) {
      parts.push(link({ tag: 'a', attrsBefore: ' href="#"', classes: 'vx-sidebar-link', attrs: ' onclick="window.open(\'index.html\',\'_self\');return false;" title="Laman Utama"', icon: 'home', label: 'Laman Utama' }));
    } else {
      parts.push(link({ tag: 'button', classes: 'vx-sidebar-link', attrs: ' onclick="window.open(\'index.html\',\'_self\')" title="Laman Utama"', icon: 'home', label: 'Laman Utama' }));
    }
    parts.push(divider());

    // Portal group
    parts.push(sectionLabel('Portal'));
    var portalItems = [
      { id: 'log-pemandu', icon: 'logPemandu', label: 'Log Pemandu', tag: '01', href: 'log-pemandu.html' },
      { id: 'borang-permohonan', icon: 'permohonan', label: 'Permohonan', tag: '02', href: 'borang-permohonan.html' },
      { id: 'dispatch', icon: 'vcc', label: 'VCC', tag: '03', href: 'dispatch.html' },
      { id: 'kenderaan', icon: 'kenderaan', label: opts.kenderaanLabel || 'Kenderaan', tag: '04', href: opts.kenderaanHref || 'portal-kenderaan.html' }
    ];
    portalItems.forEach(function (item) {
      if (opts.activePortal === item.id) {
        parts.push(activeDisabled(item.icon, item.label, item.tag));
      } else {
        parts.push(crossPageButton(item.icon, item.label, item.tag, item.href));
      }
    });
    parts.push(divider());

    // VELOS NG 999 group
    parts.push(sectionLabel('VELOS NG 999'));
    var ng999Base = opts.ng999Style === 'external' ? 'https://velos-ng999-dispatch-system.web.app/' : '';
    var ng999Target = opts.ng999Style === 'external' ? '_blank' : '_self';
    parts.push(crossPageButton('mecc', 'MECC Dashboard', null, ng999Base + 'velos-mecc.html', ng999Target));
    parts.push(crossPageButton('supervisor', 'Supervisor Dashboard', null, ng999Base + 'velos-supervisor.html', ng999Target));
    parts.push(divider());

    if (opts.showAdminSection) {
      parts.push(sectionLabel('Admin'));

      function adminItem(icon, label, hash) {
        return opts.adminHost ? inPageAnchor(icon, label, hash) : crossPageButton(icon, label, null, 'admin.html');
      }

      parts.push(adminItem('dashboard', 'Dashboard', 'sec-dashboard'));
      parts.push(adminItem('logPergerakan', 'Log Pergerakan', 'sec-log-pergerakan'));

      var laporanExpanded = opts.activeAdminItem === 'admin-jkns' || opts.activeAdminItem === 'admin-yearly';
      var parentClasses = 'vx-sidebar-link vx-sidebar-parent' + (laporanExpanded ? ' vx-expanded' : '');
      parts.push(
        '<button class="' + parentClasses + '" id="vxLaporanParentToggle" onclick="window.vxToggleLaporanSubmenu()">\n' +
        '    ' + iconSpan('laporan') + textSpan('Laporan &amp; Statistik') +
        '<span class="vx-sidebar-parent-chevron vx-sidebar-text">' + ICONS.chevron + '</span>\n' +
        '  </button>'
      );
      var subgroupClasses = 'vx-sidebar-subgroup' + (laporanExpanded ? ' vx-expanded' : '');
      var sub = [];
      sub.push(adminItem('pesakit', 'Pesakit &amp; Rujukan', 'sec-laporan-pesakit'));
      sub.push(adminItem('kenderaanBahanApi', 'Kenderaan &amp; Bahan Api', 'sec-laporan-kenderaan'));
      sub.push(adminItem('laporanStaf', 'Laporan Staf', 'sec-laporan-staf'));
      sub.push(adminItem('permohonanVcc', 'Permohonan VCC', 'sec-laporan-vcc'));
      sub.push(crossPageButton('jkns', 'Laporan JKNS', null, 'admin-jkns.html', null, opts.activeAdminItem === 'admin-jkns'));
      sub.push(crossPageButton('yearly', 'Statistik Tahunan', null, 'admin-yearly.html', null, opts.activeAdminItem === 'admin-yearly'));
      parts.push('<div class="' + subgroupClasses + '" id="vxLaporanSubgroup">\n    ' + sub.join('\n    ') + '\n  </div>');

      parts.push(adminItem('konfigurasi', 'Konfigurasi', 'sec-konfigurasi'));
      parts.push(adminItem('sistem', 'Sistem', 'sec-sistem'));
    }

    if (opts.showAbout) {
      parts.push(crossPageButton('about', 'About', null, 'about.html'));
    }

    return '<nav class="vx-sidebar' + extraClass + '" id="vxSidebar">\n  ' + parts.join('\n  ') + '\n</nav>';
  }

  /* ==================== NAV BEHAVIOR ==================== */
  function initVxNav(opts) {
    opts = opts || {};
    var sidebar = document.getElementById('vxSidebar');
    var mainContent = document.getElementById('vxMainContent');
    var backdrop = document.getElementById('vxBackdrop');

    function vxSyncBackdrop(collapsed) {
      if (!backdrop) return;
      backdrop.style.display = (!collapsed && window.innerWidth <= 768) ? 'block' : 'none';
    }

    window.vxToggleSidebar = function () {
      if (!sidebar || !mainContent) return;
      var collapsed = sidebar.classList.toggle('vx-collapsed');
      mainContent.classList.toggle('vx-sidebar-collapsed', collapsed);
      vxSyncBackdrop(collapsed);
    };

    if (backdrop) backdrop.addEventListener('click', window.vxToggleSidebar);

    if (sidebar && mainContent && window.innerWidth <= 768) {
      sidebar.classList.add('vx-collapsed');
      mainContent.classList.add('vx-sidebar-collapsed');
    }

    var laporanToggle = document.getElementById('vxLaporanParentToggle');
    var laporanSubgroup = document.getElementById('vxLaporanSubgroup');
    if (laporanToggle && laporanSubgroup) {
      window.vxToggleLaporanSubmenu = function () {
        var opening = !laporanToggle.classList.contains('vx-expanded');
        laporanToggle.classList.toggle('vx-expanded', opening);
        laporanSubgroup.classList.toggle('vx-expanded', opening);
        if (opening && typeof opts.onLaporanExpand === 'function') opts.onLaporanExpand();
      };
    }

    var clockEl = document.getElementById('vxClock');
    if (clockEl) {
      var tickClock = function () {
        var now = new Date();
        clockEl.textContent = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
      };
      tickClock();
      setInterval(tickClock, 1000);
    }
  }

  global.VxUI = {
    renderVxTopbar: renderVxTopbar,
    renderVxSidebar: renderVxSidebar,
    initVxNav: initVxNav
  };
})(window);
