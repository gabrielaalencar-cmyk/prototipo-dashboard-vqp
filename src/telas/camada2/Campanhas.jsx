// T15. Campanhas, lista e modelos. T16. Criar campanha (assistente em 4 etapas com prévia). T17. Automações.
import { forwardRef, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Check, Copy, Pause, Play, Plus } from 'lucide-react'
import { usePrototipo } from '../../contexto/Prototipo.jsx'
import { useEhCelular, useTitulo } from '../../utilitarios/ganchos.js'
import { dataCurta, diaMes, hora, numero, plural } from '../../utilitarios/formatos.js'
import {
  Abas, Botao, Campo, Carregando, CabecalhoPagina, EstadoErro, EstadoVazio, Esqueleto, FaixaAviso, Indisponivel, Selo,
} from '../../componentes/base.jsx'
import {
  AUTOMACOES_REDE, CAMPANHAS_REDE, CONDICOES, GATILHOS, MODELOS_AUTOMACAO, MODELOS_CAMPANHA, MODELOS_WHATSAPP,
  SEGMENTOS_CAMPANHA, modeloPorId, segmentoPorId,
} from '../../dados/vendas.js'
import { useClientes } from './Clientes.jsx'
import '../../estilos/vendas.css'

const MOTIVO_FORA_DO_AR = 'A fonte deste dado está fora do ar desde 18:10.'
const NOME_CANAL = { push: 'Push do app', whatsapp: 'WhatsApp' }
const LIMITE_TITULO = 50
const LIMITE_TEXTO = 150

const trocarNome = (texto, nome) => (texto || '').replaceAll('{primeiro_nome}', nome)

// ---------- Prévia no celular (também usada em Regras e prêmios) ----------
export function CelularPrevia({ rotulo, children }) {
  return (
    <figure className="campanhas-previa" aria-label={rotulo}>
      <div className="campanhas-previa__aparelho">
        <div className="campanhas-previa__barra" aria-hidden><span className="numero">19:42</span></div>
        <div className="campanhas-previa__tela">{children}</div>
      </div>
      <figcaption className="campanhas-previa__legenda">{rotulo}</figcaption>
    </figure>
  )
}

function PreviaMensagem({ canal, titulo, texto, cupom, nome, marca }) {
  const t = trocarNome(texto, nome)
  if (canal === 'whatsapp') {
    return (
      <div className="campanhas-previa__conversa">
        <p className="campanhas-previa__contato">{marca}</p>
        <div className="campanhas-previa__balao">
          {t || <span className="texto-secundario">Escolha um modelo aprovado.</span>}
          {cupom && <span className="campanhas-previa__cupom">Cupom {cupom}</span>}
        </div>
      </div>
    )
  }
  return (
    <div className="campanhas-previa__notificacao">
      <p className="campanhas-previa__app">{marca} · agora</p>
      <p className="campanhas-previa__titulo">{trocarNome(titulo, nome) || 'Título da mensagem'}</p>
      <p>{t || <span className="texto-secundario">Sua mensagem aparece aqui.</span>}</p>
      {cupom && <span className="campanhas-previa__cupom">Cupom {cupom}</span>}
    </div>
  )
}

// ---------- Canais ----------
function Canais() {
  const { cen } = usePrototipo()
  const { push, whatsapp } = cen.canais
  return (
    <section className="bloco campanhas__canais" aria-labelledby="titulo-canais">
      <div className="bloco__cabecalho"><h2 id="titulo-canais">Canais da loja</h2></div>
      {!push && !whatsapp && (
        <FaixaAviso tom="atencao" icone={AlertTriangle}>
          Nenhum canal ativo: para enviar campanhas, o app precisa do push ligado ou de um número de WhatsApp conectado. Quem resolve é o suporte da VocêQpad.
        </FaixaAviso>
      )}
      <ul className="campanhas__lista-canais">
        <li>
          <span className="tabela__principal">Push do app</span>
          {push ? <Selo tom="verde">Ativo</Selo> : <Selo tom="cinza">Desligado</Selo>}
          {!push && <span className="texto-secundario">O push está desligado no app. Fale com o suporte.</span>}
        </li>
        <li>
          <span className="tabela__principal">WhatsApp</span>
          {whatsapp ? <Selo tom="verde">Conectado</Selo> : <Selo tom="cinza">Não conectado</Selo>}
          {!whatsapp && (
            <span className="texto-secundario">Número não conectado. Fale com o suporte. <Link to="/ajuda">Abrir Ajuda</Link></span>
          )}
        </li>
      </ul>
    </section>
  )
}

function AbasCampanhas({ ativa }) {
  return (
    <Abas
      comoLinks
      rotulo="Campanhas"
      ativa={ativa}
      abas={[
        { id: 'enviadas', rotulo: 'Enviadas', para: '/campanhas?aba=enviadas' },
        { id: 'agendadas', rotulo: 'Agendadas', para: '/campanhas?aba=agendadas' },
        { id: 'rascunhos', rotulo: 'Rascunhos', para: '/campanhas?aba=rascunhos' },
        { id: 'automacoes', rotulo: 'Automações', para: '/campanhas/automacoes' },
      ]}
    />
  )
}

// Contagem de quem recebe, já sem quem não aceitou mensagens
function useContagem() {
  const base = useClientes()
  return (segId, clienteId) => {
    if (segId === 'cliente') {
      const c = base.clientes.find((x) => x.id === clienteId)
      if (!c) return { n: 0, total: 0, semConsentimento: 0 }
      return { n: c.consentimento ? 1 : 0, total: 1, semConsentimento: c.consentimento ? 0 : 1, cliente: c }
    }
    return base.contar(segId)
  }
}

function Modelos() {
  const { cen } = usePrototipo()
  const contar = useContagem()
  const cashback = cen.fidelidade.tipo === 'cashback'
  const modelos = MODELOS_CAMPANHA.filter((m) => m.id !== 'pontos' || cen.fidelidade.tipo)
  return (
    <section className="bloco" aria-labelledby="titulo-modelos">
      <div className="bloco__cabecalho">
        <h2 id="titulo-modelos">Modelos por objetivo</h2>
      </div>
      <ul className="campanhas__modelos">
        {modelos.map((m) => {
          const seg = segmentoPorId(m.segmento)
          const { n } = contar(m.segmento)
          const nome = cashback && m.id === 'pontos' ? 'Seu cashback vai vencer' : m.nome
          return (
            <li key={m.id}>
              <div className="campanhas__modelo-textos">
                <span className="tabela__principal">{nome}</span>
                <span className="tabela__secundario">Para {seg.rotulo.toLowerCase()}: <span className="numero">{numero(n)}</span> {n === 1 ? 'cliente' : 'clientes'}</span>
                <span className="campanhas__modelo-exemplo">"{trocarNome(cashback && m.textoCashback ? m.textoCashback : m.texto, 'Mariana')}"</span>
              </div>
              <Botao tamanho="p" para={`/campanhas/nova?modelo=${m.id}`}>Usar modelo</Botao>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function Campanhas() {
  const { cen, cenarioId, estadoForcado } = usePrototipo()
  const [params] = useSearchParams()
  const { state } = useLocation()
  const celular = useEhCelular()
  const [tentou, setTentou] = useState(false)
  useTitulo('Campanhas')
  const aba = ['enviadas', 'agendadas', 'rascunhos'].includes(params.get('aba')) ? params.get('aba') : 'enviadas'

  const todas = useMemo(() => {
    const lista = cenarioId === 'rede' ? CAMPANHAS_REDE : []
    return state?.nova ? [state.nova, ...lista] : lista
  }, [cenarioId, state])
  const estadoAba = { enviadas: 'enviada', agendadas: 'agendada', rascunhos: 'rascunho' }[aba]
  const lista = estadoForcado === 'vazio' ? [] : todas.filter((c) => c.estado === estadoAba)
  const carregando = estadoForcado === 'carregando'
  const erro = estadoForcado === 'erro' && !tentou
  const indisp = estadoForcado === 'indisponivel'
  const semEnvios = lista.length === 0

  const vazio = {
    enviadas: 'Nenhuma campanha enviada nos últimos 30 dias.',
    agendadas: 'Nenhuma campanha agendada.',
    rascunhos: 'Nenhum rascunho.',
  }[aba]

  let conteudo
  if (carregando) {
    conteudo = (
      <Carregando oQue="as campanhas">
        <div className="tabela-esqueleto">{Array.from({ length: 4 }, (_, i) => <Esqueleto key={i} linhas={1} altura="44px" />)}</div>
      </Carregando>
    )
  } else if (erro) {
    conteudo = <EstadoErro oQue="as campanhas" aoTentar={() => setTentou(true)} />
  } else if (semEnvios) {
    conteudo = <EstadoVazio titulo={vazio} texto={aba === 'enviadas' ? 'Comece por um dos modelos abaixo: o texto e o público já vêm prontos.' : undefined} />
  } else if (celular) {
    conteudo = (
      <ul className="cartoes-pedido">
        {lista.map((c) => (
          <li key={c.id} className="cartao-pedido">
            <span className="cartao-pedido__topo">
              <span className="cartao-pedido__numero">{c.nome}</span>
            </span>
            <span className="cartao-pedido__cliente">{NOME_CANAL[c.canal]} · <span className="numero">{dataCurta(c.quando)}</span> · {segmentoPorId(c.segmento)?.rotulo}</span>
            {c.estado === 'enviada' && (
              <span className="cartao-pedido__cliente">
                {indisp ? 'Enviados e entregues: indisponível' : <><span className="numero">{numero(c.enviados)}</span> enviados · <span className="numero">{numero(c.entregues)}</span> entregues</>}
              </span>
            )}
          </li>
        ))}
      </ul>
    )
  } else {
    conteudo = (
      <div className="tabela-rolagem">
        <table className="tabela tabela--compacta">
          <caption className="visualmente-oculto">Campanhas {aba}</caption>
          <thead>
            <tr>
              <th scope="col">Campanha</th>
              <th scope="col">Canal</th>
              <th scope="col">{aba === 'enviadas' ? 'Enviada em' : aba === 'agendadas' ? 'Sai em' : 'Editado em'}</th>
              <th scope="col">Para quem</th>
              {cen.rede && <th scope="col">Lojas</th>}
              {aba === 'enviadas' && (
                <>
                  <th scope="col" className="tabela__num">Enviados</th>
                  <th scope="col" className="tabela__num">Entregues</th>
                  <th scope="col">Pedidos atribuídos</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {lista.map((c) => (
              <tr key={c.id}>
                <td className="tabela__principal">{c.nome}</td>
                <td>{NOME_CANAL[c.canal]}</td>
                <td className="tabela__hora numero">{dataCurta(c.quando)}</td>
                <td>{segmentoPorId(c.segmento)?.rotulo || c.segmentoRotulo}</td>
                {cen.rede && <td>{c.lojas}</td>}
                {aba === 'enviadas' && (
                  <>
                    <td className={`tabela__num ${indisp ? '' : 'numero'}`}>{indisp ? 'Indisponível' : numero(c.enviados)}</td>
                    <td className={`tabela__num ${indisp ? '' : 'numero'}`}>{indisp ? 'Indisponível' : numero(c.entregues)}</td>
                    <td><Indisponivel /></td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="pagina campanhas">
      <CabecalhoPagina
        titulo="Campanhas"
        descricao="Traga clientes de volta e avise novidades pelo app ou pelo WhatsApp."
        acoes={<Botao variante="principal" icone={Plus} para="/campanhas/nova">Criar campanha</Botao>}
      />
      <Canais />
      <AbasCampanhas ativa={aba} />
      <div className="campanhas__conteudo">{conteudo}</div>
      {aba === 'enviadas' && !semEnvios && !carregando && !erro && (
        <p className="nota-pe">Pedidos atribuídos a cada campanha aparecem quando o Analítico passar a medir este número.</p>
      )}
      <Modelos />
    </div>
  )
}

// ---------- T16. Criar campanha ----------
const ETAPAS = ['Para quem', 'Canal', 'Mensagem', 'Quando']

export function CriarCampanha() {
  const { cen, avisar, agora, loja, emRede, estadoForcado } = usePrototipo()
  const [params] = useSearchParams()
  const navegar = useNavigate()
  const celular = useEhCelular()
  const contar = useContagem()
  const base = useClientes()
  const tituloEtapa = useRef(null)
  useTitulo('Criar campanha')

  const clienteId = params.get('cliente')
  const modelo = modeloPorId(params.get('modelo'))
  const cashback = cen.fidelidade.tipo === 'cashback'
  const canaisAtivos = ['push', 'whatsapp'].filter((c) => cen.canais[c])

  const [etapa, setEtapa] = useState(0)
  const [segmento, setSegmento] = useState(() => (clienteId ? 'cliente' : params.get('segmento') && segmentoPorId(params.get('segmento')) ? params.get('segmento') : modelo?.segmento || ''))
  const [canal, setCanal] = useState(canaisAtivos[0] || '')
  const [titulo, setTitulo] = useState(cashback && modelo?.tituloCashback ? modelo.tituloCashback : modelo?.titulo || '')
  const [texto, setTexto] = useState(cashback && modelo?.textoCashback ? modelo.textoCashback : modelo?.texto || '')
  const [modeloWa, setModeloWa] = useState(MODELOS_WHATSAPP[0].id)
  const [cupom, setCupom] = useState('')
  const [quando, setQuando] = useState('agora')
  const [data, setData] = useState('2026-10-10')
  const [horario, setHorario] = useState('18:00')
  const [salvoEm, setSalvoEm] = useState(null)
  const [enviando, setEnviando] = useState(null)
  const [erros, setErros] = useState({})
  const [tentou, setTentou] = useState(false)
  const primeiraVez = useRef(true)

  // Rascunho salvo sozinho a cada mudança
  useEffect(() => {
    if (primeiraVez.current) {
      primeiraVez.current = false
      return
    }
    const t = setTimeout(() => setSalvoEm(hora(agora)), 800)
    return () => clearTimeout(t)
  }, [segmento, canal, titulo, texto, modeloWa, cupom, quando, data, horario]) // eslint-disable-line react-hooks/exhaustive-deps

  // Ao trocar de etapa, o foco vai para o título dela
  const etapaAnterior = useRef(0)
  useEffect(() => {
    if (etapaAnterior.current !== etapa) tituloEtapa.current?.focus()
    etapaAnterior.current = etapa
  }, [etapa])

  const cont = segmento ? contar(segmento, clienteId) : null
  const clienteEscolhido = cont?.cliente
  const nomePrevia = clienteEscolhido?.primeiroNome || 'Mariana'
  const cuponsAtivos = cen.cupons.filter((c) => c.estado === 'ativo')
  const textoFinal = canal === 'whatsapp' ? MODELOS_WHATSAPP.find((m) => m.id === modeloWa).texto : texto
  const rotuloSegmento = segmento === 'cliente' ? clienteEscolhido?.nome || 'Cliente' : segmentoPorId(segmento)?.rotulo
  const marca = emRede ? cen.marca.nome : loja?.nome || cen.marca.nome
  const segmentos = SEGMENTOS_CAMPANHA.filter((s) => (!s.soPontos || cen.fidelidade.tipo === 'pontos') && (s.id !== 'pontos-vencer' || cen.fidelidade.tipo))

  const validar = (i) => {
    const e = {}
    if (i === 0 && !segmento) e.segmento = 'Escolha para quem vai a campanha.'
    if (i === 0 && segmento && cont.n === 0) e.segmento = segmento === 'cliente' && cont.total ? 'Este cliente não aceitou receber mensagens.' : 'Nenhum cliente neste segmento agora.'
    if (i === 1 && !canal) e.canal = 'Nenhum canal ativo para enviar.'
    if (i === 2 && canal === 'push' && !titulo.trim()) e.titulo = 'Escreva o título.'
    if (i === 2 && canal === 'push' && !texto.trim()) e.texto = 'Escreva a mensagem.'
    if (i === 3 && quando === 'agendar' && (!data || !horario)) e.quando = 'Escolha o dia e o horário.'
    setErros(e)
    return Object.keys(e).length === 0
  }
  const avancar = () => validar(etapa) && setEtapa((x) => x + 1)

  const concluir = (modo) => {
    if (modo !== 'rascunho' && !validar(3)) return
    setEnviando(modo)
    setTimeout(() => {
      setEnviando(null)
      const [a, m, d] = data.split('-').map(Number)
      const [h, mi] = horario.split(':').map(Number)
      const quandoData = modo === 'agendar' ? new Date(a, m - 1, d, h, mi) : agora
      const nova = {
        id: `nova-${Date.now()}`,
        nome: modelo?.nome || titulo || 'Campanha sem nome',
        canal: canal || 'push',
        estado: modo === 'agora' ? 'enviada' : modo === 'agendar' ? 'agendada' : 'rascunho',
        quando: quandoData,
        segmento: segmento === 'cliente' ? null : segmento,
        segmentoRotulo: rotuloSegmento,
        enviados: modo === 'agora' ? cont?.n ?? 0 : null,
        entregues: modo === 'agora' ? Math.round((cont?.n ?? 0) * 0.97) : null,
        lojas: emRede ? 'Todas' : loja?.nome,
      }
      const msg = {
        agora: `Campanha enviada para ${plural(cont?.n ?? 0, 'cliente', 'clientes')}.`,
        agendar: `Campanha agendada para ${diaMes(quandoData)}, ${horario}.`,
        rascunho: 'Rascunho salvo.',
      }[modo]
      avisar(msg, 'sucesso')
      navegar(`/campanhas?aba=${modo === 'agora' ? 'enviadas' : modo === 'agendar' ? 'agendadas' : 'rascunhos'}`, { state: { nova } })
    }, 800)
  }

  const inserirNome = () => setTexto((t) => `${t}${t && !t.endsWith(' ') ? ' ' : ''}{primeiro_nome}`)

  if (estadoForcado === 'carregando') {
    return (
      <div className="pagina">
        <CabecalhoPagina titulo="Criar campanha" />
        <Carregando oQue="os segmentos"><Esqueleto linhas={6} altura="44px" /></Carregando>
      </div>
    )
  }
  if (estadoForcado === 'erro' && !tentou) {
    return (
      <div className="pagina">
        <CabecalhoPagina titulo="Criar campanha" />
        <EstadoErro oQue="os segmentos de clientes" aoTentar={() => setTentou(true)} />
      </div>
    )
  }

  const previa = (
    <CelularPrevia rotulo={`Prévia ${canal === 'whatsapp' ? 'no WhatsApp' : 'da notificação no celular'}, com o nome de ${nomePrevia}`}>
      <PreviaMensagem canal={canal} titulo={titulo} texto={textoFinal} cupom={cupom} nome={nomePrevia} marca={marca} />
    </CelularPrevia>
  )

  let corpo
  if (etapa === 0) {
    corpo = (
      <fieldset className="campanha-nova__grupo">
        <legend className="visualmente-oculto">Para quem</legend>
        {estadoForcado === 'vazio' || base.total === 0 ? (
          <EstadoVazio compacto titulo="Nenhum cliente neste segmento agora." texto="Os clientes aparecem depois do primeiro pedido." />
        ) : (
          <ul className="campanha-nova__opcoes">
            {clienteId && (
              <OpcaoRadio nome="segmento" valor="cliente" atual={segmento} aoMudar={setSegmento} titulo={`Só este cliente: ${clienteEscolhido?.nome || 'não encontrado'}`} detalhe={contagemTexto(contar('cliente', clienteId))} />
            )}
            {segmentos.map((s) => (
              <OpcaoRadio key={s.id} nome="segmento" valor={s.id} atual={segmento} aoMudar={setSegmento} titulo={s.rotulo} detalhe={<>{s.descricao}. {contagemTexto(contar(s.id))}</>} />
            ))}
          </ul>
        )}
        {cont && cont.semConsentimento > 0 && (
          <p className="texto-secundario"><span className="numero">{numero(cont.semConsentimento)}</span> {cont.semConsentimento === 1 ? 'cliente não aceitou' : 'clientes não aceitaram'} receber mensagens e {cont.semConsentimento === 1 ? 'fica' : 'ficam'} fora da contagem.</p>
        )}
        {erros.segmento && <p className="campo__erro"><AlertTriangle size={14} aria-hidden /> {erros.segmento}</p>}
      </fieldset>
    )
  } else if (etapa === 1) {
    corpo = (
      <fieldset className="campanha-nova__grupo">
        <legend className="visualmente-oculto">Canal</legend>
        {canaisAtivos.length === 0 && (
          <FaixaAviso tom="atencao" icone={AlertTriangle}>Nenhum canal ativo. Para enviar, o push do app precisa estar ligado ou o WhatsApp conectado. Fale com o suporte.</FaixaAviso>
        )}
        <ul className="campanha-nova__opcoes">
          <OpcaoRadio nome="canal" valor="push" atual={canal} aoMudar={setCanal} titulo="Push do app" detalhe={cen.canais.push ? 'Notificação no celular de quem tem o app.' : 'Desligado. Fale com o suporte.'} desabilitado={!cen.canais.push} />
          <OpcaoRadio nome="canal" valor="whatsapp" atual={canal} aoMudar={setCanal} titulo="WhatsApp" detalhe={cen.canais.whatsapp ? 'Mensagem pelo número da loja, com modelo aprovado.' : 'Número não conectado. Fale com o suporte.'} desabilitado={!cen.canais.whatsapp} />
        </ul>
        {erros.canal && <p className="campo__erro"><AlertTriangle size={14} aria-hidden /> {erros.canal}</p>}
      </fieldset>
    )
  } else if (etapa === 2) {
    corpo = (
      <div className="formulario">
        {canal === 'whatsapp' ? (
          <>
            <Campo rotulo="Modelo aprovado" ajuda="No WhatsApp, a mensagem usa um modelo aprovado. Só o primeiro nome e o cupom mudam.">
              {(props) => (
                <select {...props} className="campo__entrada" value={modeloWa} onChange={(e) => setModeloWa(e.target.value)}>
                  {MODELOS_WHATSAPP.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </select>
              )}
            </Campo>
            <p className="campanha-nova__texto-modelo">"{MODELOS_WHATSAPP.find((m) => m.id === modeloWa).texto}"</p>
          </>
        ) : (
          <>
            <Campo rotulo="Título" erro={erros.titulo} ajuda={<><span className="numero">{titulo.length}</span> de <span className="numero">{LIMITE_TITULO}</span> caracteres</>}>
              {(props) => <input {...props} className="campo__entrada" maxLength={LIMITE_TITULO} value={titulo} onChange={(e) => setTitulo(e.target.value)} />}
            </Campo>
            <Campo rotulo="Mensagem" erro={erros.texto} ajuda={<><span className="numero">{texto.length}</span> de <span className="numero">{LIMITE_TEXTO}</span> caracteres. {'{primeiro_nome}'} vira o nome de cada cliente.</>}>
              {(props) => <textarea {...props} className="campo__entrada" rows={4} maxLength={LIMITE_TEXTO} value={texto} onChange={(e) => setTexto(e.target.value)} />}
            </Campo>
            <Botao variante="texto" tamanho="p" onClick={inserirNome} disabled={texto.length + 16 > LIMITE_TEXTO}>Inserir primeiro nome</Botao>
          </>
        )}
        <Campo rotulo="Cupom (opcional)" ajuda={cuponsAtivos.length ? 'Só cupons ativos.' : 'Nenhum cupom ativo agora.'}>
          {(props) => (
            <select {...props} className="campo__entrada" value={cupom} onChange={(e) => setCupom(e.target.value)} disabled={!cuponsAtivos.length}>
              <option value="">Sem cupom</option>
              {cuponsAtivos.map((c) => <option key={c.codigo} value={c.codigo}>{c.codigo}: {c.descricao}</option>)}
            </select>
          )}
        </Campo>
      </div>
    )
  } else {
    corpo = (
      <div className="formulario">
        <fieldset className="campanha-nova__grupo">
          <legend className="visualmente-oculto">Quando enviar</legend>
          <ul className="campanha-nova__opcoes">
            <OpcaoRadio nome="quando" valor="agora" atual={quando} aoMudar={setQuando} titulo="Agora" detalhe="Sai assim que você confirmar." />
            <OpcaoRadio nome="quando" valor="agendar" atual={quando} aoMudar={setQuando} titulo="Agendar" detalhe="Escolha o dia e o horário." />
          </ul>
        </fieldset>
        {quando === 'agendar' && (
          <div className="campanha-nova__agenda">
            <Campo rotulo="Dia">{(props) => <input {...props} type="date" className="campo__entrada" min="2026-10-09" value={data} onChange={(e) => setData(e.target.value)} />}</Campo>
            <Campo rotulo="Horário">{(props) => <input {...props} type="time" className="campo__entrada" value={horario} onChange={(e) => setHorario(e.target.value)} />}</Campo>
          </div>
        )}
        {erros.quando && <p className="campo__erro"><AlertTriangle size={14} aria-hidden /> {erros.quando}</p>}
        <dl className="valores">
          <div><dt className="rotulo-kpi">Para quem</dt><dd>{rotuloSegmento} (<span className="numero">{numero(cont?.n ?? 0)}</span> {(cont?.n ?? 0) === 1 ? 'cliente' : 'clientes'})</dd></div>
          <div><dt className="rotulo-kpi">Canal</dt><dd>{NOME_CANAL[canal]}</dd></div>
          <div><dt className="rotulo-kpi">Cupom</dt><dd>{cupom || '—'}</dd></div>
        </dl>
      </div>
    )
  }

  const n = cont?.n ?? 0

  return (
    <div className="pagina campanha-nova">
      <Botao variante="texto" icone={ArrowLeft} para="/campanhas" className="botao--voltar">Campanhas</Botao>
      <CabecalhoPagina
        titulo={modelo ? `Criar campanha: ${cashback && modelo.id === 'pontos' ? 'Seu cashback vai vencer' : modelo.nome}` : 'Criar campanha'}
        acoes={<span className="campanha-nova__salvo" aria-live="polite">{salvoEm ? <><Check size={14} aria-hidden /> Rascunho salvo às {salvoEm}</> : null}</span>}
      />

      <ol className="campanha-nova__etapas" aria-label="Etapas">
        {ETAPAS.map((e, i) => (
          <li key={e} aria-current={i === etapa ? 'step' : undefined} className={i < etapa ? 'campanha-nova__etapa--feita' : ''}>
            {i < etapa ? (
              <button type="button" className="link" onClick={() => setEtapa(i)}>{i + 1}. {e}</button>
            ) : (
              <span>{i + 1}. {e}</span>
            )}
          </li>
        ))}
      </ol>

      <div className="campanha-nova__grade">
        <section className="bloco campanha-nova__formulario" aria-labelledby="titulo-etapa">
          <div className="bloco__cabecalho">
            <h2 id="titulo-etapa" ref={tituloEtapa} tabIndex={-1}>{ETAPAS[etapa]}</h2>
            {etapa > 0 && rotuloSegmento && <span className="texto-secundario">{rotuloSegmento} · <span className="numero">{numero(n)}</span> {n === 1 ? 'cliente' : 'clientes'}</span>}
          </div>
          {corpo}
          <div className="campanha-nova__navegacao">
            {etapa > 0 && <Botao onClick={() => setEtapa((x) => x - 1)}>Voltar</Botao>}
            <Botao variante="texto" onClick={() => concluir('rascunho')} carregando={enviando === 'rascunho'} mudaAlgo>Salvar rascunho</Botao>
            {etapa < 3 ? (
              <Botao variante="principal" onClick={avancar}>Próximo</Botao>
            ) : quando === 'agora' ? (
              <Botao variante="principal" onClick={() => concluir('agora')} carregando={enviando === 'agora'} disabled={n === 0} mudaAlgo>
                Enviar para {plural(n, 'cliente', 'clientes')}
              </Botao>
            ) : (
              <Botao variante="principal" onClick={() => concluir('agendar')} carregando={enviando === 'agendar'} disabled={n === 0} mudaAlgo>
                Agendar para {data ? diaMes(new Date(`${data}T12:00`)) : ''}, {horario}
              </Botao>
            )}
          </div>
        </section>
        {!celular && <div className="campanha-nova__lado">{previa}</div>}
      </div>
      {celular && <div className="campanha-nova__previa-celular">{previa}</div>}
    </div>
  )
}

function contagemTexto(c) {
  if (c.total === 0) return 'Nenhum cliente neste segmento agora.'
  return <><span className="numero">{numero(c.n)}</span> {c.n === 1 ? 'cliente' : 'clientes'}</>
}

function OpcaoRadio({ nome, valor, atual, aoMudar, titulo, detalhe, desabilitado }) {
  const id = `${nome}-${valor}`
  return (
    <li>
      <label htmlFor={id} className={`campanha-nova__opcao ${atual === valor ? 'campanha-nova__opcao--escolhida' : ''} ${desabilitado ? 'campanha-nova__opcao--desabilitada' : ''}`}>
        <input id={id} type="radio" name={nome} value={valor} checked={atual === valor} onChange={() => aoMudar(valor)} disabled={desabilitado} />
        <span className="campanha-nova__opcao-textos">
          <span className="campanha-nova__opcao-titulo">{titulo}</span>
          {detalhe && <span className="campanha-nova__opcao-detalhe">{detalhe}</span>}
        </span>
      </label>
    </li>
  )
}

// ---------- T17. Automações ----------
const AUTOMACAO_VAZIA = { id: null, nome: '', gatilho: '', dias: '', condicao: '', valor: '', canal: 'push', texto: '', estado: 'rascunho', enviadas30: 0 }

function faltando(a, cen) {
  const f = []
  const g = GATILHOS.find((x) => x.id === a.gatilho)
  if (!g) f.push({ bloco: 'quando', texto: 'Escolha quando a mensagem sai.' })
  else if (g.dias && !Number(a.dias)) f.push({ bloco: 'quando', texto: 'Diga em quantos dias.' })
  if (a.condicao === 'gastou' && !Number(a.valor)) f.push({ bloco: 'se', texto: 'Diga o valor gasto.' })
  if (a.condicao === 'loja' && !a.valor) f.push({ bloco: 'se', texto: 'Escolha a loja.' })
  if (!a.canal || !cen.canais[a.canal]) f.push({ bloco: 'entao', texto: 'Escolha um canal ativo.' })
  if (!a.texto.trim()) f.push({ bloco: 'entao', texto: 'Escreva a mensagem.' })
  return f
}

function resumoAutomacao(a) {
  const g = GATILHOS.find((x) => x.id === a.gatilho)
  const quando = g ? `${g.rotulo}${g.dias ? ` ${a.dias || '?'} ${g.sufixo}` : ''}` : 'Sem gatilho'
  return `${quando} · ${NOME_CANAL[a.canal] || 'Sem canal'}`
}

const ESTADO_AUTOMACAO = { ativa: { texto: 'Ativa', tom: 'verde' }, pausada: { texto: 'Pausada', tom: 'cinza' }, rascunho: { texto: 'Rascunho', tom: 'neutro' } }

export function Automacoes() {
  const { cen, cenarioId, avisar, estadoForcado, lojasVisiveis } = usePrototipo()
  const [lista, setLista] = useState(() => (cenarioId === 'rede' ? AUTOMACOES_REDE.map((a) => ({ ...a })) : []))
  const [editando, setEditando] = useState(null)
  const [ocupado, setOcupado] = useState(null)
  const [tentou, setTentou] = useState(false)
  const editor = useRef(null)
  useTitulo('Automações')

  useEffect(() => {
    if (editando) editor.current?.focus()
  }, [editando?.id, editando?.origem]) // eslint-disable-line react-hooks/exhaustive-deps

  const simular = (chave, fn, msg) => {
    setOcupado(chave)
    setTimeout(() => {
      fn()
      setOcupado(null)
      avisar(msg, 'sucesso')
    }, 600)
  }

  const abrirModelo = (m) =>
    setEditando({ ...AUTOMACAO_VAZIA, nome: m.nome, gatilho: m.gatilho, dias: m.dias ? String(m.dias) : '', texto: m.texto, canal: cen.canais.push ? 'push' : 'whatsapp', origem: m.id })
  const salvar = (estado) => {
    const a = { ...editando, estado, id: editando.id || `a-${Date.now()}` }
    simular('salvar', () => {
      setLista((l) => (l.some((x) => x.id === a.id) ? l.map((x) => (x.id === a.id ? a : x)) : [...l, a]))
      setEditando(null)
    }, estado === 'ativa' ? `Automação "${a.nome || 'sem nome'}" ativada.` : 'Automação salva como rascunho.')
  }
  const alternar = (a) => {
    const novo = a.estado === 'ativa' ? 'pausada' : 'ativa'
    if (novo === 'ativa' && faltando(a, cen).length) return setEditando({ ...a })
    simular(a.id, () => setLista((l) => l.map((x) => (x.id === a.id ? { ...x, estado: novo } : x))), novo === 'ativa' ? `Automação "${a.nome}" ativada.` : `Automação "${a.nome}" pausada.`)
  }
  const duplicar = (a) =>
    simular(`dup-${a.id}`, () => setLista((l) => [...l, { ...a, id: `a-${Date.now()}`, nome: `${a.nome} (cópia)`, estado: 'rascunho', enviadas30: 0 }]), `Automação "${a.nome}" duplicada como rascunho.`)

  const carregando = estadoForcado === 'carregando'
  const erro = estadoForcado === 'erro' && !tentou
  const visiveis = estadoForcado === 'vazio' ? [] : lista

  return (
    <div className="pagina automacoes">
      <CabecalhoPagina
        titulo="Automações"
        descricao="Mensagens que saem sozinhas, na hora certa, sem você precisar lembrar."
        acoes={<Botao variante="principal" icone={Plus} onClick={() => setEditando({ ...AUTOMACAO_VAZIA, origem: 'zero' })}>Nova automação</Botao>}
      />
      <AbasCampanhas ativa="automacoes" />

      <div className="campanhas__conteudo">
        {carregando ? (
          <Carregando oQue="as automações"><Esqueleto linhas={3} altura="56px" /></Carregando>
        ) : erro ? (
          <EstadoErro oQue="as automações" aoTentar={() => setTentou(true)} />
        ) : visiveis.length === 0 ? (
          <EstadoVazio titulo="Nenhuma automação ainda." texto="Comece por um modelo pronto abaixo ou crie do zero." />
        ) : (
          <ul className="automacoes__lista">
            {visiveis.map((a) => (
              <li key={a.id}>
                <div className="automacoes__textos">
                  <span className="tabela__principal">{a.nome || 'Sem nome'}</span>
                  <span className="tabela__secundario">{resumoAutomacao(a)}{a.estado === 'ativa' ? <> · <span className="numero">{numero(a.enviadas30)}</span> {a.enviadas30 === 1 ? 'mensagem' : 'mensagens'} nos últimos 30 dias</> : ''}</span>
                </div>
                <Selo tom={ESTADO_AUTOMACAO[a.estado].tom}>{ESTADO_AUTOMACAO[a.estado].texto}</Selo>
                <div className="automacoes__acoes">
                  <Botao tamanho="p" variante="texto" onClick={() => setEditando({ ...a })} aria-label={`Editar ${a.nome}`}>Editar</Botao>
                  <Botao tamanho="p" icone={a.estado === 'ativa' ? Pause : Play} onClick={() => alternar(a)} carregando={ocupado === a.id} mudaAlgo aria-label={`${a.estado === 'ativa' ? 'Pausar' : 'Ativar'} ${a.nome}`}>
                    {a.estado === 'ativa' ? 'Pausar' : 'Ativar'}
                  </Botao>
                  <Botao tamanho="p" variante="texto" icone={Copy} onClick={() => duplicar(a)} carregando={ocupado === `dup-${a.id}`} mudaAlgo aria-label={`Duplicar ${a.nome}`}>Duplicar</Botao>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editando && (
        <EditorAutomacao
          ref={editor}
          a={editando}
          mudar={(campos) => setEditando((x) => ({ ...x, ...campos }))}
          aoCancelar={() => setEditando(null)}
          aoSalvar={salvar}
          ocupado={ocupado === 'salvar'}
          lojas={cen.rede ? lojasVisiveis : null}
        />
      )}

      <section className="bloco" aria-labelledby="titulo-modelos-auto">
        <div className="bloco__cabecalho"><h2 id="titulo-modelos-auto">Modelos prontos</h2></div>
        <ul className="campanhas__modelos">
          {MODELOS_AUTOMACAO.filter((m) => m.gatilho !== 'pontos-vencer' || cen.fidelidade.tipo).map((m) => (
            <li key={m.id}>
              <div className="campanhas__modelo-textos">
                <span className="tabela__principal">{m.nome}</span>
                <span className="tabela__secundario">{resumoAutomacao({ ...m, canal: cen.canais.push ? 'push' : 'whatsapp' })}</span>
              </div>
              <Botao tamanho="p" onClick={() => abrirModelo(m)}>Usar modelo</Botao>
            </li>
          ))}
        </ul>
        <p className="bloco__nota">"Novidade no cardápio" é uma campanha avulsa, não automação: use Criar campanha.</p>
      </section>
    </div>
  )
}


const EditorAutomacao = forwardRef(function EditorAutomacao({ a, mudar, aoCancelar, aoSalvar, ocupado, lojas }, ref) {
  const { cen } = usePrototipo()
  const falta = faltando(a, cen)
  const doBloco = (b) => falta.filter((f) => f.bloco === b)
  const g = GATILHOS.find((x) => x.id === a.gatilho)
  const Bloco = ({ id, titulo, children }) => {
    const f = doBloco(id)
    return (
      <section className={`automacoes__bloco ${f.length ? 'automacoes__bloco--incompleto' : ''}`} aria-labelledby={`bloco-${id}`}>
        <h3 id={`bloco-${id}`}>{titulo}</h3>
        {children}
        {f.length > 0 && (
          <ul className="automacoes__falta">
            {f.map((x) => <li key={x.texto}><AlertTriangle size={14} aria-hidden /> Falta: {x.texto.charAt(0).toLowerCase() + x.texto.slice(1)}</li>)}
          </ul>
        )}
      </section>
    )
  }
  return (
    <section className="bloco automacoes__editor" aria-labelledby="titulo-editor">
      <div className="bloco__cabecalho">
        <h2 id="titulo-editor" ref={ref} tabIndex={-1}>{a.id ? `Editar: ${a.nome}` : 'Nova automação'}</h2>
      </div>
      <div className="formulario">
        <Campo rotulo="Nome da automação">
          {(props) => <input {...props} className="campo__entrada" value={a.nome} onChange={(e) => mudar({ nome: e.target.value })} />}
        </Campo>
      </div>
      <div className="automacoes__fluxo">
        {Bloco({
          id: 'quando',
          titulo: 'Quando',
          children: (
            <div className="automacoes__linha">
              <Campo rotulo="Gatilho">
                {(props) => (
                  <select {...props} className="campo__entrada" value={a.gatilho} onChange={(e) => mudar({ gatilho: e.target.value })}>
                    <option value="">Escolha</option>
                    {GATILHOS.filter((x) => x.id !== 'pontos-vencer' || cen.fidelidade.tipo).map((x) => <option key={x.id} value={x.id}>{x.rotulo}{x.dias ? ' X dias' : ''}</option>)}
                  </select>
                )}
              </Campo>
              {g?.dias && (
                <Campo rotulo="Dias">
                  {(props) => <input {...props} className="campo__entrada automacoes__curto" inputMode="numeric" value={a.dias} onChange={(e) => mudar({ dias: e.target.value.replace(/\D/g, '') })} />}
                </Campo>
              )}
            </div>
          ),
        })}
        {Bloco({
          id: 'se',
          titulo: 'Se (opcional)',
          children: (
            <div className="automacoes__linha">
              <Campo rotulo="Condição">
                {(props) => (
                  <select {...props} className="campo__entrada" value={a.condicao} onChange={(e) => mudar({ condicao: e.target.value, valor: '' })}>
                    {CONDICOES.filter((c) => !c.soRede || lojas).map((c) => <option key={c.id} value={c.id}>{c.rotulo}</option>)}
                  </select>
                )}
              </Campo>
              {a.condicao === 'gastou' && (
                <Campo rotulo="Valor (R$)">
                  {(props) => <input {...props} className="campo__entrada automacoes__curto" inputMode="decimal" value={a.valor} onChange={(e) => mudar({ valor: e.target.value.replace(/[^\d,]/g, '') })} />}
                </Campo>
              )}
              {a.condicao === 'loja' && lojas && (
                <Campo rotulo="Loja">
                  {(props) => (
                    <select {...props} className="campo__entrada" value={a.valor} onChange={(e) => mudar({ valor: e.target.value })}>
                      <option value="">Escolha</option>
                      {lojas.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
                    </select>
                  )}
                </Campo>
              )}
            </div>
          ),
        })}
        {Bloco({
          id: 'entao',
          titulo: 'Então',
          children: (
            <div className="formulario">
              <Campo rotulo="Enviar por">
                {(props) => (
                  <select {...props} className="campo__entrada" value={a.canal} onChange={(e) => mudar({ canal: e.target.value })}>
                    <option value="push" disabled={!cen.canais.push}>Push do app{cen.canais.push ? '' : ' (desligado)'}</option>
                    <option value="whatsapp" disabled={!cen.canais.whatsapp}>WhatsApp{cen.canais.whatsapp ? '' : ' (número não conectado)'}</option>
                  </select>
                )}
              </Campo>
              <Campo rotulo="Mensagem" ajuda={<><span className="numero">{a.texto.length}</span> de <span className="numero">{LIMITE_TEXTO}</span> caracteres. {'{primeiro_nome}'} vira o nome de cada cliente.</>}>
                {(props) => <textarea {...props} className="campo__entrada" rows={3} maxLength={LIMITE_TEXTO} value={a.texto} onChange={(e) => mudar({ texto: e.target.value })} />}
              </Campo>
            </div>
          ),
        })}
      </div>
      <div className="automacoes__painel" role="status" aria-live="polite">
        {falta.length ? (
          <>
            <strong>Faltam {plural(falta.length, 'passo', 'passos')} para ativar</strong>
            <ul>{falta.map((f) => <li key={f.texto}>{f.texto}</li>)}</ul>
          </>
        ) : (
          <strong>Tudo pronto para ativar.</strong>
        )}
      </div>
      <div className="campanha-nova__navegacao">
        <Botao onClick={aoCancelar}>Cancelar</Botao>
        <Botao variante="texto" onClick={() => aoSalvar('rascunho')} mudaAlgo>Salvar rascunho</Botao>
        <Botao variante="principal" onClick={() => aoSalvar('ativa')} disabled={falta.length > 0} carregando={ocupado} mudaAlgo>Ativar</Botao>
      </div>
    </section>
  )
})
