// T26. Funcionamento: semana com faixas, exceções e feriados (estes dois com selo de proposta).
import { useState } from 'react'
import { Copy, Pencil, Plus, Trash2 } from 'lucide-react'
import { usePrototipo } from '../../contexto/Prototipo.jsx'
import { useEhCelular, useTitulo } from '../../utilitarios/ganchos.js'
import { AGORA_REFERENCIA, dataExtenso, diaMes, hora } from '../../utilitarios/formatos.js'
import { DIAS_SEMANA, funcionamentoInicial } from '../../dados/minhaloja.js'
import { Botao, CabecalhoPagina, Campo, EstadoErro, EstadoVazio, FaixaAviso, Interruptor, SeloProposta, Sobreposicao } from '../../componentes/base.jsx'
import { BarraSalvar, EsqueletoBlocos, esperar, mudou, useAvisoSaida } from './MinhaLojaComum.jsx'
import '../../estilos/minhaloja.css'

const minutos = (h) => {
  const [a, b] = h.split(':').map(Number)
  return a * 60 + b
}
const nomeDia = (id) => DIAS_SEMANA.find((d) => d.id === id).nome
const textoFaixas = (d) => (d.aberto && d.faixas.length ? d.faixas.map((f) => `${f.inicio} às ${f.fim}`).join(' e ') : 'Fechado')
const copiarDia = (d) => ({ ...d, faixas: d.faixas.map((f) => ({ ...f })) })

// Avisos de um dia: faixa invertida ou faixas sobrepostas
export function problemasDoDia(d) {
  if (!d.aberto) return []
  const lista = []
  if (!d.faixas.length) lista.push('Dia aberto sem nenhuma faixa de horário.')
  d.faixas.forEach((f) => {
    if (!f.inicio || !f.fim) lista.push('Preencha o início e o fim de cada faixa.')
    else if (minutos(f.fim) <= minutos(f.inicio)) lista.push(`A faixa ${f.inicio} às ${f.fim} termina antes de começar. Para passar da meia-noite, vá até 23:59 e comece o dia seguinte às 00:00.`)
  })
  const ordenadas = d.faixas.filter((f) => f.inicio && f.fim).sort((a, b) => minutos(a.inicio) - minutos(b.inicio))
  for (let i = 1; i < ordenadas.length; i++) {
    if (minutos(ordenadas[i].inicio) < minutos(ordenadas[i - 1].fim)) {
      lista.push(`Faixas sobrepostas: ${ordenadas[i - 1].inicio} às ${ordenadas[i - 1].fim} e ${ordenadas[i].inicio} às ${ordenadas[i].fim}.`)
    }
  }
  return lista
}

const textoExcecao = (e) =>
  e.diaTodo ? `Loja fechada o dia todo em ${diaMes(e.inicio)}` : `Loja fechada de ${diaMes(e.inicio)} ${hora(e.inicio)} até ${diaMes(e.fim)} ${hora(e.fim)}`

// Linha do tempo de 0h a 24h, só visual
function LinhaDoTempo({ dia }) {
  return (
    <span className="funcionamento__linha" aria-hidden>
      {dia.aberto &&
        dia.faixas.filter((f) => f.inicio && f.fim && minutos(f.fim) > minutos(f.inicio)).map((f, i) => (
          <span key={i} className="funcionamento__trecho" style={{ left: `${(minutos(f.inicio) / 1440) * 100}%`, width: `${((minutos(f.fim) - minutos(f.inicio)) / 1440) * 100}%` }} />
        ))}
    </span>
  )
}

function EditorDia({ dia, aoFechar, aoAplicar, celular }) {
  const [d, setD] = useState(() => copiarDia(dia))
  const problemas = problemasDoDia(d)
  const nome = nomeDia(d.dia)
  const mudarFaixa = (i, campo, valor) => setD((x) => ({ ...x, faixas: x.faixas.map((f, j) => (j === i ? { ...f, [campo]: valor } : f)) }))
  return (
    <Sobreposicao
      aberto
      aoFechar={aoFechar}
      titulo={`Editar ${nome.toLowerCase()}`}
      subtitulo="A mudança só vale depois de Salvar."
      forma={celular ? 'folha' : 'lateral'}
      largura="440px"
      rodape={
        <>
          <Botao onClick={aoFechar}>Cancelar</Botao>
          <Botao variante="principal" disabled={problemas.length > 0} onClick={() => aoAplicar(d)}>Aplicar</Botao>
        </>
      }
    >
      <div className="formulario">
        <Interruptor
          ligado={d.aberto}
          rotuloVisivel={`${nome}, ${d.aberto ? 'aberto' : 'fechado'}`}
          aoMudar={(v) => setD((x) => ({ ...x, aberto: v, faixas: v && !x.faixas.length ? [{ inicio: '11:00', fim: '22:00' }] : x.faixas }))}
        />
        {d.aberto && (
          <>
            {d.faixas.map((f, i) => (
              <fieldset key={i} className="funcionamento__faixa">
                <legend>Faixa {i + 1}</legend>
                <Campo rotulo="Abre às">{(p) => <input {...p} type="time" className="campo__entrada" value={f.inicio} onChange={(e) => mudarFaixa(i, 'inicio', e.target.value)} />}</Campo>
                <Campo rotulo="Fecha às">{(p) => <input {...p} type="time" className="campo__entrada" value={f.fim} onChange={(e) => mudarFaixa(i, 'fim', e.target.value)} />}</Campo>
                <Botao variante="texto" icone={Trash2} aria-label={`Remover faixa ${i + 1}`} onClick={() => setD((x) => ({ ...x, faixas: x.faixas.filter((_, j) => j !== i) }))}>Remover</Botao>
              </fieldset>
            ))}
            <div>
              <Botao icone={Plus} onClick={() => setD((x) => ({ ...x, faixas: [...x.faixas, { inicio: '', fim: '' }] }))}>Adicionar faixa</Botao>
            </div>
            <p className="campo__ajuda">Use duas faixas para fechar no meio do dia, como 11:00 às 15:00 e 18:00 às 22:00.</p>
          </>
        )}
        {problemas.length > 0 && (
          <FaixaAviso tom="atencao">
            {problemas.map((p) => <p key={p}>{p}</p>)}
          </FaixaAviso>
        )}
      </div>
    </Sobreposicao>
  )
}

function CopiarDia({ dia, aoFechar, aoAplicar, celular }) {
  const outros = DIAS_SEMANA.filter((d) => d.id !== dia.dia)
  const [marcados, setMarcados] = useState(() => new Set())
  const todos = marcados.size === outros.length
  const alternar = (id) => setMarcados((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  return (
    <Sobreposicao
      aberto
      aoFechar={aoFechar}
      titulo={<>Copiar para outros dias <SeloProposta /></>}
      subtitulo={`${nomeDia(dia.dia)}: ${textoFaixas(dia)}`}
      forma={celular ? 'folha' : 'modal'}
      largura="440px"
      rodape={
        <>
          <Botao onClick={aoFechar}>Cancelar</Botao>
          <Botao variante="principal" disabled={!marcados.size} onClick={() => aoAplicar([...marcados])}>
            {marcados.size ? `Copiar para ${marcados.size} ${marcados.size === 1 ? 'dia' : 'dias'}` : 'Copiar'}
          </Botao>
        </>
      }
    >
      <fieldset className="minha-loja__grupo-marcar">
        <legend className="campo__rotulo">Copiar para</legend>
        <label className="minha-loja__marcar">
          <input type="checkbox" className="caixa" checked={todos} onChange={() => setMarcados(todos ? new Set() : new Set(outros.map((d) => d.id)))} />
          Todos os outros dias
        </label>
        {outros.map((d) => (
          <label key={d.id} className="minha-loja__marcar">
            <input type="checkbox" className="caixa" checked={marcados.has(d.id)} onChange={() => alternar(d.id)} />
            {d.nome}
          </label>
        ))}
      </fieldset>
      <p className="campo__ajuda">O horário dos dias marcados é substituído. A mudança só vale depois de Salvar.</p>
    </Sobreposicao>
  )
}

const dataDeCampos = (data, h) => {
  if (!data || !h) return null
  const [a, m, d] = data.split('-').map(Number)
  const [hh, mm] = h.split(':').map(Number)
  return new Date(a, m - 1, d, hh, mm)
}

function NovaExcecao({ aoFechar, aoCriar, celular }) {
  const [forma, setForma] = useState('dia')
  const [dia, setDia] = useState('')
  const [deData, setDeData] = useState('')
  const [deHora, setDeHora] = useState('18:00')
  const [ateData, setAteData] = useState('')
  const [ateHora, setAteHora] = useState('23:59')
  const [tentou, setTentou] = useState(false)

  let excecao = null
  let erro = null
  if (forma === 'dia') {
    const i = dataDeCampos(dia, '00:00')
    if (!i) erro = 'Escolha o dia em que a loja fica fechada.'
    else excecao = { inicio: i, fim: dataDeCampos(dia, '23:59'), diaTodo: true }
  } else {
    const i = dataDeCampos(deData, deHora)
    const f = dataDeCampos(ateData, ateHora)
    if (!i || !f) erro = 'Preencha quando a loja fecha e quando reabre.'
    else if (f <= i) erro = 'O fim precisa ser depois do início.'
    else excecao = { inicio: i, fim: f, diaTodo: false }
  }
  if (excecao && excecao.fim < AGORA_REFERENCIA) {
    erro = 'Essa data já passou. Escolha uma data a partir de hoje.'
    excecao = null
  }

  return (
    <Sobreposicao
      aberto
      aoFechar={aoFechar}
      titulo="Nova exceção"
      subtitulo="Para dias em que a loja fecha fora do normal."
      forma={celular ? 'folha' : 'modal'}
      largura="480px"
      rodape={
        <>
          <Botao onClick={aoFechar}>Cancelar</Botao>
          <Botao variante="principal" onClick={() => (excecao ? aoCriar(excecao) : setTentou(true))}>Adicionar exceção</Botao>
        </>
      }
    >
      <div className="formulario">
        <fieldset className="minha-loja__grupo-marcar">
          <legend className="campo__rotulo">Como a loja fica</legend>
          <label className="minha-loja__marcar">
            <input type="radio" name="forma-excecao" checked={forma === 'dia'} onChange={() => setForma('dia')} />
            Fechada o dia todo
          </label>
          <label className="minha-loja__marcar">
            <input type="radio" name="forma-excecao" checked={forma === 'periodo'} onChange={() => setForma('periodo')} />
            Fechada por um período
          </label>
        </fieldset>
        {forma === 'dia' ? (
          <Campo rotulo="Dia" erro={tentou && erro}>{(p) => <input {...p} type="date" className="campo__entrada" value={dia} onChange={(e) => setDia(e.target.value)} />}</Campo>
        ) : (
          <>
            <div className="minha-loja__linha-campos">
              <Campo rotulo="Fecha no dia">{(p) => <input {...p} type="date" className="campo__entrada" value={deData} onChange={(e) => setDeData(e.target.value)} />}</Campo>
              <Campo rotulo="às">{(p) => <input {...p} type="time" className="campo__entrada" value={deHora} onChange={(e) => setDeHora(e.target.value)} />}</Campo>
            </div>
            <div className="minha-loja__linha-campos">
              <Campo rotulo="Fechada até o dia">{(p) => <input {...p} type="date" className="campo__entrada" value={ateData} onChange={(e) => setAteData(e.target.value)} />}</Campo>
              <Campo rotulo="às">{(p) => <input {...p} type="time" className="campo__entrada" value={ateHora} onChange={(e) => setAteHora(e.target.value)} />}</Campo>
            </div>
            {tentou && erro && <p className="campo__erro" role="alert">{erro}</p>}
          </>
        )}
        {excecao && <p className="funcionamento__previa" aria-live="polite">{textoExcecao(excecao)}</p>}
      </div>
    </Sobreposicao>
  )
}

const ACOES_FERIADO = [
  { id: 'normal', rotulo: 'Abre no horário normal' },
  { id: 'fechado', rotulo: 'Fica fechada' },
  { id: 'especial', rotulo: 'Abre em horário especial' },
]

function problemaFeriado(f) {
  if (f.acao !== 'especial') return null
  if (!f.faixa.inicio || !f.faixa.fim) return 'Preencha o horário especial.'
  if (minutos(f.faixa.fim) <= minutos(f.faixa.inicio)) return 'O fechamento precisa ser depois da abertura.'
  return null
}

function CamposFeriado({ f, aoMudar }) {
  const erro = problemaFeriado(f)
  return (
    <div className="funcionamento__feriado-campos">
      <Campo rotulo={`O que a loja faz em ${f.nome}`}>
        {(p) => (
          <select {...p} className="campo__entrada" value={f.acao} onChange={(e) => aoMudar({ ...f, acao: e.target.value })}>
            {ACOES_FERIADO.map((a) => <option key={a.id} value={a.id}>{a.rotulo}</option>)}
          </select>
        )}
      </Campo>
      {f.acao === 'especial' && (
        <div className="minha-loja__linha-campos">
          <Campo rotulo="Abre às" erro={erro}>{(p) => <input {...p} type="time" className="campo__entrada" value={f.faixa.inicio} onChange={(e) => aoMudar({ ...f, faixa: { ...f.faixa, inicio: e.target.value } })} />}</Campo>
          <Campo rotulo="Fecha às">{(p) => <input {...p} type="time" className="campo__entrada" value={f.faixa.fim} onChange={(e) => aoMudar({ ...f, faixa: { ...f.faixa, fim: e.target.value } })} />}</Campo>
        </div>
      )}
    </div>
  )
}

function FuncionamentoLoja() {
  const { cenarioId, loja, estadoForcado, avisar } = usePrototipo()
  const celular = useEhCelular()
  useTitulo('Funcionamento')
  const [salvo, setSalvo] = useState(() => funcionamentoInicial(cenarioId, loja))
  const [r, setR] = useState(salvo)
  const [canal, setCanal] = useState('delivery')
  const [editando, setEditando] = useState(null)
  const [copiando, setCopiando] = useState(null)
  const [novaExcecao, setNovaExcecao] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [tentou, setTentou] = useState(false)
  const [comecou, setComecou] = useState(false)

  const sujo = mudou(r, salvo)
  const avisoSaida = useAvisoSaida(sujo)

  const chaveCanal = r.balcaoIgual ? 'delivery' : canal
  const semana = r[chaveCanal]
  const problemasSemana = (s) => s.filter((d) => problemasDoDia(d).length).length
  const problemas = problemasSemana(r.delivery) + (r.balcaoIgual ? 0 : problemasSemana(r.balcao)) + r.feriados.filter(problemaFeriado).length

  const mudarDia = (d) => setR((x) => ({ ...x, [chaveCanal]: x[chaveCanal].map((y) => (y.dia === d.dia ? d : y)) }))
  const copiarPara = (origem, destinos) => {
    setR((x) => ({ ...x, [chaveCanal]: x[chaveCanal].map((y) => (destinos.includes(y.dia) ? { ...copiarDia(origem), dia: y.dia } : y)) }))
    setCopiando(null)
    avisar(`Horário de ${nomeDia(origem.dia).toLowerCase()} copiado para ${destinos.length} ${destinos.length === 1 ? 'dia' : 'dias'}. Falta salvar.`, 'sucesso')
  }
  const mudarBalcaoIgual = (igual) => {
    setR((x) => ({ ...x, balcaoIgual: igual, balcao: igual ? x.balcao : x.delivery.map(copiarDia) }))
    setCanal('delivery')
  }

  const salvar = async () => {
    if (problemas) {
      avisar('Corrija os horários marcados antes de salvar.', 'erro')
      return
    }
    setSalvando(true)
    await esperar(700)
    const final = r.balcaoIgual ? { ...r, balcao: r.delivery.map(copiarDia) } : r
    setR(final)
    setSalvo(final)
    setSalvando(false)
    avisar('Horário de funcionamento salvo. Vale a partir de agora.', 'sucesso')
  }

  const cabecalho = <CabecalhoPagina titulo="Funcionamento" descricao={`Em que horários a ${loja.nome} recebe pedidos.`} />

  if (estadoForcado === 'carregando') return <div className="pagina">{cabecalho}<EsqueletoBlocos oQue="o horário de funcionamento" blocos={[7, 2, 4]} /></div>
  if (estadoForcado === 'erro' && !tentou) return <div className="pagina">{cabecalho}<EstadoErro oQue="o horário de funcionamento" aoTentar={() => setTentou(true)} /></div>
  if (estadoForcado === 'vazio' && !comecou) {
    return (
      <div className="pagina">
        {cabecalho}
        <EstadoVazio
          titulo="Nenhum horário cadastrado ainda."
          texto="Sem horário, a loja não abre sozinha. Comece pelos dias da semana; exceções e feriados vêm depois."
          acao={<Botao variante="principal" onClick={() => setComecou(true)}>Cadastrar horário</Botao>}
        />
      </div>
    )
  }

  const excecoes = [...r.excecoes].sort((a, b) => a.inicio - b.inicio)

  return (
    <div className="pagina minha-loja">
      {cabecalho}
      {loja.fechadaProgramada && (
        <FaixaAviso tom="info">Pelo horário programado da rede, esta loja abre só no almoço, das 11:00 às 15:00.</FaixaAviso>
      )}

      <section className="bloco" aria-labelledby="titulo-semana">
        <div className="bloco__cabecalho">
          <h2 id="titulo-semana">Semana</h2>
        </div>
        <fieldset className="funcionamento__balcao">
          <legend className="funcionamento__pergunta">O balcão abre no mesmo horário do delivery?</legend>
          <div className="funcionamento__opcoes">
            <label className={`funcionamento__opcao ${r.balcaoIgual ? 'funcionamento__opcao--marcada' : ''}`}>
              <input type="radio" name="balcao-horario" checked={r.balcaoIgual} onChange={() => mudarBalcaoIgual(true)} />
              <span><strong>Sim, mesmo horário</strong><span>Uma grade só vale para delivery e balcão.</span></span>
            </label>
            <label className={`funcionamento__opcao ${!r.balcaoIgual ? 'funcionamento__opcao--marcada' : ''}`}>
              <input type="radio" name="balcao-horario" checked={!r.balcaoIgual} onChange={() => mudarBalcaoIgual(false)} />
              <span><strong>Não, o balcão tem horário próprio</strong><span>Você monta uma grade para cada um.</span></span>
            </label>
          </div>
          {!r.balcaoIgual && (
            <div className="seletor-periodo" role="group" aria-label="Qual horário você está editando">
              {[['delivery', 'Horário do delivery'], ['balcao', 'Horário do balcão']].map(([id, rot]) => (
                <button key={id} type="button" className="seletor-periodo__opcao" aria-pressed={canal === id} onClick={() => setCanal(id)}>{rot}</button>
              ))}
            </div>
          )}
        </fieldset>
        {!celular && (
          <div className="funcionamento__regua" aria-hidden>
            <span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>24h</span>
          </div>
        )}
        <ul className="funcionamento__dias" aria-label={r.balcaoIgual ? 'Horário de delivery e balcão' : `Horário de ${canal === 'delivery' ? 'delivery' : 'balcão'}`}>
          {semana.map((d) => {
            const nome = nomeDia(d.dia)
            const avisos = problemasDoDia(d)
            return (
              <li key={d.dia} className="funcionamento__dia">
                <span className="funcionamento__chave">
                  <Interruptor
                    ligado={d.aberto}
                    rotuloVisivel={`${nome}, ${d.aberto ? 'aberto' : 'fechado'}`}
                    aoMudar={(v) => mudarDia({ ...d, aberto: v, faixas: v && !d.faixas.length ? [{ inicio: '11:00', fim: '22:00' }] : d.faixas })}
                  />
                </span>
                <span className="funcionamento__faixas">{textoFaixas(d)}</span>
                {!celular && <LinhaDoTempo dia={d} />}
                <span className="funcionamento__acoes">
                  <Botao tamanho="p" variante="texto" icone={Pencil} aria-label={`Editar ${nome.toLowerCase()}`} onClick={() => setEditando(d)}>Editar</Botao>
                  <Botao tamanho="p" variante="texto" icone={Copy} aria-label={`Copiar ${nome.toLowerCase()} para outros dias`} onClick={() => setCopiando(d)}>Copiar para outros dias</Botao>
                </span>
                {avisos.length > 0 && (
                  <span className="funcionamento__aviso campo__erro">{avisos[0]}</span>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      <section className="bloco" aria-labelledby="titulo-excecoes">
        <div className="bloco__cabecalho">
          <h2 id="titulo-excecoes">Exceções</h2>
          <Botao icone={Plus} onClick={() => setNovaExcecao(true)}>Nova exceção</Botao>
        </div>
        {excecoes.length ? (
          <ul className="funcionamento__excecoes">
            {excecoes.map((e) => (
              <li key={e.id}>
                <span>{textoExcecao(e)}</span>
                <Botao tamanho="p" variante="texto" icone={Trash2} aria-label={`Remover exceção: ${textoExcecao(e)}`} onClick={() => setR((x) => ({ ...x, excecoes: x.excecoes.filter((y) => y.id !== e.id) }))}>Remover</Botao>
              </li>
            ))}
          </ul>
        ) : (
          <EstadoVazio compacto titulo="Nenhuma exceção marcada." texto="Use para dias em que a loja fecha fora do normal, como reforma, viagem ou inventário." />
        )}
      </section>

      <section className="bloco" aria-labelledby="titulo-feriados">
        <div className="bloco__cabecalho">
          <h2 id="titulo-feriados">Feriados nacionais <SeloProposta /></h2>
        </div>
        <p className="bloco__sub funcionamento__sub">O que a loja faz em cada feriado. Feriados da sua cidade entram como exceção.</p>
        <ul className="funcionamento__feriados">
          {r.feriados.map((f) => (
            <li key={f.id} className="funcionamento__feriado">
              <span className="funcionamento__feriado-nome">
                <strong>{f.nome}</strong>
                <span className="texto-secundario">{dataExtenso(f.data)}</span>
              </span>
              <CamposFeriado f={f} aoMudar={(n) => setR((x) => ({ ...x, feriados: x.feriados.map((y) => (y.id === n.id ? n : y)) }))} />
            </li>
          ))}
        </ul>
      </section>

      <BarraSalvar sujo={sujo} salvando={salvando} problemas={problemas} aoSalvar={salvar} aoDescartar={() => setR(salvo)} />

      {editando && (
        <EditorDia celular={celular} dia={editando} aoFechar={() => setEditando(null)} aoAplicar={(d) => { mudarDia(d); setEditando(null) }} />
      )}
      {copiando && <CopiarDia celular={celular} dia={copiando} aoFechar={() => setCopiando(null)} aoAplicar={(destinos) => copiarPara(copiando, destinos)} />}
      {novaExcecao && (
        <NovaExcecao
          celular={celular}
          aoFechar={() => setNovaExcecao(false)}
          aoCriar={(e) => {
            setR((x) => ({ ...x, excecoes: [...x.excecoes, { ...e, id: `ex-${Date.now()}` }] }))
            setNovaExcecao(false)
            avisar(`${textoExcecao(e)}. Falta salvar.`, 'sucesso')
          }}
        />
      )}
      {avisoSaida}
    </div>
  )
}

export function Funcionamento() {
  const { lojaId } = usePrototipo()
  return <FuncionamentoLoja key={lojaId} />
}
