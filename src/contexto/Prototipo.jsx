// Estado global do protótipo: chassi (cenário, perfil, cor, estado forçado) e
// estado simulado do produto (loja em uso, status das lojas, pausas, estornos, alertas).
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { CENARIOS, PERMISSOES, montarAlertas } from '../dados/cenarios.js'
import { AGORA_REFERENCIA, hora } from '../utilitarios/formatos.js'

const Contexto = createContext(null)

const clonarCardapio = (c) => ({
  ...c,
  produtos: c.produtos.map((p) => ({ ...p })),
  grupos: c.grupos.map((g) => ({ ...g, itens: g.itens.map((i) => ({ ...i })) })),
})

function estadoInicialLojas(cen) {
  const mapa = {}
  cen.lojas
    .filter((l) => !l.teste)
    .forEach((l) => {
      mapa[l.id] = { ...l.estadoInicial }
    })
  return mapa
}

function cardapiosIniciais(cen) {
  const mapa = {}
  Object.entries(cen.porLoja).forEach(([id, dados]) => {
    mapa[id] = clonarCardapio(dados.cardapio)
  })
  return mapa
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms))

// O estado do chassi fica fora; o estado simulado reinicia por inteiro ao trocar de cenário (key)
export function ProvedorPrototipo({ children }) {
  const [cenarioId, setCenarioId] = useState('pequena')
  const [perfil, setPerfil] = useState('dono')
  const [estadoForcado, setEstadoForcado] = useState('normal')
  const [simularFalha, setSimularFalha] = useState(false)
  const [semInternetForcado, setSemInternetForcado] = useState(false)
  const chassi = {
    cenarioId, setCenarioId, perfil, setPerfil, estadoForcado, setEstadoForcado,
    simularFalha, setSimularFalha, semInternetForcado, setSemInternetForcado,
  }
  return (
    <ProvedorCenario key={cenarioId} chassi={chassi}>
      {children}
    </ProvedorCenario>
  )
}

function ProvedorCenario({ children, chassi }) {
  const { cenarioId, perfil, estadoForcado, simularFalha, semInternetForcado } = chassi
  const [navegadorOnline, setNavegadorOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)

  const cen = useMemo(() => CENARIOS[cenarioId].criar(), [cenarioId])

  // ---------- Estado simulado ----------
  const [lojaEscolhida, setLojaEscolhida] = useState(cen.lojaPadrao)
  const [recentes, setRecentes] = useState(cen.recentes || [])
  const [estadoLojas, setEstadoLojas] = useState(() => estadoInicialLojas(cen))
  const [cardapios, setCardapios] = useState(() => cardapiosIniciais(cen))
  const [estornos, setEstornos] = useState({})
  const [dispensados, setDispensados] = useState(() => new Set())
  const [lidos, setLidos] = useState(() => new Set())
  const [avisos, setAvisos] = useState([])
  const [sobreposicao, setSobreposicao] = useState(null) // { tipo, dados }

  // ---------- Relógio simulado: começa em 9/10/2026 19:42 e anda em tempo real ----------
  const inicioReal = useRef(Date.now())
  const [agora, setAgora] = useState(AGORA_REFERENCIA)
  const [statusVerificadoEm, setStatusVerificadoEm] = useState(AGORA_REFERENCIA)
  useEffect(() => {
    const t = setInterval(() => setAgora(new Date(AGORA_REFERENCIA.getTime() + (Date.now() - inicioReal.current))), 5000)
    return () => clearInterval(t)
  }, [])
  // Status da loja se atualiza a cada 60 s e ao voltar para a aba (H13)
  useEffect(() => {
    const atualizar = () => setStatusVerificadoEm(new Date(AGORA_REFERENCIA.getTime() + (Date.now() - inicioReal.current)))
    const t = setInterval(atualizar, 60000)
    const aoVoltar = () => document.visibilityState === 'visible' && atualizar()
    document.addEventListener('visibilitychange', aoVoltar)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', aoVoltar)
    }
  }, [])

  useEffect(() => {
    const on = () => setNavegadorOnline(true)
    const off = () => setNavegadorOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  const semInternet = semInternetForcado || !navegadorOnline

  // ---------- Perfil, permissões e loja em uso ----------
  const permissoes = PERMISSOES[perfil]
  const pode = useCallback((chave) => !chave || permissoes.has(chave), [permissoes])
  const temSeletor = cen.rede && perfil === 'dono'
  const lojaFixaDoPerfil = cen.rede && perfil === 'gerente' ? cen.lojaGerente : cen.rede && perfil === 'franquia' ? cen.lojaFranquia : null
  const lojaId = lojaFixaDoPerfil ?? (temSeletor ? lojaEscolhida : cen.lojaPadrao)
  const emRede = lojaId === 'rede'
  const lojasVisiveis = cen.lojas.filter((l) => !l.teste)
  const loja = emRede ? null : lojasVisiveis.find((l) => l.id === lojaId)
  const dadosLoja = emRede ? null : cen.porLoja[lojaId]
  const cardapio = emRede ? null : cardapios[lojaId]
  const estadoLoja = emRede ? null : estadoLojas[lojaId]

  const trocarLoja = useCallback((id) => {
    setLojaEscolhida(id)
    if (id !== 'rede') setRecentes((r) => [id, ...r.filter((x) => x !== id)].slice(0, 5))
  }, [])

  // Marca única VocêQPad (decisão de 15/10): sem cor de cliente; o acento vem dos tokens do CSS.

  // ---------- Avisos temporários ----------
  const avisar = useCallback((texto, tom = 'neutro') => {
    const id = Math.random().toString(36).slice(2)
    setAvisos((a) => [...a, { id, texto, tom }])
    setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), 5200)
  }, [])

  // ---------- Ações que mudam algo (respeitam "Simular falha" e "Sem internet") ----------
  const podeAgir = !semInternet
  const falhar = () => simularFalha || semInternet

  const mudarStatusLoja = useCallback(
    async (id, canal, novo) => {
      const anterior = estadoLojas[id][canal]
      setEstadoLojas((m) => ({ ...m, [id]: { ...m[id], [canal]: novo, mudando: canal } }))
      await esperar(900)
      if (falhar()) {
        setEstadoLojas((m) => ({ ...m, [id]: { ...m[id], [canal]: anterior, mudando: null } }))
        throw new Error('falha')
      }
      setEstadoLojas((m) => ({ ...m, [id]: { ...m[id], mudando: null } }))
      setStatusVerificadoEm(new Date(AGORA_REFERENCIA.getTime() + (Date.now() - inicioReal.current)))
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [estadoLojas, simularFalha, semInternet],
  )

  const alterarItemCardapio = useCallback(
    async (id, alvos, novoEstado) => {
      await esperar(600)
      if (falhar()) throw new Error('falha')
      setCardapios((m) => {
        const c = clonarCardapio(m[id])
        alvos.forEach((a) => {
          if (a.tipo === 'produto') {
            const p = c.produtos.find((x) => x.id === a.id)
            if (p) Object.assign(p, { estado: novoEstado, pausadoDesde: novoEstado === 'ativo' ? undefined : 'agora' })
          } else {
            const g = c.grupos.find((x) => x.id === a.grupoId)
            const i = g?.itens.find((x) => x.id === a.id)
            if (i) Object.assign(i, { estado: novoEstado, pausadoDesde: novoEstado === 'ativo' ? undefined : 'agora' })
          }
        })
        return { ...m, [id]: c }
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [simularFalha, semInternet],
  )

  const excluirProduto = useCallback(
    async (id, produtoId) => {
      await esperar(500)
      if (falhar()) throw new Error('falha')
      setCardapios((m) => {
        const c = clonarCardapio(m[id])
        c.produtos = c.produtos.filter((p) => p.id !== produtoId)
        return { ...m, [id]: c }
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [simularFalha, semInternet],
  )

  const adicionarCategoria = useCallback(
    async (id, nome) => {
      await esperar(400)
      if (falhar()) throw new Error('falha')
      setCardapios((m) => {
        const c = clonarCardapio(m[id])
        c.categorias = [...c.categorias, { id: `nova-${Date.now()}`, nome }]
        return { ...m, [id]: c }
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [simularFalha, semInternet],
  )

  // Produto novo. A categoria e os complementos vão pelo nome, porque cada loja tem os seus ids;
  // a loja que não tem a categoria ganha uma nova, e o complemento que ela não tem fica de fora.
  const adicionarProduto = useCallback(
    async (id, { categoriaNome, grupoNomes = [], ...produto }) => {
      await esperar(500)
      if (falhar()) throw new Error('falha')
      const atual = cardapios[id]
      const novoId = `p${Math.max(0, ...atual.produtos.map((p) => Number(p.id.slice(1)) || 0)) + 1}`
      setCardapios((m) => {
        const c = clonarCardapio(m[id])
        let cat = c.categorias.find((x) => x.nome === categoriaNome)
        if (!cat) {
          cat = { id: `nova-${Date.now()}`, nome: categoriaNome }
          c.categorias = [...c.categorias, cat]
        }
        const grupos = grupoNomes.map((n) => c.grupos.find((g) => g.nome === n)?.id).filter(Boolean)
        c.produtos = [...c.produtos, { ...produto, id: novoId, categoria: cat.id, grupos, estado: 'ativo' }]
        return { ...m, [id]: c }
      })
      return novoId
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cardapios, simularFalha, semInternet],
  )

  // Edição genérica do cardápio (renomear e reordenar grupos e categorias)
  const editarCardapio = useCallback(
    async (id, alterar) => {
      await esperar(450)
      if (falhar()) throw new Error('falha')
      setCardapios((m) => {
        const c = clonarCardapio(m[id])
        alterar(c)
        return { ...m, [id]: c }
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [simularFalha, semInternet],
  )

  const estornar = useCallback(
    async (numero, { valor, motivo }) => {
      await esperar(700)
      if (falhar()) throw new Error('falha')
      const pedidoEm = new Date(AGORA_REFERENCIA.getTime() + (Date.now() - inicioReal.current))
      setEstornos((m) => ({ ...m, [numero]: { valor, motivo, estado: 'processando', pedidoEm } }))
      // o adquirente responde depois de alguns segundos; 13,13 simula a recusa
      setTimeout(() => {
        const recusado = Math.abs(valor - 13.13) < 0.001
        setEstornos((m) => ({
          ...m,
          [numero]: {
            ...m[numero],
            estado: recusado ? 'recusado' : 'concluido',
            concluidoEm: new Date(pedidoEm.getTime() + 4000),
            motivoRecusa: recusado ? 'O banco do cliente recusou o estorno. Tente de novo amanhã ou fale com o suporte.' : undefined,
          },
        }))
      }, 4000)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [simularFalha, semInternet],
  )

  // ---------- Alertas ----------
  const todosAlertas = useMemo(() => montarAlertas(cen, estadoLojas), [cen, estadoLojas])
  // Em loja única ou com loja fixa, só os alertas da loja (e os da marca, como cupons)
  const alertasVisiveis = useMemo(() => {
    const escopo = temSeletor ? null : lojaId
    return todosAlertas.filter((a) => {
      if (escopo && a.lojaId && a.lojaId !== escopo) return false
      if (perfil === 'gerente' && a.prioridade === 5) return false
      if (perfil === 'franquia' && a.prioridade === 5) return false
      return true
    })
  }, [todosAlertas, temSeletor, lojaId, perfil])
  const alertasAtivos = alertasVisiveis.filter((a) => !dispensados.has(a.id))
  const alertasDispensados = alertasVisiveis.filter((a) => dispensados.has(a.id))
  const naoLidos = alertasAtivos.filter((a) => !lidos.has(a.id)).length
  const dispensarAlerta = useCallback((id) => setDispensados((s) => new Set(s).add(id)), [])
  const restaurarAlerta = useCallback((id) => setDispensados((s) => {
    const n = new Set(s)
    n.delete(id)
    return n
  }), [])
  const marcarLidos = useCallback(() => setLidos(new Set(alertasAtivos.map((a) => a.id))), [alertasAtivos])

  // ---------- Pedidos com estornos aplicados ----------
  const pedidosDaLoja = useCallback(
    (id) => (cen.porLoja[id]?.pedidos || []).map((p) => (estornos[p.numero] ? { ...p, estorno: estornos[p.numero] } : p)),
    [cen, estornos],
  )

  const nomeContexto = emRede ? 'Toda a rede' : loja?.nome
  const valor = {
    // chassi
    ...chassi, semInternet, podeAgir,
    // cenário
    cen, pode, temSeletor, lojaId, emRede, loja, lojasVisiveis, dadosLoja, cardapio, cardapios,
    estadoLoja, estadoLojas, trocarLoja, recentes, nomeContexto,
    // tempo
    agora, statusVerificadoEm, horaAtualizacaoAnalitico: '19:30', horaAgora: hora(agora),
    // ações
    mudarStatusLoja, alterarItemCardapio, excluirProduto, adicionarCategoria, adicionarProduto, editarCardapio, estornar, pedidosDaLoja,
    // alertas
    alertasAtivos, alertasDispensados, naoLidos, dispensarAlerta, restaurarAlerta, marcarLidos,
    // interface
    avisos, avisar, sobreposicao, abrir: (tipo, dados) => setSobreposicao({ tipo, dados }), fechar: () => setSobreposicao(null),
  }
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export const usePrototipo = () => useContext(Contexto)
