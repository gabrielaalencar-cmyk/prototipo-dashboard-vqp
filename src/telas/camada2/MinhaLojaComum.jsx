// Peças comuns às telas de Minha loja: barra do único "Salvar", aviso de saída sem salvar,
// esqueleto de carregamento e leitura de números digitados com vírgula.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { Botao, Carregando, Confirmacao, Esqueleto } from '../../componentes/base.jsx'
import '../../estilos/minhaloja.css'

// "8,50" → 8.5; vazio ou inválido → null
export function lerNumero(texto) {
  if (texto == null || String(texto).trim() === '') return null
  const s = String(texto).trim()
  const n = Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s)
  return Number.isFinite(n) ? n : NaN
}

export const mudou = (a, b) => JSON.stringify(a) !== JSON.stringify(b)

// Barra fixa no rodapé com o único "Salvar" da tela
export function BarraSalvar({ sujo, salvando, aoSalvar, aoDescartar, problemas = 0, rotulo = 'Salvar' }) {
  return (
    <div className={`minha-loja__barra ${sujo ? 'minha-loja__barra--sujo' : ''}`} role="region" aria-label="Salvar alterações">
      <p className="minha-loja__barra-texto" aria-live="polite">
        {problemas > 0 ? (
          <span className="texto-erro"><AlertTriangle size={16} aria-hidden /> {problemas === 1 ? 'Há 1 campo para corrigir.' : `Há ${problemas} campos para corrigir.`}</span>
        ) : sujo ? 'Você tem alterações não salvas.' : 'Tudo salvo.'}
      </p>
      <div className="minha-loja__barra-acoes">
        {sujo && <Botao variante="texto" onClick={aoDescartar} disabled={salvando}>Descartar</Botao>}
        <Botao variante="principal" onClick={aoSalvar} carregando={salvando} disabled={!sujo} mudaAlgo>{rotulo}</Botao>
      </div>
    </div>
  )
}

// O HashRouter não tem bloqueio de navegação; interceptamos cliques em links internos
// e o fechamento da aba enquanto houver alterações não salvas.
export function useAvisoSaida(sujo) {
  const navegar = useNavigate()
  const [destino, setDestino] = useState(null)

  useEffect(() => {
    if (!sujo) return
    const antesDeSair = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    const clique = (e) => {
      const a = e.target.closest?.('a[href^="#/"]')
      if (!a || a.closest('.sobreposicao') || e.ctrlKey || e.metaKey || e.shiftKey) return
      const para = a.getAttribute('href').slice(1)
      if (para === window.location.hash.slice(1)) return
      e.preventDefault()
      e.stopPropagation()
      setDestino(para)
    }
    window.addEventListener('beforeunload', antesDeSair)
    document.addEventListener('click', clique, true)
    return () => {
      window.removeEventListener('beforeunload', antesDeSair)
      document.removeEventListener('click', clique, true)
    }
  }, [sujo])

  return (
    <Confirmacao
      aberto={!!destino}
      aoFechar={() => setDestino(null)}
      titulo="Sair sem salvar?"
      texto="Você tem alterações não salvas nesta tela. Se sair agora, elas se perdem."
      rotuloConfirmar="Sair sem salvar"
      destrutivo
      exigeConexao={false}
      aoConfirmar={() => {
        const d = destino
        setDestino(null)
        navegar(d)
      }}
    />
  )
}

// Esqueleto no formato final: blocos com título e linhas
export function EsqueletoBlocos({ oQue, blocos = [3, 4] }) {
  return (
    <Carregando oQue={oQue}>
      <div className="minha-loja__blocos">
        {blocos.map((linhas, i) => (
          <div key={i} className="bloco">
            <Esqueleto linhas={1} altura="24px" className="minha-loja__esqueleto-titulo" />
            <Esqueleto linhas={linhas} altura="40px" />
          </div>
        ))}
      </div>
    </Carregando>
  )
}

// Simula a chamada ao servidor
export const esperar = (ms = 700) => new Promise((r) => setTimeout(r, ms))
