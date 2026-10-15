// T13. Clientes, lista. O detalhe (T14) abre em painel lateral no computador e em tela cheia no celular.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, FileDown, Megaphone, Search, X } from 'lucide-react'
import { usePrototipo } from '../../contexto/Prototipo.jsx'
import { useEhCelular, useTitulo } from '../../utilitarios/ganchos.js'
import { AGORA_REFERENCIA, baixarCsv, decimal, diaMes, moeda, numero, percentual, plural } from '../../utilitarios/formatos.js'
import { Botao, Carregando, CabecalhoPagina, EstadoErro, EstadoVazio, Esqueleto, Indisponivel, Selo } from '../../componentes/base.jsx'
import { LIMIAR_CLIENTES, PERIODOS_CLIENTES, PREMIO_PONTOS, SEGMENTOS_LISTA, baseClientes, clientesNoPeriodo } from '../../dados/vendas.js'
import '../../estilos/vendas.css'

const POR_PAGINA = 25
const MOTIVO_FORA_DO_AR = 'A fonte deste dado está fora do ar desde 18:10.'

// Base de clientes do contexto (loja ou rede). Usada também por Campanhas e Fidelidade.
export function useClientes() {
  const { cen, cenarioId, lojaId } = usePrototipo()
  return useMemo(() => baseClientes(cen, cenarioId, lojaId), [cen, cenarioId, lojaId])
}

// Datas de cliente: "18/09" no ano corrente, "18/09/2025" antes
export function dataCliente(d) {
  if (!d) return '—'
  return d.getFullYear() === AGORA_REFERENCIA.getFullYear() ? diaMes(d) : `${diaMes(d)}/${d.getFullYear()}`
}

export function saldoFidelidade(c) {
  if (!c.fidelidade) return '—'
  return c.fidelidade.tipo === 'pontos' ? plural(c.fidelidade.saldo, 'ponto', 'pontos') : moeda(c.fidelidade.saldo)
}

export function Clientes() {
  const { cen, emRede, loja, estadoForcado, pode } = usePrototipo()
  const { id: idAberto } = useParams()
  const navegar = useNavigate()
  const { search } = useLocation()
  const [params, setParams] = useSearchParams()
  const celular = useEhCelular()
  const base = useClientes()
  const [busca, setBusca] = useState('')
  const [pagina, setPagina] = useState(0)
  const [tentou, setTentou] = useState(false)
  const linhas = useRef({})
  const ultimaAberta = useRef(null)

  const segmento = SEGMENTOS_LISTA.some((s) => s.id === params.get('segmento')) ? params.get('segmento') : ''
  const clienteAberto = idAberto ? base.clientes.find((c) => c.id === idAberto) : null
  useTitulo(clienteAberto ? clienteAberto.nome : 'Clientes')

  const mudarSegmento = (s) => {
    const p = new URLSearchParams(params)
    if (s) p.set('segmento', s)
    else p.delete('segmento')
    setParams(p, { replace: true })
  }

  const resultado = useMemo(() => {
    if (estadoForcado === 'vazio') return []
    const b = busca.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    const digitos = b.replace(/\D/g, '')
    return base.clientes
      .filter((c) => !segmento || c.segmentos.has(segmento))
      .filter((c) => {
        if (!b) return true
        const porNome = c.nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(b)
        const porTelefone = digitos.length >= 4 && c.telefone.endsWith(digitos.slice(-4))
        return porNome || porTelefone
      })
      .sort((a, b2) => (b2.ultimaCompra || b2.cadastro) - (a.ultimaCompra || a.cadastro))
  }, [base, segmento, busca, estadoForcado])

  useEffect(() => setPagina(0), [segmento, busca])

  // O foco volta para a linha do cliente ao fechar o painel
  useEffect(() => {
    if (idAberto) ultimaAberta.current = idAberto
    else if (ultimaAberta.current) {
      const el = linhas.current[ultimaAberta.current]
      setTimeout(() => el?.focus(), 0)
      ultimaAberta.current = null
    }
  }, [idAberto])

  const abrir = (id) => navegar(`/clientes/${id}${search}`)
  const fechar = () => navegar(`/clientes${search}`)

  if (celular && idAberto) {
    return clienteAberto ? <PainelCliente cliente={clienteAberto} aoFechar={fechar} telaCheia /> : <ClienteNaoEncontrado />
  }

  const totalPaginas = Math.max(1, Math.ceil(resultado.length / POR_PAGINA))
  const visiveis = resultado.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA)
  const carregando = estadoForcado === 'carregando'
  const erro = estadoForcado === 'erro' && !tentou
  const lojaNova = base.total === 0 || estadoForcado === 'vazio'
  const seg = SEGMENTOS_LISTA.find((s) => s.id === segmento)
  const contagemSeg = segmento ? base.contar(segmento).total : base.total
  const nomeContexto = emRede ? cen.marca.nome : loja?.nome

  const exportar = () =>
    baixarCsv({
      loja: nomeContexto,
      periodo: seg ? seg.rotulo : 'Todos os clientes',
      tipo: 'clientes',
      cabecalho: ['Nome', 'Telefone', ...(emRede ? ['Loja'] : []), 'Pedidos', 'Último pedido', 'Gasto total', 'Saldo de fidelidade'],
      linhas: resultado.map((c) => [c.nome, c.telefone, ...(emRede ? [c.lojaNome] : []), c.nPedidos, dataCliente(c.ultimaCompra), c.gasto.toFixed(2).replace('.', ','), saldoFidelidade(c)]),
    })

  let conteudo
  if (carregando) {
    conteudo = (
      <Carregando oQue="os clientes">
        <div className="tabela-esqueleto">{Array.from({ length: 8 }, (_, i) => <Esqueleto key={i} linhas={1} altura="44px" />)}</div>
      </Carregando>
    )
  } else if (erro) {
    conteudo = <EstadoErro oQue="os clientes" aoTentar={() => setTentou(true)} />
  } else if (lojaNova) {
    conteudo = <EstadoVazio titulo="Os clientes aparecem aqui a partir do primeiro pedido." />
  } else if (resultado.length === 0) {
    conteudo = busca ? (
      <EstadoVazio titulo={`Nenhum cliente encontrado para "${busca}".`} acao={<Botao onClick={() => setBusca('')}>Limpar busca</Botao>} />
    ) : (
      <EstadoVazio titulo="Nenhum cliente neste segmento agora." acao={<Botao onClick={() => mudarSegmento('')}>Ver todos os clientes</Botao>} />
    )
  } else if (celular) {
    conteudo = (
      <ul className="cartoes-pedido">
        {visiveis.map((c) => (
          <li key={c.id}>
            <button type="button" ref={(el) => (linhas.current[c.id] = el)} className="cartao-pedido" onClick={() => abrir(c.id)}>
              <span className="cartao-pedido__topo">
                <span className="cartao-pedido__numero">{c.nome}</span>
                <span className="cartao-pedido__total numero">{moeda(c.gasto)}</span>
              </span>
              <span className="cartao-pedido__cliente">
                {c.ultimaCompra ? `Último pedido em ${dataCliente(c.ultimaCompra)}` : 'Ainda não pediu'}
                {emRede ? ` · ${c.lojaNome}` : ''}
              </span>
            </button>
          </li>
        ))}
      </ul>
    )
  } else {
    conteudo = (
      <div className="tabela-rolagem">
        <table className="tabela">
          <caption className="visualmente-oculto">Clientes{seg ? `, segmento ${seg.rotulo}` : ''}, do pedido mais recente para o mais antigo</caption>
          <thead>
            <tr>
              <th scope="col">Nome</th>
              <th scope="col">Telefone</th>
              {emRede && <th scope="col">Loja</th>}
              <th scope="col" className="tabela__num">Pedidos</th>
              <th scope="col">Último pedido</th>
              <th scope="col" className="tabela__num">Gasto total</th>
              <th scope="col" className="tabela__num">Saldo de fidelidade</th>
            </tr>
          </thead>
          <tbody>
            {visiveis.map((c) => (
              <tr key={c.id} className={c.id === idAberto ? 'tabela__linha--aberta' : ''} onClick={() => abrir(c.id)}>
                <td>
                  <button type="button" ref={(el) => (linhas.current[c.id] = el)} className="tabela__abrir" onClick={(e) => { e.stopPropagation(); abrir(c.id) }}>
                    {c.nome}
                  </button>
                </td>
                <td className="tabela__hora numero">{c.telefone}</td>
                {emRede && <td>{c.lojaNome}</td>}
                <td className="tabela__num numero">{numero(c.nPedidos)}</td>
                <td className="tabela__hora numero">{dataCliente(c.ultimaCompra)}</td>
                <td className="tabela__num numero">{moeda(c.gasto)}</td>
                <td className="tabela__num numero">{estadoForcado === 'indisponivel' ? 'Indisponível' : saldoFidelidade(c)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const mostrarLista = !carregando && !erro && !lojaNova

  return (
    <div className={`pagina pagina--pedidos ${clienteAberto && !celular ? 'pagina--com-painel' : ''}`}>
      <div className="pagina__lista">
        <CabecalhoPagina
          titulo="Clientes"
          acoes={!celular && mostrarLista && (
            <>
              {seg && pode('campanhas') && <Botao icone={Megaphone} para={`/campanhas/nova?segmento=${seg.id}`}>Criar campanha para este segmento</Botao>}
              <Botao icone={FileDown} onClick={exportar} disabled={!resultado.length}>Exportar CSV</Botao>
            </>
          )}
        />

        {!lojaNova && !erro && <PainelMetricas base={base} carregando={carregando} indisponivel={estadoForcado === 'indisponivel'} />}

        {!lojaNova && !erro && (
          <>
            <div className="clientes__total" role="status">
              {carregando ? (
                <Esqueleto linhas={1} altura="28px" />
              ) : estadoForcado === 'indisponivel' ? (
                <Indisponivel motivo={MOTIVO_FORA_DO_AR} />
              ) : (
                <>
                  <strong className="clientes__numero">{numero(contagemSeg)}</strong>
                  <span>
                    {seg ? `${contagemSeg === 1 ? 'cliente' : 'clientes'} em "${seg.rotulo}": ${seg.descricao.toLowerCase()}.` : `${contagemSeg === 1 ? 'cliente' : 'clientes'} na base${emRede ? ' da rede' : ''}.`}
                  </span>
                </>
              )}
            </div>

            <div className={`barra-filtros ${celular ? 'barra-filtros--celular' : ''}`}>
              <div className="busca">
                <Search size={18} aria-hidden className="busca__icone" />
                <input
                  type="search"
                  className="busca__campo"
                  placeholder="Nome ou telefone"
                  aria-label="Buscar cliente por nome ou pelos 4 últimos números do telefone"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </div>
              {celular ? (
                <label className="filtro clientes__segmento-celular">
                  <span className="filtro__rotulo">Segmento</span>
                  <select value={segmento} onChange={(e) => mudarSegmento(e.target.value)}>
                    <option value="">Todos os clientes</option>
                    {SEGMENTOS_LISTA.map((s) => <option key={s.id} value={s.id}>{s.rotulo} ({numero(base.contar(s.id).total)})</option>)}
                  </select>
                </label>
              ) : (
                <div className="seletor-periodo clientes__segmentos" role="group" aria-label="Segmentos">
                  <button type="button" className="seletor-periodo__opcao" aria-pressed={!segmento} onClick={() => mudarSegmento('')}>Todos</button>
                  {SEGMENTOS_LISTA.map((s) => (
                    <button key={s.id} type="button" className="seletor-periodo__opcao" aria-pressed={segmento === s.id} onClick={() => mudarSegmento(s.id)} title={s.descricao}>
                      {s.rotulo} <span className="seletor-periodo__n">{numero(base.contar(s.id).total)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {celular && seg && pode('campanhas') && mostrarLista && (
              <Botao icone={Megaphone} para={`/campanhas/nova?segmento=${seg.id}`} className="botao--largo clientes__acao-celular">Criar campanha para este segmento</Botao>
            )}
            {mostrarLista && busca && resultado.length > 0 && (
              <p className="resumo-resultado" role="status"><strong>{plural(resultado.length, 'cliente encontrado', 'clientes encontrados')}</strong>{base.amostra ? <span> na amostra</span> : null}</p>
            )}
          </>
        )}

        {conteudo}

        {mostrarLista && resultado.length > POR_PAGINA && (
          <nav className="paginacao" aria-label="Páginas de clientes">
            <Botao icone={ChevronLeft} disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)}>Anterior</Botao>
            <span>{numero(pagina * POR_PAGINA + 1)}–{numero(Math.min(resultado.length, (pagina + 1) * POR_PAGINA))} de {numero(resultado.length)}</span>
            <Botao disabled={pagina >= totalPaginas - 1} onClick={() => setPagina((p) => p + 1)}>Próxima <ChevronRight size={16} aria-hidden /></Botao>
          </nav>
        )}
        {mostrarLista && base.amostra && resultado.length > 0 && (
          <p className="nota-pe">No protótipo, a lista mostra uma amostra de {plural(base.clientes.length, 'cliente', 'clientes')}; o total acima é o da base.</p>
        )}
        {mostrarLista && <p className="nota-pe">CPF e e-mail não aparecem na lista. O CSV sai sem IP e sem data de nascimento.</p>}
        {celular && mostrarLista && resultado.length > 0 && (
          <Botao icone={FileDown} onClick={exportar} className="botao--largo">Exportar CSV</Botao>
        )}
      </div>
      {!celular && idAberto && (clienteAberto ? <PainelCliente cliente={clienteAberto} aoFechar={fechar} /> : <ClienteNaoEncontrado painel aoFechar={fechar} />)}
    </div>
  )
}

// ---------- Painel de métricas do período (topo de T13) ----------
// Regra de baixo volume da home e da Análise: abaixo de 30 clientes, variação em números e taxa em contagem.
const comA = (c) => (c.startsWith('a ') ? `à ${c.slice(2)}` : c.startsWith('os ') ? `aos ${c.slice(3)}` : `a ${c}`)
const taxaTexto = (t) => `${decimal(t * 100)}%`

// Em todos os números do painel, subir é bom: a cor do delta segue o sentido
function Variacao({ atual, anterior, baixo, comparado, unidade }) {
  const dif = atual - anterior
  if (Math.abs(dif) < 0.005) return <p className="kpi__variacao">Igual {comA(comparado)}</p>
  const delta = baixo ? `${unidade(Math.abs(dif))} a ${dif > 0 ? 'mais' : 'menos'}` : percentual((dif / anterior) * 100)
  return (
    <p className="kpi__variacao">
      <span className={`kpi__delta kpi__delta--${dif > 0 ? 'alta' : 'queda'}`}>{delta}</span> {baixo ? 'que' : 'contra'} {comparado}
    </p>
  )
}

function leituraRecompra(m, per) {
  const { atual: a, anterior: b, baixoVolume } = m
  const t1 = a.recorrentes / a.clientes
  const t0 = b.recorrentes / b.clientes
  const sinal = Math.abs(t1 - t0) < 0.005 ? 'estavel' : t1 > t0 ? 'alta' : 'queda'
  const verbo = { estavel: 'ficou estável', alta: 'subiu', queda: 'caiu' }[sinal]
  const frase = baixoVolume
    ? `A recompra ${verbo}: ${numero(a.recorrentes)} de ${plural(a.clientes, 'cliente', 'clientes')} voltaram ${per.noPeriodo}, contra ${numero(b.recorrentes)} de ${numero(b.clientes)} ${per.noAnterior}.`
    : `A recompra ${verbo}: ${taxaTexto(t1)} dos clientes voltaram ${per.noPeriodo}, contra ${taxaTexto(t0)} ${per.noAnterior}.`
  return { sinal, frase }
}

function PainelMetricas({ base, carregando, indisponivel }) {
  const { cen, dadosLoja, emRede } = usePrototipo()
  const [periodoId, setPeriodoId] = useState('este-mes')
  const per = PERIODOS_CLIENTES.find((p) => p.id === periodoId)
  const m = useMemo(() => clientesNoPeriodo({ cen, dadosLoja, emRede, base, periodoId }), [cen, dadosLoja, emRede, base, periodoId])

  // Sem pedidos no período (loja nova), o painel não aparece: nada de zeros falsos
  if (!carregando && !m) return null

  const seletor = (
    <div className="seletor-periodo clientes-painel__seletor" role="group" aria-label="Período dos números">
      {PERIODOS_CLIENTES.map((p) => (
        <button key={p.id} type="button" className="seletor-periodo__opcao" aria-pressed={p.id === periodoId} onClick={() => setPeriodoId(p.id)}>
          {p.rotulo}
        </button>
      ))}
    </div>
  )
  const topo = (
    <div className="clientes-painel__topo">
      <div>
        <h2 id="titulo-painel-clientes">Clientes no período</h2>
        {m && <p className="clientes-painel__periodo">{m.rotulo}, comparado com {m.comparacao}.</p>}
      </div>
      {seletor}
    </div>
  )

  if (carregando) {
    return (
      <section className="clientes-painel" aria-labelledby="titulo-painel-clientes">
        {topo}
        <Carregando oQue="os números de clientes">
          <div className="clientes-painel__principal">
            <div className="clientes-painel__cartao clientes-painel__destaque"><Esqueleto linhas={3} altura="28px" /></div>
            <div className="sinal clientes-painel__sinal"><Esqueleto linhas={2} /></div>
          </div>
          <div className="clientes-painel__grupos">
            <div className="clientes-painel__cartao"><Esqueleto linhas={2} altura="24px" /></div>
            <div className="clientes-painel__cartao"><Esqueleto linhas={2} altura="24px" /></div>
          </div>
        </Carregando>
      </section>
    )
  }

  if (indisponivel) {
    return (
      <section className="clientes-painel" aria-labelledby="titulo-painel-clientes">
        {topo}
        <div className="clientes-painel__cartao"><Indisponivel motivo={MOTIVO_FORA_DO_AR} /></div>
      </section>
    )
  }

  const { atual: a, anterior: b, baixoVolume: baixo, comparado, hoje } = m
  const opcoes = { baixo, comparado, unidade: (n) => plural(Math.round(n), 'cliente', 'clientes') }
  const leitura = leituraRecompra(m, per)
  const partes = `${plural(a.novos, 'cliente novo', 'clientes novos')} e ${plural(a.recorrentes, 'recorrente', 'recorrentes')}`
  const freq1 = Math.round(a.frequencia * 10) / 10
  const freq0 = Math.round(b.frequencia * 10) / 10
  const gasto1 = Math.round(a.gastoMedio * 100) / 100
  const gasto0 = Math.round(b.gastoMedio * 100) / 100
  const t1 = a.recorrentes / a.clientes
  const t0 = b.recorrentes / b.clientes
  const pp = Math.round((t1 - t0) * 1000) / 10

  return (
    <section className="clientes-painel" aria-labelledby="titulo-painel-clientes">
      {topo}

      <div className="clientes-painel__principal">
        <div className="clientes-painel__cartao clientes-painel__destaque">
          <div className="clientes-painel__par">
            <div className="clientes-painel__metrica">
              <p className="rotulo-kpi"><span className="clientes-painel__amostra clientes-painel__amostra--novos" aria-hidden />Compraram pela 1ª vez</p>
              <p className="numero-kpi clientes-painel__grande">{numero(a.novos)}</p>
              <p className="clientes-painel__detalhe">Primeira compra no período</p>
              <Variacao atual={a.novos} anterior={b.novos} {...opcoes} />
            </div>
            <div className="clientes-painel__metrica">
              <p className="rotulo-kpi"><span className="clientes-painel__amostra" aria-hidden />Voltaram a comprar</p>
              <p className="numero-kpi clientes-painel__grande">{numero(a.recorrentes)}</p>
              <p className="clientes-painel__detalhe">Com 2 pedidos ou mais</p>
              <Variacao atual={a.recorrentes} anterior={b.recorrentes} {...opcoes} />
            </div>
          </div>
          <div className="clientes-painel__composicao">
            <div className="clientes-painel__barra" role="img" aria-label={`${partes} entre ${plural(a.clientes, 'cliente', 'clientes')} que compraram`}>
              <span className="clientes-painel__barra-novos" style={{ flexGrow: a.novos }} />
              <span className="clientes-painel__barra-recorrentes" style={{ flexGrow: a.recorrentes }} />
            </div>
            <p className="clientes-painel__detalhe">
              <span className="numero">{numero(a.clientes)}</span> {a.clientes === 1 ? 'cliente comprou' : 'clientes compraram'} {per.noPeriodo}:{' '}
              <span className="numero">{numero(a.novos)}</span> pela primeira vez e <span className="numero">{numero(a.recorrentes)}</span> {a.recorrentes === 1 ? 'voltou' : 'voltaram'}.
            </p>
          </div>
        </div>

        <div className={`sinal clientes-painel__sinal ${leitura.sinal === 'estavel' ? '' : `sinal--${leitura.sinal}`}`} role="status">
          <p className="rotulo-kpi">Leitura do período</p>
          <p className="clientes-painel__frase">{leitura.frase}</p>
        </div>
      </div>

      <div className="clientes-painel__grupos">
        <div className="clientes-painel__grupo">
          <h3 className="clientes-painel__subtitulo">No período</h3>
          <ul className="clientes-painel__grade">
            <li>
              <p className="rotulo-kpi">Taxa de recompra</p>
              {baixo ? (
                <>
                  <p className="numero-kpi">{numero(a.recorrentes)} de {numero(a.clientes)}</p>
                  <p className="kpi__variacao">{per.noAnterior[0].toUpperCase() + per.noAnterior.slice(1)}: {numero(b.recorrentes)} de {numero(b.clientes)}</p>
                </>
              ) : (
                <>
                  <p className="numero-kpi">{taxaTexto(t1)}</p>
                  <p className="kpi__variacao">{pp === 0 ? `Igual ${comA(comparado)}` : <><span className={`kpi__delta kpi__delta--${pp > 0 ? 'alta' : 'queda'}`}>{pp > 0 ? '+' : ''}{decimal(pp)} p.p.</span> contra {comparado}</>}</p>
                </>
              )}
            </li>
            <li>
              <p className="rotulo-kpi">Frequência média</p>
              <p className="numero-kpi">{decimal(freq1)} <span className="clientes-painel__unidade">{freq1 === 1 ? 'pedido' : 'pedidos'} por cliente</span></p>
              <Variacao atual={freq1} anterior={freq0} {...opcoes} unidade={(n) => decimal(n)} />
            </li>
            <li>
              <p className="rotulo-kpi">Gasto médio por cliente</p>
              <p className="numero-kpi">{moeda(gasto1)}</p>
              <Variacao atual={gasto1} anterior={gasto0} {...opcoes} unidade={moeda} />
            </li>
          </ul>
        </div>
        <div className="clientes-painel__grupo">
          <h3 className="clientes-painel__subtitulo">Situação de hoje</h3>
          <ul className="clientes-painel__grade">
            <li>
              <p className="rotulo-kpi">Se afastando</p>
              <p className="numero-kpi">{numero(hoje.afastando)}</p>
              <p className="kpi__variacao">Sem comprar há mais de 50 dias</p>
              <Link to="/clientes?segmento=afastando" className="clientes-painel__link">Ver quem são</Link>
            </li>
            <li>
              <p className="rotulo-kpi">Base total</p>
              <p className="numero-kpi">{numero(hoje.base)}</p>
              <p className="kpi__variacao">Clientes com conta{emRede ? ' na rede' : ' na loja'}</p>
            </li>
            <li>
              <p className="rotulo-kpi">Aniversariantes do mês</p>
              <p className="numero-kpi">{numero(hoje.aniversariantes)}</p>
              <p className="kpi__variacao">Fazem aniversário em outubro</p>
            </li>
          </ul>
        </div>
      </div>

      {baixo && (
        <p className="nota-pe">
          Menos de {LIMIAR_CLIENTES} clientes no período: com tão poucos, uma pessoa muda muito a porcentagem, então as variações aparecem em números e a recompra em contagem.
        </p>
      )}
    </section>
  )
}

// T14: a rota /clientes/:id mostra a lista com o painel aberto (como em Pedidos)
export function ClienteDetalhe() {
  return <Clientes />
}

const PEDIDOS_POR_PAGINA = 10

function PainelCliente({ cliente: c, aoFechar, telaCheia }) {
  const { perfil, pode, emRede, trocarLoja, cen } = usePrototipo()
  const navegar = useNavigate()
  const titulo = useRef(null)
  const [mostrar, setMostrar] = useState(false)
  const [pagina, setPagina] = useState(0)
  const autorizado = perfil === 'dono'

  useEffect(() => {
    titulo.current?.focus()
    setMostrar(false)
    setPagina(0)
  }, [c.id])

  useEffect(() => {
    if (telaCheia) return
    const esc = (e) => e.key === 'Escape' && !document.querySelector('.sobreposicao') && aoFechar()
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [aoFechar, telaCheia])

  const verPedido = (p) => {
    if (emRede) trocarLoja(p.lojaId)
    navegar(`/pedidos/${p.numero}`)
  }

  const Titulo = telaCheia ? 'h1' : 'h2'
  const f = c.fidelidade
  const temPrograma = !!cen.fidelidade.tipo
  const totalPaginas = Math.ceil(c.pedidos.length / PEDIDOS_POR_PAGINA)
  const pedidosVisiveis = c.pedidos.slice(pagina * PEDIDOS_POR_PAGINA, (pagina + 1) * PEDIDOS_POR_PAGINA)

  return (
    <aside className={telaCheia ? 'pedido-cheio' : 'painel-pedido'} role={telaCheia ? undefined : 'dialog'} aria-modal={telaCheia ? undefined : 'false'} aria-labelledby="titulo-cliente">
      <header className="painel-pedido__topo">
        {telaCheia && (
          <button type="button" className="botao botao--texto botao--voltar" onClick={aoFechar}>
            <ArrowLeft size={20} aria-hidden /> Voltar
          </button>
        )}
        <div className="painel-pedido__titulos">
          <Titulo id="titulo-cliente" ref={titulo} tabIndex={-1}>{c.nome}</Titulo>
          <p className="painel-pedido__quando">
            {c.primeiraCompra ? `Cliente desde ${dataCliente(c.primeiraCompra)}` : `Cadastro em ${dataCliente(c.cadastro)}, sem pedidos`}
            {emRede ? ` · ${c.lojaNome}` : ''}
          </p>
        </div>
        {!telaCheia && (
          <button type="button" className="botao botao--texto botao--icone" onClick={aoFechar} aria-label="Fechar detalhe do cliente">
            <X size={20} aria-hidden />
          </button>
        )}
      </header>

      <div className="painel-pedido__corpo">
        {pode('campanhas') && (
          <div className="painel-pedido__acoes">
            <Botao icone={Megaphone} tamanho="p" para={`/campanhas/nova?cliente=${c.id}`}>Enviar mensagem</Botao>
            {!c.consentimento && <span className="texto-secundario">Não aceitou receber mensagens.</span>}
          </div>
        )}

        <section className="secao-pedido" aria-labelledby="sec-contato">
          <div className="cliente__secao-topo">
            <h3 id="sec-contato">Contato</h3>
            {autorizado && (
              <Botao variante="texto" tamanho="p" aria-pressed={mostrar} onClick={() => setMostrar((m) => !m)}>
                {mostrar ? 'Ocultar' : 'Mostrar'}
              </Botao>
            )}
          </div>
          <dl className="valores cliente__valores">
            <div><dt>Telefone</dt><dd>{mostrar ? c.telefoneCompleto : c.telefone}</dd></div>
            <div><dt>E-mail</dt><dd>{mostrar ? c.emailCompleto : c.email}</dd></div>
            <div><dt>CPF</dt><dd>{mostrar ? c.cpfCompleto : c.cpf}</dd></div>
          </dl>
        </section>

        <section className="secao-pedido" aria-labelledby="sec-resumo">
          <h3 id="sec-resumo">Resumo</h3>
          <dl className="valores cliente__valores">
            <div><dt>Primeira compra</dt><dd>{dataCliente(c.primeiraCompra)}</dd></div>
            <div><dt>Última compra</dt><dd>{dataCliente(c.ultimaCompra)}</dd></div>
            <div><dt>Pedidos</dt><dd>{numero(c.nPedidos)}</dd></div>
            <div><dt>Gasto total</dt><dd>{c.nPedidos ? moeda(c.gasto) : '—'}</dd></div>
          </dl>
        </section>

        <section className="secao-pedido" aria-labelledby="sec-fidelidade">
          <h3 id="sec-fidelidade">Fidelidade</h3>
          {!temPrograma ? (
            <p className="texto-secundario">A loja ainda não tem programa de fidelidade.</p>
          ) : !f ? (
            <p className="texto-secundario">Não participa do programa.</p>
          ) : (
            <dl className="valores cliente__valores">
              <div><dt>{f.tipo === 'pontos' ? 'Pontos' : 'Saldo de cashback'}</dt><dd>{saldoFidelidade(c)}</dd></div>
              <div>
                <dt>{f.estado === 'expirado' ? 'Expirou em' : 'Vence em'}</dt>
                <dd>{f.estado === 'a-vencer' ? <Selo tom="ambar">{dataCliente(f.vence)}</Selo> : dataCliente(f.vence)}</dd>
              </div>
              {f.tipo === 'pontos' && (
                <div>
                  <dt>Próximo prêmio</dt>
                  <dd>{f.saldo >= PREMIO_PONTOS.pontos ? `Já pode resgatar: ${PREMIO_PONTOS.nome}` : `Faltam ${numero(PREMIO_PONTOS.pontos - f.saldo)} pontos para ${PREMIO_PONTOS.nome}`}</dd>
                </div>
              )}
            </dl>
          )}
        </section>

        <section className="secao-pedido" aria-labelledby="sec-pedidos">
          <h3 id="sec-pedidos">Pedidos</h3>
          {c.pedidos.length === 0 ? (
            <p className="texto-secundario">Ainda não fez pedidos.</p>
          ) : (
            <>
              <ul className="cliente__pedidos">
                {pedidosVisiveis.map((p, i) => (
                  <li key={p.numero || `${c.id}-${pagina}-${i}`}>
                    <span className="cliente__pedido-textos">
                      <span className="tabela__principal">{p.numero ? `#${p.numero}` : 'Pedido anterior'} · {dataCliente(p.criado)}</span>
                      <span className="tabela__secundario">{p.status}{emRede ? ` · ${p.lojaNome}` : ''}</span>
                    </span>
                    <span className="cliente__pedido-total">{moeda(p.total)}</span>
                    {p.existe && pode('pedidos') ? (
                      <Botao tamanho="p" onClick={() => verPedido(p)} aria-label={`Ver pedido #${p.numero}`}>Ver pedido</Botao>
                    ) : (
                      <span className="cliente__pedido-sem" aria-hidden />
                    )}
                  </li>
                ))}
              </ul>
              {c.pedidos.some((p) => !p.existe) && <p className="nota-pe">No protótipo, só os pedidos dos últimos 7 dias abrem em Pedidos.</p>}
              {totalPaginas > 1 && (
                <nav className="paginacao" aria-label="Páginas de pedidos do cliente">
                  <Botao tamanho="p" icone={ChevronLeft} disabled={pagina === 0} onClick={() => setPagina((x) => x - 1)}>Anterior</Botao>
                  <span>{pagina * PEDIDOS_POR_PAGINA + 1}–{Math.min(c.pedidos.length, (pagina + 1) * PEDIDOS_POR_PAGINA)} de {c.pedidos.length}</span>
                  <Botao tamanho="p" disabled={pagina >= totalPaginas - 1} onClick={() => setPagina((x) => x + 1)}>Próxima <ChevronRight size={16} aria-hidden /></Botao>
                </nav>
              )}
            </>
          )}
        </section>
      </div>
    </aside>
  )
}

function ClienteNaoEncontrado({ painel, aoFechar }) {
  const navegar = useNavigate()
  return (
    <aside className={painel ? 'painel-pedido' : 'pagina'} aria-label="Cliente">
      <div className="estado estado--vazio">
        <p className="estado__titulo">Este cliente não é desta loja ou não existe.</p>
        <p className="estado__texto">Procure pelo nome ou telefone na lista de clientes.</p>
        <div className="estado__acoes">
          <Botao onClick={aoFechar || (() => navegar('/clientes'))}>Voltar para a lista</Botao>
        </div>
      </div>
    </aside>
  )
}
