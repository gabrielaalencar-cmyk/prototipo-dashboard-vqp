// T03. Início da loja: período no topo (filtros padronizados), faixa de contexto, KPIs, avisos e oportunidades, atalhos.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CircleCheck, Circle, Megaphone, PauseCircle, ReceiptText, TicketPercent } from 'lucide-react'
import { usePrototipo } from '../contexto/Prototipo.jsx'
import { useEhCelular, useTitulo } from '../utilitarios/ganchos.js'
import { AGORA_REFERENCIA, dataExtenso, moeda, numero, percentual, plural } from '../utilitarios/formatos.js'
import { contarPausados } from '../dados/cardapios.js'
import { Botao, Carregando, EstadoErro, EstadoVazio, Esqueleto, Indisponivel } from '../componentes/base.jsx'
import { ItemAcao } from '../componentes/ItemAcao.jsx'
import { InicioRede } from './camada2/InicioRede.jsx'

const MOTIVO_FORA_DO_AR = 'A fonte deste dado está fora do ar desde 18:10.'

// ---------- Itens de "Avisos e oportunidades" ----------
function useItensOQueFazer() {
  const { alertasAtivos, lojaId, perfil, cardapio, dadosLoja, cen, dispensarAlerta } = usePrototipo()
  const itens = []
  alertasAtivos
    .filter((a) => !a.lojaId || a.lojaId === lojaId)
    // pedido parado ou atrasado é tratado no receptor de pedidos, não aqui
    .filter((a) => a.prioridade !== 2)
    .filter((a) => perfil !== 'gerente' || a.prioridade <= 4)
    .forEach((a) => itens.push({ ...a, dispensavel: true }))

  const pausados = cardapio ? contarPausados(cardapio) : { produtos: [], complementos: [] }
  const desdeOntem = [...pausados.produtos, ...pausados.complementos].filter((x) => x.pausadoDesde === 'ontem')
  if (desdeOntem.length) {
    itens.push({
      id: 'pausados-ontem',
      tipo: 'Cardápio',
      texto: `${plural(desdeOntem.length, 'item pausado', 'itens pausados')} desde ontem`,
      motivo: `${desdeOntem.map((x) => x.nome).join(' e ')}. Confira se já voltaram.`,
      acoes: [{ rotulo: 'Revisar pausados', para: '/cardapio?filtro=pausados' }],
    })
  }
  if (perfil !== 'gerente') {
    ;(dadosLoja?.oportunidades || []).forEach((o) => itens.push(o))
    if (cen.id === 'pequena' && cen.canais.push) {
      itens.push({
        id: 'campanhas',
        tipo: 'Campanhas',
        texto: 'Nenhuma campanha enviada nos últimos 30 dias',
        motivo: 'O push do app está ativo e pode avisar seus clientes.',
        acoes: [{ rotulo: 'Ver modelos', para: '/campanhas' }],
      })
    }
    if (dadosLoja?.checklist) {
      const faltam = dadosLoja.checklist.filter((c) => !c.feito)
      if (faltam.length) {
        itens.push({
          id: 'checklist',
          tipo: 'Começar a vender',
          texto: `Faltam ${faltam.length} passos para começar a vender`,
          motivo: `Próximo passo: ${faltam[0].texto.toLowerCase()}.`,
          acoes: [{ rotulo: 'Ir para o passo', para: faltam[0].para }],
        })
      }
    }
  }
  return { itens, dispensarAlerta }
}

function BlocoOQueFazer({ limite }) {
  const { estadoForcado } = usePrototipo()
  const { itens, dispensarAlerta } = useItensOQueFazer()
  const [todos, setTodos] = useState(false)
  const lista = estadoForcado === 'vazio' ? [] : itens
  const visiveis = todos ? lista : lista.slice(0, limite)
  return (
    <section className="bloco bloco--avisos" aria-labelledby="titulo-avisos">
      <header className="bloco__cabecalho">
        <h2 id="titulo-avisos">Avisos e oportunidades</h2>
        {lista.length > 0 && estadoForcado !== 'carregando' && <span className="bloco__contagem">{lista.length}</span>}
      </header>
      {estadoForcado === 'carregando' ? (
        <Carregando oQue="os avisos">
          <div className="lista-esqueleto">{[0, 1, 2].map((i) => <Esqueleto key={i} linhas={2} />)}</div>
        </Carregando>
      ) : lista.length === 0 ? (
        <EstadoVazio compacto titulo="Nada pedindo atenção agora." texto="Quando algo precisar de você, aparece aqui com a ação ao lado." />
      ) : (
        <>
          <ul className="lista-acoes">
            {visiveis.map((i) => (
              <ItemAcao key={i.id} item={i} aoDispensar={i.dispensavel ? dispensarAlerta : undefined} />
            ))}
          </ul>
          {lista.length > limite && (
            <button type="button" className="bloco__mais" aria-expanded={todos} onClick={() => setTodos((t) => !t)}>
              {todos ? 'Mostrar menos' : `Ver todos (${lista.length})`}
            </button>
          )}
        </>
      )}
    </section>
  )
}

// ---------- Período (no topo, com os filtros padronizados) ----------
export const ATALHOS_PERIODO = [
  { id: '7-dias', rotulo: 'Últimos 7 dias' },
  { id: 'este-mes', rotulo: 'Mês atual' },
  { id: '30-dias', rotulo: 'Últimos 30 dias' },
]

const KPIS = [
  { id: 'faturamento', rotulo: 'Faturamento', fmt: moeda, aba: 'vendas', unidade: (n) => moeda(n), financeiro: true },
  { id: 'pedidos', rotulo: 'Pedidos', fmt: numero, aba: 'vendas', unidade: (n) => plural(n, 'pedido', 'pedidos') },
  { id: 'ticket', rotulo: 'Ticket médio', fmt: moeda, aba: 'vendas', unidade: (n) => moeda(n), financeiro: true },
  { id: 'clientes', rotulo: 'Clientes que compraram', fmt: numero, aba: 'clientes', unidade: (n) => plural(n, 'cliente', 'clientes') },
]

// Variação no estilo do Analítico: seta e valor na cor do sinal, o resto neutro
function Variacao({ kpi, atual, anterior, baixoVolume, comparado }) {
  const dif = atual - anterior
  if (Math.abs(dif) < 0.005) return <span className="kpi__variacao">Igual a {comparado}</span>
  const sobe = dif > 0
  const valor = baixoVolume
    ? kpi.unidade(Math.abs(kpi.id === 'pedidos' || kpi.id === 'clientes' ? Math.round(dif) : dif)).replace(/ (pedidos?|clientes?)$/, '')
    : percentual((dif / anterior) * 100).replace(/^[+-]/, '')
  return (
    <span className="kpi__variacao">
      <span className={`kpi__delta ${sobe ? 'kpi__delta--alta' : 'kpi__delta--queda'}`}>
        <span aria-hidden>{sobe ? '↑' : '↓'}</span> {valor}
      </span>{' '}
      {baixoVolume ? `a ${sobe ? 'mais' : 'menos'} que ${comparado}` : `${sobe ? 'acima de' : 'abaixo de'} ${comparado}`}
    </span>
  )
}

function BlocoPeriodo({ periodoId, soOperacional }) {
  const { dadosLoja, estadoForcado } = usePrototipo()
  const [tentou, setTentou] = useState(false)
  const p = dadosLoja.periodo[periodoId]
  const baixoVolume = p.atual.pedidos < 30
  const erro = estadoForcado === 'erro' && !tentou
  const vazio = estadoForcado === 'vazio'
  const indisp = estadoForcado === 'indisponivel'
  // gerente e operador: sem os números financeiros
  const kpis = KPIS.filter((k) => !soOperacional || !k.financeiro)
  return (
    <section className="periodo" aria-labelledby="titulo-periodo">
      <h2 id="titulo-periodo" className="visualmente-oculto">Números do período: {p.rotulo}</h2>
      {estadoForcado === 'carregando' ? (
        <Carregando oQue="os números do período">
          <div className="cartoes-kpi">{kpis.map((k) => <div key={k.id} className="cartao-kpi"><Esqueleto linhas={3} /></div>)}</div>
        </Carregando>
      ) : erro ? (
        <EstadoErro oQue="os números do período" aoTentar={() => setTentou(true)} />
      ) : (
        <>
          <ul className={`cartoes-kpi cartoes-kpi--${kpis.length}`}>
            {kpis.map((k) => (
              <li key={k.id} className="cartao-kpi">
                <Link to={`/analise/${k.aba}?periodo=${periodoId}`} className="cartao-kpi__link">
                  <span className="rotulo-kpi">{k.rotulo}</span>
                  {indisp ? (
                    <Indisponivel motivo={MOTIVO_FORA_DO_AR} />
                  ) : vazio ? (
                    <span className="numero-kpi kpi__valor--vazio">{k.id === 'ticket' ? '—' : k.fmt(0)}</span>
                  ) : (
                    <span className="numero-kpi">{k.fmt(p.atual[k.id])}</span>
                  )}
                  {!indisp && !vazio && <Variacao kpi={k} atual={p.atual[k.id]} anterior={p.anterior[k.id]} baixoVolume={baixoVolume} comparado={p.mesComparado} />}
                  {vazio && !indisp && <span className="kpi__variacao">Nenhum pedido neste período</span>}
                  <span className="kpi__destino">Ver em {k.aba === 'vendas' ? 'Vendas' : 'Clientes'} <ArrowRight size={14} aria-hidden /></span>
                </Link>
              </li>
            ))}
          </ul>
          {baixoVolume && !vazio && !indisp && (
            <p className="bloco__nota">Menos de 30 pedidos no período: a variação aparece em números, não em percentual, porque com pouco volume o percentual engana.</p>
          )}
        </>
      )}
    </section>
  )
}

function ChecklistLojaNova() {
  const { dadosLoja } = usePrototipo()
  const lista = dadosLoja.checklist
  const feitos = lista.filter((c) => c.feito).length
  return (
    <section className="bloco bloco--checklist" aria-labelledby="titulo-checklist">
      <header className="bloco__cabecalho">
        <div>
          <h2 id="titulo-checklist">Para começar a vender</h2>
          <p className="bloco__sub">{feitos} de {lista.length} passos prontos. Os números do período aparecem depois do primeiro pedido.</p>
        </div>
      </header>
      <ol className="checklist">
        {lista.map((c) => (
          <li key={c.id} className={`checklist__passo ${c.feito ? 'checklist__passo--feito' : ''}`}>
            {c.feito ? <CircleCheck size={20} aria-hidden className="checklist__icone" /> : <Circle size={20} aria-hidden className="checklist__icone" />}
            <span className="checklist__texto">
              <span>{c.texto}</span>
              <span className="checklist__estado">{c.feito ? 'Pronto' : c.motivo}</span>
            </span>
            {!c.feito && <Botao tamanho="p" variante="principal" para={c.para}>Configurar</Botao>}
            {c.feito && <Link to={c.para} className="link">Revisar</Link>}
          </li>
        ))}
      </ol>
    </section>
  )
}

function Atalhos() {
  const { pode } = usePrototipo()
  const atalhos = [
    { rotulo: 'Pausar item', para: '/cardapio', icone: PauseCircle, permissao: 'cardapio' },
    { rotulo: 'Ver pedidos', para: '/pedidos', icone: ReceiptText, permissao: 'pedidos' },
    { rotulo: 'Criar cupom', para: '/cupons/novo', icone: TicketPercent, permissao: 'cupons' },
    { rotulo: 'Criar campanha', para: '/campanhas/nova', icone: Megaphone, permissao: 'campanhas' },
  ].filter((a) => pode(a.permissao))
  if (!atalhos.length) return null
  return (
    <nav className="atalhos" aria-label="Atalhos">
      {atalhos.map((a) => (
        <Botao key={a.rotulo} para={a.para} icone={a.icone}>{a.rotulo}</Botao>
      ))}
    </nav>
  )
}

export function Inicio() {
  const { emRede, loja, perfil, cen, dadosLoja, horaAtualizacaoAnalitico } = usePrototipo()
  const celular = useEhCelular()
  const [periodoId, setPeriodoId] = useState('este-mes')
  useTitulo('Início')
  if (emRede) return <InicioRede />

  const lojaNova = !!dadosLoja.checklist
  const p = dadosLoja.periodo?.[periodoId]

  return (
    <div className="pagina pagina--inicio">
      <div className="inicio__topo">
        <h1 className="contexto__loja">{loja.nome}</h1>
        {!lojaNova && (
          <div className="seletor-periodo" role="group" aria-label="Período">
            {ATALHOS_PERIODO.map((a) => (
              <button key={a.id} type="button" aria-pressed={periodoId === a.id} className="seletor-periodo__opcao" onClick={() => setPeriodoId(a.id)}>
                {a.rotulo}
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="faixa-contexto">
        <span className="faixa-contexto__escopo">
          <strong>{loja.nome}</strong>
          <span aria-hidden> · </span>
          {cen.rede ? 'uma loja da rede' : 'uma loja'}
          {p && <><span aria-hidden> · </span><span className="numero">{p.rotulo}</span>, comparado com {p.comparacao}</>}
        </span>
        <span className="faixa-contexto__frescor">Vendas atualizadas <span className="numero">hoje {horaAtualizacaoAnalitico}</span></span>
      </p>
      {lojaNova ? <ChecklistLojaNova /> : <BlocoPeriodo periodoId={periodoId} soOperacional={perfil === 'gerente'} />}
      <BlocoOQueFazer limite={celular ? 3 : 5} />
      <Atalhos />
      {perfil === 'gerente' && <p className="nota-pe">Perfil gerente ou operador: sem faturamento e ticket médio.</p>}
    </div>
  )
}
