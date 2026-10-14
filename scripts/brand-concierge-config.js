/*
 * Adobe Brand Concierge — environment + Web Client styling configuration (commerce branch).
 * Values come from the install script generated in Brand Concierge (Deploy > Component install).
 */

export const ALLOY_SRC = 'https://cdn1.adoberesources.net/alloy/2.35.1/alloy.min.js';
export const WEB_CLIENT_SRC = 'https://experience.adobe.net/solutions/experience-platform-brand-concierge-web-agent/static-assets/main.js';

export const ALLOY_CONFIG = {
  defaultConsent: 'in',
  edgeDomain: 'edge.adobedc.net',
  edgeBasePath: 'ee',
  datastreamId: 'c34abba2-b513-4c27-8e6b-d477771eade9',
  orgId: '0E061E2D61F93F260A495FD6@AdobeOrg',
  debugEnabled: false,
  idMigrationEnabled: false,
  thirdPartyCookiesEnabled: false,
  prehidingStyle: '.personalization-container { opacity: 0 !important }',
  conversation: { region: 'va7' },
};

// Styling configuration exported from Brand Concierge (scripts/brand-concierge-style.json),
// loaded at runtime; these overrides only replace the template placeholders it still contains.
export const STYLE_URL = '/scripts/brand-concierge-style.json';

export const STYLE_OVERRIDES = {
  behavior: {
    privacyNotice: {
      title: 'Aviso de privacidade',
      text: 'Ao usar este assistente virtual, você concorda que as informações fornecidas na conversa podem ser coletadas, usadas e armazenadas pelo Sebrae e por seus prestadores de serviço, conforme a {Política de Privacidade}. Não compartilhe dados pessoais sensíveis (como informações financeiras ou de saúde).',
      links: [{ text: 'Política de Privacidade', url: 'https://sebrae.com.br/sites/PortalSebrae/canais_adicionais/politica_privacidade' }],
    },
  },
  disclaimer: {
    links: [{ text: 'Termos de Uso', url: 'https://sebrae.com.br/termos-de-uso' }],
  },
};
