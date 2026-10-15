// Aba Complementos do Cardápio (T08). As lojas têm muitos complementos e poucos produtos,
// então eles ficam numa aba própria: grupos recolhíveis, busca, filtro e pausa por opção.
import { useMemo, useState } from 'react'
import { ChevronDown, Pencil, Search } from 'lucide-react'
import { usePrototipo } from '../contexto/Prototipo.jsx'
import { useEhCelular } from '../utilitarios/ganchos.js'
import { moeda, numero, plural } from '../utilitarios/formatos.js'
import { produtosQueUsam } from '../dados/cardapios.js'
import { Botao, Carregando, EstadoErro, EstadoVazio, Esqueleto, Interruptor, Selo } from '../componentes/base.jsx'
import { PainelPausar, rotuloEstado, usePausar } from './Pausar.jsx'
import { ModalNomeOrdem, mover, ordinal } from './EditarNomeOrdem.jsx'

const normalizar = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

function PrecoAdicional({ valor }) {
  if (valor == null) return <span className="preco complemento__preco">Sem custo</span>
  return <span className="preco complemento__preco">{valor > 0 ? '+ ' : '− '}{moeda(Math.abs(valor))}</span>
}

export function Complementos() {
  const { cardapio, dadosLoja, estadoForcado, lojaId, editarCardapio } = usePrototipo()
  const celular = useEhCelular()
  const pausa = usePausar()
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [abertos, setAbertos] = useState(() => new Set())
  const [tentou, setTentou] = useState(false)
  const [editando, setEditando] = useState(null)
  const [verTodosProdutos, setVerTodosProdutos] = useState(() => new Set())

  const grupos = estadoForcado === 'vazio' ? [] : cardapio.grupos
  const todasOpcoes = grupos.flatMap((g) => g.itens)
  const pausadas = todasOpcoes.filter((i) => i.estado !== 'ativo')
  const b = normalizar(busca.trim())
  const passa = (i) =>
    (filtro === 'todos' || (filtro === 'ativos' ? i.estado === 'ativo' : i.estado !== 'ativo')) && (!b || normalizar(i.nome).includes(b))
  const filtrados = useMemo(
    () => grupos.map((g, indice) => ({ ...g, indice, visiveis: g.itens.filter(passa), produtos: produtosQueUsam(cardapio, g.id) })).filter((g) => g.visiveis.length > 0 || (!b && filtro === 'todos')),
    [grupos, b, filtro, cardapio], // eslint-disable-line react-hooks/exhaustive-deps
  )
  // com busca ou filtro, os grupos abrem sozinhos para mostrar o que foi achado
  const estaAberto = (id) => b || filtro !== 'todos' || abertos.has(id)
  const alternar = (id) => setAbertos((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const alvo = (g, i) => ({ tipo: 'complemento', id: i.id, grupoId: g.id, nome: i.nome })

  if (estadoForcado === 'carregando') {
    return <Carregando oQue="os complementos"><div className="tabela-esqueleto">{Array.from({ length: 6 }, (_, i) => <Esqueleto key={i} linhas={1} altura="52px" />)}</div></Carregando>
  }
  if (estadoForcado === 'erro' && !tentou) return <EstadoErro oQue="os complementos" aoTentar={() => setTentou(true)} />
  if (grupos.length === 0) {
    return <EstadoVazio titulo="Nenhum complemento cadastrado." texto="Complementos são escolhas dentro de um produto, como sabor, borda, molho ou adicionais." />
  }

  const linha = (g, i) => {
    const ativo = i.estado === 'ativo'
    const r = rotuloEstado(i, dadosLoja.abertura)
    if (celular) {
      return (
        <li key={i.id} className="item-celular">
          <span className="item-celular__textos">
            <span className="item-celular__nome">{i.nome}</span>
            <span className="item-celular__estado">
              {ativo ? <PrecoAdicional valor={i.preco} /> : <><strong>{r.texto}</strong>{r.detalhe ? ` · ${r.detalhe}` : ''}</>}
            </span>
          </span>
          <Interruptor grande ligado={ativo} rotulo={`${i.nome} (${g.nome}): ${ativo ? 'à venda' : 'pausado'}`} aoMudar={(ligar) => (ligar ? pausa.reativar([alvo(g, i)]) : pausa.abrirPausa([alvo(g, i)]))} />
        </li>
      )
    }
    return (
      <li key={i.id} className="produto produto--complemento">
        <span className="produto__nome">{i.nome}</span>
        <PrecoAdicional valor={i.preco} />
        <span className="estado-item">
          <Selo tom={r.tom}>{r.texto}</Selo>
          {r.detalhe && <span className="estado-item__detalhe">{r.detalhe}</span>}
        </span>
        <span className="produto__acoes">
          {ativo ? (
            <Botao tamanho="p" onClick={(e) => pausa.abrirPausa([alvo(g, i)], e.currentTarget)} aria-label={`Pausar ${i.nome} em ${g.nome}`} mudaAlgo>Pausar</Botao>
          ) : (
            <Botao tamanho="p" variante="principal" onClick={() => pausa.reativar([alvo(g, i)])} aria-label={`Reativar ${i.nome} em ${g.nome}`} mudaAlgo>Reativar</Botao>
          )}
        </span>
      </li>
    )
  }

  const filtros = [
    { id: 'todos', rotulo: 'Todos', n: todasOpcoes.length },
    { id: 'ativos', rotulo: 'Ativos', n: todasOpcoes.length - pausadas.length },
    { id: 'pausados', rotulo: 'Pausados', n: pausadas.length },
  ]

  return (
    <>
      <div className={`barra-filtros ${celular ? 'barra-filtros--celular' : ''}`}>
        <div className="busca">
          <Search size={18} aria-hidden className="busca__icone" />
          <input type="search" className="busca__campo" placeholder="Buscar complemento, como “catupiry”" aria-label="Buscar complemento" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <div className="seletor-periodo" role="group" aria-label="Mostrar">
          {filtros.map((f) => (
            <button key={f.id} type="button" className="seletor-periodo__opcao" aria-pressed={filtro === f.id} onClick={() => setFiltro(f.id)}>
              {f.rotulo} <span className="seletor-periodo__n">{numero(f.n)}</span>
            </button>
          ))}
        </div>
      </div>
      <p className="complementos__sub">
        {plural(todasOpcoes.length, 'opção', 'opções')} em {plural(grupos.length, 'grupo', 'grupos')}. Pausar uma opção tira ela de todos os produtos que usam o grupo.
      </p>

      {celular && pausadas.length > 0 && filtro !== 'ativos' && !b && (
        <section className="secao-celular secao-celular--pausados" aria-labelledby="comp-pausados">
          <h2 id="comp-pausados">Pausados agora ({pausadas.length})</h2>
          <ul>{grupos.flatMap((g) => g.itens.filter((i) => i.estado !== 'ativo').map((i) => linha(g, i)))}</ul>
        </section>
      )}

      {filtrados.every((g) => g.visiveis.length === 0) ? (
        <EstadoVazio
          titulo={b ? `Nenhum complemento com “${busca.trim()}”.` : filtro === 'pausados' ? 'Nenhum complemento pausado.' : 'Nenhum complemento ativo.'}
          acao={b ? <Botao onClick={() => setBusca('')}>Limpar busca</Botao> : <Botao onClick={() => setFiltro('todos')}>Ver todos</Botao>}
        />
      ) : (
        <div className="cardapio__conteudo">
          {filtrados.map((g) => {
            const aberto = estaAberto(g.id)
            const pausadasGrupo = g.itens.filter((i) => i.estado !== 'ativo').length
            const todos = verTodosProdutos.has(g.id)
            const nomes = g.produtos.map((x) => x.nome)
            const mostrar = todos ? nomes : nomes.slice(0, 3)
            return (
              <section key={g.id} className="categoria" aria-labelledby={`grupo-${g.id}`}>
                <div className="complemento__cabecalho">
                  <h2 className="categoria__titulo">
                    <button type="button" id={`grupo-${g.id}`} aria-expanded={!!aberto} aria-controls={`lista-${g.id}`} onClick={() => alternar(g.id)}>
                      <ChevronDown size={18} aria-hidden className={aberto ? '' : 'gira-90-negativo'} />
                      <span className="complemento__posicao" aria-label={`${ordinal(g.indice + 1)} grupo`}>{ordinal(g.indice + 1)}</span>
                      <span className="complemento__grupo-nome">{g.nome}</span>
                      {pausadasGrupo > 0 && <Selo tom="ambar">{plural(pausadasGrupo, 'pausada', 'pausadas')}</Selo>}
                      <span className="categoria__contagem">{b || filtro !== 'todos' ? `${g.visiveis.length} de ${g.itens.length}` : plural(g.itens.length, 'opção', 'opções')}</span>
                    </button>
                  </h2>
                  <Botao tamanho="p" variante="texto" icone={Pencil} onClick={() => setEditando({ id: g.id, nome: g.nome, posicao: g.indice + 1, total: grupos.length })} aria-label={`Editar o grupo ${g.nome}`}>
                    Editar grupo
                  </Botao>
                </div>
                <p className="complemento__usado-em">
                  {nomes.length === 0 ? (
                    'Não aparece em nenhum produto ainda.'
                  ) : (
                    <>
                      <span className="complemento__usado-rotulo">Aparece em {plural(nomes.length, 'produto', 'produtos')}:</span> {mostrar.join(', ')}
                      {nomes.length > 3 && (
                        <button type="button" className="link complemento__ver-todos" onClick={() => setVerTodosProdutos((x) => { const n = new Set(x); n.has(g.id) ? n.delete(g.id) : n.add(g.id); return n })}>
                          {todos ? 'ver menos' : `e mais ${nomes.length - 3}`}
                        </button>
                      )}
                    </>
                  )}
                </p>
                {aberto && (
                  <ul id={`lista-${g.id}`} className={celular ? '' : 'produtos produtos--complementos'}>
                    {g.visiveis.map((i) => linha(g, i))}
                  </ul>
                )}
              </section>
            )
          })}
        </div>
      )}
      <PainelPausar controle={pausa} />
      <ModalNomeOrdem
        alvo={editando}
        aoFechar={() => setEditando(null)}
        titulo="Editar grupo de complementos"
        rotuloNome="Nome do grupo"
        ajudaOrdem="Ordem em que o grupo aparece para o cliente dentro dos produtos que o usam."
        aoSalvar={(nome, posicao) =>
          editarCardapio(lojaId, (c) => {
            const i = c.grupos.findIndex((x) => x.id === editando.id)
            c.grupos[i] = { ...c.grupos[i], nome }
            c.grupos = mover(c.grupos, i, posicao - 1)
          })
        }
      />
    </>
  )
}
