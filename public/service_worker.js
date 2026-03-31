// const CACHE_VERSION = 1;

// const BASE_CACHE_FILES = [
//     '/scss/style.css',
//     '/js/site.js',
//     // '/search.json',
//     '/metadata/manifest.json',
//     '/metadata/favicon.ico',
// ];

// const OFFLINE_CACHE_FILES = [
//     '/scss/style.css',
//     '/js/site.js',
//     // '/offline/index.html',
// ];

// const NOT_FOUND_CACHE_FILES = [
//     '/scss/style.css',
//     '/js/site.js',
//     // '/404.html',
// ];

// const OFFLINE_PAGE = '/offline/index.html';
// const NOT_FOUND_PAGE = '/404.html';

// const CACHE_VERSIONS = {
//     assets: 'assets-v' + CACHE_VERSION,
//     content: 'content-v' + CACHE_VERSION,
//     offline: 'offline-v' + CACHE_VERSION,
//     notFound: '404-v' + CACHE_VERSION,
// };

// // Define MAX_TTL's in SECONDS for specific file extensions
// const MAX_TTL = {
//     '/': 3600,
//     html: 3600,
//     json: 86400,
//     js: 86400,
//     css: 86400,
// };

// const CACHE_BLACKLIST = [
//     //(str) => {
//     //    return !str.startsWith('http://localhost') && !str.startsWith('https://gohugohq.com');
//     //},
// ];

// const SUPPORTED_METHODS = [
//     'GET',
// ];

// /**
//  * isBlackListed
//  * @param {string} url
//  * @returns {boolean}
//  */
// function isBlacklisted(url) {
//     return (CACHE_BLACKLIST.length > 0) ? !CACHE_BLACKLIST.filter((rule) => {
//         if(typeof rule === 'function') {
//             return !rule(url);
//         } else {
//             return false;
//         }
//     }).length : false
// }

// /**
//  * getFileExtension
//  * @param {string} url
//  * @returns {string}
//  */
// function getFileExtension(url) {
//     let extension = url.split('.').reverse()[0].split('?')[0];
//     return (extension.endsWith('/')) ? '/' : extension;
// }

// /**
//  * getTTL
//  * @param {string} url
//  */
// function getTTL(url) {
//     if (typeof url === 'string') {
//         let extension = getFileExtension(url);
//         if (typeof MAX_TTL[extension] === 'number') {
//             return MAX_TTL[extension];
//         } else {
//             return null;
//         }
//     } else {
//         return null;
//     }
// }

// /**
//  * installServiceWorker
//  * @returns {Promise}
//  */
// function installServiceWorker() {
//     return Promise.all(
//         [
//             caches.open(CACHE_VERSIONS.assets)
//                 .then(
//                     (cache) => {
//                         return cache.addAll(BASE_CACHE_FILES);
//                     }
//                 ),
//             caches.open(CACHE_VERSIONS.offline)
//                 .then(
//                     (cache) => {
//                         return cache.addAll(OFFLINE_CACHE_FILES);
//                     }
//                 ),
//             caches.open(CACHE_VERSIONS.notFound)
//                 .then(
//                     (cache) => {
//                         return cache.addAll(NOT_FOUND_CACHE_FILES);
//                     }
//                 )
//         ]
//     )
//         .then(() => {
//             return self.skipWaiting();
//         });
// }

// /**
//  * cleanupLegacyCache
//  * @returns {Promise}
//  */
// function cleanupLegacyCache() {

//     let currentCaches = Object.keys(CACHE_VERSIONS)
//         .map(
//             (key) => {
//                 return CACHE_VERSIONS[key];
//             }
//         );

//     return new Promise(
//         (resolve, reject) => {

//             caches.keys()
//                 .then(
//                     (keys) => {
//                         return legacyKeys = keys.filter(
//                             (key) => {
//                                 return !~currentCaches.indexOf(key);
//                             }
//                         );
//                     }
//                 )
//                 .then(
//                     (legacy) => {
//                         if (legacy.length) {
//                             Promise.all(
//                                 legacy.map(
//                                     (legacyKey) => {
//                                         return caches.delete(legacyKey)
//                                     }
//                                 )
//                             )
//                                 .then(
//                                     () => {
//                                         resolve()
//                                     }
//                                 )
//                                 .catch(
//                                     (err) => {
//                                         reject(err);
//                                     }
//                                 );
//                         } else {
//                             resolve();
//                         }
//                     }
//                 )
//                 .catch(
//                     () => {
//                         reject();
//                     }
//                 );

//         }
//     );
// }

// function precacheUrl(url) {
//     if(!isBlacklisted(url)) {
//         caches.open(CACHE_VERSIONS.content)
//             .then((cache) => {
//                 cache.match(url)
//                     .then((response) => {
//                         if(!response) {
//                             return fetch(url)
//                         } else {
//                             // already in cache, nothing to do.
//                             return null
//                         }
//                     })
//                     .then((response) => {
//                         if(response) {
//                             return cache.put(url, response.clone());
//                         } else {
//                             return null;
//                         }
//                     });
//             })
//     }
// }



// self.addEventListener(
//     'install', event => {
//         event.waitUntil(
//             Promise.all([
//                 installServiceWorker(),
//                 self.skipWaiting(),
//             ])
//         );
//     }
// );

// // The activate handler takes care of cleaning up old caches.
// self.addEventListener(
//     'activate', event => {
//         event.waitUntil(
//             Promise.all(
//                 [
//                     cleanupLegacyCache(),
//                     self.clients.claim(),
//                     self.skipWaiting(),
//                 ]
//             )
//                 .catch(
//                     (err) => {
//                         event.skipWaiting();
//                     }
//                 )
//         );
//     }
// );

// self.addEventListener(
//     'fetch', event => {

//         event.respondWith(
//             caches.open(CACHE_VERSIONS.content)
//                 .then(
//                     (cache) => {

//                         return cache.match(event.request)
//                             .then(
//                                 (response) => {

//                                     if (response) {

//                                         let headers = response.headers.entries();
//                                         let date = null;

//                                         for (let pair of headers) {
//                                             if (pair[0] === 'date') {
//                                                 date = new Date(pair[1]);
//                                             }
//                                         }

//                                         if (date) {
//                                             let age = parseInt((new Date().getTime() - date.getTime()) / 1000);
//                                             let ttl = getTTL(event.request.url);

//                                             if (ttl && age > ttl) {

//                                                 return new Promise(
//                                                     (resolve) => {

//                                                         return fetch(event.request.clone())
//                                                             .then(
//                                                                 (updatedResponse) => {
//                                                                     if (updatedResponse) {
//                                                                         cache.put(event.request, updatedResponse.clone());
//                                                                         resolve(updatedResponse);
//                                                                     } else {
//                                                                         resolve(response)
//                                                                     }
//                                                                 }
//                                                             )
//                                                             .catch(
//                                                                 () => {
//                                                                     resolve(response);
//                                                                 }
//                                                             );

//                                                     }
//                                                 )
//                                                     .catch(
//                                                         (err) => {
//                                                             return response;
//                                                         }
//                                                     );
//                                             } else {
//                                                 return response;
//                                             }

//                                         } else {
//                                             return response;
//                                         }

//                                     } else {
//                                         return null;
//                                     }
//                                 }
//                             )
//                             .then(
//                                 (response) => {
//                                     if (response) {
//                                         return response;
//                                     } else {
//                                         return fetch(event.request.clone())
//                                             .then(
//                                                 (response) => {

//                                                     if(response.status < 400) {
//                                                         if (~SUPPORTED_METHODS.indexOf(event.request.method) && !isBlacklisted(event.request.url)) {
//                                                             cache.put(event.request, response.clone());
//                                                         }
//                                                         return response;
//                                                     } else {
//                                                         return caches.open(CACHE_VERSIONS.notFound).then((cache) => {
//                                                             return cache.match(NOT_FOUND_PAGE);
//                                                         })
//                                                     }
//                                                 }
//                                             )
//                                             .then((response) => {
//                                                 if(response) {
//                                                     return response;
//                                                 }
//                                             })
//                                             .catch(
//                                                 () => {

//                                                     return caches.open(CACHE_VERSIONS.offline)
//                                                         .then(
//                                                             (offlineCache) => {
//                                                                 return offlineCache.match(OFFLINE_PAGE)
//                                                             }
//                                                         )

//                                                 }
//                                             );
//                                     }
//                                 }
//                             )
//                             .catch(
//                                 (error) => {
//                                     console.error('  Error in fetch handler:', error);
//                                     throw error;
//                                 }
//                             );
//                     }
//                 )
//         );

//     }
// );


// self.addEventListener('message', (event) => {

//     if(
//         typeof event.data === 'object' &&
//         typeof event.data.action === 'string'
//     ) {
//         switch(event.data.action) {
//             case 'cache' :
//                 precacheUrl(event.data.url);
//                 break;
//             default :
//                 console.log('Unknown action: ' + event.data.action);
//                 break;
//         }
//     }

// });

// ============================================================
// Cache names — bump version to force cache refresh on deploy
// ============================================================
const CACHE_VERSION  = 'v2';
const STATIC_CACHE   = 'static-'  + CACHE_VERSION;
const DYNAMIC_CACHE  = 'dynamic-' + CACHE_VERSION;
const IMAGE_CACHE    = 'images-'  + CACHE_VERSION;

const ALL_CACHES = [STATIC_CACHE, DYNAMIC_CACHE, IMAGE_CACHE];

// App shell — these are always cached on install
const APP_SHELL = [
  '/',
  '/about/',
  '/projects/',
  '/blogs/'
];

// ============================================================
// Install — cache the app shell
// ============================================================
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// ============================================================
// Activate — remove old caches, claim clients immediately
// ============================================================
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => !ALL_CACHES.includes(key))
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// ============================================================
// Fetch — tiered caching strategy
// ============================================================
self.addEventListener('fetch', event => {
  var url = new URL(event.request.url);

  // Skip non-GET and cross-origin (analytics, fonts CDN, etc.)
  if (event.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  var isImage      = /\.(webp|png|jpg|jpeg|gif|svg|ico)$/i.test(url.pathname);
  var isStaticAsset = /\.(css|js|woff2?|ttf)$/i.test(url.pathname);

  if (isImage) {
    // Images: cache-first, long-lived
    event.respondWith(cacheFirst(IMAGE_CACHE, event.request));
  } else if (isStaticAsset) {
    // CSS/JS: cache-first (fingerprinted filenames ensure freshness)
    event.respondWith(cacheFirst(STATIC_CACHE, event.request));
  } else {
    // HTML pages: stale-while-revalidate
    event.respondWith(staleWhileRevalidate(DYNAMIC_CACHE, event.request));
  }
});

// ============================================================
// Strategy helpers
// ============================================================
function cacheFirst(cacheName, request) {
  return caches.open(cacheName).then(function (cache) {
    return cache.match(request).then(function (cached) {
      if (cached) return cached;
      return fetch(request).then(function (response) {
        if (response.ok) cache.put(request, response.clone());
        return response;
      }).catch(function () { return cached; });
    });
  });
}

function staleWhileRevalidate(cacheName, request) {
  return caches.open(cacheName).then(function (cache) {
    return cache.match(request).then(function (cached) {
      var networkFetch = fetch(request).then(function (response) {
        if (response.ok) cache.put(request, response.clone());
        return response;
      }).catch(function () { return cached; });

      return cached || networkFetch;
    });
  });
}