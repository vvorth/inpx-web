/* global __INPX_WEB_BUILD_ID__ */
import { createApp } from 'vue';

import router from './router';
import store from './store';
import q from './quasar';

import App from './components/App.vue';

const app = createApp(App);
const currentBuildId = (typeof __INPX_WEB_BUILD_ID__ !== 'undefined'
    ? String(__INPX_WEB_BUILD_ID__ || '').trim()
    : '');

app.use(router);
app.use(store);
app.use(q.quasar, q.options);
q.init();

app.mount('#app');

async function clearBrowserAppCache() {
    try {
        if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.filter(key => key.startsWith('inpx-web-')).map(key => caches.delete(key)));
        }

        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            const currentScope = new URL(appBasePath(), window.location.origin).href;
            await Promise.all(registrations
                .filter(registration => registration.scope === currentScope)
                .map(registration => registration.unregister()));
        }
    } catch (e) {
        //
    }
}

function appBasePath() {
    const base = document.querySelector('base');
    const basePath = base
        ? new URL(base.getAttribute('href') || '/', window.location.href).pathname
        : new URL('.', window.location.href).pathname;
    return basePath.replace(/\/?$/, '/');
}

function consumeClearAppCacheFlag() {
    const url = new URL(window.location.href);
    let shouldClear = url.searchParams.has('clearAppCache');
    url.searchParams.delete('clearAppCache');

    const hashQueryIndex = url.hash.indexOf('?');
    if (hashQueryIndex >= 0) {
        const hashPath = url.hash.substring(0, hashQueryIndex);
        const hashParams = new URLSearchParams(url.hash.substring(hashQueryIndex + 1));
        if (hashParams.has('clearAppCache')) {
            shouldClear = true;
            hashParams.delete('clearAppCache');
            const nextHashQuery = hashParams.toString();
            url.hash = `${hashPath}${nextHashQuery ? `?${nextHashQuery}` : ''}`;
        }
    }

    if (!shouldClear)
        return false;

    // Changing the navigation URL also bypasses an old normal HTTP cache,
    // which cannot be cleared through CacheStorage/service-worker APIs.
    url.searchParams.set('appCacheReset', Date.now().toString());
    clearBrowserAppCache().finally(() => {
        window.location.replace(url.toString());
    });
    return true;
}

function startAppVersionMonitor() {
    const scopePath = appBasePath();
    const buildIdUrl = `${scopePath}build-id.txt`;
    let reloading = false;

    function removeReloadMarker() {
        const url = new URL(window.location.href);
        let changed = false;
        for (const key of ['appBuild', 'appCacheReset']) {
            if (!url.searchParams.has(key))
                continue;
            url.searchParams.delete(key);
            changed = true;
        }
        if (changed)
            window.history.replaceState({}, '', url.toString());
    }

    async function checkVersion() {
        if (reloading)
            return;

        try {
            const response = await fetch(`${buildIdUrl}?check=${Date.now()}`, {cache: 'no-store'});
            if (!response.ok)
                return;

            const deployedBuildId = (await response.text()).trim();
            const contentType = String(response.headers.get('content-type') || '').toLowerCase();
            const validBuildId = /^[A-Za-z0-9][A-Za-z0-9._+-]{0,95}-\d{10,20}$/.test(deployedBuildId);
            if (!contentType.startsWith('text/plain') || !validBuildId)
                return;

            if (!currentBuildId || deployedBuildId === currentBuildId) {
                removeReloadMarker();
                return;
            }

            const currentUrl = new URL(window.location.href);
            if (currentUrl.searchParams.get('appBuild') === deployedBuildId)
                return;

            reloading = true;
            await clearBrowserAppCache();
            currentUrl.searchParams.delete('appCacheReset');
            currentUrl.searchParams.set('appBuild', deployedBuildId);
            window.location.replace(currentUrl.toString());
        } catch (e) {
            //
        }
    }

    checkVersion();
    window.addEventListener('focus', checkVersion);
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden)
            checkVersion();
    });
    window.setInterval(checkVersion, 60*1000);
}

if (!consumeClearAppCacheFlag())
    startAppVersionMonitor();

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        const scopePath = appBasePath();
        navigator.serviceWorker.register(`${scopePath}sw.js`, {updateViaCache: 'none'})
            .then((registration) => registration.update())
            .catch(() => {});
    });

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing)
            return;

        refreshing = true;
        window.location.reload();
    });
}
