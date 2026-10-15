// Dados fictícios das telas de Minha loja (T26 a T32). Nada aqui é dado real.

// Ordem da semana na tela: segunda a domingo
export const DIAS_SEMANA = [
  { id: 'seg', nome: 'Segunda-feira' },
  { id: 'ter', nome: 'Terça-feira' },
  { id: 'qua', nome: 'Quarta-feira' },
  { id: 'qui', nome: 'Quinta-feira' },
  { id: 'sex', nome: 'Sexta-feira' },
  { id: 'sab', nome: 'Sábado' },
  { id: 'dom', nome: 'Domingo' },
]

const semana = (inicio, fim) => DIAS_SEMANA.map((d) => ({ dia: d.id, aberto: true, faixas: [{ inicio, fim }] }))

// ---------- T26. Funcionamento ----------
export function funcionamentoInicial(cenarioId, loja) {
  let horario
  if (cenarioId === 'rede') horario = loja?.fechadaProgramada ? semana('11:00', '15:00') : semana('18:00', '23:30')
  else horario = semana('11:00', '22:00')

  const excecoes = cenarioId === 'nova' ? [] : [
    { id: 'ex-natal', inicio: new Date(2026, 11, 24, 18, 0), fim: new Date(2026, 11, 25, 23, 59), diaTodo: false },
  ]
  const feriados = [
    { id: 'f-1210', data: new Date(2026, 9, 12), nome: 'Nossa Senhora Aparecida', acao: 'normal' },
    { id: 'f-0211', data: new Date(2026, 10, 2), nome: 'Finados', acao: cenarioId === 'rede' ? 'especial' : 'normal', faixa: { inicio: '18:00', fim: '22:00' } },
    { id: 'f-1511', data: new Date(2026, 10, 15), nome: 'Proclamação da República', acao: 'normal' },
    { id: 'f-2011', data: new Date(2026, 10, 20), nome: 'Dia da Consciência Negra', acao: 'normal' },
    { id: 'f-2512', data: new Date(2026, 11, 25), nome: 'Natal', acao: 'fechado' },
    { id: 'f-0101', data: new Date(2027, 0, 1), nome: 'Confraternização Universal', acao: 'fechado' },
  ].map((f) => ({ faixa: { inicio: '11:00', fim: '18:00' }, ...f }))

  return { delivery: horario, balcaoIgual: true, balcao: horario.map((d) => ({ ...d, faixas: d.faixas.map((f) => ({ ...f })) })), excecoes, feriados }
}

// ---------- T27. Entrega ----------
export function entregaInicial(cenarioId) {
  if (cenarioId === 'nova') {
    return { patamares: [], freteGratis: { ativo: false, pedidoMinimo: '', raio: '' }, pedidoMinimo: '' }
  }
  if (cenarioId === 'rede') {
    return {
      patamares: [
        { id: 'pt1', ate: '3', taxa: '6,00', tempo: '35' },
        { id: 'pt2', ate: '5', taxa: '9,00', tempo: '45' },
        { id: 'pt3', ate: '7', taxa: '12,00', tempo: '55' },
      ],
      freteGratis: { ativo: true, pedidoMinimo: '120,00', raio: '3' },
      pedidoMinimo: '40,00',
    }
  }
  return {
    patamares: [
      { id: 'pt1', ate: '2', taxa: '5,00', tempo: '30' },
      { id: 'pt2', ate: '4', taxa: '8,00', tempo: '40' },
    ],
    freteGratis: { ativo: true, pedidoMinimo: '80,00', raio: '2' },
    pedidoMinimo: '20,00',
  }
}

// Coordenadas fictícias plausíveis: a pastelaria no Taquaral e cada loja da rede
// num ponto da própria cidade, derivado do id (sempre o mesmo para a mesma loja)
const CENTRO_CIDADE = {
  'São Paulo': [-23.5505, -46.6333],
  'Santo André': [-23.6639, -46.5383],
  Campinas: [-22.9056, -47.0608],
  Sorocaba: [-23.5015, -47.4526],
}
const COORDENADAS_FIXAS = { 1001: [-22.8783, -47.0476], 2102: [-23.564, -46.652] }

export function coordenadasDaLoja(loja) {
  if (!loja) return CENTRO_CIDADE['São Paulo']
  if (COORDENADAS_FIXAS[loja.id]) return COORDENADAS_FIXAS[loja.id]
  const [lat, lng] = CENTRO_CIDADE[loja.cidade] || CENTRO_CIDADE['São Paulo']
  const dLat = (((loja.id * 37) % 11) - 5) * 0.007
  const dLng = (((loja.id * 53) % 13) - 6) * 0.007
  return [Number((lat + dLat).toFixed(4)), Number((lng + dLng).toFixed(4))]
}

// Estado: conectado | desconectado | em-uso | nao-contratado
export function logisticaDaLoja(cenarioId, dadosLoja) {
  const lalamove = dadosLoja?.integracoes?.find((i) => i.nome.startsWith('Lalamove'))
  const rede = cenarioId === 'rede'
  return [
    { id: 'propria', nome: 'Entrega própria', descricao: 'Seus entregadores', estado: cenarioId === 'nova' ? 'sem-area' : 'em-uso' },
    { id: 'uber', nome: 'Uber Direct', descricao: 'Entregadores parceiros da Uber', estado: 'nao-contratado' },
    { id: 'lalamove', nome: 'Lalamove', descricao: 'Chamada automática de entregador', estado: lalamove ? lalamove.estado : 'nao-contratado', desde: lalamove?.desde },
    { id: 'ifood', nome: 'iFood Entrega', descricao: 'Entregadores do iFood', estado: rede ? 'conectado' : 'nao-contratado' },
    { id: '99', nome: '99 Entrega', descricao: 'Entregadores parceiros da 99', estado: 'nao-contratado' },
  ]
}

// ---------- T28. Modalidades ----------
export function modalidadesIniciais(cenarioId) {
  const rede = cenarioId === 'rede'
  const nova = cenarioId === 'nova'
  return {
    modalidades: [
      {
        id: 'delivery', nome: 'Delivery', ativo: !nova, pedidoMinimo: nova ? '' : rede ? '40,00' : '20,00', pedidoMaximo: rede ? '600,00' : '300,00',
        qtdMaxima: rede ? '20' : '15', texto: rede ? 'Pizzas chegam cortadas em 8 pedaços.' : 'Avise na observação se o prédio tem portaria.',
        // Cooking time: espera antes de chamar a logística integrada
        preparo: rede ? '20' : '15', tempoMin: rede ? '40' : '30', tempoMax: rede ? '55' : '45',
      },
      {
        id: 'levar', nome: 'Quero levar', ativo: true, pedidoMinimo: '', pedidoMaximo: rede ? '600,00' : '300,00',
        qtdMaxima: rede ? '20' : '15', texto: 'Retire no balcão e informe o número do pedido.', tempoMin: rede ? '20' : '15', tempoMax: rede ? '30' : '25',
      },
      {
        id: 'aqui', nome: 'Comer aqui', ativo: rede, pedidoMinimo: '', pedidoMaximo: '',
        qtdMaxima: rede ? '20' : '15', texto: rede ? 'Peça pelo app e aguarde na mesa.' : '', tempoMin: rede ? '20' : '15', tempoMax: rede ? '30' : '25',
      },
    ],
    agendamento: { ativo: rede, dias: rede ? ['sex', 'sab', 'dom'] : [], inicio: '18:00', fim: '22:00', limite: '10' },
    taxaServico: { ativo: false, percentual: '10' },
  }
}

// ---------- T29. Pagamentos ----------
// Bandeiras pertinentes a cada forma de pagamento
const BANDEIRAS_CREDITO = ['Visa', 'Mastercard', 'Elo', 'American Express', 'Hipercard', 'Diners Club']
const BANDEIRAS_DEBITO = ['Visa Débito', 'Maestro', 'Elo Débito']
const BANDEIRAS_VR = ['Alelo Refeição', 'Pluxee Refeição', 'Ticket Restaurante', 'VR Refeição', 'Ben Refeição', 'Caju', 'Flash', 'Swile']
const BANDEIRAS_CARTEIRA = ['Apple Pay', 'Google Pay', 'Samsung Pay']

const forma = (id, nome, ligado, bandeiras, desligadas = [], nota) => ({
  id, nome, ligado, nota, bandeiras: bandeiras?.map((b) => ({ nome: b, ligado: ligado && !desligadas.includes(b) })),
})

// Só as formas habilitadas no contrato aparecem
export function pagamentosIniciais(cenarioId) {
  const nova = cenarioId === 'nova'
  const rede = cenarioId === 'rede'
  const on = !nova
  return {
    online: [
      forma('pix-online', 'Pix online', on, null),
      forma('credito-online', 'Cartão de crédito online', on, BANDEIRAS_CREDITO, ['Diners Club', 'Hipercard']),
      ...(rede ? [forma('carteira-online', 'Carteira digital online', on, BANDEIRAS_CARTEIRA, ['Samsung Pay'])] : []),
    ],
    presencial: [
      forma('dinheiro', 'Dinheiro', on, null, [], 'O cliente informa no pedido para quanto precisa de troco.'),
      forma('credito-entrega', 'Cartão de crédito na entrega ou no balcão', on, BANDEIRAS_CREDITO, ['American Express', 'Diners Club', 'Hipercard']),
      forma('debito-entrega', 'Cartão de débito na entrega ou no balcão', on, BANDEIRAS_DEBITO),
      forma('vr-entrega', 'Vale-refeição na entrega ou no balcão', on, BANDEIRAS_VR, rede ? ['Swile'] : ['Ben Refeição', 'Caju', 'Flash', 'Swile']),
      ...(rede ? [forma('pix-entrega', 'Pix na entrega', on, null, [], 'O entregador mostra o QR code da loja na maquininha.')] : []),
    ],
  }
}

// ---------- T30. Dados da loja ----------
export function dadosCadastroIniciais(cenarioId, loja, cen) {
  const rede = cenarioId === 'rede'
  const [rua, bairro] = (loja?.endereco || '').split(' · ')
  return {
    nomeFantasia: rede ? `${cen.marca.nome} · ${loja?.nome}` : cen.marca.nome,
    telefone: rede ? '(11) 3•••-2210' : '(19) 3•••-4821',
    whatsapp: rede ? '(11) 9••••-5530' : '(19) 9••••-1234',
    responsavel: rede ? 'Marcos Tavernari' : 'Lúcia Fontanella',
    email: rede ? 'ger•••••@fornodepedra.com.br' : 'con•••••@bomrecheio.com.br',
    rua: rua || '',
    bairro: bairro || (rede ? 'Centro' : ''),
    cidade: loja?.cidade || '',
    cep: rede ? '01•••-020' : '13•••-110',
  }
}

// ---------- T31. Integrações ----------
// Categorias que a tela sempre mostra; o que vier de dadosLoja.integracoes tem prioridade
export const CATEGORIAS_INTEGRACAO = [
  { id: 'pagamento', nome: 'Pagamento online', serve: 'Recebe Pix e cartão pelo app e pelo cardápio web', casa: /pagamento/i, pagamento: true },
  { id: 'antifraude', nome: 'Antifraude', serve: 'Analisa pedidos pagos online antes de aprovar', casa: /antifraude/i, pagamento: true },
  { id: 'pdv', nome: 'PDV', serve: 'Leva os pedidos ao sistema do caixa da loja', casa: /pdv/i },
  { id: 'logistica', nome: 'Logística', serve: 'Chama entregador automaticamente', casa: /log[ií]stica|lalamove|uber|99/i },
  { id: 'ifood', nome: 'iFood', serve: 'Recebe aqui os pedidos feitos no iFood', casa: /ifood/i },
  { id: 'crm', nome: 'CRM', serve: 'Envia dados de clientes para campanhas', casa: /crm/i },
]

// Datas de início fictícias para "desde quando"
const DESDE = {
  pagamento: new Date(2025, 2, 12, 10, 0),
  antifraude: new Date(2025, 2, 12, 10, 0),
  pdv: new Date(2024, 7, 5, 9, 30),
  logistica: new Date(2025, 5, 18, 14, 0),
  ifood: new Date(2024, 10, 2, 11, 0),
  crm: new Date(2026, 0, 20, 15, 0),
}

// Motivos de falha de conexão, em linguagem de lojista
export const MOTIVOS_CONEXAO = {
  'sem-internet': {
    texto: (h) => `Sem internet na loja desde ${h}: o computador do PDV não responde`,
    fazer: 'Confira se o roteador e o computador do PDV estão ligados. Os pedidos ficam guardados e entram no PDV quando a conexão voltar.',
  },
  'token-expirado': {
    texto: () => 'Token expirado: a integração precisa ser reautorizada pela implantação',
    fazer: 'Fale com o suporte para a implantação reautorizar. Enquanto isso, chame o entregador pelo app do parceiro.',
  },
  'parceiro-fora': {
    texto: () => 'Serviço do parceiro fora do ar',
    fazer: 'Não depende da loja: a conexão volta sozinha quando o parceiro normalizar. Se passar de 1 hora, fale com o suporte.',
  },
}
// Motivo padrão de uma integração desconectada, por categoria
const MOTIVO_PADRAO = { logistica: 'token-expirado', ifood: 'parceiro-fora', crm: 'token-expirado', pdv: 'sem-internet' }

export function integracoesDaLoja(cenarioId, dadosLoja, loja, estadoLoja) {
  const lista = dadosLoja?.integracoes || []
  const contratadas = {
    pequena: ['pagamento', 'antifraude'],
    nova: [],
    rede: ['pagamento', 'antifraude', 'pdv', 'logistica', 'ifood', 'crm'],
  }[cenarioId] || []
  const emImplantacao = cenarioId === 'nova' ? ['pagamento', 'antifraude'] : []
  const conexao = estadoLoja || loja?.estadoInicial || loja
  const semInternet = conexao?.conexao === 'sem'
  const semInternetDesde = conexao?.semConexaoDesde

  // Loja sem PDV integrado: só as integrações de pagamento
  const categorias = loja?.semPdv ? CATEGORIAS_INTEGRACAO.filter((c) => c.pagamento) : CATEGORIAS_INTEGRACAO
  return categorias.map((c) => {
    const real = lista.find((i) => c.casa.test(i.nome))
    let item
    if (real) item = { ...c, nomeExibido: real.nome, estado: real.estado, desde: real.desde || DESDE[c.id] }
    else if (contratadas.includes(c.id)) item = { ...c, nomeExibido: c.nome, estado: 'conectado', desde: DESDE[c.id] }
    else if (emImplantacao.includes(c.id)) item = { ...c, nomeExibido: c.nome, estado: 'implantacao' }
    else item = { ...c, nomeExibido: c.nome, estado: 'nao-contratado' }

    // A loja sem internet derruba a integração do PDV
    if (c.id === 'pdv' && semInternet && item.estado === 'conectado') {
      item = { ...item, estado: 'desconectado', desde: semInternetDesde, motivo: 'sem-internet' }
    }
    if (item.estado === 'desconectado' && !item.motivo) item.motivo = MOTIVO_PADRAO[c.id] || 'parceiro-fora'
    return item
  })
}

// Motivos de pedido que chegou à VocêQPad e não entrou no PDV
export const MOTIVOS_PEDIDO = {
  'codigo-produto': {
    texto: (f) => `Código do produto não existe no PDV: '${f.produto}' está com o código ${f.codigo}, que o PDV não reconhece`,
    tecnico: (f) => `PDV respondeu 422 · ITEM_NAO_ENCONTRADO · sku=${f.codigo} · pedido=${f.numero}`,
    corrigivel: true, // reenviar sem corrigir falha de novo
  },
  'pagamento-nao-mapeado': {
    texto: (f) => `Forma de pagamento não mapeada no PDV: ${f.forma}`,
    tecnico: (f) => `PDV respondeu 400 · PAYMENT_TYPE_UNKNOWN · tipo="${f.forma}" · pedido=${f.numero}`,
    corrigivel: true,
  },
  'complemento-sem-codigo': {
    texto: (f) => `Complemento sem código: ${f.complemento}`,
    tecnico: (f) => `Validação antes do envio · complemento sem sku_pdv · item="${f.complemento}" · pedido=${f.numero}`,
    corrigivel: true,
  },
  'caixa-fechado': {
    texto: () => 'PDV recusou: caixa fechado',
    tecnico: (f) => `PDV respondeu 409 · CASH_REGISTER_CLOSED · terminal=CX-01 · pedido=${f.numero}`,
    corrigivel: false, // o caixa já abriu; reenviar resolve
  },
}

// Só a Unidade Jardim Alto tem pedidos recusados hoje no protótipo
const FALHAS_PDV = { 2102: ['codigo-produto', 'pagamento-nao-mapeado', 'caixa-fechado'] }

// Escolhe pedidos reais de hoje compatíveis com cada motivo
export function falhasPdvDaLoja(loja, pedidos, cardapio, hoje) {
  const motivos = FALHAS_PDV[loja?.id]
  if (!motivos || loja?.semPdv) return []
  const deHoje = pedidos.filter((p) => hoje(p.criado)).sort((a, b) => a.criado - b.criado)
  const usados = new Set()
  const pegar = (teste) => {
    const p = deHoje.find((x) => !usados.has(x.numero) && teste(x))
    if (p) usados.add(p.numero)
    return p
  }
  const idProduto = (nome) => cardapio?.produtos?.find((x) => x.nome === nome)?.id?.replace('p', '')

  return motivos.map((motivo) => {
    let p
    let extra = {}
    if (motivo === 'codigo-produto') {
      const nome = 'Pizza grande, 2 sabores'
      p = pegar((x) => x.itens.some((i) => i.nome === nome))
      extra = { produto: nome, codigo: 'PDV-4012', produtoId: idProduto(nome) }
    } else if (motivo === 'pagamento-nao-mapeado') {
      p = pegar((x) => x.pagamento.startsWith('Vale-refeição'))
      extra = { forma: 'Vale-refeição' }
    } else if (motivo === 'complemento-sem-codigo') {
      p = pegar((x) => x.itens.some((i) => i.complementos.length))
      const item = p?.itens.find((i) => i.complementos.length)
      extra = { complemento: item?.complementos.at(-1), produtoId: idProduto(item?.nome) }
    } else {
      p = pegar(() => true)
    }
    if (!p) return null
    const f = { id: `${p.numero}-${motivo}`, numero: p.numero, criado: p.criado, motivo, ...extra }
    return { ...f, texto: MOTIVOS_PEDIDO[motivo].texto(f), tecnico: MOTIVOS_PEDIDO[motivo].tecnico(f), estado: 'pendente', tentativas: 1 }
  }).filter(Boolean).sort((a, b) => b.criado - a.criado)
}

// ---------- T32. Rastreamento ----------
export function rastreamentoInicial(cenarioId) {
  if (cenarioId === 'nova') return { gtm: '', pixel: '' }
  if (cenarioId === 'rede') return { gtm: 'GTM-N8F3PZL', pixel: '730194826451937' }
  return { gtm: 'GTM-5KX7Q2M', pixel: '' }
}
