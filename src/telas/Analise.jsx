// T23. Análise do período: as visões do Analítico V2 dentro da moldura do dashboard.
// No protótipo, o conteúdo de cada aba é uma prévia simulada com os dados do cenário.
import { useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Star } from 'lucide-react'
import { usePrototipo } from '../contexto/Prototipo.jsx'
import { useTitulo } from '../utilitarios/ganchos.js'
import { decimal, moeda, numero, percentual, plural } from '../utilitarios/formatos.js'
import { Abas, Carregando, CabecalhoPagina, EstadoErro, EstadoVazio, Esqueleto, Indisponivel } from '../componentes/base.jsx'
import { NaoEncontrada } from './EstadosGlobais.jsx'

const ABAS = [
  { id: 'visao-geral', rotulo: 'Visão geral' },
  { id: 'vendas', rotulo: 'Vendas' },
  { id: 'lojas', rotulo: 'Lojas', soRede: true },
  { id: 'clientes', rotulo: 'Clientes' },
  { id: 'churn', rotulo: 'Churn' },
  { id: 'operacao', rotulo: 'Operação' },
  { id: 'fidelidade', rotulo: 'Fidelidade' },
  { id: 'avaliacoes', rotulo: 'Avaliações' },
]

// Mesmos atalhos da tela inicial
const PERIODOS = [
  { id: '7-dias', rotulo: 'Últimos 7 dias' },
  { id: 'este-mes', rotulo: 'Mês atual' },
  { id: '30-dias', rotulo: 'Últimos 30 dias' },
]

// ---------- Gráfico de barras de uma série, com dica e frase de leitura ----------
function Barras({ dados, rotulo, formatar = numero, leitura, altura = 160 }) {
  const [foco, setFoco] = useState(null)
  const [tabela, setTabela] = useState(false)
  const max = Math.max(...dados.map((d) => d.valor), 1)
  const largura = 100 / dados.length
  return (
    <figure className="grafico">
      <figcaption className="grafico__leitura">{leitura}</figcaption>
      {tabela ? (
        <table className="tabela tabela--compacta">
          <caption className="visualmente-oculto">{rotulo}</caption>
          <thead><tr><th scope="col">Quando</th><th scope="col" className="tabela__num">{rotulo}</th></tr></thead>
          <tbody>{dados.map((d) => <tr key={d.rotulo}><td>{d.rotuloLongo || d.rotulo}</td><td className="tabela__num">{formatar(d.valor)}</td></tr>)}</tbody>
        </table>
      ) : (
        <div className="grafico__area" style={{ height: altura }} onMouseLeave={() => setFoco(null)}>
          <svg viewBox={`0 0 100 ${altura}`} preserveAspectRatio="none" className="grafico__svg" role="img" aria-label={`${rotulo}. ${leitura}`}>
            <line x1="0" x2="100" y1={altura - 0.5} y2={altura - 0.5} className="grafico__base" />
            {dados.map((d, i) => {
              const h = (d.valor / max) * (altura - 12)
              return (
                <rect
                  key={d.rotulo}
                  x={i * largura + largura * 0.22}
                  width={largura * 0.56}
                  y={altura - h}
                  height={Math.max(h, d.valor > 0 ? 2 : 0)}
                  rx="1.2"
                  className={`grafico__barra ${foco === i ? 'grafico__barra--foco' : ''}`}
                />
              )
            })}
          </svg>
          {/* alvos maiores que a barra, um por coluna */}
          <div className="grafico__alvos">
            {dados.map((d, i) => (
              <button
                key={d.rotulo}
                type="button"
                className="grafico__alvo"
                style={{ width: `${largura}%` }}
                onMouseEnter={() => setFoco(i)}
                onFocus={() => setFoco(i)}
                onBlur={() => setFoco(null)}
                aria-label={`${d.rotuloLongo || d.rotulo}: ${formatar(d.valor)}`}
              />
            ))}
          </div>
          {foco !== null && (
            <div className="grafico__dica" style={{ left: `${(foco + 0.5) * largura}%` }} role="status">
              <span>{dados[foco].rotuloLongo || dados[foco].rotulo}</span>
              <strong>{formatar(dados[foco].valor)}</strong>
            </div>
          )}
        </div>
      )}
      {!tabela && (
        <div className="grafico__eixo" aria-hidden>
          {dados.map((d, i) => <span key={d.rotulo} style={{ width: `${largura}%` }}>{i % Math.ceil(dados.length / 9) === 0 ? d.rotulo : ''}</span>)}
        </div>
      )}
      <button type="button" className="link grafico__alternar" onClick={() => setTabela((t) => !t)}>
        {tabela ? 'Ver como gráfico' : 'Ver como tabela'}
      </button>
    </figure>
  )
}

// Rosca de parte do todo (pedido da Gabi). Paleta categórica validada (dataviz): azul, laranja, verde-água.
// Legenda com valor e percentual sempre visível, porque o verde-água fica abaixo de 3:1 no fundo.
const CORES_SERIE = ['#2a78d6', '#eb6834', '#1baf7a']

function Rosca({ dados }) {
  const [foco, setFoco] = useState(null)
  const total = dados.reduce((s, d) => s + d.valor, 0)
  if (!total) return <EstadoVazio compacto titulo="Nenhum pedido no período." />
  const raio = 52
  const espessura = 22
  const circ = 2 * Math.PI * raio
  const vao = 2 // 2px de superfície entre as fatias
  let acumulado = 0
  const fatias = dados.map((d, i) => {
    const comprimento = (d.valor / total) * circ
    const fatia = { ...d, cor: CORES_SERIE[i], inicio: acumulado, comprimento, pct: (d.valor / total) * 100 }
    acumulado += comprimento
    return fatia
  })
  const maior = fatias.reduce((a, b) => (b.valor > a.valor ? b : a))
  return (
    <figure className="rosca">
      <figcaption className="grafico__leitura">
        {maior.rotulo} concentra {decimal(maior.pct, 0)}% dos pedidos do período ({plural(maior.valor, 'pedido', 'pedidos')} de {numero(total)}).
      </figcaption>
      <div className="rosca__corpo">
        <svg viewBox="0 0 140 140" width="140" height="140" role="img" aria-label={`Pedidos por modalidade: ${fatias.map((f) => `${f.rotulo} ${decimal(f.pct, 0)}%`).join(', ')}`}>
          <circle cx="70" cy="70" r={raio} fill="none" stroke="var(--superficie-3)" strokeWidth={espessura} />
          {fatias.filter((f) => f.valor > 0).map((f, i) => (
            <circle
              key={f.rotulo}
              cx="70" cy="70" r={raio} fill="none"
              stroke={f.cor}
              strokeWidth={foco === i ? espessura + 4 : espessura}
              strokeDasharray={`${Math.max(f.comprimento - vao, 0.5)} ${circ}`}
              strokeDashoffset={-f.inicio}
              transform="rotate(-90 70 70)"
              onMouseEnter={() => setFoco(i)}
              onMouseLeave={() => setFoco(null)}
            />
          ))}
          <text x="70" y="66" textAnchor="middle" className="rosca__total">{numero(total)}</text>
          <text x="70" y="84" textAnchor="middle" className="rosca__rotulo-total">pedidos</text>
        </svg>
        <ul className="rosca__legenda">
          {fatias.map((f, i) => (
            <li key={f.rotulo} className={foco === i ? 'rosca__item--foco' : ''} onMouseEnter={() => setFoco(i)} onMouseLeave={() => setFoco(null)}>
              <span className="rosca__amostra" style={{ background: f.cor }} aria-hidden />
              <span className="rosca__nome">{f.rotulo}</span>
              <strong>{decimal(f.pct, 0)}%</strong>
              <span className="rosca__valor">{plural(f.valor, 'pedido', 'pedidos')}</span>
            </li>
          ))}
        </ul>
      </div>
    </figure>
  )
}

function Painel({ titulo, children, nota }) {
  return (
    <section className="painel-analise">
      <h2>{titulo}</h2>
      {children}
      {nota && <p className="bloco__nota">{nota}</p>}
    </section>
  )
}

function Kpis({ p, baixoVolume }) {
  const itens = [
    ['Faturamento', moeda(p.atual.faturamento), p.atual.faturamento - p.anterior.faturamento, moeda],
    ['Pedidos', numero(p.atual.pedidos), p.atual.pedidos - p.anterior.pedidos, (n) => plural(Math.round(n), 'pedido', 'pedidos')],
    ['Ticket médio', moeda(p.atual.ticket), p.atual.ticket - p.anterior.ticket, moeda],
    ['Clientes que compraram', numero(p.atual.clientes), p.atual.clientes - p.anterior.clientes, (n) => plural(Math.round(n), 'cliente', 'clientes')],
  ]
  return (
    <ul className="kpis kpis--analise">
      {itens.map(([r, v, dif, fmt], i) => {
        const anterior = [p.anterior.faturamento, p.anterior.pedidos, p.anterior.ticket, p.anterior.clientes][i]
        return (
          <li key={r} className="kpi">
            <span className="kpi__rotulo">{r}</span>
            <span className="kpi__valor">{v}</span>
            <span className="kpi__variacao">
              {baixoVolume
                ? `${fmt(Math.abs(dif))} a ${dif >= 0 ? 'mais' : 'menos'} que ${p.mesComparado}`
                : `${percentual((dif / anterior) * 100)} contra ${p.mesComparado}`}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

function useSerieDiaria(pedidos) {
  return useMemo(() => {
    const dias = Array.from({ length: 9 }, (_, i) => i + 1)
    return dias.map((dia) => ({
      rotulo: String(dia).padStart(2, '0'),
      rotuloLongo: `${String(dia).padStart(2, '0')}/10`,
      valor: pedidos.filter((p) => p.criado.getDate() === dia && p.grupo !== 'cancelado').length,
    }))
  }, [pedidos])
}

function ConteudoAba({ aba, periodoId }) {
  const { cen, emRede, dadosLoja, lojaId, pedidosDaLoja, lojasVisiveis, estadoLojas } = usePrototipo()
  const pedidos = emRede ? [] : pedidosDaLoja(lojaId)
  const serieDiaria = useSerieDiaria(pedidos)
  const p = emRede
    ? {
        rotulo: 'Outubro até o dia 9', mesComparado: 'setembro',
        atual: { faturamento: 152380, pedidos: 1932, ticket: 78.87, clientes: 1508 },
        anterior: { faturamento: 152380 / 1.068, pedidos: Math.round(1932 / 1.041), ticket: 76.9, clientes: 1452 },
      }
    : dadosLoja.periodo?.[periodoId]
  if (!p) {
    return <EstadoVazio titulo="Os números do período aparecem depois do primeiro pedido." texto="Enquanto isso, termine o checklist do Início para começar a vender." />
  }
  const baixoVolume = p.atual.pedidos < 30

  if (aba === 'visao-geral') {
    return (
      <>
        <Painel titulo="Resumo do período" nota={baixoVolume ? 'Menos de 30 pedidos: variações em números, não em percentual.' : undefined}>
          <Kpis p={p} baixoVolume={baixoVolume} />
        </Painel>
        <Painel titulo="Leitura do período">
          <p className="texto-corpo">
            {emRede
              ? 'A rede vendeu 6,8% mais que setembro no mesmo intervalo. A Unidade Vila Serena é a única em queda (−12,0%) e a Unidade Vila Nova tem a maior taxa de cancelamento (4,8%).'
              : baixoVolume
                ? `Foram ${plural(p.atual.pedidos, 'pedido', 'pedidos')} até agora, ${p.atual.pedidos - p.anterior.pedidos >= 0 ? `${p.atual.pedidos - p.anterior.pedidos} a mais` : `${p.anterior.pedidos - p.atual.pedidos} a menos`} que ${p.mesComparado}. Com esse volume, cada pedido muda bastante a média: olhe a lista de pedidos em Vendas.`
                : `O faturamento ficou ${percentual(((p.atual.faturamento - p.anterior.faturamento) / p.anterior.faturamento) * 100)} contra ${p.mesComparado}, puxado pelo número de pedidos.`}
          </p>
        </Painel>
      </>
    )
  }

  if (aba === 'vendas') {
    const contagem = {}
    pedidos.filter((x) => x.grupo !== 'cancelado').forEach((x) => x.itens.forEach((i) => (contagem[i.nome] = (contagem[i.nome] || 0) + i.qtd)))
    const top = Object.entries(contagem).sort((a, b) => b[1] - a[1]).slice(0, 6)
    const modalidades = ['Delivery', 'Quero levar', 'Comer aqui'].map((m) => [m, pedidos.filter((x) => x.modalidade === m && x.grupo !== 'cancelado').length])
    const total = serieDiaria.reduce((s, d) => s + d.valor, 0)
    const maior = serieDiaria.reduce((a, b) => (b.valor > a.valor ? b : a), serieDiaria[0])
    return (
      <>
        <Painel titulo="Pedidos por dia">
          {emRede ? (
            <p className="texto-corpo">Na rede, a curva diária soma as 12 lojas. Escolha uma loja para ver a curva dela.</p>
          ) : total < 30 ? (
            <>
              <p className="grafico__leitura">Poucos pedidos no período ({total}): a lista por dia lê melhor que um gráfico.</p>
              <ul className="lista-dias">
                {serieDiaria.filter((d) => d.valor > 0).map((d) => <li key={d.rotulo}><span>{d.rotuloLongo}</span><strong>{plural(d.valor, 'pedido', 'pedidos')}</strong></li>)}
              </ul>
            </>
          ) : (
            <Barras dados={serieDiaria} rotulo="Pedidos por dia" leitura={`${plural(total, 'pedido', 'pedidos')} de 1 a 9 de outubro. O dia mais movimentado foi ${maior.rotuloLongo}, com ${maior.valor}.`} />
          )}
        </Painel>
        {!emRede && (
          <div className="painel-analise__duas">
            <Painel titulo="O que minha loja vendeu">
              <ol className="ranking">{top.map(([n, q]) => <li key={n}><span>{n}</span><strong>{numero(q)}</strong></li>)}</ol>
            </Painel>
            <Painel titulo="Como o cliente compra">
              <Rosca dados={modalidades.map(([m, q]) => ({ rotulo: m, valor: q }))} />
            </Painel>
          </div>
        )}
      </>
    )
  }

  if (aba === 'lojas') {
    const lojas = lojasVisiveis.filter((l) => l.resumo).sort((a, b) => b.resumo.fat - a.resumo.fat)
    return (
      <Painel titulo="Lojas no período">
        <div className="tabela-rolagem">
          <table className="tabela">
            <thead>
              <tr><th scope="col">Loja</th><th scope="col" className="tabela__num">Faturamento</th><th scope="col" className="tabela__num">Variação</th><th scope="col" className="tabela__num">Cancelamentos</th><th scope="col">Agora</th></tr>
            </thead>
            <tbody>
              {lojas.map((l) => {
                const e = estadoLojas[l.id]
                return (
                  <tr key={l.id}>
                    <td><span className="tabela__principal">{l.nome}</span><span className="tabela__secundario">{l.cidade}</span></td>
                    <td className="tabela__num">{moeda(l.resumo.fat)}</td>
                    <td className="tabela__num">{percentual(l.resumo.varPct)}</td>
                    <td className="tabela__num">{decimal(l.resumo.canc)}%</td>
                    <td>{e.conexao === 'sem' ? 'Sem conexão' : e.delivery === 'aberto' || e.balcao === 'aberto' ? 'Aberta' : 'Fechada'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Painel>
    )
  }

  if (aba === 'clientes') {
    const novos = emRede ? 412 : Math.max(1, Math.round(p.atual.clientes * 0.33))
    return (
      <Painel titulo="Quem comprou no período" nota={p.atual.clientes < 30 ? 'Menos de 30 clientes: contagens, sem percentual.' : undefined}>
        <ul className="ranking ranking--grande">
          <li><span>Compraram pela primeira vez</span><strong>{numero(novos)}</strong></li>
          <li><span>Voltaram a comprar</span><strong>{numero(p.atual.clientes - novos)}</strong></li>
          <li><span>Clientes na base</span><strong>{numero(emRede ? 11180 : dadosLoja.clientesBase)}</strong></li>
        </ul>
      </Painel>
    )
  }

  if (aba === 'churn') {
    const n = emRede ? 420 : Number((dadosLoja.oportunidades.find((o) => o.id === 'op-afastando')?.texto || '0').split(' ')[0])
    return (
      <Painel titulo="Clientes se afastando" nota="Limiar do protótipo: 50 dias sem comprar. Leitura atualizada na virada do mês.">
        <p className="numero-destaque">{numero(n)} <span>clientes sem comprar há mais de 50 dias</span></p>
        <p className="texto-secundario">Em aberto: se a lista nominal desses clientes pode aparecer na tela, por ser dado pessoal.</p>
      </Painel>
    )
  }

  if (aba === 'operacao') {
    const horas = Array.from({ length: 13 }, (_, i) => i + 11)
    const porHora = horas.map((h) => ({ rotulo: `${h}h`, rotuloLongo: `${h}h às ${h + 1}h`, valor: pedidos.filter((x) => x.criado.getHours() === h && x.grupo !== 'cancelado').length }))
    const total = porHora.reduce((s, d) => s + d.valor, 0)
    const pico = porHora.reduce((a, b) => (b.valor > a.valor ? b : a), porHora[0])
    return (
      <>
        <Painel titulo="Movimento por hora">
          {emRede ? (
            <p className="texto-corpo">Escolha uma loja para ver o movimento por hora dela.</p>
          ) : total < 30 ? (
            <>
              <p className="grafico__leitura">Poucos pedidos nos últimos 7 dias ({total}): contagem por faixa, sem gráfico.</p>
              <ul className="lista-dias">
                {porHora.filter((d) => d.valor > 0).map((d) => <li key={d.rotulo}><span>{d.rotuloLongo}</span><strong>{plural(d.valor, 'pedido', 'pedidos')}</strong></li>)}
              </ul>
            </>
          ) : (
            <Barras dados={porHora} rotulo="Pedidos por hora, últimos 7 dias" leitura={`O pico é das ${pico.rotuloLongo}, com ${pico.valor} pedidos nos últimos 7 dias.`} />
          )}
        </Painel>
        <Painel titulo="Tempo para aceitar o pedido">
          <Indisponivel motivo="Este número ainda não é medido." />
        </Painel>
      </>
    )
  }

  if (aba === 'fidelidade') {
    if (cen.fidelidade.tipo === 'cashback') {
      return (
        <Painel titulo="Cashback" nota="Os três números de cashback ainda não têm origem no Analítico. A gestão do programa continua funcionando em Fidelidade.">
          <ul className="kpis kpis--analise">
            <li className="kpi"><span className="kpi__rotulo">Cashback gerado</span><Indisponivel /></li>
            <li className="kpi"><span className="kpi__rotulo">Cashback usado</span><Indisponivel /></li>
            <li className="kpi"><span className="kpi__rotulo">Saldo em aberto</span><Indisponivel /></li>
            <li className="kpi"><span className="kpi__rotulo">Participantes</span><span className="kpi__valor">{numero(emRede ? 3920 : 326)}</span></li>
          </ul>
        </Painel>
      )
    }
    if (!cen.fidelidade.tipo) {
      return <EstadoVazio titulo="Você ainda não tem programa de fidelidade." texto="Quando houver um programa, a análise dele aparece aqui." />
    }
    return (
      <Painel titulo="Programa de pontos" nota="Abaixo de 200 participantes: contagens, sem percentual.">
        <ul className="ranking ranking--grande">
          <li><span>Participantes</span><strong>41</strong></li>
          <li><span>Com saldo ativo</span><strong>33</strong></li>
          <li><span>Pontos a vencer em 30 dias</span><strong>3</strong></li>
          <li><span>Pontos expirados</span><strong>5</strong></li>
          <li><span>Resgates no mês (Pastel grátis, 150 pontos)</span><strong>4</strong></li>
        </ul>
      </Painel>
    )
  }

  if (aba === 'avaliacoes') {
    const avaliados = pedidos.filter((x) => x.avaliacao)
    return (
      <Painel titulo="Avaliações" nota={avaliados.length < 30 ? 'Poucas avaliações: notas em fila, sem média.' : undefined}>
        {emRede ? (
          <p className="texto-corpo">3 avaliações nota 1 ou 2 hoje, 2 delas na Unidade Vila Nova.</p>
        ) : avaliados.length === 0 ? (
          <EstadoVazio compacto titulo="Nenhuma avaliação no período." />
        ) : (
          <ul className="avaliacoes">
            {avaliados.map((x) => (
              <li key={x.numero}>
                <span className="avaliacao__nota"><Star size={14} aria-hidden /> Nota {x.avaliacao.nota}</span>
                <span>"{x.avaliacao.comentario}"</span>
                <span className="texto-secundario">Pedido #{x.numero}</span>
              </li>
            ))}
          </ul>
        )}
      </Painel>
    )
  }
  return null
}

export function Analise() {
  const { aba = 'visao-geral' } = useParams()
  const [params, setParams] = useSearchParams()
  const periodoId = params.get('periodo') || 'este-mes'
  const { cen, temSeletor, emRede, estadoForcado, nomeContexto } = usePrototipo()
  const [tentou, setTentou] = useState(false)
  // Regra do Analítico: esconder o que o cliente nunca terá (Lojas para loja única)
  const abas = ABAS.filter((a) => !a.soRede || (cen.rede && temSeletor)).map((a) => ({ ...a, para: `/analise/${a.id}?periodo=${periodoId}` }))
  const atual = abas.find((a) => a.id === aba)
  useTitulo(`Análise do período${atual ? `: ${atual.rotulo}` : ''}`)
  if (!atual) return <NaoEncontrada />

  return (
    <div className="pagina pagina--analise">
      <CabecalhoPagina titulo="Análise do período" descricao={`${nomeContexto}${emRede ? '' : ''} · conteúdo do Analítico V2`} />
      <div className="analise__barra">
        <Abas abas={abas} ativa={aba} rotulo="Visões do Analítico" comoLinks />
        <div className="seletor-periodo" role="group" aria-label="Período">
          {PERIODOS.map((p) => (
            <button key={p.id} type="button" className="seletor-periodo__opcao" aria-pressed={periodoId === p.id} onClick={() => setParams({ periodo: p.id }, { replace: true })}>
              {p.rotulo}
            </button>
          ))}
        </div>
      </div>
      <p className="analise__aviso">Prévia simulada no protótipo. Na versão real, esta área mostra a visão {atual.rotulo} do Analítico V2, com as mesmas definições de métrica do Início.</p>
      {estadoForcado === 'carregando' ? (
        <Carregando oQue="a análise"><Esqueleto linhas={6} altura="24px" /></Carregando>
      ) : estadoForcado === 'erro' && !tentou ? (
        <EstadoErro oQue="a análise do período" aoTentar={() => setTentou(true)} />
      ) : estadoForcado === 'vazio' ? (
        <EstadoVazio titulo="Nenhum pedido neste período." texto="Troque o período ou volte depois do primeiro pedido." />
      ) : estadoForcado === 'indisponivel' ? (
        <section className="painel-analise"><h2>{atual.rotulo}</h2><Indisponivel motivo="A fonte deste dado está fora do ar desde 18:10." /></section>
      ) : (
        <ConteudoAba aba={aba} periodoId={periodoId} />
      )}
    </div>
  )
}
