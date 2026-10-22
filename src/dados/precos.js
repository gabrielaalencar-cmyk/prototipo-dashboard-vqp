// Promoções automáticas ("precificação volátil"): movimento das últimas 8 semanas por dia da semana
// e período (manhã, almoço, tarde, jantar, madrugada) e regras de desconto nos horários de baixa. Números fictícios e determinísticos.
import { AGORA_REFERENCIA, decimal, moeda } from '../utilitarios/formatos.js'

export const SEMANAS = 8
// Dia de baixa: abaixo de 75% da média do mesmo período na semana
export const LIMIAR_BAIXA = 0.75

export const DIAS = [
  { id: 'seg', nome: 'Segunda', curto: 'Seg' },
  { id: 'ter', nome: 'Terça', curto: 'Ter' },
  { id: 'qua', nome: 'Quarta', curto: 'Qua' },
  { id: 'qui', nome: 'Quinta', curto: 'Qui' },
  { id: 'sex', nome: 'Sexta', curto: 'Sex' },
  { id: 'sab', nome: 'Sábado', curto: 'Sáb' },
  { id: 'dom', nome: 'Domingo', curto: 'Dom' },
]

// Períodos padronizados, iguais para todas as lojas. A madrugada passa da meia-noite (23h às 6h).
// Cada período tem cor fixa (validada para daltonismo nos pares que aparecem juntos).
export const PERIODOS = [
  { id: 'manha', nome: 'Manhã', artigo: 'a', de: 6 * 60, ate: 11 * 60, cor: '#1baf7a' },
  { id: 'almoco', nome: 'Almoço', artigo: 'o', de: 11 * 60, ate: 15 * 60, cor: '#2a78d6' },
  { id: 'tarde', nome: 'Tarde', artigo: 'a', de: 15 * 60, ate: 18 * 60, cor: '#eda100' },
  { id: 'jantar', nome: 'Jantar', artigo: 'o', de: 18 * 60, ate: 23 * 60, cor: '#e87ba4' },
  { id: 'madrugada', nome: 'Madrugada', artigo: 'a', de: 23 * 60, ate: 30 * 60, cor: '#008300' },
]

// Funcionamento (minhaloja.js): 11h–22h na pastelaria, 18h–23h30 na pizzaria
export const funcionamentoDoCenario = (cenarioId) => (cenarioId === 'rede' ? { de: 18 * 60, ate: 23 * 60 + 30 } : { de: 11 * 60, ate: 22 * 60 })

// Períodos em que a loja abre, recortados pelo funcionamento ("Jantar, 18h às 22h")
export function periodosDoCenario(cenarioId) {
  const f = funcionamentoDoCenario(cenarioId)
  return PERIODOS.map((p) => ({ ...p, de: Math.max(p.de, f.de), ate: Math.min(p.ate, f.ate) }))
    .filter((p) => p.ate > p.de)
    .map((p) => ({ ...p, duracao: (p.ate - p.de) / 60 }))
}
export const periodosFechados = (cenarioId) => {
  const abertos = periodosDoCenario(cenarioId).map((p) => p.id)
  return PERIODOS.filter((p) => !abertos.includes(p.id))
}

// "15h", "23h30" (aceita minutos depois da meia-noite)
export const rotuloMinutos = (m) => {
  const h = Math.floor(m / 60) % 24
  return `${h}h${m % 60 ? String(m % 60).padStart(2, '0') : ''}`
}
// "15:00" <-> 900
export const paraMinutos = (s) => {
  const [h, m] = s.split(':').map(Number)
  return h * 60 + m
}
export const deMinutos = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
export const descreverPeriodo = (p) => `${rotuloMinutos(p.de)} às ${rotuloMinutos(p.ate)}`

// Ruído determinístico em [-1, 1]
function ruido(semente, a, b) {
  let x = Math.sin(semente * 12.9898 + a * 78.233 + b * 37.719) * 43758.5453
  x -= Math.floor(x)
  return x * 2 - 1
}

// Pedidos por hora e ticket esperados em cada período, e peso de cada dia, de segunda a domingo
const PERFIL = {
  pequena: {
    // somam uns 31 pedidos por mês, como na seção 10 da especificação
    hora: { almoco: 0.12, tarde: 0.04, jantar: 0.13 },
    ticket: { almoco: 52, tarde: 38, jantar: 61 },
    dia: [0.9, 0.85, 0.85, 0.95, 1.2, 1.35, 1.15],
    // terça e quarta à tarde: a baixa que a "Tarde do pastel" ataca (somas das 8 semanas)
    fixos: { 'ter-tarde': 0, 'qua-tarde': 0 },
  },
  rede: {
    hora: { jantar: 3.4, madrugada: 1.4 },
    ticket: { jantar: 80, madrugada: 68 },
    dia: [0.72, 0.76, 0.86, 0.92, 1.3, 1.45, 1.2],
    fixos: {},
  },
}

// Pedidos e faturamento das 8 semanas por dia × período
function movimentoDeUmaLoja(cenarioId, semente, fator = 1) {
  const perfil = PERFIL[cenarioId === 'rede' ? 'rede' : 'pequena']
  return DIAS.map((d, i) =>
    periodosDoCenario(cenarioId).map((p, j) => {
      const fixo = perfil.fixos[`${d.id}-${p.id}`]
      const esperado = perfil.hora[p.id] * perfil.dia[i] * p.duracao * SEMANAS * fator
      const pedidos = fixo != null && fator === 1 ? fixo : Math.max(0, Math.round(esperado + ruido(semente, i, j) * Math.max(1, esperado * 0.08)))
      // fim de semana puxa o ticket um pouco para cima
      const ticket = perfil.ticket[p.id] * (i >= 4 ? 1.05 : 1) * (1 + ruido(semente + 7, i, j) * 0.06)
      return { pedidos, faturamento: pedidos * ticket }
    }),
  )
}

// Peso de cada loja da rede pelo faturamento do período (média da rede = 1)
function fatorLoja(cen, lojaId) {
  const lojas = cen.lojas.filter((l) => !l.teste)
  const media = lojas.reduce((s, l) => s + (l.resumo?.fat || 0), 0) / lojas.length
  const loja = lojas.find((l) => l.id === lojaId)
  return loja?.resumo?.fat ? loja.resumo.fat / media : 1
}

// Movimento das 8 semanas: pontos por dia × período, médias de cada período e marcação dos dias de baixa
export function movimento(cen, lojaId, emRede) {
  if (cen.lojaNova) return null
  const periodos = periodosDoCenario(cen.id)
  let somas
  if (!cen.rede) somas = movimentoDeUmaLoja(cen.id, 1001)
  else if (!emRede) somas = movimentoDeUmaLoja(cen.id, lojaId, fatorLoja(cen, lojaId))
  else {
    const porLoja = cen.lojas.filter((l) => !l.teste).map((l) => movimentoDeUmaLoja(cen.id, l.id, fatorLoja(cen, l.id)))
    somas = DIAS.map((_, i) => periodos.map((_, j) => ({
      pedidos: porLoja.reduce((s, m) => s + m[i][j].pedidos, 0),
      faturamento: porLoja.reduce((s, m) => s + m[i][j].faturamento, 0),
    })))
  }
  // Pouco volume: pedidos vão como contagem das 8 semanas; senão, média por dia
  const contagem = !cen.rede
  const series = periodos.map((p, j) => {
    const pontos = DIAS.map((d, i) => {
      const { pedidos, faturamento } = somas[i][j]
      return { dia: d, periodo: p, soma: pedidos, pedidos: contagem ? pedidos : pedidos / SEMANAS, ticket: pedidos ? faturamento / pedidos : null }
    })
    const total = pontos.reduce((s, x) => s + x.soma, 0)
    const fat = DIAS.reduce((s, _, i) => s + somas[i][j].faturamento, 0)
    const media = pontos.reduce((s, x) => s + x.pedidos, 0) / DIAS.length
    pontos.forEach((x) => { x.baixa = x.pedidos < media * LIMIAR_BAIXA })
    return { periodo: p, pontos, media, total, ticket: total ? fat / total : null }
  })
  const total = series.reduce((s, x) => s + x.total, 0)
  const fat = series.reduce((s, x) => s + (x.ticket || 0) * x.total, 0)
  return { periodos, series, contagem, total, porDia: total / SEMANAS / DIAS.length, ticket: total ? fat / total : null }
}

const listar = (nomes) => new Intl.ListFormat('pt-BR', { style: 'long', type: 'conjunction' }).format(nomes)

// Valor de um ponto na métrica escolhida
export const valorPonto = (mov, x, metrica) => (metrica === 'ticket' ? x.ticket : x.pedidos)
export function formatarPedidos(mov, v) {
  if (mov.contagem) return `${v} ${v === 1 ? 'pedido' : 'pedidos'} em ${SEMANAS} semanas`
  return `${decimal(v, 1)} ${v < 2 ? 'pedido' : 'pedidos'} por dia`
}

// Dias de baixa agrupados por período (dias com o mesmo período fraco viram um grupo)
export function gruposDeBaixa(mov) {
  if (!mov) return []
  return mov.series
    .map((s) => {
      const pontos = s.pontos.filter((x) => x.baixa)
      const valor = pontos.length ? pontos.reduce((t, x) => t + x.pedidos, 0) / pontos.length : 0
      return { periodo: s.periodo, dias: pontos.map((x) => x.dia), pontos, valor, media: s.media, pedidos: pontos.reduce((t, x) => t + x.soma, 0) }
    })
    .filter((g) => g.pontos.length)
    .sort((a, b) => b.pontos.length - a.pontos.length || (a.valor / a.media) - (b.valor / b.media))
}

export function descreverDias(ids) {
  const ordem = DIAS.filter((d) => ids.includes(d.id))
  if (ordem.length === 7) return 'Todos os dias'
  const indices = ordem.map((d) => DIAS.indexOf(d))
  const seguidos = indices.length >= 3 && indices.every((x, i) => i === 0 || x === indices[i - 1] + 1)
  const nomes = ordem.map((d) => d.nome.toLowerCase())
  const texto = seguidos ? `${nomes[0]} a ${nomes[nomes.length - 1]}` : listar(nomes)
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

export const descreverFaixa = (f) => `${rotuloMinutos(paraMinutos(f.de))} às ${rotuloMinutos(paraMinutos(f.ate))}`

// Frase de leitura do gráfico, conforme a métrica
export function leituraDoMovimento(mov, metrica) {
  if (metrica === 'ticket') {
    const pontos = mov.series.flatMap((s) => s.pontos).filter((x) => x.ticket != null)
    const menor = pontos.reduce((a, b) => (b.ticket < a.ticket ? b : a))
    const maior = pontos.reduce((a, b) => (b.ticket > a.ticket ? b : a))
    const nome = (x) => `${x.dia.nome.toLowerCase()} ${x.periodo.artigo === 'o' ? 'no' : 'na'} ${x.periodo.nome.toLowerCase()}`
    let frase = `O ticket médio vai de ${moeda(menor.ticket)} (${nome(menor)}) a ${moeda(maior.ticket)} (${nome(maior)}).`
    if (mov.contagem) frase += ` Com ${mov.total} pedidos em ${SEMANAS} semanas, cada ponto junta poucos pedidos e varia bastante.`
    return frase
  }
  const grupos = gruposDeBaixa(mov)
  if (!grupos.length) return `Nenhum dia fica abaixo de ${Math.round(LIMIAR_BAIXA * 100)}% da média do próprio período. O movimento está bem distribuído na semana.`
  const [g, ...resto] = grupos
  const dias = descreverDias(g.dias.map((d) => d.id)).toLowerCase()
  const qual = `${g.periodo.artigo} ${g.periodo.nome.toLowerCase()} de ${dias}`
  let frase = mov.contagem
    ? `O ponto mais fraco é ${qual}: ${g.pedidos === 0 ? 'nenhum pedido' : g.pedidos === 1 ? '1 pedido' : `${g.pedidos} pedidos`} em ${SEMANAS} semanas, somando esses dias.`
    : `O ponto mais fraco é ${qual}: ${formatarPedidos(mov, g.valor)}, contra ${decimal(g.media, 1)} na média da semana.`
  const outros = resto.reduce((s, x) => s + x.pontos.length, 0)
  if (outros === 1) frase += ' Mais um dia, em outro período, também fica abaixo do normal.'
  if (outros > 1) frase += ` Outros ${outros} dias, em outros períodos, também ficam abaixo do normal.`
  return frase
}

// Sugestão para o assistente: dias e período do grupo mais forte de baixa
export function sugestaoDeHorario(mov) {
  const [g] = gruposDeBaixa(mov)
  if (!g) return null
  return { dias: g.dias.map((d) => d.id), faixas: [{ de: deMinutos(g.periodo.de), ate: deMinutos(g.periodo.ate) }], periodo: g.periodo, valor: g.valor, contagem: mov.contagem, pedidos: g.pedidos }
}

// ---------- Regras ----------
const dia = (d) => new Date(2026, 9, d)
const setembro = (d) => new Date(2026, 8, d)

function regrasIniciais(cenarioId) {
  if (cenarioId === 'pequena') {
    return [
      {
        id: 'r-tarde-pastel', nome: 'Tarde do pastel', dias: ['ter', 'qua', 'qui'], faixas: [{ de: '15:00', ate: '17:00' }],
        desconto: 15, alvo: { modo: 'categorias', itens: ['categoria:Pastéis salgados'] }, lojas: 'todas',
        estado: 'ativa', inicio: dia(6), resultado: null,
      },
      {
        id: 'r-caldo-noite', nome: 'Caldo de cana no fim do dia', dias: ['seg', 'ter', 'qua', 'qui'], faixas: [{ de: '21:00', ate: '22:00' }],
        desconto: 10, alvo: { modo: 'produtos', itens: ['produto:Caldo de cana 500 ml'] }, lojas: 'todas',
        estado: 'pausada', inicio: setembro(1), resultado: { semanas: 4, pedidos: 11, pedidosAntes: 7 },
      },
    ]
  }
  if (cenarioId === 'rede') {
    return [
      {
        id: 'r-segunda-pizza', nome: 'Começo de semana', dias: ['seg', 'ter'], faixas: [{ de: '18:00', ate: '19:00' }],
        desconto: 20, alvo: { modo: 'categorias', itens: ['categoria:Pizzas'] }, lojas: 'todas',
        estado: 'ativa', inicio: setembro(1), resultado: { semanas: 5, pedidos: 1412, pedidosAntes: 1038 },
      },
      {
        id: 'r-fim-noite', nome: 'Fim de noite', dias: ['seg', 'ter', 'qua', 'qui'], faixas: [{ de: '22:30', ate: '23:30' }],
        desconto: 15, alvo: { modo: 'exceto', itens: ['categoria:Bebidas'] }, lojas: [2106, 2109, 2111, 2112],
        estado: 'agendada', inicio: dia(12), resultado: null,
      },
    ]
  }
  return []
}

// Guardadas por cenário enquanto a página não recarrega (lista e assistente leem daqui)
const salvas = {}
export function regrasDoCenario(cenarioId) {
  if (!salvas[cenarioId]) salvas[cenarioId] = regrasIniciais(cenarioId)
  return salvas[cenarioId]
}
export function guardarRegras(cenarioId, regras) {
  salvas[cenarioId] = regras
}

// Na loja da rede, a regra que vale para todas mostra a parte daquela loja
export function resultadoNaLoja(regra, cen, lojaId, emRede) {
  const r = regra.resultado
  if (!r || !cen.rede || emRede || regra.lojas !== 'todas') return r
  const n = cen.lojas.filter((l) => !l.teste).length
  const f = fatorLoja(cen, lojaId) / n
  return { ...r, pedidos: Math.round(r.pedidos * f), pedidosAntes: Math.round(r.pedidosAntes * f) }
}

// Resultado só com 2 semanas ou mais de regra valendo
export function motivoSemResultado(regra) {
  const dias = Math.floor((AGORA_REFERENCIA - regra.inicio) / 86400000)
  const inicio = `${String(regra.inicio.getDate()).padStart(2, '0')}/${String(regra.inicio.getMonth() + 1).padStart(2, '0')}`
  if (dias < 0) return `Começa em ${inicio}. O resultado aparece depois de 2 semanas valendo.`
  if (dias < 14 || !regra.resultado) return `Começou em ${inicio}, há menos de 2 semanas. O resultado aparece depois de 2 semanas valendo.`
  return null
}
