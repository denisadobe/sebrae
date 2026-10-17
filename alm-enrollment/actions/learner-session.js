/*
 * ALM learner connection kept by the browser (single sign-on path, without learner
 * impersonation): the learner's ALM OAuth tokens sealed with ALM_SESSION_SECRET and bound to
 * the customer e-mail, so it only works for that customer and only through these actions.
 */
const alm = require('./alm.js');
const sso = require('./sso.js');

const sameEmail = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

function sealSession(params, email, tokens) {
  return sso.seal(params.ALM_SESSION_SECRET, { email, ...tokens });
}

/**
 * Valid learner access token for the customer from a sealed session (refreshed when expired).
 * @returns {Promise<{accessToken, expiresAt, session?}|null>} session = new sealed value when
 *   the tokens changed; null when the session is missing, invalid or belongs to someone else
 */
async function openSession(params, sealed, email) {
  if (!sealed || !params.ALM_SESSION_SECRET) return null;
  const value = sso.unseal(params.ALM_SESSION_SECRET, sealed);
  if (!value || !sameEmail(value.email, email)) return null;
  if (value.accessToken && value.expiresAt > Date.now() + 5 * 60 * 1000) {
    return { accessToken: value.accessToken, expiresAt: value.expiresAt };
  }
  if (!value.refreshToken) return null;
  try {
    const tokens = await alm.refreshLearner(params, value.refreshToken);
    return { ...tokens, session: sealSession(params, email, tokens) };
  } catch (error) {
    // revoked / expired refresh token: the site connects again
    // eslint-disable-next-line no-console
    console.log('learner session refresh failed:', error.message);
    return null;
  }
}

module.exports = { sameEmail, sealSession, openSession };
