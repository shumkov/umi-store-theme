// Cache Test - Version 2
console.log('%c CACHE TEST VERSION: 2 ', 'background: #00cc00; color: white; font-size: 20px; padding: 10px;');

document.addEventListener('DOMContentLoaded', function() {
  var banner = document.createElement('div');
  banner.className = 'cache-test-banner';
  banner.textContent = 'CACHE TEST - VERSION 2';
  document.body.insertBefore(banner, document.body.firstChild);
});
