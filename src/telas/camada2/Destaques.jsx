// T22. Destaques do app, em duas abas: Destaques (topo, em carrossel, na ordem das posições) e Banners (pop-up ao abrir o app, ?tipo=banner).
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, X } from 'lucide-react'
import { usePrototipo } from '../../contexto/Prototipo.jsx'
import { useEhCelular, useTitulo } from '../../utilitarios/ganchos.js'
import { AGORA_REFERENCIA, diaMes } from '../../utilitarios/formatos.js'
import { Abas, Botao, CabecalhoPagina, Campo, Carregando, Confirmacao, EstadoErro, EstadoVazio, Esqueleto, FaixaAviso, Selo, Sobreposicao } from '../../componentes/base.jsx'
import { FOTOS } from '../../dados/fotosFontes.js'
import { FOTOS_DESTAQUE, FREQUENCIAS_BANNER, ONDE_BANNER, bannersIniciais, destaquesIniciais, paletaArte, tipoArte } from '../../dados/marketing.js'
import { SEGMENTOS_LISTA } from '../../dados/vendas.js'
import '../../estilos/marketing.css'

const ESTADOS = {
  ativo: { rotulo: 'No ar', tom: 'verde' },
  agendado: { rotulo: 'Agendado', tom: 'azul' },
  pausado: { rotulo: 'Pausado', tom: 'ambar' },
}
const ROTULOS_LINK = { categoria: 'Categoria', produto: 'Produto', cupom: 'Cupom', web: 'Endereço' }
// A paleta da arte vira variáveis CSS locais; fica só dentro da arte (conteúdo do restaurante)
const estiloPaleta = (p) => ({ '--arte-fundo': p.fundo, '--arte-texto': p.texto, '--arte-botao-fundo': p.botaoFundo, '--arte-botao-texto': p.botaoTexto })
const textoLink = (d) => (!d.tipoLink || d.tipoLink === 'nenhum' ? 'Sem link' : `${ROTULOS_LINK[d.tipoLink]}: ${d.alvo}`)
const ordinal = (n) => `${n}º`
const paraInput = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const deInput = (s) => {
  const [a, m, d] = s.split('-').map(Number)
  return new Date(a, m - 1, d)
}

// Arte do destaque (16:7): foto do cardápio com o texto da campanha sobre a paleta fixa do restaurante.
// Com arte enviada pelo lojista, mostra só a imagem dele.
function ArteDestaque({ titulo, descricao, foto, url, marca, paleta, grande }) {
  const classe = `destaques__arte ${grande ? 'destaques__arte--grande' : ''}`
  if (url) {
    return (
      <span className={classe} style={estiloPaleta(paleta)} aria-hidden>
        <img className="destaques__arte-enviada" src={url} alt="" />
      </span>
    )
  }
  const fotoUrl = FOTOS[foto]?.url
  return (
    <span className={`${classe} ${fotoUrl ? '' : 'destaques__arte--sem-foto'}`} style={estiloPaleta(paleta)} aria-hidden>
      {fotoUrl && <img className="destaques__arte-foto" src={fotoUrl} alt="" loading="lazy" />}
      <span className="destaques__arte-painel">
        <span className="destaques__arte-marca">{marca}</span>
        <span className="destaques__arte-titulo">{titulo || 'Título do destaque'}</span>
        {descricao && <span className="destaques__arte-descricao">{descricao}</span>}
        <span className="destaques__arte-botao">Peça agora</span>
      </span>
    </span>
  )
}

function formularioDe(d, total) {
  if (!d) {
    return { titulo: '', descricao: '', foto: null, tipoLink: 'nenhum', alvo: '', inicio: paraInput(AGORA_REFERENCIA), fim: '', arquivo: null, url: null, posicao: total }
  }
  return {
    titulo: d.titulo, descricao: d.descricao || '', foto: d.foto || null, tipoLink: d.tipoLink || 'nenhum', alvo: d.alvo || '',
    inicio: paraInput(d.inicio), fim: paraInput(d.fim), arquivo: d.arquivo || null, url: d.url || null, posicao: d.posicao,
  }
}

// O mesmo formulário cria e edita; ao editar, já vem preenchido
function FormularioDestaque({ aberto, destaque, total, aoFechar, aoSalvar, cardapio, cupons }) {
  const { cen, podeAgir } = usePrototipo()
  const fotos = FOTOS_DESTAQUE[tipoArte(cen)]
  const [f, setF] = useState(() => formularioDe(destaque, total))
  const [erros, setErros] = useState({})
  const [salvando, setSalvando] = useState(false)
  useEffect(() => {
    if (aberto) {
      setF({ ...formularioDe(destaque, total), ...(destaque ? {} : { foto: fotos[0][0] }) })
      setErros({})
    }
  }, [aberto, destaque?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const mudar = (n) => setF((x) => ({ ...x, ...n }))
  const listaAlvo = f.tipoLink === 'categoria' ? cardapio.categorias.map((c) => c.nome) : f.tipoLink === 'produto' ? cardapio.produtos.map((p) => p.nome) : f.tipoLink === 'cupom' ? cupons : []
  // ao editar, o alvo salvo aparece mesmo que não esteja mais na lista (cupom agendado, produto de outra loja)
  const opcoesAlvo = f.alvo && listaAlvo.length && !listaAlvo.includes(f.alvo) ? [f.alvo, ...listaAlvo] : listaAlvo

  const salvar = () => {
    const e = {}
    if (!f.titulo.trim()) e.titulo = 'Escreva o título do destaque.'
    if (f.tipoLink !== 'nenhum' && !f.alvo.trim()) e.alvo = f.tipoLink === 'web' ? 'Escreva o endereço.' : 'Escolha para onde o destaque leva.'
    if (f.tipoLink === 'web' && f.alvo && !/^https:\/\/\S+\.\S+/.test(f.alvo)) e.alvo = 'Use um endereço completo, começando com https://'
    if (!f.fim) e.fim = 'Escolha até quando o destaque fica no app.'
    else if (f.fim < f.inicio) e.fim = 'O fim precisa ser depois do início.'
    setErros(e)
    if (Object.keys(e).length) return
    setSalvando(true)
    setTimeout(() => {
      const inicio = deInput(f.inicio)
      const estadoPelaData = inicio > AGORA_REFERENCIA ? 'agendado' : 'ativo'
      aoSalvar({
        id: destaque?.id || `n${Date.now()}`,
        titulo: f.titulo.trim(),
        descricao: f.descricao.trim(),
        foto: f.foto,
        arquivo: f.arquivo,
        url: f.url,
        tipoLink: f.tipoLink,
        alvo: f.tipoLink === 'nenhum' ? '' : f.alvo.trim(),
        inicio,
        fim: deInput(f.fim),
        estado: destaque?.estado === 'pausado' ? 'pausado' : estadoPelaData,
      }, Number(f.posicao))
      setSalvando(false)
    }, 700)
  }

  return (
    <Sobreposicao
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={destaque ? 'Editar destaque' : 'Novo destaque'}
      subtitulo={destaque ? `Hoje na posição ${ordinal(destaque.posicao)}` : undefined}
      forma="lateral"
      largura="560px"
      rodape={
        <>
          <Botao onClick={aoFechar}>Cancelar</Botao>
          <Botao variante="principal" mudaAlgo carregando={salvando} onClick={salvar} disabled={!podeAgir}>Salvar destaque</Botao>
        </>
      }
    >
      <div className="formulario">
        <div className="destaques__previa">
          <p className="campo__rotulo">Prévia no topo do app · posição <span className="destaques__numero">{ordinal(f.posicao)}</span></p>
          <ArteDestaque titulo={f.titulo} descricao={f.descricao} foto={f.foto} url={f.url} marca={cen.marca.nome} paleta={paletaArte(cen)} grande />
        </div>
        <label className="filtro">
          <span className="filtro__rotulo">Foto da arte</span>
          <select value={f.foto || ''} onChange={(e) => mudar({ foto: e.target.value || null })} disabled={!!f.url}>
            {fotos.map(([chave, nome]) => <option key={chave} value={chave}>{nome}</option>)}
            <option value="">Sem foto, só o fundo da arte</option>
          </select>
        </label>
        {f.url ? (
          <div className="destaques__enviada">
            <span>Arte enviada: <strong>{f.arquivo || 'imagem'}</strong></span>
            <Botao variante="texto" tamanho="p" onClick={() => mudar({ url: null, arquivo: null })}>Usar a arte com foto</Botao>
          </div>
        ) : (
          <Campo rotulo="Ou envie a sua arte pronta (opcional)" ajuda="Tamanho recomendado: 1600 × 700 px (proporção 16:7), JPG ou PNG, até 1 MB. Ela substitui a arte montada.">
            {(p) => (
              <input
                {...p}
                type="file"
                accept="image/png,image/jpeg"
                className="campo__entrada"
                onChange={(e) => {
                  const arq = e.target.files?.[0]
                  mudar({ arquivo: arq?.name || null, url: arq ? URL.createObjectURL(arq) : null })
                }}
              />
            )}
          </Campo>
        )}
        <Campo rotulo="Título" erro={erros.titulo} ajuda="Até 40 caracteres. É o texto grande da arte e o que o leitor de tela lê.">
          {(p) => <input {...p} className="campo__entrada" maxLength={40} placeholder="Ex.: Terça do pastel: 2 por R$ 25" value={f.titulo} onChange={(e) => mudar({ titulo: e.target.value })} />}
        </Campo>
        <Campo rotulo="Descrição (opcional)" ajuda="Até 60 caracteres. Linha menor, abaixo do título.">
          {(p) => <input {...p} className="campo__entrada" maxLength={60} placeholder="Ex.: Toda terça, em qualquer pastel salgado" value={f.descricao} onChange={(e) => mudar({ descricao: e.target.value })} />}
        </Campo>
        <label className="filtro">
          <span className="filtro__rotulo">Ao tocar, leva para</span>
          <select value={f.tipoLink} onChange={(e) => mudar({ tipoLink: e.target.value, alvo: '' })}>
            <option value="nenhum">Nenhum lugar (só imagem)</option>
            <option value="categoria">Uma categoria do cardápio</option>
            <option value="produto">Um produto</option>
            {(cupons.length > 0 || f.tipoLink === 'cupom') && <option value="cupom">Um cupom</option>}
            <option value="web">Um endereço da web</option>
          </select>
        </label>
        {f.tipoLink === 'web' && (
          <Campo rotulo="Endereço" erro={erros.alvo}>{(p) => <input {...p} type="url" className="campo__entrada" placeholder="https://" value={f.alvo} onChange={(e) => mudar({ alvo: e.target.value })} />}</Campo>
        )}
        {opcoesAlvo.length > 0 && (
          <label className="filtro">
            <span className="filtro__rotulo">Qual</span>
            <select value={f.alvo} onChange={(e) => mudar({ alvo: e.target.value })} aria-invalid={erros.alvo ? true : undefined}>
              <option value="">Escolha</option>
              {opcoesAlvo.map((o) => <option key={o}>{o}</option>)}
            </select>
            {erros.alvo && <span className="campo__erro">{erros.alvo}</span>}
          </label>
        )}
        <div className="cupom-novo__linha">
          <Campo rotulo="Começa em">{(p) => <input {...p} type="date" className="campo__entrada" value={f.inicio} min={destaque ? undefined : paraInput(AGORA_REFERENCIA)} onChange={(e) => mudar({ inicio: e.target.value })} />}</Campo>
          <Campo rotulo="Termina em" erro={erros.fim}>{(p) => <input {...p} type="date" className="campo__entrada" value={f.fim} min={f.inicio} onChange={(e) => mudar({ fim: e.target.value })} />}</Campo>
        </div>
        <label className="filtro">
          <span className="filtro__rotulo">Posição no app</span>
          <select value={f.posicao} onChange={(e) => mudar({ posicao: Number(e.target.value) })}>
            {Array.from({ length: total }, (_, i) => <option key={i} value={i + 1}>{ordinal(i + 1)}{i === 0 ? ', o primeiro que o cliente vê' : ''}</option>)}
          </select>
          <span className="campo__ajuda">Os outros destaques se reorganizam; duas posições iguais não existem.</span>
        </label>
      </div>
    </Sobreposicao>
  )
}

// ---------- Banners (pop-up) ----------
const rotuloPublico = (id) => (id === 'todos' ? 'Todos os clientes' : SEGMENTOS_LISTA.find((s) => s.id === id)?.rotulo || id)
const rotuloFrequencia = (id) => FREQUENCIAS_BANNER.find((x) => x.id === id)?.rotulo
const rotuloOnde = (id) => ONDE_BANNER.find((x) => x.id === id)?.rotulo
const sobrepoe = (a, b) => a.inicio <= b.fim && b.inicio <= a.fim
// Só um banner ativo (no ar ou agendado) por vez em cada público, no mesmo período
const conflitosDe = (b, lista) => lista.filter((x) => x.id !== b.id && x.estado !== 'pausado' && x.publico === b.publico && sobrepoe(x, b))

// Mini-esquema de um celular com a posição da arte destacada
function EsquemaCelular({ tipo }) {
  return (
    <svg className="destaques__esquema" viewBox="0 0 64 112" width="64" height="112" aria-hidden focusable="false">
      <rect className="esquema__corpo" x="1.5" y="1.5" width="61" height="109" rx="9" />
      <rect className="esquema__linha" x="24" y="6" width="16" height="3" rx="1.5" />
      {tipo === 'destaque' ? (
        <>
          <rect className="esquema__alvo" x="7" y="14" width="50" height="22" rx="3" />
          <circle className="esquema__alvo" cx="28" cy="40" r="1.5" />
          <circle className="esquema__linha" cx="32" cy="40" r="1.5" />
          <circle className="esquema__linha" cx="36" cy="40" r="1.5" />
          <rect className="esquema__linha" x="7" y="47" width="50" height="8" rx="2" />
          <rect className="esquema__linha" x="7" y="59" width="50" height="8" rx="2" />
          <rect className="esquema__linha" x="7" y="71" width="50" height="8" rx="2" />
          <rect className="esquema__linha" x="7" y="83" width="50" height="8" rx="2" />
        </>
      ) : (
        <>
          <rect className="esquema__linha" x="7" y="14" width="50" height="22" rx="3" />
          <rect className="esquema__linha" x="7" y="42" width="50" height="8" rx="2" />
          <rect className="esquema__linha" x="7" y="54" width="50" height="8" rx="2" />
          <rect className="esquema__linha" x="7" y="66" width="50" height="8" rx="2" />
          <rect className="esquema__linha" x="7" y="78" width="50" height="8" rx="2" />
          <rect className="esquema__veu" x="3" y="12" width="58" height="94" rx="2" />
          <rect className="esquema__popup" x="12" y="26" width="40" height="50" rx="3" />
          <rect className="esquema__alvo" x="16" y="30" width="32" height="24" rx="2" />
          <rect className="esquema__linha" x="16" y="58" width="24" height="3" rx="1.5" />
          <rect className="esquema__alvo" x="16" y="66" width="20" height="5" rx="2.5" />
          <path className="esquema__fechar" d="M45 29.5l3 3m0-3l-3 3" />
        </>
      )}
    </svg>
  )
}

function OndeAparece({ tipo, titulo, children, acao }) {
  return (
    <section className="destaques__onde" aria-labelledby={`onde-${tipo}`}>
      <EsquemaCelular tipo={tipo} />
      <div className="destaques__onde-textos">
        <h2 id={`onde-${tipo}`} className="destaques__onde-titulo">{titulo}</h2>
        <p className="destaques__onde-texto">{children}</p>
      </div>
      {acao && <div className="destaques__onde-acao">{acao}</div>}
    </section>
  )
}

// Arte do banner (4:5): foto em cima, texto e botão embaixo, na paleta fixa do restaurante
function ArteBanner({ titulo, texto, rotuloBotao, foto, url, marca, paleta }) {
  if (url) {
    return (
      <span className="banners__arte" style={estiloPaleta(paleta)} aria-hidden>
        <img className="destaques__arte-enviada" src={url} alt="" />
      </span>
    )
  }
  const fotoUrl = FOTOS[foto]?.url
  return (
    <span className={`banners__arte ${fotoUrl ? '' : 'banners__arte--sem-foto'}`} style={estiloPaleta(paleta)} aria-hidden>
      {fotoUrl && <img className="banners__arte-foto" src={fotoUrl} alt="" loading="lazy" />}
      <span className="banners__arte-painel">
        <span className="banners__arte-marca">{marca}</span>
        <span className="banners__arte-titulo">{titulo || 'Título do banner'}</span>
        {texto && <span className="banners__arte-texto">{texto}</span>}
        <span className="banners__arte-botao">{rotuloBotao || 'Botão'}</span>
      </span>
    </span>
  )
}

// Prévia de celular: home do app esmaecida e o pop-up por cima, com o botão de fechar
function PreviaPopup({ banner, marca, paleta }) {
  return (
    <div className="banners__celular" role="img" aria-label={`Prévia: o banner "${banner.titulo || 'sem título'}" abre por cima da home do app, com botão de fechar.`}>
      <div className="banners__home" aria-hidden>
        <span className="banners__home-marca">{marca}</span>
        <span className="banners__home-destaque" style={estiloPaleta(paleta)} />
        <span className="banners__home-chips"><span /><span /><span /></span>
        <span className="banners__home-produto" />
        <span className="banners__home-produto" />
        <span className="banners__home-produto" />
      </div>
      <div className="banners__veu" aria-hidden />
      <div className="banners__popup" aria-hidden>
        <span className="banners__fechar"><X size={14} /></span>
        <ArteBanner {...banner} marca={marca} paleta={paleta} />
      </div>
    </div>
  )
}

function formularioBannerDe(b) {
  if (!b) {
    return {
      titulo: '', texto: '', foto: null, arquivo: null, url: null, rotuloBotao: 'Ver agora', tipoBotao: 'categoria', alvo: '',
      inicio: paraInput(AGORA_REFERENCIA), fim: '', frequencia: 'uma-vez-cliente', publico: 'todos', onde: 'ambos',
    }
  }
  return {
    titulo: b.titulo, texto: b.texto || '', foto: b.foto || null, arquivo: b.arquivo || null, url: b.url || null,
    rotuloBotao: b.botao.rotulo, tipoBotao: b.botao.tipo, alvo: b.botao.alvo, inicio: paraInput(b.inicio), fim: paraInput(b.fim),
    frequencia: b.frequencia, publico: b.publico, onde: b.onde,
  }
}

function FormularioBanner({ aberto, banner, banners, aoFechar, aoSalvar, cardapio, cupons }) {
  const { cen, podeAgir } = usePrototipo()
  const fotos = FOTOS_DESTAQUE[tipoArte(cen)]
  const [f, setF] = useState(() => formularioBannerDe(banner))
  const [pausarAnterior, setPausarAnterior] = useState(false)
  const [erros, setErros] = useState({})
  const [salvando, setSalvando] = useState(false)
  useEffect(() => {
    if (aberto) {
      setF({ ...formularioBannerDe(banner), ...(banner ? {} : { foto: fotos[0][0] }) })
      setPausarAnterior(false)
      setErros({})
    }
  }, [aberto, banner?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const mudar = (n) => setF((x) => ({ ...x, ...n }))
  const listaAlvo = f.tipoBotao === 'categoria' ? cardapio.categorias.map((c) => c.nome) : f.tipoBotao === 'produto' ? cardapio.produtos.map((p) => p.nome) : f.tipoBotao === 'cupom' ? cupons : []
  const opcoesAlvo = f.alvo && listaAlvo.length && !listaAlvo.includes(f.alvo) ? [f.alvo, ...listaAlvo] : listaAlvo

  // Conflito: vale para o banner que vai ficar ativo ou agendado (pausado não disputa o lugar)
  const ficaPausado = banner?.estado === 'pausado'
  const periodo = f.inicio && f.fim && f.fim >= f.inicio ? { inicio: deInput(f.inicio), fim: deInput(f.fim) } : null
  const conflitos = !ficaPausado && periodo ? conflitosDe({ id: banner?.id, publico: f.publico, ...periodo }, banners) : []

  const salvar = () => {
    const e = {}
    if (!f.titulo.trim()) e.titulo = 'Escreva o título do banner.'
    if (!f.rotuloBotao.trim()) e.rotuloBotao = 'Escreva o texto do botão.'
    if (!f.alvo.trim()) e.alvo = f.tipoBotao === 'web' ? 'Escreva o endereço.' : 'Escolha para onde o botão leva.'
    else if (f.tipoBotao === 'web' && !/^https:\/\/\S+\.\S+/.test(f.alvo)) e.alvo = 'Use um endereço completo, começando com https://'
    if (!f.fim) e.fim = 'Escolha até quando o banner aparece.'
    else if (f.fim < f.inicio) e.fim = 'O fim precisa ser depois do início.'
    if (conflitos.length && !pausarAnterior) e.conflito = 'Confirme que o banner anterior vai ser pausado, ou mude o público ou o período.'
    setErros(e)
    if (Object.keys(e).length) return
    setSalvando(true)
    setTimeout(() => {
      const inicio = deInput(f.inicio)
      aoSalvar({
        id: banner?.id || `b${Date.now()}`,
        titulo: f.titulo.trim(),
        texto: f.texto.trim(),
        foto: f.foto,
        arquivo: f.arquivo,
        url: f.url,
        botao: { rotulo: f.rotuloBotao.trim(), tipo: f.tipoBotao, alvo: f.alvo.trim() },
        inicio,
        fim: deInput(f.fim),
        frequencia: f.frequencia,
        publico: f.publico,
        onde: f.onde,
        estado: ficaPausado ? 'pausado' : inicio > AGORA_REFERENCIA ? 'agendado' : 'ativo',
      }, conflitos)
      setSalvando(false)
    }, 700)
  }

  return (
    <Sobreposicao
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={banner ? 'Editar banner' : 'Novo banner'}
      subtitulo="Abre por cima da home do app, como pop-up"
      forma="lateral"
      largura="600px"
      rodape={
        <>
          <Botao onClick={aoFechar}>Cancelar</Botao>
          <Botao variante="principal" mudaAlgo carregando={salvando} onClick={salvar} disabled={!podeAgir}>
            {conflitos.length ? 'Pausar o anterior e salvar' : 'Salvar banner'}
          </Botao>
        </>
      }
    >
      <div className="formulario">
        <div className="destaques__previa">
          <p className="campo__rotulo">Prévia ao abrir o app</p>
          <PreviaPopup banner={{ titulo: f.titulo, texto: f.texto, rotuloBotao: f.rotuloBotao, foto: f.foto, url: f.url }} marca={cen.marca.nome} paleta={paletaArte(cen)} />
        </div>
        <label className="filtro">
          <span className="filtro__rotulo">Foto da arte</span>
          <select value={f.foto || ''} onChange={(e) => mudar({ foto: e.target.value || null })} disabled={!!f.url}>
            {fotos.map(([chave, nome]) => <option key={chave} value={chave}>{nome}</option>)}
            <option value="">Sem foto, só o fundo da arte</option>
          </select>
        </label>
        {f.url ? (
          <div className="destaques__enviada">
            <span>Arte enviada: <strong>{f.arquivo || 'imagem'}</strong></span>
            <Botao variante="texto" tamanho="p" onClick={() => mudar({ url: null, arquivo: null })}>Usar a arte com foto</Botao>
          </div>
        ) : (
          <Campo rotulo="Ou envie a sua arte pronta (opcional)" ajuda="Tamanho recomendado: 1080 × 1350 px (proporção 4:5, em pé), JPG ou PNG, até 1 MB. Ela substitui a arte montada; o botão de fechar fica por cima, no canto.">
            {(p) => (
              <input
                {...p}
                type="file"
                accept="image/png,image/jpeg"
                className="campo__entrada"
                onChange={(e) => {
                  const arq = e.target.files?.[0]
                  mudar({ arquivo: arq?.name || null, url: arq ? URL.createObjectURL(arq) : null })
                }}
              />
            )}
          </Campo>
        )}
        <Campo rotulo="Título" erro={erros.titulo} ajuda="Até 40 caracteres.">
          {(p) => <input {...p} className="campo__entrada" maxLength={40} placeholder="Ex.: Bem-vindo! Frete grátis no 1º pedido" value={f.titulo} onChange={(e) => mudar({ titulo: e.target.value })} />}
        </Campo>
        <Campo rotulo="Texto (opcional)" ajuda="Até 100 caracteres, abaixo do título.">
          {(p) => <textarea {...p} className="campo__entrada" rows={2} maxLength={100} placeholder="Ex.: Use o cupom PRIMEIRA no seu primeiro pedido." value={f.texto} onChange={(e) => mudar({ texto: e.target.value })} />}
        </Campo>

        <p className="cupom-novo__secao-titulo">Botão de ação</p>
        <div className="cupom-novo__linha">
          <Campo rotulo="Texto do botão" erro={erros.rotuloBotao} ajuda="Até 20 caracteres.">
            {(p) => <input {...p} className="campo__entrada" maxLength={20} value={f.rotuloBotao} onChange={(e) => mudar({ rotuloBotao: e.target.value })} />}
          </Campo>
          <label className="filtro">
            <span className="filtro__rotulo">Ao tocar, leva para</span>
            <select value={f.tipoBotao} onChange={(e) => mudar({ tipoBotao: e.target.value, alvo: '' })}>
              <option value="categoria">Uma categoria do cardápio</option>
              <option value="produto">Um produto</option>
              {(cupons.length > 0 || f.tipoBotao === 'cupom') && <option value="cupom">Um cupom</option>}
              <option value="web">Um link (endereço da web)</option>
            </select>
          </label>
        </div>
        {f.tipoBotao === 'web' ? (
          <Campo rotulo="Endereço" erro={erros.alvo}>{(p) => <input {...p} type="url" className="campo__entrada" placeholder="https://" value={f.alvo} onChange={(e) => mudar({ alvo: e.target.value })} />}</Campo>
        ) : (
          <label className="filtro">
            <span className="filtro__rotulo">Qual</span>
            <select value={f.alvo} onChange={(e) => mudar({ alvo: e.target.value })} aria-invalid={erros.alvo ? true : undefined}>
              <option value="">Escolha</option>
              {opcoesAlvo.map((o) => <option key={o}>{o}</option>)}
            </select>
            {erros.alvo && <span className="campo__erro">{erros.alvo}</span>}
          </label>
        )}

        <p className="cupom-novo__secao-titulo">Quando e para quem</p>
        <div className="cupom-novo__linha">
          <Campo rotulo="Começa em">{(p) => <input {...p} type="date" className="campo__entrada" value={f.inicio} min={banner ? undefined : paraInput(AGORA_REFERENCIA)} onChange={(e) => mudar({ inicio: e.target.value })} />}</Campo>
          <Campo rotulo="Termina em" erro={erros.fim}>{(p) => <input {...p} type="date" className="campo__entrada" value={f.fim} min={f.inicio} onChange={(e) => mudar({ fim: e.target.value })} />}</Campo>
        </div>
        <fieldset className="cupom-novo__grupo">
          <legend className="campo__rotulo">Com que frequência aparece</legend>
          {FREQUENCIAS_BANNER.map((q) => (
            <label key={q.id} className={`cupom-novo__opcao ${f.frequencia === q.id ? 'cupom-novo__opcao--marcada' : ''}`}>
              <input type="radio" name="frequencia-banner" value={q.id} checked={f.frequencia === q.id} onChange={() => mudar({ frequencia: q.id })} />
              <span>
                <span className="cupom-novo__opcao-titulo">{q.rotulo}</span>
                <span className="cupom-novo__opcao-detalhe">{q.detalhe}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <label className="filtro">
          <span className="filtro__rotulo">Público</span>
          <select value={f.publico} onChange={(e) => mudar({ publico: e.target.value })}>
            <option value="todos">Todos os clientes</option>
            {SEGMENTOS_LISTA.map((s) => <option key={s.id} value={s.id}>{s.rotulo}: {s.descricao.toLowerCase()}</option>)}
          </select>
          <span className="campo__ajuda">Só um banner fica ativo por vez em cada público.</span>
        </label>
        <fieldset className="cupom-novo__grupo">
          <legend className="campo__rotulo">Onde aparece</legend>
          <div className="cupom-novo__marcaveis">
            {ONDE_BANNER.map((o) => (
              <label key={o.id} className="cupom-novo__marcavel">
                <input type="radio" name="onde-banner" value={o.id} checked={f.onde === o.id} onChange={() => mudar({ onde: o.id })} />
                {o.rotulo}
              </label>
            ))}
          </div>
        </fieldset>

        {conflitos.length > 0 && (
          <div className="banners__conflito">
            <FaixaAviso tom="atencao">
              Já existe um banner para <strong>{rotuloPublico(f.publico)}</strong> nesse período:{' '}
              {conflitos.map((c, i) => (
                <span key={c.id}>{i > 0 && ', '}"{c.titulo}" (<span className="destaques__numero">{diaMes(c.inicio)} a {diaMes(c.fim)}</span>)</span>
              ))}
              . Só um fica ativo por vez em cada público.
            </FaixaAviso>
            <label className="cupom-novo__marcavel">
              <input type="checkbox" checked={pausarAnterior} onChange={(e) => setPausarAnterior(e.target.checked)} aria-invalid={erros.conflito ? true : undefined} />
              {conflitos.length === 1 ? `Pausar "${conflitos[0].titulo}" e deixar este no lugar` : 'Pausar os anteriores e deixar este no lugar'}
            </label>
            {erros.conflito && <span className="campo__erro">{erros.conflito}</span>}
          </div>
        )}
      </div>
    </Sobreposicao>
  )
}

// ---------- Tela ----------
export function Destaques() {
  const { cen, cardapio, cardapios, lojasVisiveis, estadoForcado, avisar } = usePrototipo()
  const celular = useEhCelular()
  const [params] = useSearchParams()
  const tipo = params.get('tipo') === 'banner' ? 'banner' : 'destaque'
  const [destaques, setDestaques] = useState(() => destaquesIniciais(cen))
  const [banners, setBanners] = useState(() => bannersIniciais(cen))
  const [formulario, setFormulario] = useState(null) // null | { destaque: null (novo) | destaque }
  const [formBanner, setFormBanner] = useState(null) // null | { banner: null (novo) | banner }
  const [excluir, setExcluir] = useState(null) // { tipo, item }
  const [excluindo, setExcluindo] = useState(false)
  const [ativarComConflito, setAtivarComConflito] = useState(null) // { banner, conflitos }
  const [ativando, setAtivando] = useState(false)
  const [mudando, setMudando] = useState(null)
  const [anuncio, setAnuncio] = useState('')
  const [tentou, setTentou] = useState(false)
  useTitulo(tipo === 'banner' ? 'Banners' : 'Destaques e banners')

  const paleta = paletaArte(cen)
  const vazio = estadoForcado === 'vazio'
  // A posição é a ordem da lista: 1º, 2º, 3º…
  const lista = (vazio ? [] : destaques).map((d, i) => ({ ...d, posicao: i + 1 }))
  const listaBanners = vazio ? [] : banners
  const cardapioRef = cardapio || cardapios[cen.lojaPadrao]
  const cupons = cen.cupons.filter((c) => c.estado === 'ativo').map((c) => c.codigo)

  // Leva o destaque para a nova posição; os outros andam uma casa
  const reposicionar = (l, item, posicao) => {
    const n = l.filter((x) => x.id !== item.id)
    n.splice(Math.min(Math.max(posicao, 1), n.length + 1) - 1, 0, item)
    return n
  }
  const mudarPosicao = (d, posicao) => {
    setDestaques((l) => reposicionar(l, l.find((x) => x.id === d.id), posicao))
    setAnuncio(`"${d.titulo}" agora está na posição ${ordinal(posicao)} de ${lista.length}. Os outros destaques foram reorganizados.`)
    // o foco segue o seletor do item, que mudou de lugar
    setTimeout(() => document.getElementById(`posicao-${d.id}`)?.focus(), 0)
  }
  const estadoAoAtivar = (x) => (x.inicio > AGORA_REFERENCIA ? 'agendado' : 'ativo')
  const alternar = (d) => {
    setMudando(d.id)
    setTimeout(() => {
      const novoEstado = d.estado === 'pausado' ? estadoAoAtivar(d) : 'pausado'
      setDestaques((l) => l.map((x) => (x.id === d.id ? { ...x, estado: novoEstado } : x)))
      setMudando(null)
      avisar(novoEstado === 'pausado' ? `"${d.titulo}" pausado. Ele sai do app até você ativar.` : `"${d.titulo}" ativado.`, 'sucesso')
    }, 600)
  }
  const alternarBanner = (b, pausar = []) => {
    setMudando(b.id)
    setTimeout(() => {
      const novoEstado = b.estado === 'pausado' ? estadoAoAtivar(b) : 'pausado'
      const ids = pausar.map((x) => x.id)
      setBanners((l) => l.map((x) => (x.id === b.id ? { ...x, estado: novoEstado } : ids.includes(x.id) ? { ...x, estado: 'pausado' } : x)))
      setMudando(null)
      setAtivando(false)
      setAtivarComConflito(null)
      if (novoEstado === 'pausado') avisar(`Banner "${b.titulo}" pausado. Ele não abre mais no app até você ativar.`, 'sucesso')
      else avisar(pausar.length ? `Banner "${b.titulo}" ativado. "${pausar.map((x) => x.titulo).join('", "')}" foi pausado.` : `Banner "${b.titulo}" ativado.`, 'sucesso')
    }, 600)
  }
  const pedirAtivarBanner = (b) => {
    if (b.estado !== 'pausado') return alternarBanner(b)
    const conflitos = conflitosDe(b, banners)
    if (conflitos.length) setAtivarComConflito({ banner: b, conflitos })
    else alternarBanner(b)
  }
  const confirmarExcluir = () => {
    setExcluindo(true)
    setTimeout(() => {
      if (excluir.tipo === 'banner') setBanners((l) => l.filter((x) => x.id !== excluir.item.id))
      else setDestaques((l) => l.filter((x) => x.id !== excluir.item.id))
      avisar(`${excluir.tipo === 'banner' ? 'Banner' : 'Destaque'} "${excluir.item.titulo}" excluído.`, 'sucesso')
      setExcluindo(false)
      setExcluir(null)
    }, 600)
  }
  const salvarDestaque = (d, posicao) => {
    const editando = !!formulario?.destaque
    setDestaques((l) => reposicionar(l, d, posicao))
    setFormulario(null)
    avisar(editando ? `Destaque "${d.titulo}" salvo na posição ${ordinal(posicao)}.` : `Destaque "${d.titulo}" criado na posição ${ordinal(posicao)}.`, 'sucesso')
  }
  const salvarBanner = (b, pausar) => {
    const editando = !!formBanner?.banner
    const ids = pausar.map((x) => x.id)
    setBanners((l) => {
      const n = l.map((x) => (ids.includes(x.id) ? { ...x, estado: 'pausado' } : x))
      return editando ? n.map((x) => (x.id === b.id ? b : x)) : [b, ...n]
    })
    setFormBanner(null)
    const pausados = pausar.length ? ` "${pausar.map((x) => x.titulo).join('", "')}" foi pausado.` : ''
    avisar(`Banner "${b.titulo}" ${editando ? 'salvo' : 'criado'}.${pausados}`, 'sucesso')
  }

  const nomesLojas = lojasVisiveis.map((l) => l.nome)
  const faixa = (
    <FaixaAviso>
      Estas artes aparecem no app e no cardápio web <strong>{cen.marca.nome}</strong> para {cen.rede ? <>as <strong>{nomesLojas.length} lojas</strong> da rede</> : <>a loja <strong>{nomesLojas[0]}</strong></>}.
      {cen.rede && (
        <details className="destaques__lojas">
          <summary>Ver as lojas</summary>
          <p>{nomesLojas.join(', ')}.</p>
        </details>
      )}
    </FaixaAviso>
  )

  const novoDestaque = <Botao variante="principal" icone={Plus} onClick={() => setFormulario({ destaque: null })}>Novo destaque</Botao>
  const novoBanner = <Botao variante="principal" icone={Plus} onClick={() => setFormBanner({ banner: null })}>Novo banner</Botao>
  const erro = estadoForcado === 'erro' && !tentou
  const oQue = tipo === 'banner' ? 'os banners' : 'os destaques'

  let conteudo
  if (estadoForcado === 'carregando') {
    conteudo = <Carregando oQue={oQue}><div className="lista-esqueleto">{[0, 1, 2].map((i) => <Esqueleto key={i} linhas={1} altura="120px" />)}</div></Carregando>
  } else if (erro) {
    conteudo = <EstadoErro oQue={oQue} aoTentar={() => setTentou(true)} />
  } else if (tipo === 'destaque' && lista.length === 0) {
    conteudo = <EstadoVazio titulo="Nenhum destaque no app ainda." texto="Destaques são as imagens que aparecem no topo do app e do cardápio web, em carrossel, como uma vitrine." acao={novoDestaque} />
  } else if (tipo === 'banner' && listaBanners.length === 0) {
    conteudo = <EstadoVazio titulo="Nenhum banner ainda." texto="O banner abre por cima da home do app quando o cliente entra, como um pop-up, com botão de fechar." acao={novoBanner} />
  } else if (tipo === 'destaque') {
    conteudo = (
      <ol className="destaques__lista">
        {lista.map((d) => (
          <li key={d.id} className="destaques__item">
            <div className="destaques__lugar">
              <span className="destaques__posicao" aria-hidden>{ordinal(d.posicao)}</span>
              <label className="destaques__seletor-posicao">
                <span className="filtro__rotulo">Posição</span>
                <select id={`posicao-${d.id}`} value={d.posicao} onChange={(e) => mudarPosicao(d, Number(e.target.value))} aria-label={`Posição de "${d.titulo}"`}>
                  {lista.map((_, i) => <option key={i} value={i + 1}>{ordinal(i + 1)}</option>)}
                </select>
              </label>
            </div>
            <ArteDestaque titulo={d.titulo} descricao={d.descricao} foto={d.foto} url={d.url} marca={cen.marca.nome} paleta={paleta} />
            <div className="destaques__textos">
              <p className="destaques__titulo">{d.titulo}</p>
              {d.descricao && <p className="texto-secundario">{d.descricao}</p>}
              <p className="texto-secundario"><span className="destaques__numero">{diaMes(d.inicio)} a {diaMes(d.fim)}</span> · {textoLink(d)}</p>
              <Selo tom={ESTADOS[d.estado].tom}>{ESTADOS[d.estado].rotulo}</Selo>
            </div>
            <div className="destaques__acoes">
              <Botao variante="texto" tamanho="p" onClick={() => setFormulario({ destaque: d })} aria-label={`Editar "${d.titulo}"`}>Editar</Botao>
              <Botao variante="texto" tamanho="p" mudaAlgo carregando={mudando === d.id} onClick={() => alternar(d)} aria-label={`${d.estado === 'pausado' ? 'Ativar' : 'Pausar'} "${d.titulo}"`}>
                {d.estado === 'pausado' ? 'Ativar' : 'Pausar'}
              </Botao>
              <Botao variante="texto" tamanho="p" className="cupons__excluir" onClick={() => setExcluir({ tipo: 'destaque', item: d })} aria-label={`Excluir "${d.titulo}"`}>Excluir</Botao>
            </div>
          </li>
        ))}
      </ol>
    )
  } else {
    conteudo = (
      <ul className="destaques__lista">
        {listaBanners.map((b) => (
          <li key={b.id} className="banners__item">
            <ArteBanner titulo={b.titulo} texto={b.texto} rotuloBotao={b.botao.rotulo} foto={b.foto} url={b.url} marca={cen.marca.nome} paleta={paleta} />
            <div className="destaques__textos">
              <p className="destaques__titulo">{b.titulo}</p>
              {b.texto && <p className="texto-secundario">{b.texto}</p>}
              <p className="texto-secundario">
                <span className="destaques__numero">{diaMes(b.inicio)} a {diaMes(b.fim)}</span> · Botão "{b.botao.rotulo}" leva para {ROTULOS_LINK[b.botao.tipo].toLowerCase()}: {b.botao.alvo}
              </p>
              <ul className="banners__fichas" aria-label="Configuração">
                <li className="banners__ficha"><span className="banners__ficha-rotulo">Público</span> {rotuloPublico(b.publico)}</li>
                <li className="banners__ficha"><span className="banners__ficha-rotulo">Frequência</span> {rotuloFrequencia(b.frequencia)}</li>
                <li className="banners__ficha"><span className="banners__ficha-rotulo">Onde</span> {rotuloOnde(b.onde)}</li>
              </ul>
              <Selo tom={ESTADOS[b.estado].tom}>{ESTADOS[b.estado].rotulo}</Selo>
            </div>
            <div className="destaques__acoes">
              <Botao variante="texto" tamanho="p" onClick={() => setFormBanner({ banner: b })} aria-label={`Editar o banner "${b.titulo}"`}>Editar</Botao>
              <Botao variante="texto" tamanho="p" mudaAlgo carregando={mudando === b.id && !ativarComConflito} onClick={() => pedirAtivarBanner(b)} aria-label={`${b.estado === 'pausado' ? 'Ativar' : 'Pausar'} o banner "${b.titulo}"`}>
                {b.estado === 'pausado' ? 'Ativar' : 'Pausar'}
              </Botao>
              <Botao variante="texto" tamanho="p" className="cupons__excluir" onClick={() => setExcluir({ tipo: 'banner', item: b })} aria-label={`Excluir o banner "${b.titulo}"`}>Excluir</Botao>
            </div>
          </li>
        ))}
      </ul>
    )
  }

  const temItens = tipo === 'banner' ? listaBanners.length > 0 : lista.length > 0
  const editado = formulario?.destaque ? lista.find((x) => x.id === formulario.destaque.id) || null : null
  const bannerEditado = formBanner?.banner ? banners.find((x) => x.id === formBanner.banner.id) || null : null
  const conflitoAtivar = ativarComConflito?.conflitos || []
  return (
    <div className={`pagina destaques ${celular ? 'destaques--celular' : ''}`}>
      <CabecalhoPagina
        titulo="Destaques e banners"
        descricao="As artes do restaurante no app e no cardápio web: destaques no topo e banners que abrem por cima da home."
        acoes={temItens && !erro && estadoForcado !== 'carregando' && (tipo === 'banner' ? novoBanner : novoDestaque)}
      />
      <Abas
        comoLinks
        rotulo="Tipo de arte"
        ativa={tipo}
        abas={[
          { id: 'destaque', rotulo: 'Destaques (topo)', para: '/destaques' },
          { id: 'banner', rotulo: 'Banners (pop-up)', para: '/destaques?tipo=banner' },
        ]}
      />
      {faixa}
      {tipo === 'destaque' ? (
        <OndeAparece tipo="destaque" titulo="Onde o destaque aparece">
          No topo da home do app e do cardápio web, como cabeçalho, em carrossel. O cliente vê na ordem das posições: o 1º aparece primeiro e os outros passam em seguida. Arte em 16:7, deitada.
        </OndeAparece>
      ) : (
        <OndeAparece tipo="banner" titulo="Onde o banner aparece">
          Por cima da home, como pop-up, quando o cliente abre o app ou o cardápio web. A home fica esmaecida atrás e o cliente fecha no X. Arte em 4:5, em pé. Só um banner fica ativo por vez em cada público.
        </OndeAparece>
      )}
      <p className="visualmente-oculto" aria-live="polite">{anuncio}</p>
      {conteudo}
      <p className="nota-pe">Em aberto (pergunta 9): os destaques e banners pertencem à marca, ao app ou à loja.</p>

      <FormularioDestaque
        aberto={!!formulario}
        destaque={editado}
        total={editado ? lista.length : lista.length + 1}
        aoFechar={() => setFormulario(null)}
        cardapio={cardapioRef}
        cupons={cupons}
        aoSalvar={salvarDestaque}
      />
      <FormularioBanner
        aberto={!!formBanner}
        banner={bannerEditado}
        banners={banners}
        aoFechar={() => setFormBanner(null)}
        cardapio={cardapioRef}
        cupons={cupons}
        aoSalvar={salvarBanner}
      />
      <Confirmacao
        aberto={!!ativarComConflito}
        aoFechar={() => setAtivarComConflito(null)}
        titulo={conflitoAtivar.length === 1 ? `Pausar "${conflitoAtivar[0].titulo}"?` : 'Pausar os banners anteriores?'}
        texto={ativarComConflito && `Só um banner fica ativo por vez em cada público. ${conflitoAtivar.map((c) => `"${c.titulo}" (${diaMes(c.inicio)} a ${diaMes(c.fim)})`).join(', ')} também é para ${rotuloPublico(ativarComConflito.banner.publico)}, em período que se cruza com "${ativarComConflito.banner.titulo}". Para ativar este, o anterior vai ser pausado.`}
        rotuloConfirmar="Pausar o anterior e ativar"
        carregando={ativando}
        aoConfirmar={() => {
          setAtivando(true)
          alternarBanner(ativarComConflito.banner, ativarComConflito.conflitos)
        }}
      />
      <Confirmacao
        aberto={!!excluir}
        aoFechar={() => setExcluir(null)}
        titulo={`Excluir "${excluir?.item.titulo}"?`}
        texto={excluir?.tipo === 'banner' ? 'O banner deixa de abrir no app e sai da lista.' : 'O destaque sai do app e da lista. Os que estão depois dele sobem uma posição.'}
        rotuloConfirmar={excluir?.tipo === 'banner' ? 'Excluir banner' : 'Excluir destaque'}
        destrutivo
        carregando={excluindo}
        aoConfirmar={confirmarExcluir}
      />
    </div>
  )
}
