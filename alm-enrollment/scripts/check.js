#!/usr/bin/env node
/* eslint-disable no-console */
/*
 * Checks the ALM + Commerce setup before deploying, with the credentials of .env.
 * Prints only results (no tokens), so the output can be shared.
 *   node scripts/check.js [course id] [learner e-mail] [product SKU]
 */
const fs = require('fs');
const path = require('path');
const alm = require('../actions/alm.js');
const commerce = require('../actions/commerce.js');

function loadEnv() {
  const file = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(file)) throw new Error('.env not found (copy .env.example)');
  return Object.fromEntries(fs.readFileSync(file, 'utf8').split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const i = line.indexOf('=');
      return [line.slice(0, i).trim(), line.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
    }));
}

const ok = (label, detail = '') => console.log(`OK    ${label}${detail ? ` — ${detail}` : ''}`);
const fail = (label, error) => console.log(`FALHA ${label} — ${error.status || ''} ${error.message} ${JSON.stringify(error.body || error.errors || '').slice(0, 300)}`);

async function step(label, fn) {
  try {
    const detail = await fn();
    ok(label, detail);
    return true;
  } catch (error) {
    fail(label, error);
    return false;
  }
}

async function main() {
  const params = loadEnv();
  const [courseId, email, sku] = process.argv.slice(2);
  const missing = ['ALM_CLIENT_ID', 'ALM_CLIENT_SECRET', 'ALM_REFRESH_TOKEN', 'COMMERCE_GRAPHQL_URL'].filter((k) => !params[k]);
  if (missing.length) console.log(`AVISO faltando no .env: ${missing.join(', ')}`);

  let adminToken;
  await step('ALM: token de administrador', async () => {
    adminToken = await alm.getAdminToken(params);
    return 'refresh token válido';
  });

  if (adminToken && params.ALM_EXTERNAL_PROFILE_ID) {
    await step('ALM: perfil externo', async () => {
      const { data } = await alm.api(params, adminToken, `/externalProfiles/${params.ALM_EXTERNAL_PROFILE_ID}`);
      return `${data?.attributes?.name || data?.id}`;
    });
  }

  if (adminToken && courseId) {
    await step(`ALM: curso ${alm.toLoId(courseId)}`, async () => {
      const instance = await alm.getDefaultInstanceId(params, adminToken, alm.toLoId(courseId));
      const { data } = await alm.api(params, adminToken, `/learningObjects/${encodeURIComponent(alm.toLoId(courseId))}`);
      const name = data?.attributes?.localizedMetadata?.[0]?.name;
      return `${name || data?.id}, turma padrão ${instance}`;
    });
  }

  if (email) {
    await step(`ALM: token de aluno para ${email}`, async () => {
      const token = await alm.getLearnerToken(params, email, 300);
      if (!token) return 'usuário ainda não existe no ALM (será criado na primeira matrícula)';
      const courses = await alm.listEnrollments(params, token, params.ALM_LOCALE || 'pt-BR');
      return `${courses.length} curso(s) matriculado(s)`;
    });
  }

  if (sku) {
    await step(`Commerce: atributo ${params.ALM_COURSE_ATTRIBUTE || 'alm_course_id'} do SKU ${sku}`, async () => {
      const ids = await commerce.getCourseIds(params, [sku]);
      if (!ids[sku]) throw new Error('sem valor (atributo vazio ou não visível na loja)');
      return ids[sku];
    });
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
