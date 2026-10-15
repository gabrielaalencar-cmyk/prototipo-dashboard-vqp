// T34. Telas de estado global: Sem acesso, Escolha uma loja, Erro geral, Página não encontrada, Sem internet.
import { useNavigate, useParams } from 'react-router-dom'
import { WifiOff } from 'lucide-react'
import { usePrototipo } from '../contexto/Prototipo.jsx'
import { useTitulo } from '../utilitarios/ganchos.js'
import { Botao } from '../componentes/base.jsx'
import { ListaLojas } from '../componentes/SeletorLoja.jsx'

export function SemAcesso({ tela = 'esta tela', motivo }) {
  useTitulo('Sem acesso')
  return (
    <div className="pagina pagina--estado">
      <div className="estado-global">
        <h1>Você não tem acesso a {tela}.</h1>
        <p>{motivo || 'Peça ao responsável pela conta para liberar.'}</p>
        <div className="estado-global__acoes">
          <Botao variante="principal" para="/inicio">Voltar ao início</Botao>
        </div>
      </div>
    </div>
  )
}

export function EscolhaLoja({ tela }) {
  const { trocarLoja, avisar, lojasVisiveis } = usePrototipo()
  useTitulo('Escolha uma loja')
  return (
    <div className="pagina pagina--estado">
      <div className="estado-global estado-global--largo">
        <h1>Escolha uma loja para ver {tela}.</h1>
        <p>Você está em "Toda a rede", e esta tela mostra uma loja de cada vez.</p>
        <div className="estado-global__seletor">
          <ListaLojas
            mostrarRede={false}
            focarBusca={false}
            aoEscolher={(id) => {
              trocarLoja(id)
              avisar(`Você está em ${lojasVisiveis.find((l) => l.id === id)?.nome}.`)
            }}
          />
        </div>
      </div>
    </div>
  )
}

export function ErroGeral() {
  const navegar = useNavigate()
  useTitulo('Erro')
  return (
    <div className="pagina pagina--estado">
      <div className="estado-global">
        <h1>Algo deu errado ao abrir esta página.</h1>
        <p>O problema foi do nosso lado. Seus dados não foram alterados.</p>
        <div className="estado-global__acoes">
          <Botao variante="principal" onClick={() => navegar(0)}>Tentar de novo</Botao>
          <Botao para="/inicio">Voltar ao início</Botao>
        </div>
      </div>
    </div>
  )
}

export function NaoEncontrada() {
  useTitulo('Página não encontrada')
  return (
    <div className="pagina pagina--estado">
      <div className="estado-global">
        <h1>Página não encontrada.</h1>
        <p>O endereço pode ter mudado ou estar incompleto. Use o menu para chegar onde você queria.</p>
        <div className="estado-global__acoes">
          <Botao variante="principal" para="/inicio">Voltar ao início</Botao>
        </div>
      </div>
    </div>
  )
}

export function SemInternetDemo() {
  const { semInternetForcado, setSemInternetForcado } = usePrototipo()
  useTitulo('Sem internet')
  return (
    <div className="pagina pagina--estado">
      <div className="estado-global">
        <WifiOff size={28} aria-hidden className="estado-global__icone" />
        <h1>Sem internet</h1>
        <p>
          Quando o aparelho perde a internet, aparece uma faixa no topo de todas as telas: "Sem internet. Os dados podem estar desatualizados."
          As ações que mudam algo (abrir e fechar a loja, pausar, estornar) ficam desabilitadas até a conexão voltar.
        </p>
        <div className="estado-global__acoes">
          <Botao variante="principal" onClick={() => setSemInternetForcado(!semInternetForcado)}>
            {semInternetForcado ? 'Voltar a ter internet' : 'Simular sem internet'}
          </Botao>
          <Botao para="/inicio">Ver o Início assim</Botao>
        </div>
      </div>
    </div>
  )
}

export function EstadoGlobal() {
  const { tipo } = useParams()
  if (tipo === 'sem-acesso') return <SemAcesso tela="Cupons" />
  if (tipo === 'escolha-loja') return <EscolhaLoja tela="os pedidos" />
  if (tipo === 'erro') return <ErroGeral />
  if (tipo === 'sem-internet') return <SemInternetDemo />
  return <NaoEncontrada />
}
