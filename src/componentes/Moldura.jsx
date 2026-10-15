// Moldura do dashboard (seções 6 e 7): menu lateral recolhível, cabeçalho, barras do celular.
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Bell, ChevronDown, ChevronsUpDown, Ellipsis, LogOut, PanelLeftClose, PanelLeftOpen, WifiOff } from 'lucide-react'
import { usePrototipo } from '../contexto/Prototipo.jsx'
import { MENU, RODAPE, itemAtivo, itensBarraInferior, menuDoPerfil } from '../dados/menu.js'
import { useEhCelular } from '../utilitarios/ganchos.js'
import { ha, hora, minutosEntre } from '../utilitarios/formatos.js'
import { SeloProposta, Selo } from './base.jsx'
import { estadoCanal } from './ControleLoja.jsx'
import { LogoVoceQpad } from './LogoVoceQpad.jsx'

// ---------- Logo do cliente (monograma fictício, sempre na cor original da marca) ----------
export function LogoMarca({ tamanho = 32 }) {
  const { cen } = usePrototipo()
  return (
    <span className="logo-marca" style={{ width: tamanho, height: tamanho, fontSize: tamanho * 0.4 }} aria-hidden>
      {cen.marca.sigla}
    </span>
  )
}

// ---------- Menu lateral ----------
function ItemMenu({ item, recolhido, caminho }) {
  const ativo = itemAtivo(item, caminho)
  const Icone = item.icone
  return (
    <li>
      <NavLink
        to={item.para}
        className={`menu__link ${ativo ? 'menu__link--ativo' : ''}`}
        aria-current={ativo ? 'page' : undefined}
        data-dica={recolhido ? item.rotulo : undefined}
      >
        <Icone size={18} aria-hidden className="menu__icone" />
        <span className={recolhido ? 'visualmente-oculto' : 'menu__rotulo'}>{item.rotulo}</span>
        {item.proposta && !recolhido && <SeloProposta compacto />}
        {item.proposta && recolhido && <span className="visualmente-oculto"> (proposta de migração)</span>}
      </NavLink>
    </li>
  )
}

function GrupoMenu({ grupo, recolhido, caminho }) {
  const contemAtivo = grupo.itens.some((i) => itemAtivo(i, caminho))
  const [aberto, setAberto] = useState(contemAtivo)
  useEffect(() => {
    if (contemAtivo) setAberto(true)
  }, [contemAtivo])
  if (recolhido) {
    return (
      <li className="menu__grupo menu__grupo--recolhido">
        <span className="visualmente-oculto">{grupo.rotulo}</span>
        <ul>{grupo.itens.map((i) => <ItemMenu key={i.id} item={i} recolhido caminho={caminho} />)}</ul>
      </li>
    )
  }
  const id = `grupo-${grupo.grupo}`
  return (
    <li className={`menu__grupo ${contemAtivo ? 'menu__grupo--contem-ativo' : ''}`}>
      <button type="button" className="menu__grupo-botao" aria-expanded={aberto} aria-controls={id} onClick={() => setAberto((a) => !a)}>
        <span>{grupo.rotulo}</span>
        <ChevronDown size={16} aria-hidden className={aberto ? 'gira-180' : ''} />
      </button>
      {aberto && (
        <ul id={id}>
          {grupo.itens.map((i) => <ItemMenu key={i.id} item={i} caminho={caminho} />)}
        </ul>
      )}
    </li>
  )
}

function GatilhoSeletor({ recolhido }) {
  const { temSeletor, nomeContexto, abrir, emRede, lojasVisiveis } = usePrototipo()
  if (!temSeletor) return null
  return (
    <button
      type="button"
      className={`gatilho-seletor ${recolhido ? 'gatilho-seletor--recolhido' : ''}`}
      onClick={() => abrir('seletor')}
      data-dica={recolhido ? `Trocar de loja (${nomeContexto})` : undefined}
      aria-label={`Loja em uso: ${nomeContexto}. Trocar de loja`}
    >
      {!recolhido && (
        <span className="gatilho-seletor__textos">
          <span className="gatilho-seletor__rotulo">{emRede ? `${lojasVisiveis.length} lojas` : 'Loja em uso'}</span>
          <span className="gatilho-seletor__nome">{nomeContexto}</span>
        </span>
      )}
      <ChevronsUpDown size={16} aria-hidden />
    </button>
  )
}

function MenuLateral() {
  const { pode } = usePrototipo()
  const { pathname } = useLocation()
  const [recolhido, setRecolhido] = useState(() => {
    try {
      return localStorage.getItem('vqp-menu-recolhido') === '1'
    } catch {
      return false
    }
  })
  const alternar = () => {
    setRecolhido((r) => {
      try {
        localStorage.setItem('vqp-menu-recolhido', r ? '0' : '1')
      } catch {
        /* sem armazenamento: só não lembra a preferência */
      }
      return !r
    })
  }
  const menu = menuDoPerfil(pode)
  const rodape = RODAPE.filter((r) => pode(r.permissao))
  return (
    <nav className={`menu-lateral ${recolhido ? 'menu-lateral--recolhido' : ''}`} aria-label="Menu principal">
      <div className="menu-lateral__marca">
        <LogoVoceQpad tamanho={recolhido ? 28 : 24} soSimbolo={recolhido} />
      </div>
      <GatilhoSeletor recolhido={recolhido} />
      <ul className="menu">
        {menu.map((m) => (m.grupo ? <GrupoMenu key={m.grupo} grupo={m} recolhido={recolhido} caminho={pathname} /> : <ItemMenu key={m.id} item={m} recolhido={recolhido} caminho={pathname} />))}
      </ul>
      <ul className="menu menu--rodape">
        {rodape.map((r) => <ItemMenu key={r.id} item={r} recolhido={recolhido} caminho={pathname} />)}
        <li>
          <button type="button" className="menu__link menu__recolher" onClick={alternar} aria-expanded={!recolhido} data-dica={recolhido ? 'Expandir menu' : undefined}>
            {recolhido ? <PanelLeftOpen size={18} aria-hidden className="menu__icone" /> : <PanelLeftClose size={18} aria-hidden className="menu__icone" />}
            <span className={recolhido ? 'visualmente-oculto' : 'menu__rotulo'}>{recolhido ? 'Expandir menu' : 'Recolher menu'}</span>
          </button>
        </li>
      </ul>
    </nav>
  )
}

// ---------- Status da loja no cabeçalho ----------
const PLURAL_ESTADO = { Aberto: 'Abertos', Fechado: 'Fechados' }
function StatusCabecalho() {
  const { loja, estadoLoja, emRede, lojasVisiveis, abrir, statusVerificadoEm, agora, estadoForcado } = usePrototipo()
  if (emRede) {
    return <p className="cabecalho__rede">Toda a rede · {lojasVisiveis.length} lojas</p>
  }
  if (!loja) return null
  const erro = estadoForcado === 'erro'
  const d = estadoCanal(estadoLoja, 'delivery')
  const b = estadoCanal(estadoLoja, 'balcao')
  return (
    <button type="button" className="status-loja" onClick={() => abrir('controle')} aria-label={`Status da loja: Delivery ${erro ? 'desconhecido' : d.texto}, Balcão ${erro ? 'desconhecido' : b.texto}. Abrir controle de abrir e fechar`}>
      {erro ? (
        <span className="status-loja__erro">Status indisponível</span>
      ) : d.texto === b.texto ? (
        // iguais: um selo só para os dois canais
        <span className="status-loja__canal">Delivery e Balcão <Selo tom={d.tom}>{PLURAL_ESTADO[d.texto] || d.texto}</Selo></span>
      ) : (
        <>
          <span className="status-loja__canal">Delivery <Selo tom={d.tom}>{d.texto}</Selo></span>
          <span className="status-loja__canal">Balcão <Selo tom={b.tom}>{b.texto}</Selo></span>
        </>
      )}
      <span className="status-loja__hora">atualizado {ha(minutosEntre(statusVerificadoEm, agora))}</span>
    </button>
  )
}

function BotaoSino({ celular }) {
  const { naoLidos, abrir } = usePrototipo()
  return (
    <button
      type="button"
      className={`sino ${celular ? 'sino--celular' : ''}`}
      onClick={() => abrir('alertas')}
      aria-label={naoLidos ? `Alertas: ${naoLidos} não lidos` : 'Alertas'}
    >
      <Bell size={20} aria-hidden />
      {naoLidos > 0 && <span className="sino__contador" aria-hidden>{naoLidos}</span>}
    </button>
  )
}

function MenuConta() {
  const [aberto, setAberto] = useState(false)
  const caixa = useRef(null)
  const navegar = useNavigate()
  const { cen } = usePrototipo()
  useEffect(() => {
    if (!aberto) return
    const fora = (e) => caixa.current && !caixa.current.contains(e.target) && setAberto(false)
    const esc = (e) => e.key === 'Escape' && setAberto(false)
    document.addEventListener('mousedown', fora)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', fora)
      document.removeEventListener('keydown', esc)
    }
  }, [aberto])
  return (
    <div className="menu-conta" ref={caixa}>
      <button type="button" className="menu-conta__botao" aria-expanded={aberto} aria-controls="menu-conta-lista" onClick={() => setAberto((a) => !a)}>
        <span className="menu-conta__iniciais" aria-hidden>LM</span>
        <span className="visualmente-oculto">Conta de Luana Martins</span>
        <ChevronDown size={16} aria-hidden />
      </button>
      {aberto && (
        <div id="menu-conta-lista" className="menu-conta__lista">
          <p className="menu-conta__quem">
            <strong>Luana Martins</strong>
            <span>luana@{cen.id === 'rede' ? 'fornodepedra' : 'bomrecheio'}.exemplo</span>
          </p>
          <Link to="/conta" onClick={() => setAberto(false)}>Conta</Link>
          <Link to="/ajuda" onClick={() => setAberto(false)}>Ajuda</Link>
          <button type="button" onClick={() => navegar('/entrar')}>
            <LogOut size={16} aria-hidden /> Sair
          </button>
        </div>
      )}
    </div>
  )
}

function Cabecalho() {
  const { cen } = usePrototipo()
  return (
    <header className="cabecalho">
      <div className="cabecalho__marca">
        <LogoMarca />
        <span className="cabecalho__nome">{cen.marca.nome}</span>
      </div>
      <div className="cabecalho__centro">
        <StatusCabecalho />
      </div>
      <div className="cabecalho__direita">
        <BotaoSino />
        <MenuConta />
      </div>
    </header>
  )
}

// ---------- Celular ----------
export function seloResumoLoja(e, erro) {
  if (erro || !e) return { texto: 'Status indisponível', tom: 'cinza' }
  if (e.conexao === 'sem') return { texto: 'Sem conexão', tom: 'vermelho' }
  const d = e.delivery === 'aberto'
  const b = e.balcao === 'aberto'
  if (d && b) return { texto: 'Aberta', tom: 'verde' }
  if (!d && !b) return { texto: 'Fechada', tom: 'cinza' }
  return { texto: d ? 'Só delivery' : 'Só balcão', tom: 'ambar' }
}

function BarraSuperiorCelular() {
  const { nomeContexto, temSeletor, abrir, emRede, estadoLoja, estadoForcado, lojasVisiveis } = usePrototipo()
  const s = seloResumoLoja(estadoLoja, estadoForcado === 'erro')
  return (
    <header className="barra-superior">
      {temSeletor ? (
        <button type="button" className="barra-superior__loja" onClick={() => abrir('seletor')} aria-label={`Loja em uso: ${nomeContexto}. Trocar de loja`}>
          <span className="barra-superior__nome">{nomeContexto}</span>
          <ChevronsUpDown size={16} aria-hidden />
        </button>
      ) : (
        <span className="barra-superior__loja">
          <span className="barra-superior__nome">{nomeContexto}</span>
        </span>
      )}
      {emRede ? (
        <span className="barra-superior__rede">{lojasVisiveis.length} lojas</span>
      ) : (
        <button type="button" className="barra-superior__status" onClick={() => abrir('controle')} aria-label={`Loja ${s.texto}. Abrir controle de abrir e fechar`}>
          <Selo tom={s.tom}>{s.texto}</Selo>
        </button>
      )}
      <BotaoSino celular />
    </header>
  )
}

function BarraInferior() {
  const { pode } = usePrototipo()
  const { pathname } = useLocation()
  const itens = itensBarraInferior(menuDoPerfil(pode))
  const emMais = pathname === '/mais' || !itens.some((i) => itemAtivo(i, pathname))
  return (
    <nav className="barra-inferior" aria-label="Navegação principal">
      {itens.map((i) => {
        const Icone = i.icone
        const ativo = itemAtivo(i, pathname)
        return (
          <Link key={i.id} to={i.para} className={`barra-inferior__item ${ativo ? 'barra-inferior__item--ativo' : ''}`} aria-current={ativo ? 'page' : undefined}>
            <Icone size={22} aria-hidden />
            <span>{i.rotulo}</span>
          </Link>
        )
      })}
      <Link to="/mais" className={`barra-inferior__item ${emMais ? 'barra-inferior__item--ativo' : ''}`} aria-current={pathname === '/mais' ? 'page' : undefined}>
        <Ellipsis size={22} aria-hidden />
        <span>Mais</span>
      </Link>
    </nav>
  )
}

// "Mais" no celular: o menu completo com os mesmos grupos; Sair em Conta, longe de abrir e fechar
export function TelaMais() {
  const { pode } = usePrototipo()
  const navegar = useNavigate()
  const menu = menuDoPerfil(pode)
  const barra = itensBarraInferior(menu).map((i) => i.id)
  const restante = menu
    .map((m) => (m.grupo ? m : barra.includes(m.id) ? null : m))
    .filter(Boolean)
  const rodape = RODAPE.filter((r) => pode(r.permissao))
  const linha = (i) => {
    const Icone = i.icone
    return (
      <li key={i.id}>
        <Link to={i.para} className="mais__link">
          <Icone size={20} aria-hidden />
          <span>{i.rotulo}</span>
          {i.proposta && <SeloProposta compacto />}
        </Link>
      </li>
    )
  }
  return (
    <div className="pagina pagina--mais">
      <h1 className="visualmente-oculto">Mais</h1>
      {restante.filter((m) => !m.grupo).length > 0 && <ul className="mais__lista">{restante.filter((m) => !m.grupo).map(linha)}</ul>}
      {restante
        .filter((m) => m.grupo)
        .map((g) => (
          <section key={g.grupo} className="mais__grupo" aria-labelledby={`mais-${g.grupo}`}>
            <h2 id={`mais-${g.grupo}`}>{g.rotulo}</h2>
            <ul className="mais__lista">{g.itens.map(linha)}</ul>
          </section>
        ))}
      <section className="mais__grupo" aria-labelledby="mais-conta">
        <h2 id="mais-conta">Conta e ajuda</h2>
        <ul className="mais__lista">
          {rodape.map(linha)}
          <li>
            <button type="button" className="mais__link mais__sair" onClick={() => navegar('/entrar')}>
              <LogOut size={20} aria-hidden />
              <span>Sair</span>
            </button>
          </li>
        </ul>
      </section>
      <p className="mais__assinatura"><LogoVoceQpad tamanho={20} sobreEscuro={false} /></p>
    </div>
  )
}

// ---------- Moldura ----------
export function Moldura() {
  const celular = useEhCelular()
  const { temSeletor, abrir, sobreposicao } = usePrototipo()
  const { pathname } = useLocation()
  const principal = useRef(null)

  // Atalho "/" abre o seletor de loja
  useEffect(() => {
    if (!temSeletor) return
    const tecla = (e) => {
      const alvo = e.target
      const digitando = alvo.closest?.('input, textarea, select, [contenteditable="true"]')
      if (e.key === '/' && !digitando && !sobreposicao) {
        e.preventDefault()
        abrir('seletor')
      }
    }
    document.addEventListener('keydown', tecla)
    return () => document.removeEventListener('keydown', tecla)
  }, [temSeletor, abrir, sobreposicao])

  // Rolagem ao topo ao trocar de tela (painel de pedido mantém a lista)
  useEffect(() => {
    if (!pathname.startsWith('/pedidos/')) window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className={`moldura ${celular ? 'moldura--celular' : ''}`}>
      <a href="#conteudo" className="pular" onClick={(e) => { e.preventDefault(); principal.current?.focus() }}>
        Pular para o conteúdo
      </a>
      {celular && <BarraSuperiorCelular />}
      <div className="moldura__corpo">
        {!celular && <MenuLateral />}
        <div className="moldura__coluna">
          {!celular && <Cabecalho />}
          <main id="conteudo" ref={principal} tabIndex={-1} className="moldura__principal">
            <Outlet />
          </main>
        </div>
      </div>
      {celular && <BarraInferior />}
    </div>
  )
}

export function FaixaSemInternet() {
  const { semInternet } = usePrototipo()
  if (!semInternet) return null
  return (
    <div className="faixa-global" role="status">
      <WifiOff size={16} aria-hidden /> Sem internet. Os dados podem estar desatualizados.
    </div>
  )
}

export { MENU, hora }
