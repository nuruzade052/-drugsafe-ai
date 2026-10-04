(() => {
  'use strict';

  const WEB_VERSION = '3.7.0';
  const LATEST_API = 'https://api.github.com/repos/nuruzade052/-drugsafe-ai/releases/latest';
  const RELEASE_PAGE = 'https://github.com/nuruzade052/-drugsafe-ai/releases/latest';
  let desktopInfo = null;
  let updateAction = null;

  const byId = id => document.getElementById(id);

  function setUpdateStatus(message, type = '') {
    const box = byId('v37UpdateStatus');
    if (!box) return;
    box.className = 'update-status' + (type ? ' ' + type : '');
    box.textContent = message;
  }

  function setAction(label, action) {
    const btn = byId('v37UpdateActionBtn');
    if (!btn) return;
    updateAction = action;
    if (!action) {
      btn.style.display = 'none';
      return;
    }
    btn.style.display = '';
    btn.textContent = label;
  }

  function cleanVersion(value) {
    return String(value || '').trim().replace(/^v/i, '').split('-')[0];
  }

  function compareVersions(a, b) {
    const aa = cleanVersion(a).split('.').map(n => parseInt(n, 10) || 0);
    const bb = cleanVersion(b).split('.').map(n => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(aa.length, bb.length); i++) {
      const x = aa[i] || 0, y = bb[i] || 0;
      if (x > y) return 1;
      if (x < y) return -1;
    }
    return 0;
  }

  async function openExternal(url) {
    try {
      if (window.drugSafeDesktop?.openExternal) {
        await window.drugSafeDesktop.openExternal(url);
      } else {
        window.open(url, '_blank', 'noopener');
      }
    } catch (_) {
      window.open(url, '_blank', 'noopener');
    }
  }

  function activateTab(tabName, navButton) {
    const target = byId('tab-' + tabName);
    if (!target) return;
    document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav').forEach(el => el.classList.remove('active'));
    target.classList.add('active');
    if (navButton) navButton.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function bindNavigation() {
    document.querySelectorAll('.nav[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => activateTab(btn.dataset.tab, btn));
    });
  }

  async function checkWebVersion() {
    setAction(null, null);
    setUpdateStatus('GitHub Releases üzerinden güncel sürüm kontrol ediliyor…');
    try {
      const response = await fetch(LATEST_API, {
        headers: { 'Accept': 'application/vnd.github+json' },
        cache: 'no-store'
      });
      if (!response.ok) throw new Error('GitHub yanıtı: ' + response.status);
      const release = await response.json();
      const latest = cleanVersion(release.tag_name || release.name);
      if (!latest) throw new Error('Sürüm bilgisi okunamadı.');

      if (compareVersions(latest, WEB_VERSION) > 0) {
        setUpdateStatus('Yeni sürüm mevcut: v' + latest + '. Release sayfasından indirebilirsiniz.', 'warn');
        setAction('Yeni sürümü aç', 'open-release');
      } else {
        setUpdateStatus('DrugSafe AI v' + WEB_VERSION + ' güncel. Daha yeni kararlı sürüm bulunamadı.', 'good');
        setAction(null, null);
      }
    } catch (error) {
      setUpdateStatus('Sürüm kontrolü tamamlanamadı: ' + (error?.message || error), 'error');
      setAction('Release sayfasını aç', 'open-release');
    }
  }

  function handleDesktopUpdateStatus(payload = {}) {
    const state = payload.state;
    if (state === 'checking') {
      setUpdateStatus('Windows güncellemesi kontrol ediliyor…');
      setAction(null, null);
    } else if (state === 'available') {
      setUpdateStatus('Yeni Windows sürümü bulundu: v' + (payload.version || '—') + '.', 'warn');
      setAction('Güncellemeyi indir', 'download');
    } else if (state === 'current') {
      setUpdateStatus('Kurulu DrugSafe AI v' + (desktopInfo?.version || WEB_VERSION) + ' güncel.', 'good');
      setAction(null, null);
    } else if (state === 'downloading') {
      const p = Number.isFinite(payload.percent) ? payload.percent : 0;
      setUpdateStatus('Güncelleme indiriliyor… %' + p, 'warn');
      setAction(null, null);
    } else if (state === 'downloaded') {
      setUpdateStatus('v' + (payload.version || 'Yeni sürüm') + ' indirildi. Uygulamayı yeniden başlatarak kuruluma geçebilirsiniz.', 'good');
      setAction('Yeniden başlat ve yükle', 'install');
    } else if (state === 'error') {
      setUpdateStatus('Güncelleme hatası: ' + (payload.message || 'Bilinmeyen hata'), 'error');
      setAction('Release sayfasını aç', 'open-release');
    }
  }

  async function initRuntime() {
    const runtime = byId('v37Runtime');
    const detail = byId('v37RuntimeDetail');
    const version = byId('v37InstalledVersion');

    if (window.drugSafeDesktop?.getInfo) {
      try {
        desktopInfo = await window.drugSafeDesktop.getInfo();
        if (version) version.textContent = desktopInfo.version || WEB_VERSION;
        if (runtime) runtime.textContent = desktopInfo.portable ? 'Windows Portable' : 'Windows Desktop';
        if (detail) detail.textContent = desktopInfo.portable ? 'Kurulum gerektirmez' : 'Setup / otomatik güncelleme';

        window.drugSafeDesktop.onUpdateStatus?.(handleDesktopUpdateStatus);

        if (desktopInfo.portable) {
          setUpdateStatus('Portable sürüm kullanılıyor. Güncelleme bulunduğunda en güncel paket Release sayfasından açılır.');
        } else {
          setUpdateStatus('Windows v' + (desktopInfo.version || WEB_VERSION) + ' hazır. Otomatik sürüm kontrolü destekleniyor.');
        }
        return;
      } catch (_) {}
    }

    if (version) version.textContent = WEB_VERSION;
    if (runtime) runtime.textContent = 'Web';
    if (detail) detail.textContent = 'GitHub Pages';
    setUpdateStatus('Online v' + WEB_VERSION + ' çalışıyor. Güncel dağıtım sürümünü GitHub Releases üzerinden kontrol edebilirsiniz.');
  }

  async function checkForUpdates() {
    if (desktopInfo && window.drugSafeDesktop?.checkForUpdates) {
      if (desktopInfo.portable) {
        setUpdateStatus('Portable sürüm için en güncel indirme sayfası açılıyor…');
        await openExternal(RELEASE_PAGE);
        return;
      }
      const result = await window.drugSafeDesktop.checkForUpdates();
      if (result?.state === 'error') handleDesktopUpdateStatus(result);
      return;
    }
    await checkWebVersion();
  }

  async function runUpdateAction() {
    if (updateAction === 'download' && window.drugSafeDesktop?.downloadUpdate) {
      setUpdateStatus('Güncelleme indirme işlemi başlatılıyor…', 'warn');
      const result = await window.drugSafeDesktop.downloadUpdate();
      if (result?.state === 'error') handleDesktopUpdateStatus(result);
    } else if (updateAction === 'install' && window.drugSafeDesktop?.installUpdate) {
      setUpdateStatus('Uygulama yeniden başlatılıyor ve güncelleme kuruluyor…', 'warn');
      await window.drugSafeDesktop.installUpdate();
    } else if (updateAction === 'open-release') {
      await openExternal(RELEASE_PAGE);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    bindNavigation();
    initRuntime();
    byId('v37CheckUpdateBtn')?.addEventListener('click', checkForUpdates);
    byId('v37UpdateActionBtn')?.addEventListener('click', runUpdateAction);
  });
})();