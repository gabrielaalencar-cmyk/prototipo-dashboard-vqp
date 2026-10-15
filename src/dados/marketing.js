// Dados fictícios do grupo marketing: cupons (T20, T21), destaques e banners do app (T22) e relatórios (T25).
// Os cupons do cenário (cen.cupons) ganham aqui os detalhes que faltam; agendados e pausados completam a lista.

const data = (mes, dia, h = 0, m = 0) => new Date(2026, mes - 1, dia, h, m)

export const OBJETIVOS = [
  { id: 'porcentagem', rotulo: 'Desconto em porcentagem', exemplo: '10% de desconto no pedido' },
  { id: 'reais', rotulo: 'Desconto em reais', exemplo: 'R$ 5,00 de desconto' },
  { id: 'frete', rotulo: 'Frete grátis', exemplo: 'Entrega sem custo para o cliente' },
  { id: 'primeiro', rotulo: 'Primeiro pedido', exemplo: 'Benefício para quem nunca pediu' },
  { id: 'produto', rotulo: 'Cupom de produto', exemplo: 'Um produto de presente ou desconto só em produtos escolhidos' },
]

export const SEGMENTOS = [
  'Clientes sem comprar há mais de 50 dias',
  'Quem nunca pediu',
  'Clientes que compraram 3 vezes ou mais',
  'Clientes do programa de fidelidade',
]

// Detalhes dos cupons que já existem em cen.cupons
const DETALHES = {
  VOLTA10: { objetivo: 'porcentagem', tipo: 'porcentagem', valor: 10, pedidoMinimo: 30, publico: SEGMENTOS[0], inicio: data(9, 20), usosPorCliente: 1, descontoConcedido: 31.4, faturamento: 318.6 },
  PRIMEIRA: { objetivo: 'primeiro', tipo: 'frete', valor: null, pedidoMinimo: null, publico: SEGMENTOS[1], inicio: data(9, 1), usosPorCliente: 1, descontoConcedido: 21, faturamento: 142.5 },
  FERIAS: { objetivo: 'porcentagem', tipo: 'porcentagem', valor: 15, pedidoMinimo: null, publico: null, inicio: data(7, 1), descontoConcedido: 86.7, faturamento: 578 },
  PIZZA20: { objetivo: 'porcentagem', tipo: 'porcentagem', valor: 20, pedidoMinimo: null, publico: null, inicio: data(10, 1), lojas: 'todas', descontoConcedido: 3412.8, faturamento: 19840 },
  BORDAGRATIS: { objetivo: 'reais', tipo: 'reais', valor: 12, pedidoMinimo: 90, publico: null, inicio: data(9, 15), lojas: [2101, 2102, 2103, 2104, 2105, 2107, 2108, 2110], descontoConcedido: 1152, faturamento: 10370 },
}

// Cupons que completam as abas Agendados, Pausados e Expirados
const EXTRAS = {
  pequena: [
    { codigo: 'CRIANCAS', descricao: '20% nos pastéis doces', objetivo: 'porcentagem', tipo: 'porcentagem', valor: 20, categorias: ['Pastéis doces'], estado: 'agendado', inicio: data(10, 12), expira: data(10, 12, 23, 59), usos: 0, descontoConcedido: 0, faturamento: 0 },
    { codigo: 'CALDOGRATIS', descricao: 'Caldo de cana 500 ml de presente acima de R$ 50,00', objetivo: 'produto', tipo: 'brinde', valor: null, pedidoMinimo: 50, produtos: ['produto:Caldo de cana 500 ml'], dias: ['Segunda', 'Terça'], estado: 'agendado', inicio: data(10, 13), expira: data(11, 10, 23, 59), usos: 0, usosPorCliente: 1, descontoConcedido: 0, faturamento: 0 },
    { codigo: 'COMBO5', descricao: 'R$ 5,00 de desconto acima de R$ 40,00', objetivo: 'reais', tipo: 'reais', valor: 5, pedidoMinimo: 40, estado: 'pausado', inicio: data(9, 15), expira: data(11, 30, 23, 59), usos: 4, descontoConcedido: 20, faturamento: 196 },
  ],
  nova: [],
  rede: [
    { codigo: 'VOLTEI', descricao: '10% para quem voltou', objetivo: 'porcentagem', tipo: 'porcentagem', valor: 10, publico: SEGMENTOS[0], lojas: 'todas', estado: 'ativo', inicio: data(9, 25), expira: data(11, 30, 23, 59), usos: 41, usosPorCliente: 1, descontoConcedido: 287.4, faturamento: 3120 },
    { codigo: 'REFRI2L', descricao: 'Refrigerante 2 L de presente na pizza família', objetivo: 'produto', tipo: 'brinde', valor: null, produtos: ['produto:Refrigerante 2 L'], restricaoCardapio: 'so', itensCardapio: ['produto:Pizza família, 3 sabores'], lojas: 'todas', estado: 'ativo', inicio: data(10, 1), expira: data(10, 31, 23, 59), usos: 63, usosPorCliente: 1, descontoConcedido: 829.5, faturamento: 5852.7 },
    { codigo: 'HALLOWEEN', descricao: '15% nas pizzas', objetivo: 'porcentagem', tipo: 'porcentagem', valor: 15, categorias: ['Pizzas'], lojas: 'todas', estado: 'agendado', inicio: data(10, 31), expira: data(10, 31, 23, 59), usos: 0, descontoConcedido: 0, faturamento: 0 },
    { codigo: 'SEGUNDOU', descricao: 'Frete grátis às segundas', objetivo: 'frete', tipo: 'frete', valor: null, dias: ['Segunda'], lojas: [2107, 2108, 2109, 2110], estado: 'pausado', inicio: data(9, 7), expira: data(12, 28, 23, 59), usos: 58, descontoConcedido: 406, faturamento: 4380 },
    { codigo: 'SETEMBRO15', descricao: '15% em pedidos acima de R$ 80,00, exceto bebidas', objetivo: 'porcentagem', tipo: 'porcentagem', valor: 15, pedidoMinimo: 80, restricaoCardapio: 'exceto', itensCardapio: ['categoria:Bebidas'], lojas: 'todas', estado: 'expirado', inicio: data(9, 1), expira: data(9, 30, 23, 59), usos: 389, descontoConcedido: 5240.5, faturamento: 34930 },
  ],
}

const PADRAO = {
  pedidoMinimo: null, publico: null, categorias: [], produtos: [], restricaoCardapio: null, itensCardapio: null, dias: [], horaDe: '', horaAte: '',
  lojas: 'todas', modalidades: [], limiteUsos: null, usosPorCliente: null,
}

export function cuponsIniciais(cen) {
  const base = cen.cupons.map((c) => ({ ...PADRAO, ...c, ...(DETALHES[c.codigo] || {}) }))
  const extras = (EXTRAS[cen.id] || []).map((c) => ({ ...PADRAO, ...c }))
  const editados = cuponsEditados[cen.id] || {}
  return [...base, ...extras].map((c) => editados[c.codigo] || c).concat(cuponsCriados[cen.id] || [])
}

// Cupons criados ou editados no assistente (T21) ficam aqui enquanto a página não é recarregada
export const cuponsCriados = { pequena: [], nova: [], rede: [] }
export const cuponsEditados = { pequena: {}, nova: {}, rede: {} }

export function cupomPorCodigo(cen, codigo) {
  if (!codigo) return null
  return cuponsIniciais(cen).find((c) => c.codigo.toUpperCase() === codigo.toUpperCase()) || null
}

// ---------- Destaques do app (T22) ----------
// foto: chave de FOTOS (fotosFontes.js); a arte é montada na tela com a paleta fixa do cenário (PALETAS_ARTE)
const DESTAQUES = {
  pequena: [
    { id: 'd1', titulo: 'Terça do pastel: 2 por R$ 25', descricao: 'Toda terça, em qualquer pastel salgado', foto: 'pastel-salgado', tipoLink: 'categoria', alvo: 'Pastéis salgados', inicio: data(10, 1), fim: data(10, 31), estado: 'ativo' },
    { id: 'd2', titulo: 'Volte e ganhe 10%', descricao: 'Use o cupom VOLTA10 até 11/10', foto: 'mini-pasteis', tipoLink: 'cupom', alvo: 'VOLTA10', inicio: data(9, 20), fim: data(10, 11), estado: 'ativo' },
    { id: 'd3', titulo: 'Coxinha crocante, 6 por R$ 24', descricao: 'Saindo quentinha na porção', foto: 'coxinha', tipoLink: 'produto', alvo: 'Coxinha (6 un.)', inicio: data(10, 12), fim: data(10, 25), estado: 'agendado' },
  ],
  nova: [],
  rede: [
    { id: 'd1', titulo: 'Pizza grande + refri 2 L', descricao: 'O combo da sexta, em todas as lojas', foto: 'pizza-inteira', tipoLink: 'produto', alvo: 'Pizza grande, 1 sabor', inicio: data(10, 1), fim: data(10, 31), estado: 'ativo' },
    { id: 'd2', titulo: 'Frete grátis acima de R$ 80', descricao: 'Pedindo pelo app, até domingo', foto: 'pizza-fatia', tipoLink: 'nenhum', alvo: '', inicio: data(10, 5), fim: data(10, 12), estado: 'ativo' },
    { id: 'd3', titulo: 'Sobremesas novas no cardápio', descricao: 'Petit gâteau, tiramisù e mais', foto: 'petit-gateau', tipoLink: 'categoria', alvo: 'Sobremesas', inicio: data(10, 5), fim: data(11, 5), estado: 'pausado' },
    { id: 'd4', titulo: 'Halloween no Forno de Pedra', descricao: '15% nas pizzas no dia 31', foto: 'calzone', tipoLink: 'cupom', alvo: 'HALLOWEEN', inicio: data(10, 28), fim: data(10, 31), estado: 'agendado' },
  ],
}

// Fotos que fazem sentido para a arte de cada tipo de loja
export const FOTOS_DESTAQUE = {
  pastelaria: [['pastel-salgado', 'Pastel'], ['mini-pasteis', 'Mini pastéis'], ['coxinha', 'Coxinha'], ['batata-frita', 'Batata frita'], ['caldo-de-cana', 'Caldo de cana'], ['suco-natural', 'Suco natural']],
  pizzaria: [['pizza-inteira', 'Pizza inteira'], ['pizza-fatia', 'Fatia de pizza'], ['calzone', 'Calzone'], ['esfiha', 'Esfiha'], ['lasanha', 'Lasanha'], ['petit-gateau', 'Petit gâteau'], ['refrigerante-lata', 'Refrigerante']],
}

export const destaquesIniciais = (cen) => (DESTAQUES[cen.id] || []).map((d) => ({ ...d }))

// Paleta fixa da arte simulada de cada restaurante. É conteúdo do restaurante, não interface:
// use só dentro da arte (destaque, banner, prévia), nunca em ficha ou rótulo da tela.
export const PALETAS_ARTE = {
  pastelaria: { fundo: '#9A3412', texto: '#FFF4E0', botaoFundo: '#FFF4E0', botaoTexto: '#7C2D12' },
  pizzaria: { fundo: '#9C3B2A', texto: '#FBF1E1', botaoFundo: '#FBF1E1', botaoTexto: '#7A2C1F' },
}
export const tipoArte = (cen) => (cen.rede ? 'pizzaria' : 'pastelaria')
export const paletaArte = (cen) => PALETAS_ARTE[tipoArte(cen)]

// ---------- Banners (pop-up) do app (T22, aba ?tipo=banner) ----------
export const FREQUENCIAS_BANNER = [
  { id: 'uma-vez-cliente', rotulo: 'Uma vez por cliente', detalhe: 'Depois de visto ou fechado, não aparece mais para aquele cliente.' },
  { id: 'uma-vez-dia', rotulo: 'Uma vez por dia', detalhe: 'Aparece na primeira abertura do dia.' },
  { id: 'toda-vez', rotulo: 'Toda vez que abrir o app', detalhe: 'Use com cuidado: pode incomodar quem abre o app várias vezes.' },
]
export const ONDE_BANNER = [
  { id: 'ambos', rotulo: 'App e cardápio web' },
  { id: 'app', rotulo: 'Só no app' },
  { id: 'web', rotulo: 'Só no cardápio web' },
]

// publico: 'todos' ou o id de um segmento de SEGMENTOS_LISTA (vendas.js)
// botao.tipo: categoria | produto | cupom | web
const BANNERS = {
  pequena: [
    {
      id: 'b1', titulo: 'Bem-vindo! Frete grátis no 1º pedido', texto: 'Use o cupom PRIMEIRA no seu primeiro pedido pelo app.', foto: 'pastel-salgado',
      botao: { rotulo: 'Usar o cupom', tipo: 'cupom', alvo: 'PRIMEIRA' }, inicio: data(10, 1), fim: data(10, 31),
      frequencia: 'uma-vez-cliente', publico: 'novos', onde: 'ambos', estado: 'ativo',
    },
    {
      id: 'b2', titulo: 'Que saudade! Volte e ganhe 10%', texto: 'O cupom VOLTA10 vale até domingo, em qualquer pedido acima de R$ 30.', foto: 'mini-pasteis',
      botao: { rotulo: 'Usar o VOLTA10', tipo: 'cupom', alvo: 'VOLTA10' }, inicio: data(9, 20), fim: data(10, 11),
      frequencia: 'uma-vez-dia', publico: 'afastando', onde: 'app', estado: 'ativo',
    },
    {
      id: 'b3', titulo: 'Caldo de cana de presente', texto: 'Segunda e terça, nos pedidos acima de R$ 50.', foto: 'caldo-de-cana',
      botao: { rotulo: 'Quero o meu', tipo: 'produto', alvo: 'Caldo de cana 500 ml' }, inicio: data(10, 13), fim: data(11, 10),
      frequencia: 'uma-vez-dia', publico: 'todos', onde: 'ambos', estado: 'agendado',
    },
  ],
  nova: [],
  rede: [
    {
      id: 'b1', titulo: 'Nova pizza de Halloween', texto: 'Abóbora, gorgonzola e bacon. Só até 31/10, em todas as lojas.', foto: 'pizza-inteira',
      botao: { rotulo: 'Ver as pizzas', tipo: 'categoria', alvo: 'Pizzas' }, inicio: data(10, 20), fim: data(10, 31),
      frequencia: 'uma-vez-dia', publico: 'todos', onde: 'ambos', estado: 'agendado',
    },
    {
      id: 'b2', titulo: 'Pizza grande + refri 2 L', texto: 'O combo da sexta, pedindo pelo app.', foto: 'pizza-fatia',
      botao: { rotulo: 'Pedir o combo', tipo: 'produto', alvo: 'Pizza grande, 1 sabor' }, inicio: data(10, 1), fim: data(10, 19),
      frequencia: 'uma-vez-dia', publico: 'todos', onde: 'app', estado: 'ativo',
    },
    {
      id: 'b3', titulo: 'Bem-vindo ao Forno de Pedra', texto: 'Frete grátis no primeiro pedido acima de R$ 80.', foto: 'calzone',
      botao: { rotulo: 'Fazer meu pedido', tipo: 'categoria', alvo: 'Pizzas' }, inicio: data(9, 1), fim: data(12, 31),
      frequencia: 'uma-vez-cliente', publico: 'novos', onde: 'ambos', estado: 'pausado',
    },
  ],
}

export const bannersIniciais = (cen) => (BANNERS[cen.id] || []).map((b) => ({ ...b, botao: { ...b.botao } }))

// ---------- Relatórios (T25) ----------
export const RELATORIOS = [
  { id: 'pedidos', nome: 'Pedidos detalhado', contem: 'Um pedido por linha: número, data, cliente com telefone mascarado, modalidade, status, pagamento, desconto e total.' },
  { id: 'itens', nome: 'Itens vendidos', contem: 'Cada produto vendido no período, com quantidade e faturamento. Pedidos cancelados ficam de fora.' },
  { id: 'clientes', nome: 'Clientes', contem: 'Nome, telefone e e-mail mascarados, número de pedidos e data do último pedido. CPF completo só para perfil autorizado.' },
  { id: 'cardapio', nome: 'Cardápio', contem: 'Categoria, produto, preço e se está à venda ou pausado. Retrato de agora, sem período.' },
  { id: 'cupons', nome: 'Cupons e uso', contem: 'Código, objetivo, validade, usos e desconto concedido por cupom.' },
  { id: 'fidelidade', nome: 'Fidelidade', contem: 'Movimentos do programa: ganhos, resgates e vencimentos.' },
  { id: 'campanhas', nome: 'Campanhas', contem: 'Campanhas enviadas, canal, público, entregues e pedidos atribuídos.' },
]

export const PERIODOS_RELATORIO = [
  { id: 'este-mes', rotulo: 'Este mês', nome: 'outubro até o dia 9', de: data(10, 1), ate: data(10, 10) },
  { id: '7-dias', rotulo: 'Últimos 7 dias', nome: '3 a 9 de outubro', de: data(10, 3), ate: data(10, 10) },
  { id: '30-dias', rotulo: 'Últimos 30 dias', nome: '10/09 a 09/10', de: data(9, 10), ate: data(10, 10) },
  { id: 'mes-passado', rotulo: 'Mês passado', nome: 'setembro', de: data(9, 1), ate: data(10, 1) },
]

// Arquivos gerados nos últimos 7 dias, antes desta sessão
export const arquivosIniciais = (cen) =>
  cen.id === 'nova'
    ? []
    : [{ id: 'a0', relatorio: 'cardapio', nome: 'Cardápio', periodo: 'retrato de 06/10', geradoEm: data(10, 6, 15, 20), estado: 'pronto' }]
