'use strict';

const CACHE_VERSION = 8;
const INDEX_URL = 'index.html';
const TEMPLATE_URL = 'template.html';
const DATA_URL = 'data/stories.json';
const CURRENT_CACHES = {
  data: 'data-cache-v' + CACHE_VERSION,
  templates: 'templates-cache-v' + CACHE_VERSION,
  index: 'index-cache-v' + CACHE_VERSION,
};

self.addEventListener('install', event => {
  event.waitUntil(
    // We can't use cache.add() here, since we want OFFLINE_URL to be the cache key, but
    // the actual URL we end up requesting might include a cache-busting parameter.
    fetch(TEMPLATE_URL).then(response => {
      return caches.open(CURRENT_CACHES.templates).then(cache => {
        return cache.put(TEMPLATE_URL, response);
      });
    })
  );

  event.waitUntil(
    // We can't use cache.add() here, since we want OFFLINE_URL to be the cache key, but
    // the actual URL we end up requesting might include a cache-busting parameter.
    fetch(TEMPLATE_URL).then(response => {
      return caches.open(CURRENT_CACHES.templates).then(cache => {
        return cache.put(TEMPLATE_URL, response);
      });
    })
  );

  event.waitUntil(
    // We can't use cache.add() here, since we want OFFLINE_URL to be the cache key, but
    // the actual URL we end up requesting might include a cache-busting parameter.
    fetch(INDEX_URL).then(response => {
      return caches.open(CURRENT_CACHES.index).then(cache => {
        return cache.put(INDEX_URL, response);
      });
    })
  );
});

self.addEventListener('activate', event => {
  let expectedCacheNames = Object.keys(CURRENT_CACHES).map(key => {
    return CURRENT_CACHES[key];
  });

  // Active worker won't be treated as activated until promise resolves successfully.
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (expectedCacheNames.indexOf(cacheName) == -1) {
            console.log('Deleting out of date cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
    console.log('Handling fetch event for', event.request.url);
    // Handle homepage
    if (event.request.url.match(/\/$|index\.html/i)) {
      console.log('Homepage fetch event for', event.request.url);
      event.respondWith(
          fetch(event.request).catch(error => {
            return caches.match(INDEX_URL);
          })
        );
    }

    // Handle stories
    if (event.request.url.match(/stories\/[\d]+\.html/i)) {
        console.log('Story fetch event for', event.request.url);
        event.respondWith(
          fetch(event.request).catch(error => {
            // The catch is only triggered if fetch() throws an exception, which will most likely
            // happen due to the server being unreachable.
            // If fetch() returns a valid HTTP response with an response code in the 4xx or 5xx
            // range, the catch() will NOT be called. If you need custom handling for 4xx or 5xx
            // errors, see https://github.com/GoogleChrome/samples/tree/gh-pages/service-worker/fallback-response

            // 1) Get JSON, Get template, Replace placeholders in the template with the JSON, return to user

            console.log('Fetch failed; returning offline page for stories instead.', error);

            return caches.match(TEMPLATE_URL).then(template => {
                return template.text().then(templateText => {
                    return caches.match(DATA_URL).then(data => {
                        return data.json().then(json => {

                          var storyId = event.request.url.match(/[\d]{2,}/);
                          // do something with your JSON
                          var final = templateText.replace(/{{headline}}/g, json.stories[storyId[0]].headline );
                          final = final.replace("{{body}}", json.stories[storyId[0]].body);
                          return new Response(final, { "headers" : {"Content-Type" : "text/html" }});
                          //return caches.match(TEMPLATE_URL);
                        });
                    });
                });
            });
          })
        );
    }
});
