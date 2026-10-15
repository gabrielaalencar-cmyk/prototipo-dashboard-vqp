// Formatos da seção 9: moeda "R$ 1.284,50"; datas "13/10, 19:56" ou "hoje, 19:56"; durações "32 min".

const moedaFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const numeroFmt = new Intl.NumberFormat('pt-BR')

export const moeda = (v) => (v == null ? '—' : moedaFmt.format(v).replace(/ /g, ' '))
export const numero = (v) => (v == null ? '—' : numeroFmt.format(v))
export const percentual = (v, casas = 1) =>
  v == null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(casas).replace('.', ',')}%`
export const decimal = (v, casas = 1) => (v == null ? '—' : v.toFixed(casas).replace('.', ','))

// Data de referência do protótipo: sexta-feira, 9/10/2026, 19:42
export const AGORA_REFERENCIA = new Date(2026, 9, 9, 19, 42, 0)

const doisDigitos = (n) => String(n).padStart(2, '0')
export const hora = (d) => `${doisDigitos(d.getHours())}:${doisDigitos(d.getMinutes())}`
export const diaMes = (d) => `${doisDigitos(d.getDate())}/${doisDigitos(d.getMonth() + 1)}`

export function mesmoDia(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function dataCurta(d, referencia = AGORA_REFERENCIA) {
  if (mesmoDia(d, referencia)) return `hoje, ${hora(d)}`
  const ontem = new Date(referencia)
  ontem.setDate(ontem.getDate() - 1)
  if (mesmoDia(d, ontem)) return `ontem, ${hora(d)}`
  return `${diaMes(d)}, ${hora(d)}`
}

const DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

export const dataExtenso = (d) => `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`
export const nomeMes = (i) => MESES[i]

export function minutosEntre(a, b) {
  return Math.round((b - a) / 60000)
}

export function ha(minutos) {
  if (minutos < 1) return 'há menos de 1 min'
  if (minutos < 60) return `há ${minutos} min`
  const h = Math.floor(minutos / 60)
  return `há ${h} h${minutos % 60 ? ` ${minutos % 60} min` : ''}`
}

// Plural simples: plural(3, 'pedido', 'pedidos')
export const plural = (n, um, varios) => `${numero(n)} ${n === 1 ? um : varios}`

export function nomeArquivo(partes) {
  return partes
    .join('_')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .toLowerCase()
}

// Gera e baixa um CSV com loja, período e data de geração no nome e na primeira linha
export function baixarCsv({ loja, periodo, tipo, cabecalho, linhas }) {
  const geracao = `${diaMes(AGORA_REFERENCIA)}/${AGORA_REFERENCIA.getFullYear()} ${hora(AGORA_REFERENCIA)}`
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const conteudo = [
    [`Loja: ${loja}`, `Período: ${periodo}`, `Gerado em: ${geracao}`].map(esc).join(';'),
    cabecalho.map(esc).join(';'),
    ...linhas.map((l) => l.map(esc).join(';')),
  ].join('\n')
  const blob = new Blob(['﻿' + conteudo], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${nomeArquivo([tipo, loja, periodo, '2026-10-09'])}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
