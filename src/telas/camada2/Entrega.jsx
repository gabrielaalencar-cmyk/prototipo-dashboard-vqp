// T27. Entrega: como a loja entrega (e os parceiros, se houver), mapa da área, patamares,
// frete grátis, pedido mínimo e integrações logísticas só com status. Raio, patamares e frete grátis são proposta de migração.
import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Link } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { usePrototipo } from '../../contexto/Prototipo.jsx'
import { useEhCelular, useTitulo } from '../../utilitarios/ganchos.js'
import { dataCurta, decimal, moeda } from '../../utilitarios/formatos.js'
import { coordenadasDaLoja, entregaInicial, logisticaDaLoja } from '../../dados/minhaloja.js'
import { Botao, CabecalhoPagina, Campo, EstadoErro, FaixaAviso, Interruptor, Selo, SeloProposta } from '../../componentes/base.jsx'
import { BarraSalvar, EsqueletoBlocos, esperar, lerNumero, mudou, useAvisoSaida } from './MinhaLojaComum.jsx'
import '../../estilos/minhaloja.css'

const TEMPO_MAXIMO = 240
const RAIO_MAXIMO = 30

// Erros por patamar e dos campos gerais
function validar(r) {
  const erros = { patamares: {}, gerais: {} }
  let anterior = 0
  r.patamares.forEach((p) => {
    const e = {}
    const ate = lerNumero(p.ate)
    const taxa = lerNumero(p.taxa)
    const tempo = lerNumero(p.tempo)
    if (ate == null || Number.isNaN(ate) || ate <= 0) e.ate = 'Informe a distância em km.'
    else if (ate > RAIO_MAXIMO) e.ate = `O raio máximo é de ${RAIO_MAXIMO} km.`
    else if (ate <= anterior) e.ate = `Precisa ser maior que ${decimal(anterior, anterior % 1 ? 1 : 0)} km, do patamar anterior.`
    if (taxa == null || Number.isNaN(taxa) || taxa < 0) e.taxa = 'Informe a taxa (use 0 para grátis).'
    if (tempo == null || Number.isNaN(tempo) || tempo <= 0) e.tempo = 'Informe o tempo em minutos.'
    else if (tempo > TEMPO_MAXIMO) e.tempo = `O tempo máximo é de ${TEMPO_MAXIMO} minutos.`
    if (ate > 0) anterior = ate
    if (Object.keys(e).length) erros.patamares[p.id] = e
  })
  const raio = anterior
  if (r.freteGratis.ativo) {
    const min = lerNumero(r.freteGratis.pedidoMinimo)
    const ateKm = lerNumero(r.freteGratis.raio)
    if (min == null || Number.isNaN(min) || min <= 0) erros.gerais.freteMinimo = 'Informe a partir de qual valor o frete é grátis.'
    if (ateKm == null || Number.isNaN(ateKm) || ateKm <= 0) erros.gerais.freteRaio = 'Informe até quantos km vale o frete grátis.'
    else if (raio && ateKm > raio) erros.gerais.freteRaio = `Não pode passar do raio de entrega (${decimal(raio, raio % 1 ? 1 : 0)} km).`
  }
  const pm = lerNumero(r.pedidoMinimo)
  if (pm != null && (Number.isNaN(pm) || pm < 0)) erros.gerais.pedidoMinimo = 'Informe um valor em reais, como 20,00.'
  const total = Object.values(erros.patamares).reduce((s, e) => s + Object.keys(e).length, 0) + Object.keys(erros.gerais).length
  return { erros, total, raio }
}

const km = (n) => `${decimal(n, n % 1 ? 1 : 0)} km`

// Escala sequencial de um só matiz (violeta): mais escuro perto da loja, mais claro longe.
// Não usa cores de status nem a cor do cliente.
export function corPatamar(i, n) {
  const luz = n <= 1 ? 34 : 26 + (i / (n - 1)) * 46
  return `hsl(262 52% ${Math.round(luz)}%)`
}

// Patamares válidos em ordem de distância, cada um com a sua cor
function patamaresDoMapa(patamares) {
  const validos = patamares
    .map((p) => ({ ...p, n: lerNumero(p.ate), t: lerNumero(p.taxa), m: lerNumero(p.tempo) }))
    .filter((p) => p.n > 0 && p.n <= RAIO_MAXIMO)
    .sort((a, b) => a.n - b.n)
  return validos.map((p, i) => ({ ...p, cor: corPatamar(i, validos.length) }))
}

const legendaPatamar = (p) => `até ${km(p.n)} · ${p.t > 0 ? moeda(p.t) : 'sem taxa'}${p.m > 0 ? ` · ${p.m} min` : ''}`

// Mapa real (Leaflet + OpenStreetMap) com os patamares como círculos concêntricos
function MapaEntrega({ centro, faixas, frete, sigla, nomeLoja, resumo }) {
  const caixa = useRef(null)
  const mapa = useRef(null)
  const camada = useRef(null)

  useEffect(() => {
    const m = L.map(caixa.current, { center: centro, zoom: 14, scrollWheelZoom: false, dragging: !L.Browser.mobile, attributionControl: true })
    m.attributionControl.setPrefix(false)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(m)
    const icone = L.divIcon({ className: 'entrega__marcador', html: `<span>${sigla}</span>`, iconSize: [34, 34], iconAnchor: [17, 17] })
    L.marker(centro, { icon: icone, title: nomeLoja, alt: nomeLoja, keyboard: false }).addTo(m)
    camada.current = L.layerGroup().addTo(m)
    mapa.current = m
    return () => {
      m.remove()
      mapa.current = null
    }
  }, [centro[0], centro[1], sigla, nomeLoja])

  // Redesenha na hora a cada mudança de raio, cor ou frete grátis
  const chave = JSON.stringify([faixas.map((f) => [f.n, f.cor]), frete])
  useEffect(() => {
    const m = mapa.current
    if (!m) return
    camada.current.clearLayers()
    ;[...faixas].reverse().forEach((f) => {
      L.circle(centro, { radius: f.n * 1000, color: f.cor, weight: 1.5, fillColor: f.cor, fillOpacity: 0.32, interactive: false }).addTo(camada.current)
    })
    if (frete) {
      L.circle(centro, { radius: frete * 1000, className: 'entrega__frete-mapa', fill: false, weight: 2.5, dashArray: '8 6', interactive: false }).addTo(camada.current)
    }
    const maior = faixas.length ? faixas[faixas.length - 1].n : 0
    if (maior) m.fitBounds(L.latLng(centro).toBounds(maior * 2000 * 1.08), { animate: false })
    else m.setView(centro, 15, { animate: false })
  }, [chave, centro[0], centro[1]])

  return (
    <div className="entrega__mapa-caixa">
      <div ref={caixa} className="entrega__mapa" role="region" aria-label={`Mapa da área de entrega da ${nomeLoja}. ${resumo}`} />
      {!faixas.length && <p className="entrega__mapa-vazio">Nenhuma área de entrega ainda</p>}
    </div>
  )
}

const ESTADO_LOGISTICA = {
  conectado: { tom: 'verde', texto: 'Conectada' },
  desconectado: { tom: 'vermelho', texto: 'Desconectada' },
  'em-uso': { tom: 'verde', texto: 'Em uso' },
  'sem-area': { tom: 'ambar', texto: 'Falta a área de entrega' },
  'nao-contratado': { tom: 'neutro', texto: 'Não contratada' },
}

function CampoDinheiro({ rotulo, valor, aoMudar, erro, ajuda }) {
  return (
    <Campo rotulo={rotulo} erro={erro} ajuda={ajuda}>
      {(p) => (
        <span className="campo__prefixo">
          <span aria-hidden>R$</span>
          <input {...p} className="campo__entrada" inputMode="decimal" value={valor} onChange={(e) => aoMudar(e.target.value)} />
        </span>
      )}
    </Campo>
  )
}

const OPCOES_ENTREGA = [
  ['propria', 'Entregadores próprios', 'A loja tem os próprios entregadores.'],
  ['parceiros', 'Parceiros de logística', 'Um parceiro chama o entregador para cada pedido.'],
  ['ambos', 'Os dois', 'Entregadores próprios e um parceiro quando faltar gente.'],
]

// O que a área de entrega significa para cada forma de entregar
const TEXTO_AREA = {
  propria: 'Até onde seus entregadores vão, quanto o cliente paga e em quanto tempo chega.',
  parceiros: 'Até onde a loja aceita pedidos, quanto o cliente paga e em quanto tempo chega. O parceiro busca o pedido na loja.',
  ambos: 'Vale para os seus entregadores e para o parceiro: até onde a loja aceita pedidos, quanto o cliente paga e em quanto tempo chega.',
}

function EntregaLoja() {
  const { cenarioId, cen, loja, dadosLoja, estadoForcado, avisar } = usePrototipo()
  const celular = useEhCelular()
  useTitulo('Entrega')
  // Como a loja faz a entrega: os parceiros de logística só aparecem se a loja optar por eles
  const [salvo, setSalvo] = useState(() => ({ quemEntrega: cenarioId === 'rede' && estadoForcado !== 'vazio' ? 'ambos' : 'propria', ...entregaInicial(estadoForcado === 'vazio' ? 'nova' : cenarioId) }))
  const [pedidos, setPedidos] = useState(() => new Set())
  const [r, setR] = useState(salvo)
  const [salvando, setSalvando] = useState(false)
  const [tentou, setTentou] = useState(false)
  const [mostrarErros, setMostrarErros] = useState(false)
  const [centro] = useState(() => coordenadasDaLoja(loja))
  const sujo = mudou(r, salvo)
  const avisoSaida = useAvisoSaida(sujo)
  const { erros, total, raio } = validar(r)
  const err = (e) => (mostrarErros ? e : undefined)
  const logistica = logisticaDaLoja(cenarioId, dadosLoja)

  const mudarPatamar = (id, campo, v) => setR((x) => ({ ...x, patamares: x.patamares.map((p) => (p.id === id ? { ...p, [campo]: v } : p)) }))
  const adicionarPatamar = () =>
    setR((x) => {
      const ultimo = x.patamares[x.patamares.length - 1]
      const ate = ultimo ? (lerNumero(ultimo.ate) || 0) + 2 : 2
      return { ...x, patamares: [...x.patamares, { id: `pt-${Date.now()}`, ate: String(ate).replace('.', ','), taxa: ultimo ? ultimo.taxa : '5,00', tempo: ultimo ? ultimo.tempo : '30' }] }
    })
  const removerPatamar = (id) => setR((x) => ({ ...x, patamares: x.patamares.filter((p) => p.id !== id) }))

  const salvar = async () => {
    if (total) {
      setMostrarErros(true)
      avisar('Corrija os campos marcados antes de salvar.', 'erro')
      return
    }
    setSalvando(true)
    await esperar(800)
    setSalvo(r)
    setSalvando(false)
    setMostrarErros(false)
    avisar(r.patamares.length ? `Entrega salva. Raio de ${km(raio)}.` : 'Entrega salva.', 'sucesso')
  }

  const cabecalho = <CabecalhoPagina titulo="Entrega" descricao={`Até onde a ${loja.nome} entrega, em quanto tempo e quanto cobra.`} />
  if (estadoForcado === 'carregando') return <div className="pagina">{cabecalho}<EsqueletoBlocos oQue="a entrega" blocos={[2, 6, 3]} /></div>
  if (estadoForcado === 'erro' && !tentou) return <div className="pagina">{cabecalho}<EstadoErro oQue="a entrega" aoTentar={() => setTentou(true)} /></div>

  const semArea = r.patamares.length === 0
  const faixas = patamaresDoMapa(r.patamares)
  const corDe = Object.fromEntries(faixas.map((f) => [f.id, f.cor]))
  const freteKm = r.freteGratis.ativo ? lerNumero(r.freteGratis.raio) : null
  const freteMin = lerNumero(r.freteGratis.pedidoMinimo)
  const freteValido = freteKm > 0 && faixas.length ? Math.min(freteKm, faixas[faixas.length - 1].n) : null
  const resumo = faixas.length
    ? `Entrega até ${km(faixas[faixas.length - 1].n)}.${freteValido ? ` Frete grátis até ${km(freteValido)}${freteMin > 0 ? ` acima de ${moeda(freteMin)}` : ''}.` : ''}`
    : 'Nenhuma área de entrega ainda.'
  const parceiros = logistica.filter((l) => l.id !== 'propria')
  const parceiroAtivo = parceiros.some((l) => l.estado === 'conectado' || l.estado === 'em-uso')

  const amostra = (p, i) => (
    <span className="entrega__amostra" style={corDe[p.id] ? { background: corDe[p.id] } : undefined} aria-hidden title={corDe[p.id] ? `Cor do patamar ${i + 1} no mapa` : undefined} />
  )

  const tabelaPatamares = celular ? (
    <ul className="entrega__patamares-celular">
      {r.patamares.map((p, i) => {
        const e = erros.patamares[p.id] || {}
        return (
          <li key={p.id} className="entrega__patamar-cartao">
            <p className="entrega__patamar-titulo">{amostra(p, i)}Patamar {i + 1}</p>
            <Campo rotulo="Até (km)" erro={err(e.ate)}>{(pp) => <input {...pp} className="campo__entrada" inputMode="decimal" value={p.ate} onChange={(ev) => mudarPatamar(p.id, 'ate', ev.target.value)} />}</Campo>
            <CampoDinheiro rotulo="Taxa" valor={p.taxa} erro={err(e.taxa)} aoMudar={(v) => mudarPatamar(p.id, 'taxa', v)} />
            <Campo rotulo="Tempo (min)" erro={err(e.tempo)}>{(pp) => <input {...pp} className="campo__entrada" inputMode="numeric" value={p.tempo} onChange={(ev) => mudarPatamar(p.id, 'tempo', ev.target.value)} />}</Campo>
            <Botao variante="texto" icone={Trash2} onClick={() => removerPatamar(p.id)} aria-label={`Remover patamar ${i + 1}`}>Remover patamar</Botao>
          </li>
        )
      })}
    </ul>
  ) : (
    <div className="tabela-rolagem">
      <table className="tabela tabela--compacta entrega__tabela">
        <caption className="visualmente-oculto">Patamares de distância, com taxa e tempo. A cor de cada linha é a mesma do anel no mapa.</caption>
        <thead>
          <tr>
            <th scope="col"><span className="visualmente-oculto">Cor no mapa</span></th>
            <th scope="col">Até (km)</th>
            <th scope="col">Taxa</th>
            <th scope="col">Tempo (min)</th>
            <th scope="col"><span className="visualmente-oculto">Ações</span></th>
          </tr>
        </thead>
        <tbody>
          {r.patamares.map((p, i) => {
            const e = erros.patamares[p.id] || {}
            return (
              <tr key={p.id}>
                <td className="entrega__celula-cor">{amostra(p, i)}</td>
                <td>
                  <Campo rotulo={<span className="visualmente-oculto">Patamar {i + 1}: até quantos km</span>} erro={err(e.ate)}>
                    {(pp) => <input {...pp} className="campo__entrada" inputMode="decimal" value={p.ate} onChange={(ev) => mudarPatamar(p.id, 'ate', ev.target.value)} />}
                  </Campo>
                </td>
                <td>
                  <CampoDinheiro rotulo={<span className="visualmente-oculto">Patamar {i + 1}: taxa</span>} valor={p.taxa} erro={err(e.taxa)} aoMudar={(v) => mudarPatamar(p.id, 'taxa', v)} />
                </td>
                <td>
                  <Campo rotulo={<span className="visualmente-oculto">Patamar {i + 1}: tempo em minutos</span>} erro={err(e.tempo)}>
                    {(pp) => <input {...pp} className="campo__entrada" inputMode="numeric" value={p.tempo} onChange={(ev) => mudarPatamar(p.id, 'tempo', ev.target.value)} />}
                  </Campo>
                </td>
                <td className="tabela__num">
                  <Botao tamanho="p" variante="texto" icone={Trash2} onClick={() => removerPatamar(p.id)} aria-label={`Remover patamar ${i + 1}`}>Remover</Botao>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="pagina minha-loja">
      {cabecalho}

      <section className="bloco" aria-labelledby="titulo-quem-entrega">
        <fieldset className="entrega__quem">
          <legend id="titulo-quem-entrega" className="entrega__pergunta">Como minha loja faz a entrega</legend>
          <div className="entrega__opcoes">
            {OPCOES_ENTREGA.map(([id, titulo, texto]) => (
              <label key={id} className={`entrega__opcao ${r.quemEntrega === id ? 'entrega__opcao--marcada' : ''}`}>
                <input type="radio" name="quem-entrega" checked={r.quemEntrega === id} onChange={() => setR((x) => ({ ...x, quemEntrega: id }))} />
                <span><strong>{titulo}</strong><span>{texto}</span></span>
              </label>
            ))}
          </div>
        </fieldset>

        {r.quemEntrega !== 'propria' && (
          <div className="entrega__parceiros">
            <h3 className="entrega__subtitulo">Parceiros de logística</h3>
            {r.quemEntrega === 'parceiros' && !parceiroAtivo && (
              <FaixaAviso tom="atencao">Nenhum parceiro conectado ainda. Sem parceiro, os pedidos de delivery ficam sem entregador. Peça a ativação de um abaixo.</FaixaAviso>
            )}
            <ul className="minha-loja__lista-status">
              {parceiros.map((l) => {
                const pedido = pedidos.has(l.id)
                const est = pedido ? { tom: 'azul', texto: 'Ativação pedida' } : ESTADO_LOGISTICA[l.estado]
                return (
                  <li key={l.id}>
                    <span className="minha-loja__lista-nome">
                      <strong>{l.nome}</strong>
                      <span className="texto-secundario">{l.descricao}</span>
                    </span>
                    <span className="minha-loja__lista-status-direita">
                      <Selo tom={est.tom}>{est.texto}{!pedido && l.estado === 'desconectado' && l.desde ? ` desde ${dataCurta(l.desde)}` : ''}</Selo>
                      {l.estado === 'desconectado' && <Botao tamanho="p" para="/ajuda">Falar com o suporte</Botao>}
                      {l.estado === 'nao-contratado' && !pedido && (
                        <Botao tamanho="p" onClick={() => { setPedidos((x) => new Set(x).add(l.id)); avisar(`Pedido de ativação do ${l.nome} enviado ao suporte. Eles respondem em até 1 dia útil.`, 'sucesso') }} mudaAlgo>
                          Pedir ativação
                        </Botao>
                      )}
                    </span>
                  </li>
                )
              })}
            </ul>
            <p className="bloco__nota">Chaves e credenciais dos parceiros ficam com a equipe de implantação. Aqui você vê só se cada um está conectado.</p>
          </div>
        )}
      </section>

      <section className="bloco" aria-labelledby="titulo-area">
        <div className="bloco__cabecalho"><h2 id="titulo-area">Área de entrega <SeloProposta /></h2></div>
        <p className="bloco__sub entrega__sub">{TEXTO_AREA[r.quemEntrega]}</p>
        <div className="entrega__area">
          <MapaEntrega centro={centro} faixas={faixas} frete={freteValido} sigla={cen.marca.sigla} nomeLoja={loja.nome} resumo={resumo} />
          <div className="entrega__resumo">
            <p className="entrega__resumo-texto" aria-live="polite">{resumo}</p>
            {faixas.length > 0 && (
              <ul className="entrega__legenda" aria-label="Legenda do mapa">
                {faixas.map((f) => (
                  <li key={f.id}><span className="entrega__amostra" style={{ background: f.cor }} aria-hidden />{legendaPatamar(f)}</li>
                ))}
                {freteValido && (
                  <li><span className="entrega__amostra entrega__amostra--frete" aria-hidden />Frete grátis até {km(freteValido)}{freteMin > 0 ? ` acima de ${moeda(freteMin)}` : ''}</li>
                )}
              </ul>
            )}
            {semArea && <Botao variante="principal" icone={Plus} onClick={adicionarPatamar}>Criar o primeiro patamar</Botao>}
            <p className="bloco__nota">
              {cen.marca.sigla} marca o endereço da loja. Sua entrega funciona por patamares de distância; para mudar o tipo, <Link to="/ajuda" className="link">fale com o suporte</Link>.
            </p>
          </div>
        </div>
      </section>

      {!semArea && (
        <section className="bloco" aria-labelledby="titulo-patamares">
          <div className="bloco__cabecalho">
            <h2 id="titulo-patamares">Patamares <SeloProposta /></h2>
            <Botao icone={Plus} onClick={adicionarPatamar}>Adicionar patamar</Botao>
          </div>
          <p className="entrega__raio">Raio de entrega: <strong>{raio ? km(raio) : '—'}</strong> <span className="texto-secundario">(o último patamar)</span></p>
          {tabelaPatamares}
          <p className="bloco__nota">Distâncias contadas a partir do endereço da loja. O tempo vai de 1 a {TEMPO_MAXIMO} minutos. A cor de cada patamar é a do anel no mapa.</p>
        </section>
      )}

      <section className="bloco" aria-labelledby="titulo-frete">
        <div className="bloco__cabecalho"><h2 id="titulo-frete">Frete grátis <SeloProposta /></h2></div>
        <div className="formulario">
          <Interruptor ligado={r.freteGratis.ativo} rotuloVisivel="Frete grátis" aoMudar={(v) => setR((x) => ({ ...x, freteGratis: { ...x.freteGratis, ativo: v } }))} />
          {r.freteGratis.ativo && (
            <div className="minha-loja__linha-campos">
              <CampoDinheiro rotulo="Para pedidos a partir de" valor={r.freteGratis.pedidoMinimo} erro={err(erros.gerais.freteMinimo)} aoMudar={(v) => setR((x) => ({ ...x, freteGratis: { ...x.freteGratis, pedidoMinimo: v } }))} />
              <Campo rotulo="Até (km)" erro={err(erros.gerais.freteRaio)} ajuda="No mapa, é o contorno tracejado.">
                {(p) => <input {...p} className="campo__entrada" inputMode="decimal" value={r.freteGratis.raio} onChange={(e) => setR((x) => ({ ...x, freteGratis: { ...x.freteGratis, raio: e.target.value } }))} />}
              </Campo>
            </div>
          )}
          {r.quemEntrega !== 'propria' && <p className="bloco__nota">Com parceiro de logística, a loja paga a corrida mesmo quando o frete é grátis para o cliente.</p>}
        </div>
      </section>

      <section className="bloco" aria-labelledby="titulo-minimo">
        <div className="bloco__cabecalho"><h2 id="titulo-minimo">Pedido mínimo</h2></div>
        <div className="minha-loja__campo-curto">
          <CampoDinheiro rotulo="Valor mínimo do pedido para entrega" ajuda="Deixe em branco para não ter mínimo." valor={r.pedidoMinimo} erro={err(erros.gerais.pedidoMinimo)} aoMudar={(v) => setR((x) => ({ ...x, pedidoMinimo: v }))} />
        </div>
      </section>

      <BarraSalvar sujo={sujo} salvando={salvando} problemas={mostrarErros ? total : 0} aoSalvar={salvar} aoDescartar={() => { setR(salvo); setMostrarErros(false) }} />
      {avisoSaida}
    </div>
  )
}

export function Entrega() {
  const { lojaId, estadoForcado } = usePrototipo()
  return <EntregaLoja key={`${lojaId}-${estadoForcado === 'vazio'}`} />
}
