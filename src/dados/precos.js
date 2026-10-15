// Promoções automáticas ("precificação volátil"): mapa de movimento das últimas 8 semanas
// e regras de desconto nos horários de baixa. Números fictícios e determinísticos.
import { AGORA_REFERENCIA, decimal } from '../utilitarios/formatos.js'

export const SEMANAS = 8
// Horário de baixa: abaixo de 50% da média da loja
export const LIMIAR_BAIXA = 0.5

export const DIAS = [
  { id: 'seg', nome: 'Segunda', curto: 'Seg' },
  { id: 'ter', nome: 'Terça', curto: 'Ter' },
  { id: 'qua', nome: 'Quarta', curto: 'Qua' },
  { id: 'qui', nome: 'Quinta', curto: 'Qui' },
  { id: 'sex', nome: 'Sexta', curto: 'Sex' },
  { id: 'sab', nome: 'Sábado', curto: 'Sáb' },
  { id: 'dom', nome: 'Domingo', curto: 'Dom' },
]

// Faixas de uma hora dentro do funcionamento (minhaloja.js): 11h–22h na pastelaria, 18h–23h30 na pizzaria
const faixa = (h, fimMin = 60) => ({ id: h, de: h * 60, ate: h * 60 + fimMin, duracao: fimMin / 60 })
export function faixasDoCenario(cenarioId) {
  if (cenarioId === 'rede') return [18, 19, 20, 21, 22].map((h) => faixa(h)).concat(faixa(23, 30))
  // Loja pequena (cerca de 31 pedidos por mês): abaixo do volume mínimo a forma muda (regra do Analítico).
  // Em vez de hora a hora, turnos: almoço 11h–15h, tarde 15h–18h, noite 18h–22h, com contagens.
  return [faixa(11, 240), faixa(15, 180), faixa(18, 240)]
}

// "15h", "23h30"
export const rotuloMinutos = (m) => `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, '0') : ''}`
// "15:00" <-> 900
export const paraMinutos = (s) => {
  const [h, m] = s.split(':').map(Number)
  return h * 60 + m
}
export const deMinutos = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

// Ruído determinístico em [-1, 1]
function ruido(semente, a, b) {
  let x = Math.sin(semente * 12.9898 + a * 78.233 + b * 37.719) * 43758.5453
  x -= Math.floor(x)
  return x * 2 - 1
}

// Pedidos por hora esperados (perfil) e peso de cada dia, de segunda a domingo
const PERFIL = {
  pequena: {
    // pedidos por hora em cada turno; somam uns 31 pedidos por mês, como na seção 10 da especificação
    hora: { 11: 0.12, 15: 0.04, 18: 0.13 },
    dia: [0.9, 0.85, 0.85, 0.95, 1.2, 1.35, 1.15],
    // terça e quarta à tarde: a baixa que a "Tarde do pastel" ataca (somas das 8 semanas)
    fixos: { 'ter-15': 0, 'qua-15': 0 },
    minimo: 0,
  },
  rede: {
    hora: { 18: 2.3, 19: 4.0, 20: 4.6, 21: 3.6, 22: 2.3, 23: 1.4 },
    dia: [0.72, 0.76, 0.86, 0.92, 1.3, 1.45, 1.2],
    fixos: {},
    minimo: 0,
  },
}

function movimentoDeUmaLoja(cenarioId, semente, fator = 1) {
  const perfil = PERFIL[cenarioId === 'rede' ? 'rede' : 'pequena']
  const faixas = faixasDoCenario(cenarioId)
  return DIAS.map((d, i) =>
    faixas.map((f) => {
      const fixo = perfil.fixos[`${d.id}-${f.id}`]
      if (fixo != null && fator === 1) return fixo
      const esperado = perfil.hora[f.id] * perfil.dia[i] * f.duracao * SEMANAS * fator
      return Math.max(perfil.minimo, Math.round(esperado + ruido(semente, i, f.id) * Math.max(1, esperado * 0.08)))
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

// Mapa: somas das 8 semanas por dia × faixa, a média por hora de cada célula e a média da loja
export function movimento(cen, lojaId, emRede) {
  if (cen.lojaNova) return null
  const faixas = faixasDoCenario(cen.id)
  let somas
  if (!cen.rede) somas = movimentoDeUmaLoja(cen.id, 1001)
  else if (!emRede) somas = movimentoDeUmaLoja(cen.id, lojaId, fatorLoja(cen, lojaId))
  else {
    const lojas = cen.lojas.filter((l) => !l.teste)
    const porLoja = lojas.map((l) => movimentoDeUmaLoja(cen.id, l.id, fatorLoja(cen, l.id)))
    somas = DIAS.map((_, i) => faixas.map((_, j) => porLoja.reduce((s, m) => s + m[i][j], 0)))
  }
  const celulas = DIAS.map((d, i) =>
    faixas.map((f, j) => ({ dia: d, faixa: f, soma: somas[i][j], porHora: somas[i][j] / SEMANAS / f.duracao })),
  )
  const todas = celulas.flat()
  const horasSemana = faixas.reduce((s, f) => s + f.duracao, 0) * DIAS.length
  const mediaLoja = todas.reduce((s, c) => s + c.soma, 0) / SEMANAS / horasSemana
  const maximo = Math.max(...todas.map((c) => c.porHora))
  todas.forEach((c) => {
    c.baixa = c.porHora < mediaLoja * LIMIAR_BAIXA
    c.degrau = Math.min(4, Math.floor((c.porHora / maximo) * 5))
  })
  // baixo volume: mostra contagens das 8 semanas por turno, sem média por hora
  const contagem = !cen.rede
  const mediaCelula = todas.reduce((s, c) => s + c.soma, 0) / todas.length
  const maximoSoma = Math.max(...todas.map((c) => c.soma), 1)
  if (contagem) todas.forEach((c) => {
    c.baixa = c.soma < mediaCelula * LIMIAR_BAIXA
    c.degrau = Math.min(4, Math.floor((c.soma / maximoSoma) * 5))
  })
  return { faixas, celulas, mediaLoja, maximo, contagem, mediaCelula, maximoSoma, totalSemana: todas.reduce((s, c) => s + c.soma, 0) / SEMANAS }
}

const listar = (nomes) => new Intl.ListFormat('pt-BR', { style: 'long', type: 'conjunction' }).format(nomes)
const pedidosPorHora = (v) => `${decimal(v, 1)} ${v < 2 ? 'pedido' : 'pedidos'} por hora`

// Agrupa os horários de baixa: faixas seguidas no mesmo dia, depois dias com a mesma faixa
export function gruposDeBaixa(mov) {
  if (!mov) return []
  const porFaixa = {}
  mov.celulas.forEach((linha) => {
    let atual = null
    linha.forEach((c) => {
      if (!c.baixa) {
        atual = null
        return
      }
      if (atual && atual.ate === c.faixa.de) {
        atual.ate = c.faixa.ate
        atual.celulas.push(c)
      } else {
        atual = { dia: c.dia, de: c.faixa.de, ate: c.faixa.ate, celulas: [c] }
        const chave = `${atual.de}`
        ;(porFaixa[chave] ||= []).push(atual)
      }
    })
  })
  // junta dias com exatamente a mesma faixa
  const grupos = []
  Object.values(porFaixa).forEach((trechos) => {
    const mapa = {}
    trechos.forEach((t) => {
      const k = `${t.de}-${t.ate}`
      ;(mapa[k] ||= { de: t.de, ate: t.ate, dias: [], celulas: [] })
      mapa[k].dias.push(t.dia)
      mapa[k].celulas.push(...t.celulas)
    })
    grupos.push(...Object.values(mapa))
  })
  grupos.forEach((g) => {
    const horas = g.celulas.reduce((s, c) => s + c.faixa.duracao, 0) * SEMANAS
    g.porHora = g.celulas.reduce((s, c) => s + c.soma, 0) / horas
  })
  return grupos.sort((a, b) => b.celulas.length - a.celulas.length || a.porHora - b.porHora)
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

// Frase de leitura do mapa
// Valor exibido de uma célula: contagem (baixo volume) ou média por hora
export const valorCelula = (mov, c) => (mov.contagem ? String(c.soma) : decimal(c.porHora, 1))
export const unidadeValor = (mov) => (mov.contagem ? `pedidos em ${SEMANAS} semanas` : 'pedidos por hora, em média')

export function leituraDoMovimento(mov) {
  const grupos = gruposDeBaixa(mov)
  if (mov.contagem) {
    const total = mov.celulas.flat().reduce((s, c) => s + c.soma, 0)
    if (!grupos.length) return `${total} pedidos nas últimas ${SEMANAS} semanas, bem distribuídos entre os turnos.`
    const [g] = grupos
    const pedidos = g.celulas.reduce((s, c) => s + c.soma, 0)
    const dias = descreverDias(g.dias.map((d) => d.id)).toLowerCase()
    return `Com ${total} pedidos em ${SEMANAS} semanas, o mapa mostra contagens por turno, não médias por hora. O turno mais fraco é o das ${rotuloMinutos(g.de)} às ${rotuloMinutos(g.ate)} (${dias}): ${pedidos === 0 ? 'nenhum pedido' : pedidos === 1 ? '1 pedido' : `${pedidos} pedidos`} no período, somando esses dias.`
  }
  if (!grupos.length) return `Nenhum horário fica abaixo da metade da média da loja (${pedidosPorHora(mov.mediaLoja)}). O movimento está bem distribuído.`
  const [g, ...resto] = grupos
  const dias = descreverDias(g.dias.map((d) => d.id)).toLowerCase()
  let frase = `Seus horários mais fracos são ${dias} das ${rotuloMinutos(g.de)} às ${rotuloMinutos(g.ate)}: ${pedidosPorHora(g.porHora)} em média.`
  const outras = resto.reduce((s, x) => s + x.celulas.length, 0)
  if (outras === 1) frase += ' Mais uma faixa também fica abaixo da metade da média.'
  if (outras > 1) frase += ` Outras ${outras} faixas também ficam abaixo da metade da média.`
  return frase
}

// Sugestão para o assistente: dias e faixa do grupo mais forte de baixa
export function sugestaoDeHorario(mov) {
  const [g] = gruposDeBaixa(mov)
  if (!g) return null
  return { dias: g.dias.map((d) => d.id), faixas: [{ de: deMinutos(g.de), ate: deMinutos(g.ate) }], porHora: g.porHora, contagem: mov.contagem, pedidos: g.celulas.reduce((s, c) => s + c.soma, 0) }
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
