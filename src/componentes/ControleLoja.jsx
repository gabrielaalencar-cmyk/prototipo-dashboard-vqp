// Controle de abrir e fechar a loja (seção 7). Painel lateral no computador, folha de baixo no celular.
import { useState } from 'react'
import { AlertTriangle, Info } from 'lucide-react'
import { usePrototipo } from '../contexto/Prototipo.jsx'
import { useEhCelular } from '../utilitarios/ganchos.js'
import { ha, hora, minutosEntre } from '../utilitarios/formatos.js'
import { Botao, Confirmacao, FaixaAviso, Selo, Sobreposicao } from './base.jsx'

const NOME_CANAL = { delivery: 'Delivery', balcao: 'Balcão' }
const ARTIGO = { delivery: 'o delivery', balcao: 'o balcão' }

export function estadoCanal(estadoLoja, canal) {
  if (!estadoLoja) return { texto: '—', tom: 'cinza' }
  if (estadoLoja.conexao === 'sem') return { texto: 'Sem conexão', tom: 'vermelho' }
  return estadoLoja[canal] === 'aberto' ? { texto: 'Aberto', tom: 'verde' } : { texto: 'Fechado', tom: 'cinza' }
}

export function LinhaCanal({ canal, lojaId, compacta, desabilitado }) {
  const { estadoLojas, mudarStatusLoja, lojasVisiveis, dadosLoja, cen, podeAgir } = usePrototipo()
  const [confirmar, setConfirmar] = useState(false)
  const [mensagem, setMensagem] = useState(null)
  const e = estadoLojas[lojaId]
  const loja = lojasVisiveis.find((l) => l.id === lojaId)
  const est = estadoCanal(e, canal)
  const aberto = e?.[canal] === 'aberto'
  const mudando = e?.mudando === canal
  const semConexao = e?.conexao === 'sem'
  const semArea = canal === 'delivery' && cen.porLoja[lojaId]?.semAreaEntrega

  const executar = async (novo) => {
    setMensagem(null)
    try {
      await mudarStatusLoja(lojaId, canal, novo)
      if (novo === 'aberto' && loja.fechadaProgramada) {
        setMensagem({ tom: 'atencao', texto: 'Fora do horário programado. A loja abre agora e volta a seguir o horário amanhã.' })
      }
    } catch {
      setMensagem({ tom: 'erro', texto: `Não foi possível ${novo === 'aberto' ? 'abrir' : 'fechar'} ${ARTIGO[canal]}. Tente de novo.` })
    }
  }

  const rotuloAcao = `${aberto ? 'Fechar' : 'Abrir'} ${NOME_CANAL[canal].toLowerCase()}`
  const bloqueado = desabilitado || semConexao || (!aberto && semArea)

  return (
    <div className={`canal ${compacta ? 'canal--compacta' : ''}`}>
      <div className="canal__linha">
        <div className="canal__estado">
          <span className="canal__nome">{NOME_CANAL[canal]}</span>
          <Selo tom={est.tom}>{mudando ? (aberto ? 'Abrindo…' : 'Fechando…') : est.texto}</Selo>
        </div>
        <Botao
          variante={aberto ? 'secundario' : 'principal'}
          onClick={() => (aberto ? setConfirmar(true) : executar('aberto'))}
          carregando={mudando}
          disabled={bloqueado}
          mudaAlgo
          aria-label={`${rotuloAcao} da ${loja?.nome}`}
        >
          {rotuloAcao}
        </Botao>
      </div>
      {!aberto && semArea && !semConexao && (
        <p className="canal__nota">Cadastre a área de entrega para abrir o delivery.</p>
      )}
      {mensagem && (
        <p className={`canal__mensagem canal__mensagem--${mensagem.tom}`} role={mensagem.tom === 'erro' ? 'alert' : 'status'}>
          {mensagem.tom === 'erro' ? <AlertTriangle size={16} aria-hidden /> : <Info size={16} aria-hidden />}
          {mensagem.texto}
        </p>
      )}
      {!podeAgir && <p className="canal__nota">Sem internet: não dá para abrir ou fechar agora.</p>}
      <Confirmacao
        aberto={confirmar}
        aoFechar={() => setConfirmar(false)}
        titulo={`Fechar ${ARTIGO[canal]}?`}
        texto={`Fechar ${ARTIGO[canal]} da ${loja?.nome} agora? Novos pedidos de ${NOME_CANAL[canal].toLowerCase()} deixam de entrar até você abrir de novo.`}
        rotuloConfirmar={rotuloAcao}
        destrutivo
        aoConfirmar={() => {
          setConfirmar(false)
          executar('fechado')
        }}
      />
    </div>
  )
}

export function ControleLoja() {
  const { sobreposicao, fechar, loja, estadoLoja, statusVerificadoEm, agora, estadoForcado, abrir } = usePrototipo()
  const celular = useEhCelular()
  const aberto = sobreposicao?.tipo === 'controle'
  if (!loja) return null
  const erro = estadoForcado === 'erro'
  return (
    <Sobreposicao
      aberto={aberto}
      aoFechar={fechar}
      titulo={`Loja ${loja.nome}`}
      subtitulo={`Status atualizado ${ha(minutosEntre(statusVerificadoEm, agora))} · ${hora(statusVerificadoEm)}`}
      forma={celular ? 'folha' : 'lateral'}
      largura="420px"
    >
      {erro ? (
        <FaixaAviso tom="erro" icone={AlertTriangle}>
          Não foi possível ver o status da loja. Abrir e fechar ficam indisponíveis até o status voltar.
        </FaixaAviso>
      ) : estadoLoja?.conexao === 'sem' ? (
        <FaixaAviso
          tom="erro"
          icone={AlertTriangle}
          acao={<Botao variante="texto" onClick={() => abrir('reconexao')}>Ver o que fazer</Botao>}
        >
          Sem sinal da loja desde {hora(estadoLoja.semConexaoDesde)}. Enquanto a conexão não volta, não dá para abrir ou fechar por aqui.
        </FaixaAviso>
      ) : null}
      <div className="controle-loja">
        <LinhaCanal canal="delivery" lojaId={loja.id} desabilitado={erro} />
        <LinhaCanal canal="balcao" lojaId={loja.id} desabilitado={erro} />
      </div>
      <p className="nota-pe">Delivery e Balcão são independentes. Fechar pede confirmação; abrir não.</p>
    </Sobreposicao>
  )
}
