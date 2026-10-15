// Componentes base da seção 9: botão, selo, interruptor, campo, sobreposições,
// abas, avisos e os estados padrão (vazio, erro, indisponível, carregando).
import { forwardRef, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Check, Loader2, X } from 'lucide-react'
import { usePrototipo } from '../contexto/Prototipo.jsx'
import { useDemorando } from '../utilitarios/ganchos.js'

// ---------- Botão ----------
export const Botao = forwardRef(function Botao(
  { variante = 'secundario', tamanho, carregando, icone: Icone, children, className = '', para, mudaAlgo, disabled, ...resto },
  ref,
) {
  const { podeAgir } = usePrototipo()
  const bloqueado = disabled || carregando || (mudaAlgo && !podeAgir)
  const classes = `botao botao--${variante} ${tamanho ? `botao--${tamanho}` : ''} ${className}`
  const conteudo = (
    <>
      {carregando ? <Loader2 className="girando" size={16} aria-hidden /> : Icone ? <Icone size={16} aria-hidden /> : null}
      {children && <span>{children}</span>}
    </>
  )
  if (para) {
    return (
      <Link ref={ref} to={para} className={classes} {...resto}>
        {conteudo}
      </Link>
    )
  }
  return (
    <button
      ref={ref}
      type="button"
      className={classes}
      disabled={bloqueado}
      aria-busy={carregando || undefined}
      title={mudaAlgo && !podeAgir ? 'Indisponível sem internet' : undefined}
      {...resto}
    >
      {conteudo}
    </button>
  )
})

// ---------- Selo de status: sempre texto e cor ----------
export function Selo({ tom = 'cinza', children, ponto = true, className = '' }) {
  return (
    <span className={`selo selo--${tom} ${className}`}>
      {ponto && <span className="selo__ponto" aria-hidden />}
      {children}
    </span>
  )
}

export function SeloProposta({ compacto }) {
  return <span className={`selo-proposta ${compacto ? 'selo-proposta--compacto' : ''}`}>Proposta</span>
}

// ---------- Interruptor com nome do que controla ----------
export function Interruptor({ ligado, aoMudar, rotulo, rotuloVisivel, grande, disabled }) {
  const id = useId()
  return (
    <span className={`interruptor ${grande ? 'interruptor--grande' : ''}`}>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={ligado}
        aria-label={rotuloVisivel ? undefined : rotulo}
        className="interruptor__trilho"
        onClick={() => aoMudar(!ligado)}
        disabled={disabled}
      >
        <span className="interruptor__botao" />
      </button>
      {rotuloVisivel && <label htmlFor={id}>{rotuloVisivel}</label>}
    </span>
  )
}

// ---------- Campo com rótulo sempre visível ----------
export function Campo({ rotulo, erro, ajuda, children, id: idExterno }) {
  const idGerado = useId()
  const id = idExterno || idGerado
  const idAjuda = `${id}-ajuda`
  const idErro = `${id}-erro`
  const filho = typeof children === 'function'
    ? children({ id, 'aria-describedby': [ajuda && idAjuda, erro && idErro].filter(Boolean).join(' ') || undefined, 'aria-invalid': erro ? true : undefined })
    : children
  return (
    <div className={`campo ${erro ? 'campo--erro' : ''}`}>
      <label htmlFor={id} className="campo__rotulo">{rotulo}</label>
      {filho}
      {ajuda && <p id={idAjuda} className="campo__ajuda">{ajuda}</p>}
      {erro && (
        <p id={idErro} className="campo__erro">
          <AlertTriangle size={14} aria-hidden /> {erro}
        </p>
      )}
    </div>
  )
}

// ---------- Sobreposição: painel lateral, modal, folha de baixo ou tela cheia ----------
// Título ligado (aria-labelledby), botão Fechar com nome, foco preso e devolvido a quem abriu.
const SELETOR_FOCAVEL = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function Sobreposicao({ aberto, aoFechar, titulo, subtitulo, forma = 'lateral', largura, children, rodape, focoInicial, voltar, rotuloFechar = 'Fechar', semCabecalho, className = '' }) {
  const idTitulo = useId()
  const caixa = useRef(null)
  const quemAbriu = useRef(null)

  useLayoutEffect(() => {
    if (!aberto) return
    quemAbriu.current = document.activeElement
    const alvo = focoInicial?.current || caixa.current?.querySelector('[data-foco-inicial]') || caixa.current?.querySelector(SELETOR_FOCAVEL)
    alvo?.focus()
    document.body.classList.add('sem-rolagem')
    return () => {
      document.body.classList.remove('sem-rolagem')
      const volta = quemAbriu.current
      // devolve o foco a quem abriu, se ainda existir na página
      setTimeout(() => volta && document.contains(volta) && volta.focus(), 0)
    }
  }, [aberto]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!aberto) return
    const tecla = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        aoFechar()
      }
      if (e.key === 'Tab' && caixa.current) {
        const f = [...caixa.current.querySelectorAll(SELETOR_FOCAVEL)].filter((el) => el.offsetParent !== null)
        if (!f.length) return
        const primeiro = f[0]
        const ultimo = f[f.length - 1]
        if (e.shiftKey && document.activeElement === primeiro) {
          e.preventDefault()
          ultimo.focus()
        } else if (!e.shiftKey && document.activeElement === ultimo) {
          e.preventDefault()
          primeiro.focus()
        }
      }
    }
    document.addEventListener('keydown', tecla)
    return () => document.removeEventListener('keydown', tecla)
  }, [aberto, aoFechar])

  if (!aberto) return null
  return createPortal(
    <div className={`sobreposicao sobreposicao--${forma}`} onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}>
      <div
        ref={caixa}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        className={`sobreposicao__caixa ${className}`}
        style={largura ? { '--largura': largura } : undefined}
      >
        {forma === 'folha' && <span className="sobreposicao__alca" aria-hidden />}
        <header className={`sobreposicao__cabecalho ${semCabecalho ? 'visualmente-oculto' : ''}`}>
          {voltar && (
            <button type="button" className="botao botao--texto botao--icone" onClick={aoFechar} aria-label={voltar}>
              <ArrowLeft size={20} aria-hidden />
            </button>
          )}
          <div className="sobreposicao__titulos">
            <h2 id={idTitulo}>{titulo}</h2>
            {subtitulo && <p>{subtitulo}</p>}
          </div>
          {!voltar && (
            <button type="button" className="botao botao--texto botao--icone" onClick={aoFechar} aria-label={rotuloFechar}>
              <X size={20} aria-hidden />
            </button>
          )}
        </header>
        <div className="sobreposicao__corpo">{children}</div>
        {rodape && <footer className="sobreposicao__rodape">{rodape}</footer>}
      </div>
    </div>,
    document.body,
  )
}

// ---------- Confirmação ----------
// exigeConexao=false para confirmações que não mudam dados (ex.: sair sem salvar)
export function Confirmacao({ aberto, aoFechar, titulo, texto, rotuloConfirmar, aoConfirmar, destrutivo, carregando, exigeConexao = true }) {
  const cancelar = useRef(null)
  return (
    <Sobreposicao
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={titulo}
      forma="modal"
      largura="440px"
      focoInicial={cancelar}
      rodape={
        <>
          <Botao ref={cancelar} onClick={aoFechar}>Cancelar</Botao>
          <Botao variante={destrutivo ? 'destrutivo' : 'principal'} onClick={aoConfirmar} carregando={carregando} mudaAlgo={exigeConexao}>
            {rotuloConfirmar}
          </Botao>
        </>
      }
    >
      <p className="texto-corpo">{texto}</p>
    </Sobreposicao>
  )
}

// ---------- Abas ----------
export function Abas({ abas, ativa, aoMudar, rotulo, comoLinks }) {
  const refs = useRef([])
  const tecla = (e, i) => {
    let n = null
    if (e.key === 'ArrowRight') n = (i + 1) % abas.length
    if (e.key === 'ArrowLeft') n = (i - 1 + abas.length) % abas.length
    if (n !== null) {
      e.preventDefault()
      refs.current[n]?.focus()
      if (!comoLinks) aoMudar(abas[n].id)
    }
  }
  if (comoLinks) {
    return (
      <nav className="abas" aria-label={rotulo}>
        {abas.map((a, i) => (
          <Link
            key={a.id}
            ref={(el) => (refs.current[i] = el)}
            to={a.para}
            className={`abas__aba ${a.id === ativa ? 'abas__aba--ativa' : ''}`}
            aria-current={a.id === ativa ? 'page' : undefined}
            onKeyDown={(e) => tecla(e, i)}
          >
            {a.rotulo}
          </Link>
        ))}
      </nav>
    )
  }
  return (
    <div className="abas" role="tablist" aria-label={rotulo}>
      {abas.map((a, i) => (
        <button
          key={a.id}
          ref={(el) => (refs.current[i] = el)}
          type="button"
          role="tab"
          aria-selected={a.id === ativa}
          tabIndex={a.id === ativa ? 0 : -1}
          className={`abas__aba ${a.id === ativa ? 'abas__aba--ativa' : ''}`}
          onClick={() => aoMudar(a.id)}
          onKeyDown={(e) => tecla(e, i)}
        >
          {a.rotulo}
          {a.contagem != null && <span className="abas__contagem">{a.contagem}</span>}
        </button>
      ))}
    </div>
  )
}

// ---------- Estados padrão (seção 7) ----------
export function EstadoVazio({ titulo, texto, acao, compacto }) {
  return (
    <div className={`estado estado--vazio ${compacto ? 'estado--compacto' : ''}`} role="status">
      <p className="estado__titulo">{titulo}</p>
      {texto && <p className="estado__texto">{texto}</p>}
      {acao && <div className="estado__acoes">{acao}</div>}
    </div>
  )
}

export function EstadoErro({ oQue, aoTentar, compacto }) {
  const [tentando, setTentando] = useState(false)
  return (
    <div className={`estado estado--erro ${compacto ? 'estado--compacto' : ''}`} role="alert">
      <p className="estado__titulo">
        <AlertTriangle size={18} aria-hidden /> Não foi possível carregar {oQue}.
      </p>
      <div className="estado__acoes">
        <Botao
          carregando={tentando}
          onClick={() => {
            setTentando(true)
            setTimeout(() => {
              setTentando(false)
              aoTentar?.()
            }, 900)
          }}
        >
          Tentar de novo
        </Botao>
      </div>
    </div>
  )
}

// Ocupa o mesmo espaço do número e diz o motivo
export function Indisponivel({ motivo = 'Este número ainda não é medido.' }) {
  return (
    <span className="indisponivel">
      <span className="indisponivel__rotulo">Indisponível</span>
      <span className="indisponivel__motivo">{motivo}</span>
    </span>
  )
}

export function Esqueleto({ linhas = 3, altura, className = '' }) {
  return (
    <span className={`esqueleto-grupo ${className}`} aria-hidden>
      {Array.from({ length: linhas }, (_, i) => (
        <span key={i} className="esqueleto" style={{ height: altura, width: i === linhas - 1 && linhas > 1 ? '60%' : undefined }} />
      ))}
    </span>
  )
}

// Rótulo acessível + frase de demora depois de 8 s
export function Carregando({ oQue = 'os dados', children }) {
  const demorando = useDemorando(true)
  return (
    <div className="carregando" role="status" aria-live="polite">
      <span className="visualmente-oculto">Carregando {oQue}.</span>
      {children}
      {demorando && <p className="carregando__demora">Está demorando mais que o normal.</p>}
    </div>
  )
}

// ---------- Avisos ----------
export function FaixaAviso({ tom = 'info', children, acao, icone: Icone }) {
  return (
    <div className={`faixa faixa--${tom}`} role={tom === 'erro' ? 'alert' : 'status'}>
      {Icone && <Icone size={18} aria-hidden className="faixa__icone" />}
      <div className="faixa__texto">{children}</div>
      {acao && <div className="faixa__acao">{acao}</div>}
    </div>
  )
}

export function AvisosTemporarios() {
  const { avisos } = usePrototipo()
  return (
    <div className="avisos" aria-live="polite" role="status">
      {avisos.map((a) => (
        <div key={a.id} className={`aviso aviso--${a.tom}`}>
          {a.tom === 'sucesso' ? <Check size={16} aria-hidden /> : a.tom === 'erro' ? <AlertTriangle size={16} aria-hidden /> : null}
          {a.texto}
        </div>
      ))}
    </div>
  )
}

// Cabeçalho de página com um h1 por tela
export function CabecalhoPagina({ titulo, descricao, acoes, children }) {
  return (
    <div className="pagina__cabecalho">
      <div className="pagina__titulos">
        <h1>{titulo}</h1>
        {descricao && <p className="pagina__descricao">{descricao}</p>}
        {children}
      </div>
      {acoes && <div className="pagina__acoes">{acoes}</div>}
    </div>
  )
}

// Menu suspenso ancorado (usado no Pausar do computador)
export function MenuSuspenso({ aberto, ancora, aoFechar, titulo, children }) {
  const caixa = useRef(null)
  const idTitulo = useId()
  const [pos, setPos] = useState(null)
  useLayoutEffect(() => {
    if (!aberto || !ancora) return
    const r = ancora.getBoundingClientRect()
    const largura = 320
    const esquerda = Math.min(window.innerWidth - largura - 16, Math.max(16, r.right - largura))
    const cabeAbaixo = r.bottom + 300 < window.innerHeight
    setPos({ left: esquerda, top: cabeAbaixo ? r.bottom + 6 : undefined, bottom: cabeAbaixo ? undefined : window.innerHeight - r.top + 6 })
  }, [aberto, ancora])
  useEffect(() => {
    if (!aberto) return
    const quem = document.activeElement
    setTimeout(() => caixa.current?.querySelector(SELETOR_FOCAVEL)?.focus(), 0)
    const tecla = (e) => e.key === 'Escape' && aoFechar()
    const clique = (e) => caixa.current && !caixa.current.contains(e.target) && !ancora?.contains(e.target) && aoFechar()
    document.addEventListener('keydown', tecla)
    document.addEventListener('mousedown', clique)
    return () => {
      document.removeEventListener('keydown', tecla)
      document.removeEventListener('mousedown', clique)
      setTimeout(() => quem && document.contains(quem) && quem.focus(), 0)
    }
  }, [aberto]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!aberto || !pos) return null
  return createPortal(
    <div ref={caixa} className="menu-suspenso" role="dialog" aria-labelledby={idTitulo} style={pos}>
      <p id={idTitulo} className="menu-suspenso__titulo">{titulo}</p>
      {children}
    </div>,
    document.body,
  )
}
