/*
 * Adobe Learning Manager (ALM) API client — API v2 (JSON:API), OAuth tokens.
 * Admin calls use a token refreshed from the integration's admin refresh token
 * (ALM Integration Admin > Applications). Learner calls use a learner token issued
 * for an e-mail (headless ALM), so the site never sees admin credentials.
 */

const JSON_API = 'application/vnd.api+json';

const baseUrl = (params) => (params.ALM_BASE_URL || 'https://learningmanager.adobe.com').replace(/\/$/, '');

class AlmError extends Error {
  constructor(message, status, body) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function readBody(resp) {
  const text = await resp.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch (e) {
    return { text };
  }
}

/** Admin access token (refresh token grant). */
async function getAdminToken(params) {
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
  return body.access_token;
}

/**
 * Learner token for an e-mail (headless ALM). Fails when the user does not exist in ALM.
 * @returns {Promise<string|null>} null when ALM has no such user
 */
async function getLearnerToken(params, email, ttl = 3600) {
  const url = new URL(`${baseUrl(params)}/oauth/o/learnerToken`);
  url.searchParams.set('learner_token_app_id', params.ALM_CLIENT_ID);
  url.searchParams.set('learner_token_app_secret', params.ALM_CLIENT_SECRET);
  url.searchParams.set('learner_token_app_refresh_token', params.ALM_REFRESH_TOKEN);
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, ttl }),
  });
  const body = await readBody(resp);
  if (resp.ok && body.access_token) return body.access_token;
  if (resp.status === 400 || resp.status === 404) return null;
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

/** Id of the ALM user with this e-mail, or null. */
async function findUserId(params, adminToken, email) {
  const { data } = await api(params, adminToken, '/users', {
    query: { ids: `email:${email}` },
  });
  return (Array.isArray(data) ? data[0] : data)?.id || null;
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
  return (await findUserId(params, adminToken, email)) || createUser(params, adminToken, { email, name });
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

/** Courses the learner is enrolled in (name, image, progress) — learner token. */
async function listEnrollments(params, learnerToken, locale = 'pt-BR') {
  const { data = [], included = [] } = await api(params, learnerToken, '/enrollments', {
    query: {
      include: 'learningObject',
      'filter.loTypes': 'course',
      'page[limit]': 10,
      sort: '-dateEnrolled',
    },
  });
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

module.exports = {
  AlmError,
  baseUrl,
  getAdminToken,
  getLearnerToken,
  api,
  toLoId,
  findUserId,
  createUser,
  findOrCreateUser,
  getDefaultInstanceId,
  enroll,
  listEnrollments,
};
