// T31. Integrações: só o PDV e a conexão do receptor de pedidos com a base da VocêQPad (ajuste de 15/10).
// Não é em tempo real: disponibilidade por dia nos últimos 7 dias, em % de tempo online.
// Nenhum campo de credencial.
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePrototipo } from '../../contexto/Prototipo.jsx'
import { useEhCelular, useTitulo } from '../../utilitarios/ganchos.js'
import { AGORA_REFERENCIA, diaMes, hora, mesmoDia } from '../../utilitarios/formatos.js'
import { falhasPdvDaLoja, MOTIVOS_PEDIDO } from '../../dados/minhaloja.js'
import { Botao, CabecalhoPagina, EstadoErro, EstadoVazio, Esqueleto, Carregando, Indisponivel, Selo } from '../../componentes/base.jsx'
import { esperar } from './MinhaLojaComum.jsx'
import '../../estilos/minhaloja.css'

const ESTADO_PEDIDO = {
  pendente: { tom: 'ambar', texto: 'Pendente' },
  reenviado: { tom: 'azul', texto: 'Reenviado' },
  resolvido: { tom: 'verde', texto: 'Resolvido' },
}

const hoje = (d) => mesmoDia(d, AGORA_REFERENCIA)

// A tela não é em tempo real: a disponibilidade é consolidada a cada hora.
const ULTIMA_LEITURA = '19:30'
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MINUTOS_DIA = { pequena: 11 * 60, rede: 5.5 * 60 } // tempo de funcionamento considerado em cada dia

// Quedas fictícias por loja: [dias atrás, início, fim]. Hoje conta só até a última leitura.
const QUEDAS = {
  1001: { receptor: [[2, '20:10', '21:00']] },
  2101: { receptor: [[0, '14:10', '14:40'], [4, '19:05', '19:25']], pdv: [[0, '14:10', '14:40']] },
  2102: { receptor: [], pdv: [[3, '18:40', '19:10']] },
  2103: { receptor: [[1, '21:15', '21:30']] },
}

const paraMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }

function disponibilidade(lojaId, sistema, minutosDia) {
  const quedas = (QUEDAS[lojaId]?.[sistema] || [])
  return Array.from({ length: 7 }, (_, i) => {
    const atras = 6 - i
    const data = new Date(AGORA_REFERENCIA.getTime() - atras * 86400000)
    const doDia = quedas.filter((q) => q[0] === atras)
    const fora = doDia.reduce((s, q) => s + paraMin(q[2]) - paraMin(q[1]), 0)
    const pct = Math.max(0, 100 - (fora / minutosDia) * 100)
    return { data, hoje: atras === 0, fora, pct, intervalos: doDia.map((q) => `${q[1]}–${q[2]}`) }
  })
}

const fmtPct = (v) => `${v === 100 ? '100' : v.toFixed(1).replace('.', ',')}%`

function Disponibilidade({ titulo, descricao, dias, indisponivel }) {
  const media = dias.reduce((s, d) => s + d.pct, 0) / dias.length
  return (
    <section className="bloco integracoes__disp" aria-labelledby={`disp-${titulo}`}>
      <div className="bloco__cabecalho">
        <div>
          <h2 id={`disp-${titulo}`}>{titulo}</h2>
          <p className="bloco__sub">{descricao}</p>
        </div>
        {!indisponivel && (
          <div className="integracoes__media">
            <span className="rotulo-kpi">Online na semana</span>
            <span className="numero-kpi">{fmtPct(media)}</span>
          </div>
        )}
      </div>
      {indisponivel ? (
        <Indisponivel motivo="A fonte deste dado está fora do ar desde 18:10." />
      ) : (
        <ul className="integracoes__dias" aria-label={`${titulo}: tempo online por dia`}>
          {dias.map((d) => {
            const estado = d.pct === 100 ? { tom: 'verde', texto: 'Online o dia todo' } : d.pct === 0 ? { tom: 'vermelho', texto: 'Offline o dia todo' } : { tom: 'ambar', texto: 'Parcialmente offline' }
            return (
              <li key={d.data.toISOString()} className="integracoes__dia">
                <span className="integracoes__dia-nome">
                  {d.hoje ? 'Hoje' : DIAS_SEMANA[d.data.getDay()]} <span className="numero texto-secundario">{diaMes(d.data)}</span>
                </span>
                <span className="integracoes__barra" aria-hidden>
                  <span className="integracoes__barra-online" style={{ width: `${d.pct}%` }} />
                </span>
                <span className="numero integracoes__pct">{fmtPct(d.pct)}</span>
                <span className="integracoes__dia-estado">
                  <Selo tom={estado.tom}>{estado.texto}</Selo>
                  {d.fora > 0 && <span className="texto-secundario">Fora do ar <span className="numero">{d.intervalos.join(', ')}</span> ({d.fora} min)</span>}
                  {d.hoje && <span className="texto-secundario">Até {ULTIMA_LEITURA}</span>}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function SistemasDaLoja({ loja, cenarioId, semPdv }) {
  const pdv = semPdv ? null : { nome: '3S Checkout', versao: 'integração por API', desde: 'março de 2025' }
  return (
    <section className="integracoes__sistemas" aria-label="Sistemas ligados à loja">
      <div className="integracoes__sistema">
        <span className="rotulo-kpi">PDV integrado</span>
        {pdv ? (
          <>
            <strong className="integracoes__sistema-nome">{pdv.nome}</strong>
            <span className="texto-secundario">{pdv.versao} · desde {pdv.desde}</span>
          </>
        ) : (
          <>
            <strong className="integracoes__sistema-nome">Nenhum</strong>
            <span className="texto-secundario">A {loja.nome} recebe os pedidos só pelo receptor de pedidos da VocêQPad.</span>
          </>
        )}
      </div>
      <div className="integracoes__sistema">
        <span className="rotulo-kpi">Receptor de pedidos</span>
        <strong className="integracoes__sistema-nome">Gestor de pedidos VocêQPad</strong>
        <span className="texto-secundario">Liga o computador ou tablet da loja à base da VocêQPad{cenarioId === 'rede' ? '; recebe e repassa os pedidos ao PDV' : ''}.</span>
      </div>
      <p className="integracoes__leitura">Esta tela não é em tempo real: a disponibilidade é consolidada a cada hora. Última leitura às <span className="numero">{ULTIMA_LEITURA}</span>.</p>
    </section>
  )
}

function AcoesPedido({ f, aoReenviar, reenviando, celular }) {
  if (f.estado === 'resolvido') return <span className="texto-secundario">Entrou no PDV.</span>
  const largo = celular ? 'botao--largo' : ''
  return (
    <div className="integracoes__acoes">
      {f.produtoId && (
        <Botao tamanho={celular ? undefined : 'p'} variante="principal" className={largo} para={`/cardapio/produto/${f.produtoId}`}>
          Corrigir código no cardápio
        </Botao>
      )}
      <Botao
        tamanho={celular ? undefined : 'p'}
        className={largo}
        onClick={() => aoReenviar(f)}
        carregando={reenviando}
        disabled={f.estado === 'reenviado'}
        mudaAlgo
        aria-label={`Reenviar pedido ${f.numero}`}
      >
        Reenviar pedido
      </Botao>
      <Botao tamanho={celular ? undefined : 'p'} variante="texto" className={largo} para="/ajuda" aria-label={`Falar com o suporte sobre o pedido ${f.numero}`}>
        Falar com o suporte
      </Botao>
    </div>
  )
}

function Motivo({ f }) {
  return (
    <div className="integracoes__motivo-pedido">
      <span>{f.texto}.</span>
      {f.tentativas > 1 && <span className="texto-secundario">Recusado <span className="numero">{f.tentativas}</span> vezes pelo mesmo motivo.</span>}
      <details className="integracoes__tecnico">
        <summary>Detalhe técnico</summary>
        <code className="numero">{f.tecnico}</code>
      </details>
    </div>
  )
}

function FalhasPedidos({ semPdv, pdvSemInternet, falhas, aoReenviar, reenviando, celular, indisponivel }) {
  let corpo
  if (semPdv) {
    corpo = <p className="integracoes__nada">Sua loja não usa PDV integrado.</p>
  } else if (indisponivel) {
    corpo = <Indisponivel motivo="O PDV não respondeu a lista de pedidos recusados." />
  } else if (!falhas.length) {
    corpo = (
      <p className="integracoes__nada">
        Nenhuma falha hoje.
        {pdvSemInternet && ' Os pedidos feitos sem internet ficam guardados e entram no PDV quando a conexão voltar.'}
      </p>
    )
  } else if (celular) {
    corpo = (
      <ul className="minha-loja__lista-status minha-loja__lista-status--cartoes">
        {falhas.map((f) => (
          <li key={f.id}>
            <span className="integracoes__falha-topo">
              <Link to={`/pedidos/${f.numero}`} className="numero">Pedido {f.numero}</Link>
              <Selo tom={ESTADO_PEDIDO[f.estado].tom}>{ESTADO_PEDIDO[f.estado].texto}</Selo>
            </span>
            <span className="texto-secundario">Às <span className="numero">{hora(f.criado)}</span></span>
            <Motivo f={f} />
            <AcoesPedido f={f} aoReenviar={aoReenviar} reenviando={reenviando === f.id} celular />
          </li>
        ))}
      </ul>
    )
  } else {
    corpo = (
      <div className="tabela-rolagem">
        <table className="tabela tabela--compacta integracoes__tabela-pedidos">
          <caption className="visualmente-oculto">Pedidos de hoje que não entraram no PDV, com motivo, estado e ação</caption>
          <thead>
            <tr>
              <th scope="col">Pedido</th>
              <th scope="col">Horário</th>
              <th scope="col">Motivo</th>
              <th scope="col">Estado</th>
              <th scope="col"><span className="visualmente-oculto">Ações</span></th>
            </tr>
          </thead>
          <tbody>
            {falhas.map((f) => (
              <tr key={f.id}>
                <th scope="row" className="integracoes__nome"><Link to={`/pedidos/${f.numero}`} className="numero">{f.numero}</Link></th>
                <td className="numero">{hora(f.criado)}</td>
                <td><Motivo f={f} /></td>
                <td><Selo tom={ESTADO_PEDIDO[f.estado].tom}>{ESTADO_PEDIDO[f.estado].texto}</Selo></td>
                <td><AcoesPedido f={f} aoReenviar={aoReenviar} reenviando={reenviando === f.id} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }
  return (
    <section className="bloco" aria-labelledby="titulo-pedidos-pdv">
      <div className="bloco__cabecalho"><h2 id="titulo-pedidos-pdv">Pedidos que não entraram no PDV</h2></div>
      {!semPdv && <p className="integracoes__explica">O pedido chegou à VocêQPad, mas o PDV não aceitou. O cliente não é afetado; a loja precisa lançar ou reenviar.</p>}
      {corpo}
    </section>
  )
}

function TodasIntegracoes({ lista, celular, indisponivel }) {
  if (celular) {
    return (
      <ul className="minha-loja__lista-status minha-loja__lista-status--cartoes">
        {lista.map((i) => (
          <li key={i.id}>
            <span className="minha-loja__lista-nome">
              <strong>{i.nomeExibido}</strong>
              <span className="texto-secundario">{i.serve}</span>
            </span>
            <Selo tom={ESTADO[i.estado].tom}>{ESTADO[i.estado].texto}</Selo>
            <Desde item={i} indisponivel={indisponivel} />
          </li>
        ))}
      </ul>
    )
  }
  return (
    <div className="tabela-rolagem">
      <table className="tabela tabela--compacta">
        <caption className="visualmente-oculto">Integrações da loja, com status e desde quando</caption>
        <thead>
          <tr>
            <th scope="col">Integração</th>
            <th scope="col">Status</th>
            <th scope="col">Desde quando</th>
          </tr>
        </thead>
        <tbody>
          {lista.map((i) => (
            <tr key={i.id}>
              <th scope="row" className="integracoes__nome">
                <span className="tabela__principal">{i.nomeExibido}</span>
                <span className="tabela__secundario">{i.serve}</span>
              </th>
              <td><Selo tom={ESTADO[i.estado].tom}>{ESTADO[i.estado].texto}</Selo></td>
              <td><Desde item={i} indisponivel={indisponivel} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function IntegracoesTela() {
  const { cenarioId, loja, dadosLoja, estadoLoja, cardapio, estadoForcado, pedidosDaLoja, lojaId, avisar } = usePrototipo()
  const celular = useEhCelular()
  useTitulo('Integrações')
  const [tentou, setTentou] = useState(false)
  const [reenviando, setReenviando] = useState(null)

  const vazio = estadoForcado === 'vazio'
  const indisponivel = estadoForcado === 'indisponivel'
  const semPdv = !!loja?.semPdv

  const iniciais = useMemo(() => falhasPdvDaLoja(loja, pedidosDaLoja(lojaId), cardapio, hoje), [loja, lojaId, pedidosDaLoja, cardapio])
  const [falhas, setFalhas] = useState(iniciais)
  const mudarFalha = (id, mudanca) => setFalhas((fs) => fs.map((f) => (f.id === id ? { ...f, ...mudanca(f) } : f)))

  // Simulação: sem corrigir a causa, o PDV recusa de novo pelo mesmo motivo
  const reenviar = async (f) => {
    setReenviando(f.id)
    await esperar(800)
    setReenviando(null)
    if (MOTIVOS_PEDIDO[f.motivo].corrigivel) {
      mudarFalha(f.id, (x) => ({ tentativas: x.tentativas + 1 }))
      const causa = f.texto.split(':')[0]
      avisar(`O PDV recusou o pedido ${f.numero} de novo: ${causa[0].toLowerCase()}${causa.slice(1)}.`, 'erro')
      return
    }
    mudarFalha(f.id, () => ({ estado: 'reenviado' }))
    avisar(`Pedido ${f.numero} reenviado ao PDV.`, 'sucesso')
    await esperar(1500)
    mudarFalha(f.id, () => ({ estado: 'resolvido' }))
  }

  const minutosDia = MINUTOS_DIA[cenarioId === 'rede' ? 'rede' : 'pequena']
  const receptor = disponibilidade(loja.id, 'receptor', minutosDia)
  const dispPdv = disponibilidade(loja.id, 'pdv', minutosDia)

  const cabecalho = <CabecalhoPagina titulo="Integrações" descricao={`O PDV da ${loja.nome} e a conexão do receptor de pedidos com a VocêQPad.`} />

  let conteudo
  if (estadoForcado === 'carregando') {
    conteudo = (
      <Carregando oQue="as integrações">
        <Esqueleto linhas={1} altura="88px" />
        <div className="tabela-esqueleto">{Array.from({ length: 7 }, (_, i) => <Esqueleto key={i} linhas={1} altura="36px" />)}</div>
      </Carregando>
    )
  } else if (estadoForcado === 'erro' && !tentou) {
    conteudo = <EstadoErro oQue="as integrações" aoTentar={() => setTentou(true)} />
  } else if (vazio || cenarioId === 'nova') {
    conteudo = (
      <>
        <SistemasDaLoja loja={loja} cenarioId={cenarioId} semPdv={semPdv} />
        <EstadoVazio titulo="Ainda não há histórico de conexão." texto="A disponibilidade aparece depois do primeiro dia com o receptor de pedidos ligado." />
      </>
    )
  } else {
    conteudo = (
      <div className="minha-loja__blocos">
        <SistemasDaLoja loja={loja} cenarioId={cenarioId} semPdv={semPdv} />
        <Disponibilidade
          titulo="Receptor de pedidos"
          descricao="Tempo em que o receptor da loja ficou conectado à base da VocêQPad, nos últimos 7 dias, dentro do horário de funcionamento. Sem conexão (por exemplo, sem internet na loja), pedidos novos podem não chegar."
          dias={receptor}
          indisponivel={indisponivel}
        />
        {!semPdv && (
          <Disponibilidade
            titulo="Conexão com o PDV (3S Checkout)"
            descricao="Tempo em que o PDV respondeu ao receptor de pedidos, nos últimos 7 dias, dentro do horário de funcionamento."
            dias={dispPdv}
            indisponivel={indisponivel}
          />
        )}
        <FalhasPedidos
          semPdv={semPdv}
          pdvSemInternet={false}
          falhas={falhas}
          aoReenviar={reenviar}
          reenviando={reenviando}
          celular={celular}
          indisponivel={indisponivel}
        />
      </div>
    )
  }

  return (
    <div className="pagina minha-loja">
      {cabecalho}
      {conteudo}
      <p className="nota-pe">Chaves e credenciais ficam com a equipe de implantação. Para conectar ou trocar o PDV, fale com o suporte.</p>
    </div>
  )
}

export function Integracoes() {
  const { lojaId, cenarioId } = usePrototipo()
  return <IntegracoesTela key={`${cenarioId}-${lojaId}`} />
}
