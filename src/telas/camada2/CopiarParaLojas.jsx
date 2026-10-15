// T12. Copiar para outras lojas (só rede): assistente em 4 etapas, progresso e resultado por loja.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Search } from 'lucide-react'
import { usePrototipo } from '../../contexto/Prototipo.jsx'
import { useEhCelular, useTitulo } from '../../utilitarios/ganchos.js'
import { hora, plural } from '../../utilitarios/formatos.js'
import { LOJA_QUE_FALHA, idDaUrl, temPrecoPorModalidade } from '../../dados/cardapio2.js'
import { Botao, CabecalhoPagina, Campo, Carregando, EstadoErro, EstadoVazio, Esqueleto, FaixaAviso, Selo } from '../../componentes/base.jsx'
import '../../estilos/cardapio2.css'

const ETAPAS = ['Origem', 'O que copiar', 'Para onde', 'Resumo']
const normalizar = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

function Busca({ valor, aoMudar, rotulo }) {
  return (
    <div className="busca">
      <Search size={18} aria-hidden className="busca__icone" />
      <input type="search" className="busca__campo" placeholder={rotulo} aria-label={rotulo} value={valor} onChange={(e) => aoMudar(e.target.value)} />
    </div>
  )
}

export function CopiarParaLojas() {
  const { cen, lojaId, lojasVisiveis, cardapios, estadoForcado, avisar, simularFalha, podeAgir, estadoLojas } = usePrototipo()
  const celular = useEhCelular()
  const navegar = useNavigate()
  const [busca] = useSearchParams()
  useTitulo('Copiar para outras lojas')

  // ?produto=3 ou ?categoria=2 (vindos da edição de produto ou do cardápio) já abrem na etapa 2 com a escolha feita
  const entrada = useMemo(() => {
    const cardapioDaLoja = cardapios[lojaId]
    const produtoUrl = idDaUrl(busca.get('produto'), 'p')
    const categoriaUrl = idDaUrl(busca.get('categoria'), 'c')
    if (produtoUrl) {
      const prod = cardapioDaLoja?.produtos.find((x) => x.id === produtoUrl)
      return prod ? { tipo: 'produtos', id: prod.id, nome: prod.nome, voltar: `/cardapio/produto/${prod.id.replace('p', '')}` } : { invalido: 'O produto escolhido não existe nesta loja. Escolha o que copiar.' }
    }
    if (categoriaUrl) {
      const cat = cardapioDaLoja?.categorias.find((x) => x.id === categoriaUrl)
      return cat ? { tipo: 'categorias', id: cat.id, nome: cat.nome } : { invalido: 'A categoria escolhida não existe nesta loja. Escolha o que copiar.' }
    }
    return null
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [etapa, setEtapa] = useState(entrada ? 2 : 1)
  const [origemId, setOrigemId] = useState(lojaId)
  const [tipo, setTipo] = useState(entrada?.tipo || 'tudo') // 'tudo' | 'categorias' | 'produtos'
  const [categoriasSel, setCategoriasSel] = useState(() => new Set(entrada?.tipo === 'categorias' ? [entrada.id] : []))
  const [produtosSel, setProdutosSel] = useState(() => new Set(entrada?.tipo === 'produtos' ? [entrada.id] : []))
  const [copiarPrecosModalidade, setCopiarPrecosModalidade] = useState(true)
  const [manterPrecosDestino, setManterPrecosDestino] = useState(false)
  const [buscaItens, setBuscaItens] = useState('')
  const [destinos, setDestinos] = useState(() => new Set())
  const [buscaLojas, setBuscaLojas] = useState('')
  const [erroEtapa, setErroEtapa] = useState(null)
  const [fase, setFase] = useState('assistente') // 'assistente' | 'copiando' | 'resultado'
  const [progresso, setProgresso] = useState({}) // lojaId -> { estado, motivo }
  const [tentou, setTentou] = useState(false)
  const tituloEtapa = useRef(null)

  const origem = lojasVisiveis.find((l) => l.id === origemId)
  const cardapioOrigem = cardapios[origemId]
  // a origem e as lojas de teste nunca são destino
  const lojasDestino = cen.lojas.filter((l) => !l.teste && l.id !== origemId)

  // ao trocar de etapa, o foco vai para o título dela (não na abertura da página)
  const primeiraVez = useRef(true)
  useEffect(() => {
    if (primeiraVez.current) {
      primeiraVez.current = false
      return
    }
    if (fase === 'assistente') tituloEtapa.current?.focus()
  }, [etapa, fase])

  const irPara = (n) => {
    setErroEtapa(null)
    setEtapa(n)
  }

  const trocarOrigem = (id) => {
    setOrigemId(id)
    setCategoriasSel(new Set())
    setProdutosSel(new Set())
    setDestinos((d) => { const n = new Set(d); n.delete(id); return n })
  }

  const alternar = (setter, id) => setter((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  // ---------- O que copiar ----------
  const b = normalizar(buscaItens.trim())
  const categoriasFiltradas = (cardapioOrigem?.categorias || []).filter((c) => !b || normalizar(c.nome).includes(b))
  const produtosFiltrados = (cardapioOrigem?.produtos || []).filter((p) => !b || normalizar(p.nome).includes(b))

  const resumoItens = useMemo(() => {
    if (!cardapioOrigem) return { texto: '', qtdProdutos: 0 }
    if (tipo === 'tudo') return { texto: `Cardápio inteiro: ${plural(cardapioOrigem.categorias.length, 'categoria', 'categorias')}, ${plural(cardapioOrigem.produtos.length, 'produto', 'produtos')} e ${plural(cardapioOrigem.grupos.length, 'grupo de complementos', 'grupos de complementos')}`, lista: [], qtdProdutos: cardapioOrigem.produtos.length }
    if (tipo === 'categorias') {
      const cats = cardapioOrigem.categorias.filter((c) => categoriasSel.has(c.id))
      const qtd = cardapioOrigem.produtos.filter((p) => categoriasSel.has(p.categoria)).length
      return { texto: `${plural(cats.length, 'categoria', 'categorias')}, com ${plural(qtd, 'produto', 'produtos')}`, lista: cats.map((c) => c.nome), qtdProdutos: qtd }
    }
    const prods = cardapioOrigem.produtos.filter((p) => produtosSel.has(p.id))
    return { texto: plural(prods.length, 'produto', 'produtos'), lista: prods.map((p) => p.nome), qtdProdutos: prods.length }
  }, [cardapioOrigem, tipo, categoriasSel, produtosSel])

  // produtos que a cópia leva, para o detalhe por loja
  const produtosEscolhidos = useMemo(() => {
    if (!cardapioOrigem) return []
    if (tipo === 'tudo') return cardapioOrigem.produtos
    if (tipo === 'categorias') return cardapioOrigem.produtos.filter((p) => categoriasSel.has(p.categoria))
    return cardapioOrigem.produtos.filter((p) => produtosSel.has(p.id))
  }, [cardapioOrigem, tipo, categoriasSel, produtosSel])
  const qtdComPrecoModalidade = produtosEscolhidos.filter(temPrecoPorModalidade).length

  const textoPrecos = [
    copiarPrecosModalidade
      ? `Copia os preços por modalidade${qtdComPrecoModalidade ? ` (${plural(qtdComPrecoModalidade, 'produto tem', 'produtos têm')} preço diferente)` : ''}`
      : 'Não copia os preços por modalidade: o destino usa o preço do Delivery',
    manterPrecosDestino ? 'Mantém o preço de quem já tem o produto' : 'Substitui o preço de quem já tem o produto',
  ]

  // O que muda em cada loja: produtos novos, atualizados e o que acontece com o preço
  const detalheLoja = (id) => {
    const nomes = new Set((cardapios[id]?.produtos || []).map((p) => p.nome))
    const atualizados = produtosEscolhidos.filter((p) => nomes.has(p.nome)).length
    const novos = produtosEscolhidos.length - atualizados
    const partes = []
    if (novos) partes.push(plural(novos, 'produto novo', 'produtos novos'))
    if (atualizados) partes.push(plural(atualizados, 'produto atualizado', 'produtos atualizados'))
    if (atualizados && manterPrecosDestino) partes.push('preços da loja mantidos')
    else if (copiarPrecosModalidade && qtdComPrecoModalidade) partes.push('preços por modalidade copiados')
    return partes.join(' · ')
  }

  // ---------- Para onde ----------
  const bl = normalizar(buscaLojas.trim())
  const lojasFiltradas = lojasDestino.filter((l) => !bl || normalizar(`${l.nome} ${l.cidade} ${l.id}`).includes(bl))
  const todasFiltradasMarcadas = lojasFiltradas.length > 0 && lojasFiltradas.every((l) => destinos.has(l.id))
  const selecionarTodas = () =>
    setDestinos((d) => {
      const n = new Set(d)
      lojasFiltradas.forEach((l) => (todasFiltradasMarcadas ? n.delete(l.id) : n.add(l.id)))
      return n
    })
  const listaDestinos = lojasDestino.filter((l) => destinos.has(l.id))

  const avancar = () => {
    if (etapa === 2 && tipo === 'categorias' && categoriasSel.size === 0) return setErroEtapa('Escolha pelo menos uma categoria.')
    if (etapa === 2 && tipo === 'produtos' && produtosSel.size === 0) return setErroEtapa('Escolha pelo menos um produto.')
    if (etapa === 3 && destinos.size === 0) return setErroEtapa('Escolha pelo menos uma loja de destino.')
    irPara(etapa + 1)
  }

  // ---------- Copiar, loja por loja ----------
  // A Unidade Centro está sem conexão e falha; se ela não estiver entre os destinos, a primeira loja falha por tempo esgotado.
  const motivoFalha = (id, ids) => {
    if (simularFalha || !podeAgir) return 'Não foi possível falar com o servidor. Nada foi copiado para esta loja.'
    if (id === LOJA_QUE_FALHA && estadoLojas[id]?.conexao === 'sem') return `A loja está sem conexão desde ${hora(estadoLojas[id].semConexaoDesde)}. Nada foi copiado para ela.`
    if (!ids.includes(LOJA_QUE_FALHA) && id === ids[0]) return 'A loja não respondeu a tempo. Nada foi copiado para ela.'
    return null
  }

  const copiar = (ids, repetindo) => {
    setFase('copiando')
    setProgresso((p) => {
      const n = repetindo ? { ...p } : {}
      ids.forEach((id) => (n[id] = { estado: 'fila' }))
      return n
    })
    ids.forEach((id, i) => {
      setTimeout(() => setProgresso((p) => ({ ...p, [id]: { estado: 'copiando' } })), i * 600)
      setTimeout(() => {
        // ao repetir, só a loja sem conexão volta a falhar
        const motivo = repetindo ? (id === LOJA_QUE_FALHA || simularFalha || !podeAgir ? motivoFalha(id, [LOJA_QUE_FALHA]) : null) : motivoFalha(id, ids)
        setProgresso((p) => ({ ...p, [id]: motivo ? { estado: 'falhou', motivo } : { estado: 'copiado', detalhe: detalheLoja(id) } }))
        if (i === ids.length - 1) setTimeout(() => setFase('resultado'), 300)
      }, i * 600 + 550)
    })
  }

  const idsProgresso = Object.keys(progresso).map(Number)
  const sucessos = idsProgresso.filter((id) => progresso[id].estado === 'copiado')
  const falhas = idsProgresso.filter((id) => progresso[id].estado === 'falhou')
  const nomeLoja = (id) => cen.lojas.find((l) => l.id === id)?.nome

  useEffect(() => {
    if (fase !== 'resultado') return
    if (falhas.length === 0) avisar(`Copiado para ${plural(sucessos.length, 'loja', 'lojas')}.`, 'sucesso')
    else avisar(`A cópia falhou em ${plural(falhas.length, 'loja', 'lojas')}. Veja o resultado por loja.`, 'erro')
  }, [fase]) // eslint-disable-line react-hooks/exhaustive-deps

  const recomecar = () => {
    setFase('assistente')
    setProgresso({})
    setDestinos(new Set())
    setCategoriasSel(new Set())
    setProdutosSel(new Set())
    setTipo('tudo')
    setCopiarPrecosModalidade(true)
    setManterPrecosDestino(false)
    irPara(1)
  }

  // ---------- Estrutura ----------
  const cabecalho = (
    <>
      {entrada?.voltar ? (
        <Botao variante="texto" className="botao--voltar" icone={ArrowLeft} para={entrada.voltar}>Voltar a {entrada.nome}</Botao>
      ) : (
        <Botao variante="texto" className="botao--voltar" icone={ArrowLeft} para="/cardapio">Voltar ao cardápio</Botao>
      )}
      <CabecalhoPagina titulo="Copiar para outras lojas" descricao="Leve um item, uma categoria ou o cardápio inteiro de uma loja para outras." />
    </>
  )

  if (estadoForcado === 'carregando') {
    return (
      <div className="pagina copiar">
        {cabecalho}
        <Carregando oQue="as lojas e o cardápio"><div className="bloco"><Esqueleto linhas={5} altura="36px" /></div></Carregando>
      </div>
    )
  }
  if (estadoForcado === 'erro' && !tentou) {
    return <div className="pagina copiar">{cabecalho}<EstadoErro oQue="as lojas e o cardápio" aoTentar={() => setTentou(true)} /></div>
  }

  const origemVazia = estadoForcado === 'vazio' || !cardapioOrigem || cardapioOrigem.produtos.length === 0

  const faixaOrigem = (
    <div className="copiar__origem" role="note" aria-label="Loja de origem">
      <span><span className="texto-secundario">Origem:</span> <strong>{origem?.nome}</strong> <span className="texto-secundario">· {origem?.cidade} · ID <span className="numero">{origemId}</span></span></span>
      {fase === 'assistente' && etapa !== 1 && <Botao tamanho="p" variante="texto" onClick={() => irPara(1)} aria-label="Trocar a loja de origem">Trocar</Botao>}
    </div>
  )

  // ---------- Progresso e resultado ----------
  if (fase !== 'assistente') {
    const terminou = fase === 'resultado'
    return (
      <div className="pagina copiar">
        {cabecalho}
        {faixaOrigem}
        <section className="bloco copiar__bloco" aria-labelledby="titulo-progresso">
          <h2 id="titulo-progresso" className="copiar__titulo" tabIndex={-1}>
            {!terminou ? 'Copiando…' : falhas.length === 0 ? `Copiado para ${plural(sucessos.length, 'loja', 'lojas')}` : sucessos.length === 0 ? 'A cópia não foi feita em nenhuma loja' : `Copiado para ${sucessos.length} de ${plural(idsProgresso.length, 'loja', 'lojas')}`}
          </h2>
          <p className="texto-corpo">{resumoItens.texto}. {textoPrecos.join('. ')}.</p>
          {terminou && (
            <dl className="copiar__kpis">
              <div className="copiar__kpi"><dt className="rotulo-kpi">Lojas com cópia feita</dt><dd className="numero-kpi">{sucessos.length}</dd></div>
              <div className="copiar__kpi"><dt className="rotulo-kpi">Lojas que falharam</dt><dd className="numero-kpi">{falhas.length}</dd></div>
              <div className="copiar__kpi"><dt className="rotulo-kpi">Produtos por loja</dt><dd className="numero-kpi">{resumoItens.qtdProdutos}</dd></div>
            </dl>
          )}
          {terminou && falhas.length > 0 && (
            <FaixaAviso tom="erro" icone={AlertTriangle}>
              {plural(falhas.length, 'loja não recebeu', 'lojas não receberam')} a cópia. O cardápio {falhas.length === 1 ? 'dela' : 'delas'} continua como estava.
            </FaixaAviso>
          )}
          <ul className="copiar__progresso" aria-live="polite">
            {idsProgresso.map((id) => {
              const p = progresso[id]
              return (
                <li key={id} className="copiar__loja-progresso">
                  <span className="copiar__loja-nome">{nomeLoja(id)}</span>
                  {p.estado === 'fila' && <Selo tom="cinza">Na fila</Selo>}
                  {p.estado === 'copiando' && <Selo tom="azul">Copiando</Selo>}
                  {p.estado === 'copiado' && <Selo tom="verde">Copiado</Selo>}
                  {p.estado === 'falhou' && <Selo tom="vermelho">Falhou</Selo>}
                  {p.motivo && <span className="copiar__motivo">{p.motivo}</span>}
                  {p.estado === 'copiado' && p.detalhe && <span className="copiar__detalhe-loja">{p.detalhe}</span>}
                </li>
              )
            })}
          </ul>
          {terminou && (
            <div className="copiar__acoes">
              {falhas.length > 0 && <Botao variante="principal" onClick={() => copiar(falhas, true)} mudaAlgo>Tentar de novo {falhas.length === 1 ? 'na loja que falhou' : `nas ${falhas.length} lojas que falharam`}</Botao>}
              <Botao onClick={recomecar}>Fazer outra cópia</Botao>
              <Botao variante="texto" onClick={() => navegar('/cardapio')}>Voltar ao cardápio</Botao>
            </div>
          )}
        </section>
      </div>
    )
  }

  // ---------- Etapas ----------
  let corpo
  if (etapa === 1) {
    corpo = (
      <Campo rotulo="Loja de origem" ajuda="O cardápio desta loja é o modelo da cópia.">
        {(p) => (
          <select {...p} className="campo__entrada" value={origemId} onChange={(e) => trocarOrigem(Number(e.target.value))}>
            {lojasVisiveis.map((l) => <option key={l.id} value={l.id}>{l.nome} · {l.cidade}</option>)}
          </select>
        )}
      </Campo>
    )
  } else if (etapa === 2) {
    corpo = origemVazia ? (
      <EstadoVazio compacto titulo={`${origem?.nome} não tem produtos para copiar.`} texto="Escolha outra loja de origem." acao={<Botao onClick={() => irPara(1)}>Trocar origem</Botao>} />
    ) : (
      <div className="formulario">
        {entrada?.invalido && <FaixaAviso tom="atencao" icone={AlertTriangle}>{entrada.invalido}</FaixaAviso>}
        {entrada?.nome && <p className="texto-secundario">Você chegou aqui com <strong>{entrada.nome}</strong> já escolhido. Pode mudar a escolha abaixo.</p>}
        <fieldset className="copiar__opcoes">
          <legend className="campo__rotulo">O que copiar</legend>
          {[
            ['tudo', 'Cardápio inteiro', `${plural(cardapioOrigem.categorias.length, 'categoria', 'categorias')} e ${plural(cardapioOrigem.produtos.length, 'produto', 'produtos')}`],
            ['categorias', 'Categorias', 'Com todos os produtos de cada uma'],
            ['produtos', 'Produtos', 'Só os produtos que você escolher'],
          ].map(([id, rotulo, detalhe]) => (
            <label key={id} className={`copiar__opcao ${tipo === id ? 'copiar__opcao--ativa' : ''}`}>
              <input type="radio" name="tipo-copia" value={id} checked={tipo === id} onChange={() => { setTipo(id); setErroEtapa(null) }} />
              <span><strong>{rotulo}</strong><span className="texto-secundario copiar__detalhe">{detalhe}</span></span>
            </label>
          ))}
        </fieldset>
        {tipo !== 'tudo' && (
          <>
            <Busca valor={buscaItens} aoMudar={setBuscaItens} rotulo={tipo === 'categorias' ? 'Buscar categoria' : 'Buscar produto'} />
            <p className="texto-secundario">{tipo === 'categorias' ? plural(categoriasSel.size, 'categoria escolhida', 'categorias escolhidas') : plural(produtosSel.size, 'produto escolhido', 'produtos escolhidos')}</p>
            <ul className="copiar__lista" aria-label={tipo === 'categorias' ? 'Categorias' : 'Produtos'}>
              {tipo === 'categorias' &&
                categoriasFiltradas.map((c) => (
                  <li key={c.id}>
                    <label className="copiar__marcar">
                      <input type="checkbox" className="caixa" checked={categoriasSel.has(c.id)} onChange={() => { alternar(setCategoriasSel, c.id); setErroEtapa(null) }} />
                      <span>{c.nome} <span className="texto-secundario">· {plural(cardapioOrigem.produtos.filter((p) => p.categoria === c.id).length, 'produto', 'produtos')}</span></span>
                    </label>
                  </li>
                ))}
              {tipo === 'produtos' &&
                produtosFiltrados.map((p) => (
                  <li key={p.id}>
                    <label className="copiar__marcar">
                      <input type="checkbox" className="caixa" checked={produtosSel.has(p.id)} onChange={() => { alternar(setProdutosSel, p.id); setErroEtapa(null) }} />
                      <span>{p.nome} <span className="texto-secundario">· {cardapioOrigem.categorias.find((c) => c.id === p.categoria)?.nome}</span></span>
                    </label>
                  </li>
                ))}
            </ul>
            {(tipo === 'categorias' ? categoriasFiltradas : produtosFiltrados).length === 0 && (
              <EstadoVazio compacto titulo={`Nada encontrado com “${buscaItens.trim()}”.`} acao={<Botao onClick={() => setBuscaItens('')}>Limpar busca</Botao>} />
            )}
          </>
        )}
        <fieldset className="copiar__opcoes">
          <legend className="campo__rotulo">Preços</legend>
          <label className="copiar__opcao copiar__opcao--marcar">
            <input type="checkbox" className="caixa" checked={copiarPrecosModalidade} onChange={(e) => setCopiarPrecosModalidade(e.target.checked)} />
            <span>
              <strong>Copiar também os preços por modalidade</strong>
              <span className="texto-secundario copiar__detalhe">Leva os preços de Quero levar e Comer aqui; desligado, o destino cobra o preço do Delivery em todas.</span>
            </span>
          </label>
          <label className="copiar__opcao copiar__opcao--marcar">
            <input type="checkbox" className="caixa" checked={manterPrecosDestino} onChange={(e) => setManterPrecosDestino(e.target.checked)} />
            <span>
              <strong>Manter os preços das lojas de destino quando o produto já existir</strong>
              <span className="texto-secundario copiar__detalhe">Atualiza nome, descrição, foto e complementos, sem mexer no preço que a loja já cobra.</span>
            </span>
          </label>
        </fieldset>
      </div>
    )
  } else if (etapa === 3) {
    corpo = (
      <div className="formulario">
        <div className="copiar__barra-lojas">
          <Busca valor={buscaLojas} aoMudar={setBuscaLojas} rotulo="Buscar loja por nome, cidade ou ID" />
          <Botao onClick={selecionarTodas} disabled={lojasFiltradas.length === 0}>{todasFiltradasMarcadas ? 'Desmarcar todas' : 'Selecionar todas'}</Botao>
        </div>
        <p className="texto-secundario" aria-live="polite"><span className="numero">{destinos.size}</span> de <span className="numero">{lojasDestino.length}</span> {lojasDestino.length === 1 ? 'loja escolhida' : 'lojas escolhidas'}</p>
        {lojasFiltradas.length === 0 ? (
          <EstadoVazio compacto titulo={`Nenhuma loja com “${buscaLojas.trim()}”.`} acao={<Botao onClick={() => setBuscaLojas('')}>Limpar busca</Botao>} />
        ) : (
          <ul className="copiar__lista" aria-label="Lojas de destino">
            {lojasFiltradas.map((l) => (
              <li key={l.id}>
                <label className="copiar__marcar">
                  <input type="checkbox" className="caixa" checked={destinos.has(l.id)} onChange={() => { alternar(setDestinos, l.id); setErroEtapa(null) }} />
                  <span>
                    {l.nome} <span className="texto-secundario">· {l.cidade} · ID <span className="numero">{l.id}</span></span>
                    {estadoLojas[l.id]?.conexao === 'sem' && <span className="copiar__nota-loja">Sem conexão agora</span>}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  } else {
    corpo = (
      <div className="formulario">
        <dl className="copiar__resumo">
          <div className="copiar__resumo-linha">
            <dt>Origem</dt>
            <dd>{origem?.nome}</dd>
            <Botao tamanho="p" variante="texto" onClick={() => irPara(1)} aria-label="Editar origem">Editar</Botao>
          </div>
          <div className="copiar__resumo-linha">
            <dt>O que copiar</dt>
            <dd>
              {resumoItens.texto}
              {resumoItens.lista?.length > 0 && <span className="copiar__resumo-nomes">{resumoItens.lista.slice(0, 8).join(', ')}{resumoItens.lista.length > 8 ? ` e mais ${resumoItens.lista.length - 8}` : ''}</span>}
            </dd>
            <Botao tamanho="p" variante="texto" onClick={() => irPara(2)} aria-label="Editar o que copiar">Editar</Botao>
          </div>
          <div className="copiar__resumo-linha">
            <dt>Preços</dt>
            <dd>
              {textoPrecos[0]}
              <span className="copiar__resumo-nomes">{textoPrecos[1]}</span>
            </dd>
            <Botao tamanho="p" variante="texto" onClick={() => irPara(2)} aria-label="Editar preços">Editar</Botao>
          </div>
          <div className="copiar__resumo-linha">
            <dt>Para onde</dt>
            <dd>
              {plural(listaDestinos.length, 'loja', 'lojas')}
              <span className="copiar__resumo-nomes">{listaDestinos.map((l) => l.nome).join(', ')}</span>
            </dd>
            <Botao tamanho="p" variante="texto" onClick={() => irPara(3)} aria-label="Editar para onde">Editar</Botao>
          </div>
        </dl>
        <FaixaAviso tom="atencao" icone={AlertTriangle}>Esta ação não pode ser desfeita. Itens com o mesmo código serão substituídos.</FaixaAviso>
      </div>
    )
  }

  return (
    <div className="pagina copiar">
      {cabecalho}
      {faixaOrigem}
      <ol className="copiar__etapas" aria-label="Etapas">
        {ETAPAS.map((nome, i) => (
          <li key={nome} className={`copiar__etapa ${i + 1 === etapa ? 'copiar__etapa--atual' : ''} ${i + 1 < etapa ? 'copiar__etapa--feita' : ''}`} aria-current={i + 1 === etapa ? 'step' : undefined}>
            <span className="copiar__etapa-numero" aria-hidden>{i + 1}</span>
            <span className={celular && i + 1 !== etapa ? 'visualmente-oculto' : ''}>{nome}{i + 1 < etapa ? ' (feita)' : ''}</span>
          </li>
        ))}
      </ol>
      <section className="bloco copiar__bloco" aria-labelledby="titulo-etapa">
        <h2 id="titulo-etapa" ref={tituloEtapa} tabIndex={-1} className="copiar__titulo">
          {etapa}. {ETAPAS[etapa - 1]}
        </h2>
        {corpo}
        {erroEtapa && <p className="campo__erro copiar__erro" role="alert"><AlertTriangle size={14} aria-hidden /> {erroEtapa}</p>}
        <div className="copiar__acoes">
          {etapa > 1 && <Botao onClick={() => irPara(etapa - 1)}>Voltar</Botao>}
          {etapa < 4 && <Botao variante="principal" onClick={avancar} disabled={etapa === 2 && origemVazia}>Continuar</Botao>}
          {etapa === 4 && (
            <Botao variante="principal" onClick={() => copiar(listaDestinos.map((l) => l.id))} mudaAlgo>
              Copiar para {plural(listaDestinos.length, 'loja', 'lojas')}
            </Botao>
          )}
        </div>
      </section>
    </div>
  )
}
