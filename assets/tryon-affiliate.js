(function () {
  var BLOCKED_FRAGMENTS = [
    'bixgrow',
    '019a535f-3eae-72b8-a511-9f3864a5ad71',
    '019ab839-581c-7fea-b87f-c97453c5f02d/goalify-955/assets/app-embed.js',
  ];
  var ATTRIBUTE_KEY = 'affiliate_referral';
  var ATTRIBUTE_VALUE = 'true';
  var SESSION_FLAG = 'bgAffiliateAttributeSet';

  function hasAffiliateReferral() {
    var params = new URLSearchParams(window.location.search);
    if (params.get('bg_ref')) return true;

    var cookies = document.cookie || '';
    return (
      cookies.indexOf('bixgrow_affiliate_referral') !== -1 ||
      cookies.indexOf('bgaffilite_id') !== -1
    );
  }

  function shouldBlockScript(node) {
    if (!node || node.tagName !== 'SCRIPT') return false;
    var src = (node.src || '').toLowerCase();
    var content = (node.textContent || '').toLowerCase();

    return BLOCKED_FRAGMENTS.some(function (fragment) {
      return src.indexOf(fragment) !== -1 || content.indexOf(fragment) !== -1;
    });
  }

  function purgeBlockedScripts(context) {
    var removed = false;
    context.querySelectorAll('script').forEach(function (script) {
      if (shouldBlockScript(script)) {
        script.parentNode && script.parentNode.removeChild(script);
        removed = true;
      }
    });
    return removed;
  }

  function startBlocking() {
    purgeBlockedScripts(document);

    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1) return;
          if (shouldBlockScript(node)) {
            node.parentNode && node.parentNode.removeChild(node);
          } else {
            purgeBlockedScripts(node);
          }
        });
      });
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function setCartAttribute() {
    if (!hasAffiliateReferral()) return;

    fetch('/cart/update.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      credentials: 'same-origin',
      body: (function () {
        var attrs = {};
        attrs[ATTRIBUTE_KEY] = ATTRIBUTE_VALUE;
        return JSON.stringify({ attributes: attrs });
      })(),
    })
      .then(function () {
        sessionStorage.setItem(SESSION_FLAG, '1');
      })
      .catch(function () {
        /* swallow */
      });
  }

  startBlocking();
  setCartAttribute();
})();
