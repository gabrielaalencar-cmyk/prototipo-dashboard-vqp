// Editar nome e posição de um grupo de complementos ou de uma categoria.
// A posição é numerada (1º, 2º…): ao escolher uma, os outros se reorganizam.
import { useEffect, useState } from 'react'
import { usePrototipo } from '../contexto/Prototipo.jsx'
import { Botao, Campo, Sobreposicao } from '../componentes/base.jsx'

export const ordinal = (n) => `${n}º`

// Move o item de índice "de" para o índice "para" numa lista
export function mover(lista, de, para) {
  const copia = [...lista]
  const [item] = copia.splice(de, 1)
  copia.splice(para, 0, item)
  return copia
}

export function ModalNomeOrdem({ alvo, aoFechar, titulo, rotuloNome, ajudaOrdem, aoSalvar }) {
  const { avisar } = usePrototipo()
  const [nome, setNome] = useState('')
  const [posicao, setPosicao] = useState(1)
  const [erro, setErro] = useState(null)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (alvo) {
      setNome(alvo.nome)
      setPosicao(alvo.posicao)
      setErro(null)
    }
  }, [alvo])

  const salvar = async () => {
    if (!nome.trim()) return setErro('Dê um nome. É ele que o cliente vê no app.')
    setSalvando(true)
    try {
      await aoSalvar(nome.trim(), posicao)
      avisar(`"${nome.trim()}" salvo na ${ordinal(posicao)} posição.`, 'sucesso')
      aoFechar()
    } catch {
      setErro('Não foi possível salvar agora. O que você digitou continua aqui; tente de novo.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Sobreposicao
      aberto={!!alvo}
      aoFechar={aoFechar}
      titulo={titulo}
      forma="modal"
      largura="460px"
      rodape={
        <>
          <Botao onClick={aoFechar}>Cancelar</Botao>
          <Botao variante="principal" onClick={salvar} carregando={salvando} mudaAlgo>Salvar</Botao>
        </>
      }
    >
      {alvo && (
        <div className="formulario">
          <Campo rotulo={rotuloNome} erro={erro}>
            {(p) => <input {...p} className="campo__entrada" value={nome} onChange={(e) => { setNome(e.target.value); setErro(null) }} data-foco-inicial />}
          </Campo>
          <Campo rotulo="Posição" ajuda={ajudaOrdem}>
            {(p) => (
              <select {...p} className="campo__entrada" value={posicao} onChange={(e) => setPosicao(Number(e.target.value))}>
                {Array.from({ length: alvo.total }, (_, i) => (
                  <option key={i} value={i + 1}>{ordinal(i + 1)}{i + 1 === alvo.posicao ? ' (atual)' : ''}</option>
                ))}
              </select>
            )}
          </Campo>
        </div>
      )}
    </Sobreposicao>
  )
}
