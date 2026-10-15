// Menu da seção 6. Três itens soltos para o serviço, três grupos e o rodapé.
import {
  House, ReceiptText, BookOpen, Users, Megaphone, Award, TicketPercent, GalleryHorizontalEnd,
  BarChart3, BadgePercent, Filter, Download, Clock, Bike, ShoppingBag, CreditCard, Store, Plug, Radar,
  LifeBuoy, UserRound,
} from 'lucide-react'

export const MENU = [
  { id: 'inicio', rotulo: 'Início', para: '/inicio', icone: House, permissao: 'inicio' },
  { id: 'pedidos', rotulo: 'Pedidos', para: '/pedidos', icone: ReceiptText, permissao: 'pedidos' },
  { id: 'cardapio', rotulo: 'Cardápio', para: '/cardapio', icone: BookOpen, permissao: 'cardapio' },
  {
    grupo: 'vendas',
    rotulo: 'Vendas e clientes',
    itens: [
      { id: 'clientes', rotulo: 'Clientes', para: '/clientes', icone: Users, permissao: 'clientes' },
      { id: 'campanhas', rotulo: 'Campanhas', para: '/campanhas', icone: Megaphone, permissao: 'campanhas' },
      { id: 'precos', rotulo: 'Promoções automáticas', para: '/promocoes-automaticas', icone: BadgePercent, permissao: 'precos' },
      { id: 'fidelidade', rotulo: 'Fidelidade', para: '/fidelidade', icone: Award, permissao: 'fidelidade' },
      { id: 'cupons', rotulo: 'Cupons', para: '/cupons', icone: TicketPercent, permissao: 'cupons' },
      { id: 'destaques', rotulo: 'Destaques e banners', para: '/destaques', icone: GalleryHorizontalEnd, permissao: 'destaques' },
    ],
  },
  {
    grupo: 'resultados',
    rotulo: 'Resultados',
    itens: [
      { id: 'analise', rotulo: 'Análise do período', para: '/analise/visao-geral', prefixo: '/analise', icone: BarChart3, permissao: 'analise' },
      { id: 'funil', rotulo: 'Funil de compra', para: '/funil', icone: Filter, permissao: 'funil' },
      { id: 'relatorios', rotulo: 'Relatórios para baixar', para: '/relatorios', icone: Download, permissao: 'relatorios' },
    ],
  },
  {
    grupo: 'minha-loja',
    rotulo: 'Minha loja',
    itens: [
      { id: 'funcionamento', rotulo: 'Funcionamento', para: '/minha-loja/funcionamento', icone: Clock, permissao: 'funcionamento' },
      { id: 'entrega', rotulo: 'Entrega', para: '/minha-loja/entrega', icone: Bike, permissao: 'entrega' },
      { id: 'modalidades', rotulo: 'Modalidades e pedidos', para: '/minha-loja/modalidades', icone: ShoppingBag, permissao: 'modalidades' },
      { id: 'pagamentos', rotulo: 'Pagamentos', para: '/minha-loja/pagamentos', icone: CreditCard, permissao: 'pagamentos' },
      { id: 'dados', rotulo: 'Dados da loja', para: '/minha-loja/dados', icone: Store, permissao: 'dados' },
      { id: 'integracoes', rotulo: 'Integrações', para: '/minha-loja/integracoes', icone: Plug, permissao: 'integracoes' },
      { id: 'rastreamento', rotulo: 'Rastreamento', para: '/minha-loja/rastreamento', icone: Radar, permissao: 'rastreamento' },
    ],
  },
]

export const RODAPE = [
  { id: 'ajuda', rotulo: 'Ajuda', para: '/ajuda', icone: LifeBuoy, permissao: 'ajuda' },
  { id: 'conta', rotulo: 'Conta', para: '/conta', icone: UserRound, permissao: 'conta' },
]

// Regras 1 e 2: item sem permissão some; grupo vazio some; grupo com um item vira item solto.
export function menuDoPerfil(pode) {
  const saida = []
  MENU.forEach((m) => {
    if (!m.grupo) {
      if (pode(m.permissao)) saida.push(m)
      return
    }
    const itens = m.itens.filter((i) => pode(i.permissao))
    if (itens.length === 0) return
    if (itens.length === 1) saida.push(itens[0])
    else saida.push({ ...m, itens })
  })
  return saida
}

export const itensPlanos = (menu) => menu.flatMap((m) => (m.grupo ? m.itens : [m]))

export const itemAtivo = (item, caminho) => caminho === item.para || caminho.startsWith((item.prefixo || item.para) + '/')

// Regra 5: a barra inferior nunca fica com espaço vazio
export function itensBarraInferior(menu) {
  return itensPlanos(menu).slice(0, 3)
}
