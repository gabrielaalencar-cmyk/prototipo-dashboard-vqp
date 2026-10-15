// T18. Fidelidade, programa (uma face só: pontos ou cashback). T19. Regras e prêmios, com prévia no app.
import { useState } from 'react'
import { ArrowLeft, ImageIcon, Plus } from 'lucide-react'
import { usePrototipo } from '../../contexto/Prototipo.jsx'
import { useEhCelular, useTitulo } from '../../utilitarios/ganchos.js'
import { decimal, moeda, numero, plural } from '../../utilitarios/formatos.js'
import {
  Botao, Campo, Carregando, CabecalhoPagina, EstadoErro, EstadoVazio, Esqueleto, FaixaAviso, Indisponivel, Interruptor, Selo,
} from '../../componentes/base.jsx'
import {
  FIDELIDADE_CASHBACK, FIDELIDADE_PONTOS, LIMIAR_PERCENTUAL, PERIODOS_FIDELIDADE, PROGRAMA_CASHBACK, PROGRAMA_PONTOS,
  fidelidadeCashbackNoPeriodo, fidelidadePontosNoPeriodo,
} from '../../dados/vendas.js'
import { CelularPrevia } from './Campanhas.jsx'
import '../../estilos/vendas.css'

const MOTIVO_FORA_DO_AR = 'A fonte deste dado está fora do ar desde 18:10.'
const MOTIVO_SEM_ORIGEM = 'Este número ainda não é medido.'

function Numero({ rotulo, valor, detalhe, indisp, motivo }) {
  return (
    <li className="kpi">
      <span className="kpi__rotulo">{rotulo}</span>
      {indisp ? <Indisponivel motivo={motivo} /> : <span className="kpi__valor">{valor}</span>}
      {!indisp && detalhe && <span className="kpi__variacao">{detalhe}</span>}
    </li>
  )
}

// Participantes: abaixo de 200, só contagens; a partir de 200, contagem e percentual
function Participantes({ d, indisp, tipo }) {
  const comPercentual = d.participantes >= LIMIAR_PERCENTUAL
  const pct = (n) => (comPercentual ? `${decimal((n / d.participantes) * 100)}% dos participantes` : undefined)
  return (
    <section className="bloco" aria-labelledby="titulo-participantes">
      <div className="bloco__cabecalho"><h2 id="titulo-participantes">Participantes</h2></div>
      <ul className="kpis kpis--analise">
        <Numero rotulo="Participantes" valor={numero(d.participantes)} indisp={indisp} motivo={MOTIVO_FORA_DO_AR} />
        <Numero rotulo="Com saldo ativo" valor={numero(d.ativos)} detalhe={pct(d.ativos)} indisp={indisp} motivo={MOTIVO_FORA_DO_AR} />
        <Numero rotulo={tipo === 'pontos' ? 'Pontos a vencer em 30 dias' : 'Saldo a vencer em 30 dias'} valor={numero(d.aVencer)} detalhe={pct(d.aVencer)} indisp={indisp} motivo={MOTIVO_FORA_DO_AR} />
        <Numero rotulo="Expirados" valor={numero(d.expirados)} detalhe={pct(d.expirados)} indisp={indisp} motivo={MOTIVO_FORA_DO_AR} />
      </ul>
      {!comPercentual && !indisp && (
        <p className="bloco__nota">Com menos de {LIMIAR_PERCENTUAL} participantes, mostramos contagens em vez de percentuais, como no Analítico.</p>
      )}
    </section>
  )
}

function Resultado({ r, participantes, indisp, periodo }) {
  return (
    <section className="bloco" aria-labelledby="titulo-resultado">
      <div className="bloco__cabecalho"><h2 id="titulo-resultado">Resultado</h2></div>
      {indisp ? (
        <Indisponivel motivo={MOTIVO_FORA_DO_AR} />
      ) : (
        <div className="tabela-rolagem">
          <table className="tabela tabela--compacta">
            <caption className="visualmente-oculto">Participantes contra não participantes, {periodo.texto}</caption>
            <thead>
              <tr>
                <th scope="col">Medida</th>
                <th scope="col" className="tabela__num">Participantes</th>
                <th scope="col" className="tabela__num">Não participantes</th>
              </tr>
            </thead>
            <tbody>
              <tr><th scope="row">Ticket médio</th><td className="tabela__num">{moeda(r.ticketParticipantes)}</td><td className="tabela__num">{moeda(r.ticketOutros)}</td></tr>
              <tr><th scope="row">Pedidos por mês</th><td className="tabela__num">{decimal(r.frequenciaParticipantes)}</td><td className="tabela__num">{decimal(r.frequenciaOutros)}</td></tr>
            </tbody>
          </table>
        </div>
      )}
      {!indisp && (
        <p className="bloco__nota">
          Quem participa gasta {moeda(r.ticketParticipantes - r.ticketOutros)} a mais por pedido e pede {decimal(r.frequenciaParticipantes - r.frequenciaOutros)} vez a mais por mês.
          {participantes < LIMIAR_PERCENTUAL ? ` Com ${participantes} participantes, a comparação ainda é indicativa.` : ''}
        </p>
      )}
    </section>
  )
}

function SeletorPeriodo({ periodo, aoMudar }) {
  return (
    <section className="bloco bloco--periodo fidelidade__periodo" aria-labelledby="titulo-periodo">
      <header className="bloco__cabecalho bloco__cabecalho--periodo">
        <div>
          <h2 id="titulo-periodo">Período</h2>
          <p className="bloco__sub">{periodo.texto}, comparado com {periodo.comparacao}</p>
        </div>
        <div className="seletor-periodo" role="group" aria-label="Período">
          {PERIODOS_FIDELIDADE.map((a) => (
            <button key={a.id} type="button" aria-pressed={periodo.id === a.id} className="seletor-periodo__opcao" onClick={() => aoMudar(a.id)}>
              {a.rotulo}
            </button>
          ))}
        </div>
      </header>
      <p className="fidelidade__foto">Saldo e participantes: situação de hoje.</p>
    </section>
  )
}

function OQueFazer({ itens }) {
  return (
    <section className="bloco" aria-labelledby="titulo-fazer">
      <div className="bloco__cabecalho"><h2 id="titulo-fazer">Avisos e oportunidades</h2></div>
      <ul className="lista-acoes">
        {itens.map((i) => (
          <li key={i.texto} className="item-acao">
            <div className="item-acao__sinal"><Selo tom="neutro" ponto={false}>{i.tipo}</Selo></div>
            <p className="item-acao__motivo"><strong>{i.texto}.</strong> {i.motivo}</p>
            <div className="item-acao__acoes"><Botao tamanho="p" para={i.para}>Avisar</Botao></div>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function Fidelidade() {
  const { cen, emRede, estadoForcado, pode } = usePrototipo()
  const [tentou, setTentou] = useState(false)
  const [periodoId, setPeriodoId] = useState('este-mes')
  useTitulo('Fidelidade')
  const periodo = PERIODOS_FIDELIDADE.find((p) => p.id === periodoId)
  const tipo = cen.fidelidade.tipo
  const indisp = estadoForcado === 'indisponivel'

  if (!tipo) {
    return (
      <div className="pagina">
        <CabecalhoPagina titulo="Fidelidade" />
        <EstadoVazio
          titulo="Você ainda não tem programa de fidelidade."
          texto="Com um programa de pontos ou de cashback, o cliente ganha a cada pedido e tem motivo para voltar."
          acao={pode('fidelidade') && <Botao variante="principal" para="/fidelidade/regras">Criar programa</Botao>}
        />
      </div>
    )
  }

  const acoes = (
    <>
      <Botao variante="principal" para={`/campanhas/nova?modelo=pontos`}>Avisar clientes</Botao>
      <Botao para="/fidelidade/regras">Regras e prêmios</Botao>
      <Botao variante="texto" para={`/analise/fidelidade?periodo=${periodo.analise}`}>Ver análise completa</Botao>
    </>
  )
  const descricao = tipo === 'pontos'
    ? `Programa de pontos: ${PROGRAMA_PONTOS.pontosPorReal} ponto por real gasto.`
    : `Programa de cashback: ${PROGRAMA_CASHBACK.percentual}% sobre o total, validade de ${PROGRAMA_CASHBACK.validadeDias} dias.`

  let corpo
  if (estadoForcado === 'carregando') {
    corpo = (
      <Carregando oQue="o programa de fidelidade">
        <div className="fidelidade__grade">
          <div className="bloco"><Esqueleto linhas={3} altura="28px" /></div>
          <div className="bloco"><Esqueleto linhas={3} altura="28px" /></div>
        </div>
      </Carregando>
    )
  } else if (estadoForcado === 'erro' && !tentou) {
    corpo = <EstadoErro oQue="o programa de fidelidade" aoTentar={() => setTentou(true)} />
  } else if (estadoForcado === 'vazio') {
    corpo = <EstadoVazio titulo="O programa ainda não tem participantes." texto="Os números aparecem quando o primeiro cliente ganhar saldo num pedido." />
  } else if (tipo === 'pontos') {
    const d = FIDELIDADE_PONTOS
    const p = fidelidadePontosNoPeriodo(periodoId)
    corpo = (
      <>
        <OQueFazer
          itens={[
            { tipo: 'Pontos vencendo', texto: `${plural(d.aVencer, 'cliente', 'clientes')} com pontos vencendo`, motivo: 'Os pontos vencem nos próximos 30 dias.', para: '/campanhas/nova?modelo=pontos' },
            { tipo: 'Perto do prêmio', texto: `${plural(d.umResgate, 'cliente', 'clientes')} a um resgate do prêmio`, motivo: 'Faltam até 30 pontos para o Pastel grátis.', para: '/campanhas/nova?segmento=perto-premio' },
          ]}
        />
        <Participantes d={d} indisp={indisp} tipo="pontos" />
        <div className="fidelidade__grade">
          <section className="bloco" aria-labelledby="titulo-resgates">
            <div className="bloco__cabecalho"><h2 id="titulo-resgates">Resgates e adesões</h2></div>
            <ul className="kpis kpis--analise fidelidade__kpis-3">
              <Numero rotulo="Resgates no período" valor={numero(p.resgates)} indisp={indisp} motivo={MOTIVO_FORA_DO_AR} />
              <Numero rotulo="Custo dos prêmios resgatados" valor={moeda(p.custoResgates)} detalhe="Pelo preço do cardápio" indisp={indisp} motivo={MOTIVO_FORA_DO_AR} />
              <Numero rotulo="Novos participantes no período" valor={numero(p.novos)} indisp={indisp} motivo={MOTIVO_FORA_DO_AR} />
            </ul>
            <h3 className="fidelidade__subtitulo">Prêmios mais resgatados</h3>
            <ol className="ranking">
              {p.premiosResgatados.map((x) => <li key={x.nome}><span>{x.nome} ({PROGRAMA_PONTOS.premios[0].pontos} pontos)</span><strong>{indisp ? 'Indisponível' : plural(x.resgates, 'resgate', 'resgates')}</strong></li>)}
            </ol>
          </section>
          <Resultado r={p.resultado} participantes={d.participantes} indisp={indisp} periodo={periodo} />
        </div>
      </>
    )
  } else {
    const d = emRede ? FIDELIDADE_CASHBACK.rede : FIDELIDADE_CASHBACK.loja
    const p = fidelidadeCashbackNoPeriodo(periodoId, emRede)
    corpo = (
      <>
        <OQueFazer
          itens={[
            { tipo: 'Cashback vencendo', texto: `${plural(d.aVencer, 'cliente', 'clientes')} com cashback vencendo`, motivo: 'O saldo vence nos próximos 30 dias.', para: '/campanhas/nova?modelo=pontos' },
          ]}
        />
        <section className="bloco" aria-labelledby="titulo-cashback">
          <div className="bloco__cabecalho"><h2 id="titulo-cashback">Cashback</h2></div>
          <ul className="kpis kpis--analise fidelidade__kpis-4">
            <Numero rotulo="Cashback gerado no período" indisp motivo={MOTIVO_SEM_ORIGEM} />
            <Numero rotulo="Cashback usado no período" indisp motivo={MOTIVO_SEM_ORIGEM} />
            <Numero rotulo="Novos participantes no período" valor={numero(p.novos)} indisp={indisp} motivo={MOTIVO_FORA_DO_AR} />
            <Numero rotulo="Saldo em aberto hoje (o que a loja deve aos clientes)" indisp motivo={MOTIVO_SEM_ORIGEM} />
          </ul>
          <p className="bloco__nota">Gerado, usado e saldo em aberto ainda não têm origem no Analítico, em nenhum período. A gestão do programa continua funcionando: regras, saldo de cada cliente e avisos.</p>
          <h3 className="fidelidade__subtitulo">Produtos que mais geram cashback</h3>
          <p className="texto-secundario">Não se aplica: o cashback vale sobre o total do pedido, não sobre produtos escolhidos.</p>
        </section>
        <Participantes d={d} indisp={indisp} tipo="cashback" />
        <Resultado r={p.resultado} participantes={d.participantes} indisp={indisp} periodo={periodo} />
      </>
    )
  }

  return (
    <div className="pagina fidelidade">
      <CabecalhoPagina titulo="Fidelidade" descricao={descricao} acoes={acoes} />
      <div className="fidelidade__conteudo">
        {estadoForcado !== 'vazio' && <SeletorPeriodo periodo={periodo} aoMudar={setPeriodoId} />}
        {corpo}
      </div>
    </div>
  )
}

// ---------- T19. Regras e prêmios ----------
export function RegrasFidelidade() {
  const { cen, cardapio, emRede, avisar, estadoForcado } = usePrototipo()
  const celular = useEhCelular()
  const tipoAtual = cen.fidelidade.tipo
  const [tipo, setTipo] = useState(tipoAtual || 'pontos')
  const [pontos, setPontos] = useState(() => ({ ...PROGRAMA_PONTOS, premios: PROGRAMA_PONTOS.premios.map((p) => ({ ...p })) }))
  const [cash, setCash] = useState(() => ({ ...PROGRAMA_CASHBACK }))
  const [salvando, setSalvando] = useState(false)
  const [erros, setErros] = useState({})
  const [tentou, setTentou] = useState(false)
  useTitulo('Regras e prêmios')

  const mudarPremio = (id, campos) => setPontos((p) => ({ ...p, premios: p.premios.map((x) => (x.id === id ? { ...x, ...campos } : x)) }))
  const adicionarPremio = () => setPontos((p) => ({ ...p, premios: [...p.premios, { id: `novo-${Date.now()}`, nome: '', pontos: '', ativo: false }] }))

  const salvar = () => {
    const e = {}
    if (tipo === 'pontos') {
      if (!Number(pontos.pontosPorReal)) e.pontosPorReal = 'Informe quantos pontos o cliente ganha por real.'
      pontos.premios.forEach((p) => {
        if (p.ativo && (!p.nome.trim() || !Number(p.pontos))) e[`premio-${p.id}`] = 'Prêmio ativo precisa de nome e de pontos.'
      })
    } else {
      const v = Number(String(cash.percentual).replace(',', '.'))
      if (!v || v > 50) e.percentual = 'Informe um percentual entre 1% e 50%.'
      if (cash.ondeVale === 'produtos' && !cash.produtos.length) e.produtos = 'Escolha ao menos um produto.'
    }
    setErros(e)
    if (Object.keys(e).length) return
    setSalvando(true)
    setTimeout(() => {
      setSalvando(false)
      avisar(tipoAtual ? 'Regras salvas. Valem a partir do próximo pedido.' : 'Programa criado. Ele aparece no app a partir do próximo pedido.', 'sucesso')
    }, 800)
  }

  if (estadoForcado === 'carregando') {
    return (
      <div className="pagina">
        <CabecalhoPagina titulo="Regras e prêmios" />
        <Carregando oQue="as regras do programa"><Esqueleto linhas={5} altura="44px" /></Carregando>
      </div>
    )
  }
  if (estadoForcado === 'erro' && !tentou) {
    return (
      <div className="pagina">
        <CabecalhoPagina titulo="Regras e prêmios" />
        <EstadoErro oQue="as regras do programa" aoTentar={() => setTentou(true)} />
      </div>
    )
  }

  const premioPrincipal = pontos.premios.find((p) => p.ativo && p.nome && Number(p.pontos)) || null
  const saldoExemplo = 120
  const previa = (
    <CelularPrevia rotulo="Prévia de como o cliente vê o programa no app">
      <div className="regras-fidelidade__app">
        <p className="campanhas-previa__app">{cen.marca.nome}</p>
        {tipo === 'pontos' ? (
          <>
            <p className="regras-fidelidade__saldo">{numero(saldoExemplo)} pontos</p>
            {premioPrincipal ? (
              <>
                <div className="regras-fidelidade__barra" aria-hidden>
                  <span style={{ width: `${Math.min(100, (saldoExemplo / Number(premioPrincipal.pontos)) * 100)}%` }} />
                </div>
                <p>{saldoExemplo >= premioPrincipal.pontos ? `Você já pode resgatar: ${premioPrincipal.nome}` : `Faltam ${numero(premioPrincipal.pontos - saldoExemplo)} pontos para ${premioPrincipal.nome}`}</p>
              </>
            ) : (
              <p className="texto-secundario">Nenhum prêmio ativo.</p>
            )}
            <p className="regras-fidelidade__regra">Ganhe {plural(Number(pontos.pontosPorReal) || 0, 'ponto', 'pontos')} a cada R$ 1,00. Os pontos valem por {pontos.validadeDias} dias.</p>
          </>
        ) : (
          <>
            <p className="regras-fidelidade__saldo">{moeda(12.4)}</p>
            <p>de cashback para usar no próximo pedido</p>
            <p className="regras-fidelidade__regra">
              Ganhe {cash.percentual}% de volta {cash.ondeVale === 'total' ? 'em todo pedido' : 'nos produtos marcados'}. Use a partir de {moeda(Number(cash.minimoUso) || 0)} em até {cash.validadeDias} dias.
            </p>
          </>
        )}
      </div>
    </CelularPrevia>
  )

  const produtos = cardapio?.produtos || []

  return (
    <div className="pagina regras-fidelidade">
      <Botao variante="texto" icone={ArrowLeft} para="/fidelidade" className="botao--voltar">Fidelidade</Botao>
      <CabecalhoPagina titulo={tipoAtual ? 'Regras e prêmios' : 'Criar programa de fidelidade'} />
      <FaixaAviso tom="info">
        A confirmar onde é configurado hoje: se for no Portal Administrativo, esta tela recebe o selo de proposta de migração.
      </FaixaAviso>

      <div className="campanha-nova__grade">
        <div className="regras-fidelidade__formulario">
          {!tipoAtual && (
            <fieldset className="bloco campanha-nova__grupo">
              <legend className="regras-fidelidade__legenda">Como o cliente ganha</legend>
              <ul className="campanha-nova__opcoes">
                {[['pontos', 'Pontos', 'Junta pontos e troca por prêmios.'], ['cashback', 'Cashback', 'Recebe parte do valor de volta para usar no próximo pedido.']].map(([v, t, d]) => (
                  <li key={v}>
                    <label className={`campanha-nova__opcao ${tipo === v ? 'campanha-nova__opcao--escolhida' : ''}`}>
                      <input type="radio" name="mecanica" value={v} checked={tipo === v} onChange={() => setTipo(v)} />
                      <span className="campanha-nova__opcao-textos">
                        <span className="campanha-nova__opcao-titulo">{t}</span>
                        <span className="campanha-nova__opcao-detalhe">{d}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              <p className="texto-secundario">Cada loja tem uma mecânica só.</p>
            </fieldset>
          )}

          {tipo === 'pontos' ? (
            <>
              <section className="bloco" aria-labelledby="titulo-pontos">
                <div className="bloco__cabecalho"><h2 id="titulo-pontos">Pontos</h2></div>
                <div className="formulario regras-fidelidade__linha">
                  <Campo rotulo="Pontos por real gasto" erro={erros.pontosPorReal}>
                    {(props) => <input {...props} className="campo__entrada" inputMode="numeric" value={pontos.pontosPorReal} onChange={(e) => setPontos((p) => ({ ...p, pontosPorReal: e.target.value.replace(/\D/g, '') }))} />}
                  </Campo>
                  <Campo rotulo="Validade dos pontos">
                    {(props) => (
                      <select {...props} className="campo__entrada" value={pontos.validadeDias} onChange={(e) => setPontos((p) => ({ ...p, validadeDias: Number(e.target.value) }))}>
                        {[90, 180, 365].map((d) => <option key={d} value={d}>{d} dias</option>)}
                      </select>
                    )}
                  </Campo>
                </div>
              </section>
              <section className="bloco" aria-labelledby="titulo-premios">
                <div className="bloco__cabecalho">
                  <h2 id="titulo-premios">Prêmios</h2>
                  <Botao tamanho="p" icone={Plus} onClick={adicionarPremio}>Adicionar prêmio</Botao>
                </div>
                <ul className="regras-fidelidade__premios">
                  {pontos.premios.map((p, i) => (
                    <li key={p.id}>
                      <span className="produto__foto" aria-hidden><ImageIcon size={18} /></span>
                      <div className="regras-fidelidade__premio-campos">
                        <Campo rotulo={`Nome do prêmio ${i + 1}`} erro={erros[`premio-${p.id}`]}>
                          {(props) => <input {...props} className="campo__entrada" value={p.nome} onChange={(e) => mudarPremio(p.id, { nome: e.target.value })} />}
                        </Campo>
                        <Campo rotulo="Pontos necessários">
                          {(props) => <input {...props} className="campo__entrada" inputMode="numeric" value={p.pontos} onChange={(e) => mudarPremio(p.id, { pontos: e.target.value.replace(/\D/g, '') })} />}
                        </Campo>
                      </div>
                      <div className="regras-fidelidade__premio-acoes">
                        <Interruptor ligado={p.ativo} aoMudar={(v) => mudarPremio(p.id, { ativo: v })} rotulo={`Prêmio ${p.nome || i + 1} ativo`} rotuloVisivel="Ativo" />
                        <Botao variante="texto" tamanho="p" onClick={() => avisar('No protótipo, a foto não é enviada.')} aria-label={`Trocar foto de ${p.nome || `prêmio ${i + 1}`}`}>Trocar foto</Botao>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          ) : (
            <section className="bloco" aria-labelledby="titulo-cash">
              <div className="bloco__cabecalho"><h2 id="titulo-cash">Cashback</h2></div>
              <div className="formulario">
                <div className="regras-fidelidade__linha">
                  <Campo rotulo="Percentual de volta" erro={erros.percentual}>
                    {(props) => (
                      <div className="campo__prefixo">
                        <input {...props} className="campo__entrada" inputMode="decimal" value={cash.percentual} onChange={(e) => setCash((c) => ({ ...c, percentual: e.target.value.replace(/[^\d,]/g, '') }))} />
                        <span aria-hidden>%</span>
                      </div>
                    )}
                  </Campo>
                  <Campo rotulo="Validade do saldo">
                    {(props) => (
                      <select {...props} className="campo__entrada" value={cash.validadeDias} onChange={(e) => setCash((c) => ({ ...c, validadeDias: Number(e.target.value) }))}>
                        {[30, 60, 90, 180].map((d) => <option key={d} value={d}>{d} dias</option>)}
                      </select>
                    )}
                  </Campo>
                  <Campo rotulo="Valor mínimo do pedido para usar">
                    {(props) => (
                      <div className="campo__prefixo">
                        <span aria-hidden>R$</span>
                        <input {...props} className="campo__entrada" inputMode="decimal" value={cash.minimoUso} onChange={(e) => setCash((c) => ({ ...c, minimoUso: e.target.value.replace(/[^\d,]/g, '') }))} />
                      </div>
                    )}
                  </Campo>
                </div>
                <fieldset className="campanha-nova__grupo">
                  <legend className="campo__rotulo">Onde vale</legend>
                  <ul className="campanha-nova__opcoes">
                    {[['total', 'Sobre o total do pedido'], ['produtos', 'Só em produtos escolhidos do cardápio']].map(([v, t]) => (
                      <li key={v}>
                        <label className={`campanha-nova__opcao ${cash.ondeVale === v ? 'campanha-nova__opcao--escolhida' : ''}`}>
                          <input type="radio" name="onde-vale" value={v} checked={cash.ondeVale === v} onChange={() => setCash((c) => ({ ...c, ondeVale: v }))} />
                          <span className="campanha-nova__opcao-titulo">{t}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </fieldset>
                {cash.ondeVale === 'produtos' && (
                  emRede || !produtos.length ? (
                    <p className="texto-secundario">Escolha uma loja no seletor para marcar os produtos do cardápio dela.</p>
                  ) : (
                    <fieldset className="campanha-nova__grupo">
                      <legend className="campo__rotulo">Produtos que dão cashback</legend>
                      <ul className="regras-fidelidade__produtos">
                        {produtos.map((p) => (
                          <li key={p.id}>
                            <label>
                              <input
                                type="checkbox"
                                className="caixa"
                                checked={cash.produtos.includes(p.id)}
                                onChange={(e) => setCash((c) => ({ ...c, produtos: e.target.checked ? [...c.produtos, p.id] : c.produtos.filter((x) => x !== p.id) }))}
                              />
                              {p.nome}
                            </label>
                          </li>
                        ))}
                      </ul>
                      {erros.produtos && <p className="campo__erro">{erros.produtos}</p>}
                    </fieldset>
                  )
                )}
              </div>
            </section>
          )}

          <div className="campanha-nova__navegacao">
            <Botao para="/fidelidade">Cancelar</Botao>
            <Botao variante="principal" onClick={salvar} carregando={salvando} mudaAlgo>{tipoAtual ? 'Salvar regras' : 'Criar programa'}</Botao>
          </div>
        </div>
        {!celular && <div className="campanha-nova__lado">{previa}</div>}
      </div>
      {celular && <div className="campanha-nova__previa-celular">{previa}</div>}
    </div>
  )
}
