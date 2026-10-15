import { useEffect, useState } from 'react'
import { usePrototipo } from '../contexto/Prototipo.jsx'

const CONSULTA_CELULAR = '(max-width: 767px)'

export function useEhCelular() {
  const [eh, setEh] = useState(() => window.matchMedia(CONSULTA_CELULAR).matches)
  useEffect(() => {
    const m = window.matchMedia(CONSULTA_CELULAR)
    const f = () => setEh(m.matches)
    m.addEventListener('change', f)
    return () => m.removeEventListener('change', f)
  }, [])
  return eh
}

// Título da aba no formato "Página · Nome da loja"
export function useTitulo(pagina) {
  const { nomeContexto, cen } = usePrototipo()
  useEffect(() => {
    document.title = `${pagina} · ${nomeContexto || cen.marca.nome}`
  }, [pagina, nomeContexto, cen])
}

// Estado "Carregando": depois de 8 s mostra "Está demorando mais que o normal."
export function useDemorando(ativo) {
  const [demorando, setDemorando] = useState(false)
  useEffect(() => {
    if (!ativo) {
      setDemorando(false)
      return
    }
    const t = setTimeout(() => setDemorando(true), 8000)
    return () => clearTimeout(t)
  }, [ativo])
  return demorando
}
