// T10. Pausar item ou complemento: menu suspenso no computador, folha de baixo no celular.
// "Até amanhã" reativa sozinho na próxima abertura; "Até eu reativar" fica até alguém reativar.
import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { usePrototipo } from '../contexto/Prototipo.jsx'
import { useEhCelular } from '../utilitarios/ganchos.js'
import { produtosQueUsam } from '../dados/cardapios.js'
import { Botao, MenuSuspenso, Sobreposicao } from '../componentes/base.jsx'

export function rotuloEstado(item, abertura) {
  if (item.estado === 'amanha') return { texto: 'Pausado até amanhã', detalhe: `Volta ${abertura.dia} às ${abertura.hora}`, tom: 'ambar' }
  if (item.estado === 'pausado') return { texto: 'Pausado', detalhe: 'Até alguém reativar', tom: 'ambar' }
  return { texto: 'Ativo', detalhe: null, tom: 'verde' }
}

// Gancho que controla a pausa: abre, executa e mostra o erro sem tirar o item de venda
export function usePausar() {
  const { lojaId, cardapio, dadosLoja, alterarItemCardapio, avisar } = usePrototipo()
  const [alvo, setAlvo] = useState(null) // { itens: [{tipo,id,grupoId,nome}], ancora }
  const [enviando, setEnviando] = useState(null)
  const [erro, setErro] = useState(null)

  const pausar = async (prazo) => {
    setEnviando(prazo)
    setErro(null)
    const nomes = alvo.itens.map((i) => i.nome)
    try {
      await alterarItemCardapio(lojaId, alvo.itens, prazo)
      const quando = prazo === 'amanha' ? `até amanhã. Volta às ${dadosLoja.abertura.hora}, na abertura da loja.` : 'até você reativar.'
      avisar(`${nomes.length > 1 ? `${nomes.length} itens pausados` : `${nomes[0]} pausado`} ${quando}`, 'sucesso')
      setAlvo(null)
    } catch {
      setErro(nomes.length > 1 ? `Não foi possível pausar os ${nomes.length} itens. Eles continuam à venda.` : `Não foi possível pausar ${nomes[0]}. Ele continua à venda.`)
    } finally {
      setEnviando(null)
    }
  }

  const reativar = async (itens) => {
    try {
      await alterarItemCardapio(lojaId, itens, 'ativo')
      avisar(itens.length > 1 ? `${itens.length} itens voltaram à venda.` : `${itens[0].nome} voltou à venda.`, 'sucesso')
    } catch {
      avisar(itens.length > 1 ? 'Não foi possível reativar os itens. Eles continuam pausados.' : `Não foi possível reativar ${itens[0].nome}. Ele continua pausado.`, 'erro')
    }
  }

  const abrirPausa = (itens, ancora) => {
    setErro(null)
    setAlvo({ itens, ancora })
  }

  // Complemento usado em vários produtos: "Pausa em 6 produtos que usam este sabor"
  let usoComplemento = null
  if (alvo?.itens.length === 1 && alvo.itens[0].tipo === 'complemento') {
    const g = cardapio.grupos.find((x) => x.id === alvo.itens[0].grupoId)
    const usados = produtosQueUsam(cardapio, g.id)
    if (usados.length > 1) usoComplemento = `Pausa em ${usados.length} produtos que usam ${g.tipo === 'sabor' ? 'este sabor' : 'esta opção'}.`
  }

  return { alvo, setAlvo, abrirPausa, pausar, reativar, enviando, erro, usoComplemento, abertura: dadosLoja?.abertura }
}

export function PainelPausar({ controle }) {
  const celular = useEhCelular()
  const { alvo, setAlvo, pausar, enviando, erro, usoComplemento, abertura } = controle
  if (!alvo) return null
  const titulo = alvo.itens.length > 1 ? `Pausar ${alvo.itens.length} itens` : `Pausar ${alvo.itens[0].nome}`
  const fechar = () => setAlvo(null)

  const conteudo = (
    <div className="pausar">
      {usoComplemento && <p className="pausar__uso">{usoComplemento}</p>}
      <div className="pausar__opcoes">
        <Botao variante="principal" className="pausar__opcao" data-foco-inicial onClick={() => pausar('amanha')} carregando={enviando === 'amanha'} disabled={!!enviando} mudaAlgo>
          <span className="pausar__opcao-titulo">Até amanhã</span>
          <span className="pausar__opcao-detalhe">Volta sozinho {abertura.dia} às {abertura.hora}, na abertura</span>
        </Botao>
        <Botao className="pausar__opcao" onClick={() => pausar('pausado')} carregando={enviando === 'pausado'} disabled={!!enviando} mudaAlgo>
          <span className="pausar__opcao-titulo">Até eu reativar</span>
          <span className="pausar__opcao-detalhe">Fica pausado até alguém reativar</span>
        </Botao>
      </div>
      {erro && (
        <p className="pausar__erro" role="alert">
          <AlertTriangle size={16} aria-hidden /> {erro}
        </p>
      )}
      {!celular && <Botao variante="texto" tamanho="p" onClick={fechar}>Cancelar</Botao>}
    </div>
  )

  if (celular) {
    return (
      <Sobreposicao aberto aoFechar={fechar} titulo={titulo} forma="folha" rodape={<Botao onClick={fechar} className="botao--largo">Cancelar</Botao>}>
        {conteudo}
      </Sobreposicao>
    )
  }
  return (
    <MenuSuspenso aberto ancora={alvo.ancora} aoFechar={fechar} titulo={titulo}>
      {conteudo}
    </MenuSuspenso>
  )
}
