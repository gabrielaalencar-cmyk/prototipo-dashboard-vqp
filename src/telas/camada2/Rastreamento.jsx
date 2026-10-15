// T32. Rastreamento: Google Tag Manager e Pixel da Meta, um campo por tag, onde vale e estado.
import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { usePrototipo } from '../../contexto/Prototipo.jsx'
import { useTitulo } from '../../utilitarios/ganchos.js'
import { rastreamentoInicial } from '../../dados/minhaloja.js'
import { Botao, CabecalhoPagina, Campo, Confirmacao, EstadoErro, Indisponivel, Selo } from '../../componentes/base.jsx'
import { EsqueletoBlocos, esperar } from './MinhaLojaComum.jsx'
import '../../estilos/minhaloja.css'

const TAGS = [
  {
    id: 'gtm',
    titulo: 'Google Tag Manager',
    rotulo: 'ID do contêiner',
    exemplo: 'GTM-XXXXXXX',
    ajuda: 'Começa com GTM- seguido de letras e números, como GTM-5KX7Q2M.',
    normalizar: (v) => v.trim().toUpperCase(),
    validar: (v) => (/^GTM-[A-Z0-9]{4,10}$/.test(v) ? null : 'Formato inválido. Use GTM- seguido de letras e números, como GTM-5KX7Q2M.'),
  },
  {
    id: 'pixel',
    titulo: 'Pixel da Meta',
    rotulo: 'ID do Pixel',
    exemplo: 'Só números',
    ajuda: 'Só números, com 15 ou 16 dígitos. Fica no Gerenciador de Eventos da Meta.',
    normalizar: (v) => v.trim(),
    validar: (v) => (!/^\d+$/.test(v) ? 'O ID do Pixel tem só números, sem letras, espaços ou traços.' : /^\d{15,16}$/.test(v) ? null : 'O ID do Pixel tem 15 ou 16 números.'),
  },
]

function BlocoTag({ tag, salvo, aoSalvar, aoRemover }) {
  const [valor, setValor] = useState(salvo)
  const [erro, setErro] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [removendo, setRemovendo] = useState(false)
  const [confirmar, setConfirmar] = useState(false)
  const normal = tag.normalizar(valor)
  const mudou = normal !== salvo

  const salvar = async () => {
    if (!normal) return setErro(`Informe o ${tag.rotulo}.`)
    const e = tag.validar(normal)
    if (e) return setErro(e)
    setSalvando(true)
    await esperar(700)
    setValor(normal)
    setSalvando(false)
    aoSalvar(normal)
  }
  const remover = async () => {
    setRemovendo(true)
    await esperar(700)
    setRemovendo(false)
    setConfirmar(false)
    setValor('')
    aoRemover()
  }

  return (
    <section className="bloco" aria-labelledby={`tag-${tag.id}`}>
      <div className="bloco__cabecalho">
        <h2 id={`tag-${tag.id}`}>{tag.titulo}</h2>
        {salvo ? <Selo tom="verde">Configurado</Selo> : <Selo tom="neutro">Não configurado</Selo>}
      </div>
      <div className="rastreamento__corpo">
        <div className="formulario">
          <Campo rotulo={tag.rotulo} erro={erro} ajuda={tag.ajuda}>
            {(p) => (
              <input
                {...p}
                className="campo__entrada"
                inputMode={tag.id === 'pixel' ? 'numeric' : 'text'}
                autoCapitalize="characters"
                spellCheck={false}
                placeholder={tag.exemplo}
                value={valor}
                onChange={(e) => { setValor(e.target.value); setErro(null) }}
              />
            )}
          </Campo>
          <div className="rastreamento__acoes">
            <Botao variante="principal" onClick={salvar} carregando={salvando} disabled={!mudou} mudaAlgo>Salvar</Botao>
            {salvo && <Botao variante="destrutivo-contorno" icone={Trash2} onClick={() => setConfirmar(true)} mudaAlgo>Remover</Botao>}
          </div>
        </div>
        <dl className="rastreamento__onde">
          <div>
            <dt>Cardápio web</dt>
            <dd>{salvo ? <Selo tom="verde">Ativo</Selo> : <Selo tom="neutro">Sem tag</Selo>}</dd>
          </div>
          <div>
            <dt>App</dt>
            <dd><Selo tom="cinza" ponto={false}>Disponível na próxima versão do app</Selo></dd>
          </div>
          <div>
            <dt>Último evento recebido</dt>
            <dd><Indisponivel motivo="Ainda não há como medir os eventos recebidos." /></dd>
          </div>
        </dl>
      </div>
      <Confirmacao
        aberto={confirmar}
        aoFechar={() => setConfirmar(false)}
        titulo={`Remover ${tag.titulo}?`}
        texto={`O ${tag.rotulo} ${salvo} sai do cardápio web. Os eventos param de chegar a partir de agora.`}
        rotuloConfirmar="Remover"
        destrutivo
        carregando={removendo}
        aoConfirmar={remover}
      />
    </section>
  )
}

function RastreamentoLoja() {
  const { cenarioId, loja, estadoForcado, avisar } = usePrototipo()
  useTitulo('Rastreamento')
  const [salvo, setSalvo] = useState(() => rastreamentoInicial(estadoForcado === 'vazio' ? 'nova' : cenarioId))
  const [tentou, setTentou] = useState(false)

  const cabecalho = (
    <CabecalhoPagina
      titulo="Rastreamento"
      descricao={`Tags de medição de anúncios do cardápio web da ${loja.nome}. No cardápio web, a tag entra por script.`}
    />
  )
  if (estadoForcado === 'carregando') return <div className="pagina">{cabecalho}<EsqueletoBlocos oQue="o rastreamento" blocos={[3, 3]} /></div>
  if (estadoForcado === 'erro' && !tentou) return <div className="pagina">{cabecalho}<EstadoErro oQue="o rastreamento" aoTentar={() => setTentou(true)} /></div>

  return (
    <div className="pagina minha-loja">
      {cabecalho}
      <div className="minha-loja__blocos">
        {TAGS.map((t) => (
          <BlocoTag
            key={t.id}
            tag={t}
            salvo={salvo[t.id]}
            aoSalvar={(v) => {
              setSalvo((x) => ({ ...x, [t.id]: v }))
              avisar(`${t.titulo} salvo. A tag entra no cardápio web em alguns minutos.`, 'sucesso')
            }}
            aoRemover={() => {
              setSalvo((x) => ({ ...x, [t.id]: '' }))
              avisar(`${t.titulo} removido do cardápio web.`, 'sucesso')
            }}
          />
        ))}
      </div>
      <p className="nota-pe">No app, a tag depende de uma integração no código do app, que chega na próxima versão.</p>
    </div>
  )
}

export function Rastreamento() {
  const { lojaId, estadoForcado } = usePrototipo()
  return <RastreamentoLoja key={`${lojaId}-${estadoForcado === 'vazio'}`} />
}
