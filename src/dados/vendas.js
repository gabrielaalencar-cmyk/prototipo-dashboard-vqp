// Dados fictícios de Clientes, Campanhas e Fidelidade (T13 a T19).
import { AGORA_REFERENCIA } from '../utilitarios/formatos.js'
import { NOMES, telefoneMascarado } from './pedidos.js'

const DIA = 86400000
const diasAtras = (n, h = 19, m = 0) => {
  const d = new Date(AGORA_REFERENCIA.getTime() - n * DIA)
  d.setHours(h, m, 0, 0)
  return d
}

function aleatorio(semente) {
  let a = semente >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Nomes inventados para completar a base (combinações de primeiro nome e sobrenome)
const PRIMEIROS = ['Adriana', 'Benedito', 'Cecília', 'Davi', 'Elisa', 'Fábio', 'Gabriela', 'Heitor', 'Irene', 'Jonas', 'Kátia', 'Lucas', 'Mirela', 'Nicolas', 'Olívia', 'Paulo', 'Raquel', 'Samuel', 'Tânia', 'Ulisses', 'Vera', 'Wagner']
const SOBRENOMES = ['Antunes', 'Barcelos', 'Campos', 'Damasceno', 'Esteves', 'Ferraz', 'Guimarães', 'Holanda', 'Ivo', 'Jardim', 'Leal', 'Macedo', 'Nóbrega', 'Quaresma']
const nomeGerado = (i) => `${PRIMEIROS[i % PRIMEIROS.length]} ${SOBRENOMES[(i * 5 + Math.floor(i / PRIMEIROS.length)) % SOBRENOMES.length]}`

// ---------- Segmentos (T13) ----------
export const SEGMENTOS_LISTA = [
  { id: 'novos', rotulo: 'Novos', descricao: 'Primeira compra nos últimos 30 dias' },
  { id: 'recorrentes', rotulo: 'Recorrentes', descricao: 'Dois pedidos ou mais e último pedido nos últimos 50 dias' },
  { id: 'afastando', rotulo: 'Se afastando', descricao: 'Sem comprar há mais de 50 dias (até 120 dias)' },
  { id: 'sem-compra', rotulo: 'Cadastrados sem compra', descricao: 'Criaram conta no app e ainda não pediram' },
  { id: 'valiosos', rotulo: 'Mais valiosos', descricao: 'Maior gasto nos últimos 90 dias' },
  { id: 'aniversariantes', rotulo: 'Aniversariantes do mês', descricao: 'Fazem aniversário em outubro' },
]

// Segmentos extras usados só para escolher para quem vai a campanha (T16)
export const SEGMENTOS_CAMPANHA = [
  { id: 'todos', rotulo: 'Todos os clientes', descricao: 'Toda a base' },
  ...SEGMENTOS_LISTA,
  { id: 'uma-compra', rotulo: 'Compraram uma vez', descricao: 'Um pedido só, feito entre 15 e 90 dias atrás' },
  { id: 'pontos-vencer', rotulo: 'Saldo de fidelidade vencendo', descricao: 'Pontos ou cashback que vencem nos próximos 30 dias' },
  { id: 'perto-premio', rotulo: 'Perto do prêmio', descricao: 'A até 30 pontos de um resgate', soPontos: true },
]
export const segmentoPorId = (id) => SEGMENTOS_CAMPANHA.find((s) => s.id === id)

// Proporções da rede sobre a base de cada loja (o total é real; a lista é uma amostra)
const PROPORCAO_REDE = {
  todos: 1, novos: 0.07, recorrentes: 0.36, 'sem-compra': 0.09, valiosos: 0.1, aniversariantes: 0.075, 'uma-compra': 0.14, 'pontos-vencer': 0.03,
}

// ---------- Fidelidade ----------
export const PREMIO_PONTOS = { nome: 'Pastel grátis', pontos: 150 }
export const PROGRAMA_PONTOS = {
  pontosPorReal: 1,
  validadeDias: 180,
  premios: [
    { id: 'pastel', nome: 'Pastel grátis', pontos: 150, ativo: true },
    { id: 'caldo', nome: 'Caldo de cana 500 ml', pontos: 90, ativo: false },
  ],
}
export const PROGRAMA_CASHBACK = { percentual: 5, ondeVale: 'total', produtos: [], validadeDias: 60, minimoUso: 20 }

export const FIDELIDADE_PONTOS = {
  participantes: 41, ativos: 33, aVencer: 3, expirados: 5, resgates: 4, umResgate: 4,
  premiosResgatados: [{ nome: 'Pastel grátis', resgates: 4 }],
  custoResgates: 57, // valor de cardápio dos 4 pastéis resgatados
  resultado: { ticketParticipantes: 58.9, ticketOutros: 51.2, frequenciaParticipantes: 1.9, frequenciaOutros: 1.2 },
}
// Mesmos participantes que a Análise (Fidelidade) mostra: 3.920 na rede, 326 por loja
export const FIDELIDADE_CASHBACK = {
  rede: { participantes: 3920, ativos: 2548, aVencer: 431, expirados: 941 },
  loja: { participantes: 326, ativos: 212, aVencer: 36, expirados: 78 },
  resultado: { ticketParticipantes: 84.2, ticketOutros: 74.9, frequenciaParticipantes: 2.1, frequenciaOutros: 1.3 },
}
export const LIMIAR_PERCENTUAL = 200

// ---------- Fidelidade por período ----------
// Este mês é a base (números do cenário); os outros períodos saem dela por fatores fixos.
// Participantes, saldo ativo, a vencer, expirados e saldo em aberto são foto de hoje e não entram aqui.
export const PERIODOS_FIDELIDADE = [
  { id: 'este-mes', rotulo: 'Este mês', texto: 'Outubro até o dia 9', comparacao: 'setembro no mesmo intervalo', analise: 'este-mes' },
  { id: 'mes-passado', rotulo: 'Mês passado', texto: 'Setembro', comparacao: 'agosto', analise: 'mes-passado' },
  { id: '7-dias', rotulo: 'Últimos 7 dias', texto: '3 a 9 de outubro', comparacao: 'os 7 dias anteriores', analise: '7-dias' },
  { id: '30-dias', rotulo: 'Últimos 30 dias', texto: '10/09 a 09/10', comparacao: 'os 30 dias anteriores', analise: '30-dias' },
  { id: '90-dias', rotulo: 'Últimos 90 dias', texto: '12/07 a 09/10', comparacao: 'os 90 dias anteriores', analise: '30-dias' },
]
const FATORES_PERIODO = {
  'este-mes': { volume: 1, novos: 1, ticketP: 1, ticketO: 1, freqP: 0, freqO: 0 },
  'mes-passado': { volume: 3.25, novos: 3.1, ticketP: 0.985, ticketO: 0.99, freqP: -0.1, freqO: 0 },
  '7-dias': { volume: 0.75, novos: 0.7, ticketP: 1.02, ticketO: 1.01, freqP: 0.1, freqO: 0 },
  '30-dias': { volume: 3, novos: 2.9, ticketP: 0.99, ticketO: 0.995, freqP: 0, freqO: 0 },
  '90-dias': { volume: 8.75, novos: 7.5, ticketP: 0.975, ticketO: 0.98, freqP: -0.1, freqO: -0.1 },
}
const NOVOS_ESTE_MES = { pontos: 3, cashbackLoja: 9, cashbackRede: 96 }

function resultadoNoPeriodo(base, f) {
  return {
    ticketParticipantes: Math.round(base.ticketParticipantes * f.ticketP * 100) / 100,
    ticketOutros: Math.round(base.ticketOutros * f.ticketO * 100) / 100,
    frequenciaParticipantes: Math.round((base.frequenciaParticipantes + f.freqP) * 10) / 10,
    frequenciaOutros: Math.round((base.frequenciaOutros + f.freqO) * 10) / 10,
  }
}

export function fidelidadePontosNoPeriodo(periodoId) {
  const f = FATORES_PERIODO[periodoId] || FATORES_PERIODO['este-mes']
  const b = FIDELIDADE_PONTOS
  const resgates = Math.round(b.resgates * f.volume)
  return {
    resgates,
    custoResgates: Math.round((b.custoResgates / b.resgates) * resgates * 100) / 100,
    premiosResgatados: b.premiosResgatados.map((p) => ({ ...p, resgates: Math.round(p.resgates * f.volume) })),
    novos: Math.round(NOVOS_ESTE_MES.pontos * f.novos),
    resultado: resultadoNoPeriodo(b.resultado, f),
  }
}

// Gerado e usado não têm origem no Analítico: seguem indisponíveis em qualquer período
export function fidelidadeCashbackNoPeriodo(periodoId, emRede) {
  const f = FATORES_PERIODO[periodoId] || FATORES_PERIODO['este-mes']
  return {
    novos: Math.round((emRede ? NOVOS_ESTE_MES.cashbackRede : NOVOS_ESTE_MES.cashbackLoja) * f.novos),
    resultado: resultadoNoPeriodo(FIDELIDADE_CASHBACK.resultado, f),
  }
}

// ---------- Montagem de um cliente ----------
const STATUS_ANTIGO = ['Entregue', 'Entregue', 'Retirado pelo cliente', 'Entregue', 'Conta fechada']

function montarCliente({ id, nome, idxTel, r, perfil, reais = [], nPedidos, ultimaDias, lojaId, lojaNome, ticketBase }) {
  const final = String(1000 + ((idxTel * 7919) % 9000)).slice(-4)
  const pedidos = reais.map((p) => ({ numero: p.numero, criado: p.criado, total: p.total, status: p.status, cancelado: p.grupo === 'cancelado', lojaId, lojaNome, existe: true }))
  const total = Math.max(nPedidos ?? 0, pedidos.length)
  // pedidos mais antigos que os 7 dias do protótipo
  let dia = pedidos.length ? Math.max(7, Math.round((AGORA_REFERENCIA - pedidos[pedidos.length - 1].criado) / DIA) + 4) : ultimaDias
  for (let i = pedidos.length; i < total; i++) {
    pedidos.push({
      numero: null,
      criado: diasAtras(dia, r() < 0.3 ? 12 : 19, Math.floor(r() * 59)),
      total: Math.round((ticketBase * (0.6 + r() * 0.8)) * 2) / 2,
      status: STATUS_ANTIGO[Math.floor(r() * STATUS_ANTIGO.length)],
      lojaId,
      lojaNome,
      existe: false,
    })
    dia += perfil === 'recorrente' ? 6 + Math.floor(r() * 18) : 10 + Math.floor(r() * 30)
  }
  const validos = pedidos.filter((p) => !p.cancelado)
  const gasto = validos.reduce((s, p) => s + p.total, 0)
  const gasto90 = validos.filter((p) => AGORA_REFERENCIA - p.criado <= 90 * DIA).reduce((s, p) => s + p.total, 0)
  const primeiro = nome.split(' ')[0].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const sobrenome = nome.split(' ')[1]?.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') || 'cliente'
  return {
    id: String(id),
    nome,
    primeiroNome: nome.split(' ')[0],
    telefone: telefoneMascarado(final),
    telefoneCompleto: `(11) 9${String(2000 + ((idxTel * 131) % 7000))}-${final}`,
    email: `${primeiro[0]}•••@•••.com`,
    emailCompleto: `${primeiro}.${sobrenome}@exemplo.com`,
    cpf: `•••.•••.•••-${String(10 + ((idxTel * 37) % 89))}`,
    cpfCompleto: `${String(100 + ((idxTel * 53) % 899))}.${String(100 + ((idxTel * 71) % 899))}.${String(100 + ((idxTel * 29) % 899))}-${String(10 + ((idxTel * 37) % 89))}`,
    pedidos,
    nPedidos: pedidos.length,
    primeiraCompra: pedidos.length ? pedidos[pedidos.length - 1].criado : null,
    ultimaCompra: pedidos.length ? pedidos[0].criado : null,
    cadastro: pedidos.length ? pedidos[pedidos.length - 1].criado : diasAtras(ultimaDias || 20),
    gasto,
    gasto90,
    aniversarioOutubro: false,
    consentimento: idxTel % 9 !== 4,
    fidelidade: null,
    lojaId,
    lojaNome,
    segmentos: new Set(),
  }
}

function marcarSegmentos(clientes, quantosValiosos) {
  clientes.forEach((c) => {
    const dUltima = c.ultimaCompra ? (AGORA_REFERENCIA - c.ultimaCompra) / DIA : null
    const dPrimeira = c.primeiraCompra ? (AGORA_REFERENCIA - c.primeiraCompra) / DIA : null
    c.segmentos.add('todos')
    if (c.nPedidos === 0) c.segmentos.add('sem-compra')
    if (dPrimeira != null && dPrimeira <= 30) c.segmentos.add('novos')
    if (c.nPedidos >= 2 && dUltima <= 50) c.segmentos.add('recorrentes')
    if (dUltima != null && dUltima > 50 && dUltima <= 120) c.segmentos.add('afastando')
    if (c.nPedidos === 1 && dUltima > 14 && dUltima <= 90) c.segmentos.add('uma-compra')
    if (c.aniversarioOutubro) c.segmentos.add('aniversariantes')
    if (c.fidelidade?.estado === 'a-vencer') c.segmentos.add('pontos-vencer')
    if (c.fidelidade?.pertoPremio) c.segmentos.add('perto-premio')
  })
  ;[...clientes]
    .filter((c) => c.gasto90 > 0)
    .sort((a, b) => b.gasto90 - a.gasto90)
    .slice(0, quantosValiosos)
    .forEach((c) => c.segmentos.add('valiosos'))
}

// ---------- Cenário A: base completa de 152 clientes ----------
function basePastelaria(cen) {
  const r = aleatorio(1001)
  const reais = cen.porLoja[1001].pedidos
  const clientes = []
  // 1 a 12: clientes dos pedidos #1082 a #1093 (mesmos nomes, telefones e contagem de pedidos)
  for (let i = 0; i < 12; i++) {
    const nome = NOMES[i]
    const deles = reais.filter((p) => p.cliente.nome === nome).sort((a, b) => b.criado - a.criado)
    clientes.push(montarCliente({ id: i + 1, nome, idxTel: i, r, perfil: 'recorrente', reais: deles, nPedidos: deles[0]?.cliente.pedidosNaLoja, ticketBase: 50 }))
  }
  // demais perfis, na ordem: 18 sem compra, 12 se afastando, 2 novos, 32 recorrentes, 6 de uma compra só, 70 inativos
  const perfis = [
    ...Array(18).fill('sem-compra'), ...Array(12).fill('afastando'), ...Array(2).fill('novo'),
    ...Array(32).fill('recorrente'), ...Array(6).fill('uma-compra'), ...Array(70).fill('inativo'),
  ]
  perfis.forEach((perfil, k) => {
    const i = 12 + k
    const conf = {
      'sem-compra': { n: 0, ultima: 5 + Math.floor(r() * 80) },
      afastando: { n: 2 + Math.floor(r() * 5), ultima: 52 + Math.floor(r() * 60) },
      novo: { n: 1, ultima: 10 + Math.floor(r() * 15) },
      recorrente: { n: k === 40 ? 14 : 2 + Math.floor(r() * 7), ultima: 8 + Math.floor(r() * 36) },
      'uma-compra': { n: 1, ultima: 31 + Math.floor(r() * 19) },
      inativo: { n: 1 + Math.floor(r() * 3), ultima: 125 + Math.floor(r() * 260) },
    }[perfil]
    clientes.push(montarCliente({ id: i + 1, nome: nomeGerado(k), idxTel: i + 30, r, perfil, nPedidos: conf.n, ultimaDias: conf.ultima, ticketBase: 50 }))
  })
  // Fidelidade: 41 participantes (33 com saldo ativo, 3 a vencer, 5 expirados; 4 a um resgate)
  const participantes = [
    ...[0, 1, 2, 4, 5, 7, 8, 10, 11, 3].map((i) => clientes[i]),
    ...clientes.slice(44, 69), // recorrentes
    ...clientes.slice(30, 34), // se afastando
    ...clientes.slice(76, 78), // uma compra só
  ]
  participantes.forEach((c, k) => {
    const expirado = k >= 36 && k <= 40
    const aVencer = k === 12 || k === 20 || k === 28
    const pertoPremio = [1, 15, 22, 30].includes(k)
    const saldo = expirado ? 0 : pertoPremio ? 122 + ((k * 7) % 26) : 15 + ((k * 23) % 100)
    c.fidelidade = {
      tipo: 'pontos',
      saldo,
      estado: expirado ? 'expirado' : aVencer ? 'a-vencer' : 'ativo',
      vence: expirado ? diasAtras(10 + k) : aVencer ? diasAtras(-(5 + k / 4)) : diasAtras(-(40 + ((k * 13) % 120))),
      pertoPremio,
    }
  })
  ;[2, 13, 27, 48, 61, 66, 90, 117, 140].forEach((i) => (clientes[i].aniversarioOutubro = true))
  marcarSegmentos(clientes, 15)
  return clientes
}

// ---------- Cenário B: amostra de 50 clientes por loja ----------
function amostraLojaRede(cen, loja) {
  const r = aleatorio(loja.id * 7)
  const reais = cen.porLoja[loja.id].pedidos
  const clientes = []
  for (let k = 0; k < 50; k++) {
    const nome = k < NOMES.length ? NOMES[k] : nomeGerado(k * 3 + 1)
    const deles = k < NOMES.length ? reais.filter((p) => p.cliente.nome === nome).sort((a, b) => b.criado - a.criado) : []
    const perfil = deles.length ? 'recorrente' : ['afastando', 'sem-compra', 'inativo', 'recorrente', 'uma-compra'][k % 5]
    const n = deles.length ? deles.length + Math.floor(r() * 9) : { afastando: 2 + Math.floor(r() * 4), 'sem-compra': 0, inativo: 1 + Math.floor(r() * 2), recorrente: 2 + Math.floor(r() * 6), 'uma-compra': 1 }[perfil]
    const ultima = { afastando: 55 + Math.floor(r() * 60), 'sem-compra': 10 + Math.floor(r() * 60), inativo: 130 + Math.floor(r() * 200), recorrente: 8 + Math.floor(r() * 30), 'uma-compra': 20 + Math.floor(r() * 30) }[perfil]
    const c = montarCliente({ id: `${loja.id}-${k}`, nome, idxTel: k + loja.id, r, perfil, reais: deles, nPedidos: n, ultimaDias: ultima, lojaId: loja.id, lojaNome: loja.nome, ticketBase: 79 })
    if (c.nPedidos > 0 && k % 3 !== 2) {
      const aVencer = k % 11 === 0
      const saldo = Math.round((c.gasto * 0.05 * (0.2 + r() * 0.5)) * 100) / 100
      c.fidelidade = { tipo: 'cashback', saldo, estado: saldo === 0 ? 'expirado' : aVencer ? 'a-vencer' : 'ativo', vence: aVencer ? diasAtras(-(6 + (k % 8))) : diasAtras(-(20 + ((k * 7) % 40))) }
    }
    c.aniversarioOutubro = k % 13 === 5
    clientes.push(c)
  }
  marcarSegmentos(clientes, 5)
  return clientes
}

// ---------- Base de clientes do contexto atual ----------
const cache = new WeakMap()

export function baseClientes(cen, cenarioId, lojaId) {
  if (!cache.has(cen)) cache.set(cen, {})
  const memo = cache.get(cen)
  if (memo[lojaId]) return memo[lojaId]
  let base
  if (cenarioId === 'nova') {
    base = { total: 0, amostra: false, clientes: [], contar: () => ({ n: 0, total: 0, semConsentimento: 0 }) }
  } else if (cenarioId === 'pequena') {
    const clientes = basePastelaria(cen)
    base = {
      total: clientes.length,
      amostra: false,
      clientes,
      contar: (seg) => {
        const doSeg = clientes.filter((c) => c.segmentos.has(seg))
        const sem = doSeg.filter((c) => !c.consentimento).length
        return { n: doSeg.length - sem, total: doSeg.length, semConsentimento: sem }
      },
    }
  } else {
    const lojas = cen.lojas.filter((l) => !l.teste)
    const emRede = lojaId === 'rede'
    const escopo = emRede ? lojas : lojas.filter((l) => l.id === lojaId)
    const total = escopo.reduce((s, l) => s + cen.porLoja[l.id].clientesBase, 0)
    const fat = escopo.reduce((s, l) => s + l.resumo.fat, 0)
    // na rede inteira, a amostra junta uns poucos clientes de cada loja, sem repetir nomes
    const clientes = emRede
      ? lojas.flatMap((l, i) => amostraLojaRede(cen, l).filter((_, k) => k % lojas.length === i))
      : amostraLojaRede(cen, escopo[0])
    if (emRede) {
      clientes.forEach((c) => c.segmentos.delete('valiosos'))
      marcarSegmentos(clientes, 5)
    }
    base = {
      total,
      amostra: true,
      clientes,
      contar: (seg) => {
        if (seg === 'perto-premio') return { n: 0, total: 0, semConsentimento: 0 }
        const doSeg = seg === 'afastando' ? Math.round(420 * (fat / 152380)) : Math.round(total * (PROPORCAO_REDE[seg] ?? 0))
        const sem = Math.round(doSeg * 0.08)
        return { n: doSeg - sem, total: doSeg, semConsentimento: sem }
      },
    }
  }
  memo[lojaId] = base
  return base
}

// ---------- Painel de clientes no período (T13) ----------
// Os mesmos atalhos da home. Os números do período vêm de dadosLoja.periodo (os mesmos da home e da Análise);
// base, se afastando e aniversariantes são foto de hoje e vêm da base de clientes.
export const PERIODOS_CLIENTES = [
  { id: '7-dias', rotulo: 'Últimos 7 dias', noPeriodo: 'nos últimos 7 dias', noAnterior: 'na semana anterior' },
  { id: 'este-mes', rotulo: 'Mês atual', noPeriodo: 'em outubro', noAnterior: 'em setembro' },
  { id: '30-dias', rotulo: 'Últimos 30 dias', noPeriodo: 'nos últimos 30 dias', noAnterior: 'nos 30 dias anteriores' },
]
export const LIMIAR_CLIENTES = 30

// Mesma divisão da Análise (aba Clientes): loja com um terço de clientes novos; rede com 412 de 1.508
const PARTE_NOVOS = { loja: 0.33, rede: 412 / 1508 }

function quebrar(q, parte) {
  const novos = Math.max(1, Math.round(q.clientes * parte))
  return {
    clientes: q.clientes,
    novos,
    recorrentes: q.clientes - novos,
    pedidos: q.pedidos,
    faturamento: q.faturamento,
    frequencia: q.pedidos / q.clientes,
    gastoMedio: q.faturamento / q.clientes,
  }
}

const somar = (lista) =>
  lista.reduce((s, q) => ({ clientes: s.clientes + q.clientes, pedidos: s.pedidos + q.pedidos, faturamento: s.faturamento + q.faturamento }), { clientes: 0, pedidos: 0, faturamento: 0 })

export function clientesNoPeriodo({ cen, dadosLoja, emRede, base, periodoId }) {
  if (!base || base.total === 0) return null
  let p
  if (emRede) {
    const lojas = cen.lojas.filter((l) => !l.teste).map((l) => cen.porLoja[l.id].periodo)
    const r = cen.resumoRede.periodo
    // a soma das lojas é ajustada para o total de clientes únicos que a Análise mostra (1.508 em outubro)
    const fator = r.clientes / somar(lojas.map((x) => x['este-mes'].atual)).clientes
    const ajustar = (q) => ({ ...q, clientes: Math.round(q.clientes * fator) })
    const ref = lojas[0][periodoId]
    p = periodoId === 'este-mes'
      ? {
          ...ref,
          atual: { faturamento: r.faturamento, pedidos: r.pedidos, clientes: r.clientes },
          anterior: { faturamento: r.faturamento / 1.068, pedidos: Math.round(r.pedidos / 1.041), clientes: 1452 },
        }
      : { ...ref, atual: ajustar(somar(lojas.map((x) => x[periodoId].atual))), anterior: ajustar(somar(lojas.map((x) => x[periodoId].anterior))) }
  } else {
    p = dadosLoja?.periodo?.[periodoId]
  }
  if (!p) return null
  const parte = emRede ? PARTE_NOVOS.rede : PARTE_NOVOS.loja
  return {
    rotulo: p.rotulo,
    comparacao: p.comparacao,
    comparado: p.mesComparado,
    atual: quebrar(p.atual, parte),
    anterior: quebrar(p.anterior, parte),
    baixoVolume: p.atual.clientes < LIMIAR_CLIENTES,
    hoje: {
      base: base.total,
      afastando: base.contar('afastando').total,
      aniversariantes: base.contar('aniversariantes').total,
    },
  }
}

// ---------- Campanhas (T15 e T16) ----------
export const MODELOS_CAMPANHA = [
  {
    id: 'sentimos', nome: 'Sentimos sua falta', segmento: 'afastando',
    titulo: 'Faz tempo, {primeiro_nome}!', texto: 'Sentimos sua falta por aqui. Que tal matar a saudade hoje? O forno está quentinho.',
  },
  {
    id: 'aniversario', nome: 'Feliz aniversário', segmento: 'aniversariantes',
    titulo: 'Feliz aniversário, {primeiro_nome}!', texto: 'Hoje é dia de comemorar com a gente. Seu presente está esperando no app.',
  },
  {
    id: 'segundo', nome: 'Volte para o segundo pedido', segmento: 'uma-compra',
    titulo: 'Gostou, {primeiro_nome}?', texto: 'Seu primeiro pedido foi só o começo. Volte e prove outro sabor do cardápio.',
  },
  {
    id: 'pontos', nome: 'Seus pontos vão vencer', segmento: 'pontos-vencer',
    titulo: '{primeiro_nome}, seus pontos vão vencer', texto: 'Você tem pontos perto de vencer. Use no próximo pedido antes que expirem.',
    tituloCashback: '{primeiro_nome}, seu cashback vai vencer', textoCashback: 'Você tem saldo de cashback perto de vencer. Use no próximo pedido.',
  },
  {
    id: 'novidade', nome: 'Novidade no cardápio', segmento: 'todos',
    titulo: 'Novidade no cardápio!', texto: 'Chegou sabor novo, {primeiro_nome}. Peça hoje e conte pra gente o que achou.',
  },
]
export const modeloPorId = (id) => MODELOS_CAMPANHA.find((m) => m.id === id)

// No WhatsApp a mensagem sai de um modelo aprovado; só o primeiro nome e o cupom variam
export const MODELOS_WHATSAPP = [
  { id: 'wa-volta', nome: 'Convite para voltar', texto: 'Oi, {primeiro_nome}! Sentimos sua falta. Faça seu pedido pelo app quando quiser.' },
  { id: 'wa-aniversario', nome: 'Aniversário', texto: 'Feliz aniversário, {primeiro_nome}! Preparamos um presente para você no app.' },
  { id: 'wa-novidade', nome: 'Novidade', texto: 'Oi, {primeiro_nome}! Temos novidade no cardápio. Confira no app.' },
]

export const CAMPANHAS_REDE = [
  { id: 'c1', nome: 'Sentimos sua falta', canal: 'push', estado: 'enviada', quando: diasAtras(11, 18, 0), segmento: 'afastando', enviados: 1240, entregues: 1198, lojas: 'Todas' },
  { id: 'c2', nome: 'Pizza nova: calabresa com mel', canal: 'whatsapp', estado: 'enviada', quando: diasAtras(7, 11, 30), segmento: 'todos', enviados: 3904, entregues: 3812, lojas: 'Todas' },
  { id: 'c3', nome: 'Feliz aniversário (outubro)', canal: 'push', estado: 'enviada', quando: diasAtras(8, 10, 0), segmento: 'aniversariantes', enviados: 1046, entregues: 1011, lojas: 'Todas' },
  { id: 'c4', nome: 'Dia das Crianças: pizza broto', canal: 'push', estado: 'agendada', quando: diasAtras(-3, 17, 0), segmento: 'recorrentes', enviados: null, entregues: null, lojas: '8 lojas' },
  { id: 'c5', nome: 'Volte para o segundo pedido', canal: 'whatsapp', estado: 'rascunho', quando: diasAtras(2, 15, 12), segmento: 'uma-compra', enviados: null, entregues: null, lojas: 'Todas' },
]

// ---------- Automações (T17) ----------
export const GATILHOS = [
  { id: 'sem-comprar', rotulo: 'Cliente sem comprar há', dias: true, sufixo: 'dias' },
  { id: 'aniversario', rotulo: 'No aniversário do cliente' },
  { id: 'primeira-compra', rotulo: 'Depois da primeira compra, em', dias: true, sufixo: 'dias' },
  { id: 'pontos-vencer', rotulo: 'Saldo de fidelidade vencendo em', dias: true, sufixo: 'dias' },
]
export const CONDICOES = [
  { id: '', rotulo: 'Sem condição' },
  { id: 'gastou', rotulo: 'Gastou mais de' },
  { id: 'loja', rotulo: 'Comprou na loja', soRede: true },
]
export const MODELOS_AUTOMACAO = [
  { id: 'sentimos', nome: 'Sentimos sua falta', gatilho: 'sem-comprar', dias: 50, texto: 'Faz tempo, {primeiro_nome}! Sentimos sua falta por aqui.' },
  { id: 'aniversario', nome: 'Feliz aniversário', gatilho: 'aniversario', texto: 'Feliz aniversário, {primeiro_nome}! Seu presente está no app.' },
  { id: 'segundo', nome: 'Volte para o segundo pedido', gatilho: 'primeira-compra', dias: 15, texto: 'Gostou, {primeiro_nome}? Volte e prove outro sabor.' },
  { id: 'pontos', nome: 'Seus pontos vão vencer', gatilho: 'pontos-vencer', dias: 15, texto: '{primeiro_nome}, seu saldo vai vencer. Use no próximo pedido.' },
]
export const AUTOMACOES_REDE = [
  { id: 'a1', nome: 'Feliz aniversário', gatilho: 'aniversario', dias: '', condicao: '', valor: '', canal: 'push', texto: 'Feliz aniversário, {primeiro_nome}! Seu presente está no app.', estado: 'ativa', enviadas30: 1046 },
  { id: 'a2', nome: 'Sentimos sua falta', gatilho: 'sem-comprar', dias: '45', condicao: 'gastou', valor: '150', canal: 'whatsapp', texto: 'Oi, {primeiro_nome}! Sentimos sua falta. Faça seu pedido pelo app quando quiser.', estado: 'pausada', enviadas30: 0 },
]
