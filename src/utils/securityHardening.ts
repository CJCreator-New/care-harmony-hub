// CSRF Protection
export const generateCSRFToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

export const getCSRFToken = (): string => {
  let token = sessionStorage.getItem('csrf_token');
  if (!token) {
    token = generateCSRFToken();
    sessionStorage.setItem('csrf_token', token);
  }
  return token;
};

// XSS Prevention
export const sanitizeInput = (input: string): string => {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
};

export const sanitizeHTML = (html: string): string => {
  const allowedTags = ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'];
  const div = document.createElement('div');
  div.innerHTML = html;
  
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) return;
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      if (!allowedTags.includes(element.tagName.toLowerCase())) {
        while (element.firstChild) {
          element.parentNode?.insertBefore(element.firstChild, element);
        }
        element.parentNode?.removeChild(element);
      }
    }
    Array.from(node.childNodes).forEach(walk);
  };
  
  walk(div);
  return div.innerHTML;
};

// SQL Injection Prevention (for API calls)
export const escapeSQLString = (str: string): string => {
  return str.replace(/'/g, "''").replace(/\\/g, '\\\\');
};

// Content Security Policy Headers
export const getCSPHeaders = () => ({
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;",
});

// Secure Headers
export const getSecureHeaders = () => ({
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
});
