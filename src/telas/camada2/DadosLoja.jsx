// T30. Dados da loja (proposta de migração): cadastro, imagens com prévia no app e endereço
// com esquema de localização. Mudar o endereço pede confirmação antes de salvar.
import { useState } from 'react'
import { ImageUp, MapPin } from 'lucide-react'
import { usePrototipo } from '../../contexto/Prototipo.jsx'
import { useTitulo } from '../../utilitarios/ganchos.js'
import { dadosCadastroIniciais } from '../../dados/minhaloja.js'
import { Botao, CabecalhoPagina, Campo, Confirmacao, EstadoErro, Selo } from '../../componentes/base.jsx'
import { BarraSalvar, EsqueletoBlocos, esperar, mudou, useAvisoSaida } from './MinhaLojaComum.jsx'
import '../../estilos/minhaloja.css'

const CAMPOS_ENDERECO = ['rua', 'bairro', 'cidade', 'cep']

function validar(r) {
  const e = {}
  if (!r.nomeFantasia.trim()) e.nomeFantasia = 'Informe o nome que aparece no app.'
  if (!r.telefone.trim()) e.telefone = 'Informe um telefone de contato.'
  if (!r.responsavel.trim()) e.responsavel = 'Informe quem responde pela loja.'
  if (!r.email.includes('@')) e.email = 'Informe um e-mail válido, como contato@sualoja.com.br.'
  if (!r.rua.trim()) e.rua = 'Informe a rua e o número.'
  if (!r.cidade.trim()) e.cidade = 'Informe a cidade.'
  return e
}

// Como a loja aparece no topo do app: quadros neutros com a sigla, sem foto nem cor de cliente
function PreviaApp({ nome, sigla }) {
  return (
    <figure className="dados__previa">
      <div className="dados__aparelho" aria-hidden>
        <div className="dados__capa" />
        <div className="dados__logo">{sigla}</div>
        <p className="dados__previa-nome">{nome || 'Nome da loja'}</p>
        <span className="dados__previa-linha" />
        <span className="dados__previa-linha dados__previa-linha--curta" />
      </div>
      <figcaption>Prévia no app: capa e logo no topo da loja.</figcaption>
    </figure>
  )
}

function EsquemaLocal({ validado }) {
  return (
    <figure className="dados__mapa">
      <svg viewBox="0 0 240 140" role="img" aria-label={validado ? 'Esquema: endereço validado no mapa.' : 'Esquema: endereço ainda não validado.'}>
        <rect width="240" height="140" rx="10" className="entrega__fundo" />
        <path d="M0 50 H240 M0 104 H240 M70 0 V140 M170 0 V140" className="dados__rua" />
        <circle cx="120" cy="76" r="10" className="entrega__loja" />
      </svg>
      <figcaption>Esquema da localização, não é o mapa real.</figcaption>
    </figure>
  )
}

function DadosLojaTela() {
  const { cenarioId, cen, loja, estadoForcado, avisar } = usePrototipo()
  useTitulo('Dados da loja')
  const [salvo, setSalvo] = useState(() => {
    const d = dadosCadastroIniciais(cenarioId, loja, cen)
    // Vazio: só o nome veio da implantação; o resto está por preencher
    if (estadoForcado === 'vazio') return { ...Object.fromEntries(Object.keys(d).map((k) => [k, ''])), nomeFantasia: d.nomeFantasia, validado: false }
    return { ...d, validado: true }
  })
  const [r, setR] = useState(salvo)
  const [salvando, setSalvando] = useState(false)
  const [validando, setValidando] = useState(false)
  const [confirmar, setConfirmar] = useState(false)
  const [tentou, setTentou] = useState(false)
  const [mostrarErros, setMostrarErros] = useState(false)
  const sujo = mudou(r, salvo)
  const avisoSaida = useAvisoSaida(sujo)
  const erros = validar(r)
  const err = (k) => (mostrarErros ? erros[k] : undefined)
  const enderecoMudou = CAMPOS_ENDERECO.some((k) => r[k] !== salvo[k])

  const mudar = (k, v) => setR((x) => ({ ...x, [k]: v, validado: CAMPOS_ENDERECO.includes(k) ? false : x.validado }))
  const campo = (k, rotulo, extra = {}) => (
    <Campo rotulo={rotulo} erro={err(k)} ajuda={extra.ajuda}>
      {(p) => <input {...p} className="campo__entrada" type={extra.tipo || 'text'} inputMode={extra.modo} autoComplete={extra.auto} value={r[k]} onChange={(e) => mudar(k, e.target.value)} />}
    </Campo>
  )

  const validarMapa = async () => {
    setValidando(true)
    await esperar(800)
    setR((x) => ({ ...x, validado: true }))
    setValidando(false)
    avisar('Endereço encontrado no mapa.', 'sucesso')
  }

  const gravar = async () => {
    setSalvando(true)
    await esperar(800)
    setSalvo(r)
    setSalvando(false)
    setConfirmar(false)
    setMostrarErros(false)
    avisar(enderecoMudou ? 'Dados salvos. Confira a área de entrega a partir do novo endereço.' : 'Dados da loja salvos.', 'sucesso')
  }

  const salvar = () => {
    if (Object.keys(erros).length) {
      setMostrarErros(true)
      avisar('Corrija os campos marcados antes de salvar.', 'erro')
      return
    }
    if (enderecoMudou && !r.validado) {
      avisar('Valide o novo endereço no mapa antes de salvar.', 'erro')
      return
    }
    if (enderecoMudou) setConfirmar(true)
    else gravar()
  }

  const cabecalho = <CabecalhoPagina titulo="Dados da loja" descricao="Como a loja aparece para o cliente e como falar com ela." />
  if (estadoForcado === 'carregando') return <div className="pagina">{cabecalho}<EsqueletoBlocos oQue="os dados da loja" blocos={[3, 4, 4]} /></div>
  if (estadoForcado === 'erro' && !tentou) return <div className="pagina">{cabecalho}<EstadoErro oQue="os dados da loja" aoTentar={() => setTentou(true)} /></div>

  const problemas = mostrarErros ? Object.keys(erros).length : 0

  return (
    <div className="pagina minha-loja">
      {cabecalho}

      <div className="minha-loja__blocos">
        <section className="bloco" aria-labelledby="titulo-identidade">
          <div className="bloco__cabecalho"><h2 id="titulo-identidade">Nome e imagens</h2></div>
          <div className="dados__identidade">
            <div className="formulario">
              {campo('nomeFantasia', 'Nome fantasia', { ajuda: 'É o nome que o cliente vê no app.' })}
              <div className="dados__imagens">
                <Botao icone={ImageUp} onClick={() => avisar('No protótipo, a troca de imagem é simulada.', 'sucesso')}>Trocar logo</Botao>
                <Botao icone={ImageUp} onClick={() => avisar('No protótipo, a troca de imagem é simulada.', 'sucesso')}>Trocar capa</Botao>
              </div>
              <p className="campo__ajuda">Logo quadrado de 512 × 512 px; capa de 1200 × 400 px. PNG ou JPG até 2 MB.</p>
            </div>
            <PreviaApp nome={r.nomeFantasia} sigla={cen.marca.sigla} />
          </div>
        </section>

        <section className="bloco" aria-labelledby="titulo-contato">
          <div className="bloco__cabecalho"><h2 id="titulo-contato">Contato</h2></div>
          <div className="dados__grade">
            {campo('telefone', 'Telefone', { tipo: 'tel', modo: 'tel' })}
            {campo('whatsapp', 'WhatsApp', { tipo: 'tel', modo: 'tel', ajuda: 'Aparece no app para o cliente falar com a loja.' })}
            {campo('responsavel', 'Responsável')}
            {campo('email', 'E-mail', { tipo: 'email', modo: 'email' })}
          </div>
        </section>

        <section className="bloco" aria-labelledby="titulo-endereco">
          <div className="bloco__cabecalho">
            <h2 id="titulo-endereco">Endereço</h2>
            {r.validado ? <Selo tom="verde">Validado no mapa</Selo> : <Selo tom="ambar">Ainda não validado</Selo>}
          </div>
          <div className="dados__endereco">
            <div className="dados__grade">
              {campo('rua', 'Rua e número')}
              {campo('bairro', 'Bairro')}
              {campo('cidade', 'Cidade')}
              {campo('cep', 'CEP', { modo: 'numeric' })}
            </div>
            <EsquemaLocal validado={r.validado} />
          </div>
          {enderecoMudou && (
            <div className="dados__aviso-endereco">
              <p className="texto-corpo"><strong>Isso muda a área de entrega.</strong> As distâncias dos patamares passam a contar a partir do novo endereço.</p>
              {!r.validado && <Botao icone={MapPin} onClick={validarMapa} carregando={validando} mudaAlgo>Validar no mapa</Botao>}
            </div>
          )}
        </section>
      </div>

      <BarraSalvar sujo={sujo} salvando={salvando && !confirmar} problemas={problemas} aoSalvar={salvar} aoDescartar={() => { setR(salvo); setMostrarErros(false) }} />
      <Confirmacao
        aberto={confirmar}
        aoFechar={() => setConfirmar(false)}
        titulo="Isso muda a área de entrega"
        texto={`A ${loja.nome} passa a ficar em ${r.rua}${r.bairro ? `, ${r.bairro}` : ''}, ${r.cidade}. Os patamares e o frete grátis passam a contar a partir daqui, e alguns clientes podem sair ou entrar na área. Confira a Entrega depois de salvar.`}
        rotuloConfirmar="Salvar novo endereço"
        carregando={salvando}
        aoConfirmar={gravar}
      />
      {avisoSaida}
    </div>
  )
}

export function DadosLoja() {
  const { lojaId, estadoForcado } = usePrototipo()
  return <DadosLojaTela key={`${lojaId}-${estadoForcado === 'vazio'}`} />
}
