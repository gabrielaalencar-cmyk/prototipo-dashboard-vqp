import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { ProvedorPrototipo } from './contexto/Prototipo.jsx'
import { Chassi } from './componentes/Chassi.jsx'
import { FaixaSemInternet, Moldura, TelaMais } from './componentes/Moldura.jsx'
import { Tela } from './componentes/Tela.jsx'
import { AvisosTemporarios } from './componentes/base.jsx'
import { SeletorLoja } from './componentes/SeletorLoja.jsx'
import { CentralAlertas, Reconexao } from './componentes/CentralAlertas.jsx'
import { ControleLoja } from './componentes/ControleLoja.jsx'
import { Entrar } from './telas/Entrar.jsx'
import { Inicio } from './telas/Inicio.jsx'
import { Pedidos } from './telas/Pedidos.jsx'
import { Cardapio } from './telas/Cardapio.jsx'
import { Analise } from './telas/Analise.jsx'
import { EstadoGlobal, NaoEncontrada } from './telas/EstadosGlobais.jsx'
import { EdicaoProduto } from './telas/camada2/EdicaoProduto.jsx'
import { OrganizarCardapio } from './telas/camada2/OrganizarCardapio.jsx'
import { CopiarParaLojas } from './telas/camada2/CopiarParaLojas.jsx'
import { Clientes, ClienteDetalhe } from './telas/camada2/Clientes.jsx'
import { Campanhas, CriarCampanha, Automacoes } from './telas/camada2/Campanhas.jsx'
import { Fidelidade, RegrasFidelidade } from './telas/camada2/Fidelidade.jsx'
import { Cupons, CriarCupom } from './telas/camada2/Cupons.jsx'
import { Destaques } from './telas/camada2/Destaques.jsx'
import { Funil } from './telas/camada2/Funil.jsx'
import { Relatorios } from './telas/camada2/Relatorios.jsx'
import { Funcionamento } from './telas/camada2/Funcionamento.jsx'
import { Entrega } from './telas/camada2/Entrega.jsx'
import { Modalidades } from './telas/camada2/Modalidades.jsx'
import { Pagamentos } from './telas/camada2/Pagamentos.jsx'
import { DadosLoja } from './telas/camada2/DadosLoja.jsx'
import { Integracoes } from './telas/camada2/Integracoes.jsx'
import { Rastreamento } from './telas/camada2/Rastreamento.jsx'
import { Conta, Ajuda } from './telas/camada2/Conta.jsx'
import { PrecosPorHorario, CriarPrecoHorario } from './telas/camada2/PrecosPorHorario.jsx'

// Telas da camada 2: versão funcional e simples
const CAMADA2 = [
  ['/cardapio/organizar', 'T11', OrganizarCardapio], ['/cardapio/copiar', 'T12', CopiarParaLojas],
  ['/clientes', 'T13', Clientes], ['/clientes/:id', 'T14', ClienteDetalhe],
  ['/campanhas', 'T15', Campanhas], ['/campanhas/nova', 'T16', CriarCampanha], ['/campanhas/automacoes', 'T17', Automacoes],
  ['/fidelidade', 'T18', Fidelidade], ['/fidelidade/regras', 'T19', RegrasFidelidade],
  ['/promocoes-automaticas', 'T35', PrecosPorHorario], ['/promocoes-automaticas/nova', 'T35', CriarPrecoHorario],
  ['/cupons', 'T20', Cupons], ['/cupons/novo', 'T21', CriarCupom], ['/destaques', 'T22', Destaques],
  ['/funil', 'T24', Funil], ['/relatorios', 'T25', Relatorios],
  ['/minha-loja/funcionamento', 'T26', Funcionamento], ['/minha-loja/entrega', 'T27', Entrega],
  ['/minha-loja/modalidades', 'T28', Modalidades], ['/minha-loja/pagamentos', 'T29', Pagamentos],
  ['/minha-loja/dados', 'T30', DadosLoja], ['/minha-loja/integracoes', 'T31', Integracoes],
  ['/minha-loja/rastreamento', 'T32', Rastreamento], ['/conta', 'T33', Conta], ['/ajuda', 'T33', Ajuda],
]

function Sobreposicoes() {
  return (
    <>
      <SeletorLoja />
      <CentralAlertas />
      <ControleLoja />
      <Reconexao />
      <AvisosTemporarios />
    </>
  )
}

function Rotas() {
  const { pathname } = useLocation()
  const naEntrada = pathname.startsWith('/entrar')
  return (
    <>
      <Chassi />
      <FaixaSemInternet />
      <Routes>
        <Route path="/entrar" element={<Entrar />} />
        <Route element={<Moldura />}>
          <Route path="/" element={<Navigate to="/inicio" replace />} />
          <Route path="/inicio" element={<Tela codigo="T03"><Inicio /></Tela>} />
          <Route path="/pedidos" element={<Tela codigo="T06"><Pedidos /></Tela>} />
          <Route path="/pedidos/:numero" element={<Tela codigo="T07"><Pedidos /></Tela>} />
          <Route path="/cardapio" element={<Tela codigo="T08"><Cardapio /></Tela>} />
          <Route path="/cardapio/complementos" element={<Tela codigo="T08"><Cardapio /></Tela>} />
          <Route path="/cardapio/produto/:id" element={<Tela codigo="T09"><EdicaoProduto /></Tela>} />
          <Route path="/analise" element={<Navigate to="/analise/visao-geral" replace />} />
          <Route path="/analise/:aba" element={<Tela codigo="T23"><Analise /></Tela>} />
          {CAMADA2.map(([rota, codigo, Componente]) => (
            <Route key={rota} path={rota} element={<Tela codigo={codigo}><Componente /></Tela>} />
          ))}
          <Route path="/mais" element={<TelaMais />} />
          <Route path="/estado/:tipo" element={<EstadoGlobal />} />
          <Route path="*" element={<NaoEncontrada />} />
        </Route>
      </Routes>
      {!naEntrada && <Sobreposicoes />}
      {naEntrada && <AvisosTemporarios />}
    </>
  )
}

export default function App() {
  return (
    <HashRouter>
      <ProvedorPrototipo>
        <Rotas />
      </ProvedorPrototipo>
    </HashRouter>
  )
}
