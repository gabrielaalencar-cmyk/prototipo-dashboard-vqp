// T29. Pagamentos (proposta de migração): formas habilitadas no contrato, online e presenciais,
// cada uma com chave nomeada e bandeiras com logo. Formas fora do contrato não aparecem.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { usePrototipo } from '../../contexto/Prototipo.jsx'
import { useTitulo } from '../../utilitarios/ganchos.js'
import { AmericanExpress, DinersClub, Elo, Hipercard, Maestro, Mastercard, Visa } from 'react-svg-credit-card-payment-icons/icons/flat-rounded'
import { siApplepay, siGooglepay, siSamsungpay } from 'simple-icons'
import { pagamentosIniciais } from '../../dados/minhaloja.js'
import { CabecalhoPagina, EstadoErro, FaixaAviso, Interruptor } from '../../componentes/base.jsx'
import { BarraSalvar, EsqueletoBlocos, esperar, mudou, useAvisoSaida } from './MinhaLojaComum.jsx'
import '../../estilos/minhaloja.css'

const GRUPOS = [
  { id: 'online', titulo: 'Online', sub: 'O cliente paga no app ou no cardápio web, antes do preparo.' },
  { id: 'presencial', titulo: 'Na entrega ou no balcão', sub: 'O cliente paga ao receber ou ao retirar.' },
]

// Logos de cartão (react-svg-credit-card-payment-icons, formato cartão arredondado)
const LOGO_CARTAO = {
  Visa: Visa,
  'Visa Débito': Visa,
  Mastercard: Mastercard,
  Maestro: Maestro,
  Elo: Elo,
  'Elo Débito': Elo,
  'American Express': AmericanExpress,
  Hipercard: Hipercard,
  'Diners Club': DinersClub,
}
// Carteiras digitais (simple-icons, CC0): símbolo de uma cor sobre cartão branco
const LOGO_CARTEIRA = { 'Apple Pay': siApplepay, 'Google Pay': siGooglepay, 'Samsung Pay': siSamsungpay }
// Vale-refeição: nenhum pacote livre tem esses logos. Selo de texto com o nome e a cor
// aproximada da marca; não imita o desenho do logo.
const SELO_VR = {
  'Alelo Refeição': { texto: 'Alelo', fundo: '#00704A' },
  'Pluxee Refeição': { texto: 'Pluxee', fundo: '#221C46' },
  'Ticket Restaurante': { texto: 'Ticket', fundo: '#C8102E' },
  'VR Refeição': { texto: 'VR', fundo: '#006B3F' },
  'Ben Refeição': { texto: 'Ben', fundo: '#3D2B8F' },
  Caju: { texto: 'Caju', fundo: '#C2185B' },
  Flash: { texto: 'Flash', fundo: '#B0156B' },
  Swile: { texto: 'Swile', fundo: '#1D1148' },
}

function LogoBandeira({ nome }) {
  const Cartao = LOGO_CARTAO[nome]
  if (Cartao) return <Cartao width={36} height={23} className="pagamentos__logo" aria-hidden focusable="false" />
  const icone = LOGO_CARTEIRA[nome]
  if (icone) {
    return (
      <span className="pagamentos__logo pagamentos__logo--carteira" aria-hidden>
        <svg viewBox="0 0 24 24" width="16" height="16" focusable="false"><path d={icone.path} fill={`#${icone.hex}`} /></svg>
      </span>
    )
  }
  const selo = SELO_VR[nome]
  if (selo) return <span className="pagamentos__logo pagamentos__logo--texto" style={{ background: selo.fundo }} aria-hidden>{selo.texto}</span>
  return null
}

// Forma com bandeiras ligada precisa de ao menos uma bandeira
const formasSemBandeira = (r) => [...r.online, ...r.presencial].filter((f) => f.ligado && f.bandeiras && !f.bandeiras.some((b) => b.ligado))

function PagamentosLoja() {
  const { cenarioId, loja, estadoForcado, avisar } = usePrototipo()
  useTitulo('Pagamentos')
  const [salvo, setSalvo] = useState(() => pagamentosIniciais(estadoForcado === 'vazio' ? 'nova' : cenarioId))
  const [r, setR] = useState(salvo)
  const [salvando, setSalvando] = useState(false)
  const [tentou, setTentou] = useState(false)
  const sujo = mudou(r, salvo)
  const avisoSaida = useAvisoSaida(sujo)
  const semBandeira = formasSemBandeira(r)

  const mudarForma = (grupo, id, mudanca) => setR((x) => ({ ...x, [grupo]: x[grupo].map((f) => (f.id === id ? mudanca(f) : f)) }))
  const ligarForma = (grupo, f, v) =>
    mudarForma(grupo, f.id, (y) => ({ ...y, ligado: v, bandeiras: y.bandeiras && v && !y.bandeiras.some((b) => b.ligado) ? y.bandeiras.map((b) => ({ ...b, ligado: true })) : y.bandeiras }))
  const ligarBandeira = (grupo, f, nome, v) =>
    mudarForma(grupo, f.id, (y) => ({ ...y, bandeiras: y.bandeiras.map((b) => (b.nome === nome ? { ...b, ligado: v } : b)) }))

  const salvar = async () => {
    if (semBandeira.length) {
      avisar(`Escolha ao menos uma bandeira em ${semBandeira[0].nome}, ou desligue a forma.`, 'erro')
      return
    }
    setSalvando(true)
    await esperar(700)
    setSalvo(r)
    setSalvando(false)
    avisar('Formas de pagamento salvas. O app já mostra as mudanças.', 'sucesso')
  }

  const cabecalho = <CabecalhoPagina titulo="Pagamentos" descricao={`Como o cliente pode pagar na ${loja.nome}. Aparecem só as formas do seu contrato.`} />
  if (estadoForcado === 'carregando') return <div className="pagina">{cabecalho}<EsqueletoBlocos oQue="as formas de pagamento" blocos={[3, 5]} /></div>
  if (estadoForcado === 'erro' && !tentou) return <div className="pagina">{cabecalho}<EstadoErro oQue="as formas de pagamento" aoTentar={() => setTentou(true)} /></div>

  const nenhumaLigada = [...r.online, ...r.presencial].every((f) => !f.ligado)

  return (
    <div className="pagina minha-loja">
      {cabecalho}
      {nenhumaLigada && (
        <FaixaAviso tom="atencao">Nenhuma forma de pagamento ligada ainda. Ligue ao menos uma para a loja receber pedidos.</FaixaAviso>
      )}

      <div className="minha-loja__blocos">
        {GRUPOS.map((g) => (
          <section key={g.id} className="bloco" aria-labelledby={`pg-${g.id}`}>
            <div className="bloco__cabecalho">
              <h2 id={`pg-${g.id}`}>{g.titulo}</h2>
            </div>
            <p className="bloco__sub pagamentos__sub">{g.sub}</p>
            <ul className="pagamentos__formas">
              {r[g.id].map((f) => {
                const faltaBandeira = semBandeira.includes(f)
                return (
                  <li key={f.id} className="pagamentos__forma">
                    <Interruptor ligado={f.ligado} rotuloVisivel={f.nome} aoMudar={(v) => ligarForma(g.id, f, v)} />
                    {f.bandeiras && (
                      <fieldset className="minha-loja__grupo-marcar minha-loja__grupo-marcar--linha pagamentos__bandeiras" disabled={!f.ligado}>
                        <legend className="visualmente-oculto">Bandeiras aceitas em {f.nome}</legend>
                        {f.bandeiras.map((b) => (
                          <label key={b.nome} className="minha-loja__marcar">
                            <input type="checkbox" className="caixa" checked={b.ligado} onChange={(e) => ligarBandeira(g.id, f, b.nome, e.target.checked)} />
                            <LogoBandeira nome={b.nome} />
                            <span className={SELO_VR[b.nome]?.texto === b.nome ? 'visualmente-oculto' : undefined}>{b.nome}</span>
                          </label>
                        ))}
                      </fieldset>
                    )}
                    {f.nota && <p className="texto-secundario pagamentos__nota">{f.nota}</p>}
                    {faltaBandeira && <p className="campo__erro">Escolha ao menos uma bandeira ou desligue {f.nome}.</p>}
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
      <p className="nota-pe">
        Para incluir uma forma de pagamento, <Link to="/ajuda" className="link">fale com o suporte</Link>.
      </p>

      <BarraSalvar sujo={sujo} salvando={salvando} problemas={semBandeira.length} aoSalvar={salvar} aoDescartar={() => setR(salvo)} />
      {avisoSaida}
    </div>
  )
}

export function Pagamentos() {
  const { lojaId, estadoForcado } = usePrototipo()
  return <PagamentosLoja key={`${lojaId}-${estadoForcado === 'vazio'}`} />
}
