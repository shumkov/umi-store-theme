// Cache Test - Version 1
console.log('%c CACHE TEST VERSION: 1 ', 'background: #ff0000; color: white; font-size: 20px; padding: 10px;');

document.addEventListener('DOMContentLoaded', function() {
  var banner = document.createElement('div');
  banner.className = 'cache-test-banner';
  banner.textContent = 'CACHE TEST - VERSION 1';
  document.body.insertBefore(banner, document.body.firstChild);
});
