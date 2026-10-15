/*
 * pt-BR labels for the logged-in area drop-ins (auth, account, checkout, order).
 * Partial dictionaries: the drop-ins deep-merge them over their en_US defaults, so keys
 * that are not used by the Sebrae store (B2B, returns, gift options) are left out.
 */

const FORM_TEXT = {
  requiredFieldError: 'Campo obrigatório.',
  numericError: 'Use apenas números.',
  alphaNumWithSpacesError: 'Use apenas letras, números e espaços.',
  alphaNumericError: 'Use apenas letras e números.',
  alphaError: 'Use apenas letras.',
  emailError: 'Informe um e-mail válido.',
  dateError: 'Informe uma data válida.',
  dateLengthError: 'A data deve estar entre {min} e {max}.',
  dateMaxError: 'A data deve ser menor ou igual a {max}.',
  dateMinError: 'A data deve ser maior ou igual a {min}.',
  urlError: 'Informe uma URL válida, por exemplo https://www.sebrae.com.br.',
  lengthTextError: 'O texto deve ter entre {min} e {max} caracteres.',
};

const PASSWORD_RULES = {
  chartTwoSymbols: 'Use letras e números ou símbolos',
  chartThreeSymbols: 'Use letras, números e símbolos',
  chartFourSymbols: 'Use letras maiúsculas, minúsculas, números e símbolos',
  messageLengthPassword: 'No mínimo {minLength} caracteres',
};

// shared UI components (password field, alerts, modal...) — part of every drop-in dictionary
const DROPIN = {
  InputPassword: {
    placeholder: 'Senha',
    floatingLabel: 'Senha',
    buttonShowTitle: 'Mostrar senha',
    buttonHideTitle: 'Ocultar senha',
  },
  PasswordStatusIndicator: {
    ...PASSWORD_RULES,
    iconPendingAlt: 'Pendente',
    iconSuccessAlt: 'Requisito atendido',
    iconErrorAlt: 'Requisito não atendido',
  },
  Input: { errorIconAriaLabel: 'Campo com erro', successIconAriaLabel: 'Campo válido' },
  InputDate: { picker: 'Escolha uma data' },
  InlineAlert: { dismissLabel: 'Fechar aviso' },
  Modal: { Close: { label: 'Fechar' } },
  Accordion: { open: { label: 'Abrir' }, close: { label: 'Fechar' } },
  ProgressSpinner: { updating: { label: 'Atualizando item' }, updatingChildren: { label: 'Atualizando itens' } },
  PriceSummary: {
    subTotal: { label: 'Subtotal', withTaxes: 'com impostos', withoutTaxes: 'sem impostos' },
    shipping: {
      label: 'Frete', estimated: 'Frete estimado', withTaxes: 'com impostos', withoutTaxes: 'sem impostos',
    },
    taxes: { total: 'Impostos', totalOnly: 'Impostos', estimated: 'Impostos estimados' },
    total: { estimated: 'Total estimado', label: 'Total', withoutTax: 'Total sem impostos' },
  },
};

const ADDRESS_VALIDATION = {
  title: 'Confirme o seu endereço',
  subtitle: 'Sugerimos os ajustes destacados abaixo. Escolha o endereço que deseja usar ou edite-o.',
  suggestedAddress: 'Endereço sugerido',
  originalAddress: 'Endereço informado',
};

const ADDRESS_CARD = {
  actionRemove: 'Remover',
  actionEdit: 'Editar',
  cardLabelShipping: 'Entrega',
  cardLabelBilling: 'Cobrança',
  cardLabelDefaultShipping: 'Entrega padrão',
  cardLabelDefaultBilling: 'Cobrança padrão',
  defaultLabelText: 'PADRÃO',
  ariaLabel: {
    editButton: {
      default: 'Editar endereço',
      shipping: 'Editar endereço de entrega padrão',
      billing: 'Editar endereço de cobrança padrão',
      shippingAndBilling: 'Editar endereço padrão de entrega e cobrança',
    },
    removeButton: {
      default: 'Remover endereço',
      shipping: 'Remover endereço de entrega padrão',
      billing: 'Remover endereço de cobrança padrão',
      shippingAndBilling: 'Remover endereço padrão de entrega e cobrança',
    },
  },
};

const REMOVE_ADDRESS = {
  title: 'Remover endereço',
  description: 'Tem certeza de que deseja remover este endereço?',
  actionCancel: 'Cancelar',
  actionConfirm: 'Remover',
};

const ORDERS_CARD = {
  orderNumber: 'Pedido nº',
  itemsAmount: 'itens',
  carrier: 'Transportadora:',
  returns: 'Devolução(ões):',
  orderDate: 'Feito em',
  placedByAdministrator: 'Feito por um administrador',
};

const ORDERS_DATE = {
  pastSixMonths: 'Últimos 6 meses',
  currentYear: 'Este ano',
  viewAll: 'Todos',
};

const EMPTY_LIST = {
  Addresses: { message: 'Nenhum endereço salvo' },
  OrdersList: { message: 'Você ainda não tem pedidos' },
  Payments: { message: 'Nenhuma forma de pagamento salva' },
};

export const AUTH_LABELS = {
  Dropin: DROPIN,
  Auth: {
    Button: { loadingLabel: 'Carregando' },
    PasswordValidationMessage: PASSWORD_RULES,
    ResetPasswordForm: {
      title: 'Recuperar senha',
      buttonPrimary: 'Enviar link',
      buttonSecondary: 'Voltar para o login',
      formAriaLabel: 'Formulário de recuperação de senha',
    },
    SignInForm: {
      title: 'Entrar',
      buttonPrimary: 'Entrar',
      buttonSecondary: 'Criar conta',
      buttonTertiary: 'Esqueceu a senha?',
    },
    SignUpForm: {
      title: 'Criar conta',
      buttonPrimary: 'Criar conta',
      buttonSecondary: 'Já tem conta? Entrar',
      keepMeLoggedText: 'Manter conectado depois de criar a conta',
      failedCreateCustomerAddress: 'Não foi possível salvar os endereços:',
      shoppingAssistanceCheckboxTitle: 'Permitir atendimento remoto',
      shoppingAssistanceCheckboxTooltip: 'Permite que a equipe do Sebrae veja o que você vê e ajude você durante a inscrição.',
      confirmPassword: {
        placeholder: 'Confirme a senha',
        floatingLabel: 'Confirme a senha *',
        passwordMismatch: 'As senhas não conferem. Digite a mesma senha nos dois campos.',
      },
    },
    UpdatePasswordForm: {
      title: 'Nova senha',
      buttonPrimary: 'Salvar nova senha',
    },
    FormText: FORM_TEXT,
    EmailConfirmationForm: {
      title: 'Confirme o seu e-mail',
      subtitle: 'Enviamos um e-mail para',
      mainText: 'Abra a sua caixa de entrada e clique no link que enviamos para confirmar o e-mail e ativar a sua conta.',
      buttonSecondary: 'Reenviar e-mail',
      buttonPrimary: 'Fechar',
      accountConfirmMessage: 'Conta confirmada',
      accountConfirmationEmailSuccessMessage: 'Pronto! A conta do e-mail {email} foi confirmada.',
    },
    Notification: {
      errorNotification: 'Não foi possível atualizar a senha. Confira os dados e tente novamente.',
      updatePasswordMessage: 'Sua senha foi atualizada.',
      updatePasswordActionMessage: 'Entrar',
      successPasswordResetEmailNotification: 'Se existir uma conta com o e-mail {email}, você vai receber um link para criar uma nova senha.',
      resendEmailNotification: {
        informationText: 'Esta conta ainda não foi confirmada.',
        buttonText: 'Reenviar e-mail de confirmação',
      },
      emailConfirmationMessage: 'Confira o seu e-mail para acessar o link de confirmação.',
      technicalErrors: {
        technicalErrorSendEmail: 'Não foi possível enviar o e-mail agora. Tente novamente mais tarde.',
      },
    },
    SuccessNotification: {
      headingText: 'Boas-vindas!',
      messageText: 'Que bom ter você aqui!',
      primaryButtonText: 'Ver cursos',
      secondaryButtonText: 'Sair',
    },
    Api: {
      customerTokenErrorMessage: 'Não foi possível entrar. Tente novamente mais tarde.',
    },
    InputPassword: {
      placeholder: 'Senha',
      floatingLabel: 'Senha *',
    },
  },
};

export const ACCOUNT_LABELS = {
  Dropin: DROPIN,
  Account: {
    minifiedView: {
      CustomerInformation: {
        containerTitle: 'Meus dados',
        genderMale: 'Masculino',
        genderFemale: 'Feminino',
        changePassword: {
          passwordValidationMessage: {
            ...PASSWORD_RULES,
            passwordMismatch: 'As senhas não conferem. Digite a mesma senha nos dois campos.',
            incorrectCurrentPassword: 'A senha atual está incorreta. Confira e tente novamente.',
            passwordUpdateMessage: 'Sua senha foi atualizada',
          },
          containerTitle: 'Alterar senha',
          currentPassword: { placeholder: 'Senha atual', floatingLabel: 'Senha atual' },
          newPassword: { placeholder: 'Nova senha', floatingLabel: 'Nova senha' },
          confirmPassword: { placeholder: 'Confirme a nova senha', floatingLabel: 'Confirme a nova senha' },
          buttonSecondary: 'Cancelar',
          buttonPrimary: 'Salvar',
        },
        customerInformationCard: {
          buttonSecondary: 'Alterar senha',
          buttonSecondaryAriaLabel: 'Alterar a senha da conta',
          buttonPrimary: 'Editar',
          buttonPrimaryAriaLabel: 'Editar meus dados',
          accountCreation: 'Cliente desde',
        },
        editCustomerInformation: {
          containerTitle: 'Editar dados',
          buttonSecondary: 'Cancelar',
          buttonPrimary: 'Salvar',
          accountSuccess: 'Seus dados foram atualizados.',
          accountError: 'Não foi possível atualizar os seus dados.',
          passwordField: { placeholder: 'Senha', floatingLabel: 'Senha' },
        },
      },
      Addresses: {
        containerTitle: 'Endereços',
        editAddressFormTitle: 'Editar endereço',
        differentAddressFormTitle: 'Usar outro endereço',
        viewAllAddressesButton: 'Ver todos os endereços',
        differentAddressButton: 'Usar outro endereço',
        ariaLabelAddressPicker: 'formulário',
        addressCard: ADDRESS_CARD,
        removeAddressModal: REMOVE_ADDRESS,
      },
      OrdersList: {
        containerTitle: 'Pedidos recentes',
        viewAllOrdersButton: 'Ver todos os pedidos',
        ariaLabelLink: 'Ver os detalhes do pedido',
        dateOrderPlaced: 'Data do pedido',
        OrdersListCard: ORDERS_CARD,
        OrdersListSelectDate: ORDERS_DATE,
      },
      EmptyList: EMPTY_LIST,
    },
    fullSizeView: {
      Addresses: {
        containerTitle: 'Endereços',
        editAddressFormTitle: 'Editar endereço',
        differentAddressFormTitle: 'Usar outro endereço',
        newAddressFormTitle: 'Novo endereço',
        addNewAddressButton: 'Adicionar',
        differentAddressButton: 'Usar outro endereço',
        ariaLabelAddressPicker: 'formulário',
        addressCard: ADDRESS_CARD,
        removeAddressModal: REMOVE_ADDRESS,
      },
      OrdersList: {
        containerTitle: 'Meus pedidos',
        ariaLabelLink: 'Ver os detalhes do pedido',
        dateOrderPlaced: 'Data do pedido',
        OrdersListCard: ORDERS_CARD,
        OrdersListSelectDate: ORDERS_DATE,
        OrdersListSearch: {
          label: 'Buscar por número do pedido ou nome do curso',
          placeholder: 'Buscar pedidos',
          action: 'Buscar pedidos',
          minimumLength: 'Digite pelo menos 3 caracteres.',
          error: 'Não foi possível carregar os seus pedidos. Tente novamente.',
          clear: 'Limpar busca',
        },
      },
      EmptyList: EMPTY_LIST,
    },
    AddressForm: {
      formText: {
        secondaryButton: 'Cancelar',
        primaryButton: 'Salvar',
        defaultShippingLabel: 'Usar como endereço de entrega padrão',
        defaultBillingLabel: 'Usar como endereço de cobrança padrão',
        saveAddressBook: 'Salvar nos meus endereços',
      },
      fields: {
        street: { label: 'Endereço', placeholder: 'Rua, avenida...' },
        street_multiline_2: { label: 'Número e complemento', placeholder: 'Número, apto, bloco...' },
      },
    },
    FormText: FORM_TEXT,
    AddressValidation: ADDRESS_VALIDATION,
    OrdersList: { loading: 'Carregando pedidos', loaded: 'Pedidos carregados' },
    Addresses: { loading: 'Carregando endereços', loaded: 'Endereços carregados' },
  },
};

export const CHECKOUT_LABELS = {
  Dropin: DROPIN,
  Checkout: {
    title: 'Finalizar inscrição',
    AddressValidation: ADDRESS_VALIDATION,
    BillToShippingAddress: {
      cartSyncError: 'Não foi possível salvar as alterações. Tente novamente.',
      title: 'Usar o mesmo endereço para cobrança',
    },
    EmptyCart: { button: 'Ver cursos', title: 'Seu carrinho está vazio' },
    EstimateShipping: {
      estimated: 'Frete estimado',
      freeShipping: 'Grátis',
      label: 'Frete',
      taxToBeDetermined: 'A calcular',
      withoutTaxes: 'Sem impostos',
      withTaxes: 'Com impostos',
    },
    LoginForm: {
      account: 'Já tem conta?',
      ariaLabel: 'E-mail',
      emailExists: {
        alreadyHaveAccount: 'Parece que você já tem uma conta.',
        forFasterCheckout: 'para concluir mais rápido.',
        signInButton: 'Entre',
      },
      floatingLabel: 'E-mail *',
      invalidEmailError: 'Informe um e-mail válido.',
      missingEmailError: 'Informe o seu e-mail.',
      cartSyncError: 'Não foi possível salvar as alterações. Tente novamente.',
      placeholder: 'Digite o seu e-mail',
      signIn: 'Entrar',
      signOut: 'Sair',
      switch: 'Quer usar outra conta?',
      title: 'Seus dados',
    },
    MergedCartBanner: {
      items: {
        many: '{{count}} itens de uma visita anterior foram adicionados ao seu carrinho. Confira o novo subtotal.',
        one: '1 item de uma visita anterior foi adicionado ao seu carrinho. Confira o novo subtotal.',
      },
    },
    OutOfStock: {
      actions: { removeOutOfStock: 'Remover itens indisponíveis', reviewCart: 'Revisar carrinho' },
      alert: 'Indisponível!',
      lowInventory: { many: 'Restam apenas {{count}} vagas!', one: 'Última vaga!' },
      message: 'Os itens abaixo estão indisponíveis:',
      title: 'Seu carrinho tem itens indisponíveis',
    },
    PaymentMethods: {
      cartSyncError: 'Não foi possível salvar as alterações. Tente novamente.',
      emptyState: 'Nenhuma forma de pagamento disponível',
      title: 'Pagamento',
    },
    PlaceOrder: { button: 'Confirmar inscrição' },
    ServerError: {
      button: 'Tentar novamente',
      contactSupport: 'Se o problema continuar, fale com o Sebrae.',
      title: 'Não foi possível concluir o seu pedido',
      unexpected: 'Ocorreu um erro inesperado ao processar o pedido. Tente novamente mais tarde.',
      permissionDenied: 'Você não tem permissão para concluir este pedido.',
    },
    ShippingMethods: {
      accessibleOptionLabel: 'Opção de entrega',
      cartSyncError: 'Não foi possível salvar as alterações. Tente novamente.',
      emptyState: 'Não há entrega disponível para este endereço. Confira os dados informados.',
      title: 'Entrega',
    },
    Summary: { Edit: 'Editar', heading: 'Seu carrinho ({count})' },
    Addresses: {
      billToNewAddress: 'Novo endereço de cobrança',
      shippingAddressTitle: 'Endereço de entrega',
      billingAddressTitle: 'Endereço de cobrança',
    },
  },
};

const ORDER_STATUS = (title, message, messageWithoutDate = message) => ({
  title, message, messageWithoutDate,
});
const PROCESSING = 'Seu pedido foi recebido em {DATE} e está em processamento.';

export const ORDER_LABELS = {
  Dropin: DROPIN,
  Order: {
    OrderCostSummary: {
      headerText: 'Resumo do pedido',
      totalFree: 'Grátis',
      subtotal: { title: 'Subtotal' },
      shipping: { title: 'Frete', freeShipping: 'Frete grátis' },
      tax: {
        accordionTitle: 'Impostos',
        accordionTotalTax: 'Total de impostos',
        totalExcludingTaxes: 'Total sem impostos',
        title: 'Impostos',
        incl: 'Com impostos',
        excl: 'Sem impostos',
      },
      discount: { title: 'Desconto', subtitle: 'com desconto' },
      total: { title: 'Total' },
    },
    OrderProductListContent: {
      cancelledTitle: 'Cancelados',
      allOrdersTitle: 'Seus cursos',
      returnedTitle: 'Devolvidos',
      refundedTitle: 'Reembolsados',
      downloadableCount: 'Arquivos',
      stockStatus: { inStock: 'Disponível', outOfStock: 'Indisponível' },
    },
    OrderSearchForm: {
      title: 'Informe os dados para ver o pedido',
      description: 'O número do pedido está no e-mail de confirmação.',
      button: 'Ver pedido',
      email: 'E-mail',
      lastname: 'Sobrenome',
      orderNumber: 'Número do pedido',
    },
    Form: { notifications: { requiredFieldError: 'Campo obrigatório.' } },
    ShippingStatusCard: {
      orderNumber: 'Pedido nº',
      shipmentNumber: 'Envio nº',
      itemText: { none: '', one: 'Conteúdo ({{count}} item)', many: 'Conteúdo ({{count}} itens)' },
      trackButton: 'Rastrear',
      carrier: 'Transportadora:',
      prepositionOf: 'de',
      shippingCardTitle: 'Detalhes do envio',
      shippingInfoTitle: 'Informações de entrega',
      notYetShippedTitle: 'Ainda não enviado',
      notYetShippedImagesTitle: { singular: 'Conteúdo ({{count}} item)', plural: 'Conteúdo ({{count}} itens)' },
    },
    OrderStatusContent: {
      noInfoTitle: 'Volte mais tarde para ver mais detalhes.',
      adminAssistedLabel: 'Pedido feito por um administrador',
      actions: { cancel: 'Cancelar pedido', reorder: 'Pedir novamente' },
      orderPlaceholder: ORDER_STATUS('', 'Seu pedido está neste status desde {DATE}.', 'Seu pedido está neste status há algum tempo.'),
      orderPending: ORDER_STATUS('Pendente', PROCESSING, 'Seu pedido está em processamento.'),
      orderProcessing: ORDER_STATUS('Em processamento', PROCESSING, 'Seu pedido está em processamento.'),
      orderOnHold: ORDER_STATUS('Em espera', 'Houve um problema ao processar o seu pedido em {DATE}. Fale com o Sebrae para mais informações.', 'Houve um problema ao processar o seu pedido. Fale com o Sebrae para mais informações.'),
      orderReceived: ORDER_STATUS('Pedido recebido', PROCESSING, 'Seu pedido está em processamento.'),
      orderComplete: ORDER_STATUS('Concluído', 'Seu pedido foi concluído.'),
      orderCanceled: ORDER_STATUS('Cancelado', 'Este pedido foi cancelado.'),
      orderSuspectedFraud: ORDER_STATUS('Em análise', 'Seu pedido está em análise desde {DATE}. Fale com o Sebrae para mais informações.', 'Seu pedido está em análise. Fale com o Sebrae para mais informações.'),
      orderPaymentReview: ORDER_STATUS('Em análise', PROCESSING, 'Seu pedido está em processamento.'),
      orderPendingPayment: ORDER_STATUS('Aguardando pagamento', 'Seu pedido foi feito em {DATE} e aguarda pagamento.', 'Seu pedido aguarda pagamento.'),
      orderRejected: ORDER_STATUS('Recusado', 'Seu pedido foi recusado em {DATE}. Fale com o Sebrae para mais informações.', 'Seu pedido foi recusado. Fale com o Sebrae para mais informações.'),
      orderAuthorized: ORDER_STATUS('Autorizado', 'Seu pedido foi autorizado em {DATE}.', 'Seu pedido foi autorizado.'),
      orderClosed: ORDER_STATUS('Encerrado', 'O pedido feito em {DATE} foi encerrado.', 'Seu pedido foi encerrado.'),
    },
    CustomerDetails: {
      headerText: 'Dados do cliente',
      freeShipping: 'Frete grátis',
      email: { title: 'Contato' },
      shippingAddress: { title: 'Endereço de entrega' },
      shippingMethods: { title: 'Forma de entrega' },
      billingAddress: { title: 'Endereço de cobrança' },
      paymentMethods: { title: 'Forma de pagamento' },
    },
    Errors: {
      invalidOrder: 'Pedido inválido. Tente novamente.',
      invalidSearch: 'Nenhum pedido encontrado com esses dados.',
    },
    OrderCancel: { buttonText: 'Cancelar pedido' },
    OrderHeader: {
      title: '{{name}}, sua inscrição foi confirmada!',
      defaultTitle: 'Sua inscrição foi confirmada!',
      order: 'PEDIDO Nº {{order}}',
      CreateAccount: {
        message: 'Salve os seus dados para a próxima inscrição.',
        button: 'Criar conta',
      },
    },
  },
};
