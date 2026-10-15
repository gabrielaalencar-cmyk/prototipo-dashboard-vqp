// T02. Seletor de loja: modal no computador, tela cheia no celular.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, Network } from 'lucide-react'
import { usePrototipo } from '../contexto/Prototipo.jsx'
import { useEhCelular } from '../utilitarios/ganchos.js'
import { Carregando, EstadoErro, Esqueleto, Selo, Sobreposicao } from './base.jsx'

export function estadoResumidoLoja(e) {
  if (!e) return { texto: '—', tom: 'cinza' }
  if (e.conexao === 'sem') return { texto: 'Sem conexão', tom: 'vermelho' }
  if (e.delivery === 'aberto' || e.balcao === 'aberto') return { texto: 'Aberta', tom: 'verde' }
  return { texto: 'Fechada', tom: 'cinza' }
}

const normalizar = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function ListaLojas({ aoEscolher, focarBusca = true, mostrarRede = true }) {
  const { lojasVisiveis, estadoLojas, recentes, lojaId, estadoForcado, cen } = usePrototipo()
  const [busca, setBusca] = useState('')
  const [tentativa, setTentativa] = useState(0)
  const campo = useRef(null)

  useEffect(() => {
    if (focarBusca) campo.current?.focus()
  }, [focarBusca])

  const filtradas = useMemo(() => {
    const b = normalizar(busca.trim())
    if (!b) return lojasVisiveis
    return lojasVisiveis.filter((l) => normalizar(`${l.nome} ${l.id} ${l.cidade}`).includes(b))
  }, [busca, lojasVisiveis])

  const usadasPorUltimo = busca ? [] : recentes.map((id) => lojasVisiveis.find((l) => l.id === id)).filter(Boolean)
  const porCidade = useMemo(() => {
    const mapa = new Map()
    filtradas
      .filter((l) => !usadasPorUltimo.includes(l))
      .forEach((l) => {
        if (!mapa.has(l.cidade)) mapa.set(l.cidade, [])
        mapa.get(l.cidade).push(l)
      })
    return [...mapa.entries()]
  }, [filtradas, usadasPorUltimo])

  const linha = (l) => {
    const est = estadoResumidoLoja(estadoLojas[l.id])
    return (
      <li key={l.id}>
        <button type="button" className={`lista-lojas__loja ${l.id === lojaId ? 'lista-lojas__loja--atual' : ''}`} onClick={() => aoEscolher(l.id)} aria-current={l.id === lojaId || undefined}>
          <span className="lista-lojas__nome">{l.nome}</span>
          <span className="lista-lojas__detalhe">{l.endereco} · {l.cidade} · ID {l.id}</span>
          <Selo tom={est.tom}>{est.texto}</Selo>
        </button>
      </li>
    )
  }

  const carregando = estadoForcado === 'carregando'
  const erro = estadoForcado === 'erro' && tentativa === 0

  return (
    <div className="lista-lojas">
      <div className="busca">
        <Search size={18} aria-hidden className="busca__icone" />
        <input
          ref={campo}
          type="search"
          className="busca__campo"
          placeholder="Busque pelo nome, ID ou cidade"
          aria-label="Buscar loja pelo nome, ID ou cidade"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>
      {mostrarRede && !busca && (
        <button type="button" className={`lista-lojas__rede ${lojaId === 'rede' ? 'lista-lojas__loja--atual' : ''}`} onClick={() => aoEscolher('rede')} aria-current={lojaId === 'rede' || undefined}>
          <Network size={18} aria-hidden />
          <span className="lista-lojas__nome">Toda a rede</span>
          <span className="lista-lojas__detalhe">{cen.marca.nome} · {lojasVisiveis.length} lojas</span>
        </button>
      )}
      {carregando ? (
        <Carregando oQue="a lista de lojas">
          <div className="lista-lojas__esqueleto">
            {Array.from({ length: 6 }, (_, i) => <Esqueleto key={i} linhas={2} />)}
          </div>
        </Carregando>
      ) : erro ? (
        <EstadoErro oQue="a lista de lojas" aoTentar={() => setTentativa(1)} compacto />
      ) : filtradas.length === 0 ? (
        <p className="lista-lojas__vazio" role="status">
          Nenhuma loja com "{busca}". Busque pelo nome, ID ou cidade.
        </p>
      ) : (
        <>
          {usadasPorUltimo.length > 0 && (
            <section aria-labelledby="lojas-recentes">
              <h3 id="lojas-recentes" className="lista-lojas__grupo">Usadas por último</h3>
              <ul>{usadasPorUltimo.map(linha)}</ul>
            </section>
          )}
          {porCidade.map(([cidade, lojas]) => (
            <section key={cidade} aria-label={cidade}>
              <h3 className="lista-lojas__grupo">{cidade}</h3>
              <ul>{lojas.map(linha)}</ul>
            </section>
          ))}
        </>
      )}
    </div>
  )
}

export function SeletorLoja() {
  const { sobreposicao, fechar, trocarLoja, avisar, lojasVisiveis } = usePrototipo()
  const celular = useEhCelular()
  const aberto = sobreposicao?.tipo === 'seletor'
  return (
    <Sobreposicao
      aberto={aberto}
      aoFechar={fechar}
      titulo="Escolher loja"
      subtitulo={`${lojasVisiveis.length} lojas · atalho: tecla /`}
      forma={celular ? 'cheia' : 'modal'}
      largura="560px"
      voltar={celular ? 'Voltar' : undefined}
      className="seletor-loja"
    >
      <ListaLojas
        aoEscolher={(id) => {
          trocarLoja(id)
          fechar()
          const nome = id === 'rede' ? 'Toda a rede' : lojasVisiveis.find((l) => l.id === id)?.nome
          avisar(`Você está em ${nome}.`)
          sobreposicao?.dados?.depois?.(id)
        }}
      />
    </Sobreposicao>
  )
}
