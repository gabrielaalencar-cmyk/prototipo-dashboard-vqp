// T11. Organizar cardápio: arrastar no computador; "Mover para cima" e "Mover para baixo" sempre.
import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowUp, ChevronDown, GripVertical } from 'lucide-react'
import { usePrototipo } from '../../contexto/Prototipo.jsx'
import { useEhCelular, useTitulo } from '../../utilitarios/ganchos.js'
import { plural } from '../../utilitarios/formatos.js'
import { Botao, CabecalhoPagina, Carregando, EstadoErro, EstadoVazio, Esqueleto, FaixaAviso } from '../../componentes/base.jsx'
import '../../estilos/cardapio2.css'

const montarOrdem = (cardapio) =>
  cardapio.categorias.map((c) => ({ id: c.id, nome: c.nome, produtos: cardapio.produtos.filter((p) => p.categoria === c.id).map((p) => ({ id: p.id, nome: p.nome })) }))

const mover = (lista, de, para) => {
  const n = [...lista]
  const [item] = n.splice(de, 1)
  n.splice(para, 0, item)
  return n
}

const assinatura = (ordem) => ordem.map((c) => `${c.id}:${c.produtos.map((p) => p.id).join(',')}`).join('|')

export function OrganizarCardapio() {
  const { cardapio, loja, estadoForcado, avisar, simularFalha, podeAgir } = usePrototipo()
  const celular = useEhCelular()
  useTitulo('Organizar cardápio')
  const [ordem, setOrdem] = useState(() => montarOrdem(cardapio))
  const [salva, setSalva] = useState(() => assinatura(montarOrdem(cardapio)))
  const [abertas, setAbertas] = useState(() => new Set(cardapio.produtos.length <= 20 ? cardapio.categorias.map((c) => c.id) : [cardapio.categorias[0]?.id]))
  const [arrastando, setArrastando] = useState(null) // { tipo, catId, indice }
  const [alvo, setAlvo] = useState(null)
  const [anuncio, setAnuncio] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erroSalvar, setErroSalvar] = useState(false)
  const [tentou, setTentou] = useState(false)
  const botoes = useRef({})
  const focoPendente = useRef(null)

  const alterada = assinatura(ordem) !== salva

  // Depois de mover pelo botão, o foco segue o item; se o botão ficou desabilitado, vai para o outro
  useEffect(() => {
    const f = focoPendente.current
    if (!f) return
    focoPendente.current = null
    const el = botoes.current[`${f.id}-${f.direcao}`]
    if (el && !el.disabled) el.focus()
    else botoes.current[`${f.id}-${f.direcao === 'cima' ? 'baixo' : 'cima'}`]?.focus()
  }, [ordem])

  const moverCategoria = (de, para, viaBotao) => {
    if (para < 0 || para >= ordem.length) return
    const cat = ordem[de]
    setOrdem((o) => mover(o, de, para))
    setAnuncio(`${cat.nome} agora é a ${para + 1}ª de ${ordem.length} categorias.`)
    if (viaBotao) focoPendente.current = { id: cat.id, direcao: para < de ? 'cima' : 'baixo' }
  }
  const moverProduto = (catId, de, para, viaBotao) => {
    const cat = ordem.find((c) => c.id === catId)
    if (para < 0 || para >= cat.produtos.length) return
    const prod = cat.produtos[de]
    setOrdem((o) => o.map((c) => (c.id === catId ? { ...c, produtos: mover(c.produtos, de, para) } : c)))
    setAnuncio(`${prod.nome} agora é o ${para + 1}º de ${cat.produtos.length} em ${cat.nome}.`)
    if (viaBotao) focoPendente.current = { id: prod.id, direcao: para < de ? 'cima' : 'baixo' }
  }

  const salvar = () => {
    setSalvando(true)
    setErroSalvar(false)
    setTimeout(() => {
      setSalvando(false)
      if (simularFalha || !podeAgir) {
        setErroSalvar(true)
        avisar('Não foi possível salvar a ordem. A ordem que você montou continua na tela.', 'erro')
        return
      }
      setSalva(assinatura(ordem))
      avisar('Ordem salva. O app já mostra o cardápio nesta ordem.', 'sucesso')
    }, 700)
  }

  // ---------- Arrastar (HTML5) ----------
  const aoComecar = (e, dados) => {
    e.stopPropagation()
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', dados.id)
    setArrastando(dados)
  }
  const aceita = (dados) => arrastando && arrastando.tipo === dados.tipo && (dados.tipo === 'categoria' || arrastando.catId === dados.catId)
  const aoPassar = (e, dados) => {
    if (!aceita(dados)) return
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    if (alvo?.id !== dados.id) setAlvo(dados)
  }
  const aoSoltar = (e, dados) => {
    if (!aceita(dados)) return
    e.preventDefault()
    e.stopPropagation()
    if (dados.tipo === 'categoria') moverCategoria(arrastando.indice, dados.indice)
    else moverProduto(dados.catId, arrastando.indice, dados.indice)
    setArrastando(null)
    setAlvo(null)
  }
  const aoTerminar = () => {
    setArrastando(null)
    setAlvo(null)
  }
  const propsArrastar = (dados) =>
    celular
      ? {}
      : {
          draggable: true,
          onDragStart: (e) => aoComecar(e, dados),
          onDragOver: (e) => aoPassar(e, dados),
          onDrop: (e) => aoSoltar(e, dados),
          onDragEnd: aoTerminar,
        }

  const botoesMover = (id, nome, indice, total, aoMover) => (
    <span className="organizar__mover">
      <Botao
        ref={(el) => (botoes.current[`${id}-cima`] = el)}
        tamanho={celular ? undefined : 'p'}
        variante="texto"
        className="botao--icone"
        icone={ArrowUp}
        aria-label={`Mover ${nome} para cima`}
        title="Mover para cima"
        disabled={indice === 0}
        onClick={() => aoMover(indice, indice - 1, true)}
      />
      <Botao
        ref={(el) => (botoes.current[`${id}-baixo`] = el)}
        tamanho={celular ? undefined : 'p'}
        variante="texto"
        className="botao--icone"
        icone={ArrowDown}
        aria-label={`Mover ${nome} para baixo`}
        title="Mover para baixo"
        disabled={indice === total - 1}
        onClick={() => aoMover(indice, indice + 1, true)}
      />
    </span>
  )

  const cabecalho = (
    <>
      <Botao variante="texto" className="botao--voltar" icone={ArrowLeft} para="/cardapio">Voltar ao cardápio</Botao>
      <CabecalhoPagina
        titulo="Organizar cardápio"
        descricao={`A ordem em que o cliente vê categorias e produtos no app · ${loja.nome}`}
        acoes={!celular && estadoForcado === 'normal' && (
          <>
            {alterada && <Botao onClick={() => setOrdem(montarOrdem(cardapio))}>Desfazer mudanças</Botao>}
            <Botao variante="principal" onClick={salvar} carregando={salvando} disabled={!alterada} mudaAlgo>Salvar ordem</Botao>
          </>
        )}
      />
    </>
  )

  if (estadoForcado === 'carregando') {
    return (
      <div className="pagina organizar">
        {cabecalho}
        <Carregando oQue="o cardápio">
          <div className="organizar__lista">{Array.from({ length: 5 }, (_, i) => <Esqueleto key={i} linhas={1} altura="52px" />)}</div>
        </Carregando>
      </div>
    )
  }
  if (estadoForcado === 'erro' && !tentou) {
    return <div className="pagina organizar">{cabecalho}<EstadoErro oQue="o cardápio" aoTentar={() => setTentou(true)} /></div>
  }
  if (estadoForcado === 'vazio' || cardapio.produtos.length === 0) {
    return (
      <div className="pagina organizar">
        {cabecalho}
        <EstadoVazio titulo="Seu cardápio ainda não tem produtos para organizar." texto="Cadastre categorias e produtos no cardápio e volte aqui para definir a ordem." acao={<Botao variante="principal" para="/cardapio">Voltar ao cardápio</Botao>} />
      </div>
    )
  }

  return (
    <div className="pagina organizar">
      {cabecalho}
      <p className="texto-corpo organizar__dica">
        {celular ? 'Use as setas para subir ou descer cada categoria e produto.' : 'Arraste pela alça ou use as setas. Produtos mudam de lugar só dentro da própria categoria.'}
      </p>
      {erroSalvar && <FaixaAviso tom="erro" acao={<Botao tamanho="p" onClick={salvar} mudaAlgo>Tentar de novo</Botao>}>Não foi possível salvar a ordem. A ordem que você montou continua aqui.</FaixaAviso>}
      <p className="visualmente-oculto" aria-live="polite">{anuncio}</p>

      <ol className="organizar__lista" aria-label="Categorias na ordem do app">
        {ordem.map((c, ci) => {
          const dadosCat = { tipo: 'categoria', id: c.id, indice: ci }
          const aberta = abertas.has(c.id)
          return (
            <li
              key={c.id}
              className={`organizar__categoria ${arrastando?.id === c.id ? 'organizar--arrastando' : ''} ${alvo?.id === c.id && arrastando?.id !== c.id ? 'organizar--alvo' : ''}`}
              {...propsArrastar(dadosCat)}
            >
              <div className="organizar__linha organizar__linha--categoria">
                {!celular && <GripVertical size={18} aria-hidden className="organizar__alca" />}
                <span className="organizar__posicao" aria-hidden>{ci + 1}</span>
                <button
                  type="button"
                  className="organizar__nome"
                  aria-expanded={aberta}
                  aria-controls={`org-${c.id}`}
                  onClick={() => setAbertas((s) => { const n = new Set(s); n.has(c.id) ? n.delete(c.id) : n.add(c.id); return n })}
                >
                  <ChevronDown size={16} aria-hidden className={aberta ? '' : 'gira-90-negativo'} />
                  {c.nome}
                  <span className="texto-secundario organizar__contagem">{plural(c.produtos.length, 'produto', 'produtos')}</span>
                </button>
                {botoesMover(c.id, c.nome, ci, ordem.length, moverCategoria)}
              </div>
              {aberta && (
                c.produtos.length === 0 ? (
                  <p id={`org-${c.id}`} className="organizar__vazia texto-secundario">Nenhum produto nesta categoria.</p>
                ) : (
                  <ol id={`org-${c.id}`} className="organizar__produtos" aria-label={`Produtos de ${c.nome}`}>
                    {c.produtos.map((p, pi) => {
                      const dadosProd = { tipo: 'produto', id: p.id, catId: c.id, indice: pi }
                      return (
                        <li
                          key={p.id}
                          className={`organizar__linha organizar__produto ${arrastando?.id === p.id ? 'organizar--arrastando' : ''} ${alvo?.id === p.id && arrastando?.id !== p.id ? 'organizar--alvo' : ''}`}
                          {...propsArrastar(dadosProd)}
                        >
                          {!celular && <GripVertical size={16} aria-hidden className="organizar__alca" />}
                          <span className="organizar__posicao" aria-hidden>{pi + 1}</span>
                          <span className="organizar__nome-produto">{p.nome}</span>
                          {botoesMover(p.id, p.nome, pi, c.produtos.length, (de, para, b) => moverProduto(c.id, de, para, b))}
                        </li>
                      )
                    })}
                  </ol>
                )
              )}
            </li>
          )
        })}
      </ol>

      {celular && (
        <div className="organizar__acoes-celular">
          {alterada && <Botao onClick={() => setOrdem(montarOrdem(cardapio))}>Desfazer mudanças</Botao>}
          <Botao variante="principal" onClick={salvar} carregando={salvando} disabled={!alterada} mudaAlgo>Salvar ordem</Botao>
        </div>
      )}
      {!alterada && <p className="nota-pe">Nenhuma mudança na ordem ainda.</p>}
    </div>
  )
}
