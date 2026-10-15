// Cardápios fictícios. Estado de pausa: 'ativo' | 'amanha' (até amanhã) | 'pausado' (até eu reativar)

let seq = 0
const p = (categoria, nome, preco, extra = {}) => ({
  id: `p${++seq}`,
  categoria,
  nome,
  preco,
  estado: 'ativo',
  ...extra,
})

// Grupo de complementos: opções com preço adicional opcional
const grupo = (id, nome, tipo, opcoes, pausadas = {}) => ({
  id,
  nome,
  tipo,
  itens: opcoes.map((o, i) => {
    const [nomeOpcao, preco] = Array.isArray(o) ? o : [o, null]
    const p = pausadas[nomeOpcao]
    return { id: `${id}-${i}`, nome: nomeOpcao, preco, estado: p ? p.estado : 'ativo', pausadoDesde: p?.desde }
  }),
})

export function cardapioPastelaria() {
  seq = 0
  const categorias = [
    { id: 'c1', nome: 'Pastéis salgados' },
    { id: 'c2', nome: 'Pastéis doces' },
    { id: 'c3', nome: 'Porções' },
    { id: 'c4', nome: 'Bebidas' },
  ]
  const produtos = [
    p('c1', 'Pastel de carne', 14, { grupos: ['g2', 'g3'] }),
    p('c1', 'Pastel de queijo', 13, { grupos: ['g2', 'g3'] }),
    p('c1', 'Pastel de frango com catupiry', 15.5, { grupos: ['g2', 'g3'] }),
    p('c1', 'Pastel de pizza', 14.5, { grupos: ['g2', 'g3'] }),
    p('c1', 'Pastel de calabresa com queijo', 15, { grupos: ['g2', 'g3'] }),
    p('c1', 'Pastel de palmito', 16, { estado: 'amanha', pausadoDesde: 'hoje', grupos: ['g2', 'g3'] }),
    p('c1', 'Monte seu pastel', 14, { grupos: ['g1', 'g2', 'g3'], descricao: 'Escolha até 3 sabores' }),
    p('c2', 'Pastel de chocolate', 12, { grupos: ['g7'] }),
    p('c2', 'Pastel de banana com canela', 11, { grupos: ['g7'] }),
    p('c2', 'Pastel romeu e julieta', 12.5, { grupos: ['g7'] }),
    p('c2', 'Pastel de doce de leite', null, { grupos: ['g7'] }),
    p('c3', 'Mini pastéis (12 un.)', 32, { grupos: ['g1', 'g3'], descricao: 'Escolha 3 sabores' }),
    p('c3', 'Coxinha (6 un.)', 24, { grupos: ['g3'] }),
    p('c3', 'Batata frita', 22, { grupos: ['g3'] }),
    p('c4', 'Caldo de cana 500 ml', 9, { grupos: ['g4'] }),
    p('c4', 'Refrigerante lata', 6.5, { grupos: ['g6'] }),
    p('c4', 'Suco natural 400 ml', null, { grupos: ['g5'] }),
    p('c4', 'Água sem gás', 4),
  ]
  const grupos = [
    grupo('g1', 'Sabores', 'sabor', ['Carne', 'Queijo', 'Frango', 'Palmito', 'Milho', 'Calabresa', 'Presunto', 'Tomate e orégano']),
    grupo('g2', 'Adicionais', 'adicional', [['Catupiry extra', 3], ['Cheddar', 3], ['Bacon', 4], ['Ovo', 2], ['Milho', 1.5], ['Azeitona', 1.5]]),
    grupo('g3', 'Molhos', 'molho', ['Vinagrete', 'Pimenta da casa', 'Maionese temperada', 'Ketchup', 'Mostarda']),
    grupo('g4', 'Tamanho do caldo', 'tamanho', [['300 ml', -2], ['500 ml', null], ['1 litro', 7]]),
    grupo('g5', 'Sabor do suco', 'sabor', ['Laranja', 'Limão', 'Maracujá', 'Abacaxi com hortelã', 'Acerola']),
    grupo('g6', 'Sabor do refrigerante', 'sabor', ['Cola', 'Cola zero', 'Guaraná', 'Laranja', 'Limão']),
    grupo('g7', 'Cobertura', 'adicional', [['Açúcar e canela', null], ['Leite condensado', 2], ['Granulado', 1.5]]),
  ]
  return { categorias, produtos, grupos, abertura: '11:00' }
}

export function cardapioLojaNova() {
  seq = 0
  return {
    categorias: [
      { id: 'c1', nome: 'Pastéis salgados' },
      { id: 'c4', nome: 'Bebidas' },
    ],
    produtos: [p('c1', 'Pastel de carne', 14), p('c1', 'Pastel de queijo', 13), p('c4', 'Caldo de cana 500 ml', 9)],
    grupos: [],
    abertura: '11:00',
  }
}

export const SABORES_PIZZA = [
  'Mussarela', 'Calabresa', 'Marguerita', 'Portuguesa', 'Frango com catupiry', 'Quatro queijos',
  'Napolitana', 'Atum', 'Rúcula com tomate seco', 'Pepperoni', 'Bacon', 'Palmito', 'Escarola',
  'Brócolis', 'Lombo canadense', 'Toscana', 'Milho', 'Baiana', 'Carne seca', 'Abobrinha',
  'Alho e óleo', 'Caprese', 'Vegetariana', 'Moda da casa',
]

export function cardapioPizzaria({ comPausas = true } = {}) {
  seq = 0
  const categorias = [
    { id: 'c1', nome: 'Pizzas' },
    { id: 'c2', nome: 'Esfihas' },
    { id: 'c3', nome: 'Massas' },
    { id: 'c4', nome: 'Entradas' },
    { id: 'c5', nome: 'Sobremesas' },
    { id: 'c6', nome: 'Bebidas' },
  ]
  const produtos = [
    p('c1', 'Pizza grande, 1 sabor', 69.9, { grupos: ['g1', 'g2', 'g3', 'g4', 'g5'] }),
    p('c1', 'Pizza grande, 2 sabores', 74.9, { grupos: ['g1', 'g2', 'g3', 'g4', 'g5'] }),
    p('c1', 'Pizza média', 58.9, { grupos: ['g1', 'g2', 'g3', 'g4', 'g5'] }),
    p('c1', 'Pizza broto', 39.9, { grupos: ['g1', 'g3', 'g5'] }),
    p('c1', 'Pizza família, 3 sabores', 92.9, { grupos: ['g1', 'g2', 'g3', 'g4', 'g5'] }),
    p('c1', 'Calzone', 46.9, { grupos: ['g1', 'g3'] }),
    p('c1', 'Pizza doce grande', 64.9, { grupos: ['g6'] }),
    p('c1', 'Pizza doce broto', 36.9, { grupos: ['g6'] }),
    ...['Carne', 'Queijo', 'Calabresa', 'Frango', 'Escarola', 'Ricota com espinafre', 'Atum', 'Palmito', 'Carne com queijo', 'Zaatar', 'Chocolate', 'Banana com canela'].map(
      (s, i) => p('c2', `Esfiha de ${s.toLowerCase()}`, i > 9 ? 8.9 : 7.9),
    ),
    p('c3', 'Lasanha à bolonhesa', 49.9, comPausas ? { estado: 'pausado', pausadoDesde: 'ontem', grupos: ['g7'] } : { grupos: ['g7'] }),
    p('c3', 'Lasanha quatro queijos', 52.9, { grupos: ['g7'] }),
    p('c3', 'Nhoque ao sugo', 42.9, { grupos: ['g7'] }),
    p('c3', 'Espaguete à carbonara', 46.9, { grupos: ['g7'] }),
    p('c3', 'Talharim ao pesto', 44.9, { grupos: ['g7'] }),
    p('c3', 'Rondele de presunto e queijo', 48.9, { grupos: ['g7'] }),
    p('c3', 'Canelone de ricota', 45.9, { grupos: ['g7'] }),
    p('c3', 'Fettuccine Alfredo', 47.9, { grupos: ['g7'] }),
    p('c4', 'Pão de alho', 18.9),
    p('c4', 'Bruschetta tradicional', 24.9),
    p('c4', 'Bolinho de bacalhau (8 un.)', 39.9),
    p('c4', 'Provolone à milanesa', 34.9),
    p('c4', 'Batata rústica', 29.9),
    p('c4', 'Carpaccio', 42.9),
    p('c4', 'Salada caprese', 32.9),
    p('c4', 'Antepasto de berinjela', 26.9),
    p('c5', 'Petit gâteau', 24.9),
    p('c5', 'Pudim de leite', 14.9),
    p('c5', 'Tiramisù', 22.9),
    p('c5', 'Mousse de maracujá', 13.9),
    p('c5', 'Torta holandesa', 19.9),
    p('c5', 'Brownie com sorvete', 21.9),
    p('c5', 'Cannoli (2 un.)', 18.9),
    p('c5', 'Sorvete 2 bolas', 12.9),
    p('c5', 'Panna cotta', 16.9),
    p('c5', 'Sobremesa do dia', null),
    p('c6', 'Refrigerante lata', 7.5),
    p('c6', 'Refrigerante 2 L', 15.9),
    p('c6', 'Guaraná lata', 7.5),
    p('c6', 'Guaraná 2 L', 14.9),
    p('c6', 'Água sem gás', 5),
    p('c6', 'Água com gás', 5.5),
    p('c6', 'Suco de laranja 500 ml', 12.9, { grupos: ['g8'] }),
    p('c6', 'Suco de uva 500 ml', 12.9),
    p('c6', 'Suco de limão 500 ml', 11.9),
    p('c6', 'Chá gelado', 8.9),
    p('c6', 'Cerveja long neck', 11.9),
    p('c6', 'Cerveja 600 ml', 18.9),
    p('c6', 'Cerveja sem álcool', 10.9),
    p('c6', 'Vinho tinto taça', 22.9),
    p('c6', 'Vinho tinto garrafa', 89.9),
    p('c6', 'Vinho branco garrafa', 89.9),
    p('c6', 'Tônica lata', 7.9),
    p('c6', 'Energético', 13.9),
  ]
  const grupos = [
    {
      id: 'g1',
      nome: 'Sabores de pizza',
      tipo: 'sabor',
      itens: SABORES_PIZZA.map((nome, i) => ({
        id: `g1-${i}`,
        nome,
        estado: comPausas && nome === 'Rúcula com tomate seco' ? 'amanha' : 'ativo',
        pausadoDesde: comPausas && nome === 'Rúcula com tomate seco' ? 'hoje' : undefined,
      })),
    },
    {
      id: 'g2',
      nome: 'Bordas',
      tipo: 'borda',
      itens: ['Tradicional', 'Catupiry', 'Cheddar', 'Chocolate', 'Cream cheese'].map((nome, i) => ({
        id: `g2-${i}`,
        nome: `Borda ${nome.toLowerCase()}`,
        preco: i === 0 ? null : 9,
        estado: comPausas && nome === 'Cream cheese' ? 'pausado' : 'ativo',
        pausadoDesde: comPausas && nome === 'Cream cheese' ? 'ontem' : undefined,
      })),
    },
    grupo('g3', 'Adicionais', 'adicional', [['Catupiry', 6], ['Cheddar', 6], ['Bacon', 7], ['Calabresa', 6], ['Azeitona', 3], ['Champignon', 6], ['Ovo', 3], ['Palmito', 7], ['Rúcula', 4], ['Tomate seco', 6]]),
    grupo('g4', 'Molhos extras', 'molho', ['Pimenta calabresa', 'Maionese temperada', 'Barbecue', 'Azeite com alho']),
    grupo('g5', 'Massa', 'massa', ['Tradicional', 'Fina', ['Integral', 4]]),
    grupo('g6', 'Sabores doces', 'sabor', ['Chocolate', 'Prestígio', 'Banana com canela', 'Romeu e julieta', 'Brigadeiro', 'Morango com chocolate']),
    grupo('g7', 'Molho da massa', 'molho', ['Bolonhesa', 'Sugo', 'Branco', 'Pesto', 'Quatro queijos']),
    grupo('g8', 'Tamanho do suco', 'tamanho', [['300 ml', -3], ['500 ml', null], ['1 litro', 9]]),
  ]
  return { categorias, produtos, grupos, abertura: '18:00' }
}

// Quantos produtos usam um grupo de complementos
export const produtosQueUsam = (cardapio, grupoId) => cardapio.produtos.filter((pr) => pr.grupos?.includes(grupoId))

export function contarPausados(cardapio) {
  const prod = cardapio.produtos.filter((x) => x.estado !== 'ativo')
  const comp = cardapio.grupos.flatMap((g) => g.itens.filter((i) => i.estado !== 'ativo'))
  return { produtos: prod, complementos: comp, total: prod.length + comp.length }
}
