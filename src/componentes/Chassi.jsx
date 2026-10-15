// Chassi do protótipo (seção 10): barra fora do produto, no topo. No celular, recolhida num botão.
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { BookText, SlidersHorizontal } from 'lucide-react'
import { usePrototipo } from '../contexto/Prototipo.jsx'
import { CENARIOS, PERFIS } from '../dados/cenarios.js'
import { ESTADOS_GLOBAIS, TELAS, telaPorCodigo } from '../dados/telas.js'
import { useEhCelular } from '../utilitarios/ganchos.js'
import { Sobreposicao } from './base.jsx'

const ESTADOS = [
  ['normal', 'Normal'],
  ['carregando', 'Carregando'],
  ['vazio', 'Vazio'],
  ['indisponivel', 'Indisponível'],
  ['erro', 'Erro'],
  ['sem-permissao', 'Sem permissão'],
]

export function codigoDaRota(caminho, emRede, sobreposicao) {
  if (sobreposicao?.tipo === 'seletor') return 'T02'
  if (sobreposicao?.tipo === 'alertas') return 'T05'
  const regras = [
    [/^\/entrar/, 'T01'], [/^\/inicio/, emRede ? 'T04' : 'T03'], [/^\/pedidos\/\d+/, 'T07'], [/^\/pedidos/, 'T06'],
    [/^\/cardapio\/produto/, 'T09'], [/^\/cardapio\/organizar/, 'T11'], [/^\/cardapio\/copiar/, 'T12'], [/^\/cardapio/, 'T08'],
    [/^\/clientes\/.+/, 'T14'], [/^\/clientes/, 'T13'], [/^\/campanhas\/nova/, 'T16'], [/^\/campanhas\/automacoes/, 'T17'],
    [/^\/campanhas/, 'T15'], [/^\/fidelidade\/regras/, 'T19'], [/^\/fidelidade/, 'T18'], [/^\/cupons\/novo/, 'T21'],
    [/^\/cupons/, 'T20'], [/^\/destaques/, 'T22'], [/^\/promocoes-automaticas/, 'T35'], [/^\/analise/, 'T23'], [/^\/funil/, 'T24'], [/^\/relatorios/, 'T25'],
    [/^\/minha-loja\/funcionamento/, 'T26'], [/^\/minha-loja\/entrega/, 'T27'], [/^\/minha-loja\/modalidades/, 'T28'],
    [/^\/minha-loja\/pagamentos/, 'T29'], [/^\/minha-loja\/dados/, 'T30'], [/^\/minha-loja\/integracoes/, 'T31'],
    [/^\/minha-loja\/rastreamento/, 'T32'], [/^\/(conta|ajuda)/, 'T33'], [/^\/estado/, 'T34'],
  ]
  return regras.find(([r]) => r.test(caminho))?.[1] || null
}

function Controles({ aoNavegar }) {
  const p = usePrototipo()
  const navegar = useNavigate()
  const { pathname } = useLocation()
  const codigo = codigoDaRota(pathname, p.emRede, p.sobreposicao)
  const valorTela = pathname.startsWith('/estado/') ? `estado:${pathname.split('/')[2]}` : codigo || ''

  const irPara = (v) => {
    p.fechar()
    if (v.startsWith('estado:')) navegar(`/estado/${v.split(':')[1]}`)
    else {
      const t = telaPorCodigo(v)
      if (t.codigo === 'T04') {
        if (p.temSeletor) p.trocarLoja('rede')
        navegar('/inicio')
      } else if (t.sobreposicao === 'seletor') {
        navegar('/inicio')
        setTimeout(() => p.abrir('seletor'), 50)
      } else if (t.sobreposicao === 'alertas') {
        navegar('/inicio')
        setTimeout(() => p.abrir('alertas'), 50)
      } else if (t.sobreposicao === 'pausar') {
        navegar('/cardapio')
      } else navegar(t.rota)
    }
    aoNavegar?.()
  }


  return (
    <div className="chassi__controles">
      <label className="chassi__campo chassi__campo--tela">
        <span>Tela</span>
        <select value={valorTela} onChange={(e) => irPara(e.target.value)}>
          {!valorTela && <option value="">Mais (menu do celular)</option>}
          <optgroup label="Camada 1: núcleo">
            {TELAS.filter((t) => t.camada === 1 && t.codigo !== 'T34').map((t) => <option key={t.codigo} value={t.codigo}>{t.codigo} · {t.titulo}</option>)}
          </optgroup>
          <optgroup label="T34 · Estados globais">
            {ESTADOS_GLOBAIS.map((e) => <option key={e.id} value={`estado:${e.id}`}>T34 · {e.titulo}</option>)}
          </optgroup>
          <optgroup label="Camada 2: funcional e simples">
            {TELAS.filter((t) => t.camada === 2).map((t) => <option key={t.codigo} value={t.codigo}>{t.codigo} · {t.titulo}{t.migracao === 'total' ? ' (proposta)' : ''}</option>)}
          </optgroup>
        </select>
      </label>
      <label className="chassi__campo">
        <span>Cenário</span>
        <select value={p.cenarioId} onChange={(e) => p.setCenarioId(e.target.value)}>
          {Object.entries(CENARIOS).map(([id, c]) => <option key={id} value={id}>{c.nome}</option>)}
        </select>
      </label>
      <label className="chassi__campo">
        <span>Perfil</span>
        <select value={p.perfil} onChange={(e) => p.setPerfil(e.target.value)}>
          {Object.entries(PERFIS).map(([id, c]) => <option key={id} value={id}>{c.nome}</option>)}
        </select>
      </label>
      <label className="chassi__campo">
        <span>Estado forçado</span>
        <select value={p.estadoForcado} onChange={(e) => p.setEstadoForcado(e.target.value)}>
          {ESTADOS.map(([id, n]) => <option key={id} value={id}>{n}</option>)}
        </select>
      </label>
      <label className="chassi__marcar">
        <input type="checkbox" checked={p.simularFalha} onChange={(e) => p.setSimularFalha(e.target.checked)} />
        Ações falham
      </label>
      <label className="chassi__marcar">
        <input type="checkbox" checked={p.semInternetForcado} onChange={(e) => p.setSemInternetForcado(e.target.checked)} />
        Sem internet
      </label>
    </div>
  )
}

function Regras({ aberto, aoFechar }) {
  const p = usePrototipo()
  const { pathname } = useLocation()
  const celular = useEhCelular()
  const codigo = codigoDaRota(pathname, p.emRede, p.sobreposicao) || 'T34'
  const tela = telaPorCodigo(codigo)
  return (
    <Sobreposicao aberto={aberto} aoFechar={aoFechar} titulo={`Regras desta tela · ${tela.codigo}`} subtitulo={`${tela.titulo} · camada ${tela.camada}`} forma={celular ? 'cheia' : 'lateral'} largura="460px" voltar={celular ? 'Fechar regras' : undefined} className="regras">
      <p className="regras__objetivo"><strong>Objetivo:</strong> {tela.objetivo}</p>
      {tela.migracao && (
        <p className="regras__migracao">
          {tela.migracao === 'total' ? 'Tela inteira é proposta de migração do Portal Administrativo.' : `Partes em proposta de migração: ${tela.partesMigracao.join(', ')}.`} Escopo a decidir em 26/10.
        </p>
      )}
      <h3>{tela.regras ? 'Decisões aplicadas' : 'O que a tela cobre'}</h3>
      <ul className="regras__lista">{(tela.regras || tela.conteudo).map((r) => <li key={r}>{r}</li>)}</ul>
      <h3>Como usar o chassi</h3>
      <ul className="regras__lista">
        <li>"Estado forçado" muda os blocos das telas da camada 1 para carregando, vazio, indisponível, erro ou sem permissão.</li>
        <li>"Ações falham" faz abrir, fechar, pausar e estornar darem erro, para ver a reversão.</li>
        <li>"Sem internet" mostra a faixa global e desabilita as ações que mudam algo.</li>
        <li>No celular, tudo isto fica no botão "Protótipo".</li>
      </ul>
    </Sobreposicao>
  )
}

export function Chassi() {
  const celular = useEhCelular()
  const [aberto, setAberto] = useState(false)
  const [regras, setRegras] = useState(false)
  if (celular) {
    return (
      <div className="chassi chassi--celular">
        <button type="button" className="chassi__botao" onClick={() => setAberto(true)} aria-haspopup="dialog">
          <SlidersHorizontal size={16} aria-hidden /> Protótipo
        </button>
        <button type="button" className="chassi__botao" onClick={() => setRegras(true)}>
          <BookText size={16} aria-hidden /> Regras desta tela
        </button>
        <Sobreposicao aberto={aberto} aoFechar={() => setAberto(false)} titulo="Controles do protótipo" forma="folha" className="chassi-folha">
          <Controles aoNavegar={() => setAberto(false)} />
        </Sobreposicao>
        <Regras aberto={regras} aoFechar={() => setRegras(false)} />
      </div>
    )
  }
  return (
    <div className="chassi" role="region" aria-label="Controles do protótipo (fora do produto)">
      <span className="chassi__marca">Protótipo Dashboard VQP</span>
      <Controles />
      <button type="button" className="chassi__botao" onClick={() => setRegras(true)}>
        <BookText size={16} aria-hidden /> Regras desta tela
      </button>
      <Regras aberto={regras} aoFechar={() => setRegras(false)} />
    </div>
  )
}
