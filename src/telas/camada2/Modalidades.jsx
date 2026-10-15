// T28. Modalidades e pedidos (proposta de migração): um cartão por modalidade, com tempo estimado
// (mínimo e máximo) e, só no delivery, o tempo de preparo antes de chamar o entregador; agendamento e taxa de serviço (estes dois com a nota "se fizerem parte da oferta").
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { usePrototipo } from '../../contexto/Prototipo.jsx'
import { useTitulo } from '../../utilitarios/ganchos.js'
import { DIAS_SEMANA, modalidadesIniciais } from '../../dados/minhaloja.js'
import { CabecalhoPagina, Campo, EstadoErro, EstadoVazio, Interruptor, Selo } from '../../componentes/base.jsx'
import { BarraSalvar, EsqueletoBlocos, esperar, lerNumero, mudou, useAvisoSaida } from './MinhaLojaComum.jsx'
import '../../estilos/minhaloja.css'

const TEMPO_MAXIMO = 240
const invalido = (n) => n == null || Number.isNaN(n)

function validar(r) {
  const erros = {}
  r.modalidades.forEach((m) => {
    if (!m.ativo) return
    const e = {}
    const min = lerNumero(m.pedidoMinimo)
    const max = lerNumero(m.pedidoMaximo)
    const qtd = lerNumero(m.qtdMaxima)
    const tMin = lerNumero(m.tempoMin)
    const tMax = lerNumero(m.tempoMax)
    if (min != null && (Number.isNaN(min) || min < 0)) e.pedidoMinimo = 'Informe um valor em reais, como 20,00.'
    if (max != null && (Number.isNaN(max) || max <= 0)) e.pedidoMaximo = 'Informe um valor em reais, como 300,00.'
    else if (max != null && min != null && max <= min) e.pedidoMaximo = 'O máximo precisa ser maior que o mínimo.'
    if (qtd != null && (Number.isNaN(qtd) || qtd < 1 || !Number.isInteger(qtd))) e.qtdMaxima = 'Use um número inteiro, como 15.'
    if (invalido(tMin) || tMin <= 0) e.tempoMin = 'Informe o tempo mínimo em minutos.'
    else if (tMin > TEMPO_MAXIMO) e.tempoMin = `Use até ${TEMPO_MAXIMO} minutos.`
    if (invalido(tMax) || tMax <= 0) e.tempoMax = 'Informe o tempo máximo em minutos.'
    else if (tMax > TEMPO_MAXIMO) e.tempoMax = `Use até ${TEMPO_MAXIMO} minutos.`
    else if (!e.tempoMin && tMax < tMin) e.tempoMax = 'O máximo precisa ser maior ou igual ao mínimo.'
    if (m.id === 'delivery') {
      const preparo = lerNumero(m.preparo)
      if (invalido(preparo) || preparo < 0) e.preparo = 'Informe o tempo de preparo em minutos (use 0 para chamar na hora).'
      else if (preparo > TEMPO_MAXIMO) e.preparo = `Use até ${TEMPO_MAXIMO} minutos.`
    }
    if (Object.keys(e).length) erros[m.id] = e
  })
  if (r.agendamento.ativo) {
    if (!r.agendamento.dias.length) erros.agDias = 'Escolha ao menos um dia.'
    if (!r.agendamento.inicio || !r.agendamento.fim || r.agendamento.fim <= r.agendamento.inicio) erros.agHorario = 'O fim precisa ser depois do início.'
    const lim = lerNumero(r.agendamento.limite)
    if (invalido(lim) || lim < 1) erros.agLimite = 'Informe quantos pedidos cabem em cada meia hora.'
  }
  if (r.taxaServico.ativo) {
    const pct = lerNumero(r.taxaServico.percentual)
    if (invalido(pct) || pct <= 0 || pct > 20) erros.taxa = 'Use um percentual entre 1 e 20.'
  }
  const total = Object.values(erros).reduce((s, e) => s + (typeof e === 'string' ? 1 : Object.keys(e).length), 0)
  return { erros, total }
}

function CampoUnidade({ rotulo, prefixo, sufixo, valor, aoMudar, erro, ajuda, modo = 'decimal' }) {
  return (
    <Campo rotulo={rotulo} erro={erro} ajuda={ajuda}>
      {(p) => (
        <span className="campo__prefixo">
          {prefixo && <span aria-hidden>{prefixo}</span>}
          <input {...p} className="campo__entrada" inputMode={modo} value={valor} onChange={(e) => aoMudar(e.target.value)} />
          {sufixo && <span aria-hidden className="minha-loja__sufixo">{sufixo}</span>}
        </span>
      )}
    </Campo>
  )
}

const TEMPO_ROTULO = {
  delivery: 'Tempo de entrega informado ao cliente',
  levar: 'Tempo estimado para retirar',
  aqui: 'Tempo estimado para servir',
}

// Como o cliente vê: "de 30 a 45 min"
function previaTempo(m) {
  const a = lerNumero(m.tempoMin)
  const b = lerNumero(m.tempoMax)
  if (!(a > 0) || !(b > 0)) return 'O cliente vê o intervalo no app.'
  return `O cliente vê no app: ${a === b ? `${a} min` : `de ${a} a ${b} min`}.`
}

function NotaOferta() {
  return <Selo tom="neutro" ponto={false}>Se fizerem parte da oferta</Selo>
}

function ModalidadesLoja() {
  const { cenarioId, loja, dadosLoja, estadoForcado, avisar } = usePrototipo()
  useTitulo('Modalidades e pedidos')
  const [salvo, setSalvo] = useState(() => {
    const ini = modalidadesIniciais(cenarioId)
    return estadoForcado === 'vazio' ? { ...ini, modalidades: ini.modalidades.map((m) => ({ ...m, ativo: false })) } : ini
  })
  const [r, setR] = useState(salvo)
  const [salvando, setSalvando] = useState(false)
  const [tentou, setTentou] = useState(false)
  const [mostrarErros, setMostrarErros] = useState(false)
  const sujo = mudou(r, salvo)
  const avisoSaida = useAvisoSaida(sujo)
  const { erros, total } = validar(r)
  const err = (e) => (mostrarErros ? e : undefined)
  const semArea = !!dadosLoja?.semAreaEntrega

  const mudarModalidade = (id, campo, v) => setR((x) => ({ ...x, modalidades: x.modalidades.map((m) => (m.id === id ? { ...m, [campo]: v } : m)) }))
  const mudarAg = (campo, v) => setR((x) => ({ ...x, agendamento: { ...x.agendamento, [campo]: v } }))
  const alternarDia = (id) => mudarAg('dias', r.agendamento.dias.includes(id) ? r.agendamento.dias.filter((d) => d !== id) : [...r.agendamento.dias, id])

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
    avisar('Modalidades salvas. O app mostra as mudanças no próximo pedido.', 'sucesso')
  }

  const cabecalho = <CabecalhoPagina titulo="Modalidades e pedidos" descricao={`Como o cliente pode pedir na ${loja.nome}.`} />
  if (estadoForcado === 'carregando') return <div className="pagina">{cabecalho}<EsqueletoBlocos oQue="as modalidades" blocos={[5, 5, 5]} /></div>
  if (estadoForcado === 'erro' && !tentou) return <div className="pagina">{cabecalho}<EstadoErro oQue="as modalidades" aoTentar={() => setTentou(true)} /></div>

  const nenhumaAtiva = r.modalidades.every((m) => !m.ativo)

  return (
    <div className="pagina minha-loja">
      {cabecalho}

      {nenhumaAtiva && (
        <EstadoVazio compacto titulo="Nenhuma modalidade ativa." texto="Com todas desligadas, a loja não recebe pedidos pelo app nem pelo cardápio web. Ligue ao menos uma." />
      )}

      <div className="minha-loja__blocos">
        {r.modalidades.map((m) => {
          const e = erros[m.id] || {}
          const bloqueadaPorArea = m.id === 'delivery' && semArea
          return (
            <section key={m.id} className="bloco modalidades__cartao" aria-labelledby={`mod-${m.id}`}>
              <div className="bloco__cabecalho">
                <h2 id={`mod-${m.id}`}>{m.nome}</h2>
                <Interruptor ligado={m.ativo} rotulo={`${m.nome} ativo`} disabled={bloqueadaPorArea} aoMudar={(v) => mudarModalidade(m.id, 'ativo', v)} />
              </div>
              {bloqueadaPorArea ? (
                <p className="texto-corpo">
                  Sem área de entrega o delivery não pode abrir. <Link to="/minha-loja/entrega" className="link">Criar a área de entrega</Link>
                </p>
              ) : !m.ativo ? (
                <p className="texto-secundario">Desligado. O cliente não vê {m.nome} no app nem no cardápio web.</p>
              ) : (
                <div className="modalidades__campos">
                  <fieldset className="modalidades__largo modalidades__tempo">
                    <legend className="campo__rotulo">{TEMPO_ROTULO[m.id]}</legend>
                    <div className="modalidades__tempo-campos">
                      <CampoUnidade rotulo="De" sufixo="min" modo="numeric" valor={m.tempoMin} erro={err(e.tempoMin)} aoMudar={(v) => mudarModalidade(m.id, 'tempoMin', v)} />
                      <CampoUnidade rotulo="Até" sufixo="min" modo="numeric" valor={m.tempoMax} erro={err(e.tempoMax)} aoMudar={(v) => mudarModalidade(m.id, 'tempoMax', v)} />
                    </div>
                    <p className="campo__ajuda">{previaTempo(m)}</p>
                  </fieldset>
                  {m.id === 'delivery' && (
                    <div className="modalidades__largo modalidades__preparo">
                      <CampoUnidade
                        rotulo="Tempo de preparo antes de chamar o entregador"
                        sufixo="min"
                        modo="numeric"
                        valor={m.preparo}
                        erro={err(e.preparo)}
                        ajuda="Quanto tempo o pedido espera, depois de aceito, até a logística integrada ser chamada automaticamente. Assim o entregador chega quando o pedido está pronto."
                        aoMudar={(v) => mudarModalidade(m.id, 'preparo', v)}
                      />
                    </div>
                  )}
                  <CampoUnidade rotulo="Pedido mínimo" prefixo="R$" valor={m.pedidoMinimo} erro={err(e.pedidoMinimo)} ajuda="Em branco: sem mínimo." aoMudar={(v) => mudarModalidade(m.id, 'pedidoMinimo', v)} />
                  <CampoUnidade rotulo="Pedido máximo" prefixo="R$" valor={m.pedidoMaximo} erro={err(e.pedidoMaximo)} ajuda="Em branco: sem máximo." aoMudar={(v) => mudarModalidade(m.id, 'pedidoMaximo', v)} />
                  <CampoUnidade rotulo="Quantidade máxima de produtos" sufixo="itens" modo="numeric" valor={m.qtdMaxima} erro={err(e.qtdMaxima)} ajuda="Ajuda a evitar fraude." aoMudar={(v) => mudarModalidade(m.id, 'qtdMaxima', v)} />
                  <div className="modalidades__texto">
                    <Campo rotulo="Texto de orientação ao cliente" ajuda="Aparece no app ao escolher esta modalidade.">
                      {(p) => <textarea {...p} className="campo__entrada" rows={2} maxLength={140} value={m.texto} onChange={(ev) => mudarModalidade(m.id, 'texto', ev.target.value)} />}
                    </Campo>
                  </div>
                </div>
              )}
            </section>
          )
        })}

        <section className="bloco" aria-labelledby="titulo-agendamento">
          <div className="bloco__cabecalho">
            <h2 id="titulo-agendamento">Agendamento de pedidos</h2>
            <NotaOferta />
          </div>
          <div className="formulario">
            <Interruptor ligado={r.agendamento.ativo} rotuloVisivel="Aceitar pedidos agendados" aoMudar={(v) => mudarAg('ativo', v)} />
            {r.agendamento.ativo && (
              <>
                <fieldset className="minha-loja__grupo-marcar minha-loja__grupo-marcar--linha">
                  <legend className="campo__rotulo">Dias</legend>
                  {DIAS_SEMANA.map((d) => (
                    <label key={d.id} className="minha-loja__marcar">
                      <input type="checkbox" className="caixa" checked={r.agendamento.dias.includes(d.id)} onChange={() => alternarDia(d.id)} />
                      {d.nome}
                    </label>
                  ))}
                  {mostrarErros && erros.agDias && <p className="campo__erro">{erros.agDias}</p>}
                </fieldset>
                <div className="minha-loja__linha-campos">
                  <Campo rotulo="Das" erro={err(erros.agHorario)}>{(p) => <input {...p} type="time" className="campo__entrada" value={r.agendamento.inicio} onChange={(e) => mudarAg('inicio', e.target.value)} />}</Campo>
                  <Campo rotulo="Até">{(p) => <input {...p} type="time" className="campo__entrada" value={r.agendamento.fim} onChange={(e) => mudarAg('fim', e.target.value)} />}</Campo>
                  <CampoUnidade rotulo="Limite por meia hora" sufixo="pedidos" modo="numeric" valor={r.agendamento.limite} erro={err(erros.agLimite)} aoMudar={(v) => mudarAg('limite', v)} />
                </div>
              </>
            )}
          </div>
        </section>

        <section className="bloco" aria-labelledby="titulo-taxa">
          <div className="bloco__cabecalho">
            <h2 id="titulo-taxa">Taxa de serviço</h2>
            <NotaOferta />
          </div>
          <div className="formulario">
            <Interruptor ligado={r.taxaServico.ativo} rotuloVisivel="Cobrar taxa de serviço" aoMudar={(v) => setR((x) => ({ ...x, taxaServico: { ...x.taxaServico, ativo: v } }))} />
            {r.taxaServico.ativo && (
              <div className="minha-loja__campo-curto">
                <CampoUnidade rotulo="Percentual sobre o pedido" sufixo="%" valor={r.taxaServico.percentual} erro={err(erros.taxa)} ajuda="Aparece separada no resumo do pedido." aoMudar={(v) => setR((x) => ({ ...x, taxaServico: { ...x.taxaServico, percentual: v } }))} />
              </div>
            )}
          </div>
        </section>
      </div>

      <BarraSalvar sujo={sujo} salvando={salvando} problemas={mostrarErros ? total : 0} aoSalvar={salvar} aoDescartar={() => { setR(salvo); setMostrarErros(false) }} />
      {avisoSaida}
    </div>
  )
}

export function Modalidades() {
  const { lojaId, estadoForcado } = usePrototipo()
  return <ModalidadesLoja key={`${lojaId}-${estadoForcado === 'vazio'}`} />
}
