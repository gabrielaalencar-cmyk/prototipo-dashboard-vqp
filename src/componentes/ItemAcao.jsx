// Item de "Avisos e oportunidades" e da central de alertas: sinal, motivo em uma frase e a ação ao lado.
import { useNavigate } from 'react-router-dom'
import { usePrototipo } from '../contexto/Prototipo.jsx'
import { dataCurta } from '../utilitarios/formatos.js'
import { Botao, Selo } from './base.jsx'

export const TOM_PRIORIDADE = { 1: 'vermelho', 2: 'vermelho', 3: 'ambar', 4: 'ambar', 5: 'cinza' }

export function useExecutarAcao() {
  const navegar = useNavigate()
  const { trocarLoja, temSeletor, lojaId, abrir, fechar, dispensarAlerta } = usePrototipo()
  return (acao, item) => {
    if (acao.tipo === 'reconexao') return abrir('reconexao', { lojaId: item?.lojaId })
    if (acao.tipo === 'dispensar') return dispensarAlerta(item.id)
    if (acao.lojaId && temSeletor && acao.lojaId !== lojaId) trocarLoja(acao.lojaId)
    fechar()
    navegar(acao.para)
  }
}

export function ItemAcao({ item, mostrarLoja, aoDispensar, compacto }) {
  const executar = useExecutarAcao()
  const tom = item.prioridade ? TOM_PRIORIDADE[item.prioridade] : 'neutro'
  return (
    <li className={`item-acao ${compacto ? 'item-acao--compacto' : ''}`}>
      <div className="item-acao__sinal">
        <Selo tom={tom} ponto={!!item.prioridade}>{item.tipo}</Selo>
        {(item.quando || (mostrarLoja && item.loja)) && (
          <span className="item-acao__meta">
            {mostrarLoja && item.loja && <span>{item.loja}</span>}
            {item.quando && <span>{dataCurta(item.quando)}</span>}
          </span>
        )}
      </div>
      <p className="item-acao__motivo">
        {item.texto && <strong>{item.texto}. </strong>}
        {item.motivo}
      </p>
      <div className="item-acao__acoes">
        {item.acoes.map((a, i) => (
          <Botao
            key={a.rotulo}
            variante={i === 0 ? 'secundario' : 'texto'}
            tamanho="p"
            onClick={() => executar(a, item)}
          >
            {a.rotulo}
          </Botao>
        ))}
        {aoDispensar && (
          <Botao variante="texto" tamanho="p" onClick={() => aoDispensar(item.id)} aria-label={`Dispensar alerta: ${item.tipo}${item.loja ? `, ${item.loja}` : ''}`}>
            Dispensar
          </Botao>
        )}
      </div>
    </li>
  )
}
