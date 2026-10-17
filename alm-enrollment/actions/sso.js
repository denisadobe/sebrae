/*
 * Single sign-on helpers: OIDC ID token validation (Auth0 / any OIDC provider, RS256 via the
 * provider's JWKS) and Adobe IMS server-to-server tokens for the Commerce admin GraphQL calls.
 * Node crypto only (no dependencies).
 */
const crypto = require('crypto');

const b64url = (part) => Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

let jwksCache = { url: null, keys: [], at: 0 };

async function getJwks(issuer) {
  const url = `${issuer.replace(/\/$/, '')}/.well-known/jwks.json`;
  if (jwksCache.url === url && Date.now() - jwksCache.at < 10 * 60 * 1000) return jwksCache.keys;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`JWKS ${resp.status}`);
  const { keys = [] } = await resp.json();
  jwksCache = { url, keys, at: Date.now() };
  return keys;
}

/**
 * Validates an OIDC ID token: RS256 signature (provider JWKS), issuer, audience, expiry.
 * @returns {Promise<Object>} the token claims
 */
async function verifyIdToken(idToken, { issuer, audience, now = Date.now() / 1000 }) {
  const parts = String(idToken || '').split('.');
  if (parts.length !== 3) throw new Error('malformed token');
  const header = JSON.parse(b64url(parts[0]).toString('utf8'));
  const claims = JSON.parse(b64url(parts[1]).toString('utf8'));
  if (header.alg !== 'RS256') throw new Error(`unsupported alg ${header.alg}`);

  let keys = await getJwks(issuer);
  let jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) {
    jwksCache.at = 0; // key rotation: refetch once
    keys = await getJwks(issuer);
    jwk = keys.find((k) => k.kid === header.kid);
  }
  if (!jwk) throw new Error('unknown signing key');
  const key = crypto.createPublicKey({ key: jwk, format: 'jwk' });
  const valid = crypto.verify('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`), key, b64url(parts[2]));
  if (!valid) throw new Error('invalid signature');

  const iss = issuer.endsWith('/') ? issuer : `${issuer}/`;
  if (claims.iss !== iss && claims.iss !== issuer) throw new Error('wrong issuer');
  const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!aud.includes(audience)) throw new Error('wrong audience');
  if (!claims.exp || claims.exp < now - 60) throw new Error('expired token');
  return claims;
}

/** First / last name for Commerce (both required) from the OIDC claims. */
function getNames(claims) {
  const email = claims.email || '';
  const full = claims.name && !claims.name.includes('@') ? claims.name.trim() : '';
  const [first, ...rest] = full.split(/\s+/);
  return {
    firstname: claims.given_name || first || claims.nickname || email.split('@')[0] || 'Cliente',
    lastname: claims.family_name || rest.join(' ') || 'Sebrae',
  };
}

const IMS_SCOPES = 'openid,AdobeID,email,profile,additional_info.roles,additional_info.projectedProductContext,commerce.accs';
let imsCache = { token: null, exp: 0 };

/** Adobe IMS access token (OAuth server-to-server) for Commerce as a Cloud Service admin calls. */
async function getImsToken(params) {
  if (imsCache.token && Date.now() < imsCache.exp) return imsCache.token;
  const resp = await fetch('https://ims-na1.adobelogin.com/ims/token/v3', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: params.IMS_CLIENT_ID,
      client_secret: params.IMS_CLIENT_SECRET,
      grant_type: 'client_credentials',
      scope: params.IMS_SCOPES || IMS_SCOPES,
    }),
  });
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok || !body.access_token) {
    throw new Error(`IMS token failed (${resp.status}): ${body.error_description || body.error || ''}`);
  }
  imsCache = { token: body.access_token, exp: Date.now() + ((body.expires_in || 3600) - 300) * 1000 };
  return imsCache.token;
}

/** Headers of a Commerce admin GraphQL call (IMS token + API key + org). */
async function commerceAdminHeaders(params) {
  return {
    Authorization: `Bearer ${await getImsToken(params)}`,
    'x-api-key': params.IMS_CLIENT_ID,
    ...(params.IMS_ORG_ID && { 'x-gw-ims-org-id': params.IMS_ORG_ID }),
  };
}

module.exports = {
  verifyIdToken, getNames, getImsToken, commerceAdminHeaders,
};
