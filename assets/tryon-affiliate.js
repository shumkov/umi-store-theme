(function () {
  var BLOCKED_FRAGMENTS = [
    'bixgrow',
    '019a535f-3eae-72b8-a511-9f3864a5ad71',
    '019ab839-581c-7fea-b87f-c97453c5f02d/goalify-955/assets/app-embed.js',
  ];
  var BLOCKED_LOOKUP = BLOCKED_FRAGMENTS.map(function (fragment) {
    return fragment.toLowerCase();
  });
  var ATTRIBUTE_KEY = 'affiliate_referral';
  var ATTRIBUTE_VALUE = 'true';
  var SESSION_FLAG = 'bgAffiliateAttributeSet';

  function matchesBlocked(value) {
    if (typeof value !== 'string') return false;
    var normalized = value.toLowerCase();

    return BLOCKED_LOOKUP.some(function (fragment) {
      return normalized.indexOf(fragment) !== -1;
    });
  }

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
    return matchesBlocked(node.src) || matchesBlocked(node.textContent || '');
  }

  function shouldBlockLink(node) {
    if (!node || node.tagName !== 'LINK') return false;
    var rel = (node.rel || '').toLowerCase();
    if (rel.indexOf('stylesheet') === -1) return false;
    return matchesBlocked(node.href);
  }

  function shouldBlockNode(node) {
    return shouldBlockScript(node) || shouldBlockLink(node);
  }

  function removeNode(node) {
    if (node && node.parentNode) {
      node.parentNode.removeChild(node);
    }
  }

  function purgeBlockedNodes(context) {
    var removed = false;
    context.querySelectorAll('script,link').forEach(function (el) {
      if (shouldBlockNode(el)) {
        removeNode(el);
        removed = true;
      }
    });
    return removed;
  }

  function interceptInsertion(methodName) {
    var original = Node.prototype[methodName];
    if (!original) return;

    Node.prototype[methodName] = function () {
      var node = arguments[0];
      if (shouldBlockNode(node)) {
        removeNode(node);
        return node;
      }
      return original.apply(this, arguments);
    };
  }

  function startBlocking() {
    purgeBlockedNodes(document);
    interceptInsertion('appendChild');
    interceptInsertion('insertBefore');
    interceptInsertion('replaceChild');

    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        if (mutation.type === 'attributes') {
          if (shouldBlockNode(mutation.target)) {
            removeNode(mutation.target);
          }
          return;
        }

        mutation.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1) return;
          if (shouldBlockNode(node)) {
            removeNode(node);
          } else {
            purgeBlockedNodes(node);
          }
        });
      });
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src', 'href'],
    });
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
