// T24. Funil de compra: o desenho das quatro etapas, todas Indisponível até o Analítico definir a métrica.
import { useState } from 'react'
import { usePrototipo } from '../../contexto/Prototipo.jsx'
import { useTitulo } from '../../utilitarios/ganchos.js'
import { CabecalhoPagina, Carregando, EstadoErro, Esqueleto, Indisponivel } from '../../componentes/base.jsx'
import '../../estilos/marketing.css'

const MOTIVO = 'O funil ainda não é medido. Previsto para quando o Analítico definir a métrica.'

const ETAPAS = [
  { id: 'entraram', rotulo: 'Entraram', explica: 'Abriram o app ou o cardápio web' },
  { id: 'viram', rotulo: 'Viram um produto', explica: 'Abriram a página de ao menos um produto' },
  { id: 'carrinho', rotulo: 'Adicionaram ao carrinho', explica: 'Colocaram ao menos um item no carrinho' },
  { id: 'compraram', rotulo: 'Compraram', explica: 'Concluíram um pedido válido' },
]

const CANAIS = [
  { id: 'todos', rotulo: 'Todos os canais' },
  { id: 'app', rotulo: 'App' },
  { id: 'web', rotulo: 'Cardápio web' },
]

const PERIODOS = [
  { id: 'este-mes', rotulo: 'Este mês', comparado: 'setembro no mesmo intervalo' },
  { id: 'mes-passado', rotulo: 'Mês passado', comparado: 'agosto' },
  { id: '7-dias', rotulo: 'Últimos 7 dias', comparado: 'os 7 dias anteriores' },
  { id: '30-dias', rotulo: 'Últimos 30 dias', comparado: 'os 30 dias anteriores' },
]

function Grupo({ rotulo, opcoes, atual, aoMudar }) {
  return (
    <div className="seletor-periodo" role="group" aria-label={rotulo}>
      {opcoes.map((o) => (
        <button key={o.id} type="button" className="seletor-periodo__opcao" aria-pressed={atual === o.id} onClick={() => aoMudar(o.id)}>
          {o.rotulo}
        </button>
      ))}
    </div>
  )
}

export function Funil() {
  const { estadoForcado, nomeContexto } = usePrototipo()
  const [canal, setCanal] = useState('todos')
  const [periodo, setPeriodo] = useState('este-mes')
  const [tentou, setTentou] = useState(false)
  useTitulo('Funil de compra')
  const p = PERIODOS.find((x) => x.id === periodo)
  const c = CANAIS.find((x) => x.id === canal)

  let conteudo
  if (estadoForcado === 'carregando') {
    conteudo = <Carregando oQue="o funil"><div className="lista-esqueleto">{ETAPAS.map((e) => <Esqueleto key={e.id} linhas={1} altura="64px" />)}</div></Carregando>
  } else if (estadoForcado === 'erro' && !tentou) {
    conteudo = <EstadoErro oQue="o funil" aoTentar={() => setTentou(true)} />
  } else {
    conteudo = (
      <ol className="funil__etapas" aria-label={`Etapas do funil, ${c.rotulo.toLowerCase()}`}>
        {ETAPAS.map((e, i) => (
          <li key={e.id} className="funil__etapa">
            <div className="funil__barra" style={{ '--largura': `${100 - i * 18}%` }}>
              <span className="funil__nome">{i + 1}. {e.rotulo}</span>
              <span className="funil__explica">{e.explica}</span>
            </div>
            <div className="funil__numero">
              <Indisponivel motivo={MOTIVO} />
            </div>
          </li>
        ))}
      </ol>
    )
  }

  return (
    <div className="pagina funil">
      <CabecalhoPagina titulo="Funil de compra" descricao={`Onde o cliente desiste no canal próprio · ${nomeContexto}`} />
      <div className="barra-filtros funil__filtros">
        <Grupo rotulo="Canal" opcoes={CANAIS} atual={canal} aoMudar={setCanal} />
        <Grupo rotulo="Período" opcoes={PERIODOS} atual={periodo} aoMudar={setPeriodo} />
      </div>
      <section className="bloco" aria-labelledby="titulo-funil">
        <header className="bloco__cabecalho">
          <div>
            <h2 id="titulo-funil">{c.rotulo}, {p.rotulo.toLowerCase()}</h2>
            <p className="bloco__sub">Comparado com {p.comparado}</p>
          </div>
        </header>
        {conteudo}
        <p className="bloco__nota">
          O app e o cardápio web já registram esses eventos; falta o Analítico definir a métrica. Quando houver menos de 30 entradas no período, o funil mostra só as contagens, sem percentual de conversão.
        </p>
      </section>
    </div>
  )
}
