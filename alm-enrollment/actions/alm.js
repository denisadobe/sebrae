/*
 * Adobe Learning Manager (ALM) API client — API v2 (JSON:API), OAuth tokens.
 * Admin calls use a token refreshed from the integration's admin refresh token
 * (ALM Integration Admin > Applications). Learner calls use a learner token issued for an
 * e-mail ("learner impersonation", POST /oauth/o/learnerToken), which ALM only allows after
 * Adobe enables it for the account; without it the admin API is used instead (user lookup,
 * enrollments list) and courses open in the ALM learner app instead of the embedded player.
 */

const JSON_API = 'application/vnd.api+json';

const baseUrl = (params) => (params.ALM_BASE_URL || 'https://learningmanager.adobe.com').replace(/\/$/, '');

/** Short, secret-free description of an ALM error body. */
function describe(body = {}) {
  const parts = [
    body.title, body.source?.info, body.detail, body.message, body.error, body.error_description, body.text,
  ]
    .filter((part) => typeof part === 'string' && part.trim());
  return [...new Set(parts)].join(' — ').slice(0, 300);
}

class AlmError extends Error {
  constructor(message, status, body) {
    const detail = describe(body);
    super(`${message} (${status})${detail ? `: ${detail}` : ''}`);
    this.status = status;
    this.body = body;
  }
}

async function readBody(resp) {
  const text = await resp.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch (e) {
    return { text: text.slice(0, 300) };
  }
}

/** Admin access token + account id (refresh token grant). */
async function getAdminSession(params) {
  const resp = await fetch(`${baseUrl(params)}/oauth/token/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: params.ALM_CLIENT_ID,
      client_secret: params.ALM_CLIENT_SECRET,
      refresh_token: params.ALM_REFRESH_TOKEN,
    }),
  });
  const body = await readBody(resp);
  if (!resp.ok || !body.access_token) throw new AlmError('ALM admin token refresh failed', resp.status, body);
  return { token: body.access_token, accountId: params.ALM_ACCOUNT_ID || body.account_id };
}

const getAdminToken = async (params) => (await getAdminSession(params)).token;

/**
 * Learner token for an e-mail (learner impersonation).
 * @returns {Promise<{accessToken: string, userId: string, expiresIn: number}|null>} null when
 *   ALM refuses (no such user, or impersonation not enabled for the account)
 */
async function getLearnerToken(params, email) {
  const url = new URL(`${baseUrl(params)}/oauth/o/learnerToken`);
  url.searchParams.set('learner_email', email);
  url.searchParams.set('force', 'false');
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: params.ALM_CLIENT_ID,
      client_secret: params.ALM_CLIENT_SECRET,
      refresh_token: params.ALM_REFRESH_TOKEN,
    }),
  });
  const body = await readBody(resp);
  if (resp.ok && body.access_token) {
    return {
      accessToken: body.access_token,
      userId: body.user_id ? String(body.user_id) : null,
      expiresIn: body.expires_in,
    };
  }
  if (resp.status < 500) {
    // eslint-disable-next-line no-console
    console.log(`learner token not available (${resp.status}): ${describe(body)}`);
    return null;
  }
  throw new AlmError('ALM learner token request failed', resp.status, body);
}

/** API v2 request with an admin or learner token. */
async function api(params, token, path, { method = 'GET', query = {}, body } = {}) {
  const url = new URL(`${baseUrl(params)}/primeapi/v2${path}`);
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null) url.searchParams.set(key, value);
  });
  const resp = await fetch(url, {
    method,
    headers: {
      Authorization: `oauth ${token}`,
      Accept: JSON_API,
      ...(body && { 'Content-Type': JSON_API }),
    },
    ...(body && { body: JSON.stringify(body) }),
  });
  const data = await readBody(resp);
  if (!resp.ok) throw new AlmError(`ALM ${method} ${path} failed`, resp.status, data);
  return data;
}

/** ALM ids: "course:123" (a plain number is a course id). */
const toLoId = (value) => {
  const id = String(value || '').trim();
  if (!id) return null;
  return id.includes(':') ? id : `course:${id}`;
};

/** Course page in the ALM learner app (when the embedded player is not available). */
const courseUrl = (params, loId, accountId) => {
  const [type, id] = String(loId).split(':');
  const query = accountId ? `?accountId=${encodeURIComponent(accountId)}` : '';
  return `${baseUrl(params)}/app/learner${query}#/${type}/${id}`;
};

/** Admin lookup of a user by e-mail. */
async function findUserIdByAdmin(params, adminToken, email) {
  const { data } = await api(params, adminToken, '/users', {
    query: { ids: `email:${email}` },
  });
  return (Array.isArray(data) ? data[0] : data)?.id || null;
}

/** Id of the ALM user with this e-mail, or null: learner token when available, else admin lookup. */
async function findUserId(params, adminToken, email) {
  const learner = await getLearnerToken(params, email);
  if (learner?.userId) return learner.userId;
  if (learner?.accessToken) {
    const { data } = await api(params, learner.accessToken, '/user');
    if (data?.id) return data.id;
  }
  return findUserIdByAdmin(params, adminToken, email);
}

/**
 * Creates the learner: external user of ALM_EXTERNAL_PROFILE_ID (public customers, the
 * recommended setup) or an internal user when no external profile is configured.
 */
async function createUser(params, adminToken, { email, name }) {
  const external = params.ALM_EXTERNAL_PROFILE_ID;
  const { data } = await api(params, adminToken, external ? `/externalProfiles/${external}/users` : '/users', {
    method: 'POST',
    body: { data: { type: 'user', attributes: { email, name, userType: external ? 'EXTERNAL' : 'INTERNAL' } } },
  });
  return data.id;
}

async function findOrCreateUser(params, adminToken, { email, name }) {
  const existing = await findUserId(params, adminToken, email);
  if (existing) return existing;
  try {
    return await createUser(params, adminToken, { email, name });
  } catch (error) {
    // created meanwhile (event retry) or not visible to the lookup: look again before failing
    const again = error.status && error.status < 500 && await findUserIdByAdmin(params, adminToken, email);
    if (again) return again;
    throw error;
  }
}

/** Default (or first active) instance of a learning object. */
async function getDefaultInstanceId(params, adminToken, loId) {
  const { data, included = [] } = await api(params, adminToken, `/learningObjects/${encodeURIComponent(loId)}`, {
    query: { include: 'instances' },
  });
  const ids = (data?.relationships?.instances?.data || []).map((i) => i.id);
  const instances = included.filter((i) => i.type === 'learningObjectInstance' && ids.includes(i.id));
  const active = instances.filter((i) => i.attributes?.state !== 'Retired');
  return (active.find((i) => i.attributes?.isDefault) || active[0] || instances[0])?.id
    || ids[0] || null;
}

/** Enrolls the user; an existing enrollment counts as success (event retries). */
async function enroll(params, adminToken, userId, loId) {
  const loInstanceId = await getDefaultInstanceId(params, adminToken, loId);
  if (!loInstanceId) throw new AlmError(`No instance for ${loId}`, 404, {});
  try {
    const { data } = await api(params, adminToken, `/users/${userId}/enrollments`, {
      method: 'POST',
      query: { loId, loInstanceId, allowMultiEnrollment: false },
    });
    return {
      loId, loInstanceId, enrollmentId: data?.id, status: 'enrolled',
    };
  } catch (error) {
    const detail = JSON.stringify(error.body || {}).toLowerCase();
    if (error.status && error.status < 500 && detail.includes('already')) {
      return { loId, loInstanceId, status: 'already-enrolled' };
    }
    throw error;
  }
}

/** Course cards from an enrollments response (learner or admin endpoint). */
function toCourses({ data = [], included = [] }, locale = 'pt-BR') {
  const los = Object.fromEntries(included.filter((i) => i.type === 'learningObject').map((i) => [i.id, i]));
  return data.map((enrollment) => {
    const loId = enrollment.relationships?.learningObject?.data?.id;
    const lo = los[loId]?.attributes || {};
    const metadata = lo.localizedMetadata || [];
    const meta = metadata.find((m) => m.locale?.toLowerCase().startsWith(locale.slice(0, 2).toLowerCase()))
      || metadata[0] || {};
    return {
      loId,
      name: meta.name || loId,
      description: meta.description || '',
      imageUrl: lo.imageUrl || '',
      duration: lo.duration || 0,
      state: enrollment.attributes?.state,
      progress: enrollment.attributes?.progressPercent || 0,
      dateEnrolled: enrollment.attributes?.dateEnrolled,
    };
  });
}

const ENROLLMENTS_QUERY = {
  include: 'learningObject',
  'filter.loTypes': 'course',
  'page[limit]': 10,
  sort: '-dateEnrolled',
};

/** Courses of the learner (learner token). */
async function listEnrollments(params, learnerToken, locale) {
  return toCourses(await api(params, learnerToken, '/enrollments', { query: ENROLLMENTS_QUERY }), locale);
}

/** Courses of a user (admin token). */
async function listUserEnrollments(params, adminToken, userId, locale) {
  return toCourses(await api(params, adminToken, `/users/${userId}/enrollments`, { query: ENROLLMENTS_QUERY }), locale);
}

module.exports = {
  AlmError,
  baseUrl,
  courseUrl,
  getAdminSession,
  getAdminToken,
  getLearnerToken,
  api,
  toLoId,
  findUserIdByAdmin,
  findUserId,
  createUser,
  findOrCreateUser,
  getDefaultInstanceId,
  enroll,
  listEnrollments,
  listUserEnrollments,
};
