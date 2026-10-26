// T08. Cardápio, lista. No celular a tela foca em pausar e reativar.
import { useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronDown, Copy, FileDown, ImageOff, ListOrdered, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { usePrototipo } from '../contexto/Prototipo.jsx'
import { useEhCelular, useTitulo } from '../utilitarios/ganchos.js'
import { baixarCsv, moeda, numero, plural } from '../utilitarios/formatos.js'
import { contarPausados, produtosQueUsam } from '../dados/cardapios.js'
import { Abas, Botao, CabecalhoPagina, Campo, Carregando, Confirmacao, EstadoErro, EstadoVazio, Esqueleto, Interruptor, Selo, Sobreposicao } from '../componentes/base.jsx'
import { PainelPausar, rotuloEstado, usePausar } from './Pausar.jsx'
import { Complementos } from './Complementos.jsx'
import { ModalNomeOrdem, mover, ordinal } from './EditarNomeOrdem.jsx'
import { fotoDoProduto } from '../dados/fotos.js'
import { temPrecoPorModalidade } from '../dados/cardapio2.js'

const normalizar = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Foto pequena do produto; sem foto, um quadro neutro que diz isso
function FotoProduto({ nome, foto, grande }) {
  const [falhou, setFalhou] = useState(false)
  const url = foto || fotoDoProduto(nome)
  if (!url || falhou) {
    return <span className={`produto__foto ${grande ? 'produto__foto--grande' : ''}`} title="Produto sem foto"><ImageOff size={16} aria-hidden /><span className="visualmente-oculto">Sem foto</span></span>
  }
  return <img className={`produto__foto ${grande ? 'produto__foto--grande' : ''}`} src={url} alt="" loading="lazy" width="40" height="40" onError={() => setFalhou(true)} />
}

function Preco({ valor }) {
  return valor == null ? <span className="preco preco--sem">Sem preço</span> : <span className="preco">{moeda(valor)}</span>
}

function EstadoItem({ item, abertura }) {
  const r = rotuloEstado(item, abertura)
  return (
    <span className="estado-item">
      <Selo tom={r.tom}>{r.texto}</Selo>
      {r.detalhe && <span className="estado-item__detalhe">{r.detalhe}</span>}
    </span>
  )
}

function ModalNovaCategoria({ aberto, aoFechar }) {
  const { lojaId, adicionarCategoria, avisar } = usePrototipo()
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const salvar = async () => {
    if (!nome.trim()) return setErro('Dê um nome à categoria, como "Pastéis especiais".')
    setEnviando(true)
    try {
      await adicionarCategoria(lojaId, nome.trim())
      avisar(`Categoria "${nome.trim()}" criada. Ela aparece no app quando tiver um produto ativo.`, 'sucesso')
      setNome('')
      aoFechar()
    } catch {
      setErro('Não foi possível criar a categoria. Tente de novo.')
    } finally {
      setEnviando(false)
    }
  }
  return (
    <Sobreposicao
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Nova categoria"
      forma="modal"
      largura="440px"
      rodape={
        <>
          <Botao onClick={aoFechar}>Cancelar</Botao>
          <Botao variante="principal" onClick={salvar} carregando={enviando} mudaAlgo>Criar categoria</Botao>
        </>
      }
    >
      <Campo rotulo="Nome da categoria" erro={erro}>
        {(p) => <input {...p} className="campo__entrada" value={nome} onChange={(e) => { setNome(e.target.value); setErro(null) }} data-foco-inicial />}
      </Campo>
    </Sobreposicao>
  )
}

export function Cardapio() {
  const { cardapio, loja, lojaId, cen, estadoForcado, excluirProduto, avisar, dadosLoja, editarCardapio } = usePrototipo()
  const celular = useEhCelular()
  const navegar = useNavigate()
  const { pathname } = useLocation()
  const aba = pathname.startsWith('/cardapio/complementos') ? 'complementos' : 'produtos'
  const [params, setParams] = useSearchParams()
  const filtro = params.get('filtro') || 'todos'
  const [busca, setBusca] = useState('')
  const [fechadas, setFechadas] = useState(() => new Set())
  const [selecao, setSelecao] = useState(() => new Set())
  const [excluir, setExcluir] = useState(null)
  const [excluindo, setExcluindo] = useState(false)
  const [novaCategoria, setNovaCategoria] = useState(false)
  const [avisoEdicao, setAvisoEdicao] = useState(null)
  const [tentou, setTentou] = useState(false)
  const [editandoCategoria, setEditandoCategoria] = useState(null)
  const pausa = usePausar()
  const botoesPausa = useRef({})
  useTitulo(aba === 'complementos' ? 'Complementos' : 'Cardápio')

  const vazioForcado = estadoForcado === 'vazio'
  const produtos = vazioForcado ? [] : cardapio.produtos
  const grupos = []
  const pausados = contarPausados({ produtos, grupos })
  const totalItens = produtos.length + grupos.reduce((s, g) => s + g.itens.length, 0)

  const b = normalizar(busca.trim())
  const passa = (item) => {
    if (filtro === 'ativos' && item.estado !== 'ativo') return false
    if (filtro === 'pausados' && item.estado === 'ativo') return false
    if (b && !normalizar(item.nome).includes(b)) return false
    return true
  }
  const categorias = useMemo(
    () => cardapio.categorias.map((c) => ({ ...c, produtos: produtos.filter((p) => p.categoria === c.id && passa(p)), total: produtos.filter((p) => p.categoria === c.id).length })),
    [cardapio, produtos, filtro, b], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const gruposFiltrados = grupos.map((g) => ({ ...g, itensFiltrados: g.itens.filter(passa) }))
  const nadaEncontrado = categorias.every((c) => c.produtos.length === 0) && gruposFiltrados.every((g) => g.itensFiltrados.length === 0)

  const mudarFiltro = (f) => {
    const p = new URLSearchParams(params)
    if (f === 'todos') p.delete('filtro')
    else p.set('filtro', f)
    setParams(p, { replace: true })
  }

  const alvoProduto = (p) => ({ tipo: 'produto', id: p.id, nome: p.nome })
  const alvoComplemento = (g, i) => ({ tipo: 'complemento', id: i.id, grupoId: g.id, nome: i.nome })

  const alternarSelecao = (id) =>
    setSelecao((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  const selecionados = produtos.filter((p) => selecao.has(p.id))

  const exportar = () =>
    baixarCsv({
      loja: loja.nome,
      periodo: 'cardápio atual',
      tipo: 'cardapio',
      cabecalho: ['Categoria', 'Produto', 'Preço', 'Estado'],
      linhas: cardapio.produtos.map((p) => [cardapio.categorias.find((c) => c.id === p.categoria)?.nome, p.nome, p.preco == null ? 'Sem preço' : p.preco.toFixed(2).replace('.', ','), rotuloEstado(p, dadosLoja.abertura).texto]),
    })

  const editar = (p) => {
    if (celular) setAvisoEdicao(p)
    else navegar(`/cardapio/produto/${p.id.replace('p', '')}`)
  }

  const confirmarExclusao = async () => {
    setExcluindo(true)
    try {
      await excluirProduto(lojaId, excluir.id)
      avisar(`${excluir.nome} foi excluído do cardápio.`, 'sucesso')
      setExcluir(null)
    } catch {
      avisar(`Não foi possível excluir ${excluir.nome}. Ele continua no cardápio.`, 'erro')
    } finally {
      setExcluindo(false)
    }
  }

  const erro = estadoForcado === 'erro' && !tentou
  const carregando = estadoForcado === 'carregando'
  const cardapioVazio = produtos.length === 0

  // ---------- Linhas ----------
  const linhaProdutoComputador = (p) => {
    const ativo = p.estado === 'ativo'
    return (
      <li key={p.id} className={`produto ${selecao.has(p.id) ? 'produto--selecionado' : ''}`}>
        <input type="checkbox" className="caixa" checked={selecao.has(p.id)} onChange={() => alternarSelecao(p.id)} aria-label={`Selecionar ${p.nome}`} />
        <FotoProduto nome={p.nome} foto={p.foto} />
        <span className="produto__nome">
          {p.nome}
          {p.descricao && <span className="produto__descricao">{p.descricao}</span>}
        </span>
        <span className="produto__preco">
          <Preco valor={p.preco} />
          {temPrecoPorModalidade(p) && <span className="produto__preco-nota">Preço varia por modalidade</span>}
        </span>
        <EstadoItem item={p} abertura={dadosLoja.abertura} />
        <span className="produto__acoes">
          {ativo ? (
            <Botao tamanho="p" ref={(el) => (botoesPausa.current[p.id] = el)} onClick={(e) => pausa.abrirPausa([alvoProduto(p)], e.currentTarget)} aria-label={`Pausar ${p.nome}`} mudaAlgo>Pausar</Botao>
          ) : (
            <Botao tamanho="p" variante="principal" onClick={() => pausa.reativar([alvoProduto(p)])} aria-label={`Reativar ${p.nome}`} mudaAlgo>Reativar</Botao>
          )}
          <Botao tamanho="p" variante="texto" icone={Pencil} onClick={() => editar(p)} aria-label={`Editar ${p.nome}`}>Editar</Botao>
          <Botao tamanho="p" variante="texto" icone={Trash2} onClick={() => setExcluir(p)} aria-label={`Excluir ${p.nome}`} mudaAlgo>Excluir</Botao>
        </span>
      </li>
    )
  }

  const linhaCelular = (item, alvo) => {
    const ativo = item.estado === 'ativo'
    const r = rotuloEstado(item, dadosLoja.abertura)
    return (
      <li key={alvo.id} className="item-celular">
        {alvo.tipo === 'produto' && <FotoProduto nome={item.nome} foto={item.foto} grande />}
        <span className="item-celular__textos">
          {alvo.tipo === 'produto' ? (
            <button type="button" className="item-celular__nome" onClick={() => editar(item)}>{item.nome}</button>
          ) : (
            <span className="item-celular__nome">{item.nome}</span>
          )}
          <span className="item-celular__estado">
            {ativo ? (alvo.tipo === 'produto' ? <Preco valor={item.preco} /> : 'À venda') : <><strong>{r.texto}</strong>{r.detalhe ? ` · ${r.detalhe}` : ''}</>}
          </span>
        </span>
        <Interruptor
          grande
          ligado={ativo}
          rotulo={`${item.nome}: ${ativo ? 'à venda' : 'pausado'}`}
          aoMudar={(ligar) => (ligar ? pausa.reativar([alvo]) : pausa.abrirPausa([alvo]))}
        />
      </li>
    )
  }

  const linhaComplementoComputador = (g, i) => {
    const ativo = i.estado === 'ativo'
    const alvo = alvoComplemento(g, i)
    return (
      <li key={i.id} className="produto produto--complemento">
        <span className="produto__nome">{i.nome}</span>
        <EstadoItem item={i} abertura={dadosLoja.abertura} />
        <span className="produto__acoes">
          {ativo ? (
            <Botao tamanho="p" onClick={(e) => pausa.abrirPausa([alvo], e.currentTarget)} aria-label={`Pausar ${i.nome}`} mudaAlgo>Pausar</Botao>
          ) : (
            <Botao tamanho="p" variante="principal" onClick={() => pausa.reativar([alvo])} aria-label={`Reativar ${i.nome}`} mudaAlgo>Reativar</Botao>
          )}
        </span>
      </li>
    )
  }

  // ---------- Conteúdo ----------
  let conteudo
  if (carregando) {
    conteudo = (
      <Carregando oQue="o cardápio">
        <div className="tabela-esqueleto">{Array.from({ length: 8 }, (_, i) => <Esqueleto key={i} linhas={1} altura="52px" />)}</div>
      </Carregando>
    )
  } else if (erro) {
    conteudo = <EstadoErro oQue="o cardápio" aoTentar={() => setTentou(true)} />
  } else if (cardapioVazio) {
    conteudo = (
      <EstadoVazio
        titulo="Seu cardápio ainda não tem produtos."
        texto="Comece por uma categoria, como “Pastéis salgados”, e depois cadastre os produtos dentro dela."
        acao={<Botao variante="principal" icone={Plus} onClick={() => setNovaCategoria(true)} mudaAlgo>Criar a primeira categoria</Botao>}
      />
    )
  } else if (nadaEncontrado) {
    conteudo = (
      <EstadoVazio
        titulo={b ? `Nenhum produto ou complemento com “${busca.trim()}”.` : filtro === 'pausados' ? 'Nada pausado agora.' : 'Nenhum item ativo.'}
        texto={b ? 'Confira a grafia ou busque por parte do nome.' : filtro === 'pausados' ? 'Tudo do cardápio está à venda.' : undefined}
        acao={b ? <Botao onClick={() => setBusca('')}>Limpar busca</Botao> : filtro !== 'todos' ? <Botao onClick={() => mudarFiltro('todos')}>Ver todos</Botao> : null}
      />
    )
  } else if (celular) {
    const pausadosLista = [
      ...pausados.produtos.filter(passa).map((p) => [p, alvoProduto(p)]),
      ...grupos.flatMap((g) => g.itens.filter((i) => i.estado !== 'ativo' && passa(i)).map((i) => [i, alvoComplemento(g, i)])),
    ]
    conteudo = (
      <>
        {pausadosLista.length > 0 && filtro !== 'ativos' && (
          <section className="secao-celular secao-celular--pausados" aria-labelledby="cel-pausados">
            <h2 id="cel-pausados">Pausados agora ({pausadosLista.length})</h2>
            <ul>{pausadosLista.map(([i, a]) => linhaCelular(i, a))}</ul>
          </section>
        )}
        {filtro !== 'pausados' &&
          categorias.filter((c) => c.produtos.some((p) => p.estado === 'ativo')).map((c) => (
            <section key={c.id} className="secao-celular" aria-labelledby={`cel-${c.id}`}>
              <h2 id={`cel-${c.id}`}>{c.nome}</h2>
              <ul>{c.produtos.filter((p) => p.estado === 'ativo').map((p) => linhaCelular(p, alvoProduto(p)))}</ul>
            </section>
          ))}
        {filtro !== 'pausados' &&
          gruposFiltrados.filter((g) => g.itensFiltrados.some((i) => i.estado === 'ativo')).map((g) => (
            <section key={g.id} className="secao-celular" aria-labelledby={`cel-${g.id}`}>
              <h2 id={`cel-${g.id}`}>{g.nome} <span className="secao-celular__sub">complemento · em {plural(produtosQueUsam(cardapio, g.id).length, 'produto', 'produtos')}</span></h2>
              <ul>{g.itensFiltrados.filter((i) => i.estado === 'ativo').map((i) => linhaCelular(i, alvoComplemento(g, i)))}</ul>
            </section>
          ))}
      </>
    )
  } else {
    conteudo = (
      <>
        {categorias
          .filter((c) => c.produtos.length > 0 || (!b && filtro === 'todos'))
          .map((c) => {
            const aberta = !fechadas.has(c.id)
            return (
              <section key={c.id} className="categoria" aria-labelledby={`cat-${c.id}`}>
                <div className="complemento__cabecalho">
                <h2 className="categoria__titulo">
                  <button
                    type="button"
                    id={`cat-${c.id}`}
                    aria-expanded={aberta}
                    aria-controls={`lista-${c.id}`}
                    onClick={() => setFechadas((s) => { const n = new Set(s); n.has(c.id) ? n.delete(c.id) : n.add(c.id); return n })}
                  >
                    <ChevronDown size={18} aria-hidden className={aberta ? '' : 'gira-90-negativo'} />
                    <span className="complemento__posicao" aria-label={`${ordinal(cardapio.categorias.findIndex((x) => x.id === c.id) + 1)} categoria`}>{ordinal(cardapio.categorias.findIndex((x) => x.id === c.id) + 1)}</span>
                    {c.nome}
                    <span className="categoria__contagem">{b || filtro !== 'todos' ? `${c.produtos.length} de ${c.total}` : plural(c.total, 'produto', 'produtos')}</span>
                  </button>
                </h2>
                <Botao tamanho="p" variante="texto" icone={Plus} para={`/cardapio/produto/novo?categoria=${c.id}`} aria-label={`Adicionar produto em ${c.nome}`}>
                  Adicionar produto
                </Botao>
                <Botao tamanho="p" variante="texto" icone={Pencil} aria-label={`Editar a categoria ${c.nome}`} onClick={() => setEditandoCategoria({ id: c.id, nome: c.nome, posicao: cardapio.categorias.findIndex((x) => x.id === c.id) + 1, total: cardapio.categorias.length })}>
                  Editar categoria
                </Botao>
                </div>
                {aberta && (
                  c.produtos.length ? <ul id={`lista-${c.id}`} className="produtos">{c.produtos.map(linhaProdutoComputador)}</ul>
                    : <p id={`lista-${c.id}`} className="categoria__vazia">Nenhum produto nesta categoria ainda.</p>
                )}
              </section>
            )
          })}
        {gruposFiltrados.filter((g) => g.itensFiltrados.length > 0).length > 0 && (
          <section className="complementos" aria-labelledby="titulo-complementos">
            <h2 id="titulo-complementos" className="complementos__titulo">Complementos</h2>
            <p className="complementos__sub">Pausar um complemento tira a opção de todos os produtos que o usam.</p>
            {gruposFiltrados.filter((g) => g.itensFiltrados.length > 0).map((g) => (
              <section key={g.id} className="categoria" aria-labelledby={`grupo-${g.id}`}>
                <h3 className="categoria__titulo categoria__titulo--estatico" id={`grupo-${g.id}`}>
                  {g.nome}
                  <span className="categoria__contagem">usado em {plural(produtosQueUsam(cardapio, g.id).length, 'produto', 'produtos')}</span>
                </h3>
                <ul className="produtos produtos--complementos">{g.itensFiltrados.map((i) => linhaComplementoComputador(g, i))}</ul>
              </section>
            ))}
          </section>
        )}
      </>
    )
  }

  const filtros = [
    { id: 'todos', rotulo: 'Todos', n: totalItens },
    { id: 'ativos', rotulo: 'Ativos', n: totalItens - pausados.total },
    { id: 'pausados', rotulo: 'Pausados', n: pausados.total },
  ]

  return (
    <div className="pagina pagina--cardapio">
      <CabecalhoPagina
        titulo="Cardápio"
        descricao={celular ? undefined : `${plural(produtos.length, 'produto', 'produtos')} em ${plural(cardapio.categorias.length, 'categoria', 'categorias')} · ${loja.nome}`}
        acoes={
          !celular && !cardapioVazio && (
            <>
              <Botao variante="principal" icone={Plus} para="/cardapio/produto/novo">Novo produto</Botao>
              <Botao icone={Plus} onClick={() => setNovaCategoria(true)} mudaAlgo>Nova categoria</Botao>
              <Botao icone={ListOrdered} para="/cardapio/organizar">Organizar cardápio</Botao>
              <Botao icone={FileDown} onClick={exportar}>Exportar CSV</Botao>
              {cen.rede && <Botao icone={Copy} para="/cardapio/copiar">Copiar para outras lojas</Botao>}
            </>
          )
        }
      />
      {!cardapioVazio && (
        <Abas
          comoLinks
          rotulo="Partes do cardápio"
          ativa={aba}
          abas={[
            { id: 'produtos', rotulo: `Produtos (${cardapio.produtos.length})`, para: '/cardapio' },
            { id: 'complementos', rotulo: `Complementos (${cardapio.grupos.reduce((n, g) => n + g.itens.length, 0)})`, para: '/cardapio/complementos' },
          ]}
        />
      )}
      {aba === 'complementos' && !cardapioVazio && <Complementos />}
      {aba === 'produtos' && !cardapioVazio && !erro && !carregando && (
        <div className={`barra-filtros ${celular ? 'barra-filtros--celular' : ''}`}>
          <div className="busca">
            <Search size={18} aria-hidden className="busca__icone" />
            <input type="search" className="busca__campo" placeholder="Buscar produto" aria-label="Buscar produto" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          <div className="seletor-periodo" role="group" aria-label="Mostrar">
            {filtros.map((f) => (
              <button key={f.id} type="button" className="seletor-periodo__opcao" aria-pressed={filtro === f.id} onClick={() => mudarFiltro(f.id)}>
                {f.rotulo} <span className="seletor-periodo__n">{numero(f.n)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {aba === 'produtos' && selecionados.length > 0 && !celular && (
        <div className="barra-lote" role="region" aria-label="Ações em lote">
          <span><strong>{plural(selecionados.length, 'produto selecionado', 'produtos selecionados')}</strong></span>
          <Botao tamanho="p" onClick={(e) => pausa.abrirPausa(selecionados.filter((p) => p.estado === 'ativo').map(alvoProduto), e.currentTarget)} disabled={!selecionados.some((p) => p.estado === 'ativo')} mudaAlgo>Pausar</Botao>
          <Botao tamanho="p" onClick={async () => { await pausa.reativar(selecionados.filter((p) => p.estado !== 'ativo').map(alvoProduto)); setSelecao(new Set()) }} disabled={!selecionados.some((p) => p.estado !== 'ativo')} mudaAlgo>Reativar</Botao>
          <Botao tamanho="p" variante="texto" onClick={() => setSelecao(new Set())}>Limpar seleção</Botao>
        </div>
      )}
      {(aba === 'produtos' || cardapioVazio) && <div className="cardapio__conteudo">{conteudo}</div>}
      {celular && !cardapioVazio && (
        <div className="cardapio__acoes-celular">
          <Link to="/cardapio/produto/novo" className="link">Novo produto</Link>
          <Link to="/cardapio/organizar" className="link">Organizar cardápio</Link>
          <button type="button" className="link" onClick={exportar}>Exportar CSV</button>
          {cen.rede && <Link to="/cardapio/copiar" className="link">Copiar para outras lojas</Link>}
        </div>
      )}

      <PainelPausar controle={pausa} />
      <Confirmacao
        aberto={!!excluir}
        aoFechar={() => setExcluir(null)}
        titulo={`Excluir ${excluir?.nome}?`}
        texto={`${excluir?.nome} sai do cardápio da ${loja.nome} em todas as modalidades. Para tirar de venda só por um tempo, use Pausar.`}
        rotuloConfirmar="Excluir produto"
        destrutivo
        carregando={excluindo}
        aoConfirmar={confirmarExclusao}
      />
      <ModalNovaCategoria aberto={novaCategoria} aoFechar={() => setNovaCategoria(false)} />
      <ModalNomeOrdem
        alvo={editandoCategoria}
        aoFechar={() => setEditandoCategoria(null)}
        titulo="Editar categoria"
        rotuloNome="Nome da categoria"
        ajudaOrdem="Ordem em que a categoria aparece no app e no cardápio web."
        aoSalvar={(nome, posicao) =>
          editarCardapio(lojaId, (cd) => {
            const i = cd.categorias.findIndex((x) => x.id === editandoCategoria.id)
            cd.categorias[i] = { ...cd.categorias[i], nome }
            cd.categorias = mover(cd.categorias, i, posicao - 1)
          })
        }
      />
      <Sobreposicao
        aberto={!!avisoEdicao}
        aoFechar={() => setAvisoEdicao(null)}
        titulo={`Editar ${avisoEdicao?.nome}`}
        forma="folha"
        rodape={
          <>
            <Botao onClick={() => setAvisoEdicao(null)}>Agora não</Botao>
            <Botao variante="principal" onClick={() => navegar(`/cardapio/produto/${avisoEdicao.id.replace('p', '')}`)}>Abrir edição</Botao>
          </>
        }
      >
        <p className="texto-corpo">A edição completa funciona melhor no computador. No celular, a mesma página abre em uma coluna só.</p>
      </Sobreposicao>
    </div>
  )
}
