// T33. Conta (nome, e-mail, trocar senha, Sair) e Ajuda (canais do suporte e perguntas por área).
import { useId, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, LogOut, Search } from 'lucide-react'
import { usePrototipo } from '../../contexto/Prototipo.jsx'
import { useTitulo } from '../../utilitarios/ganchos.js'
import { CANAIS_SUPORTE, CONTA, emailMascarado, perguntasFrequentes } from '../../dados/cardapio2.js'
import { Botao, CabecalhoPagina, Campo, Carregando, EstadoErro, EstadoVazio, Esqueleto } from '../../componentes/base.jsx'
import '../../estilos/cardapio2.css'

const NOME_PERFIL = { dono: 'Dono', gerente: 'Gerente ou operador', franquia: 'Franquia restrita' }

function validarSenha({ atual, nova, repetir }) {
  const e = {}
  if (!atual) e.atual = 'Digite a senha que você usa hoje.'
  if (!nova) e.nova = 'Digite a nova senha.'
  else if (nova.length < 8 || !/[a-zA-Z]/.test(nova) || !/\d/.test(nova)) e.nova = 'Use pelo menos 8 caracteres, com letras e números.'
  else if (nova === atual) e.nova = 'A nova senha precisa ser diferente da atual.'
  if (nova && repetir !== nova) e.repetir = 'As duas senhas não são iguais.'
  return e
}

export function Conta() {
  const { cen, perfil, loja, estadoForcado, avisar, simularFalha, podeAgir } = usePrototipo()
  const navegar = useNavigate()
  useTitulo('Conta')
  const [senha, setSenha] = useState({ atual: '', nova: '', repetir: '' })
  const [mostrar, setMostrar] = useState(false)
  const [erros, setErros] = useState({})
  const [erroGeral, setErroGeral] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [tentou, setTentou] = useState(false)

  const mudar = (campo, v) => {
    setSenha((s) => ({ ...s, [campo]: v }))
    setErros((e) => ({ ...e, [campo]: undefined }))
    setErroGeral(null)
  }

  const trocarSenha = (ev) => {
    ev.preventDefault()
    const e = validarSenha(senha)
    setErros(e)
    const primeira = Object.keys(e)[0]
    if (primeira) return document.getElementById(`senha-${primeira}`)?.focus()
    setSalvando(true)
    setTimeout(() => {
      setSalvando(false)
      if (simularFalha || !podeAgir) return setErroGeral('Não foi possível trocar a senha. A senha antiga continua valendo. Tente de novo.')
      // no protótipo, "errada" simula a senha atual incorreta
      if (senha.atual.toLowerCase() === 'errada') {
        setErros({ atual: 'Senha atual incorreta.' })
        return document.getElementById('senha-atual')?.focus()
      }
      setSenha({ atual: '', nova: '', repetir: '' })
      avisar('Senha trocada. Use a nova senha na próxima entrada.', 'sucesso')
    }, 800)
  }

  if (estadoForcado === 'carregando') {
    return (
      <div className="pagina conta">
        <CabecalhoPagina titulo="Conta" />
        <Carregando oQue="os dados da conta">
          <div className="conta__blocos">
            <div className="bloco"><Esqueleto linhas={3} /></div>
            <div className="bloco"><Esqueleto linhas={4} altura="40px" /></div>
          </div>
        </Carregando>
      </div>
    )
  }
  if (estadoForcado === 'erro' && !tentou) {
    return (
      <div className="pagina conta">
        <CabecalhoPagina titulo="Conta" />
        <EstadoErro oQue="os dados da conta" aoTentar={() => setTentou(true)} />
      </div>
    )
  }

  const tipoCampo = mostrar ? 'text' : 'password'
  return (
    <div className="pagina conta">
      <CabecalhoPagina titulo="Conta" descricao="Seus dados de acesso ao dashboard." />
      <div className="conta__blocos">
        <section className="bloco" aria-labelledby="conta-dados">
          <div className="bloco__cabecalho"><h2 id="conta-dados">Seus dados</h2></div>
          <dl className="conta__dados">
            <div><dt>Nome</dt><dd>{CONTA.nome}</dd></div>
            <div><dt>E-mail</dt><dd>{emailMascarado(cen)}</dd></div>
            <div><dt>Perfil</dt><dd>{NOME_PERFIL[perfil]}</dd></div>
            <div><dt>{cen.rede ? 'Acesso' : 'Loja'}</dt><dd>{cen.rede ? (perfil === 'dono' ? `${cen.marca.nome}, todas as lojas` : loja?.nome) : cen.marca.nome}</dd></div>
          </dl>
          <p className="nota-pe">Para mudar nome ou e-mail, fale com o suporte em Ajuda.</p>
        </section>

        <section className="bloco" aria-labelledby="conta-senha">
          <div className="bloco__cabecalho"><h2 id="conta-senha">Trocar senha</h2></div>
          <form className="formulario conta__formulario" onSubmit={trocarSenha} noValidate>
            <Campo rotulo="Senha atual" erro={erros.atual} id="senha-atual">
              {(p) => <input {...p} type={tipoCampo} autoComplete="current-password" className="campo__entrada" value={senha.atual} onChange={(e) => mudar('atual', e.target.value)} />}
            </Campo>
            <Campo rotulo="Nova senha" erro={erros.nova} id="senha-nova" ajuda="Pelo menos 8 caracteres, com letras e números.">
              {(p) => <input {...p} type={tipoCampo} autoComplete="new-password" className="campo__entrada" value={senha.nova} onChange={(e) => mudar('nova', e.target.value)} />}
            </Campo>
            <Campo rotulo="Repita a nova senha" erro={erros.repetir} id="senha-repetir">
              {(p) => <input {...p} type={tipoCampo} autoComplete="new-password" className="campo__entrada" value={senha.repetir} onChange={(e) => mudar('repetir', e.target.value)} />}
            </Campo>
            <label className="conta__mostrar">
              <input type="checkbox" className="caixa" checked={mostrar} onChange={(e) => setMostrar(e.target.checked)} /> Mostrar senhas
            </label>
            {erroGeral && <p className="campo__erro" role="alert">{erroGeral}</p>}
            <div>
              <Botao variante="principal" type="submit" carregando={salvando} mudaAlgo>Trocar senha</Botao>
            </div>
          </form>
        </section>

        <section className="bloco" aria-labelledby="conta-sair">
          <div className="bloco__cabecalho"><h2 id="conta-sair">Sair</h2></div>
          <p className="texto-corpo">Sai do dashboard neste aparelho. Para voltar, entre com seu e-mail e senha.</p>
          <div className="conta__sair">
            <Botao icone={LogOut} onClick={() => navegar('/entrar')}>Sair</Botao>
          </div>
        </section>
      </div>
    </div>
  )
}

// Item de acordeão: botão dentro de título, aria-expanded e região ligada
function Pergunta({ pergunta, resposta, aberta, aoAlternar }) {
  const id = useId()
  return (
    <li className="ajuda__pergunta">
      <h4 className="ajuda__pergunta-titulo">
        <button type="button" id={`${id}-botao`} aria-expanded={aberta} aria-controls={`${id}-resposta`} onClick={aoAlternar}>
          <span>{pergunta}</span>
          <ChevronDown size={18} aria-hidden className={aberta ? 'ajuda__seta--aberta' : ''} />
        </button>
      </h4>
      <div id={`${id}-resposta`} role="region" aria-labelledby={`${id}-botao`} hidden={!aberta} className="ajuda__resposta">
        <p>{resposta}</p>
      </div>
    </li>
  )
}

const normalizar = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function Ajuda() {
  const { cen, estadoForcado } = usePrototipo()
  useTitulo('Ajuda')
  const [abertas, setAbertas] = useState(() => new Set())
  const [busca, setBusca] = useState('')
  const [tentou, setTentou] = useState(false)

  const areas = estadoForcado === 'vazio' ? [] : perguntasFrequentes(cen.rede)
  const b = normalizar(busca.trim())
  const filtradas = areas
    .map((a) => ({ ...a, perguntas: a.perguntas.filter((p) => !b || normalizar(`${p.pergunta} ${p.resposta}`).includes(b)) }))
    .filter((a) => a.perguntas.length > 0)
  const alternar = (id) => setAbertas((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  const canais = (
    <section className="bloco" aria-labelledby="ajuda-canais">
      <div className="bloco__cabecalho"><h2 id="ajuda-canais">Fale com o suporte</h2></div>
      <ul className="ajuda__canais">
        {CANAIS_SUPORTE.map((c) => (
          <li key={c.id} className="ajuda__canal">
            <span className="ajuda__canal-nome">{c.nome}</span>
            <span className="ajuda__canal-contato">{c.contato}</span>
            <span className="texto-secundario">{c.quando} · {c.resposta}</span>
          </li>
        ))}
      </ul>
      <p className="nota-pe">Contatos fictícios do protótipo. Tenha em mãos o nome da loja{cen.rede ? ' e o ID da unidade' : ''} ao falar com a gente.</p>
    </section>
  )

  let perguntas
  if (estadoForcado === 'carregando') {
    perguntas = <Carregando oQue="as perguntas frequentes"><Esqueleto linhas={6} altura="44px" /></Carregando>
  } else if (estadoForcado === 'erro' && !tentou) {
    perguntas = <EstadoErro oQue="as perguntas frequentes" aoTentar={() => setTentou(true)} compacto />
  } else if (areas.length === 0) {
    perguntas = <EstadoVazio compacto titulo="Nenhuma pergunta frequente publicada ainda." texto="Fale com o suporte por um dos canais acima." />
  } else {
    perguntas = (
      <>
        <div className="busca ajuda__busca">
          <Search size={18} aria-hidden className="busca__icone" />
          <input type="search" className="busca__campo" placeholder="Buscar nas perguntas" aria-label="Buscar nas perguntas" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        {filtradas.length === 0 ? (
          <EstadoVazio compacto titulo={`Nenhuma pergunta com “${busca.trim()}”.`} texto="Tente outra palavra ou fale com o suporte." acao={<Botao onClick={() => setBusca('')}>Limpar busca</Botao>} />
        ) : (
          filtradas.map((a) => (
            <section key={a.id} className="ajuda__area" aria-labelledby={`area-${a.id}`}>
              <h3 id={`area-${a.id}`} className="ajuda__area-titulo">{a.area}</h3>
              <ul className="ajuda__perguntas">
                {a.perguntas.map((p) => (
                  <Pergunta key={p.id} pergunta={p.pergunta} resposta={p.resposta} aberta={abertas.has(p.id)} aoAlternar={() => alternar(p.id)} />
                ))}
              </ul>
            </section>
          ))
        )}
      </>
    )
  }

  return (
    <div className="pagina ajuda">
      <CabecalhoPagina titulo="Ajuda" descricao="Canais do suporte e respostas para as dúvidas mais comuns." />
      <div className="conta__blocos">
        {canais}
        <section className="bloco" aria-labelledby="ajuda-perguntas">
          <div className="bloco__cabecalho"><h2 id="ajuda-perguntas">Perguntas frequentes</h2></div>
          {perguntas}
        </section>
      </div>
    </div>
  )
}
