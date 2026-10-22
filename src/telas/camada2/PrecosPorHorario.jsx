// Promoções automáticas ("precificação volátil"): movimento por dia da semana e período, regras de desconto
// nos horários de baixa e o assistente para criar uma regra (Quando, Desconto, Em quê, Resumo).
import { useId, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle, Monitor, Plus, Search, X } from 'lucide-react'
import { usePrototipo } from '../../contexto/Prototipo.jsx'
import { useEhCelular, useTitulo } from '../../utilitarios/ganchos.js'
import { AGORA_REFERENCIA, decimal, diaMes, moeda, numero, percentual, plural } from '../../utilitarios/formatos.js'
import {
  Botao, CabecalhoPagina, Campo, Carregando, Confirmacao, EstadoErro, EstadoVazio, Esqueleto, FaixaAviso, Indisponivel, Selo,
} from '../../componentes/base.jsx'
import {
  DIAS, LIMIAR_BAIXA, SEMANAS, deMinutos, descreverDias, descreverFaixa, descreverPeriodo, formatarPedidos, funcionamentoDoCenario,
  guardarRegras, leituraDoMovimento, motivoSemResultado, movimento, paraMinutos, periodosDoCenario, periodosFechados, regrasDoCenario,
  resultadoNaLoja, rotuloMinutos, sugestaoDeHorario, valorPonto,
} from '../../dados/precos.js'
import '../../estilos/precos.css'

const ESTADOS = {
  ativa: { rotulo: 'Ativa', tom: 'verde' },
  agendada: { rotulo: 'Agendada', tom: 'azul' },
  pausada: { rotulo: 'Pausada', tom: 'ambar' },
}
const MOTIVO_FORA = 'A fonte deste dado está fora do ar desde 18:10.'
const TEXTO_LOJA_NOVA = 'Com menos de 4 semanas de pedidos ainda não dá para saber seus horários de baixa.'

const nomeDaChave = (ch) => ch.slice(ch.indexOf(':') + 1)
const listar = (nomes) => new Intl.ListFormat('pt-BR', { style: 'long', type: 'conjunction' }).format(nomes)

const descreverQuando = (r) => `${descreverDias(r.dias)}, ${r.faixas.map(descreverFaixa).join(' e ')}`
function descreverAlvo(alvo) {
  if (alvo.modo === 'todo') return 'Cardápio todo'
  const nomes = listar(alvo.itens.map(nomeDaChave))
  return alvo.modo === 'exceto' ? `Cardápio todo, exceto ${nomes}` : nomes
}

// "Todas as 12 lojas" ou "4 lojas", com os nomes no rótulo acessível
function Lojas({ regra }) {
  const { lojasVisiveis } = usePrototipo()
  if (regra.lojas === 'todas') return <span>Todas as {lojasVisiveis.length} lojas</span>
  const nomes = regra.lojas.map((id) => lojasVisiveis.find((l) => l.id === id)?.nome).filter(Boolean)
  return (
    <span className="precos__lojas" title={nomes.join(', ')} tabIndex={0} aria-label={`${nomes.length} lojas: ${nomes.join(', ')}`}>
      {plural(nomes.length, 'loja', 'lojas')}
    </span>
  )
}

// Pedidos nos horários da regra contra o mesmo número de semanas antes dela
function Resultado({ regra }) {
  const { cen, lojaId, emRede, estadoForcado } = usePrototipo()
  if (estadoForcado === 'indisponivel') return <Indisponivel motivo={MOTIVO_FORA} />
  const motivo = motivoSemResultado(regra)
  if (motivo) return <Indisponivel motivo={motivo} />
  const r = resultadoNaLoja(regra, cen, lojaId, emRede)
  const dif = r.pedidos - r.pedidosAntes
  // Abaixo de 30 pedidos, a variação vai em número, não em percentual (regra do Analítico)
  const variacao = r.pedidos < 30
    ? `${dif > 0 ? '+' : ''}${plural(dif, 'pedido', 'pedidos')}`
    : percentual(((r.pedidos - r.pedidosAntes) / r.pedidosAntes) * 100)
  return (
    <span className="precos__resultado">
      <span className="numero precos__resultado-variacao">{variacao}</span>
      <span className="precos__resultado-detalhe">
        <span className="numero">{numero(r.pedidos)}</span> pedidos em {r.semanas} semanas, contra <span className="numero">{numero(r.pedidosAntes)}</span> nas {r.semanas} semanas antes
      </span>
    </span>
  )
}

// ---------- Movimento por dia da semana e período ----------
const METRICAS = [['pedidos', 'Pedidos'], ['ticket', 'Ticket médio']]

// Escala "redonda" do eixo y: 4 divisões a partir do zero
function escalaY(maximo) {
  if (!maximo) return { topo: 1, marcas: [0, 0.25, 0.5, 0.75, 1] }
  const bruto = maximo / 4
  const ordem = 10 ** Math.floor(Math.log10(bruto))
  const passo = [1, 2, 2.5, 5, 10].map((k) => k * ordem).find((k) => k >= bruto)
  return { topo: passo * 4, marcas: [0, 1, 2, 3, 4].map((k) => k * passo) }
}

function GraficoMovimento({ mov, metrica }) {
  const [foco, setFoco] = useState(null)
  const ehTicket = metrica === 'ticket'
  const fmtEixo = (v) => (ehTicket ? `R$ ${numero(v)}` : mov.contagem ? numero(v) : decimal(v, v % 1 ? 1 : 0))
  const fmtValor = (v) => (v == null ? 'sem pedidos' : ehTicket ? moeda(v) : mov.contagem ? String(v) : decimal(v, 1))
  const valores = mov.series.flatMap((s) => s.pontos.map((x) => valorPonto(mov, x, metrica))).filter((v) => v != null)
  const { topo, marcas } = escalaY(Math.max(...valores))
  const L = 700
  const A = 240
  const xDe = (i) => ((i + 0.5) / DIAS.length) * L
  const yDe = (v) => A - (v / topo) * A
  // Linha com quebra onde não há valor (ticket sem pedidos)
  const caminho = (s) => s.pontos.reduce((d, x, i) => {
    const v = valorPonto(mov, x, metrica)
    if (v == null) return d
    const anterior = i > 0 && valorPonto(mov, s.pontos[i - 1], metrica) != null
    return `${d}${anterior ? 'L' : 'M'}${xDe(i).toFixed(1)},${yDe(v).toFixed(1)}`
  }, '')
  // Rótulo direto no fim de cada linha, afastado quando dois ficam muito perto
  const finais = mov.series
    .map((s) => ({ s, v: valorPonto(mov, s.pontos[DIAS.length - 1], metrica) }))
    .filter((f) => f.v != null)
    .map((f) => ({ ...f, y: yDe(f.v) }))
    .sort((a, b) => a.y - b.y)
  finais.forEach((f, i) => { if (i > 0 && f.y - finais[i - 1].y < 18) f.y = finais[i - 1].y + 18 })
  const rotuloDia = (i) => {
    const partes = mov.series.map((s) => {
      const x = s.pontos[i]
      const v = valorPonto(mov, x, metrica)
      return `${s.periodo.nome}: ${ehTicket ? (v == null ? 'sem pedidos' : `${moeda(v)} em ${plural(x.soma, 'pedido', 'pedidos')}`) : formatarPedidos(mov, v)}${!ehTicket && x.baixa ? ', abaixo do normal' : ''}`
    })
    return `${DIAS[i].nome}. ${partes.join('. ')}`
  }

  return (
    <figure className="precos-grafico">
      <div className="precos-grafico__corpo">
        <div className="precos-grafico__eixo-y" aria-hidden>
          {marcas.map((m) => <span key={m} className="numero" style={{ bottom: `${(m / topo) * 100}%` }}>{fmtEixo(m)}</span>)}
        </div>
        <div className="precos-grafico__area" onMouseLeave={() => setFoco(null)}>
          <svg viewBox={`0 0 ${L} ${A}`} preserveAspectRatio="none" className="precos-grafico__svg" aria-hidden>
            {marcas.map((m) => <line key={m} x1={0} x2={L} y1={yDe(m)} y2={yDe(m)} className={m === 0 ? 'precos-grafico__base' : 'precos-grafico__grade'} />)}
            {foco != null && <line x1={xDe(foco)} x2={xDe(foco)} y1={0} y2={A} className="precos-grafico__mira" />}
            {mov.series.map((s) => <path key={s.periodo.id} d={caminho(s)} stroke={s.periodo.cor} className="precos-grafico__linha" />)}
          </svg>
          {/* Pontos em HTML para ficarem redondos com o SVG esticado */}
          {mov.series.map((s) => s.pontos.map((x, i) => {
            const v = valorPonto(mov, x, metrica)
            if (v == null) return null
            const baixa = !ehTicket && x.baixa
            return (
              <span
                key={`${s.periodo.id}-${x.dia.id}`}
                aria-hidden
                className={`precos-grafico__ponto ${baixa ? 'precos-grafico__ponto--baixa' : ''} ${foco === i ? 'precos-grafico__ponto--foco' : ''}`}
                style={{ left: `${((i + 0.5) / DIAS.length) * 100}%`, top: `${(yDe(v) / A) * 100}%`, '--cor': s.periodo.cor }}
              />
            )
          }))}
          {finais.map((f) => (
            <span key={f.s.periodo.id} className="precos-grafico__fim" style={{ top: `${(f.y / A) * 100}%` }} aria-hidden>{f.s.periodo.nome}</span>
          ))}
          <div className="precos-grafico__alvos">
            {DIAS.map((d, i) => (
              <button
                key={d.id}
                type="button"
                className="precos-grafico__alvo"
                aria-label={rotuloDia(i)}
                onMouseEnter={() => setFoco(i)}
                onFocus={() => setFoco(i)}
                onBlur={() => setFoco(null)}
              />
            ))}
          </div>
          {foco != null && (
            <div className={`precos-grafico__dica ${foco >= 4 ? 'precos-grafico__dica--esquerda' : ''}`} style={{ left: `${((foco + 0.5) / DIAS.length) * 100}%` }} role="presentation">
              <p className="precos-grafico__dica-dia">{DIAS[foco].nome}</p>
              <ul>
                {mov.series.map((s) => {
                  const x = s.pontos[foco]
                  return (
                    <li key={s.periodo.id}>
                      <span className="precos-grafico__amostra" style={{ '--cor': s.periodo.cor }} aria-hidden />
                      <span>{s.periodo.nome}</span>
                      <strong className="numero">{fmtValor(valorPonto(mov, x, metrica))}</strong>
                      {ehTicket && x.soma > 0 && <span className="precos-grafico__dica-n">{plural(x.soma, 'pedido', 'pedidos')}</span>}
                      {!ehTicket && x.baixa && <span className="precos-grafico__dica-n">abaixo do normal</span>}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
      <div className="precos-grafico__eixo-x" aria-hidden>
        {DIAS.map((d) => <span key={d.id}>{d.curto}</span>)}
      </div>
    </figure>
  )
}

function MovimentoPorPeriodo({ mov }) {
  const [forma, setForma] = useState('grafico')
  const [metrica, setMetrica] = useState('pedidos')
  const idForma = useId()
  const idMetrica = useId()
  const { cenarioId, emRede, lojasVisiveis } = usePrototipo()
  const ehTicket = metrica === 'ticket'
  const fechados = periodosFechados(cenarioId)
  const valorTabela = (x) => {
    const v = valorPonto(mov, x, metrica)
    if (v == null) return '—'
    return ehTicket ? moeda(v) : mov.contagem ? String(v) : decimal(v, 1)
  }
  const unidade = ehTicket ? `ticket médio por pedido, nas últimas ${SEMANAS} semanas` : mov.contagem ? `pedidos nas últimas ${SEMANAS} semanas` : `pedidos por dia, em média, nas últimas ${SEMANAS} semanas`

  return (
    <>
      <div className="precos__mapa-topo">
        <p className="precos__media">
          <span className="rotulo-kpi">{ehTicket ? 'Ticket médio' : mov.contagem ? 'Pedidos' : 'Média'} {emRede ? 'da rede' : 'da loja'}</span>
          <span className="numero precos__media-valor">{ehTicket ? moeda(mov.ticket) : mov.contagem ? numero(mov.total) : decimal(mov.porDia, 1)}</span>
          <span className="precos__media-unidade">{unidade}</span>
        </p>
        <div className="precos__controles">
          <div className="seletor-periodo" role="group" aria-labelledby={idMetrica}>
            <span id={idMetrica} className="visualmente-oculto">Métrica</span>
            {METRICAS.map(([v, r]) => (
              <button key={v} type="button" className="seletor-periodo__opcao" aria-pressed={metrica === v} onClick={() => setMetrica(v)}>{r}</button>
            ))}
          </div>
          <div className="seletor-periodo" role="group" aria-labelledby={idForma}>
            <span id={idForma} className="visualmente-oculto">Ver o movimento como</span>
            <button type="button" className="seletor-periodo__opcao" aria-pressed={forma === 'grafico'} onClick={() => setForma('grafico')}>Gráfico</button>
            <button type="button" className="seletor-periodo__opcao" aria-pressed={forma === 'tabela'} onClick={() => setForma('tabela')}>Tabela</button>
          </div>
        </div>
      </div>

      <div className="precos__leitura" role="note">
        <span className="rotulo-kpi">Leitura automática</span>
        <p>{leituraDoMovimento(mov, metrica)}</p>
      </div>

      <ul className="precos-legenda" aria-label="Períodos">
        {mov.series.map((s) => (
          <li key={s.periodo.id}>
            <span className="precos-grafico__amostra" style={{ '--cor': s.periodo.cor }} aria-hidden />
            <span className="precos-legenda__titulo">{s.periodo.nome}</span>
            <span className="numero">{descreverPeriodo(s.periodo)}</span>
          </li>
        ))}
        {!ehTicket && forma === 'grafico' && (
          <li className="precos-legenda__baixa">
            <span className="precos-grafico__ponto precos-grafico__ponto--baixa precos-grafico__ponto--legenda" aria-hidden />
            Abaixo de {Math.round(LIMIAR_BAIXA * 100)}% da média do período
          </li>
        )}
      </ul>

      {forma === 'grafico' ? (
        <GraficoMovimento mov={mov} metrica={metrica} />
      ) : (
        <div className="tabela-rolagem">
          <table className="tabela tabela--compacta precos__tabela-mapa">
            <caption className="visualmente-oculto">{ehTicket ? 'Ticket médio' : mov.contagem ? 'Pedidos' : 'Média de pedidos por dia'} nas últimas {SEMANAS} semanas, por dia da semana e período</caption>
            <thead>
              <tr>
                <th scope="col">Dia</th>
                {mov.series.map((s) => <th key={s.periodo.id} scope="col" className="tabela__num">{s.periodo.nome} <span className="tabela__secundario numero">{descreverPeriodo(s.periodo)}</span></th>)}
              </tr>
            </thead>
            <tbody>
              {DIAS.map((d, i) => (
                <tr key={d.id}>
                  <th scope="row">{d.nome}</th>
                  {mov.series.map((s) => {
                    const x = s.pontos[i]
                    const baixa = !ehTicket && x.baixa
                    return (
                      <td key={s.periodo.id} className={`tabela__num ${baixa ? 'precos__tabela-baixa' : ''}`}>
                        <span className="numero">{valorTabela(x)}</span>
                        {baixa && <span className="precos__tabela-marca"> baixa</span>}
                        {ehTicket && x.soma > 0 && <span className="precos__tabela-marca numero"> ({x.soma})</span>}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="bloco__nota">
        {emRede ? `Soma das ${lojasVisiveis.length} lojas. Cada loja tem os seus dias de baixa: escolha uma loja para ver o movimento dela. ` : ''}
        {ehTicket
          ? `Faturamento dividido pelo número de pedidos válidos em cada dia e período.${mov.contagem ? ' Com poucos pedidos por ponto, o ticket oscila muito; olhe o número de pedidos ao lado.' : ''}`
          : mov.contagem ? `Pedidos válidos em cada dia e período, somando as últimas ${SEMANAS} semanas. Com pouco volume, contagem diz mais que média.` : `Média de pedidos válidos por dia em cada período, nas últimas ${SEMANAS} semanas.`}
        {fechados.length > 0 && ` ${listar(fechados.map((p) => p.nome))}: fora do horário de funcionamento.`}
      </p>
    </>
  )
}

function EsqueletoMapa() {
  return (
    <Carregando oQue="o movimento da loja">
      <Esqueleto linhas={1} altura="280px" />
    </Carregando>
  )
}

// ---------- Tela: movimento e lista de regras ----------
export function PrecosPorHorario() {
  const { cen, cenarioId, emRede, lojaId, estadoForcado, avisar } = usePrototipo()
  const navegar = useNavigate()
  const celular = useEhCelular()
  const [regras, setRegrasLocal] = useState(() => regrasDoCenario(cenarioId))
  const [mudando, setMudando] = useState(null)
  const [excluir, setExcluir] = useState(null)
  const [excluindo, setExcluindo] = useState(false)
  const [tentouMapa, setTentouMapa] = useState(false)
  const [tentouRegras, setTentouRegras] = useState(false)
  useTitulo('Promoções automáticas')

  const setRegras = (fn) => setRegrasLocal((r) => {
    const n = fn(r)
    guardarRegras(cenarioId, n)
    return n
  })
  const mov = useMemo(() => movimento(cen, lojaId, emRede), [cen, lojaId, emRede])
  // Numa loja da rede, só as regras que valem nela
  const daLoja = regras.filter((r) => !cen.rede || emRede || r.lojas === 'todas' || r.lojas.includes(lojaId))
  const lista = estadoForcado === 'vazio' ? [] : daLoja

  const alternar = (r) => {
    setMudando(r.id)
    setTimeout(() => {
      const novo = r.estado === 'pausada' ? (r.inicio > AGORA_REFERENCIA ? 'agendada' : 'ativa') : 'pausada'
      setRegras((l) => l.map((x) => (x.id === r.id ? { ...x, estado: novo } : x)))
      setMudando(null)
      avisar(novo === 'pausada' ? `Regra "${r.nome}" pausada. O cliente volta a ver o preço normal.` : `Regra "${r.nome}" retomada.`, 'sucesso')
    }, 600)
  }
  const confirmarExcluir = () => {
    setExcluindo(true)
    setTimeout(() => {
      setRegras((l) => l.filter((x) => x.id !== excluir.id))
      avisar(`Regra "${excluir.nome}" excluída.`, 'sucesso')
      setExcluindo(false)
      setExcluir(null)
    }, 700)
  }

  const Acoes = ({ r }) => (
    <div className="precos__acoes">
      <Botao variante="texto" tamanho="p" onClick={() => navegar(`/promocoes-automaticas/nova?editar=${r.id}`)} aria-label={`Editar ${r.nome}`}>Editar</Botao>
      <Botao variante="texto" tamanho="p" mudaAlgo carregando={mudando === r.id} onClick={() => alternar(r)} aria-label={`${r.estado === 'pausada' ? 'Retomar' : 'Pausar'} ${r.nome}`}>
        {r.estado === 'pausada' ? 'Retomar' : 'Pausar'}
      </Botao>
      <Botao variante="texto" tamanho="p" className="precos__excluir" onClick={() => setExcluir(r)} aria-label={`Excluir ${r.nome}`}>Excluir</Botao>
    </div>
  )

  // Bloco do mapa
  let mapa
  if (estadoForcado === 'carregando') mapa = <EsqueletoMapa />
  else if (estadoForcado === 'erro' && !tentouMapa) mapa = <EstadoErro oQue="o movimento da loja" aoTentar={() => setTentouMapa(true)} compacto />
  else if (!mov) {
    mapa = (
      <EstadoVazio
        compacto
        titulo={TEXTO_LOJA_NOVA}
        texto="O gráfico aparece sozinho quando a loja completar 4 semanas de pedidos. Enquanto isso, você pode criar uma regra escolhendo os dias e horários."
        acao={<Botao para="/promocoes-automaticas/nova">Criar regra manualmente</Botao>}
      />
    )
  } else if (estadoForcado === 'vazio') {
    mapa = <EstadoVazio compacto titulo={`Nenhum pedido nas últimas ${SEMANAS} semanas.`} texto="Sem pedidos não dá para saber os horários de baixa. A criação manual de regras continua liberada." />
  } else if (estadoForcado === 'indisponivel') {
    mapa = (
      <div className="precos__indisponivel">
        <Indisponivel motivo={MOTIVO_FORA} />
        <p className="bloco__nota">As regras continuam valendo nos horários escolhidos. Só o gráfico e o resultado ficam sem número.</p>
      </div>
    )
  } else mapa = <MovimentoPorPeriodo mov={mov} />

  // Bloco das regras
  let conteudo
  if (estadoForcado === 'carregando') {
    conteudo = <Carregando oQue="as regras"><div className="tabela-esqueleto">{Array.from({ length: 3 }, (_, i) => <Esqueleto key={i} linhas={1} altura="56px" />)}</div></Carregando>
  } else if (estadoForcado === 'erro' && !tentouRegras) {
    conteudo = <EstadoErro oQue="as regras de preço por horário" aoTentar={() => setTentouRegras(true)} />
  } else if (!lista.length) {
    conteudo = (
      <EstadoVazio
        titulo="Nenhuma regra de preço por horário ainda."
        texto={mov && estadoForcado !== 'vazio' ? 'Crie uma regra para dar desconto automático nos horários de baixa.' : 'Escolha os dias, os horários e o desconto. O cliente vê o preço riscado só nesses horários.'}
        acao={<Botao variante="principal" icone={Plus} para="/promocoes-automaticas/nova">Criar regra</Botao>}
      />
    )
  } else if (celular) {
    conteudo = (
      <ul className="precos__cartoes">
        {lista.map((r) => (
          <li key={r.id} className="precos__cartao">
            <div className="precos__cartao-topo">
              <span className="precos__nome">{r.nome}</span>
              <Selo tom={ESTADOS[r.estado].tom}>{ESTADOS[r.estado].rotulo}</Selo>
            </div>
            <dl className="precos__cartao-dados">
              <div><dt>Quando</dt><dd>{descreverQuando(r)}</dd></div>
              <div><dt>Desconto</dt><dd className="numero">{r.desconto}%</dd></div>
              <div><dt>Em quê</dt><dd>{descreverAlvo(r.alvo)}</dd></div>
              {cen.rede && emRede && <div><dt>Lojas</dt><dd><Lojas regra={r} /></dd></div>}
              <div><dt>Resultado</dt><dd><Resultado regra={r} /></dd></div>
            </dl>
            <Acoes r={r} />
          </li>
        ))}
      </ul>
    )
  } else {
    conteudo = (
      <div className="tabela-rolagem">
        <table className="tabela tabela--compacta">
          <caption className="visualmente-oculto">Regras de preço por horário</caption>
          <thead>
            <tr>
              <th scope="col">Regra</th>
              <th scope="col">Quando vale</th>
              <th scope="col" className="tabela__num">Desconto</th>
              <th scope="col">Em quê</th>
              {cen.rede && emRede && <th scope="col">Lojas</th>}
              <th scope="col">Estado</th>
              <th scope="col">Resultado nos horários da regra</th>
              <th scope="col">Ações</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((r) => (
              <tr key={r.id}>
                <th scope="row"><span className="tabela__principal precos__nome">{r.nome}</span></th>
                <td>{descreverQuando(r)}</td>
                <td className="tabela__num numero">{r.desconto}%</td>
                <td className="precos__alvo">{descreverAlvo(r.alvo)}</td>
                {cen.rede && emRede && <td><Lojas regra={r} /></td>}
                <td>
                  <Selo tom={ESTADOS[r.estado].tom}>{ESTADOS[r.estado].rotulo}</Selo>
                  {r.estado === 'agendada' && <span className="tabela__secundario">A partir de {diaMes(r.inicio)}</span>}
                </td>
                <td className="precos__col-resultado"><Resultado regra={r} /></td>
                <td><Acoes r={r} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="pagina precos">
      <CabecalhoPagina
        titulo="Promoções automáticas"
        descricao="Desconto automático nos horários de baixa, calculado a partir do histórico de pedidos."
        acoes={<Botao variante="principal" icone={Plus} para="/promocoes-automaticas/nova">Criar regra</Botao>}
      />

      <section className="bloco" aria-labelledby="precos-mapa-titulo">
        <div className="bloco__cabecalho">
          <h2 id="precos-mapa-titulo">Movimento {emRede ? 'da rede' : 'da loja'}</h2>
          <span className="bloco__sub">Por dia da semana e período, últimas {SEMANAS} semanas</span>
        </div>
        {mapa}
      </section>

      <section className="bloco" aria-labelledby="precos-regras-titulo">
        <div className="bloco__cabecalho">
          <h2 id="precos-regras-titulo">Regras</h2>
          {lista.length > 0 && estadoForcado === 'normal' && <span className="bloco__sub">{plural(lista.filter((r) => r.estado === 'ativa').length, 'ativa', 'ativas')} de {numero(lista.length)}</span>}
        </div>
        {conteudo}
        {lista.length > 0 && !['carregando', 'erro'].includes(estadoForcado) && (
          <p className="bloco__nota">Resultado: pedidos válidos nos dias e horários da regra, contra o mesmo número de semanas antes de ela começar. Aparece depois de 2 semanas valendo.</p>
        )}
      </section>

      <Confirmacao
        aberto={!!excluir}
        aoFechar={() => setExcluir(null)}
        titulo={`Excluir a regra "${excluir?.nome}"?`}
        texto="O desconto para de valer na hora e o cliente volta a ver o preço normal. Para só suspender por um tempo, use Pausar."
        rotuloConfirmar="Excluir regra"
        destrutivo
        carregando={excluindo}
        aoConfirmar={confirmarExcluir}
      />
    </div>
  )
}

// ---------- Assistente: criar ou editar regra ----------
const PASSOS = { quando: 'Quando', desconto: 'Desconto', emque: 'Em quê', resumo: 'Resumo' }
const ORDEM = ['quando', 'desconto', 'emque', 'resumo']
const MODOS = [['todo', 'Cardápio todo'], ['categorias', 'Categorias'], ['produtos', 'Produtos'], ['exceto', 'Tudo, exceto…']]
const TIPOS_CHAVE = { categoria: 'Categoria', produto: 'Produto', loja: '' }
const normalizar = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const precoComDesconto = (preco, d) => Math.round(preco * (1 - d / 100) * 100) / 100
const descontoNum = (s) => Number(String(s).replace(',', '.'))

// Opções de horário a cada 30 min dentro do funcionamento
function horariosDoCenario(cenarioId) {
  const { de, ate } = funcionamentoDoCenario(cenarioId)
  const lista = []
  for (let m = de; m <= ate; m += 30) lista.push(deMinutos(m))
  return lista
}

function produtoExemplo(cardapio, modo, itens) {
  if (!cardapio) return null
  const cat = (id) => cardapio.categorias.find((c) => c.id === id)?.nome
  const temCat = (p) => itens.includes(`categoria:${cat(p.categoria)}`)
  const temProd = (p) => itens.includes(`produto:${p.nome}`)
  return cardapio.produtos.find((p) => {
    if (p.preco == null) return false
    if (modo === 'categorias') return !itens.length || temCat(p)
    if (modo === 'produtos') return !itens.length || temProd(p)
    if (modo === 'exceto') return !temCat(p) && !temProd(p)
    return true
  }) || null
}

// Combobox com fichas: digita, anda com as setas, escolhe com Enter
function SeletorComBusca({ rotulo, ajuda, erro, opcoes, escolhidos, aoMudar, placeholder = 'Digite para buscar' }) {
  const id = useId()
  const entrada = useRef(null)
  const [termo, setTermo] = useState('')
  const [aberto, setAberto] = useState(false)
  const [ativo, setAtivo] = useState(0)
  const t = normalizar(termo.trim())
  const sugestoes = opcoes.filter((o) => !escolhidos.includes(o.chave) && (!t || normalizar(`${o.nome} ${o.detalhe || ''}`).includes(t))).slice(0, 8)
  const indice = Math.min(ativo, sugestoes.length - 1)
  const mostrar = aberto && sugestoes.length > 0
  const descricao = (ch) => opcoes.find((o) => o.chave === ch) || { chave: ch, nome: nomeDaChave(ch), tipo: TIPOS_CHAVE[ch.split(':')[0]] }

  const escolher = (o) => {
    aoMudar([...escolhidos, o.chave])
    setTermo('')
    setAtivo(0)
  }
  const remover = (ch) => {
    aoMudar(escolhidos.filter((x) => x !== ch))
    entrada.current?.focus()
  }
  const teclar = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!aberto) setAberto(true)
      else setAtivo((i) => Math.min(i + 1, sugestoes.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setAtivo((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (mostrar && sugestoes[indice]) escolher(sugestoes[indice])
    } else if (e.key === 'Escape') {
      if (aberto) {
        e.preventDefault()
        e.stopPropagation()
        setAberto(false)
      } else setTermo('')
    } else if (e.key === 'Backspace' && !termo && escolhidos.length) {
      remover(escolhidos[escolhidos.length - 1])
    }
  }

  const idLista = `${id}-lista`
  const idAjuda = `${id}-ajuda`
  const idErro = `${id}-erro`
  return (
    <div className={`campo precos-novo__seletor ${erro ? 'campo--erro' : ''}`}>
      <label htmlFor={id} className="campo__rotulo">{rotulo}</label>
      {escolhidos.length > 0 && (
        <ul className="precos-novo__fichas" aria-label={`${rotulo}: ${plural(escolhidos.length, 'escolhido', 'escolhidos')}`}>
          {escolhidos.map((ch) => {
            const o = descricao(ch)
            return (
              <li key={ch} className="precos-novo__ficha">
                {o.tipo && <span className="precos-novo__ficha-tipo">{o.tipo}</span>}
                <span>{o.nome}</span>
                <button type="button" className="precos-novo__ficha-remover" onClick={() => remover(ch)} aria-label={`Remover ${o.tipo ? `${o.tipo.toLowerCase()} ` : ''}${o.nome}`}>
                  <X size={14} aria-hidden />
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <div className="precos-novo__combo">
        <Search size={16} aria-hidden className="precos-novo__combo-icone" />
        <input
          ref={entrada}
          id={id}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={mostrar}
          aria-controls={idLista}
          aria-activedescendant={mostrar ? `${id}-op-${indice}` : undefined}
          aria-describedby={[ajuda && idAjuda, erro && idErro].filter(Boolean).join(' ') || undefined}
          aria-invalid={erro ? true : undefined}
          className="campo__entrada precos-novo__combo-entrada"
          placeholder={placeholder}
          value={termo}
          onChange={(e) => { setTermo(e.target.value); setAberto(true); setAtivo(0) }}
          onFocus={() => setAberto(true)}
          onBlur={() => setAberto(false)}
          onClick={() => setAberto(true)}
          onKeyDown={teclar}
        />
        <ul id={idLista} role="listbox" aria-label={rotulo} className="precos-novo__sugestoes" hidden={!mostrar}>
          {mostrar && sugestoes.map((o, i) => (
            <li
              key={o.chave}
              id={`${id}-op-${i}`}
              role="option"
              aria-selected={i === indice}
              className={`precos-novo__sugestao ${i === indice ? 'precos-novo__sugestao--ativa' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onMouseMove={() => setAtivo(i)}
              onClick={() => escolher(o)}
            >
              <span>{o.nome}</span>
              <span className="precos-novo__sugestao-tipo">{[o.tipo, o.detalhe].filter(Boolean).join(' · ')}</span>
            </li>
          ))}
        </ul>
        {aberto && !sugestoes.length && (
          <p className="precos-novo__sugestao-vazia">{t ? `Nada com "${termo.trim()}".` : 'Tudo já foi escolhido.'}</p>
        )}
      </div>
      <p className="visualmente-oculto" aria-live="polite">{aberto && t ? (sugestoes.length ? plural(sugestoes.length, 'sugestão', 'sugestões') : 'Nenhuma sugestão') : ''}</p>
      {ajuda && <p id={idAjuda} className="campo__ajuda">{ajuda}</p>}
      {erro && <p id={idErro} className="campo__erro"><AlertTriangle size={14} aria-hidden /> {erro}</p>}
    </div>
  )
}

// Prévia: como o cliente vê o produto com o preço riscado
function PreviaCliente({ f, exemplo }) {
  const { cen } = usePrototipo()
  const d = descontoNum(f.desconto)
  const valido = d >= 5 && d <= 50
  const completas = f.faixas.filter((x) => x.de && x.ate)
  const faixa = completas[0]
  const quando = f.dias.length && faixa ? descreverQuando({ dias: f.dias, faixas: completas }) : null
  return (
    <aside className="precos-novo__previa" aria-label="Prévia de como o cliente vê o produto">
      <p className="precos-novo__previa-rotulo">Como o cliente vê no app e no cardápio web</p>
      <div className="precos-novo__app">
        <p className="precos-novo__app-marca">{cen.marca.nome}</p>
        {exemplo ? (
          <div className="precos-novo__produto">
            <p className="precos-novo__produto-nome">{exemplo.nome}</p>
            <p className="precos-novo__precos">
              {valido ? (
                <>
                  <s className="numero precos-novo__preco-antigo"><span className="visualmente-oculto">Preço normal: </span>{moeda(exemplo.preco)}</s>
                  <strong className="numero precos-novo__preco-novo"><span className="visualmente-oculto">Preço agora: </span>{moeda(precoComDesconto(exemplo.preco, d))}</strong>
                </>
              ) : (
                <strong className="numero precos-novo__preco-novo">{moeda(exemplo.preco)}</strong>
              )}
            </p>
            {valido && (
              <span className="precos-novo__etiqueta">
                <span className="numero">−{d}%</span>{faixa ? ` até as ${rotuloMinutos(paraMinutos(faixa.ate))}` : ''}
              </span>
            )}
          </div>
        ) : (
          <p className="texto-secundario">Escolha em quê vale o desconto para ver a prévia.</p>
        )}
      </div>
      <p className="precos-novo__previa-legenda">
        {quando ? `Preço riscado só em: ${quando.charAt(0).toLowerCase()}${quando.slice(1)}.` : 'Escolha os dias e horários para ver quando o preço aparece riscado.'}
        {exemplo && ` Fora desses horários, o cliente vê ${moeda(exemplo.preco)}.`}
      </p>
    </aside>
  )
}

function formularioInicial(regra, { emRede, lojaId, rede }) {
  if (regra) {
    return {
      nome: regra.nome, dias: [...regra.dias], faixas: regra.faixas.map((x) => ({ ...x })), desconto: String(regra.desconto),
      modo: regra.alvo.modo, itens: [...regra.alvo.itens], lojas: regra.lojas === 'todas' ? 'todas' : [...regra.lojas],
    }
  }
  return { nome: '', dias: [], faixas: [{ de: '', ate: '' }], desconto: '15', modo: 'todo', itens: [], lojas: !rede || emRede ? 'todas' : [lojaId] }
}

const sobrepoe = (a, b) => paraMinutos(a.de) < paraMinutos(b.ate) && paraMinutos(b.de) < paraMinutos(a.ate)

export function CriarPrecoHorario() {
  const { cen, cenarioId, emRede, lojaId, lojasVisiveis, cardapio, cardapios, estadoForcado, avisar } = usePrototipo()
  const navegar = useNavigate()
  const celular = useEhCelular()
  const [params] = useSearchParams()
  const idEditar = params.get('editar')
  const regraBase = useMemo(() => (idEditar ? regrasDoCenario(cenarioId).find((r) => r.id === idEditar) : null), [cenarioId, idEditar])
  const [f, setF] = useState(() => formularioInicial(regraBase, { emRede, lojaId, rede: cen.rede }))
  const [passo, setPasso] = useState('quando')
  const [erros, setErros] = useState({})
  const [salvando, setSalvando] = useState(false)
  const [tentou, setTentou] = useState(false)
  const idDias = useId()
  const idModo = useId()
  const idLojas = useId()
  const titulo = regraBase ? `Editar "${regraBase.nome}"` : 'Criar regra de preço por horário'
  useTitulo(regraBase ? 'Editar regra de preço' : 'Criar regra de preço')

  const indice = ORDEM.indexOf(passo)
  const mudar = (novos) => setF((x) => ({ ...x, ...novos }))
  const mov = useMemo(() => movimento(cen, lojaId, emRede), [cen, lojaId, emRede])
  const sugestao = estadoForcado === 'vazio' ? null : sugestaoDeHorario(mov)
  const horarios = useMemo(() => horariosDoCenario(cenarioId), [cenarioId])
  const cardapioRef = cardapio || cardapios[cen.lojaPadrao] || Object.values(cardapios)[0]
  const exemplo = produtoExemplo(cardapioRef, f.modo, f.itens)

  const opcoesCardapio = useMemo(() => {
    if (!cardapioRef) return []
    const nomeCat = (id) => cardapioRef.categorias.find((c) => c.id === id)?.nome || ''
    return [
      ...cardapioRef.categorias.map((c) => ({
        chave: `categoria:${c.nome}`, nome: c.nome, tipo: 'Categoria',
        detalhe: plural(cardapioRef.produtos.filter((p) => p.categoria === c.id).length, 'produto', 'produtos'),
      })),
      ...cardapioRef.produtos.map((p) => ({ chave: `produto:${p.nome}`, nome: p.nome, tipo: 'Produto', detalhe: [nomeCat(p.categoria), p.preco != null ? moeda(p.preco) : 'sem preço'].join(' · ') })),
    ]
  }, [cardapioRef])
  const opcoesModo = f.modo === 'categorias' ? opcoesCardapio.filter((o) => o.tipo === 'Categoria') : f.modo === 'produtos' ? opcoesCardapio.filter((o) => o.tipo === 'Produto') : opcoesCardapio
  const opcoesLojas = lojasVisiveis.map((l) => ({ chave: `loja:${l.id}`, nome: l.nome, detalhe: l.cidade }))

  const trocarModo = (modo) => {
    const filtro = modo === 'categorias' ? 'categoria:' : modo === 'produtos' ? 'produto:' : ''
    mudar({ modo, itens: modo === 'todo' ? [] : f.itens.filter((ch) => ch.startsWith(filtro)) })
  }
  const usarSugestao = () => {
    mudar({ dias: sugestao.dias, faixas: sugestao.faixas.map((x) => ({ ...x })) })
    setErros({})
  }
  const periodos = useMemo(() => periodosDoCenario(cenarioId).map((p) => ({ ...p, faixa: { de: deMinutos(p.de), ate: deMinutos(p.ate) } })), [cenarioId])
  const temPeriodo = (p) => f.faixas.some((x) => x.de === p.faixa.de && x.ate === p.faixa.ate)
  // Liga e desliga um período inteiro como faixa; faixas vazias dão lugar a ele
  const alternarPeriodo = (p) => {
    const cheias = f.faixas.filter((x) => x.de || x.ate)
    const novas = temPeriodo(p) ? cheias.filter((x) => !(x.de === p.faixa.de && x.ate === p.faixa.ate)) : [...cheias, { ...p.faixa }]
    mudar({ faixas: novas.length ? novas.sort((a, b) => paraMinutos(a.de || '0:0') - paraMinutos(b.de || '0:0')) : [{ de: '', ate: '' }] })
    setErros({})
  }
  const mudarFaixa = (i, campo, valor) => mudar({ faixas: f.faixas.map((x, j) => (j === i ? { ...x, [campo]: valor } : x)) })

  const validar = (p) => {
    const e = {}
    if (p === 'quando') {
      if (!f.dias.length) e.dias = 'Escolha ao menos um dia.'
      f.faixas.forEach((x, i) => {
        if (!x.de || !x.ate) e[`faixa${i}`] = 'Preencha o início e o fim da faixa.'
        else if (paraMinutos(x.ate) <= paraMinutos(x.de)) e[`faixa${i}`] = 'O fim precisa ser depois do início.'
      })
      const completas = f.faixas.filter((x) => x.de && x.ate)
      if (completas.some((a, i) => completas.some((b, j) => j > i && sobrepoe(a, b)))) e.faixas = 'As faixas se sobrepõem. Junte as duas numa faixa só.'
    }
    if (p === 'desconto') {
      const d = descontoNum(f.desconto)
      if (!f.desconto || !Number.isInteger(d) || d < 5 || d > 50) e.desconto = 'Escolha um desconto inteiro entre 5% e 50%.'
    }
    if (p === 'emque') {
      if (f.modo !== 'todo' && !f.itens.length) {
        e.itens = f.modo === 'exceto' ? 'Escolha o que fica de fora, ou volte para "Cardápio todo".' : f.modo === 'categorias' ? 'Escolha ao menos uma categoria.' : 'Escolha ao menos um produto.'
      }
      if (cen.rede && Array.isArray(f.lojas) && !f.lojas.length) e.lojas = 'Escolha ao menos uma loja.'
    }
    if (p === 'resumo') {
      if (!f.nome.trim()) e.nome = 'Dê um nome para achar a regra na lista.'
      else if (f.nome.trim().length > 40) e.nome = 'Use até 40 caracteres.'
    }
    setErros(e)
    return !Object.keys(e).length
  }
  const nomeSugerido = () => {
    const faixa = f.faixas[0]
    return `${f.desconto}% ${descreverDias(f.dias).toLowerCase()}${faixa?.de ? `, ${rotuloMinutos(paraMinutos(faixa.de))}` : ''}`.slice(0, 40)
  }
  const irPara = (p) => {
    setErros({})
    if (p === 'resumo' && !f.nome) mudar({ nome: nomeSugerido() })
    setPasso(p)
  }
  const avancar = () => {
    if (validar(passo)) irPara(ORDEM[indice + 1])
  }

  // Outras regras ativas ou agendadas que cruzam com esta nos mesmos dias e horários
  const conflitos = useMemo(() => {
    const outras = regrasDoCenario(cenarioId).filter((r) => r.id !== regraBase?.id && r.estado !== 'pausada')
    const faixas = f.faixas.filter((x) => x.de && x.ate)
    return outras.filter((r) => r.dias.some((d) => f.dias.includes(d)) && r.faixas.some((a) => faixas.some((b) => sobrepoe(a, b))))
  }, [cenarioId, regraBase, f.dias, f.faixas])

  const salvar = () => {
    for (const p of ORDEM) {
      if (!validar(p)) {
        setPasso(p)
        return
      }
    }
    setSalvando(true)
    setTimeout(() => {
      const nova = {
        id: regraBase?.id || `r-${Date.now()}`,
        nome: f.nome.trim(),
        dias: DIAS.map((d) => d.id).filter((d) => f.dias.includes(d)),
        faixas: [...f.faixas].sort((a, b) => paraMinutos(a.de) - paraMinutos(b.de)),
        desconto: descontoNum(f.desconto),
        alvo: { modo: f.modo, itens: f.modo === 'todo' ? [] : f.itens },
        lojas: f.lojas,
        estado: regraBase?.estado === 'pausada' ? 'pausada' : regraBase?.estado || 'ativa',
        inicio: regraBase?.inicio || AGORA_REFERENCIA,
        resultado: regraBase?.resultado || null,
      }
      const atuais = regrasDoCenario(cenarioId)
      guardarRegras(cenarioId, regraBase ? atuais.map((r) => (r.id === regraBase.id ? nova : r)) : [...atuais, nova])
      setSalvando(false)
      avisar(regraBase ? `Regra "${nova.nome}" salva.` : `Regra "${nova.nome}" ativada. O desconto vale ${descreverQuando(nova).replace(/^./, (c) => c.toLowerCase())}.`, 'sucesso')
      navegar('/promocoes-automaticas')
    }, 800)
  }

  if (estadoForcado === 'carregando') {
    return (
      <div className="pagina precos-novo">
        <CabecalhoPagina titulo={titulo} />
        <Carregando oQue="o formulário da regra"><Esqueleto linhas={6} altura="44px" /></Carregando>
      </div>
    )
  }
  if (estadoForcado === 'erro' && !tentou) {
    return (
      <div className="pagina precos-novo">
        <CabecalhoPagina titulo={titulo} />
        <EstadoErro oQue="o formulário da regra" aoTentar={() => setTentou(true)} />
      </div>
    )
  }

  const d = descontoNum(f.desconto)
  const linhasResumo = [
    { rotulo: 'Quando', valor: f.dias.length ? descreverQuando({ dias: f.dias, faixas: f.faixas.filter((x) => x.de && x.ate) }) : '—', passo: 'quando' },
    { rotulo: 'Desconto', valor: `${f.desconto}%`, passo: 'desconto', numero: true },
    { rotulo: 'Em quê', valor: descreverAlvo({ modo: f.modo, itens: f.itens }), passo: 'emque' },
    ...(cen.rede ? [{
      rotulo: 'Lojas',
      valor: f.lojas === 'todas' ? `Todas as ${lojasVisiveis.length} lojas` : listar(f.lojas.map((id) => lojasVisiveis.find((l) => l.id === id)?.nome).filter(Boolean)),
      passo: 'emque',
    }] : []),
  ]

  return (
    <div className="pagina precos-novo">
      <CabecalhoPagina
        titulo={titulo}
        descricao="Escolha quando, quanto e em quê. O desconto liga e desliga sozinho nos horários escolhidos."
      />
      {celular && <FaixaAviso icone={Monitor}>Criar regra funciona melhor no computador. Dá para criar aqui; a prévia fica no fim da tela.</FaixaAviso>}
      {idEditar && !regraBase && <FaixaAviso tom="atencao">A regra que você quis editar não foi encontrada. Você está criando uma regra nova.</FaixaAviso>}

      <ol className="precos-novo__passos" aria-label="Etapas">
        {ORDEM.map((p, i) => (
          <li key={p} className={`precos-novo__passo ${i < indice ? 'precos-novo__passo--feito' : ''}`} aria-current={p === passo ? 'step' : undefined}>
            <span className="precos-novo__passo-n numero" aria-hidden>{i + 1}</span> {PASSOS[p]}
          </li>
        ))}
      </ol>

      <div className="precos-novo__grade">
        <form className="bloco formulario precos-novo__form" onSubmit={(e) => { e.preventDefault(); passo === 'resumo' ? salvar() : avancar() }} noValidate>
          <h2 className="precos-novo__titulo-passo">{indice + 1}. {PASSOS[passo]}</h2>

          {passo === 'quando' && (
            <>
              <div className="precos-novo__sugestao-horario">
                {estadoForcado === 'indisponivel' ? (
                  <>
                    <p className="campo__rotulo">Horários sugeridos</p>
                    <Indisponivel motivo={MOTIVO_FORA} />
                  </>
                ) : sugestao ? (
                  <>
                    <p>
                      <strong>Sugestão pelos seus horários de baixa:</strong> {descreverDias(sugestao.dias)}, {sugestao.periodo.nome.toLowerCase()} ({descreverFaixa(sugestao.faixas[0])}), {sugestao.contagem ? <>com <span className="numero">{sugestao.pedidos}</span> {sugestao.pedidos === 1 ? 'pedido' : 'pedidos'} em {SEMANAS} semanas.</> : <>com <span className="numero">{decimal(sugestao.valor, 1)}</span> {sugestao.valor < 2 ? 'pedido' : 'pedidos'} por dia em média.</>}
                    </p>
                    <Botao onClick={usarSugestao}>Usar horários sugeridos</Botao>
                  </>
                ) : (
                  <p className="texto-secundario">{mov ? `Nenhum pedido nas últimas ${SEMANAS} semanas, então não há sugestão.` : TEXTO_LOJA_NOVA} Escolha os dias e horários abaixo.</p>
                )}
              </div>

              <fieldset className="precos-novo__grupo">
                <legend className="campo__rotulo" id={idDias}>Dias da semana</legend>
                <div className="precos-novo__dias" role="group" aria-labelledby={idDias} aria-describedby={erros.dias ? `${idDias}-erro` : undefined}>
                  {DIAS.map((dia) => (
                    <button
                      key={dia.id}
                      type="button"
                      className="precos-novo__dia"
                      aria-pressed={f.dias.includes(dia.id)}
                      onClick={() => mudar({ dias: f.dias.includes(dia.id) ? f.dias.filter((x) => x !== dia.id) : [...f.dias, dia.id] })}
                    >
                      {dia.nome}
                    </button>
                  ))}
                </div>
                {erros.dias && <p id={`${idDias}-erro`} className="campo__erro"><AlertTriangle size={14} aria-hidden /> {erros.dias}</p>}
              </fieldset>

              <fieldset className="precos-novo__grupo">
                <legend className="campo__rotulo">Horários</legend>
                <p className="campo__ajuda">Escolha um período ou ajuste o horário exato. Dentro do funcionamento da loja: {rotuloMinutos(paraMinutos(horarios[0]))} às {rotuloMinutos(paraMinutos(horarios[horarios.length - 1]))}.</p>
                <div className="precos-novo__periodos" role="group" aria-label="Períodos">
                  {periodos.map((p) => (
                    <button key={p.id} type="button" className="precos-novo__dia" aria-pressed={temPeriodo(p)} onClick={() => alternarPeriodo(p)}>
                      {p.nome} <span className="numero precos-novo__periodo-hora">{descreverPeriodo(p)}</span>
                    </button>
                  ))}
                </div>
                {f.faixas.map((x, i) => (
                  <div key={i} className="precos-novo__faixa">
                    <Campo rotulo={f.faixas.length > 1 ? `Início da faixa ${i + 1}` : 'Início'} erro={erros[`faixa${i}`]}>
                      {(p) => (
                        <select {...p} className="campo__entrada numero" value={x.de} onChange={(e) => mudarFaixa(i, 'de', e.target.value)}>
                          <option value="">Escolha</option>
                          {horarios.slice(0, -1).map((h) => <option key={h} value={h}>{h}</option>)}
                        </select>
                      )}
                    </Campo>
                    <Campo rotulo={f.faixas.length > 1 ? `Fim da faixa ${i + 1}` : 'Fim'}>
                      {(p) => (
                        <select {...p} className="campo__entrada numero" value={x.ate} onChange={(e) => mudarFaixa(i, 'ate', e.target.value)}>
                          <option value="">Escolha</option>
                          {horarios.slice(1).map((h) => <option key={h} value={h}>{h}</option>)}
                        </select>
                      )}
                    </Campo>
                    {f.faixas.length > 1 && (
                      <Botao variante="texto" tamanho="p" className="precos-novo__remover" onClick={() => mudar({ faixas: f.faixas.filter((_, j) => j !== i) })} aria-label={`Remover faixa ${i + 1}`}>
                        Remover
                      </Botao>
                    )}
                  </div>
                ))}
                {erros.faixas && <p className="campo__erro"><AlertTriangle size={14} aria-hidden /> {erros.faixas}</p>}
                {f.faixas.length < 5 && (
                  <Botao variante="texto" icone={Plus} className="precos-novo__adicionar" onClick={() => mudar({ faixas: [...f.faixas, { de: '', ate: '' }] })}>Adicionar outra faixa</Botao>
                )}
              </fieldset>
            </>
          )}

          {passo === 'desconto' && (
            <>
              <Campo rotulo="Desconto (%)" erro={erros.desconto} ajuda="De 5% a 50%, sobre o preço de cada produto. Não vale na taxa de entrega.">
                {(p) => (
                  <div className="precos-novo__desconto">
                    <input {...p} type="number" min={5} max={50} step={1} inputMode="numeric" className="campo__entrada numero precos-novo__curto" value={f.desconto} onChange={(e) => mudar({ desconto: e.target.value })} />
                    <div className="seletor-periodo" role="group" aria-label="Descontos comuns">
                      {[10, 15, 20, 30].map((v) => (
                        <button key={v} type="button" className="seletor-periodo__opcao numero" aria-pressed={d === v} onClick={() => mudar({ desconto: String(v) })}>{v}%</button>
                      ))}
                    </div>
                  </div>
                )}
              </Campo>
              <div className="precos-novo__exemplo" aria-live="polite">
                <span className="rotulo-kpi">Exemplo</span>
                {exemplo && d >= 5 && d <= 50 ? (
                  <p>
                    {exemplo.nome}: <span className="numero">{moeda(exemplo.preco)}</span> <span aria-hidden>→</span><span className="visualmente-oculto">passa para</span> <strong className="numero">{moeda(precoComDesconto(exemplo.preco, d))}</strong>
                  </p>
                ) : (
                  <p className="texto-secundario">{exemplo ? 'Escolha um desconto entre 5% e 50% para ver o exemplo.' : 'Nenhum produto com preço cadastrado para o exemplo.'}</p>
                )}
              </div>
            </>
          )}

          {passo === 'emque' && (
            <>
              <fieldset className="precos-novo__grupo">
                <legend className="campo__rotulo" id={idModo}>Em quê vale o desconto</legend>
                <div className="seletor-periodo precos-novo__modos" role="group" aria-labelledby={idModo}>
                  {MODOS.map(([v, r]) => (
                    <button key={v} type="button" className="seletor-periodo__opcao" aria-pressed={f.modo === v} onClick={() => trocarModo(v)}>{r}</button>
                  ))}
                </div>
                {f.modo === 'todo' ? (
                  <p className="campo__ajuda">O desconto vale em todos os produtos com preço cadastrado.</p>
                ) : (
                  <SeletorComBusca
                    rotulo={f.modo === 'categorias' ? 'Categorias com desconto' : f.modo === 'produtos' ? 'Produtos com desconto' : 'Fica de fora'}
                    ajuda={f.modo === 'exceto' ? 'O desconto vale no cardápio todo, menos nestes itens.' : 'Busque pelo nome no seu cardápio.'}
                    erro={erros.itens}
                    placeholder={f.modo === 'categorias' ? 'Busque uma categoria' : f.modo === 'produtos' ? 'Busque um produto' : 'Busque um produto ou categoria'}
                    opcoes={opcoesModo}
                    escolhidos={f.itens}
                    aoMudar={(itens) => mudar({ itens })}
                  />
                )}
              </fieldset>

              {cen.rede && (
                <fieldset className="precos-novo__grupo">
                  <legend className="campo__rotulo" id={idLojas}>Lojas</legend>
                  <div className="seletor-periodo" role="group" aria-labelledby={idLojas}>
                    <button type="button" className="seletor-periodo__opcao" aria-pressed={f.lojas === 'todas'} onClick={() => mudar({ lojas: 'todas' })}>Todas as {lojasVisiveis.length} lojas</button>
                    <button type="button" className="seletor-periodo__opcao" aria-pressed={f.lojas !== 'todas'} onClick={() => f.lojas === 'todas' && mudar({ lojas: emRede ? [] : [lojaId] })}>Só algumas</button>
                  </div>
                  {Array.isArray(f.lojas) && (
                    <SeletorComBusca
                      rotulo="Lojas onde a regra vale"
                      placeholder="Busque pelo nome ou cidade"
                      ajuda="Cada loja usa o próprio horário de funcionamento."
                      erro={erros.lojas}
                      opcoes={opcoesLojas}
                      escolhidos={f.lojas.map((id) => `loja:${id}`)}
                      aoMudar={(chaves) => mudar({ lojas: chaves.map((c) => Number(nomeDaChave(c))) })}
                    />
                  )}
                </fieldset>
              )}
            </>
          )}

          {passo === 'resumo' && (
            <>
              <Campo rotulo="Nome da regra" erro={erros.nome} ajuda="Só você vê. Ex.: Tarde do pastel.">
                {(p) => <input {...p} className="campo__entrada" maxLength={60} value={f.nome} onChange={(e) => mudar({ nome: e.target.value })} />}
              </Campo>
              <dl className="precos-novo__resumo">
                {linhasResumo.map((l) => (
                  <div key={l.rotulo}>
                    <dt>{l.rotulo}</dt>
                    <dd className={l.numero ? 'numero' : undefined}>{l.valor}</dd>
                    <dd className="precos-novo__alterar">
                      <button type="button" className="link" onClick={() => irPara(l.passo)} aria-label={`Alterar ${l.rotulo.toLowerCase()}`}>Alterar</button>
                    </dd>
                  </div>
                ))}
              </dl>
              <FaixaAviso>O cliente vê o preço riscado no app e no cardápio web só nesses horários. Fora deles, vale o preço normal.</FaixaAviso>
              {conflitos.length > 0 && (
                <FaixaAviso tom="atencao" icone={AlertTriangle}>
                  Esta regra cruza com {listar(conflitos.map((r) => `"${r.nome}"`))} em alguns horários. Quando duas regras valem no mesmo produto, o cliente vê só o maior desconto.
                </FaixaAviso>
              )}
            </>
          )}

          <div className="precos-novo__navegacao">
            {indice > 0 ? <Botao onClick={() => irPara(ORDEM[indice - 1])}>Voltar</Botao> : <Botao variante="texto" para="/promocoes-automaticas">Cancelar</Botao>}
            {passo === 'resumo' ? (
              <Botao variante="principal" type="submit" mudaAlgo carregando={salvando}>{regraBase ? 'Salvar alterações' : 'Ativar'}</Botao>
            ) : (
              <Botao variante="principal" type="submit">Continuar</Botao>
            )}
          </div>
        </form>
        <PreviaCliente f={f} exemplo={exemplo} />
      </div>
    </div>
  )
}
