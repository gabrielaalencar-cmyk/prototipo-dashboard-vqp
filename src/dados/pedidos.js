// Pedidos fictícios. Grupos de status: 'andamento' | 'concluido' | 'cancelado' | 'atencao'
import { SABORES_PIZZA } from './cardapios.js'

const d = (dia, h, m) => new Date(2026, 9, dia, h, m)
const somaMin = (data, min) => new Date(data.getTime() + min * 60000)

export const NOMES = [
  'Mariana Duarte', 'Rafael Siqueira', 'Juliana Prado', 'Thiago Moreira', 'Camila Rezende', 'Bruno Teixeira',
  'Larissa Fontes', 'Diego Amaral', 'Patrícia Lacerda', 'Felipe Castanho', 'Renata Bastos', 'Gustavo Paiva',
  'Aline Moura', 'Vinícius Coelho', 'Beatriz Arruda', 'Leonardo Falcão', 'Sofia Rangel', 'Marcelo Viana',
  'Natália Brito', 'Eduardo Peixoto', 'Helena Quintela', 'Otávio Sampaio', 'Lívia Mendonça', 'Caio Barreto',
  'Isabela Furtado', 'Henrique Lobato', 'Yasmin Cordeiro', 'André Valadares', 'Clara Nogueira', 'Pedro Albuquerque',
]

const RUAS = ['Rua das Acácias', 'Rua dos Ipês', 'Av. das Hortênsias', 'Rua Projetada Dois', 'Rua do Mirante', 'Al. dos Sabiás', 'Rua das Pitangueiras', 'Rua Monte Claro']

export const PAGAMENTOS_ONLINE = ['Pix online', 'Cartão de crédito online']

// Linha do tempo completa conforme o desfecho
function linhaDoTempo(criado, modalidade, status) {
  const ev = [{ quando: criado, texto: 'Pedido recebido' }]
  if (status === 'Cancelado pelo cliente') {
    ev.push({ quando: somaMin(criado, 4), texto: 'Cancelado pelo cliente', detalhe: 'Motivo informado: "Pedi errado"' })
    return ev
  }
  if (status === 'Cancelado pela loja') {
    ev.push({ quando: somaMin(criado, 6), texto: 'Cancelado pela loja', detalhe: 'Motivo informado: "Item em falta"' })
    return ev
  }
  ev.push({ quando: somaMin(criado, 2), texto: 'Pedido aceito' })
  ev.push({ quando: somaMin(criado, 3), texto: 'Em preparo' })
  if (status === 'Em preparo') return ev
  if (modalidade === 'Delivery') {
    ev.push({ quando: somaMin(criado, 22), texto: 'Pronto para entrega' })
    ev.push({ quando: somaMin(criado, 25), texto: 'Saiu para entrega' })
    if (status === 'Saiu para entrega') return ev
    ev.push({ quando: somaMin(criado, 41), texto: 'Entregue' })
  } else if (modalidade === 'Quero levar') {
    ev.push({ quando: somaMin(criado, 18), texto: 'Pronto para retirar' })
    if (status === 'Pronto para retirar') return ev
    ev.push({ quando: somaMin(criado, 27), texto: 'Retirado pelo cliente' })
  } else {
    ev.push({ quando: somaMin(criado, 16), texto: 'Servido na mesa' })
    if (status === 'Servido na mesa') return ev
    ev.push({ quando: somaMin(criado, 48), texto: 'Conta fechada' })
  }
  return ev
}

const STATUS_GRUPO = {
  'Em preparo': 'andamento',
  'Saiu para entrega': 'andamento',
  'Pronto para retirar': 'andamento',
  'Servido na mesa': 'andamento',
  Entregue: 'concluido',
  'Retirado pelo cliente': 'concluido',
  'Conta fechada': 'concluido',
  'Cancelado pelo cliente': 'cancelado',
  'Cancelado pela loja': 'cancelado',
}

export const GRUPOS_STATUS = {
  andamento: { rotulo: 'Em andamento', tom: 'azul' },
  concluido: { rotulo: 'Concluído', tom: 'verde' },
  cancelado: { rotulo: 'Cancelado', tom: 'cinza' },
  atencao: { rotulo: 'Precisa de atenção', tom: 'vermelho' },
}

export function telefoneMascarado(final) {
  return `(11) 9••••-${final}`
}

function montarPedido({ numero, criado, cliente, idxCliente, modalidade, pagamento, status, itens, taxa = 0, desconto = 0, cupom, parado, avaliacao, estorno, rua }) {
  const subtotal = itens.reduce((s, i) => s + i.preco * i.qtd, 0)
  const total = Math.round((subtotal + taxa - desconto) * 100) / 100
  const grupo = parado ? 'atencao' : STATUS_GRUPO[status]
  const tempo = linhaDoTempo(criado, modalidade, status)
  return {
    numero,
    criado,
    cliente: {
      nome: cliente,
      telefone: telefoneMascarado(String(1000 + ((idxCliente * 7919) % 9000)).slice(-4)),
      cpf: `•••.•••.•••-${String(10 + ((idxCliente * 37) % 89))}`,
      email: `${cliente.split(' ')[0].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')[0]}•••@•••.com`,
      pedidosNaLoja: 1 + ((idxCliente * 3) % 9),
    },
    modalidade,
    pagamento,
    status: parado ? status : status,
    grupo,
    parado,
    itens,
    subtotal,
    taxa,
    desconto,
    cupom,
    total,
    endereco: modalidade === 'Delivery' ? `${rua || RUAS[idxCliente % RUAS.length]}, ••• · apto ••` : null,
    linhaDoTempo: tempo,
    avaliacao,
    estorno,
  }
}

const it = (qtd, nome, preco, complementos = [], obs) => ({ qtd, nome, preco, complementos, obs })

// Cenário A: 12 pedidos dos últimos 7 dias. Os 11 válidos de outubro somam R$ 586,00; hoje, R$ 172,40.
export function pedidosPastelaria() {
  const c = (n) => [NOMES[n], n]
  const lista = [
    { numero: 1093, criado: d(9, 19, 16), cli: c(1), modalidade: 'Delivery', pagamento: 'Pix online', status: 'Em preparo', parado: { minutos: 26, etapa: 'Em preparo' }, taxa: 8, itens: [it(1, 'Pastel de carne', 14), it(1, 'Pastel de calabresa com queijo', 15, [], 'Sem cebola, por favor'), it(1, 'Caldo de cana 500 ml', 9)] },
    { numero: 1092, criado: d(9, 19, 1), cli: c(2), modalidade: 'Delivery', pagamento: 'Cartão de crédito online', status: 'Saiu para entrega', taxa: 5, itens: [it(1, 'Pastel de carne', 14), it(1, 'Pastel de queijo', 13), it(1, 'Caldo de cana 500 ml', 9)] },
    { numero: 1091, criado: d(9, 18, 22), cli: c(0), modalidade: 'Delivery', pagamento: 'Pix online', status: 'Entregue', taxa: 8, desconto: 4.6, cupom: 'VOLTA10', itens: [it(1, 'Pastel romeu e julieta', 12.5), it(1, 'Pastel de pizza', 14.5), it(1, 'Pastel de calabresa com queijo', 15), it(1, 'Água sem gás', 4)] },
    { numero: 1090, criado: d(9, 12, 10), cli: c(3), modalidade: 'Comer aqui', pagamento: 'Cartão na loja', status: 'Conta fechada', itens: [it(1, 'Mini pastéis (12 un.)', 32, ['Carne', 'Queijo', 'Palmito']), it(1, 'Água sem gás', 4)] },
    { numero: 1089, criado: d(8, 21, 5), cli: c(4), modalidade: 'Delivery', pagamento: 'Pix online', status: 'Entregue', taxa: 8, itens: [it(1, 'Mini pastéis (12 un.)', 32, ['Frango', 'Milho', 'Calabresa']), it(1, 'Coxinha (6 un.)', 24)] },
    { numero: 1088, criado: d(8, 20, 12), cli: c(5), modalidade: 'Delivery', pagamento: 'Cartão de crédito online', status: 'Entregue', taxa: 5, avaliacao: { nota: 2, comentario: 'O pastel chegou frio.', quando: d(8, 21, 30) }, itens: [it(1, 'Pastel de frango com catupiry', 15.5), it(1, 'Pastel de palmito', 16), it(2, 'Refrigerante lata', 6.5)] },
    { numero: 1087, criado: d(8, 19, 40), cli: c(6), modalidade: 'Delivery', pagamento: 'Dinheiro na entrega', status: 'Cancelado pelo cliente', taxa: 5, itens: [it(1, 'Pastel de calabresa com queijo', 15), it(1, 'Pastel de queijo', 13)] },
    { numero: 1086, criado: d(7, 20, 30), cli: c(7), modalidade: 'Quero levar', pagamento: 'Pix online', status: 'Retirado pelo cliente', itens: [it(1, 'Monte seu pastel', 14, ['Carne', 'Queijo', 'Milho']), it(1, 'Pastel de carne', 14), it(2, 'Caldo de cana 500 ml', 9)] },
    { numero: 1085, criado: d(6, 19, 55), cli: c(8), modalidade: 'Delivery', pagamento: 'Cartão na entrega', status: 'Entregue', taxa: 0, itens: [it(1, 'Mini pastéis (12 un.)', 32, ['Carne', 'Presunto', 'Queijo']), it(1, 'Batata frita', 22), it(1, 'Pastel de calabresa com queijo', 15), it(1, 'Pastel de queijo', 13)] },
    { numero: 1084, criado: d(5, 20, 18), cli: c(9), modalidade: 'Delivery', pagamento: 'Pix online', status: 'Entregue', taxa: 8, estorno: { valor: 12, motivo: 'Item faltando: pastel de chocolate', estado: 'concluido', pedidoEm: d(5, 21, 40), concluidoEm: d(6, 10, 15) }, itens: [it(1, 'Pastel de carne', 14), it(1, 'Pastel de pizza', 14.5), it(1, 'Pastel de chocolate', 12), it(1, 'Caldo de cana 500 ml', 9)] },
    { numero: 1083, criado: d(4, 13, 2), cli: c(10), modalidade: 'Comer aqui', pagamento: 'Cartão na loja', status: 'Conta fechada', itens: [it(1, 'Mini pastéis (12 un.)', 32, ['Carne', 'Queijo', 'Frango']), it(1, 'Caldo de cana 500 ml', 9), it(1, 'Pastel de banana com canela', 11)] },
    { numero: 1082, criado: d(3, 19, 47), cli: c(11), modalidade: 'Delivery', pagamento: 'Pix online', status: 'Entregue', taxa: 5, desconto: 6.4, cupom: 'VOLTA10', itens: [it(1, 'Mini pastéis (12 un.)', 32, ['Calabresa', 'Queijo', 'Tomate e orégano']), it(1, 'Coxinha (6 un.)', 24), it(2, 'Água sem gás', 4)] },
  ]
  return lista.map(({ cli, ...r }) => montarPedido({ ...r, cliente: cli[0], idxCliente: cli[1] }))
}

// Gerador determinístico para as lojas da rede
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

const PIZZAS = [
  ['Pizza grande, 1 sabor', 69.9, 1],
  ['Pizza grande, 2 sabores', 74.9, 2],
  ['Pizza média', 58.9, 1],
  ['Pizza broto', 39.9, 1],
  ['Pizza família, 3 sabores', 92.9, 3],
  ['Calzone', 46.9, 1],
]
const EXTRAS = [
  ['Refrigerante 2 L', 15.9], ['Guaraná lata', 7.5], ['Pão de alho', 18.9], ['Petit gâteau', 24.9],
  ['Esfiha de carne', 7.9], ['Suco de laranja 500 ml', 12.9], ['Cerveja long neck', 11.9], ['Bruschetta tradicional', 24.9],
]
const BORDAS = [['Borda catupiry', 9], ['Borda cheddar', 9]]

// Gera pedidos dos últimos 7 dias para uma loja da rede
export function pedidosLojaRede(loja) {
  const r = aleatorio(loja.semente)
  const escolha = (arr) => arr[Math.floor(r() * arr.length)]
  const pedidos = []
  let numero = loja.baseNumero
  for (let dia = 3; dia <= 9; dia++) {
    const quantos = dia === 9 ? loja.hoje.pedidos : Math.round(loja.mediaDia * (0.75 + r() * 0.5))
    const horarios = []
    for (let i = 0; i < quantos; i++) {
      // concentra no jantar; lojas que fecharam à tarde só têm almoço hoje
      const almoco = (dia === 9 && loja.soAlmocoHoje) || r() < 0.22
      let h = almoco ? 11 + r() * 3.5 : 18 + r() * 4.5
      if (dia === 9 && !almoco) h = 18 + r() * 1.66 // até 19:40
      horarios.push(h)
    }
    horarios.sort((a, b) => a - b)
    horarios.forEach((h, i) => {
      const criado = d(dia, Math.floor(h), Math.floor((h % 1) * 60))
      const modalidade = r() < 0.68 ? 'Delivery' : r() < 0.7 ? 'Quero levar' : 'Comer aqui'
      const pagamento = modalidade === 'Delivery'
        ? escolha(['Pix online', 'Pix online', 'Cartão de crédito online', 'Cartão de crédito online', 'Cartão na entrega', 'Dinheiro na entrega', 'Vale-refeição na entrega'])
        : escolha(['Pix online', 'Cartão de crédito online', 'Cartão na loja', 'Cartão na loja'])
      const [pz, preco, nSab] = escolha(PIZZAS)
      const sabores = Array.from({ length: nSab }, () => escolha(SABORES_PIZZA))
      const itens = [it(1, pz, preco, [...new Set(sabores)])]
      if (r() < 0.35) itens[0].complementos.push(escolha(BORDAS)[0])
      if (r() < 0.6) itens.push(it(1, ...escolha(EXTRAS)))
      if (r() < 0.25) itens.push(it(2, 'Guaraná lata', 7.5))
      const restante = quantos - i
      let status
      if (dia < 9) status = modalidade === 'Delivery' ? 'Entregue' : modalidade === 'Quero levar' ? 'Retirado pelo cliente' : 'Conta fechada'
      else if (restante <= loja.hoje.emAndamento) status = modalidade === 'Delivery' ? (r() < 0.5 ? 'Em preparo' : 'Saiu para entrega') : modalidade === 'Quero levar' ? 'Em preparo' : 'Servido na mesa'
      else status = modalidade === 'Delivery' ? 'Entregue' : modalidade === 'Quero levar' ? 'Retirado pelo cliente' : 'Conta fechada'
      // hoje sem cancelamentos, para o total de hoje bater com o Analítico (186 na rede)
      if (dia < 9 && r() < loja.taxaCancelamento) status = r() < 0.6 ? 'Cancelado pelo cliente' : 'Cancelado pela loja'
      const idx = Math.floor(r() * NOMES.length)
      pedidos.push(
        montarPedido({
          numero: ++numero,
          criado,
          cliente: NOMES[idx],
          idxCliente: idx + loja.semente,
          modalidade,
          pagamento,
          status,
          itens,
          taxa: modalidade === 'Delivery' ? escolha([0, 6, 8, 10]) : 0,
        }),
      )
    })
  }
  return pedidos.reverse()
}

export { d as dataOutubro }
