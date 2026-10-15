import { fotoDoProduto } from './fotos.js'
// Dados fictícios das telas T09, T11, T12 e T33. Nada aqui é real.

import { modalidadesIniciais } from './minhaloja.js'

// Modalidades de venda. O Delivery é a referência: modalidade sem preço próprio usa o preço dele.
export const MODALIDADES = [
  { id: 'delivery', nome: 'Delivery' },
  { id: 'levar', nome: 'Quero levar' },
  { id: 'aqui', nome: 'Comer aqui' },
]

export function modalidadesDaLoja(cenarioId) {
  const ativas = modalidadesIniciais(cenarioId).modalidades.filter((m) => m.ativo).map((m) => m.id)
  return MODALIDADES.filter((m) => ativas.includes(m.id))
}

// Preço por modalidade só faz sentido com mais de uma modalidade e com o Delivery ativo (a referência)
export const permitePrecoPorModalidade = (modalidades) => modalidades.length > 1 && modalidades.some((m) => m.id === 'delivery')

// Exemplos com preço diferente: no balcão (Quero levar e Comer aqui) sai R$ 1,00 mais barato
export const PRODUTOS_COM_PRECO_POR_MODALIDADE = ['Pastel de carne', 'Pizza grande, 1 sabor']
export const temPrecoPorModalidade = (produto) => PRODUTOS_COM_PRECO_POR_MODALIDADE.includes(produto.nome) && produto.preco != null

const emTexto = (v) => (v == null ? '' : v.toFixed(2).replace('.', ','))

// Detalhes que a lista do cardápio não guarda: descrição, código, preços por modalidade e disponibilidade
export function detalhesProduto(produto, { semPdv, sigla, modalidades = MODALIDADES }) {
  const n = Number(produto.id.replace('p', ''))
  const porModalidade = permitePrecoPorModalidade(modalidades) && temPrecoPorModalidade(produto)
  const ativa = (id) => modalidades.some((m) => m.id === id)
  const balcao = porModalidade ? emTexto(produto.preco - 1) : ''
  return {
    nome: produto.nome,
    descricao: produto.descricao || '',
    // foto ilustrativa do cardápio (mesma da lista), quando houver
    foto: fotoDoProduto(produto.nome) ? { nome: 'Foto atual', url: fotoDoProduto(produto.nome) } : null,
    // preço e promoção do Delivery; com um preço só, valem para todas as modalidades
    preco: emTexto(produto.preco),
    precoPromo: '',
    porModalidade,
    precos: {
      levar: { preco: ativa('levar') ? balcao : '', promo: '' },
      aqui: { preco: ativa('aqui') ? balcao : '', promo: '' },
    },
    // sem PDV o código é gerado pelo dashboard; com PDV vem do cadastro do PDV
    codigo: semPdv ? `${sigla}-${String(n).padStart(4, '0')}` : `PDV-${String(4000 + n)}`,
    modalidades: Object.fromEntries(modalidades.map((m) => [m.id, true])),
    restringir: false,
    faixas: [{ id: 'f1', dias: 'todos', inicio: '11:00', fim: '15:00' }],
  }
}

// Regras e preços dos complementos ligados ao produto
export function gruposDoProduto(produto, cardapio) {
  return (produto.grupos || [])
    .map((gid) => cardapio.grupos.find((g) => g.id === gid))
    .filter(Boolean)
    .map((g) => ({
      id: g.id,
      nome: g.nome,
      obrigatorio: g.tipo === 'sabor',
      minimo: g.tipo === 'sabor' ? '1' : '0',
      maximo: g.tipo === 'sabor' ? (produto.nome.includes('2 sabores') ? '2' : produto.nome.includes('3') ? '3' : '1') : '1',
      itens: g.itens.map((i) => ({
        id: i.id,
        nome: i.nome,
        preco: i.preco == null ? '0,00' : emTexto(i.preco),
        porModalidade: false,
        precos: { levar: '', aqui: '' },
        aVenda: i.estado === 'ativo',
      })),
    }))
}

export const OPCOES_DIAS = [
  { id: 'todos', rotulo: 'Todos os dias' },
  { id: 'uteis', rotulo: 'Segunda a sexta' },
  { id: 'fim', rotulo: 'Sábado e domingo' },
]

// T12: a loja que falha de propósito (está sem conexão no cenário)
export const LOJA_QUE_FALHA = 2101

// T12: aceita "3", "p3", "c2" vindos da URL
export const idDaUrl = (valor, prefixo) => (!valor ? null : String(valor).startsWith(prefixo) ? String(valor) : prefixo + valor)

// T33
export const CONTA = { nome: 'Luana Martins', iniciais: 'LM' }
export const emailMascarado = (cen) => `lu•••@${cen.id === 'rede' ? 'fornodepedra' : 'bomrecheio'}.exemplo`

export const CANAIS_SUPORTE = [
  { id: 'whatsapp', nome: 'WhatsApp', contato: '(11) 9••••-4821', quando: 'Todos os dias, das 9:00 às 23:59', resposta: 'Responde em até 10 min' },
  { id: 'email', nome: 'E-mail', contato: 'sup•••@suporte.exemplo', quando: 'Segunda a sábado', resposta: 'Responde em até 1 dia útil' },
  { id: 'telefone', nome: 'Telefone', contato: '0800 •••-4120', quando: 'Todos os dias, das 10:00 às 23:00', resposta: 'Atendimento na hora' },
]

export function perguntasFrequentes(rede) {
  const areas = [
    {
      id: 'pedidos',
      area: 'Pedidos',
      perguntas: [
        ['Um pedido está parado há muito tempo. O que faço?', 'Abra o pedido em Pedidos e confira o status. Se o cliente já foi atendido, mude o status para o próximo passo. O alerta some sozinho quando o pedido anda.'],
        ['Como estorno um pedido?', 'Abra o pedido e use Estornar. Você escolhe o valor (total ou parcial) e o motivo. O banco do cliente leva alguns minutos para confirmar, e o pedido mostra o andamento.'],
      ],
    },
    {
      id: 'cardapio',
      area: 'Cardápio',
      perguntas: [
        ['Acabou um sabor. Como tiro de venda só por hoje?', 'Em Cardápio, use Pausar no sabor e escolha "Até amanhã". Ele volta sozinho na próxima abertura da loja.'],
        ['Por que um produto aparece como "Sem preço"?', 'O produto não tem preço cadastrado e não aparece no app até ter um. Abra Editar e preencha o preço na aba Informações.'],
        ...(rede ? [['Como levo um produto novo para todas as lojas?', 'Em Cardápio, use Copiar para outras lojas. Escolha a loja de origem, o que copiar e as lojas de destino. O resultado mostra loja por loja o que deu certo.']] : []),
      ],
    },
    {
      id: 'loja',
      area: 'Loja e horário',
      perguntas: [
        ['Preciso fechar a loja agora. Como faço?', 'Toque no status da loja no topo da página e use Fechar delivery ou Fechar balcão. Os dois são independentes.'],
        ['A loja aparece "sem conexão". O que significa?', 'O sistema da loja parou de responder. Confira a internet do computador da loja. Se não voltar em alguns minutos, fale com o suporte.'],
      ],
    },
    {
      id: 'pagamentos',
      area: 'Pagamentos',
      perguntas: [
        ['Quando o dinheiro dos pedidos pagos online cai na conta?', 'O repasse segue o prazo combinado com o meio de pagamento. Os valores de cada pedido aparecem no detalhe do pedido.'],
      ],
    },
    {
      id: 'conta',
      area: 'Conta e acesso',
      perguntas: [
        ['Esqueci minha senha.', 'Na tela de entrada, use "Esqueci minha senha". O link para criar uma nova chega no seu e-mail.'],
        ['Como dou acesso a um funcionário?', 'Hoje o acesso de funcionários é liberado pelo suporte. Fale com a gente por um dos canais acima.'],
      ],
    },
  ]
  return areas.map((a) => ({ ...a, perguntas: a.perguntas.map(([pergunta, resposta], i) => ({ id: `${a.id}-${i}`, pergunta, resposta })) }))
}
