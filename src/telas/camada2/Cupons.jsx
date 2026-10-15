// T20. Cupons, lista. T21. Cupom, criar (assistente por objetivo, restrições num bloco só e prévia do cupom no app).
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle, ChevronDown, Monitor, Plus, Search, X } from 'lucide-react'
import { usePrototipo } from '../../contexto/Prototipo.jsx'
import { useEhCelular, useTitulo } from '../../utilitarios/ganchos.js'
import { AGORA_REFERENCIA, diaMes, moeda, numero, plural } from '../../utilitarios/formatos.js'
import {
  Abas, Botao, CabecalhoPagina, Campo, Carregando, Confirmacao, EstadoErro, EstadoVazio, Esqueleto, FaixaAviso, Selo, Sobreposicao,
} from '../../componentes/base.jsx'
import { OBJETIVOS, SEGMENTOS, cupomPorCodigo, cuponsCriados, cuponsEditados, cuponsIniciais } from '../../dados/marketing.js'
import '../../estilos/marketing.css'

const ESTADOS = {
  ativo: { rotulo: 'Ativo', aba: 'Ativos', tom: 'verde' },
  agendado: { rotulo: 'Agendado', aba: 'Agendados', tom: 'azul' },
  pausado: { rotulo: 'Pausado', aba: 'Pausados', tom: 'ambar' },
  expirado: { rotulo: 'Expirado', aba: 'Expirados', tom: 'cinza' },
}

const rotuloObjetivo = (id) => OBJETIVOS.find((o) => o.id === id)?.rotulo || '—'
const validade = (c) => `${diaMes(c.inicio)} a ${diaMes(c.expira)}`

function textoDesconto(c) {
  if (c.tipo === 'frete') return 'Frete grátis'
  if (c.tipo === 'brinde') return 'Produto de presente'
  const nosProdutos = c.objetivo === 'produto' ? ' nos produtos' : ''
  if (c.tipo === 'reais') return `${moeda(c.valor)} de desconto${nosProdutos}`
  return `${numero(c.valor)}% de desconto${nosProdutos}`
}

// "Todas" ou "8 lojas", com a lista no title
function Lojas({ cupom }) {
  const { cen } = usePrototipo()
  if (cupom.lojas === 'todas' || !Array.isArray(cupom.lojas)) return <span>Todas</span>
  const nomes = cupom.lojas.map((id) => cen.lojas.find((l) => l.id === id)?.nome).filter(Boolean)
  return (
    <span className="cupons__lojas" title={nomes.join(', ')} tabIndex={0} aria-label={`${nomes.length} lojas: ${nomes.join(', ')}`}>
      {plural(nomes.length, 'loja', 'lojas')}
    </span>
  )
}

// ---------- T20. Lista ----------
export function Cupons() {
  const { cen, cenarioId, emRede, lojaId, estadoForcado, avisar } = usePrototipo()
  const navegar = useNavigate()
  const celular = useEhCelular()
  const [params, setParams] = useSearchParams()
  const [cupons, setCupons] = useState(() => cuponsIniciais(cen))
  const [busca, setBusca] = useState('')
  const [mudando, setMudando] = useState(null)
  const [excluir, setExcluir] = useState(null)
  const [excluindo, setExcluindo] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [tentou, setTentou] = useState(false)
  useTitulo('Cupons')
  const aba = params.get('aba') || 'ativo'

  // Numa loja da rede, só os cupons que valem para ela
  const daLoja = cupons.filter((c) => !cen.rede || emRede || c.lojas === 'todas' || (Array.isArray(c.lojas) && c.lojas.includes(lojaId)))
  const lista = estadoForcado === 'vazio' ? [] : daLoja
  const termo = busca.trim().toLowerCase()
  const daAba = lista.filter((c) => c.estado === aba)
  const visiveis = daAba.filter((c) => !termo || `${c.codigo} ${c.descricao}`.toLowerCase().includes(termo))

  const alternar = (c) => {
    setMudando(c.codigo)
    setTimeout(() => {
      const novo = c.estado === 'pausado' ? (c.inicio > AGORA_REFERENCIA ? 'agendado' : 'ativo') : 'pausado'
      setCupons((l) => l.map((x) => (x.codigo === c.codigo ? { ...x, estado: novo } : x)))
      setMudando(null)
      avisar(novo === 'pausado' ? `Cupom ${c.codigo} pausado. Ele não vale no app até você ativar de novo.` : `Cupom ${c.codigo} ativado.`, 'sucesso')
    }, 600)
  }
  const confirmarExcluir = () => {
    setExcluindo(true)
    setTimeout(() => {
      setCupons((l) => l.filter((x) => x.codigo !== excluir.codigo))
      const criados = cuponsCriados[cenarioId]
      const i = criados.findIndex((x) => x.codigo === excluir.codigo)
      if (i >= 0) criados.splice(i, 1)
      avisar(`Cupom ${excluir.codigo} excluído.`, 'sucesso')
      setExcluindo(false)
      setExcluir(null)
    }, 700)
  }

  const Acoes = ({ c }) => (
    <div className="cupons__acoes">
      {c.estado !== 'expirado' && <Botao variante="texto" tamanho="p" onClick={() => navegar(`/cupons/novo?editar=${c.codigo}`)} aria-label={`Editar ${c.codigo}`}>Editar</Botao>}
      {(c.estado === 'ativo' || c.estado === 'agendado' || c.estado === 'pausado') && (
        <Botao variante="texto" tamanho="p" mudaAlgo carregando={mudando === c.codigo} onClick={() => alternar(c)} aria-label={`${c.estado === 'pausado' ? 'Ativar' : 'Pausar'} ${c.codigo}`}>
          {c.estado === 'pausado' ? 'Ativar' : 'Pausar'}
        </Botao>
      )}
      <Botao variante="texto" tamanho="p" onClick={() => navegar(`/cupons/novo?duplicar=${c.codigo}`)} aria-label={`Duplicar ${c.codigo} com novas datas`}>Duplicar com novas datas</Botao>
      {c.estado !== 'agendado' && <Botao variante="texto" tamanho="p" onClick={() => setResultado(c)} aria-label={`Ver resultado de ${c.codigo}`}>Ver resultado</Botao>}
      {c.estado !== 'expirado' && <Botao variante="texto" tamanho="p" className="cupons__excluir" onClick={() => setExcluir(c)} aria-label={`Excluir ${c.codigo}`}>Excluir</Botao>}
    </div>
  )

  const erro = estadoForcado === 'erro' && !tentou
  let conteudo
  if (estadoForcado === 'carregando') {
    conteudo = <Carregando oQue="os cupons"><div className="tabela-esqueleto">{Array.from({ length: 4 }, (_, i) => <Esqueleto key={i} linhas={1} altura="52px" />)}</div></Carregando>
  } else if (erro) {
    conteudo = <EstadoErro oQue="os cupons" aoTentar={() => setTentou(true)} />
  } else if (lista.length === 0) {
    conteudo = <EstadoVazio titulo="Nenhum cupom criado ainda." texto="Crie um cupom para trazer o primeiro pedido ou fazer o cliente voltar." acao={<Botao variante="principal" para="/cupons/novo">Criar cupom</Botao>} />
  } else if (visiveis.length === 0) {
    conteudo = termo ? (
      <EstadoVazio titulo={`Nenhum cupom ${ESTADOS[aba].rotulo.toLowerCase()} com "${busca.trim()}".`} texto="Busque pelo código ou pela descrição, ou veja as outras abas." acao={<Botao onClick={() => setBusca('')}>Limpar busca</Botao>} />
    ) : (
      <EstadoVazio titulo={`Nenhum cupom ${ESTADOS[aba].rotulo.toLowerCase()}.`} />
    )
  } else if (celular) {
    conteudo = (
      <ul className="cupons__cartoes">
        {visiveis.map((c) => (
          <li key={c.codigo} className="cupons__cartao">
            <div className="cupons__cartao-topo">
              <span className="cupons__codigo">{c.codigo}</span>
              <Selo tom={ESTADOS[c.estado].tom}>{ESTADOS[c.estado].rotulo}</Selo>
            </div>
            <p className="cupons__descricao">{c.descricao}</p>
            <p className="texto-secundario">Validade: {validade(c)} · {plural(c.usos, 'uso', 'usos')}</p>
            <Acoes c={c} />
          </li>
        ))}
      </ul>
    )
  } else {
    conteudo = (
      <div className="tabela-rolagem">
        <table className="tabela">
          <caption className="visualmente-oculto">Cupons {ESTADOS[aba].aba.toLowerCase()}</caption>
          <thead>
            <tr>
              <th scope="col">Código</th>
              <th scope="col">Objetivo</th>
              <th scope="col">Desconto</th>
              <th scope="col">Validade</th>
              {cen.rede && <th scope="col">Lojas</th>}
              <th scope="col" className="tabela__num">Usos</th>
              <th scope="col" className="tabela__num">Desconto concedido</th>
              <th scope="col">Ações</th>
            </tr>
          </thead>
          <tbody>
            {visiveis.map((c) => (
              <tr key={c.codigo}>
                <th scope="row">
                  <span className="tabela__principal cupons__codigo">{c.codigo}</span>
                  <span className="tabela__secundario">{c.descricao}</span>
                </th>
                <td>{rotuloObjetivo(c.objetivo)}</td>
                <td>{textoDesconto(c)}</td>
                <td className="tabela__hora">{validade(c)}</td>
                {cen.rede && <td><Lojas cupom={c} /></td>}
                <td className="tabela__num">{numero(c.usos)}</td>
                <td className="tabela__num">{moeda(c.descontoConcedido)}</td>
                <td><Acoes c={c} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="pagina cupons">
      <CabecalhoPagina
        titulo="Cupons"
        descricao="Quais cupons estão valendo e como estão indo."
        acoes={<Botao variante="principal" icone={Plus} para="/cupons/novo">Criar cupom</Botao>}
      />
      {celular && <FaixaAviso icone={Monitor}>Criar e editar cupons funciona melhor no computador.</FaixaAviso>}
      <div className="barra-filtros">
        <div className="busca">
          <Search size={18} aria-hidden className="busca__icone" />
          <input type="search" className="busca__campo" placeholder="Código ou descrição" aria-label="Buscar cupom por código ou descrição" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
      </div>
      <Abas
        rotulo="Estado dos cupons"
        ativa={aba}
        aoMudar={(id) => setParams({ aba: id }, { replace: true })}
        abas={Object.entries(ESTADOS).map(([id, e]) => ({ id, rotulo: e.aba, contagem: lista.filter((c) => c.estado === id).length }))}
      />
      <div className="cupons__conteudo" role="tabpanel">{conteudo}</div>

      <Confirmacao
        aberto={!!excluir}
        aoFechar={() => setExcluir(null)}
        titulo={`Excluir o cupom ${excluir?.codigo}?`}
        texto={excluir?.usos ? `Ele já foi usado ${plural(excluir.usos, 'vez', 'vezes')}. O resultado continua na Análise do período, mas o cupom sai da lista e para de valer no app.` : 'O cupom sai da lista e para de valer no app.'}
        rotuloConfirmar="Excluir cupom"
        destrutivo
        carregando={excluindo}
        aoConfirmar={confirmarExcluir}
      />
      <Sobreposicao aberto={!!resultado} aoFechar={() => setResultado(null)} titulo={`Resultado do ${resultado?.codigo}`} subtitulo={resultado && `${resultado.descricao} · ${validade(resultado)}`} forma={celular ? 'cheia' : 'lateral'}>
        {resultado && (
          <dl className="cupons__resultado">
            <div><dt>Usos</dt><dd>{numero(resultado.usos)}</dd></div>
            <div><dt>Desconto concedido</dt><dd>{moeda(resultado.descontoConcedido)}</dd></div>
            <div><dt>Faturamento dos pedidos com o cupom</dt><dd>{moeda(resultado.faturamento)}</dd></div>
            <div><dt>Desconto médio por pedido</dt><dd>{resultado.usos ? moeda(resultado.descontoConcedido / resultado.usos) : '—'}</dd></div>
          </dl>
        )}
        <p className="bloco__nota">Mesma conta da Análise do período: só pedidos válidos, sem os cancelados.</p>
        <Botao para="/analise/vendas">Ver em Vendas</Botao>
      </Sobreposicao>
    </div>
  )
}

// ---------- T21. Criar cupom ----------
const PASSOS = {
  objetivo: 'Objetivo',
  regra: 'Regra',
  quem: 'Quem pode usar',
  onde: 'Onde e quando vale',
  resumo: 'Resumo',
}
const DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
const SENTIDOS_CARDAPIO = [['todo', 'Vale em todo o cardápio'], ['so', 'Só em…'], ['exceto', 'Exceto em…']]
const paraInput = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const deInput = (s) => {
  const [a, m, d] = s.split('-').map(Number)
  return new Date(a, m - 1, d)
}
const somaDias = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
const SUGESTAO_CODIGO = { porcentagem: 'DESCONTO10', reais: 'MENOS5', frete: 'FRETEGRATIS', primeiro: 'BEMVINDO' }
const sugestaoCodigo = (f) => (f.objetivo === 'produto' ? (f.beneficioProduto === 'gratis' ? 'PRESENTE' : 'OFERTA') : SUGESTAO_CODIGO[f.objetivo])

// Itens do cardápio e lojas viram chaves "tipo:valor" ("categoria:Bebidas", "produto:Pastel de carne", "loja:2101")
const TIPOS_CHAVE = { categoria: 'Categoria', produto: 'Produto', loja: '' }
const nomeDaChave = (ch) => ch.slice(ch.indexOf(':') + 1)
const listar = (nomes, tipo = 'conjunction') => new Intl.ListFormat('pt-BR', { style: 'long', type: tipo }).format(nomes)
const listarItens = (chaves, tipo) => listar(chaves.map(nomeDaChave), tipo)

function formularioInicial({ cupom, modo, lojaPadrao, emRede }) {
  const hoje = paraInput(AGORA_REFERENCIA)
  const fim = paraInput(somaDias(AGORA_REFERENCIA, 30))
  if (!cupom) {
    return {
      objetivo: 'porcentagem', codigo: '', valor: '10', tipoPrimeiro: 'porcentagem', beneficioProduto: 'gratis', produtos: [], pedidoMinimo: '',
      publico: 'todos', segmento: SEGMENTOS[0], lojas: emRede || !lojaPadrao ? 'todas' : [lojaPadrao], modalidades: [],
      restricaoCardapio: 'todo', itensCardapio: [],
      inicio: hoje, fim, dias: [], horaDe: '', horaAte: '', limiteUsos: '', usosPorCliente: '1',
    }
  }
  return {
    objetivo: cupom.objetivo,
    codigo: modo === 'editar' ? cupom.codigo : `${cupom.codigo}2`,
    valor: cupom.valor != null ? String(cupom.valor).replace('.', ',') : '',
    tipoPrimeiro: cupom.tipo === 'frete' ? 'frete' : 'porcentagem',
    beneficioProduto: cupom.objetivo === 'produto' && cupom.tipo !== 'brinde' ? cupom.tipo : 'gratis',
    produtos: cupom.produtos || [],
    pedidoMinimo: cupom.pedidoMinimo ? String(cupom.pedidoMinimo) : '',
    publico: cupom.publico ? 'segmento' : 'todos',
    segmento: cupom.publico || SEGMENTOS[0],
    lojas: cupom.lojas || 'todas',
    modalidades: cupom.modalidades || [],
    // cupons antigos guardavam só as categorias em que valiam
    restricaoCardapio: cupom.restricaoCardapio || (cupom.categorias?.length ? 'so' : 'todo'),
    itensCardapio: cupom.itensCardapio || (cupom.categorias || []).map((c) => `categoria:${c}`),
    inicio: modo === 'editar' ? paraInput(cupom.inicio) : hoje,
    fim: modo === 'editar' ? paraInput(cupom.expira) : fim,
    dias: cupom.dias || [],
    horaDe: cupom.horaDe || '', horaAte: cupom.horaAte || '',
    limiteUsos: cupom.limiteUsos ? String(cupom.limiteUsos) : '',
    usosPorCliente: cupom.usosPorCliente ? String(cupom.usosPorCliente) : '',
  }
}

function tipoDoForm(f) {
  if (f.objetivo === 'produto') return f.beneficioProduto === 'gratis' ? 'brinde' : f.beneficioProduto
  if (f.objetivo === 'frete' || (f.objetivo === 'primeiro' && f.tipoPrimeiro === 'frete')) return 'frete'
  return f.objetivo === 'reais' ? 'reais' : 'porcentagem'
}
const valorNum = (s) => Number(String(s).replace(/\./g, '').replace(',', '.')) || 0
// Frete grátis vale no pedido todo; o cupom de produto já diz em quais produtos vale
const usaRestricaoCardapio = (f) => f.objetivo !== 'produto' && tipoDoForm(f) !== 'frete'
const restricaoCardapioAtiva = (f) => usaRestricaoCardapio(f) && f.restricaoCardapio !== 'todo' && f.itensCardapio.length > 0

function descreverBeneficio(f) {
  const tipo = tipoDoForm(f)
  if (f.objetivo === 'produto') {
    if (tipo === 'brinde') {
      if (!f.produtos.length) return 'Produto de presente'
      return f.produtos.length > 1 ? `Um de presente: ${listarItens(f.produtos, 'disjunction')}` : `${nomeDaChave(f.produtos[0])} de presente`
    }
    const onde = f.produtos.length ? listarItens(f.produtos) : 'produtos escolhidos'
    return tipo === 'reais' ? `${moeda(valorNum(f.valor))} de desconto em ${onde}` : `${f.valor || '0'}% de desconto em ${onde}`
  }
  if (tipo === 'frete') return 'Frete grátis'
  const base = tipo === 'reais' ? `${moeda(valorNum(f.valor))} de desconto` : `${f.valor || '0'}% de desconto`
  if (!restricaoCardapioAtiva(f)) return base
  return f.restricaoCardapio === 'so' ? `${base} em ${listarItens(f.itensCardapio)}` : `${base}, exceto ${listarItens(f.itensCardapio)}`
}

// Restrições em texto: o resumo mostra todas; a prévia, só as que fogem do padrão
function restricoes(f, { rede, lojasVisiveis }) {
  const ordemDias = [...f.dias].sort((a, b) => DIAS.indexOf(a) - DIAS.indexOf(b))
  const horas = f.horaDe && f.horaAte ? `das ${f.horaDe} às ${f.horaAte}` : ''
  const nomesLojas = Array.isArray(f.lojas) ? f.lojas.map((id) => lojasVisiveis.find((l) => l.id === id)?.nome).filter(Boolean) : []
  const linhas = [
    {
      rotulo: 'Dias e horários',
      padrao: !f.dias.length && !horas,
      valor: [f.dias.length ? `Só ${listar(ordemDias.map((d) => d.toLowerCase()))}` : 'Todos os dias', horas || 'o dia todo'].join(', '),
    },
    { rotulo: 'Modalidades', padrao: !f.modalidades.length, valor: f.modalidades.length ? `Só ${listar(f.modalidades)}` : 'Todas as modalidades' },
  ]
  if (rede) {
    linhas.push({
      rotulo: 'Lojas',
      padrao: f.lojas === 'todas',
      valor: f.lojas === 'todas' ? `Todas as ${lojasVisiveis.length} lojas` : nomesLojas.length > 3 ? `${plural(nomesLojas.length, 'loja', 'lojas')}: ${listar(nomesLojas)}` : `Só ${listar(nomesLojas)}`,
    })
  }
  if (usaRestricaoCardapio(f)) {
    linhas.push({
      rotulo: 'Cardápio',
      padrao: !restricaoCardapioAtiva(f),
      valor: !restricaoCardapioAtiva(f) ? 'Vale em todo o cardápio' : f.restricaoCardapio === 'so' ? `Vale só em ${listarItens(f.itensCardapio)}` : `Não vale em ${listarItens(f.itensCardapio)}`,
    })
  }
  return linhas.map((l) => ({ ...l, passo: 'onde' }))
}

function PreviaCupom({ f }) {
  const { cen, lojasVisiveis } = usePrototipo()
  const minimo = valorNum(f.pedidoMinimo)
  const regras = restricoes(f, { rede: cen.rede, lojasVisiveis }).filter((r) => !r.padrao)
  return (
    <aside className="cupom-novo__previa" aria-label="Prévia do cupom no app">
      <p className="cupom-novo__previa-rotulo">Como o cliente vê no app</p>
      <div className="cupom-novo__app">
        <p className="cupom-novo__app-marca">{cen.marca.nome}</p>
        <div className="cupom-novo__bilhete">
          <p className="cupom-novo__bilhete-beneficio">{descreverBeneficio(f)}</p>
          <p className="cupom-novo__bilhete-codigo">{f.codigo || 'CÓDIGO'}</p>
          <p className="cupom-novo__bilhete-regras">
            {minimo ? `Pedido mínimo de ${moeda(minimo)}. ` : ''}
            {f.objetivo === 'primeiro' ? 'Só no primeiro pedido. ' : ''}
            Válido até {f.fim ? diaMes(deInput(f.fim)) : '—'}.
          </p>
          {regras.length > 0 && (
            <ul className="cupom-novo__bilhete-restricoes" aria-label="Onde e quando vale">
              {regras.map((r) => <li key={r.rotulo}>{r.valor}</li>)}
            </ul>
          )}
          <span className="cupom-novo__bilhete-botao">Usar cupom</span>
        </div>
      </div>
    </aside>
  )
}

function Opcao({ nome, valor, atual, aoMudar, titulo, detalhe }) {
  return (
    <label className={`cupom-novo__opcao ${atual === valor ? 'cupom-novo__opcao--marcada' : ''}`}>
      <input type="radio" name={nome} value={valor} checked={atual === valor} onChange={() => aoMudar(valor)} />
      <span>
        <span className="cupom-novo__opcao-titulo">{titulo}</span>
        {detalhe && <span className="cupom-novo__opcao-detalhe">{detalhe}</span>}
      </span>
    </label>
  )
}

function Marcavel({ rotulo, marcado, aoMudar }) {
  return (
    <label className="cupom-novo__marcavel">
      <input type="checkbox" checked={marcado} onChange={(e) => aoMudar(e.target.checked)} />
      <span>{rotulo}</span>
    </label>
  )
}

const normalizar = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Combobox com fichas (padrão ARIA de combobox com lista): digita, anda com as setas, escolhe com Enter
function SeletorComBusca({ rotulo, ajuda, erro, opcoes, escolhidos, aoMudar, placeholder = 'Digite para buscar' }) {
  const id = useId()
  const entrada = useRef(null)
  const [termo, setTermo] = useState('')
  const [aberto, setAberto] = useState(false)
  const [ativo, setAtivo] = useState(0)
  const t = normalizar(termo.trim())
  const sugestoes = opcoes
    .filter((o) => !escolhidos.includes(o.chave) && (!t || normalizar(`${o.nome} ${o.detalhe || ''}`).includes(t)))
    .slice(0, 8)
  const indice = Math.min(ativo, sugestoes.length - 1)
  const mostrar = aberto && sugestoes.length > 0
  const descricao = (ch) => opcoes.find((o) => o.chave === ch) || { chave: ch, nome: nomeDaChave(ch), tipo: TIPOS_CHAVE[ch.split(':')[0]] }

  const escolher = (o) => {
    aoMudar([...escolhidos, o.chave])
    setTermo('')
    setAtivo(0)
  }
  const remover = (ch) => {
    aoMudar(escolhidos.filter((x) => x !== ch))
    entrada.current?.focus()
  }
  const teclar = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!aberto) setAberto(true)
      else setAtivo((i) => Math.min(i + 1, sugestoes.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setAtivo((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      // Enter aqui nunca envia o formulário
      e.preventDefault()
      if (mostrar && sugestoes[indice]) escolher(sugestoes[indice])
    } else if (e.key === 'Escape') {
      if (aberto) {
        e.preventDefault()
        e.stopPropagation()
        setAberto(false)
      } else setTermo('')
    } else if (e.key === 'Backspace' && !termo && escolhidos.length) {
      remover(escolhidos[escolhidos.length - 1])
    }
  }

  const idLista = `${id}-lista`
  const idAjuda = `${id}-ajuda`
  const idErro = `${id}-erro`
  return (
    <div className={`campo cupom-novo__seletor ${erro ? 'campo--erro' : ''}`}>
      <label htmlFor={id} className="campo__rotulo">{rotulo}</label>
      {escolhidos.length > 0 && (
        <ul className="cupom-novo__fichas" aria-label={`${rotulo}: ${plural(escolhidos.length, 'escolhido', 'escolhidos')}`}>
          {escolhidos.map((ch) => {
            const o = descricao(ch)
            return (
              <li key={ch} className="cupom-novo__ficha">
                {o.tipo && <span className="cupom-novo__ficha-tipo">{o.tipo}</span>}
                <span>{o.nome}</span>
                <button type="button" className="cupom-novo__ficha-remover" onClick={() => remover(ch)} aria-label={`Remover ${o.tipo ? `${o.tipo.toLowerCase()} ` : ''}${o.nome}`}>
                  <X size={14} aria-hidden />
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <div className="cupom-novo__combo">
        <Search size={16} aria-hidden className="cupom-novo__combo-icone" />
        <input
          ref={entrada}
          id={id}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={mostrar}
          aria-controls={idLista}
          aria-activedescendant={mostrar ? `${id}-op-${indice}` : undefined}
          aria-describedby={[ajuda && idAjuda, erro && idErro].filter(Boolean).join(' ') || undefined}
          aria-invalid={erro ? true : undefined}
          className="campo__entrada cupom-novo__combo-entrada"
          placeholder={placeholder}
          value={termo}
          onChange={(e) => { setTermo(e.target.value); setAberto(true); setAtivo(0) }}
          onFocus={() => setAberto(true)}
          onBlur={() => setAberto(false)}
          onClick={() => setAberto(true)}
          onKeyDown={teclar}
        />
        <ul id={idLista} role="listbox" aria-label={rotulo} className="cupom-novo__sugestoes" hidden={!mostrar}>
          {mostrar && sugestoes.map((o, i) => (
            <li
              key={o.chave}
              id={`${id}-op-${i}`}
              role="option"
              aria-selected={i === indice}
              className={`cupom-novo__sugestao ${i === indice ? 'cupom-novo__sugestao--ativa' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onMouseMove={() => setAtivo(i)}
              onClick={() => escolher(o)}
            >
              <span className="cupom-novo__sugestao-nome">{o.nome}</span>
              <span className="cupom-novo__sugestao-tipo">{[o.tipo, o.detalhe].filter(Boolean).join(' · ')}</span>
            </li>
          ))}
        </ul>
        {aberto && !sugestoes.length && (
          <p className="cupom-novo__sugestao-vazia">{t ? `Nada com "${termo.trim()}".` : 'Tudo já foi escolhido.'}</p>
        )}
      </div>
      <p className="visualmente-oculto" aria-live="polite">{aberto && t ? (sugestoes.length ? plural(sugestoes.length, 'sugestão', 'sugestões') : 'Nenhuma sugestão') : ''}</p>
      {ajuda && <p id={idAjuda} className="campo__ajuda">{ajuda}</p>}
      {erro && <p id={idErro} className="campo__erro"><AlertTriangle size={14} aria-hidden /> {erro}</p>}
    </div>
  )
}

export function CriarCupom() {
  const { cen, cenarioId, emRede, lojaId, lojasVisiveis, cardapio, cardapios, pedidosDaLoja, estadoForcado, avisar, horaAgora } = usePrototipo()
  const navegar = useNavigate()
  const celular = useEhCelular()
  const [params] = useSearchParams()
  const codigoBase = params.get('duplicar') || params.get('editar')
  const modo = params.get('editar') ? 'editar' : params.get('duplicar') ? 'duplicar' : 'novo'
  const cupomBase = useMemo(() => cupomPorCodigo(cen, codigoBase), [cen, codigoBase])
  const [inicial] = useState(() => formularioInicial({ cupom: cupomBase, modo, lojaPadrao: emRede ? null : lojaId, emRede }))
  const [f, setF] = useState(inicial)
  const [maisOpcoes, setMaisOpcoes] = useState(modo !== 'novo')
  const [passo, setPasso] = useState(modo === 'duplicar' ? 'onde' : 'objetivo')
  const [erros, setErros] = useState({})
  const [rascunho, setRascunho] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [tentou, setTentou] = useState(false)
  const idCardapio = useId()
  const titulo = modo === 'editar' ? `Editar cupom ${cupomBase?.codigo || ''}` : modo === 'duplicar' ? `Duplicar ${cupomBase?.codigo || 'cupom'}` : 'Criar cupom'
  useTitulo(titulo)

  const ordem = maisOpcoes ? ['objetivo', 'regra', 'quem', 'onde', 'resumo'] : ['objetivo', 'regra', 'resumo']
  const indice = ordem.indexOf(passo)

  // Salvamento automático do rascunho
  useEffect(() => {
    const t = setTimeout(() => setRascunho(horaAgora), 1200)
    return () => clearTimeout(t)
  }, [f]) // eslint-disable-line react-hooks/exhaustive-deps

  const mudar = (novos) => setF((x) => ({ ...x, ...novos }))
  const cardapioRef = cardapio || cardapios[cen.lojaPadrao]
  // Sugestões do cardápio real: categorias inteiras e produtos
  const opcoesCardapio = useMemo(() => {
    if (!cardapioRef) return []
    const nomeCat = (id) => cardapioRef.categorias.find((c) => c.id === id)?.nome || ''
    return [
      ...cardapioRef.categorias.map((c) => ({
        chave: `categoria:${c.nome}`, nome: c.nome, tipo: 'Categoria',
        detalhe: plural(cardapioRef.produtos.filter((p) => p.categoria === c.id).length, 'produto', 'produtos'),
      })),
      ...cardapioRef.produtos.map((p) => ({ chave: `produto:${p.nome}`, nome: p.nome, tipo: 'Produto', detalhe: nomeCat(p.categoria) })),
    ]
  }, [cardapioRef])
  const opcoesProdutos = opcoesCardapio.filter((o) => o.tipo === 'Produto')
  const opcoesLojas = lojasVisiveis.map((l) => ({ chave: `loja:${l.id}`, nome: l.nome, detalhe: l.cidade }))
  const modalidadesLoja = useMemo(() => {
    const m = new Set(pedidosDaLoja(emRede ? cen.lojaPadrao : lojaId).map((p) => p.modalidade))
    return m.size ? [...m] : ['Delivery', 'Quero levar']
  }, [pedidosDaLoja, emRede, cen, lojaId])

  const validar = (p) => {
    const e = {}
    if (p === 'regra') {
      const cod = f.codigo.trim().toUpperCase()
      if (!cod) e.codigo = 'Escreva o código que o cliente vai digitar.'
      else if (!/^[A-Z0-9]{3,15}$/.test(cod)) e.codigo = 'Use de 3 a 15 letras ou números, sem espaço.'
      else if ((modo !== 'editar' || cod !== cupomBase?.codigo) && cupomPorCodigo(cen, cod)) e.codigo = `Já existe um cupom ${cod}. Escolha outro código.`
      const tipo = tipoDoForm(f)
      if (tipo === 'porcentagem' && !(valorNum(f.valor) > 0 && valorNum(f.valor) <= 90)) e.valor = 'Escolha um desconto entre 1% e 90%.'
      if (tipo === 'reais' && !(valorNum(f.valor) > 0)) e.valor = 'Escolha o valor do desconto.'
      if (f.objetivo === 'produto' && !f.produtos.length) e.produtos = tipo === 'brinde' ? 'Escolha o produto que o cliente ganha.' : 'Escolha ao menos um produto ou categoria.'
    }
    if (p === 'onde') {
      if (f.fim < f.inicio) e.fim = 'O fim precisa ser depois do início.'
      if (!!f.horaDe !== !!f.horaAte) e.horas = 'Preencha os dois horários, ou deixe os dois em branco.'
      if (Array.isArray(f.lojas) && !f.lojas.length) e.lojas = 'Escolha ao menos uma loja.'
      if (usaRestricaoCardapio(f) && f.restricaoCardapio !== 'todo' && !f.itensCardapio.length) {
        e.itensCardapio = f.restricaoCardapio === 'so' ? 'Escolha onde o cupom vale, ou volte para "Vale em todo o cardápio".' : 'Escolha onde o cupom não vale, ou volte para "Vale em todo o cardápio".'
      }
    }
    setErros(e)
    return !Object.keys(e).length
  }
  const avancar = () => {
    if (!validar(passo)) return
    setPasso(ordem[indice + 1])
  }
  const irPara = (p) => {
    if (!ordem.includes(p)) setMaisOpcoes(true)
    setPasso(p)
  }

  const salvar = () => {
    // Volta para a etapa que tiver problema
    for (const p of ['regra', 'onde']) {
      if (!validar(p)) {
        irPara(p)
        return
      }
    }
    setSalvando(true)
    setTimeout(() => {
      const inicio = deInput(f.inicio)
      const tipo = tipoDoForm(f)
      const restringe = restricaoCardapioAtiva(f)
      const novo = {
        codigo: f.codigo.trim().toUpperCase(),
        descricao: descreverBeneficio(f) + (valorNum(f.pedidoMinimo) ? ` acima de ${moeda(valorNum(f.pedidoMinimo))}` : ''),
        objetivo: f.objetivo,
        tipo,
        valor: tipo === 'frete' || tipo === 'brinde' ? null : valorNum(f.valor),
        pedidoMinimo: valorNum(f.pedidoMinimo) || null,
        produtos: f.objetivo === 'produto' ? f.produtos : [],
        restricaoCardapio: restringe ? f.restricaoCardapio : 'todo',
        itensCardapio: restringe ? f.itensCardapio : [],
        categorias: restringe && f.restricaoCardapio === 'so' ? f.itensCardapio.filter((c) => c.startsWith('categoria:')).map(nomeDaChave) : [],
        publico: f.publico === 'segmento' ? f.segmento : f.objetivo === 'primeiro' ? 'Quem nunca pediu' : null,
        lojas: f.lojas,
        modalidades: f.modalidades,
        dias: f.dias,
        horaDe: f.horaDe, horaAte: f.horaAte,
        limiteUsos: valorNum(f.limiteUsos) || null,
        usosPorCliente: valorNum(f.usosPorCliente) || null,
        inicio,
        expira: new Date(deInput(f.fim).getTime() + 86340000),
        estado: inicio > AGORA_REFERENCIA ? 'agendado' : 'ativo',
        usos: 0, descontoConcedido: 0, faturamento: 0,
      }
      const criados = cuponsCriados[cenarioId]
      if (modo === 'editar' && cupomBase) {
        // mantém o histórico de uso e, se a regra não mudou, a descrição escrita antes
        Object.assign(novo, { usos: cupomBase.usos, descontoConcedido: cupomBase.descontoConcedido, faturamento: cupomBase.faturamento })
        if (descreverBeneficio(f) === descreverBeneficio(inicial) && f.pedidoMinimo === inicial.pedidoMinimo) novo.descricao = cupomBase.descricao
        if (cupomBase.estado === 'pausado') novo.estado = 'pausado'
        const i = criados.findIndex((c) => c.codigo === cupomBase.codigo)
        if (i >= 0) criados[i] = novo
        else cuponsEditados[cenarioId][cupomBase.codigo] = novo
      } else {
        criados.push(novo)
      }
      setSalvando(false)
      avisar(modo === 'editar' ? `Cupom ${novo.codigo} salvo.` : `Cupom ${novo.codigo} criado. ${novo.estado === 'agendado' ? `Começa a valer em ${diaMes(inicio)}.` : 'Já vale no app.'}`, 'sucesso')
      navegar(`/cupons?aba=${novo.estado}`)
    }, 800)
  }

  const erro = estadoForcado === 'erro' && !tentou
  if (estadoForcado === 'carregando') {
    return (
      <div className="pagina cupom-novo">
        <CabecalhoPagina titulo={titulo} />
        <Carregando oQue="o formulário do cupom"><Esqueleto linhas={6} altura="44px" /></Carregando>
      </div>
    )
  }
  if (erro) {
    return (
      <div className="pagina cupom-novo">
        <CabecalhoPagina titulo={titulo} />
        <EstadoErro oQue="o formulário do cupom" aoTentar={() => setTentou(true)} />
      </div>
    )
  }

  const tipo = tipoDoForm(f)
  const linhasResumo = [
    { rotulo: 'Objetivo', valor: rotuloObjetivo(f.objetivo), passo: 'objetivo' },
    { rotulo: 'Benefício', valor: descreverBeneficio(f), passo: 'regra' },
    { rotulo: 'Código', valor: f.codigo.trim().toUpperCase() || '—', passo: 'regra' },
    { rotulo: 'Pedido mínimo', valor: valorNum(f.pedidoMinimo) ? moeda(valorNum(f.pedidoMinimo)) : 'Sem pedido mínimo', passo: 'regra' },
    { rotulo: 'Quem pode usar', valor: f.objetivo === 'primeiro' ? 'Quem nunca pediu' : f.publico === 'segmento' ? f.segmento : 'Todos os clientes', passo: 'quem' },
    { rotulo: 'Limite de usos', valor: `${valorNum(f.limiteUsos) ? `${numero(valorNum(f.limiteUsos))} no total` : 'Sem limite no total'} · ${valorNum(f.usosPorCliente) ? plural(valorNum(f.usosPorCliente), 'uso', 'usos') + ' por cliente' : 'sem limite por cliente'}`, passo: 'quem' },
  ]
  const linhasOnde = [
    { rotulo: 'Validade', valor: `${diaMes(deInput(f.inicio))} a ${diaMes(deInput(f.fim))}`, passo: 'onde' },
    ...restricoes(f, { rede: cen.rede, lojasVisiveis }),
  ]
  const LinhaResumo = ({ l }) => (
    <div>
      <dt>{l.rotulo}</dt>
      <dd>{l.valor}</dd>
      <dd className="cupom-novo__alterar">
        <button type="button" className="link" onClick={() => irPara(l.passo)} aria-label={`Alterar ${l.rotulo.toLowerCase()}`}>Alterar</button>
      </dd>
    </div>
  )

  return (
    <div className="pagina cupom-novo">
      <CabecalhoPagina titulo={titulo} descricao={modo === 'duplicar' ? 'Mesmas regras do cupom original. Escolha as novas datas e confira o resumo.' : 'Escolha o objetivo; o resto já vem com padrões que você confere no resumo.'} />
      {celular && <FaixaAviso icone={Monitor}>Criar cupom funciona melhor no computador. Dá para criar aqui; a prévia fica no fim da tela.</FaixaAviso>}
      {codigoBase && !cupomBase && <FaixaAviso tom="atencao">O cupom {codigoBase} não foi encontrado. Você está criando um cupom novo.</FaixaAviso>}

      <ol className="cupom-novo__passos" aria-label="Etapas">
        {ordem.map((p, i) => (
          <li key={p} className={`cupom-novo__passo ${p === passo ? 'cupom-novo__passo--atual' : ''} ${i < indice ? 'cupom-novo__passo--feito' : ''}`} aria-current={p === passo ? 'step' : undefined}>
            <span className="cupom-novo__passo-n" aria-hidden>{i + 1}</span> {PASSOS[p]}
          </li>
        ))}
      </ol>
      <p className="cupom-novo__rascunho" role="status">{rascunho ? `Rascunho salvo às ${rascunho}` : ''}</p>

      <div className="cupom-novo__grade">
        <form className="bloco formulario cupom-novo__form" onSubmit={(e) => { e.preventDefault(); passo === 'resumo' ? salvar() : avancar() }} noValidate>
          <h2 className="cupom-novo__titulo-passo">{indice + 1}. {PASSOS[passo]}</h2>

          {passo === 'objetivo' && (
            <fieldset className="cupom-novo__grupo">
              <legend className="campo__rotulo">O que você quer com este cupom?</legend>
              {OBJETIVOS.map((o) => (
                <Opcao key={o.id} nome="objetivo" valor={o.id} atual={f.objetivo} titulo={o.rotulo} detalhe={o.exemplo} aoMudar={(v) => mudar({ objetivo: v })} />
              ))}
            </fieldset>
          )}

          {passo === 'regra' && (
            <>
              {f.objetivo === 'primeiro' && (
                <fieldset className="cupom-novo__grupo">
                  <legend className="campo__rotulo">O que o cliente ganha no primeiro pedido</legend>
                  <Opcao nome="tipoPrimeiro" valor="porcentagem" atual={f.tipoPrimeiro} titulo="Desconto em porcentagem" aoMudar={(v) => mudar({ tipoPrimeiro: v })} />
                  <Opcao nome="tipoPrimeiro" valor="frete" atual={f.tipoPrimeiro} titulo="Frete grátis" aoMudar={(v) => mudar({ tipoPrimeiro: v })} />
                </fieldset>
              )}
              {f.objetivo === 'produto' && (
                <>
                  <fieldset className="cupom-novo__grupo">
                    <legend className="campo__rotulo">O que o cliente ganha</legend>
                    <Opcao nome="beneficioProduto" valor="gratis" atual={f.beneficioProduto} titulo="Produto de presente" detalhe="O produto escolhido sai de graça no pedido" aoMudar={(v) => mudar({ beneficioProduto: v, produtos: f.produtos.filter((c) => c.startsWith('produto:')) })} />
                    <Opcao nome="beneficioProduto" valor="porcentagem" atual={f.beneficioProduto} titulo="Desconto em porcentagem nos produtos" detalhe="Ex.: 20% nos pastéis doces" aoMudar={(v) => mudar({ beneficioProduto: v })} />
                    <Opcao nome="beneficioProduto" valor="reais" atual={f.beneficioProduto} titulo="Desconto em reais nos produtos" detalhe="Ex.: R$ 3,00 a menos em cada pastel escolhido" aoMudar={(v) => mudar({ beneficioProduto: v })} />
                  </fieldset>
                  <SeletorComBusca
                    rotulo={tipo === 'brinde' ? 'Produto de presente' : 'Produtos com desconto'}
                    ajuda={tipo === 'brinde' ? 'Escolhendo mais de um, o cliente leva um deles, à escolha.' : 'Escolha produtos ou uma categoria inteira do cardápio.'}
                    erro={erros.produtos}
                    placeholder={tipo === 'brinde' ? 'Busque um produto do cardápio' : 'Busque um produto ou categoria'}
                    opcoes={tipo === 'brinde' ? opcoesProdutos : opcoesCardapio}
                    escolhidos={f.produtos}
                    aoMudar={(produtos) => mudar({ produtos })}
                  />
                </>
              )}
              {(tipo === 'porcentagem' || tipo === 'reais') && (
                <Campo rotulo={tipo === 'reais' ? 'Valor do desconto (R$)' : 'Desconto (%)'} erro={erros.valor} ajuda={tipo === 'porcentagem' ? 'Sobre o valor dos produtos, sem a taxa de entrega.' : undefined}>
                  {(p) => <input {...p} className="campo__entrada cupom-novo__curto" inputMode="decimal" value={f.valor} onChange={(e) => mudar({ valor: e.target.value })} />}
                </Campo>
              )}
              <Campo rotulo="Código do cupom" erro={erros.codigo} ajuda="O cliente digita este código no app. Letras e números, sem espaço.">
                {(p) => (
                  <div className="cupom-novo__codigo">
                    <input {...p} className="campo__entrada cupom-novo__curto" value={f.codigo} autoCapitalize="characters" onChange={(e) => mudar({ codigo: e.target.value.toUpperCase().replace(/\s/g, '') })} />
                    {!f.codigo && <Botao variante="texto" tamanho="p" onClick={() => mudar({ codigo: sugestaoCodigo(f) })}>Usar {sugestaoCodigo(f)}</Botao>}
                  </div>
                )}
              </Campo>
              <button type="button" className="cupom-novo__mais" aria-expanded={maisOpcoes} aria-controls="cupom-mais-opcoes" onClick={() => setMaisOpcoes((m) => !m)}>
                <ChevronDown size={16} aria-hidden className={maisOpcoes ? 'gira-180' : ''} /> Mais opções
                <span className="cupom-novo__mais-detalhe">pedido mínimo, quem pode usar, onde e quando vale</span>
              </button>
              {maisOpcoes && (
                <div id="cupom-mais-opcoes" className="cupom-novo__avancado">
                  <Campo rotulo="Pedido mínimo (R$)" ajuda="Deixe em branco para valer em qualquer valor.">
                    {(p) => <input {...p} className="campo__entrada cupom-novo__curto" inputMode="decimal" value={f.pedidoMinimo} onChange={(e) => mudar({ pedidoMinimo: e.target.value })} />}
                  </Campo>
                  <p className="campo__ajuda">Com mais opções, o assistente ganha as etapas Quem pode usar e Onde e quando vale (dias, horários, modalidades{cen.rede ? ', lojas' : ''} e cardápio).</p>
                </div>
              )}
            </>
          )}

          {passo === 'quem' && (
            <>
              {f.objetivo === 'primeiro' ? (
                <p className="texto-corpo">Cupom de primeiro pedido vale só para quem nunca pediu.</p>
              ) : (
                <fieldset className="cupom-novo__grupo">
                  <legend className="campo__rotulo">Quem pode usar</legend>
                  <Opcao nome="publico" valor="todos" atual={f.publico} titulo="Todos os clientes" aoMudar={(v) => mudar({ publico: v })} />
                  <Opcao nome="publico" valor="segmento" atual={f.publico} titulo="Um segmento" detalhe="Por exemplo, quem não compra há mais de 50 dias" aoMudar={(v) => mudar({ publico: v })} />
                  {f.publico === 'segmento' && (
                    <label className="filtro">
                      <span className="filtro__rotulo">Segmento</span>
                      <select value={f.segmento} onChange={(e) => mudar({ segmento: e.target.value })}>
                        {SEGMENTOS.map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </label>
                  )}
                </fieldset>
              )}
              <div className="cupom-novo__linha">
                <Campo rotulo="Limite de usos no total" ajuda="Em branco: sem limite.">{(p) => <input {...p} inputMode="numeric" className="campo__entrada" value={f.limiteUsos} onChange={(e) => mudar({ limiteUsos: e.target.value.replace(/\D/g, '') })} />}</Campo>
                <Campo rotulo="Usos por cliente" ajuda="Em branco: sem limite.">{(p) => <input {...p} inputMode="numeric" className="campo__entrada" value={f.usosPorCliente} onChange={(e) => mudar({ usosPorCliente: e.target.value.replace(/\D/g, '') })} />}</Campo>
              </div>
            </>
          )}

          {passo === 'onde' && (
            <>
              <fieldset className="cupom-novo__grupo cupom-novo__secao">
                <legend className="cupom-novo__secao-titulo">Período</legend>
                <div className="cupom-novo__linha">
                  <Campo rotulo="Começa em">{(p) => <input {...p} type="date" className="campo__entrada" value={f.inicio} min={paraInput(AGORA_REFERENCIA)} onChange={(e) => mudar({ inicio: e.target.value })} />}</Campo>
                  <Campo rotulo="Termina em" erro={erros.fim}>{(p) => <input {...p} type="date" className="campo__entrada" value={f.fim} min={f.inicio} onChange={(e) => mudar({ fim: e.target.value })} />}</Campo>
                </div>
              </fieldset>

              <fieldset className="cupom-novo__grupo cupom-novo__secao">
                <legend className="cupom-novo__secao-titulo">Dias e horários</legend>
                <p className="campo__ajuda">Sem nenhum dia marcado, vale todos os dias. Sem horário, vale o dia todo.</p>
                <div className="cupom-novo__marcaveis" role="group" aria-label="Dias da semana">
                  {DIAS.map((d) => <Marcavel key={d} rotulo={d} marcado={f.dias.includes(d)} aoMudar={(v) => mudar({ dias: v ? [...f.dias, d] : f.dias.filter((x) => x !== d) })} />)}
                </div>
                <div className="cupom-novo__linha">
                  <Campo rotulo="Das" erro={erros.horas}>{(p) => <input {...p} type="time" className="campo__entrada" value={f.horaDe} onChange={(e) => mudar({ horaDe: e.target.value })} />}</Campo>
                  <Campo rotulo="Até">{(p) => <input {...p} type="time" className="campo__entrada" value={f.horaAte} onChange={(e) => mudar({ horaAte: e.target.value })} />}</Campo>
                </div>
              </fieldset>

              <fieldset className="cupom-novo__grupo cupom-novo__secao">
                <legend className="cupom-novo__secao-titulo">Modalidades</legend>
                <p className="campo__ajuda">Sem nenhuma marcada, vale em todas as que a loja oferece.</p>
                <div className="cupom-novo__marcaveis">
                  {modalidadesLoja.map((m) => (
                    <Marcavel key={m} rotulo={m} marcado={f.modalidades.includes(m)} aoMudar={(v) => mudar({ modalidades: v ? [...f.modalidades, m] : f.modalidades.filter((x) => x !== m) })} />
                  ))}
                </div>
              </fieldset>

              {cen.rede && (
                <fieldset className="cupom-novo__grupo cupom-novo__secao">
                  <legend className="cupom-novo__secao-titulo">Lojas</legend>
                  <Opcao nome="lojas" valor="todas" atual={f.lojas === 'todas' ? 'todas' : 'algumas'} titulo={`Todas as ${lojasVisiveis.length} lojas`} aoMudar={() => mudar({ lojas: 'todas' })} />
                  <Opcao nome="lojas" valor="algumas" atual={f.lojas === 'todas' ? 'todas' : 'algumas'} titulo="Só em lojas escolhidas" aoMudar={() => mudar({ lojas: emRede ? [] : [lojaId] })} />
                  {Array.isArray(f.lojas) && (
                    <SeletorComBusca
                      rotulo="Lojas onde o cupom vale"
                      placeholder="Busque pelo nome ou cidade"
                      erro={erros.lojas}
                      opcoes={opcoesLojas}
                      escolhidos={f.lojas.map((id) => `loja:${id}`)}
                      aoMudar={(chaves) => mudar({ lojas: chaves.map((c) => Number(nomeDaChave(c))) })}
                    />
                  )}
                </fieldset>
              )}

              {usaRestricaoCardapio(f) ? (
                <fieldset className="cupom-novo__grupo cupom-novo__secao">
                  <legend className="cupom-novo__secao-titulo" id={idCardapio}>Cardápio</legend>
                  <div className="seletor-periodo cupom-novo__sentidos" role="group" aria-labelledby={idCardapio}>
                    {SENTIDOS_CARDAPIO.map(([v, r]) => (
                      <button key={v} type="button" className="seletor-periodo__opcao" aria-pressed={f.restricaoCardapio === v} onClick={() => mudar({ restricaoCardapio: v })}>{r}</button>
                    ))}
                  </div>
                  {f.restricaoCardapio === 'todo' ? (
                    <p className="campo__ajuda">O desconto vale em qualquer item do pedido.</p>
                  ) : (
                    <SeletorComBusca
                      rotulo={f.restricaoCardapio === 'so' ? 'Vale só em' : 'Não vale em'}
                      ajuda={f.restricaoCardapio === 'so' ? 'O desconto vale só nestes itens; o resto do pedido paga o preço normal.' : 'O desconto vale no pedido todo, menos nestes itens.'}
                      erro={erros.itensCardapio}
                      placeholder="Busque um produto ou categoria"
                      opcoes={opcoesCardapio}
                      escolhidos={f.itensCardapio}
                      aoMudar={(itensCardapio) => mudar({ itensCardapio })}
                    />
                  )}
                </fieldset>
              ) : (
                <p className="campo__ajuda cupom-novo__secao">
                  {f.objetivo === 'produto' ? 'Cardápio: o cupom de produto já vale só nos produtos escolhidos na etapa Regra.' : 'Cardápio: frete grátis vale para o pedido todo.'}
                </p>
              )}
            </>
          )}

          {passo === 'resumo' && (
            <>
              <dl className="cupom-novo__resumo">
                {linhasResumo.map((l) => <LinhaResumo key={l.rotulo} l={l} />)}
              </dl>
              <h3 className="cupom-novo__secao-titulo">Onde e quando vale</h3>
              <dl className="cupom-novo__resumo">
                {linhasOnde.map((l) => <LinhaResumo key={l.rotulo} l={l} />)}
              </dl>
              {!maisOpcoes && <p className="campo__ajuda">Quem pode usar, onde e quando vale estão com os padrões. Use "Alterar" para mudar.</p>}
            </>
          )}

          <div className="cupom-novo__navegacao">
            {indice > 0 ? <Botao onClick={() => { setErros({}); setPasso(ordem[indice - 1]) }}>Voltar</Botao> : <Botao variante="texto" para="/cupons">Cancelar</Botao>}
            {passo === 'resumo' ? (
              <Botao variante="principal" type="submit" mudaAlgo carregando={salvando}>{modo === 'editar' ? 'Salvar cupom' : 'Criar cupom'}</Botao>
            ) : (
              <Botao variante="principal" type="submit">Continuar</Botao>
            )}
          </div>
        </form>
        <PreviaCupom f={f} />
      </div>
    </div>
  )
}
