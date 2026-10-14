/*
 * Adobe Brand Concierge — environment + Web Client styling configuration (commerce branch).
 * Values come from the install script generated in Brand Concierge (Deploy > Component install).
 * The styling object follows the Brand Concierge developer guide (stylingConfigurations).
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

export const STYLE_CONFIGURATION = {
  metadata: {
    brandName: 'Sebrae',
    version: '1.0.0',
    language: 'pt-BR',
    namespace: 'brand-concierge',
  },
  behavior: {
    multimodalCarousel: { cardClickAction: 'openLink' },
    input: { enableVoiceInput: false, disableMultiline: true },
    chat: { messageAlignment: 'normal', messageWidth: '100%' },
    privacyNotice: {
      title: 'Aviso de privacidade',
      text: 'Ao usar este assistente virtual, você concorda que as informações fornecidas na conversa podem ser coletadas, usadas e armazenadas pelo Sebrae e por seus prestadores de serviço, conforme a {Política de Privacidade}. Não compartilhe dados pessoais sensíveis (como informações financeiras ou de saúde).',
      links: [{ text: 'Política de Privacidade', url: 'https://sebrae.com.br/sites/PortalSebrae/canais_adicionais/politica_privacidade' }],
    },
    disclaimer: { attachWithInput: true },
    chatTranscript: {
      enabled: true, maxSessions: 1, maxMessagesPerSession: 20, cleanupInterval: 24,
    },
    productCard: { actionButtonSize: 'S' },
  },
  disclaimer: {
    text: 'As respostas são geradas por IA e podem conter imprecisões. Confira as informações importantes.',
  },
  text: {
    'welcome.heading': 'Olá! Como o Sebrae pode ajudar o seu negócio hoje?',
    'welcome.subheading': 'Pergunte sobre cursos, MEI, crédito, gestão e muito mais.',
    'input.placeholder': 'Digite a sua pergunta',
    'input.messageInput.aria': 'Mensagem',
    'input.send.aria': 'Enviar mensagem',
    'input.aiChatIcon.tooltip': 'Pergunte à IA',
    'input.mic.aria': 'Entrada por voz',
    'card.aria.select': 'Selecionar exemplo',
    'carousel.prev.aria': 'Cards anteriores',
    'carousel.next.aria': 'Próximos cards',
    'scroll.bottom.aria': 'Ir para o fim da conversa',
    'error.network': 'Desculpe, não consegui me conectar aos nossos serviços agora. Tente novamente em instantes.',
    'error.general': 'Desculpe, algo deu errado. Tente novamente.',
    'loading.message': 'Buscando a melhor resposta para você',
    'feedback.dialog.title.positive': 'Obrigado pelo retorno',
    'feedback.dialog.title.negative': 'Obrigado pelo retorno',
    'feedback.dialog.question.positive': 'O que foi bom? Marque todas as opções que se aplicam.',
    'feedback.dialog.question.negative': 'O que não foi bom? Marque todas as opções que se aplicam.',
    'feedback.dialog.notes': 'Comentários',
    'feedback.dialog.submit': 'Enviar',
    'feedback.dialog.cancel': 'Cancelar',
    'feedback.dialog.notes.placeholder': 'Comentários adicionais (opcional)',
    'feedback.toast.success': 'Obrigado pelo retorno!',
    'feedback.thumbsUp.aria': 'Gostei',
    'feedback.thumbsDown.aria': 'Não gostei',
  },
  arrays: {
    'welcome.examples': [
      { text: 'Quero abrir meu MEI. Por onde começo?', backgroundColor: '#E7F79E' },
      { text: 'Quais cursos gratuitos de finanças vocês têm?', backgroundColor: '#CAF8DB' },
      { text: 'Como posso vender mais pela internet?', backgroundColor: '#E3E9FF' },
    ],
    'feedback.positive.options': [
      'Recomendações úteis e relevantes',
      'Claro e fácil de entender',
      'Tom amigável',
      'Boa apresentação visual',
      'Outro',
    ],
    'feedback.negative.options': [
      'Pouco útil ou irrelevante',
      'Confuso ou pouco claro',
      'Muito formal ou robótico',
      'Apresentação visual ruim',
      'Outro',
    ],
  },
  theme: {
    '--color-primary': '#2A4FDA',
    '--color-primary-hover': '#1E3CB0',
    '--color-button-primary': '#2A4FDA',
    '--color-accent': '#1B244B',
    '--color-button-submit': '#2A4FDA',
    '--color-button-submit-hover': '#1E3CB0',
    '--color-message-user': '#2A4FDA',
    '--font-family': "figtree, 'Helvetica Neue', Helvetica, Arial, sans-serif",
    '--main-container-background': '#FFFFFF',
    '--submit-button-fill-color': 'white',
    '--message-concierge-link-decoration': 'underline',
    '--message-max-width': '100%',
  },
};
