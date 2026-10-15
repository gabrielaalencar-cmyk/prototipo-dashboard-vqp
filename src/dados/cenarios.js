// Cenários do protótipo (seção 10): loja pequena, loja nova e rede.
// Nenhum dado real: nomes, lojas, marcas e números são inventados.
import { cardapioPastelaria, cardapioLojaNova, cardapioPizzaria } from './cardapios.js'
import { pedidosPastelaria, pedidosLojaRede, dataOutubro as d } from './pedidos.js'

// ---------- Cenário A: loja pequena ----------
const PASTELARIA = {
  id: 1001,
  nome: 'Pastelaria Bom Recheio',
  cidade: 'Campinas',
  endereco: 'Rua das Paineiras, 214 · Taquaral',
  semPdv: true,
}

function cenarioLojaPequena() {
  return {
    id: 'pequena',
    nome: 'Loja pequena',
    marca: { nome: 'Pastelaria Bom Recheio', sigla: 'BR', cor: '#E0218A' },
    rede: false,
    lojas: [{ ...PASTELARIA, estadoInicial: { delivery: 'aberto', balcao: 'aberto', conexao: 'ok' } }],
    lojaPadrao: 1001,
    porLoja: {
      1001: {
        pedidos: pedidosPastelaria(),
        cardapio: cardapioPastelaria(),
        abertura: { hora: '11:00', dia: 'amanhã' },
        periodo: {
          'este-mes': {
            rotulo: 'Outubro até o dia 9',
            comparacao: 'setembro no mesmo intervalo',
            mesComparado: 'setembro',
            atual: { faturamento: 586, pedidos: 11, ticket: 53.27, clientes: 9 },
            anterior: { faturamento: 512, pedidos: 9, ticket: 56.89, clientes: 8 },
          },
          'mes-passado': {
            rotulo: 'Setembro',
            comparacao: 'agosto',
            mesComparado: 'agosto',
            atual: { faturamento: 1684, pedidos: 31, ticket: 54.32, clientes: 26 },
            anterior: { faturamento: 1512, pedidos: 28, ticket: 54.0, clientes: 24 },
          },
          '7-dias': {
            rotulo: '3 a 9 de outubro',
            comparacao: 'os 7 dias anteriores',
            mesComparado: 'a semana anterior',
            atual: { faturamento: 586, pedidos: 11, ticket: 53.27, clientes: 9 },
            anterior: { faturamento: 431, pedidos: 8, ticket: 53.88, clientes: 7 },
          },
          '30-dias': {
            rotulo: '10/09 a 09/10',
            comparacao: 'os 30 dias anteriores',
            mesComparado: 'os 30 dias anteriores',
            atual: { faturamento: 1598, pedidos: 30, ticket: 53.27, clientes: 24 },
            anterior: { faturamento: 1570.5, pedidos: 29, ticket: 54.16, clientes: 23 },
          },
        },
        oportunidades: [
          {
            id: 'op-afastando',
            tipo: 'Clientes se afastando',
            texto: '12 clientes sem comprar há mais de 50 dias',
            motivo: 'Leitura do Analítico (Churn), atualizada na virada do mês.',
            acoes: [
              { rotulo: 'Ver quem são', para: '/clientes?segmento=afastando' },
              { rotulo: 'Criar campanha "Sentimos sua falta"', para: '/campanhas/nova?modelo=sentimos' },
            ],
          },
          {
            id: 'op-pontos',
            tipo: 'Fidelidade',
            texto: '3 clientes com pontos vencendo nos próximos 15 dias',
            motivo: 'Leitura do Analítico (Fidelidade).',
            acoes: [{ rotulo: 'Avisar clientes', para: '/campanhas/nova?modelo=pontos' }],
          },
        ],
        clientesBase: 152,
        integracoes: [{ nome: 'Pagamento online', estado: 'conectado' }],
      },
    },
    cupons: [
      { codigo: 'VOLTA10', descricao: '10% de desconto', estado: 'ativo', expira: d(11, 23, 59), usos: 7 },
      { codigo: 'PRIMEIRA', descricao: 'Frete grátis no primeiro pedido', estado: 'ativo', expira: d(31, 23, 59), usos: 3 },
      { codigo: 'FERIAS', descricao: '15% de desconto', estado: 'expirado', expira: d(1, 0, 0), usos: 12 },
    ],
    canais: { push: true, whatsapp: false },
    fidelidade: { tipo: 'pontos' },
  }
}

// ---------- Variação: loja nova ----------
function cenarioLojaNova() {
  return {
    id: 'nova',
    nome: 'Loja nova',
    marca: { nome: 'Pastelaria Bom Recheio', sigla: 'BR', cor: '#E0218A' },
    rede: false,
    lojaNova: true,
    lojas: [{ ...PASTELARIA, estadoInicial: { delivery: 'fechado', balcao: 'aberto', conexao: 'ok' } }],
    lojaPadrao: 1001,
    porLoja: {
      1001: {
        pedidos: [],
        cardapio: cardapioLojaNova(),
        abertura: { hora: '11:00', dia: 'amanhã' },
        periodo: null,
        oportunidades: [],
        clientesBase: 0,
        checklist: [
          { id: 'cardapio', texto: 'Cardápio com ao menos um produto', feito: true, para: '/cardapio' },
          { id: 'horario', texto: 'Horário de funcionamento', feito: true, para: '/minha-loja/funcionamento' },
          { id: 'entrega', texto: 'Área de entrega', feito: false, para: '/minha-loja/entrega', motivo: 'Sem área de entrega o delivery não pode abrir.' },
          { id: 'pagamento', texto: 'Formas de pagamento', feito: false, para: '/minha-loja/pagamentos', motivo: 'Escolha como o cliente paga.' },
        ],
        semAreaEntrega: true,
        integracoes: [],
      },
    },
    cupons: [],
    canais: { push: true, whatsapp: false },
    fidelidade: { tipo: null },
  }
}

// ---------- Cenário B: rede ----------
const LOJAS_REDE = [
  { id: 2101, nome: 'Unidade Centro', cidade: 'São Paulo', endereco: 'Rua Conselheiro Brás, 88', fat: 21400, varPct: 8.2, canc: 1.9, hoje: 24, conexao: 'sem', semConexaoDesde: d(9, 19, 35), base: 21400 },
  { id: 2102, nome: 'Unidade Jardim Alto', cidade: 'São Paulo', endereco: 'Av. Jardim Alto, 1.020', fat: 18920, varPct: 5.1, canc: 2.2, hoje: 22, base: 25100, emAndamento: 5 },
  { id: 2103, nome: 'Unidade Vila Nova', cidade: 'São Paulo', endereco: 'Rua das Laranjeiras, 455', fat: 16750, varPct: 3.4, canc: 4.8, hoje: 21, base: 29200 },
  { id: 2104, nome: 'Unidade Parque das Árvores', cidade: 'São Paulo', endereco: 'Rua dos Jequitibás, 31', fat: 14300, varPct: 9.7, canc: 1.5, hoje: 19, base: 33300 },
  { id: 2105, nome: 'Unidade Bela Aurora', cidade: 'Santo André', endereco: 'Av. Bela Aurora, 702', fat: 13180, varPct: 6.0, canc: 2.0, hoje: 17, base: 37400 },
  { id: 2106, nome: 'Unidade Vila Serena', cidade: 'Santo André', endereco: 'Rua Serena, 140', fat: 9870, varPct: -12.0, canc: 2.9, hoje: 12, base: 31700 },
  { id: 2107, nome: 'Unidade Alto da Colina', cidade: 'Campinas', endereco: 'Rua do Mirante, 66', fat: 12640, varPct: 11.3, canc: 1.7, hoje: 18, base: 41500 },
  { id: 2108, nome: 'Unidade Jardim das Palmeiras', cidade: 'Campinas', endereco: 'Al. das Palmeiras, 1.300', fat: 11020, varPct: 7.4, canc: 2.4, hoje: 15, base: 45600 },
  { id: 2109, nome: 'Unidade Recanto Verde', cidade: 'Campinas', endereco: 'Rua Recanto Verde, 12', fat: 8150, varPct: 4.2, canc: 1.8, hoje: 11, base: 49700 },
  { id: 2110, nome: 'Unidade Porto Claro', cidade: 'Sorocaba', endereco: 'Av. Porto Claro, 980', fat: 10230, varPct: 13.9, canc: 2.1, hoje: 14, base: 35000 },
  { id: 2111, nome: 'Unidade Morro Azul', cidade: 'Sorocaba', endereco: 'Rua Morro Azul, 47', fat: 9020, varPct: 2.6, canc: 2.6, hoje: 8, base: 53800, fechadaProgramada: true },
  { id: 2112, nome: 'Unidade Lagoa Mansa', cidade: 'Sorocaba', endereco: 'Rua da Lagoa, 305', fat: 6900, varPct: 5.5, canc: 1.4, hoje: 5, base: 57900, fechadaProgramada: true },
]

// Loja de teste: existe no cadastro, mas nunca aparece para o lojista
const LOJA_TESTE = { id: 2199, nome: 'Loja Teste Homologação', cidade: 'São Paulo', teste: true }

function dadosLojaRede(l, i) {
  const ticket = 78.87 + ((i % 5) - 2) * 0.6
  const pedidosPeriodo = l.id === 2102 ? 241 : Math.round(l.fat / ticket)
  const anteriorFat = l.fat / (1 + l.varPct / 100)
  const pedidos = pedidosLojaRede({
    semente: l.id * 13,
    baseNumero: l.base,
    mediaDia: pedidosPeriodo / 9,
    hoje: { pedidos: l.hoje, emAndamento: l.emAndamento ?? (l.fechadaProgramada || l.conexao === 'sem' ? 0 : 3) },
    taxaCancelamento: l.canc / 100,
    soAlmocoHoje: l.fechadaProgramada,
  })
  return {
    pedidos,
    cardapio: cardapioPizzaria({ comPausas: l.id === 2102 || i % 3 === 0 }),
    abertura: { hora: l.fechadaProgramada ? '11:00' : '18:00', dia: 'amanhã' },
    periodo: {
      'este-mes': {
        rotulo: 'Outubro até o dia 9',
        comparacao: 'setembro no mesmo intervalo',
        mesComparado: 'setembro',
        atual: { faturamento: l.fat, pedidos: pedidosPeriodo, ticket: l.fat / pedidosPeriodo, clientes: Math.round(pedidosPeriodo * 0.82) },
        anterior: { faturamento: anteriorFat, pedidos: Math.round(pedidosPeriodo / (1 + l.varPct / 130)), ticket: (anteriorFat / pedidosPeriodo) * 1.01, clientes: Math.round(pedidosPeriodo * 0.8) },
      },
      'mes-passado': {
        rotulo: 'Setembro',
        comparacao: 'agosto',
        mesComparado: 'agosto',
        atual: { faturamento: anteriorFat * 3.25, pedidos: Math.round(pedidosPeriodo * 3.2), ticket: 77.9, clientes: Math.round(pedidosPeriodo * 2.3) },
        anterior: { faturamento: anteriorFat * 3.1, pedidos: Math.round(pedidosPeriodo * 3.08), ticket: 77.2, clientes: Math.round(pedidosPeriodo * 2.2) },
      },
      '7-dias': {
        rotulo: '3 a 9 de outubro',
        comparacao: 'os 7 dias anteriores',
        mesComparado: 'a semana anterior',
        atual: { faturamento: l.fat * 0.79, pedidos: Math.round(pedidosPeriodo * 0.79), ticket: l.fat / pedidosPeriodo, clientes: Math.round(pedidosPeriodo * 0.68) },
        anterior: { faturamento: l.fat * 0.74, pedidos: Math.round(pedidosPeriodo * 0.75), ticket: (l.fat / pedidosPeriodo) * 0.99, clientes: Math.round(pedidosPeriodo * 0.65) },
      },
      '30-dias': {
        rotulo: '10/09 a 09/10',
        comparacao: 'os 30 dias anteriores',
        mesComparado: 'os 30 dias anteriores',
        atual: { faturamento: l.fat * 3.3, pedidos: Math.round(pedidosPeriodo * 3.3), ticket: l.fat / pedidosPeriodo, clientes: Math.round(pedidosPeriodo * 2.4) },
        anterior: { faturamento: l.fat * 3.15, pedidos: Math.round(pedidosPeriodo * 3.18), ticket: (l.fat / pedidosPeriodo) * 0.98, clientes: Math.round(pedidosPeriodo * 2.3) },
      },
    },
    oportunidades: [
      {
        id: 'op-afastando',
        tipo: 'Clientes se afastando',
        texto: `${Math.round(420 * (l.fat / 152380))} clientes sem comprar há mais de 50 dias`,
        motivo: 'Leitura do Analítico (Churn), atualizada na virada do mês.',
        acoes: [
          { rotulo: 'Ver quem são', para: '/clientes?segmento=afastando' },
          { rotulo: 'Criar campanha "Sentimos sua falta"', para: '/campanhas/nova?modelo=sentimos' },
        ],
      },
    ],
    clientesBase: Math.round(pedidosPeriodo * 7.4),
    integracoes: [
      { nome: 'PDV', estado: 'conectado' },
      { nome: 'Lalamove (logística)', estado: l.id === 2102 ? 'desconectado' : 'conectado', desde: l.id === 2102 ? d(9, 16, 5) : null },
      { nome: 'iFood', estado: 'conectado' },
    ],
  }
}

function cenarioRede() {
  const porLoja = {}
  LOJAS_REDE.forEach((l, i) => {
    porLoja[l.id] = dadosLojaRede(l, i)
  })

  // Pedido parado na Vila Serena e avaliações ruins de hoje (Vila Nova e Porto Claro)
  const serena = porLoja[2106].pedidos.find((p) => p.grupo === 'andamento' && p.status === 'Em preparo') ||
    porLoja[2106].pedidos.find((p) => p.grupo === 'andamento')
  if (serena) {
    serena.grupo = 'atencao'
    serena.parado = { minutos: 24, etapa: serena.status }
  }
  const avaliar = (lojaId, nota, comentario, h, m, pos) => {
    const hoje = porLoja[lojaId].pedidos.filter((p) => p.criado.getDate() === 9 && p.grupo === 'concluido')
    const ped = hoje[pos] || hoje[0]
    ped.avaliacao = { nota, comentario, quando: d(9, h, m) }
    return ped
  }
  const av1 = avaliar(2103, 1, 'A pizza veio errada e fria.', 19, 12, 0)
  const av2 = avaliar(2103, 2, 'Demorou mais de uma hora para chegar.', 14, 40, 3)
  const av3 = avaliar(2110, 2, 'A borda veio queimada.', 13, 25, 1)

  return {
    id: 'rede',
    nome: 'Rede',
    marca: { nome: 'Forno de Pedra Pizzaria', sigla: 'FP', cor: '#1F4E5F' },
    rede: true,
    lojas: [
      ...LOJAS_REDE.map((l) => ({
        id: l.id,
        nome: l.nome,
        cidade: l.cidade,
        endereco: l.endereco,
        fechadaProgramada: l.fechadaProgramada,
        resumo: { fat: l.fat, varPct: l.varPct, canc: l.canc, hoje: l.hoje },
        estadoInicial: {
          delivery: l.fechadaProgramada ? 'fechado' : 'aberto',
          balcao: l.fechadaProgramada ? 'fechado' : 'aberto',
          conexao: l.conexao || 'ok',
          semConexaoDesde: l.semConexaoDesde,
        },
      })),
      LOJA_TESTE,
    ],
    lojaPadrao: 2102,
    lojaGerente: 2102,
    lojaFranquia: 2103,
    recentes: [2102, 2103, 2101, 2106, 2110],
    porLoja,
    alertasExtras: {
      parado: serena ? { lojaId: 2106, pedido: serena } : null,
      avaliacoes: [
        { lojaId: 2103, pedido: av1 },
        { lojaId: 2103, pedido: av2 },
        { lojaId: 2110, pedido: av3 },
      ],
    },
    resumoRede: {
      periodo: { faturamento: 152380, varPct: 6.8, pedidos: 1932, varPedidos: 4.1, ticket: 78.87, clientes: 1508 },
      afastando: 420,
    },
    cupons: [
      { codigo: 'PIZZA20', descricao: '20% na segunda pizza', estado: 'ativo', expira: d(12, 23, 59), usos: 214, lojas: 'Todas' },
      { codigo: 'BORDAGRATIS', descricao: 'Borda grátis acima de R$ 90,00', estado: 'ativo', expira: d(31, 23, 59), usos: 96, lojas: '8 lojas' },
    ],
    canais: { push: true, whatsapp: true },
    fidelidade: { tipo: 'cashback' },
  }
}

export const CENARIOS = {
  pequena: { nome: 'Loja pequena', criar: cenarioLojaPequena },
  nova: { nome: 'Loja nova', criar: cenarioLojaNova },
  rede: { nome: 'Rede', criar: cenarioRede },
}

export const PERFIS = {
  dono: { nome: 'Dono' },
  gerente: { nome: 'Gerente ou operador' },
  franquia: { nome: 'Franquia restrita' },
}

// Permissões por perfil. Item sem permissão some do menu.
const TODAS = [
  'inicio', 'pedidos', 'cardapio', 'clientes', 'campanhas', 'fidelidade', 'cupons', 'precos', 'destaques',
  'analise', 'funil', 'relatorios', 'funcionamento', 'entrega', 'modalidades', 'pagamentos', 'dados',
  'integracoes', 'rastreamento', 'conta', 'ajuda',
]
export const PERMISSOES = {
  dono: new Set(TODAS),
  gerente: new Set(['inicio', 'pedidos', 'cardapio', 'conta', 'ajuda']),
  franquia: new Set(TODAS.filter((x) => x !== 'cupons' && x !== 'cardapio')),
}

// Alertas da central, montados a partir do cenário e do estado atual das lojas
export function montarAlertas(cen, estadoLojas) {
  const alertas = []
  const nomeLoja = (id) => cen.lojas.find((l) => l.id === id)?.nome
  // 1. Sem conexão
  Object.entries(estadoLojas).forEach(([id, e]) => {
    if (e.conexao === 'sem') {
      alertas.push({
        id: `conexao-${id}`,
        prioridade: 1,
        tipo: 'Loja sem conexão',
        lojaId: Number(id),
        loja: nomeLoja(Number(id)),
        quando: e.semConexaoDesde || d(9, 19, 35),
        motivo: 'Sem sinal da loja há 7 minutos, dentro do horário programado. Pedidos novos podem não chegar.',
        acoes: [
          { rotulo: 'Ver o que fazer', tipo: 'reconexao' },
          { rotulo: 'Falar com o suporte', para: '/ajuda' },
        ],
      })
    }
  })
  // 2. Pedido parado ou atrasado: saiu em 15/10, é tratado no receptor de pedidos
  // 3. Avaliação ruim (hoje ou de ontem, enquanto não dispensada)
  Object.entries(cen.porLoja).forEach(([id, dados]) => {
    dados.pedidos
      .filter((p) => p.avaliacao && p.avaliacao.nota <= 2)
      .forEach((p) => {
        alertas.push({
          id: `avaliacao-${p.numero}`,
          prioridade: 3,
          tipo: `Avaliação nota ${p.avaliacao.nota}`,
          lojaId: Number(id),
          loja: nomeLoja(Number(id)),
          quando: p.avaliacao.quando,
          motivo: `Pedido #${p.numero}: "${p.avaliacao.comentario}"`,
          acoes: [{ rotulo: 'Ver pedido e avaliação', para: `/pedidos/${p.numero}`, lojaId: Number(id) }],
        })
      })
  })
  // 4. Integração desconectada
  Object.entries(cen.porLoja).forEach(([id, dados]) => {
    ;(dados.integracoes || [])
      .filter((i) => i.estado === 'desconectado')
      .forEach((i) => {
        alertas.push({
          id: `integracao-${id}-${i.nome}`,
          prioridade: 4,
          tipo: 'Integração desconectada',
          lojaId: Number(id),
          loja: nomeLoja(Number(id)),
          quando: i.desde,
          motivo: `${i.nome} está desconectada desde as 16:05. Entregas por ela não são chamadas.`,
          acoes: [
            // parceiros de logística ficam em Entrega; Integrações mostra só PDV e receptor
            i.nome.includes('logística')
              ? { rotulo: 'Ver parceiros de entrega', para: '/minha-loja/entrega', lojaId: Number(id) }
              : { rotulo: 'Ver integrações', para: '/minha-loja/integracoes', lojaId: Number(id) },
            { rotulo: 'Falar com o suporte', para: '/ajuda' },
          ],
        })
      })
  })
  // 5. Cupom perto de expirar (até 3 dias)
  cen.cupons
    .filter((c) => c.estado === 'ativo' && c.expira.getDate() - 9 <= 3)
    .forEach((c) => {
      // dias de calendário até a data de validade
      const dias = c.expira.getDate() - 9
      alertas.push({
        id: `cupom-${c.codigo}`,
        prioridade: 5,
        tipo: 'Cupom perto de expirar',
        lojaId: null,
        loja: cen.rede ? c.lojas === 'Todas' ? 'Todas as lojas' : c.lojas : null,
        quando: d(9, 8, 0),
        motivo: `O cupom ${c.codigo} (${c.descricao}) expira em ${dias} dias, no dia ${String(c.expira.getDate()).padStart(2, '0')}/10. Foi usado ${c.usos} vezes.`,
        acoes: [
          { rotulo: 'Duplicar com novas datas', para: `/cupons/novo?duplicar=${c.codigo}` },
          { rotulo: 'Deixar expirar', tipo: 'dispensar' },
        ],
      })
    })
  return alertas.sort((a, b) => a.prioridade - b.prioridade || b.quando - a.quando)
}
