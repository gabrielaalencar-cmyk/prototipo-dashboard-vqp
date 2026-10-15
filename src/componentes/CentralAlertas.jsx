// T05. Central de alertas: painel lateral no computador, tela cheia no celular.
import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { usePrototipo } from '../contexto/Prototipo.jsx'
import { useEhCelular } from '../utilitarios/ganchos.js'
import { dataCurta } from '../utilitarios/formatos.js'
import { Botao, Carregando, EstadoVazio, Esqueleto, Selo, Sobreposicao } from './base.jsx'
import { ItemAcao } from './ItemAcao.jsx'

export function CentralAlertas() {
  const { sobreposicao, fechar, alertasAtivos, alertasDispensados, dispensarAlerta, restaurarAlerta, marcarLidos, estadoForcado, temSeletor, horaAgora } = usePrototipo()
  const celular = useEhCelular()
  const aberto = sobreposicao?.tipo === 'alertas'
  const [verDispensados, setVerDispensados] = useState(false)
  const [falhou, setFalhou] = useState(true)
  const [tentando, setTentando] = useState(false)

  useEffect(() => {
    if (aberto) {
      marcarLidos()
      setFalhou(true)
    }
  }, [aberto]) // eslint-disable-line react-hooks/exhaustive-deps

  const vazio = estadoForcado === 'vazio' || alertasAtivos.length === 0
  const erro = estadoForcado === 'erro' && falhou

  let corpo
  if (estadoForcado === 'carregando') {
    corpo = (
      <Carregando oQue="os alertas">
        <div className="lista-esqueleto">{[0, 1, 2].map((i) => <Esqueleto key={i} linhas={3} />)}</div>
      </Carregando>
    )
  } else if (erro) {
    corpo = (
      <div className="estado estado--erro" role="alert">
        <p className="estado__titulo">Não foi possível verificar os alertas agora.</p>
        <div className="estado__acoes">
          <Botao carregando={tentando} onClick={() => { setTentando(true); setTimeout(() => { setTentando(false); setFalhou(false) }, 900) }}>
            Tentar de novo
          </Botao>
        </div>
      </div>
    )
  } else if (vazio) {
    corpo = <EstadoVazio titulo="Nada pedindo atenção." texto={`Última verificação às ${horaAgora}.`} />
  } else {
    corpo = (
      <ul className="lista-acoes lista-acoes--alertas">
        {alertasAtivos.map((a) => (
          <ItemAcao key={a.id} item={a} mostrarLoja={temSeletor} aoDispensar={dispensarAlerta} />
        ))}
      </ul>
    )
  }

  return (
    <Sobreposicao
      aberto={aberto}
      aoFechar={fechar}
      titulo="Alertas"
      subtitulo={!erro && estadoForcado !== 'carregando' && !vazio ? `${alertasAtivos.length} pedindo atenção, do mais grave para o menos grave` : undefined}
      forma={celular ? 'cheia' : 'lateral'}
      largura="480px"
      voltar={celular ? 'Voltar' : undefined}
    >
      {corpo}
      {alertasDispensados.length > 0 && estadoForcado === 'normal' && (
        <section className="dispensados">
          <button type="button" className="dispensados__alternar" aria-expanded={verDispensados} onClick={() => setVerDispensados((v) => !v)}>
            Dispensados hoje ({alertasDispensados.length})
            <ChevronDown size={16} aria-hidden className={verDispensados ? 'gira-180' : ''} />
          </button>
          {verDispensados && (
            <ul className="dispensados__lista">
              {alertasDispensados.map((a) => (
                <li key={a.id}>
                  <Selo tom="cinza" ponto={false}>{a.tipo}</Selo>
                  <span className="dispensados__texto">{a.loja ? `${a.loja} · ` : ''}{dataCurta(a.quando)}</span>
                  <Botao variante="texto" tamanho="p" onClick={() => restaurarAlerta(a.id)}>Restaurar</Botao>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      <p className="nota-pe">Limiares em proposta, a validar com o time: 3 min sem sinal da loja, cupom a 3 dias de expirar.</p>
    </Sobreposicao>
  )
}

export function Reconexao() {
  const { sobreposicao, fechar, lojasVisiveis } = usePrototipo()
  const celular = useEhCelular()
  const aberto = sobreposicao?.tipo === 'reconexao'
  const loja = lojasVisiveis.find((l) => l.id === sobreposicao?.dados?.lojaId)
  return (
    <Sobreposicao
      aberto={aberto}
      aoFechar={fechar}
      titulo="Loja sem conexão: o que fazer"
      subtitulo={loja?.nome}
      forma={celular ? 'folha' : 'modal'}
      largura="520px"
      rodape={
        <>
          <Botao para="/ajuda" onClick={fechar}>Falar com o suporte</Botao>
          <Botao variante="principal" onClick={fechar}>Entendi</Botao>
        </>
      }
    >
      <ol className="passos">
        <li>Confira se o computador ou tablet da loja está ligado e com o gestor de pedidos aberto.</li>
        <li>Confira a internet da loja: abra qualquer site nesse aparelho.</li>
        <li>Feche e abra de novo o gestor de pedidos.</li>
        <li>Se a conexão não voltar em 5 minutos, fale com o suporte. Enquanto isso, pedidos novos podem não chegar.</li>
      </ol>
    </Sobreposicao>
  )
}
