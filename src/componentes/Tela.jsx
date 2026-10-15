// Envolve cada rota: aplica permissão, contexto de rede e o estado forçado "Sem permissão".
import { usePrototipo } from '../contexto/Prototipo.jsx'
import { telaPorCodigo, FAIXA_MIGRACAO } from '../dados/telas.js'
import { useTitulo } from '../utilitarios/ganchos.js'
import { EscolhaLoja, SemAcesso } from '../telas/EstadosGlobais.jsx'

// Nome da tela em minúsculas para as frases "Escolha uma loja para ver [tela]"
const NOME_FRASE = {
  T06: 'os pedidos', T07: 'o pedido', T08: 'o cardápio', T09: 'o produto', T10: 'o cardápio', T11: 'o cardápio',
  T12: 'o cardápio', T26: 'o funcionamento', T27: 'a entrega', T28: 'as modalidades e pedidos', T29: 'os pagamentos',
  T30: 'os dados da loja', T31: 'as integrações', T32: 'o rastreamento',
}

export function Tela({ codigo, children }) {
  const { pode, emRede, estadoForcado, cen } = usePrototipo()
  const tela = telaPorCodigo(codigo)
  if (estadoForcado === 'sem-permissao' || (tela.permissao && !pode(tela.permissao))) {
    return <SemAcesso tela={tela.titulo} />
  }
  if (tela.soRede && !cen.rede) {
    return <SemAcesso tela={tela.titulo} motivo="Copiar para outras lojas existe só para quem tem mais de uma loja." />
  }
  if (tela.exigeLoja && emRede) return <EscolhaLoja tela={NOME_FRASE[codigo] || tela.titulo.toLowerCase()} />
  return children
}

export function FaixaMigracao() {
  return (
    <div className="faixa-migracao" role="note">
      <strong>Proposta de migração do Portal Administrativo.</strong> Escopo a decidir em 26/10.
    </div>
  )
}

// Esqueleto das telas da camada 2: título, objetivo e o que vai ter
export function TelaEmConstrucao({ codigo }) {
  const tela = telaPorCodigo(codigo)
  useTitulo(tela.titulo)
  return (
    <div className="pagina pagina--construcao">
      {tela.migracao === 'total' && <FaixaMigracao />}
      <div className="pagina__cabecalho">
        <div className="pagina__titulos">
          <h1>{tela.titulo}</h1>
          <p className="pagina__descricao">{tela.objetivo}</p>
        </div>
      </div>
      <div className="construcao">
        <p className="construcao__marca">
          <span className="construcao__selo">Em construção · camada {tela.camada}</span>
          <span className="construcao__codigo">{tela.codigo}</span>
        </p>
        <h2 className="construcao__titulo">O que esta tela vai ter</h2>
        <ul className="construcao__lista">
          {tela.conteudo.map((c) => <li key={c}>{c}</li>)}
        </ul>
        {tela.migracao === 'parcial' && (
          <div className="construcao__migracao">
            <h3>Partes que são proposta de migração do Portal</h3>
            <p>Estas partes entram com o selo "Proposta" na tela final. {FAIXA_MIGRACAO}</p>
            <ul>
              {tela.partesMigracao.map((p) => (
                <li key={p}><span className="selo-proposta selo-proposta--compacto">Proposta</span> {p}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
