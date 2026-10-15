// T04. Início da rede: Hoje na rede, Avisos e oportunidades da rede, 4 KPIs da rede e a tabela de lojas.
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowDown, ArrowRight, ArrowUp, ArrowUpDown, Search } from 'lucide-react'
import { usePrototipo } from '../../contexto/Prototipo.jsx'
import { useEhCelular, useTitulo } from '../../utilitarios/ganchos.js'
import { AGORA_REFERENCIA, dataExtenso, hora, moeda, numero, percentual, plural } from '../../utilitarios/formatos.js'
import { Botao, Carregando, EstadoErro, EstadoVazio, Esqueleto, Indisponivel, Selo } from '../../componentes/base.jsx'
import { ItemAcao } from '../../componentes/ItemAcao.jsx'
import '../../estilos/marketing.css'

const MOTIVO_FORA_DO_AR = 'A fonte deste dado está fora do ar desde 18:10.'
const MOTIVO_CANC = 'Cancelamentos ainda não são medidos no Analítico.'

// Estado agora de uma loja, a partir do estado simulado
function estadoAgora(e) {
  if (!e) return { id: 'aberta', rotulo: 'Aberta', tom: 'verde' }
  if (e.conexao === 'sem') return { id: 'sem', rotulo: 'Sem conexão', tom: 'vermelho' }
  if (e.delivery === 'fechado' && e.balcao === 'fechado') return { id: 'fechada', rotulo: 'Fechada', tom: 'cinza' }
  return { id: 'aberta', rotulo: 'Aberta', tom: 'verde' }
}

function SemDado() {
  return (
    <span className="rede__sem-dado" title="Sem pedidos no período">
      <span aria-hidden>—</span>
      <span className="visualmente-oculto">Sem pedidos no período</span>
    </span>
  )
}

function useLojasRede() {
  const { cen, estadoLojas, alertasAtivos, estadoForcado } = usePrototipo()
  return useMemo(() => {
    const vazio = estadoForcado === 'vazio'
    return cen.lojas
      .filter((l) => !l.teste)
      .map((l) => {
        const r = vazio ? { fat: null, varPct: null, canc: null, hoje: 0 } : l.resumo
        const alertas = alertasAtivos.filter((a) => a.lojaId === l.id && a.prioridade <= 4)
        const motivos = alertas.map((a) => a.tipo)
        if (r.varPct != null && r.varPct <= -10) motivos.push(`Faturamento ${percentual(r.varPct)}`)
        if (r.canc != null && r.canc >= 4) motivos.push(`${percentual(r.canc).replace('+', '')} de cancelamentos`)
        return { ...l, r, estado: estadoAgora(estadoLojas[l.id]), motivos }
      })
  }, [cen, estadoLojas, alertasAtivos, estadoForcado])
}

// ---------- Agora da rede ----------
function AgoraRede({ lojas, carregando, erro, aoTentar }) {
  const { horaAtualizacaoAnalitico, estadoForcado } = usePrototipo()
  const conta = (id) => lojas.filter((l) => l.estado.id === id).length
  const pedidosHoje = lojas.reduce((s, l) => s + (l.r.hoje || 0), 0)
  return (
    <section className="bloco bloco--agora" aria-labelledby="titulo-agora-rede">
      <header className="bloco__cabecalho">
        <h2 id="titulo-agora-rede">Hoje na rede</h2>
      </header>
      {carregando ? (
        <Carregando oQue="o status das lojas"><Esqueleto linhas={3} altura="28px" /></Carregando>
      ) : erro ? (
        <EstadoErro oQue="o status das lojas" aoTentar={aoTentar} compacto />
      ) : (
        <>
          <ul className="rede__contagens">
            <li><span className="rede__contagem-valor">{numero(conta('aberta'))}</span><Selo tom="verde">Abertas</Selo></li>
            <li><span className="rede__contagem-valor">{numero(conta('fechada'))}</span><Selo tom="cinza">Fechadas no horário programado</Selo></li>
            <li><span className="rede__contagem-valor">{numero(conta('sem'))}</span><Selo tom="vermelho">Sem conexão</Selo></li>
          </ul>
          <div className="numero-hoje numero-hoje--dominante">
            <span className="numero-hoje__rotulo">Pedidos hoje na rede</span>
            {estadoForcado === 'indisponivel' ? (
              <Indisponivel motivo={MOTIVO_FORA_DO_AR} />
            ) : pedidosHoje === 0 ? (
              <span className="agora__vazio">Nenhum pedido hoje até agora.</span>
            ) : (
              <span className="numero-hoje__valor">{numero(pedidosHoje)}</span>
            )}
          </div>
          <p className="agora__fonte">Atualizado às {horaAtualizacaoAnalitico} · soma das {lojas.length} lojas</p>
        </>
      )}
    </section>
  )
}

// ---------- Avisos e oportunidades da rede ----------
function OQueFazerRede({ limite, carregando }) {
  const { alertasAtivos, dispensarAlerta, cen, estadoForcado } = usePrototipo()
  const [todos, setTodos] = useState(false)
  const itens = estadoForcado === 'vazio' ? [] : [
    // pedido parado ou atrasado é tratado no receptor de pedidos
    ...alertasAtivos.filter((a) => a.prioridade !== 2).map((a) => ({ ...a, dispensavel: true })),
    {
      id: 'rede-afastando',
      tipo: 'Clientes se afastando',
      loja: 'Toda a rede',
      texto: `${numero(cen.resumoRede.afastando)} clientes sem comprar há mais de 50 dias`,
      motivo: 'Leitura do Analítico (Churn), atualizada na virada do mês.',
      acoes: [{ rotulo: 'Criar campanha "Sentimos sua falta"', para: '/campanhas/nova?modelo=sentimos' }],
    },
  ]
  const visiveis = todos ? itens : itens.slice(0, limite)
  return (
    <section className="bloco bloco--oquefazer" aria-labelledby="titulo-oquefazer-rede">
      <header className="bloco__cabecalho">
        <h2 id="titulo-oquefazer-rede">Avisos e oportunidades da rede</h2>
        {itens.length > 0 && !carregando && <span className="bloco__contagem">{itens.length}</span>}
      </header>
      {carregando ? (
        <Carregando oQue="os avisos"><div className="lista-esqueleto">{[0, 1, 2].map((i) => <Esqueleto key={i} linhas={2} />)}</div></Carregando>
      ) : itens.length === 0 ? (
        <EstadoVazio compacto titulo="Nada pedindo atenção agora." texto="Lojas sem conexão, avaliações ruins e integrações caídas aparecem aqui." />
      ) : (
        <>
          <ul className="lista-acoes">
            {visiveis.map((i) => <ItemAcao key={i.id} item={i} mostrarLoja aoDispensar={i.dispensavel ? dispensarAlerta : undefined} />)}
          </ul>
          {itens.length > limite && (
            <button type="button" className="bloco__mais" aria-expanded={todos} onClick={() => setTodos((t) => !t)}>
              {todos ? 'Mostrar menos' : `Ver todos (${itens.length})`}
            </button>
          )}
        </>
      )}
    </section>
  )
}

// ---------- KPIs da rede ----------
function KpisRede({ celular, carregando }) {
  const { cen, estadoForcado } = usePrototipo()
  const p = cen.resumoRede.periodo
  const indisp = estadoForcado === 'indisponivel'
  const vazio = estadoForcado === 'vazio'
  const kpis = [
    { id: 'fat', rotulo: 'Faturamento', valor: moeda(p.faturamento), variacao: `${percentual(p.varPct)} contra setembro`, aba: 'vendas' },
    { id: 'pedidos', rotulo: 'Pedidos', valor: numero(p.pedidos), variacao: `${percentual(p.varPedidos)} contra setembro`, aba: 'vendas' },
    { id: 'ticket', rotulo: 'Ticket médio', valor: moeda(p.ticket), aba: 'vendas' },
    { id: 'clientes', rotulo: 'Clientes que compraram', valor: numero(p.clientes), aba: 'clientes' },
  ]
  return (
    <section className="bloco bloco--periodo" aria-labelledby="titulo-periodo-rede">
      <header className="bloco__cabecalho">
        <div>
          <h2 id="titulo-periodo-rede">Período</h2>
          <p className="bloco__sub">Outubro até o dia 9, comparado com setembro no mesmo intervalo</p>
        </div>
      </header>
      {carregando ? (
        <Carregando oQue="os números da rede">
          <div className="kpis">{kpis.map((k) => <div key={k.id} className="kpi"><Esqueleto linhas={3} /></div>)}</div>
        </Carregando>
      ) : (
        <ul className={`kpis ${celular ? 'kpis--lista' : ''}`}>
          {kpis.map((k) => (
            <li key={k.id} className="kpi">
              <Link to={`/analise/${k.aba}?periodo=este-mes`} className="kpi__link">
                <span className="kpi__rotulo">{k.rotulo}</span>
                {indisp ? <Indisponivel motivo={MOTIVO_FORA_DO_AR} /> : vazio ? <span className="kpi__valor kpi__valor--vazio">—</span> : <span className="kpi__valor">{k.valor}</span>}
                {!indisp && !vazio && k.variacao && <span className="kpi__variacao">{k.variacao}</span>}
                {vazio && !indisp && <span className="kpi__variacao">Nenhum pedido neste período</span>}
                <span className="kpi__destino">Ver em {k.aba === 'vendas' ? 'Vendas' : 'Clientes'} <ArrowRight size={14} aria-hidden /></span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// ---------- Tabela de lojas ----------
const COLUNAS = [
  { id: 'nome', rotulo: 'Loja', valor: (l) => l.nome },
  { id: 'estado', rotulo: 'Agora', valor: (l) => ['sem', 'fechada', 'aberta'].indexOf(l.estado.id) },
  { id: 'hoje', rotulo: 'Pedidos hoje', valor: (l) => l.r.hoje ?? -1, num: true },
  { id: 'fat', rotulo: 'Faturamento no período', valor: (l) => l.r.fat ?? -1, num: true },
  { id: 'varPct', rotulo: 'Variação', valor: (l) => l.r.varPct ?? -999, num: true },
  { id: 'canc', rotulo: 'Cancelamentos', valor: (l) => l.r.canc ?? -1, num: true },
]

function TabelaLojas({ lojas, entrar }) {
  const { estadoForcado } = usePrototipo()
  const [busca, setBusca] = useState('')
  const [ordem, setOrdem] = useState({ campo: 'fat', direcao: 'desc' })
  const indisp = estadoForcado === 'indisponivel'
  const termo = busca.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const filtradas = lojas.filter((l) => !termo || `${l.nome} ${l.cidade} ${l.id}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(termo))
  const col = COLUNAS.find((c) => c.id === ordem.campo)
  const ordenadas = [...filtradas].sort((a, b) => {
    const va = col.valor(a)
    const vb = col.valor(b)
    const v = typeof va === 'string' ? va.localeCompare(vb, 'pt-BR') : va - vb
    return ordem.direcao === 'asc' ? v : -v
  })
  const ordenar = (campo) => setOrdem((o) => ({ campo, direcao: o.campo === campo && o.direcao === 'desc' ? 'asc' : campo === 'nome' && o.campo !== campo ? 'asc' : 'desc' }))
  const ariaSort = (campo) => (ordem.campo === campo ? (ordem.direcao === 'asc' ? 'ascending' : 'descending') : 'none')
  const Icone = ({ campo }) => (ordem.campo !== campo ? <ArrowUpDown size={14} aria-hidden /> : ordem.direcao === 'asc' ? <ArrowUp size={14} aria-hidden /> : <ArrowDown size={14} aria-hidden />)

  return (
    <section className="bloco" aria-labelledby="titulo-lojas-rede">
      <header className="bloco__cabecalho rede__cabecalho-lojas">
        <h2 id="titulo-lojas-rede">Lojas</h2>
        <div className="busca rede__busca">
          <Search size={18} aria-hidden className="busca__icone" />
          <input type="search" className="busca__campo" placeholder="Nome, ID ou cidade" aria-label="Buscar loja por nome, ID ou cidade" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
      </header>
      {ordenadas.length === 0 ? (
        <EstadoVazio titulo={`Nenhuma loja com "${busca.trim()}".`} texto="Busque pelo nome, ID ou cidade." acao={<Botao onClick={() => setBusca('')}>Limpar busca</Botao>} />
      ) : (
        <div className="tabela-rolagem">
          <table className="tabela">
            <caption className="visualmente-oculto">Lojas da rede, ordenadas por {col.rotulo.toLowerCase()}</caption>
            <thead>
              <tr>
                {COLUNAS.map((c) => (
                  <th key={c.id} scope="col" className={c.num ? 'tabela__num' : undefined} aria-sort={ariaSort(c.id)}>
                    <button type="button" className="tabela__ordenar" onClick={() => ordenar(c.id)}>{c.rotulo} <Icone campo={c.id} /></button>
                  </th>
                ))}
                <th scope="col"><span className="visualmente-oculto">Ação</span></th>
              </tr>
            </thead>
            <tbody>
              {ordenadas.map((l) => (
                <tr key={l.id}>
                  <th scope="row" className="rede__loja">
                    <span className="tabela__principal">{l.nome}</span>
                    <span className="tabela__secundario">{l.cidade} · ID {l.id}</span>
                  </th>
                  <td>
                    <Selo tom={l.estado.tom}>{l.estado.rotulo}</Selo>
                  </td>
                  <td className="tabela__num">{numero(l.r.hoje)}</td>
                  <td className="tabela__num">{l.r.fat == null ? <SemDado /> : moeda(l.r.fat)}</td>
                  <td className={`tabela__num ${l.r.varPct != null && l.r.varPct <= -10 ? 'rede__queda' : ''}`}>{l.r.varPct == null ? <SemDado /> : percentual(l.r.varPct)}</td>
                  <td className="tabela__num">
                    {indisp ? <Indisponivel motivo={MOTIVO_CANC} /> : l.r.canc == null ? <SemDado /> : percentual(l.r.canc).replace('+', '')}
                  </td>
                  <td className="tabela__num">
                    <Botao tamanho="p" onClick={() => entrar(l.id)} aria-label={`Entrar na loja ${l.nome}`}>Entrar na loja</Botao>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="bloco__nota">Faturamento, variação e cancelamentos de outubro até o dia 9, contra setembro no mesmo intervalo. Loja sem pedidos no período aparece com "—".</p>
    </section>
  )
}

// ---------- Celular: lojas que pedem atenção primeiro, depois as 5 de maior faturamento ----------
function ListaLojasCelular({ lojas, entrar }) {
  const [todas, setTodas] = useState(false)
  const atencao = lojas.filter((l) => l.motivos.length || l.estado.id === 'sem')
  const porFat = [...lojas].sort((a, b) => (b.r.fat ?? -1) - (a.r.fat ?? -1))
  const maiores = porFat.filter((l) => !atencao.includes(l)).slice(0, 5)
  const Item = ({ l }) => (
    <li className="item-celular rede__item">
      <span className="item-celular__textos">
        <span className="item-celular__nome">{l.nome}</span>
        <span className="item-celular__estado">
          <Selo tom={l.estado.tom}>{l.estado.rotulo}</Selo> · {l.r.fat == null ? 'Sem pedidos no período' : moeda(l.r.fat)}
          {l.r.varPct != null && ` (${percentual(l.r.varPct)})`}
        </span>
        {l.motivos.length > 0 && <span className="rede__motivos">{l.motivos.join(' · ')}</span>}
      </span>
      <Botao tamanho="p" onClick={() => entrar(l.id)} aria-label={`Entrar na loja ${l.nome}`}>Entrar</Botao>
    </li>
  )
  if (todas) {
    return (
      <section className="secao-celular" aria-labelledby="titulo-todas-lojas">
        <h2 id="titulo-todas-lojas">As {lojas.length} lojas<span className="secao-celular__sub">Por faturamento no período</span></h2>
        <ul>{porFat.map((l) => <Item key={l.id} l={l} />)}</ul>
        <div className="rede__rodape-celular"><Botao variante="texto" onClick={() => setTodas(false)}>Mostrar menos</Botao></div>
      </section>
    )
  }
  return (
    <>
      {atencao.length > 0 && (
        <section className="secao-celular rede__secao-atencao" aria-labelledby="titulo-lojas-atencao">
          <h2 id="titulo-lojas-atencao">Pedem atenção<span className="secao-celular__sub">{plural(atencao.length, 'loja', 'lojas')}</span></h2>
          <ul>{atencao.map((l) => <Item key={l.id} l={l} />)}</ul>
        </section>
      )}
      <section className="secao-celular" aria-labelledby="titulo-lojas-maiores">
        <h2 id="titulo-lojas-maiores">Maior faturamento<span className="secao-celular__sub">Outubro até o dia 9</span></h2>
        <ul>{maiores.map((l) => <Item key={l.id} l={l} />)}</ul>
        <div className="rede__rodape-celular"><Botao className="botao--largo" onClick={() => setTodas(true)}>Ver as {lojas.length} lojas</Botao></div>
      </section>
    </>
  )
}

export function InicioRede() {
  const { cen, estadoForcado, statusVerificadoEm, trocarLoja } = usePrototipo()
  const navegar = useNavigate()
  const celular = useEhCelular()
  const [tentou, setTentou] = useState(false)
  const lojas = useLojasRede()
  useTitulo('Início')
  const carregando = estadoForcado === 'carregando'
  const erro = estadoForcado === 'erro' && !tentou
  const entrar = (id) => {
    trocarLoja(id)
    navegar('/inicio')
  }

  return (
    <div className="pagina pagina--inicio">
      <div className="contexto">
        <h1 className="contexto__loja">Toda a rede · {cen.marca.nome}</h1>
        <p className="contexto__data">
          <span>{dataExtenso(AGORA_REFERENCIA)}</span>
          <span aria-hidden> · </span>
          <span>{plural(lojas.length, 'loja', 'lojas')} · Atualizado às {hora(statusVerificadoEm)}</span>
        </p>
      </div>
      <div className="inicio__dobra">
        <AgoraRede lojas={lojas} carregando={carregando} erro={erro} aoTentar={() => setTentou(true)} />
        <OQueFazerRede limite={celular ? 3 : 5} carregando={carregando} />
      </div>
      <KpisRede celular={celular} carregando={carregando} />
      {carregando ? (
        <section className="bloco" aria-label="Lojas">
          <Carregando oQue="as lojas"><div className="tabela-esqueleto">{Array.from({ length: 6 }, (_, i) => <Esqueleto key={i} linhas={1} altura="44px" />)}</div></Carregando>
        </section>
      ) : erro ? (
        <EstadoErro oQue="as lojas" aoTentar={() => setTentou(true)} />
      ) : celular ? (
        <ListaLojasCelular lojas={lojas} entrar={entrar} />
      ) : (
        <TabelaLojas lojas={lojas} entrar={entrar} />
      )}
    </div>
  )
}
