// T09. Produto, edição: abas no computador, seções empilhadas no celular, prévia no app ao lado.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, Copy, ImageOff, Info, Plus } from 'lucide-react'
import { usePrototipo } from '../../contexto/Prototipo.jsx'
import { useEhCelular, useTitulo } from '../../utilitarios/ganchos.js'
import { moeda, plural } from '../../utilitarios/formatos.js'
import { OPCOES_DIAS, detalhesProduto, gruposDoProduto, modalidadesDaLoja, permitePrecoPorModalidade } from '../../dados/cardapio2.js'
import { Abas, Botao, CabecalhoPagina, Campo, Carregando, EstadoErro, EstadoVazio, Esqueleto, FaixaAviso, Interruptor, Selo, Sobreposicao } from '../../componentes/base.jsx'
import '../../estilos/cardapio2.css'

const LIMITE_DESCRICAO = 300

// "14,50" -> 14.5; vazio -> null; inválido -> NaN
const lerValor = (s) => {
  const t = String(s ?? '').trim()
  if (!t) return null
  if (!/^\d{1,5}([.,]\d{1,2})?$/.test(t)) return NaN
  return Number(t.replace(',', '.'))
}
const lerInteiro = (s) => (/^\d{1,2}$/.test(String(s).trim()) ? Number(s) : NaN)

// Preço e promoção que valem numa modalidade. Sem preço próprio, a modalidade segue o Delivery.
function precoNaModalidade(dados, mid) {
  const delivery = { preco: lerValor(dados.preco), promo: lerValor(dados.precoPromo), herda: false }
  if (!dados.porModalidade || mid === 'delivery') return delivery
  const proprio = lerValor(dados.precos[mid]?.preco)
  const promo = lerValor(dados.precos[mid]?.promo)
  if (proprio == null) return { preco: delivery.preco, promo: promo ?? delivery.promo, herda: true }
  return { preco: proprio, promo, herda: false }
}

// Confere preço e promoção de uma modalidade; grava os erros nas chaves dadas
function validarPreco(e, { preco, promo, chavePreco, chavePromo, precoReferencia }) {
  const p = lerValor(preco)
  const pr = lerValor(promo)
  if (Number.isNaN(p)) e[chavePreco] = 'Use só números, como 14,50.'
  const base = p ?? precoReferencia
  if (Number.isNaN(pr)) e[chavePromo] = 'Use só números, como 12,90.'
  else if (pr != null && (base == null || Number.isNaN(base))) e[chavePromo] = 'Preencha o preço antes do preço promocional.'
  else if (pr != null && pr >= base) e[chavePromo] = `O preço promocional precisa ser menor que o preço (${moeda(base)}).`
}

function validar(dados, grupos, modalidades) {
  const e = {}
  const porModalidade = dados.porModalidade && permitePrecoPorModalidade(modalidades)
  const outras = modalidades.filter((m) => m.id !== 'delivery')
  if (!dados.nome.trim()) e.nome = 'Dê um nome ao produto, como "Pastel de carne".'
  if (dados.descricao.length > LIMITE_DESCRICAO) e.descricao = `A descrição passou de ${LIMITE_DESCRICAO} caracteres.`
  validarPreco(e, { preco: dados.preco, promo: dados.precoPromo, chavePreco: 'preco', chavePromo: 'precoPromo' })
  if (porModalidade) {
    const precoDelivery = lerValor(dados.preco)
    outras.forEach((m) => validarPreco(e, { preco: dados.precos[m.id].preco, promo: dados.precos[m.id].promo, chavePreco: `preco-${m.id}`, chavePromo: `promo-${m.id}`, precoReferencia: Number.isNaN(precoDelivery) ? null : precoDelivery }))
    if (!e.preco && precoDelivery == null && outras.some((m) => lerValor(dados.precos[m.id].preco) != null)) {
      e.preco = 'Preencha o preço do Delivery: ele vale para as modalidades sem preço próprio.'
    }
  }
  if (!dados.codigo.trim()) e.codigo = 'O código não pode ficar vazio.'
  grupos.forEach((g) => {
    const min = lerInteiro(g.minimo)
    const max = lerInteiro(g.maximo)
    if (Number.isNaN(min) || Number.isNaN(max)) e[`grupo-${g.id}`] = 'Mínimo e máximo precisam ser números inteiros.'
    else if (min > max) e[`grupo-${g.id}`] = 'O mínimo não pode ser maior que o máximo.'
    else if (g.obrigatorio && min < 1) e[`grupo-${g.id}`] = 'Escolha obrigatória precisa de mínimo 1 ou mais.'
    else if (max > g.itens.length) e[`grupo-${g.id}`] = `O máximo passa do número de opções (${g.itens.length}).`
    g.itens.forEach((i) => {
      if (Number.isNaN(lerValor(i.preco))) e[`item-${i.id}`] = 'Use só números.'
      if (permitePrecoPorModalidade(modalidades) && i.porModalidade) outras.forEach((m) => {
        if (Number.isNaN(lerValor(i.precos[m.id]))) e[`item-${i.id}-${m.id}`] = 'Use só números.'
      })
    })
  })
  if (!modalidades.some((m) => dados.modalidades[m.id])) e.modalidades = 'Escolha pelo menos uma modalidade.'
  if (dados.restringir) {
    if (!dados.faixas.length) e.faixas = 'Adicione uma faixa de horário ou desligue a restrição.'
    dados.faixas.forEach((f) => {
      if (!f.inicio || !f.fim) e[`faixa-${f.id}`] = 'Preencha o início e o fim.'
      else if (f.fim <= f.inicio) e[`faixa-${f.id}`] = 'O fim precisa ser depois do início.'
    })
  }
  return e
}

const abaDoErro = (chave) =>
  /^(nome|descricao|preco|precoPromo|codigo)$|^(preco|promo)-/.test(chave) ? 'info' : /^(grupo|item)-/.test(chave) ? 'complementos' : 'disponibilidade'

export function EdicaoProduto() {
  const { id } = useParams()
  const { cardapio, lojaId, estadoForcado } = usePrototipo()
  const [tentou, setTentou] = useState(false)
  useTitulo('Editar produto')
  const produto = cardapio.produtos.find((p) => p.id === 'p' + id)

  if (estadoForcado === 'carregando') {
    return (
      <div className="pagina">
        <CabecalhoPagina titulo="Editar produto" />
        <Carregando oQue="o produto">
          <div className="edicao-produto__grade">
            <div className="bloco"><Esqueleto linhas={6} altura="40px" /></div>
            <div className="bloco"><Esqueleto linhas={4} /></div>
          </div>
        </Carregando>
      </div>
    )
  }
  if (estadoForcado === 'erro' && !tentou) {
    return (
      <div className="pagina">
        <CabecalhoPagina titulo="Editar produto" />
        <EstadoErro oQue="o produto" aoTentar={() => setTentou(true)} />
      </div>
    )
  }
  if (!produto || estadoForcado === 'vazio') {
    return (
      <div className="pagina">
        <CabecalhoPagina titulo="Editar produto" />
        <EstadoVazio
          titulo="Este produto não existe ou foi excluído."
          texto="Confira o cardápio para encontrar o produto que você quer editar."
          acao={<Botao variante="principal" para="/cardapio">Voltar ao cardápio</Botao>}
        />
      </div>
    )
  }
  return <FormularioProduto key={`${lojaId}-${produto.id}`} produto={produto} />
}

function FormularioProduto({ produto }) {
  const { cardapio, loja, cen, cenarioId, avisar, simularFalha, podeAgir } = usePrototipo()
  const celular = useEhCelular()
  const navegar = useNavigate()
  const modalidadesLoja = useMemo(() => modalidadesDaLoja(cenarioId), [cenarioId])
  const comPrecoPorModalidade = permitePrecoPorModalidade(modalidadesLoja)
  const outrasModalidades = modalidadesLoja.filter((m) => m.id !== 'delivery')
  const [dados, setDados] = useState(() => detalhesProduto(produto, { semPdv: !!loja.semPdv, sigla: cen.marca.sigla, modalidades: modalidadesLoja }))
  const [grupos, setGrupos] = useState(() => gruposDoProduto(produto, cardapio))
  const [base, setBase] = useState(() => JSON.stringify({ dados, grupos }))
  const [aba, setAba] = useState('info')
  const [erros, setErros] = useState({})
  const [salvando, setSalvando] = useState(false)
  const [erroSalvar, setErroSalvar] = useState(false)
  const [saida, setSaida] = useState(null)
  const [grupoVisivel, setGrupoVisivel] = useState(0)
  const [grupoNovo, setGrupoNovo] = useState('')
  const nomeSalvo = useRef(produto.nome)

  const sujo = JSON.stringify({ dados, grupos }) !== base

  const mudar = (campo, valor) => {
    setDados((d) => ({ ...d, [campo]: valor }))
    setErros((e) => ({ ...e, [campo]: undefined }))
  }
  const mudarGrupo = (gid, mudanca) => {
    setGrupos((gs) => gs.map((g) => (g.id === gid ? { ...g, ...mudanca } : g)))
    setErros((e) => ({ ...e, [`grupo-${gid}`]: undefined }))
  }
  const mudarItem = (gid, iid, mudanca) => {
    setGrupos((gs) => gs.map((g) => (g.id === gid ? { ...g, itens: g.itens.map((i) => (i.id === iid ? { ...i, ...mudanca } : i)) } : g)))
    setErros((e) => ({ ...e, [`item-${iid}`]: undefined }))
  }
  const mudarPrecoModalidade = (mid, campo, valor) => {
    setDados((d) => ({ ...d, precos: { ...d.precos, [mid]: { ...d.precos[mid], [campo]: valor } } }))
    setErros((e) => ({ ...e, [`${campo}-${mid}`]: undefined, ...(campo === 'preco' ? { [`promo-${mid}`]: undefined } : {}) }))
  }
  const mudarPrecoItem = (gid, item, mid, valor) => {
    mudarItem(gid, item.id, { precos: { ...item.precos, [mid]: valor } })
    setErros((e) => ({ ...e, [`item-${item.id}-${mid}`]: undefined }))
  }
  const mudarFaixa = (fid, mudanca) => {
    setDados((d) => ({ ...d, faixas: d.faixas.map((f) => (f.id === fid ? { ...f, ...mudanca } : f)) }))
    setErros((e) => ({ ...e, [`faixa-${fid}`]: undefined }))
  }

  // Aviso ao sair com alterações: intercepta os links da página (menu, cabeçalho) e o fechar da aba
  useEffect(() => {
    if (!sujo) return
    const clique = (e) => {
      const a = e.target.closest?.('a[href^="#/"]')
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return
      e.preventDefault()
      e.stopPropagation()
      setSaida(a.getAttribute('href').slice(1))
    }
    const antesDeSair = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    document.addEventListener('click', clique, true)
    window.addEventListener('beforeunload', antesDeSair)
    return () => {
      document.removeEventListener('click', clique, true)
      window.removeEventListener('beforeunload', antesDeSair)
    }
  }, [sujo])

  const sair = (para) => (sujo ? setSaida(para) : navegar(para))

  const salvar = () => {
    const e = validar(dados, grupos, modalidadesLoja)
    setErros(e)
    const chaves = Object.keys(e)
    if (chaves.length) {
      const primeira = chaves[0]
      if (!celular) setAba(abaDoErro(primeira))
      if (celular && /^(grupo|item)-/.test(primeira)) {
        const idx = grupos.findIndex((g) => primeira === `grupo-${g.id}` || g.itens.some((i) => primeira === `item-${i.id}` || primeira.startsWith(`item-${i.id}-`)))
        if (idx >= 0) setGrupoVisivel(idx)
      }
      setTimeout(() => document.getElementById(`campo-${primeira}`)?.focus(), 50)
      return
    }
    setSalvando(true)
    setErroSalvar(false)
    setTimeout(() => {
      setSalvando(false)
      if (simularFalha || !podeAgir) {
        setErroSalvar(true)
        avisar('Não foi possível salvar o produto. O que você digitou continua na tela.', 'erro')
        return
      }
      nomeSalvo.current = dados.nome.trim()
      setBase(JSON.stringify({ dados, grupos }))
      avisar('Produto salvo', 'sucesso')
    }, 800)
  }

  const escolherFoto = (e) => {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return
    if (!arquivo.type.startsWith('image/')) return setErros((x) => ({ ...x, foto: 'Escolha uma imagem (JPG ou PNG).' }))
    setErros((x) => ({ ...x, foto: undefined }))
    mudar('foto', { nome: arquivo.name, url: URL.createObjectURL(arquivo) })
  }

  const gruposDisponiveis = cardapio.grupos.filter((g) => !grupos.some((x) => x.id === g.id))
  const adicionarGrupo = () => {
    const g = cardapio.grupos.find((x) => x.id === grupoNovo)
    if (!g) return
    const novo = gruposDoProduto({ ...produto, grupos: [g.id] }, cardapio)[0]
    setGrupos((gs) => [...gs, novo])
    setGrupoVisivel(grupos.length)
    setGrupoNovo('')
  }
  const tirarGrupo = (gid) => {
    setGrupos((gs) => gs.filter((g) => g.id !== gid))
    setGrupoVisivel(0)
  }

  const qtdErros = Object.values(erros).filter(Boolean).length

  // ---------- Preços ----------
  const precoDelivery = lerValor(dados.preco)
  const campoValor = ({ rotulo, id, erro, ajuda, valor, aoMudar }) => (
    <Campo rotulo={rotulo} erro={erro} id={id} ajuda={ajuda}>
      {(p) => (
        <span className="campo__prefixo">
          <span aria-hidden>R$</span>
          <input {...p} className="campo__entrada numero" inputMode="decimal" value={valor} onChange={(e) => aoMudar(e.target.value)} placeholder="0,00" />
        </span>
      )}
    </Campo>
  )
  const ajudaPrecoDelivery = dados.preco.trim()
    ? undefined
    : 'Sem preço, o produto não aparece no app.'
  const porModalidadeAtivo = dados.porModalidade && comPrecoPorModalidade
  const secaoPrecos = (
    <fieldset className="edicao-produto__conjunto edicao-produto__precos">
      <legend className="campo__rotulo">Preço</legend>
      {comPrecoPorModalidade ? (
        <div className="edicao-produto__modo-preco">
          {[
            [false, 'Mesmo preço em todas as modalidades', modalidadesLoja.map((m) => m.nome).join(', ')],
            [true, 'Preço diferente por modalidade', 'Modalidade sem preço próprio usa o preço do Delivery.'],
          ].map(([valor, rotulo, detalhe]) => (
            <label key={rotulo} className={`edicao-produto__opcao-preco ${dados.porModalidade === valor ? 'edicao-produto__opcao-preco--ativa' : ''}`}>
              <input type="radio" name="modo-preco" checked={dados.porModalidade === valor} onChange={() => mudar('porModalidade', valor)} />
              <span><strong>{rotulo}</strong><span className="texto-secundario edicao-produto__detalhe">{detalhe}</span></span>
            </label>
          ))}
        </div>
      ) : (
        <p className="campo__ajuda">
          {modalidadesLoja.length <= 1
            ? `A loja vende só em ${modalidadesLoja[0]?.nome || 'uma modalidade'}. Com mais modalidades ativas, você pode cobrar um preço em cada uma.`
            : 'O preço por modalidade usa o Delivery como referência. Ative o Delivery em Modalidades para usar.'}
        </p>
      )}
      {!porModalidadeAtivo ? (
        <div className="edicao-produto__duas">
          {campoValor({ rotulo: 'Preço', id: 'campo-preco', erro: erros.preco, ajuda: ajudaPrecoDelivery, valor: dados.preco, aoMudar: (v) => mudar('preco', v) })}
          {campoValor({ rotulo: 'Preço promocional', id: 'campo-precoPromo', erro: erros.precoPromo, ajuda: 'Opcional. Aparece com o preço antigo riscado.', valor: dados.precoPromo, aoMudar: (v) => mudar('precoPromo', v) })}
        </div>
      ) : (
        <div className="edicao-produto__por-modalidade">
          <fieldset className="edicao-produto__modalidade">
            <legend>Delivery</legend>
            <div className="edicao-produto__duas">
              {campoValor({ rotulo: 'Preço', id: 'campo-preco', erro: erros.preco, ajuda: ajudaPrecoDelivery || 'Referência para as modalidades sem preço próprio.', valor: dados.preco, aoMudar: (v) => mudar('preco', v) })}
              {campoValor({ rotulo: 'Preço promocional', id: 'campo-precoPromo', erro: erros.precoPromo, ajuda: 'Opcional.', valor: dados.precoPromo, aoMudar: (v) => mudar('precoPromo', v) })}
            </div>
          </fieldset>
          {outrasModalidades.map((m) => {
            const vale = precoNaModalidade(dados, m.id)
            const semPrecoProprio = !dados.precos[m.id].preco.trim()
            const usaDelivery = precoDelivery != null && !Number.isNaN(precoDelivery) ? `Usa o preço do Delivery (${moeda(precoDelivery)}).` : 'Usa o preço do Delivery.'
            return (
              <fieldset key={m.id} className="edicao-produto__modalidade">
                <legend>{m.nome}{!dados.modalidades[m.id] && <span className="texto-secundario edicao-produto__fora"> · fora desta modalidade (aba Disponibilidade)</span>}</legend>
                <div className="edicao-produto__duas">
                  {campoValor({ rotulo: 'Preço', id: `campo-preco-${m.id}`, erro: erros[`preco-${m.id}`], ajuda: semPrecoProprio ? usaDelivery : undefined, valor: dados.precos[m.id].preco, aoMudar: (v) => mudarPrecoModalidade(m.id, 'preco', v) })}
                  {campoValor({
                    rotulo: 'Preço promocional',
                    id: `campo-promo-${m.id}`,
                    erro: erros[`promo-${m.id}`],
                    ajuda: !dados.precos[m.id].promo.trim() && semPrecoProprio && vale.promo != null && !Number.isNaN(vale.promo) ? 'Usa a promoção do Delivery.' : 'Opcional.',
                    valor: dados.precos[m.id].promo,
                    aoMudar: (v) => mudarPrecoModalidade(m.id, 'promo', v),
                  })}
                </div>
              </fieldset>
            )
          })}
        </div>
      )}
    </fieldset>
  )

  // ---------- Informações ----------
  const secaoInformacoes = (
    <div className="formulario">
      <Campo rotulo="Nome" erro={erros.nome} id="campo-nome">
        {(p) => <input {...p} className="campo__entrada" value={dados.nome} onChange={(e) => mudar('nome', e.target.value)} maxLength={80} />}
      </Campo>
      <Campo rotulo="Descrição" erro={erros.descricao} id="campo-descricao" ajuda={<><span className="numero">{dados.descricao.length}</span> de <span className="numero">{LIMITE_DESCRICAO}</span> caracteres</>}>
        {(p) => <textarea {...p} className="campo__entrada" rows={3} value={dados.descricao} onChange={(e) => mudar('descricao', e.target.value)} placeholder="Ex.: massa crocante, recheio generoso" />}
      </Campo>
      <div className="campo">
        <span className="campo__rotulo" id="rotulo-foto">Foto</span>
        <div className="edicao-produto__foto">
          {dados.foto ? <img src={dados.foto.url} alt="" className="edicao-produto__miniatura" /> : <span className="edicao-produto__miniatura edicao-produto__miniatura--vazia" aria-hidden><ImageOff size={20} /></span>}
          <div className="edicao-produto__foto-acoes">
            <span className="texto-secundario">{dados.foto ? dados.foto.nome : 'Sem foto'}</span>
            <span className="edicao-produto__foto-botoes">
              <label className="botao botao--secundario botao--p edicao-produto__arquivo">
                {dados.foto ? 'Trocar foto' : 'Escolher foto'}
                <input type="file" accept="image/*" className="visualmente-oculto" onChange={escolherFoto} aria-describedby="rotulo-foto" />
              </label>
              {dados.foto && <Botao tamanho="p" variante="texto" onClick={() => mudar('foto', null)}>Remover foto</Botao>}
            </span>
          </div>
        </div>
        {erros.foto && <p className="campo__erro">{erros.foto}</p>}
      </div>
      {secaoPrecos}
      <Campo
        rotulo="Código"
        erro={erros.codigo}
        id="campo-codigo"
        ajuda={loja.semPdv ? 'Gerado automaticamente porque a loja não usa PDV. Você pode mudar.' : 'Código do produto no PDV. Precisa ser igual ao do PDV para os pedidos baterem.'}
      >
        {(p) => <input {...p} className="campo__entrada edicao-produto__codigo numero" value={dados.codigo} onChange={(e) => mudar('codigo', e.target.value)} />}
      </Campo>
    </div>
  )

  // ---------- Complementos ----------
  const blocoGrupo = (g) => (
    <fieldset key={g.id} className="edicao-produto__grupo">
      <legend>{g.nome}</legend>
      <div className="edicao-produto__regras">
        <Interruptor ligado={g.obrigatorio} aoMudar={(v) => mudarGrupo(g.id, { obrigatorio: v, minimo: v && g.minimo === '0' ? '1' : g.minimo })} rotuloVisivel="Escolha obrigatória" />
        <Selo tom="neutro" ponto={false}>{g.obrigatorio ? 'Obrigatório' : 'Opcional'}</Selo>
      </div>
      <div className="edicao-produto__duas edicao-produto__duas--estreitas">
        <Campo rotulo="Mínimo" id={`campo-grupo-${g.id}`}>
          {(p) => <input {...p} aria-invalid={erros[`grupo-${g.id}`] ? true : undefined} className="campo__entrada numero" inputMode="numeric" value={g.minimo} onChange={(e) => mudarGrupo(g.id, { minimo: e.target.value })} />}
        </Campo>
        <Campo rotulo="Máximo">
          {(p) => <input {...p} aria-invalid={erros[`grupo-${g.id}`] ? true : undefined} className="campo__entrada numero" inputMode="numeric" value={g.maximo} onChange={(e) => mudarGrupo(g.id, { maximo: e.target.value })} />}
        </Campo>
      </div>
      {erros[`grupo-${g.id}`] && <p className="campo__erro" role="alert">{erros[`grupo-${g.id}`]}</p>}
      <ul className="edicao-produto__itens" aria-label={`Opções de ${g.nome}`}>
        {g.itens.map((i) => {
          const aberto = comPrecoPorModalidade && i.porModalidade
          const entradaPreco = ({ mid, rotulo }) => {
            const chave = mid === 'delivery' ? `item-${i.id}` : `item-${i.id}-${mid}`
            const valor = mid === 'delivery' ? i.preco : i.precos[mid]
            const herda = mid !== 'delivery' && !String(valor).trim()
            return (
              <span className="edicao-produto__item-preco" key={mid}>
                {rotulo && <label htmlFor={`campo-${chave}`} className="edicao-produto__item-rotulo">{rotulo}</label>}
                <span className="campo__prefixo">
                  <span aria-hidden>+ R$</span>
                  <input
                    id={`campo-${chave}`}
                    className="campo__entrada numero"
                    inputMode="decimal"
                    aria-label={rotulo ? undefined : `Preço adicional de ${i.nome}`}
                    aria-describedby={herda ? `ajuda-${chave}` : undefined}
                    aria-invalid={erros[chave] ? true : undefined}
                    value={valor}
                    onChange={(e) => (mid === 'delivery' ? mudarItem(g.id, i.id, { preco: e.target.value }) : mudarPrecoItem(g.id, i, mid, e.target.value))}
                  />
                </span>
                {herda && <span id={`ajuda-${chave}`} className="campo__ajuda">Usa o preço do Delivery</span>}
                {erros[chave] && <span className="campo__erro">{erros[chave]}</span>}
              </span>
            )
          }
          return (
            <li key={i.id} className={`edicao-produto__item ${aberto ? 'edicao-produto__item--aberto' : ''}`}>
              <span className="edicao-produto__item-nome">{i.nome}</span>
              {aberto ? <span className="edicao-produto__item-resumo texto-secundario">Por modalidade</span> : entradaPreco({ mid: 'delivery' })}
              {comPrecoPorModalidade ? (
                <Botao
                  tamanho="p"
                  variante="texto"
                  aria-expanded={aberto}
                  aria-controls={aberto ? `modalidades-${i.id}` : undefined}
                  aria-label={aberto ? `Usar o mesmo preço em todas as modalidades para ${i.nome}` : `Preço por modalidade para ${i.nome}`}
                  onClick={() => mudarItem(g.id, i.id, { porModalidade: !aberto })}
                >
                  {aberto ? 'Mesmo preço' : 'Preço por modalidade'}
                </Botao>
              ) : <span />}
              <Interruptor grande={celular} ligado={i.aVenda} aoMudar={(v) => mudarItem(g.id, i.id, { aVenda: v })} rotulo={`${i.nome} à venda`} />
              <span className="edicao-produto__item-estado">{i.aVenda ? 'À venda' : 'Pausado'}</span>
              {aberto && (
                <div id={`modalidades-${i.id}`} className="edicao-produto__item-modalidades" role="group" aria-label={`Preço adicional de ${i.nome} por modalidade`}>
                  {modalidadesLoja.map((m) => entradaPreco({ mid: m.id, rotulo: m.nome }))}
                </div>
              )}
            </li>
          )
        })}
      </ul>
      <p className="campo__ajuda">Pausar uma opção aqui tira ela de todos os produtos que usam {g.nome}.</p>
      <Botao tamanho="p" variante="texto" onClick={() => tirarGrupo(g.id)}>Tirar {g.nome} deste produto</Botao>
    </fieldset>
  )

  const indiceGrupo = Math.min(grupoVisivel, Math.max(0, grupos.length - 1))
  const secaoComplementos = (
    <div className="formulario">
      {grupos.length === 0 && <EstadoVazio compacto titulo="Este produto não tem complementos." texto="Complementos são escolhas como sabor, borda ou adicionais." />}
      {grupos.length > 0 && !celular && grupos.map(blocoGrupo)}
      {grupos.length > 0 && celular && (
        <>
          {grupos.length > 1 && (
            <nav className="edicao-produto__navegar-grupos" aria-label="Grupos de complementos">
              <Botao icone={ChevronLeft} onClick={() => setGrupoVisivel(indiceGrupo - 1)} disabled={indiceGrupo === 0}>Grupo anterior</Botao>
              <span aria-live="polite">Grupo <span className="numero">{indiceGrupo + 1}</span> de <span className="numero">{grupos.length}</span></span>
              <Botao onClick={() => setGrupoVisivel(indiceGrupo + 1)} disabled={indiceGrupo === grupos.length - 1}>Próximo grupo <ChevronRight size={16} aria-hidden /></Botao>
            </nav>
          )}
          {blocoGrupo(grupos[indiceGrupo])}
        </>
      )}
      {gruposDisponiveis.length > 0 && (
        <div className="edicao-produto__adicionar-grupo">
          <Campo rotulo="Adicionar grupo de complementos">
            {(p) => (
              <select {...p} className="campo__entrada" value={grupoNovo} onChange={(e) => setGrupoNovo(e.target.value)}>
                <option value="">Escolha um grupo</option>
                {gruposDisponiveis.map((g) => <option key={g.id} value={g.id}>{g.nome} ({plural(g.itens.length, 'opção', 'opções')})</option>)}
              </select>
            )}
          </Campo>
          <Botao icone={Plus} onClick={adicionarGrupo} disabled={!grupoNovo}>Adicionar grupo</Botao>
        </div>
      )}
    </div>
  )

  // ---------- Disponibilidade ----------
  const secaoDisponibilidade = (
    <div className="formulario">
      <fieldset className="edicao-produto__conjunto" aria-describedby={erros.modalidades ? 'erro-modalidades' : undefined}>
        <legend className="campo__rotulo">Onde o produto aparece</legend>
        {modalidadesLoja.map((m, n) => (
          <label key={m.id} className="edicao-produto__marcar">
            <input
              type="checkbox"
              className="caixa"
              id={n === 0 ? 'campo-modalidades' : undefined}
              checked={!!dados.modalidades[m.id]}
              onChange={(e) => mudar('modalidades', { ...dados.modalidades, [m.id]: e.target.checked })}
            />
            {m.nome}
          </label>
        ))}
        <p className="campo__ajuda">Só aparecem as modalidades ativas da loja.</p>
        {erros.modalidades && <p id="erro-modalidades" className="campo__erro">{erros.modalidades}</p>}
      </fieldset>
      <Interruptor ligado={dados.restringir} aoMudar={(v) => mudar('restringir', v)} rotuloVisivel="Vender só em alguns horários" />
      {dados.restringir && (
        <>
          {dados.faixas.map((f, n) => (
            <fieldset key={f.id} className="edicao-produto__faixa">
              <legend>Faixa {n + 1}</legend>
              <Campo rotulo="Dias">
                {(p) => (
                  <select {...p} className="campo__entrada" value={f.dias} onChange={(e) => mudarFaixa(f.id, { dias: e.target.value })}>
                    {OPCOES_DIAS.map((o) => <option key={o.id} value={o.id}>{o.rotulo}</option>)}
                  </select>
                )}
              </Campo>
              <Campo rotulo="Início" id={`campo-faixa-${f.id}`}>
                {(p) => <input {...p} type="time" className="campo__entrada numero" aria-invalid={erros[`faixa-${f.id}`] ? true : undefined} value={f.inicio} onChange={(e) => mudarFaixa(f.id, { inicio: e.target.value })} />}
              </Campo>
              <Campo rotulo="Fim">
                {(p) => <input {...p} type="time" className="campo__entrada numero" aria-invalid={erros[`faixa-${f.id}`] ? true : undefined} value={f.fim} onChange={(e) => mudarFaixa(f.id, { fim: e.target.value })} />}
              </Campo>
              <Botao variante="texto" className="edicao-produto__remover" aria-label={`Remover faixa ${n + 1}`} onClick={() => mudar('faixas', dados.faixas.filter((x) => x.id !== f.id))}>Remover</Botao>
              {erros[`faixa-${f.id}`] && <p className="campo__erro edicao-produto__faixa-erro" role="alert">{erros[`faixa-${f.id}`]}</p>}
            </fieldset>
          ))}
          {erros.faixas && <p className="campo__erro" id="campo-faixas" tabIndex={-1}>{erros.faixas}</p>}
          <div>
            <Botao icone={Plus} onClick={() => mudar('faixas', [...dados.faixas, { id: `f${Date.now()}`, dias: 'todos', inicio: '18:00', fim: '23:00' }])}>Adicionar faixa</Botao>
          </div>
        </>
      )}
    </div>
  )

  const acoes = (
    <>
      <Botao onClick={() => sair('/cardapio')}>Cancelar</Botao>
      <Botao variante="principal" onClick={salvar} carregando={salvando} mudaAlgo>Salvar</Botao>
    </>
  )

  const avisos = (
    <>
      {qtdErros > 0 && (
        <FaixaAviso tom="erro">Confira {qtdErros === 1 ? 'o campo marcado' : `os ${qtdErros} campos marcados`} antes de salvar.</FaixaAviso>
      )}
      {erroSalvar && (
        <FaixaAviso tom="erro" acao={<Botao tamanho="p" onClick={salvar} mudaAlgo>Tentar de novo</Botao>}>
          Não foi possível salvar o produto. O que você digitou continua aqui.
        </FaixaAviso>
      )}
    </>
  )

  return (
    <div className="pagina edicao-produto">
      {celular && <FaixaAviso tom="info" icone={Info}>A edição completa funciona melhor no computador.</FaixaAviso>}
      <Botao variante="texto" className="botao--voltar" icone={ArrowLeft} onClick={() => sair('/cardapio')}>Voltar ao cardápio</Botao>
      <CabecalhoPagina
        titulo={`Editar ${nomeSalvo.current}`}
        descricao={cardapio.categorias.find((c) => c.id === produto.categoria)?.nome}
        acoes={!celular && acoes}
      >
        {sujo && <p className="edicao-produto__pendente"><Selo tom="ambar">Alterações não salvas</Selo></p>}
      </CabecalhoPagina>
      {cen.rede && (
        <p className="edicao-produto__copiar">
          <Botao variante="secundario" tamanho="p" icone={Copy} onClick={() => sair(`/cardapio/copiar?produto=${produto.id.replace('p', '')}`)}>
            Copiar este produto para outras lojas
          </Botao>
          <span className="texto-secundario">{sujo ? 'Salve antes: a cópia leva a versão salva.' : 'Abre a cópia com este produto já escolhido.'}</span>
        </p>
      )}
      {avisos}

      {celular ? (
        <div className="edicao-produto__secoes">
          <section className="bloco" aria-labelledby="sec-info"><h2 id="sec-info" className="edicao-produto__titulo-secao">Informações</h2>{secaoInformacoes}</section>
          <section className="bloco" aria-labelledby="sec-comp"><h2 id="sec-comp" className="edicao-produto__titulo-secao">Complementos</h2>{secaoComplementos}</section>
          <section className="bloco" aria-labelledby="sec-disp"><h2 id="sec-disp" className="edicao-produto__titulo-secao">Disponibilidade</h2>{secaoDisponibilidade}</section>
          <Previa dados={dados} grupos={grupos} modalidades={modalidadesLoja} />
          <div className="edicao-produto__acoes-celular">{acoes}</div>
        </div>
      ) : (
        <div className="edicao-produto__grade">
          <div className="bloco edicao-produto__principal">
            <Abas
              rotulo="Partes do produto"
              ativa={aba}
              aoMudar={setAba}
              abas={[
                { id: 'info', rotulo: 'Informações' },
                { id: 'complementos', rotulo: 'Complementos', contagem: grupos.length || undefined },
                { id: 'disponibilidade', rotulo: 'Disponibilidade' },
              ]}
            />
            <div role="tabpanel" aria-label={aba === 'info' ? 'Informações' : aba === 'complementos' ? 'Complementos' : 'Disponibilidade'} className="edicao-produto__painel">
              {aba === 'info' && secaoInformacoes}
              {aba === 'complementos' && secaoComplementos}
              {aba === 'disponibilidade' && secaoDisponibilidade}
            </div>
          </div>
          <Previa dados={dados} grupos={grupos} modalidades={modalidadesLoja} />
        </div>
      )}

      <Sobreposicao
        aberto={!!saida}
        aoFechar={() => setSaida(null)}
        titulo="Sair sem salvar?"
        forma="modal"
        largura="440px"
        rodape={
          <>
            <Botao onClick={() => setSaida(null)} data-foco-inicial>Continuar editando</Botao>
            <Botao variante="destrutivo" onClick={() => { const para = saida; setBase(JSON.stringify({ dados, grupos })); setSaida(null); setTimeout(() => navegar(para), 0) }}>
              Sair sem salvar
            </Botao>
          </>
        }
      >
        <p className="texto-corpo">As alterações em {nomeSalvo.current} ainda não foram salvas e serão perdidas.</p>
      </Sobreposicao>
    </div>
  )
}

// Prévia de como o item aparece no app do cliente, com o preço da modalidade escolhida
function Previa({ dados, grupos, modalidades }) {
  const visiveis = modalidades.filter((m) => dados.modalidades[m.id])
  const [verComo, setVerComo] = useState(visiveis[0]?.id ?? 'delivery')
  const atual = visiveis.some((m) => m.id === verComo) ? verComo : visiveis[0]?.id
  const { preco, promo, herda } = precoNaModalidade(dados, atual ?? 'delivery')
  const temPreco = preco != null && !Number.isNaN(preco)
  const temPromo = temPreco && promo != null && !Number.isNaN(promo) && promo < preco
  const nomeAtual = modalidades.find((m) => m.id === atual)?.nome
  const ondeAparece =
    visiveis.length === modalidades.length ? null : visiveis.length === 0 ? 'Não aparece em nenhuma modalidade' : `Só em ${visiveis.map((m) => m.nome).join(' e ')}`
  // preço adicional da opção na modalidade vista; sem preço próprio, segue o Delivery
  const adicional = (i) => {
    const proprio = atual && atual !== 'delivery' && i.porModalidade ? lerValor(i.precos[atual]) : null
    const v = proprio ?? lerValor(i.preco)
    return v && !Number.isNaN(v) ? v : null
  }
  return (
    <aside className="edicao-produto__previa" aria-labelledby="titulo-previa">
      <h2 id="titulo-previa" className="edicao-produto__titulo-secao">Prévia no app</h2>
      {visiveis.length > 1 && (
        <div className="edicao-produto__ver-como">
          <span id="rotulo-ver-como" className="edicao-produto__ver-como-rotulo">Ver como</span>
          <div className="seletor-periodo" role="group" aria-labelledby="rotulo-ver-como">
            {visiveis.map((m) => (
              <button key={m.id} type="button" className="seletor-periodo__opcao" aria-pressed={atual === m.id} onClick={() => setVerComo(m.id)}>
                {m.nome}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="edicao-produto__app">
        {dados.foto ? <img src={dados.foto.url} alt="" className="edicao-produto__app-foto" /> : <span className="edicao-produto__app-foto edicao-produto__app-foto--vazia"><ImageOff size={24} aria-hidden /> Sem foto</span>}
        <div className="edicao-produto__app-corpo">
          <p className="edicao-produto__app-nome">{dados.nome.trim() || 'Nome do produto'}</p>
          {dados.descricao.trim() && <p className="edicao-produto__app-descricao">{dados.descricao.trim()}</p>}
          <p className="edicao-produto__app-preco" aria-live="polite">
            {!temPreco ? <span className="preco preco--sem">Sem preço: não aparece no app</span> : temPromo ? <><s className="texto-secundario numero">{moeda(preco)}</s> <strong className="numero">{moeda(promo)}</strong></> : <strong className="numero">{moeda(preco)}</strong>}
            {dados.porModalidade && herda && temPreco && atual !== 'delivery' && <span className="edicao-produto__app-herda">Mesmo preço do Delivery</span>}
          </p>
          {grupos.map((g) => {
            const comPreco = g.itens.filter((i) => i.aVenda && adicional(i) != null).map(adicional)
            return (
              <p key={g.id} className="edicao-produto__app-grupo">
                <span>{g.nome}: escolha <span className="numero">{g.minimo === g.maximo ? g.maximo : `${g.minimo} a ${g.maximo}`}</span></span>
                <span className="texto-secundario">
                  {g.obrigatorio ? 'Obrigatório' : 'Opcional'} · {plural(g.itens.filter((i) => i.aVenda).length, 'opção à venda', 'opções à venda')}
                  {comPreco.length > 0 && <> · <span className="numero">+ {moeda(Math.min(...comPreco))}{Math.max(...comPreco) > Math.min(...comPreco) && ` a + ${moeda(Math.max(...comPreco))}`}</span></>}
                </span>
              </p>
            )
          })}
          {ondeAparece && <p className="edicao-produto__app-nota">{ondeAparece}</p>}
          {dados.restringir && dados.faixas.length > 0 && (
            <p className="edicao-produto__app-nota">
              Disponível {dados.faixas.map((f) => `${OPCOES_DIAS.find((o) => o.id === f.dias).rotulo.toLowerCase()}, ${f.inicio || '--:--'} às ${f.fim || '--:--'}`).join('; ')}
            </p>
          )}
        </div>
      </div>
      {nomeAtual && visiveis.length > 1 && <p className="campo__ajuda edicao-produto__previa-nota">Preço mostrado para {nomeAtual}.</p>}
    </aside>
  )
}
