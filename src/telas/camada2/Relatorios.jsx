// T25. Relatórios para baixar: catálogo em CSV com período e a lista de últimos arquivos (7 dias).
import { useEffect, useRef, useState } from 'react'
import { FileDown } from 'lucide-react'
import { usePrototipo } from '../../contexto/Prototipo.jsx'
import { useEhCelular, useTitulo } from '../../utilitarios/ganchos.js'
import { AGORA_REFERENCIA, baixarCsv, dataCurta, diaMes, hora, plural } from '../../utilitarios/formatos.js'
import { Botao, CabecalhoPagina, Carregando, EstadoErro, EstadoVazio, Esqueleto, FaixaAviso, Selo } from '../../componentes/base.jsx'
import { PERIODOS_RELATORIO, RELATORIOS, cuponsIniciais, arquivosIniciais } from '../../dados/marketing.js'
import '../../estilos/marketing.css'

const reais = (v) => (v == null ? '' : v.toFixed(2).replace('.', ','))
const dataCsv = (d) => `${diaMes(d)}/${d.getFullYear()} ${hora(d)}`

export function Relatorios() {
  const { cen, cenarioId, emRede, lojaId, loja, lojasVisiveis, cardapio, cardapios, pedidosDaLoja, estadoForcado, avisar, agora } = usePrototipo()
  const celular = useEhCelular()
  const [periodos, setPeriodos] = useState({})
  const [arquivos, setArquivos] = useState(() => arquivosIniciais(cen))
  const [gerando, setGerando] = useState(null)
  const [avisos, setAvisos] = useState({})
  const [tentou, setTentou] = useState(false)
  const timers = useRef([])
  useTitulo('Relatórios para baixar')
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const nomeLoja = emRede ? `${cen.marca.nome} - toda a rede` : loja.nome
  const lojasAlvo = emRede ? lojasVisiveis : [loja]
  const periodoDe = (id) => PERIODOS_RELATORIO.find((p) => p.id === (periodos[id] || 'este-mes'))

  // Pedidos de cada loja no período, com o nome da loja quando for a rede toda
  const pedidosNoPeriodo = (p) =>
    lojasAlvo.flatMap((l) => pedidosDaLoja(l.id).filter((x) => x.criado >= p.de && x.criado < p.ate).map((x) => ({ ...x, nomeLoja: l.nome })))

  // Monta o CSV quando há dado; null quando não há o que baixar
  function montar(rel, p) {
    const comLoja = (cab) => (emRede ? ['Loja', ...cab] : cab)
    if (rel.id === 'pedidos') {
      const ped = pedidosNoPeriodo(p)
      if (!ped.length) return null
      return {
        cabecalho: comLoja(['Número', 'Data', 'Cliente', 'Telefone', 'Modalidade', 'Status', 'Pagamento', 'Cupom', 'Desconto', 'Taxa de entrega', 'Total']),
        linhas: ped.map((x) => [
          ...(emRede ? [x.nomeLoja] : []), x.numero, dataCsv(x.criado), x.cliente.nome, x.cliente.telefone, x.modalidade,
          x.grupo === 'atencao' ? 'Precisa de atenção' : x.status, x.pagamento, x.cupom || '', reais(x.desconto || 0), reais(x.taxa || 0), reais(x.total),
        ]),
      }
    }
    if (rel.id === 'itens') {
      const mapa = new Map()
      pedidosNoPeriodo(p).filter((x) => x.grupo !== 'cancelado').forEach((x) =>
        x.itens.forEach((i) => {
          const chave = `${emRede ? x.nomeLoja : ''}|${i.nome}`
          const atual = mapa.get(chave) || { loja: x.nomeLoja, nome: i.nome, qtd: 0, valor: 0 }
          atual.qtd += i.qtd
          atual.valor += i.qtd * i.preco
          mapa.set(chave, atual)
        }),
      )
      if (!mapa.size) return null
      return {
        cabecalho: comLoja(['Produto', 'Quantidade', 'Faturamento']),
        linhas: [...mapa.values()].sort((a, b) => b.valor - a.valor).map((i) => [...(emRede ? [i.loja] : []), i.nome, i.qtd, reais(i.valor)]),
      }
    }
    if (rel.id === 'cardapio') {
      const linhas = lojasAlvo.flatMap((l) => {
        const c = (emRede ? cardapios[l.id] : cardapio) || { produtos: [], categorias: [] }
        return c.produtos.map((x) => [
          ...(emRede ? [l.nome] : []), c.categorias.find((k) => k.id === x.categoria)?.nome || '', x.nome,
          x.preco == null ? 'Sem preço' : reais(x.preco), x.estado === 'ativo' ? 'À venda' : x.estado === 'amanha' ? 'Pausado até amanhã' : 'Pausado',
        ])
      })
      if (!linhas.length) return null
      return { cabecalho: comLoja(['Categoria', 'Produto', 'Preço', 'Situação']), linhas }
    }
    if (rel.id === 'cupons') {
      const c = cuponsIniciais(cen)
      if (!c.length) return null
      return {
        cabecalho: ['Código', 'Descrição', 'Estado', 'Início', 'Fim', 'Usos', 'Desconto concedido'],
        linhas: c.map((x) => [x.codigo, x.descricao, x.estado, diaMes(x.inicio), diaMes(x.expira), x.usos, reais(x.descontoConcedido)]),
      }
    }
    if (rel.id === 'clientes') {
      const mapa = new Map()
      pedidosNoPeriodo(p).forEach((x) => {
        const a = mapa.get(x.cliente.nome) || { ...x.cliente, pedidos: 0, ultimo: x.criado }
        a.pedidos += 1
        if (x.criado > a.ultimo) a.ultimo = x.criado
        mapa.set(x.cliente.nome, a)
      })
      if (!mapa.size) return null
      return {
        cabecalho: ['Cliente', 'Telefone', 'E-mail', 'CPF', 'Pedidos no período', 'Último pedido'],
        linhas: [...mapa.values()].map((c, i) => [c.nome, c.telefone, c.email, `•••.•••.•••-${String(10 + ((i * 37) % 89)).padStart(2, '0')}`, c.pedidos, dataCsv(c.ultimo)]),
      }
    }
    return null
  }

  const baixar = (rel, p, dados) => baixarCsv({ loja: nomeLoja, periodo: rel.id === 'cardapio' ? `retrato de ${diaMes(AGORA_REFERENCIA)}` : p.nome, tipo: rel.nome, ...dados })

  // Pedidos, itens e cardápio: arquivo na hora. Os demais vão para a fila e aparecem em Últimos arquivos.
  const IMEDIATOS = ['pedidos', 'itens', 'cardapio']
  const pedir = (rel) => {
    const p = periodoDe(rel.id)
    const periodoTexto = rel.id === 'cardapio' ? `retrato de ${diaMes(AGORA_REFERENCIA)}` : p.nome
    setAvisos((a) => ({ ...a, [rel.id]: null }))
    if (IMEDIATOS.includes(rel.id)) {
      const dados = montar(rel, p)
      if (!dados) {
        setAvisos((a) => ({ ...a, [rel.id]: { tom: 'vazio', texto: rel.id === 'cardapio' ? 'O cardápio ainda não tem produtos.' : `Nenhum pedido em ${p.nome}. O arquivo não foi gerado.` } }))
        return
      }
      setGerando(rel.id)
      timers.current.push(setTimeout(() => {
        baixar(rel, p, dados)
        setGerando(null)
        setArquivos((l) => [{ id: `a${Date.now()}`, relatorio: rel.id, nome: rel.nome, periodo: periodoTexto, periodoId: p.id, geradoEm: agora, estado: 'pronto' }, ...l])
        avisar(`${rel.nome} baixado: ${plural(dados.linhas.length, 'linha', 'linhas')}.`, 'sucesso')
      }, 500))
      return
    }
    const id = `a${Date.now()}`
    setGerando(rel.id)
    timers.current.push(setTimeout(() => {
      setGerando(null)
      setAvisos((a) => ({ ...a, [rel.id]: { tom: 'preparando', texto: 'Estamos preparando o arquivo. Ele aparece em Últimos arquivos.' } }))
      setArquivos((l) => [{ id, relatorio: rel.id, nome: rel.nome, periodo: periodoTexto, periodoId: p.id, geradoEm: agora, estado: 'preparando' }, ...l])
    }, 500))
    timers.current.push(setTimeout(() => setArquivos((l) => l.map((a) => (a.id === id ? { ...a, estado: 'pronto' } : a))), 6000))
  }

  const baixarArquivo = (a) => {
    const rel = RELATORIOS.find((r) => r.id === a.relatorio)
    const p = PERIODOS_RELATORIO.find((x) => x.id === a.periodoId) || PERIODOS_RELATORIO[0]
    const dados = montar(rel, p)
    if (!dados) {
      avisar(['fidelidade', 'campanhas'].includes(rel.id)
        ? `No protótipo, o arquivo de ${rel.nome.toLowerCase()} não tem linhas de exemplo.`
        : `Não há registros de ${rel.nome.toLowerCase()} em ${p.nome}.`)
      return
    }
    baixar(rel, p, dados)
  }

  const indisponivelRel = (rel) => {
    if (rel.id === 'fidelidade' && !cen.fidelidade.tipo) return 'A loja ainda não tem programa de fidelidade.'
    if (rel.id === 'campanhas' && cenarioId === 'nova') return 'Nenhuma campanha enviada ainda.'
    return null
  }

  if (estadoForcado === 'carregando') {
    return (
      <div className="pagina relatorios">
        <CabecalhoPagina titulo="Relatórios para baixar" />
        <Carregando oQue="os relatórios"><div className="lista-esqueleto">{RELATORIOS.map((r) => <Esqueleto key={r.id} linhas={2} altura="20px" />)}</div></Carregando>
      </div>
    )
  }
  if (estadoForcado === 'erro' && !tentou) {
    return (
      <div className="pagina relatorios">
        <CabecalhoPagina titulo="Relatórios para baixar" />
        <EstadoErro oQue="os relatórios" aoTentar={() => setTentou(true)} />
      </div>
    )
  }

  const listaArquivos = estadoForcado === 'vazio' ? [] : arquivos
  return (
    <div className="pagina relatorios">
      <CabecalhoPagina titulo="Relatórios para baixar" descricao={`Arquivos CSV de ${emRede ? `toda a rede (${plural(lojasVisiveis.length, 'loja', 'lojas')})` : loja.nome}. Todo arquivo traz loja, período e data de geração no nome e na primeira linha.`} />
      <div className="relatorios__grade">
        <section className="bloco" aria-labelledby="titulo-catalogo">
          <header className="bloco__cabecalho"><h2 id="titulo-catalogo">Catálogo</h2></header>
          <ul className="relatorios__lista">
            {RELATORIOS.map((rel) => {
              const motivo = indisponivelRel(rel)
              const aviso = avisos[rel.id]
              const nome = rel.id === 'fidelidade' && cen.fidelidade.tipo ? `Fidelidade (${cen.fidelidade.tipo === 'pontos' ? 'movimentos de pontos' : 'movimentos de cashback'})` : rel.nome
              return (
                <li key={rel.id} className="relatorios__item">
                  <div className="relatorios__textos">
                    <h3 className="relatorios__nome">{nome}</h3>
                    <p className="texto-secundario">{rel.contem}</p>
                    {aviso && (
                      <p className={`relatorios__aviso relatorios__aviso--${aviso.tom}`} role="status">{aviso.texto}</p>
                    )}
                    {motivo && <p className="relatorios__aviso" role="note">{motivo}</p>}
                  </div>
                  <div className="relatorios__acoes">
                    {rel.id !== 'cardapio' ? (
                      <label className="filtro">
                        <span className="filtro__rotulo">Período</span>
                        <select value={periodos[rel.id] || 'este-mes'} onChange={(e) => setPeriodos((x) => ({ ...x, [rel.id]: e.target.value }))} disabled={!!motivo}>
                          {PERIODOS_RELATORIO.map((p) => <option key={p.id} value={p.id}>{p.rotulo}</option>)}
                        </select>
                      </label>
                    ) : (
                      <span className="relatorios__retrato">Retrato de agora</span>
                    )}
                    <Botao icone={FileDown} carregando={gerando === rel.id} disabled={!!motivo || (gerando && gerando !== rel.id)} onClick={() => pedir(rel)} aria-label={`Baixar CSV de ${nome}`}>
                      Baixar CSV
                    </Botao>
                  </div>
                </li>
              )
            })}
          </ul>
          <p className="bloco__nota">Nenhum relatório traz IP nem data de nascimento. CPF aparece mascarado; completo só para perfil autorizado.</p>
        </section>

        <section className="bloco" aria-labelledby="titulo-ultimos">
          <header className="bloco__cabecalho">
            <div>
              <h2 id="titulo-ultimos">Últimos arquivos</h2>
              <p className="bloco__sub">Gerados nos últimos 7 dias</p>
            </div>
          </header>
          {listaArquivos.length === 0 ? (
            <EstadoVazio compacto titulo="Nenhum arquivo gerado nos últimos 7 dias." />
          ) : (
            <ul className="relatorios__arquivos" aria-live="polite">
              {listaArquivos.map((a) => (
                <li key={a.id} className="relatorios__arquivo">
                  <div className="relatorios__textos">
                    <span className="tabela__principal">{a.nome}</span>
                    <span className="tabela__secundario">{a.periodo} · gerado {dataCurta(a.geradoEm)}</span>
                  </div>
                  {a.estado === 'preparando' ? (
                    <Selo tom="azul">Preparando</Selo>
                  ) : (
                    <Botao tamanho="p" variante="texto" icone={FileDown} onClick={() => baixarArquivo(a)} aria-label={`Baixar ${a.nome}, ${a.periodo}`}>
                      {celular ? undefined : 'Baixar'}
                    </Botao>
                  )}
                </li>
              ))}
            </ul>
          )}
          {cen.rede && emRede && <FaixaAviso>Arquivos da rede trazem a coluna Loja. Para uma loja só, escolha a loja no seletor.</FaixaAviso>}
        </section>
      </div>
    </div>
  )
}
