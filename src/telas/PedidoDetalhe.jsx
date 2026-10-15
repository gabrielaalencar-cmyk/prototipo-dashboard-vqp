// T07. Pedido, detalhe e estorno.
import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, ArrowLeft, Copy, Star, X } from 'lucide-react'
import { usePrototipo } from '../contexto/Prototipo.jsx'
import { dataCurta, hora, moeda } from '../utilitarios/formatos.js'
import { NOMES, PAGAMENTOS_ONLINE } from '../dados/pedidos.js'
import { Botao, Campo, FaixaAviso, Selo, Sobreposicao } from '../componentes/base.jsx'
import { SeloStatus } from './Pedidos.jsx'

const ESTADO_ESTORNO = {
  processando: { texto: 'Estorno em processamento', tom: 'azul' },
  concluido: { texto: 'Estorno concluído', tom: 'verde' },
  recusado: { texto: 'Estorno recusado', tom: 'vermelho' },
}

function motivoSemEstorno(pedido) {
  if (pedido.grupo === 'cancelado' && PAGAMENTOS_ONLINE.includes(pedido.pagamento)) {
    return 'Pedido cancelado: o valor volta ao cliente automaticamente pela forma de pagamento.'
  }
  if (pedido.grupo === 'cancelado') return 'Pedido cancelado antes do pagamento: não há valor a devolver.'
  if (!PAGAMENTOS_ONLINE.includes(pedido.pagamento)) {
    return `Estorno indisponível para "${pedido.pagamento}": o pagamento foi feito direto na loja ou ao entregador, então a devolução é feita pela loja, com o cliente.`
  }
  return null
}

function ModalEstorno({ aberto, aoFechar, pedido }) {
  const { estornar, avisar } = usePrototipo()
  const [valor, setValor] = useState(pedido.total.toFixed(2).replace('.', ','))
  const [motivo, setMotivo] = useState('')
  const [erros, setErros] = useState({})
  const [enviando, setEnviando] = useState(false)
  const [falha, setFalha] = useState(null)
  const enviado = useRef(false)

  useEffect(() => {
    if (aberto) {
      setValor(pedido.total.toFixed(2).replace('.', ','))
      setMotivo('')
      setErros({})
      setFalha(null)
      enviado.current = false
    }
  }, [aberto, pedido])

  const confirmar = async () => {
    // proteção contra clique duplo: ignora qualquer clique enquanto o primeiro está em andamento
    if (enviado.current) return
    const v = Number(valor.replace(/\./g, '').replace(',', '.'))
    const e = {}
    if (!v || v <= 0) e.valor = 'Informe um valor maior que zero.'
    else if (v > pedido.total) e.valor = `O valor não pode passar do total do pedido (${moeda(pedido.total)}).`
    if (!motivo.trim()) e.motivo = 'Conte o motivo do estorno. Ele aparece no histórico do pedido.'
    setErros(e)
    if (Object.keys(e).length) return
    enviado.current = true
    setEnviando(true)
    setFalha(null)
    try {
      await estornar(pedido.numero, { valor: v, motivo: motivo.trim() })
      avisar(`Estorno de ${moeda(v)} pedido. Acompanhe o andamento no pedido #${pedido.numero}.`, 'sucesso')
      aoFechar()
    } catch {
      enviado.current = false
      setFalha('Não foi possível pedir o estorno agora. Nada foi cobrado nem devolvido. Tente de novo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Sobreposicao
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={`Estornar pedido #${pedido.numero}`}
      subtitulo={`Total pago: ${moeda(pedido.total)} · ${pedido.pagamento}`}
      forma="modal"
      largura="480px"
      rodape={
        <>
          <Botao onClick={aoFechar}>Cancelar</Botao>
          <Botao variante="destrutivo" onClick={confirmar} carregando={enviando} mudaAlgo>
            Estornar {valor ? `R$ ${valor}` : ''}
          </Botao>
        </>
      }
    >
      <div className="formulario">
        <Campo rotulo="Valor a devolver" erro={erros.valor} ajuda={`Até ${moeda(pedido.total)}. Para devolver só uma parte, mude o valor.`}>
          {(props) => (
            <div className="campo__prefixo">
              <span aria-hidden>R$</span>
              <input {...props} className="campo__entrada" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value.replace(/[^\d,.]/g, ''))} data-foco-inicial />
            </div>
          )}
        </Campo>
        <Campo rotulo="Motivo" erro={erros.motivo} ajuda="Obrigatório. Fica registrado no histórico do pedido.">
          {(props) => <textarea {...props} className="campo__entrada" rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} />}
        </Campo>
        <FaixaAviso tom="atencao" icone={AlertTriangle}>
          O estorno não pode ser desfeito. O valor volta ao cliente pela mesma forma de pagamento, em até 2 dias úteis no Pix e até 2 faturas no cartão.
        </FaixaAviso>
        {falha && <FaixaAviso tom="erro" icone={AlertTriangle}>{falha}</FaixaAviso>}
      </div>
    </Sobreposicao>
  )
}

export function DetalhePedido({ pedido, aoFechar, telaCheia }) {
  const { avisar, pode, cen, lojaId } = usePrototipo()
  // clientes ligados aos pedidos pelo nome (src/dados/vendas.js)
  const idx = NOMES.indexOf(pedido.cliente.nome)
  const idCliente = idx < 0 ? null : cen.rede ? `${lojaId}-${idx}` : cen.id === 'pequena' && idx < 12 ? idx + 1 : null
  const [estornoAberto, setEstornoAberto] = useState(false)
  const titulo = useRef(null)
  const caixa = useRef(null)

  useEffect(() => {
    titulo.current?.focus()
  }, [pedido.numero])

  useEffect(() => {
    if (telaCheia) return
    const esc = (e) => {
      if (e.key === 'Escape' && !document.querySelector('.sobreposicao')) aoFechar()
    }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [aoFechar, telaCheia])

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(String(pedido.numero))
      avisar(`Número ${pedido.numero} copiado.`, 'sucesso')
    } catch {
      avisar(`Não foi possível copiar. O número é ${pedido.numero}.`)
    }
  }

  const semEstorno = motivoSemEstorno(pedido)
  const estorno = pedido.estorno
  const tempo = pedido.linhaDoTempo
  // no celular o detalhe é a tela inteira e leva o h1; no computador, a lista já tem o h1
  const Titulo = telaCheia ? 'h1' : 'h2'

  return (
    <aside ref={caixa} className={telaCheia ? 'pedido-cheio' : 'painel-pedido'} role={telaCheia ? undefined : 'dialog'} aria-modal={telaCheia ? undefined : 'false'} aria-labelledby="titulo-pedido">
      <header className="painel-pedido__topo">
        {telaCheia ? (
          <button type="button" className="botao botao--texto botao--voltar" onClick={aoFechar}>
            <ArrowLeft size={20} aria-hidden /> Voltar
          </button>
        ) : null}
        <div className="painel-pedido__titulos">
          <Titulo id="titulo-pedido" ref={titulo} tabIndex={-1}>
            Pedido #{pedido.numero}
          </Titulo>
          <p className="painel-pedido__quando">{dataCurta(pedido.criado)} · {pedido.modalidade}</p>
        </div>
        {!telaCheia && (
          <button type="button" className="botao botao--texto botao--icone" onClick={aoFechar} aria-label="Fechar detalhe do pedido">
            <X size={20} aria-hidden />
          </button>
        )}
      </header>

      <div className="painel-pedido__corpo">
        <div className="painel-pedido__resumo">
          <SeloStatus pedido={pedido} />
          <span className="painel-pedido__total">{moeda(pedido.total)}</span>
        </div>
        <div className="painel-pedido__acoes">
          <Botao icone={Copy} tamanho="p" onClick={copiar}>Copiar número</Botao>
          {pode('clientes') && idCliente && <Botao tamanho="p" para={`/clientes/${idCliente}`}>Ver cliente</Botao>}
        </div>

        {pedido.grupo === 'atencao' && (
          <FaixaAviso tom="erro" icone={AlertTriangle}>
            Sem mudança de status há {pedido.parado.minutos} minutos ({pedido.parado.etapa.toLowerCase()}). Confira no gestor de pedidos se ele está sendo preparado.
          </FaixaAviso>
        )}

        {pedido.avaliacao && (
          <section className="secao-pedido" aria-labelledby="sec-avaliacao">
            <h3 id="sec-avaliacao">Avaliação</h3>
            <p className="avaliacao">
              <span className="avaliacao__nota">
                <Star size={16} aria-hidden /> Nota {pedido.avaliacao.nota} de 5
              </span>
              <span className="avaliacao__texto">"{pedido.avaliacao.comentario}"</span>
              <span className="avaliacao__quando">{dataCurta(pedido.avaliacao.quando)}</span>
            </p>
          </section>
        )}

        <section className="secao-pedido" aria-labelledby="sec-itens">
          <h3 id="sec-itens">Itens</h3>
          <ul className="itens-pedido">
            {pedido.itens.map((i, idx) => (
              <li key={idx}>
                <span className="itens-pedido__qtd">{i.qtd}×</span>
                <span className="itens-pedido__nome">
                  {i.nome}
                  {i.complementos?.length > 0 && <span className="itens-pedido__comp">{i.complementos.join(', ')}</span>}
                  {i.obs && <span className="itens-pedido__obs">Observação: "{i.obs}"</span>}
                </span>
                <span className="itens-pedido__preco">{moeda(i.preco * i.qtd)}</span>
              </li>
            ))}
          </ul>
          <dl className="valores">
            <div><dt>Subtotal</dt><dd>{moeda(pedido.subtotal)}</dd></div>
            {pedido.modalidade === 'Delivery' && <div><dt>Taxa de entrega</dt><dd>{pedido.taxa ? moeda(pedido.taxa) : 'Grátis'}</dd></div>}
            {pedido.desconto > 0 && <div><dt>Desconto ({pedido.cupom})</dt><dd>− {moeda(pedido.desconto)}</dd></div>}
            <div className="valores__total"><dt>Total</dt><dd>{moeda(pedido.total)}</dd></div>
          </dl>
        </section>

        <section className="secao-pedido secao-pedido--duas" aria-label="Pagamento, entrega e cliente">
          <div>
            <h3>Pagamento</h3>
            <p>{pedido.pagamento}</p>
          </div>
          <div>
            <h3>{pedido.modalidade === 'Delivery' ? 'Entrega' : 'Modalidade'}</h3>
            <p>{pedido.modalidade}</p>
            {pedido.endereco && <p className="texto-secundario">{pedido.endereco}</p>}
          </div>
          <div>
            <h3>Cliente</h3>
            <p>{pedido.cliente.nome}</p>
            <p className="texto-secundario">{pedido.cliente.telefone}</p>
            <p className="texto-secundario">CPF {pedido.cliente.cpf}</p>
          </div>
        </section>

        <section className="secao-pedido" aria-labelledby="sec-tempo">
          <h3 id="sec-tempo">Linha do tempo</h3>
          <ol className="linha-tempo">
            {tempo.map((e, i) => (
              <li key={i} className={i === tempo.length - 1 ? 'linha-tempo__atual' : ''}>
                <span className="linha-tempo__hora">{hora(e.quando)}</span>
                <span className="linha-tempo__evento">
                  {e.texto}
                  {e.detalhe && <span className="linha-tempo__detalhe">{e.detalhe}</span>}
                </span>
              </li>
            ))}
            {estorno && (
              <li className="linha-tempo__estorno">
                <span className="linha-tempo__hora">{hora(estorno.pedidoEm)}</span>
                <span className="linha-tempo__evento">Estorno de {moeda(estorno.valor)} pedido<span className="linha-tempo__detalhe">{dataCurta(estorno.pedidoEm)}</span></span>
              </li>
            )}
          </ol>
        </section>

        <section className="secao-pedido" aria-labelledby="sec-estorno">
          <h3 id="sec-estorno">Estorno</h3>
          {estorno ? (
            <div className="estorno" aria-live="polite">
              <Selo tom={ESTADO_ESTORNO[estorno.estado].tom}>{ESTADO_ESTORNO[estorno.estado].texto}</Selo>
              <dl className="valores">
                <div><dt>Valor</dt><dd>{moeda(estorno.valor)}</dd></div>
                <div><dt>Motivo</dt><dd>{estorno.motivo}</dd></div>
                <div><dt>Pedido em</dt><dd>{dataCurta(estorno.pedidoEm)}</dd></div>
                {estorno.concluidoEm && <div><dt>{estorno.estado === 'recusado' ? 'Recusado em' : 'Concluído em'}</dt><dd>{dataCurta(estorno.concluidoEm)}</dd></div>}
              </dl>
              {estorno.estado === 'processando' && <p className="texto-secundario">O banco costuma responder em alguns minutos. Esta tela se atualiza sozinha.</p>}
              {estorno.estado === 'recusado' && <p className="texto-erro">{estorno.motivoRecusa}</p>}
            </div>
          ) : semEstorno ? (
            <p className="texto-secundario">{semEstorno}</p>
          ) : (
            <>
              <p className="texto-secundario">Devolva todo o valor ou parte dele ao cliente, pela mesma forma de pagamento.</p>
              <Botao variante="destrutivo-contorno" onClick={() => setEstornoAberto(true)} mudaAlgo>Estornar</Botao>
            </>
          )}
        </section>
      </div>

      {telaCheia && (
        <footer className="pedido-cheio__total">
          <span>Total</span>
          <strong>{moeda(pedido.total)}</strong>
        </footer>
      )}
      <ModalEstorno aberto={estornoAberto} aoFechar={() => setEstornoAberto(false)} pedido={pedido} />
    </aside>
  )
}
