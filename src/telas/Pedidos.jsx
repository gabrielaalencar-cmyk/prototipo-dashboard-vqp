// T06. Pedidos, lista. O detalhe (T07) abre em painel lateral no computador e em tela cheia no celular.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, FileDown, Search, SlidersHorizontal } from 'lucide-react'
import { usePrototipo } from '../contexto/Prototipo.jsx'
import { useEhCelular, useTitulo } from '../utilitarios/ganchos.js'
import { AGORA_REFERENCIA, baixarCsv, dataCurta, diaMes, hora, moeda, numero, plural } from '../utilitarios/formatos.js'
import { GRUPOS_STATUS } from '../dados/pedidos.js'
import { Botao, Carregando, CabecalhoPagina, EstadoErro, EstadoVazio, Esqueleto, Selo, Sobreposicao } from '../componentes/base.jsx'
import { DetalhePedido } from './PedidoDetalhe.jsx'

const PERIODOS = [
  { id: 'hoje', rotulo: 'Hoje' },
  { id: 'ontem', rotulo: 'Ontem' },
  { id: '7-dias', rotulo: 'Últimos 7 dias' },
  { id: 'personalizado', rotulo: 'Personalizado' },
]
const MODALIDADES = ['Delivery', 'Quero levar', 'Comer aqui']

const inicioDia = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const paraInput = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const deInput = (s) => {
  const [a, m, d] = s.split('-').map(Number)
  return new Date(a, m - 1, d)
}

export function SeloStatus({ pedido }) {
  const g = GRUPOS_STATUS[pedido.grupo]
  const texto = pedido.grupo === 'atencao' ? `${g.rotulo}` : pedido.grupo === 'andamento' ? pedido.status : pedido.grupo === 'cancelado' ? pedido.status : pedido.status
  return (
    <span className="status-pedido">
      <Selo tom={g.tom}>{texto}</Selo>
      {pedido.grupo === 'atencao' && <span className="status-pedido__detalhe">Parado há {pedido.parado.minutos} min · {pedido.parado.etapa}</span>}
    </span>
  )
}

function useFiltros() {
  const [params, setParams] = useSearchParams()
  const filtros = {
    busca: params.get('q') || '',
    periodo: params.get('periodo') || 'hoje',
    de: params.get('de') || '2026-10-03',
    ate: params.get('ate') || '2026-10-09',
    grupo: params.get('grupo') || '',
    modalidade: params.get('modalidade') || '',
    pagamento: params.get('pagamento') || '',
  }
  const mudar = (novos) => {
    const p = new URLSearchParams(params)
    Object.entries(novos).forEach(([k, v]) => {
      const chave = k === 'busca' ? 'q' : k
      if (v) p.set(chave, v)
      else p.delete(chave)
    })
    setParams(p, { replace: true })
  }
  const ativos = ['grupo', 'modalidade', 'pagamento'].filter((k) => filtros[k]).length + (filtros.busca ? 1 : 0)
  const limpar = () => setParams(new URLSearchParams({ periodo: filtros.periodo }), { replace: true })
  return { filtros, mudar, ativos, limpar }
}

function filtrar(pedidos, f) {
  const hoje = inicioDia(AGORA_REFERENCIA)
  let de, ate
  if (f.periodo === 'hoje') [de, ate] = [hoje, new Date(hoje.getTime() + 86400000)]
  else if (f.periodo === 'ontem') [de, ate] = [new Date(hoje.getTime() - 86400000), hoje]
  else if (f.periodo === '7-dias') [de, ate] = [new Date(hoje.getTime() - 6 * 86400000), new Date(hoje.getTime() + 86400000)]
  else [de, ate] = [deInput(f.de), new Date(deInput(f.ate).getTime() + 86400000)]
  const b = f.busca.trim().toLowerCase().replace('#', '')
  const digitos = b.replace(/\D/g, '')
  return pedidos.filter((p) => {
    if (p.criado < de || p.criado >= ate) return false
    if (f.grupo && p.grupo !== f.grupo) return false
    if (f.modalidade && p.modalidade !== f.modalidade) return false
    if (f.pagamento && p.pagamento !== f.pagamento) return false
    if (b) {
      const porNumero = digitos && String(p.numero).includes(digitos)
      const porTelefone = digitos.length >= 4 && p.cliente.telefone.replace(/\D/g, '').endsWith(digitos.slice(-4))
      const porNome = p.cliente.nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(b.normalize('NFD').replace(/[̀-ͯ]/g, ''))
      if (!porNumero && !porTelefone && !porNome) return false
    }
    return true
  })
}

function rotuloPeriodo(f) {
  if (f.periodo === 'personalizado') return `${diaMes(deInput(f.de))} a ${diaMes(deInput(f.ate))}`
  return PERIODOS.find((p) => p.id === f.periodo).rotulo
}

// Campos de filtro (os mesmos no computador e na folha de baixo do celular)
function CamposFiltro({ filtros, mudar, pagamentos }) {
  return (
    <>
      <label className="filtro">
        <span className="filtro__rotulo">Status</span>
        <select value={filtros.grupo} onChange={(e) => mudar({ grupo: e.target.value })}>
          <option value="">Todos</option>
          {Object.entries(GRUPOS_STATUS).map(([id, g]) => <option key={id} value={id}>{g.rotulo}</option>)}
        </select>
      </label>
      <label className="filtro">
        <span className="filtro__rotulo">Modalidade</span>
        <select value={filtros.modalidade} onChange={(e) => mudar({ modalidade: e.target.value })}>
          <option value="">Todas</option>
          {MODALIDADES.map((m) => <option key={m}>{m}</option>)}
        </select>
      </label>
      <label className="filtro">
        <span className="filtro__rotulo">Pagamento</span>
        <select value={filtros.pagamento} onChange={(e) => mudar({ pagamento: e.target.value })}>
          <option value="">Todas as formas</option>
          {pagamentos.map((m) => <option key={m}>{m}</option>)}
        </select>
      </label>
    </>
  )
}

function SeletorPeriodo({ filtros, mudar }) {
  return (
    <div className="periodo-pedidos">
      <div className="seletor-periodo" role="group" aria-label="Período">
        {PERIODOS.map((p) => (
          <button key={p.id} type="button" className="seletor-periodo__opcao" aria-pressed={filtros.periodo === p.id} onClick={() => mudar({ periodo: p.id })}>
            {p.rotulo}
          </button>
        ))}
      </div>
      {filtros.periodo === 'personalizado' && (
        <div className="periodo-pedidos__datas">
          <label className="filtro">
            <span className="filtro__rotulo">De</span>
            <input type="date" value={filtros.de} max={filtros.ate} min="2026-10-03" onChange={(e) => mudar({ de: e.target.value })} />
          </label>
          <label className="filtro">
            <span className="filtro__rotulo">Até</span>
            <input type="date" value={filtros.ate} min={filtros.de} max={paraInput(AGORA_REFERENCIA)} onChange={(e) => mudar({ ate: e.target.value })} />
          </label>
        </div>
      )}
    </div>
  )
}

const POR_PAGINA = 50

export function Pedidos() {
  const { lojaId, loja, pedidosDaLoja, estadoForcado } = usePrototipo()
  const { numero: numeroAberto } = useParams()
  const navegar = useNavigate()
  const { search } = useLocation()
  const celular = useEhCelular()
  const { filtros, mudar, ativos, limpar } = useFiltros()
  const [ordem, setOrdem] = useState({ campo: 'criado', direcao: 'desc' })
  const [pagina, setPagina] = useState(0)
  const [tentou, setTentou] = useState(false)
  const [folhaFiltros, setFolhaFiltros] = useState(false)
  const linhas = useRef({})
  const ultimaAberta = useRef(null)
  useTitulo(numeroAberto ? `Pedido #${numeroAberto}` : 'Pedidos')

  const todos = pedidosDaLoja(lojaId)
  const pagamentos = useMemo(() => [...new Set(todos.map((p) => p.pagamento))].sort(), [todos])
  const resultado = useMemo(() => {
    const r = estadoForcado === 'vazio' ? [] : filtrar(todos, filtros)
    const s = [...r].sort((a, b) => {
      const v = ordem.campo === 'total' ? a.total - b.total : a.criado - b.criado
      return ordem.direcao === 'asc' ? v : -v
    })
    return s
  }, [todos, filtros, ordem, estadoForcado])
  const soma = resultado.filter((p) => p.grupo !== 'cancelado').reduce((s, p) => s + p.total, 0)
  const totalPaginas = Math.max(1, Math.ceil(resultado.length / POR_PAGINA))
  const visiveis = resultado.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA)

  useEffect(() => setPagina(0), [filtros.busca, filtros.periodo, filtros.grupo, filtros.modalidade, filtros.pagamento, filtros.de, filtros.ate])

  // O foco volta para a linha do pedido ao fechar o painel
  useEffect(() => {
    if (numeroAberto) ultimaAberta.current = numeroAberto
    else if (ultimaAberta.current) {
      const el = linhas.current[ultimaAberta.current]
      setTimeout(() => el?.focus(), 0)
      ultimaAberta.current = null
    }
  }, [numeroAberto])

  const pedidoAberto = numeroAberto ? todos.find((p) => String(p.numero) === numeroAberto) : null
  const abrirPedido = (n) => navegar(`/pedidos/${n}${search}`)
  const fecharPedido = () => navegar(`/pedidos${search}`)

  const exportar = () =>
    baixarCsv({
      loja: loja.nome,
      periodo: rotuloPeriodo(filtros),
      tipo: 'pedidos',
      cabecalho: ['Número', 'Data', 'Cliente', 'Telefone', 'Modalidade', 'Status', 'Pagamento', 'Total'],
      linhas: resultado.map((p) => [p.numero, dataCurta(p.criado), p.cliente.nome, p.cliente.telefone, p.modalidade, p.grupo === 'atencao' ? 'Precisa de atenção' : p.status, p.pagamento, p.total.toFixed(2).replace('.', ',')]),
    })

  // Celular: o detalhe ocupa a tela cheia
  if (celular && numeroAberto) {
    return pedidoAberto ? <DetalhePedido pedido={pedidoAberto} aoFechar={fecharPedido} telaCheia /> : <PedidoNaoEncontrado numero={numeroAberto} />
  }

  const ordenar = (campo) => setOrdem((o) => ({ campo, direcao: o.campo === campo && o.direcao === 'desc' ? 'asc' : 'desc' }))
  const IconeOrdem = ({ campo }) => (ordem.campo !== campo ? <ArrowUpDown size={14} aria-hidden /> : ordem.direcao === 'asc' ? <ArrowUp size={14} aria-hidden /> : <ArrowDown size={14} aria-hidden />)
  const ariaSort = (campo) => (ordem.campo === campo ? (ordem.direcao === 'asc' ? 'ascending' : 'descending') : 'none')

  const erro = estadoForcado === 'erro' && !tentou
  const carregando = estadoForcado === 'carregando'

  let conteudo
  if (carregando) {
    conteudo = (
      <Carregando oQue="os pedidos">
        <div className="tabela-esqueleto">{Array.from({ length: 8 }, (_, i) => <Esqueleto key={i} linhas={1} altura="44px" />)}</div>
      </Carregando>
    )
  } else if (erro) {
    conteudo = <EstadoErro oQue="os pedidos" aoTentar={() => setTentou(true)} />
  } else if (resultado.length === 0) {
    conteudo = ativos > 0 ? (
      <EstadoVazio titulo="Nenhum pedido com esses filtros." acao={<Botao onClick={limpar}>Limpar filtros</Botao>} />
    ) : (
      <EstadoVazio
        titulo={filtros.periodo === 'hoje' ? 'Nenhum pedido hoje até agora.' : `Nenhum pedido em ${rotuloPeriodo(filtros).toLowerCase()}.`}
        texto={filtros.periodo === 'hoje' ? 'Os pedidos aparecem aqui assim que chegam.' : undefined}
      />
    )
  } else if (celular) {
    conteudo = (
      <ul className="cartoes-pedido">
        {visiveis.map((p) => (
          <li key={p.numero}>
            <button type="button" ref={(el) => (linhas.current[p.numero] = el)} className="cartao-pedido" onClick={() => abrirPedido(p.numero)}>
              <span className="cartao-pedido__topo">
                <span className="cartao-pedido__numero">#{p.numero}</span>
                <span className="cartao-pedido__total">{moeda(p.total)}</span>
              </span>
              <span className="cartao-pedido__cliente">{p.cliente.nome} · {dataCurta(p.criado)}</span>
              <SeloStatus pedido={p} />
            </button>
          </li>
        ))}
      </ul>
    )
  } else {
    conteudo = (
      <div className="tabela-rolagem">
        <table className="tabela tabela--pedidos">
          <caption className="visualmente-oculto">Pedidos de {rotuloPeriodo(filtros).toLowerCase()}, {ordem.campo === 'total' ? 'ordenados pelo total' : 'ordenados pelo horário'}</caption>
          <thead>
            <tr>
              <th scope="col">Número</th>
              <th scope="col" aria-sort={ariaSort('criado')}>
                <button type="button" className="tabela__ordenar" onClick={() => ordenar('criado')}>Horário <IconeOrdem campo="criado" /></button>
              </th>
              <th scope="col">Cliente</th>
              <th scope="col">Modalidade</th>
              <th scope="col">Status</th>
              <th scope="col" className="tabela__num" aria-sort={ariaSort('total')}>
                <button type="button" className="tabela__ordenar" onClick={() => ordenar('total')}>Total <IconeOrdem campo="total" /></button>
              </th>
            </tr>
          </thead>
          <tbody>
            {visiveis.map((p) => (
              <tr key={p.numero} className={String(p.numero) === numeroAberto ? 'tabela__linha--aberta' : ''} onClick={() => abrirPedido(p.numero)}>
                <td>
                  <button type="button" ref={(el) => (linhas.current[p.numero] = el)} className="tabela__abrir" onClick={(e) => { e.stopPropagation(); abrirPedido(p.numero) }}>
                    #{p.numero}
                  </button>
                </td>
                <td className="tabela__hora">{dataCurta(p.criado)}</td>
                <td>
                  <span className="tabela__principal">{p.cliente.nome}</span>
                  <span className="tabela__secundario">{p.cliente.telefone}</span>
                </td>
                <td>{p.modalidade}</td>
                <td><SeloStatus pedido={p} /></td>
                <td className="tabela__num">{moeda(p.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className={`pagina pagina--pedidos ${pedidoAberto && !celular ? 'pagina--com-painel' : ''}`}>
      <div className="pagina__lista">
        <CabecalhoPagina
          titulo="Pedidos"
          acoes={!celular && <Botao icone={FileDown} onClick={exportar} disabled={!resultado.length || erro || carregando}>Exportar CSV</Botao>}
        />
        <div className={`barra-filtros ${celular ? 'barra-filtros--celular' : ''}`}>
          <div className="busca">
            <Search size={18} aria-hidden className="busca__icone" />
            <input
              type="search"
              className="busca__campo"
              placeholder="Número, nome ou telefone"
              aria-label="Buscar pedido por número, nome ou telefone do cliente"
              value={filtros.busca}
              onChange={(e) => mudar({ busca: e.target.value })}
            />
          </div>
          {celular ? (
            <div className="barra-filtros__linha">
              <SeletorPeriodo filtros={filtros} mudar={mudar} />
              <Botao icone={SlidersHorizontal} onClick={() => setFolhaFiltros(true)} aria-label={`Filtros${ativos ? `, ${ativos} ativos` : ''}`}>
                Filtros{ativos ? ` (${ativos})` : ''}
              </Botao>
            </div>
          ) : (
            <>
              <SeletorPeriodo filtros={filtros} mudar={mudar} />
              <div className="barra-filtros__selects">
                <CamposFiltro filtros={filtros} mudar={mudar} pagamentos={pagamentos} />
              </div>
            </>
          )}
        </div>
        {!carregando && !erro && resultado.length > 0 && (
          <p className="resumo-resultado" role="status">
            <strong>{plural(resultado.length, 'pedido', 'pedidos')} · {moeda(soma)}</strong>
            <span> em {rotuloPeriodo(filtros).toLowerCase()}{resultado.some((p) => p.grupo === 'cancelado') ? ', sem contar os cancelados na soma' : ''}</span>
            {ativos > 0 && <button type="button" className="link" onClick={limpar}>Limpar filtros</button>}
          </p>
        )}
        {conteudo}
        {resultado.length > POR_PAGINA && !carregando && !erro && (
          <nav className="paginacao" aria-label="Páginas de pedidos">
            <Botao icone={ChevronLeft} disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)}>Anterior</Botao>
            <span>{numero(pagina * POR_PAGINA + 1)}–{numero(Math.min(resultado.length, (pagina + 1) * POR_PAGINA))} de {numero(resultado.length)}</span>
            <Botao disabled={pagina >= totalPaginas - 1} onClick={() => setPagina((p) => p + 1)}>Próxima <ChevronRight size={16} aria-hidden /></Botao>
          </nav>
        )}
        {celular && resultado.length > 0 && !erro && !carregando && (
          <Botao icone={FileDown} onClick={exportar} className="botao--largo">Exportar CSV</Botao>
        )}
      </div>
      {!celular && numeroAberto && (
        pedidoAberto ? <DetalhePedido pedido={pedidoAberto} aoFechar={fecharPedido} /> : <PedidoNaoEncontrado numero={numeroAberto} painel aoFechar={fecharPedido} />
      )}
      <Sobreposicao
        aberto={folhaFiltros}
        aoFechar={() => setFolhaFiltros(false)}
        titulo="Filtros"
        forma="folha"
        rodape={
          <>
            <Botao onClick={limpar}>Limpar filtros</Botao>
            <Botao variante="principal" onClick={() => setFolhaFiltros(false)}>Ver {plural(resultado.length, 'pedido', 'pedidos')}</Botao>
          </>
        }
      >
        <div className="folha-filtros">
          <CamposFiltro filtros={filtros} mudar={mudar} pagamentos={pagamentos} />
        </div>
      </Sobreposicao>
    </div>
  )
}

function PedidoNaoEncontrado({ numero, painel, aoFechar }) {
  const navegar = useNavigate()
  return (
    <aside className={painel ? 'painel-pedido' : 'pagina'} aria-label="Pedido">
      <div className="estado estado--vazio">
        <p className="estado__titulo">O pedido #{numero} não é desta loja ou não existe.</p>
        <p className="estado__texto">Confira o número ou troque de loja no seletor.</p>
        <div className="estado__acoes">
          <Botao onClick={aoFechar || (() => navegar('/pedidos'))}>Voltar para a lista</Botao>
        </div>
      </div>
    </aside>
  )
}

export { hora }
