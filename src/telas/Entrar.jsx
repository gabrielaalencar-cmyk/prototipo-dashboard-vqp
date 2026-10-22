// T01. Login e recuperação de senha. Um formulário só para loja única e rede.
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Eye, EyeOff, MailCheck } from 'lucide-react'
import { usePrototipo } from '../contexto/Prototipo.jsx'
import { useTitulo } from '../utilitarios/ganchos.js'
import { Botao, Campo } from '../componentes/base.jsx'
import { LogoVoceQpad } from '../componentes/LogoVoceQpad.jsx'

export function Entrar() {
  const navegar = useNavigate()
  const { semInternet } = usePrototipo()
  const [modo, setModo] = useState('entrar') // entrar | recuperar | enviado | sem-acesso
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrar, setMostrar] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState(null)
  const [erros, setErros] = useState({})
  const titulo = useRef(null)
  useTitulo(modo === 'entrar' ? 'Entrar' : 'Recuperar senha')

  const trocar = (m) => {
    setModo(m)
    setErro(null)
    setErros({})
    setTimeout(() => titulo.current?.focus(), 0)
  }

  const entrar = (e) => {
    e.preventDefault()
    const v = {}
    if (!email.trim()) v.email = 'Informe o e-mail de acesso.'
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) v.email = 'Confira o e-mail: falta o @ ou o domínio.'
    if (!senha) v.senha = 'Informe a senha.'
    setErros(v)
    if (Object.keys(v).length) return
    setEnviando(true)
    setErro(null)
    setTimeout(() => {
      setEnviando(false)
      if (semInternet || senha === 'servidor') return setErro('Não foi possível entrar agora. Tente de novo em alguns minutos.')
      if (senha === 'erro') return setErro('E-mail ou senha incorretos.')
      if (senha === 'semacesso') return trocar('sem-acesso')
      navegar('/inicio')
    }, 1100)
  }

  const recuperar = (e) => {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setErros({ email: 'Informe um e-mail válido, como nome@restaurante.com.br.' })
    setEnviando(true)
    setTimeout(() => {
      setEnviando(false)
      trocar('enviado')
    }, 1000)
  }

  return (
    <div className="entrar">
      <section className="entrar__apresentacao" aria-label="VocêQpad">
        <LogoVoceQpad tamanho={34} />
        <p className="entrar__titulo">Acompanhe os resultados e gerencie sua loja no mesmo lugar.</p>
        <p className="entrar__texto">Veja como estão as vendas e resolva o dia a dia: pedidos, cardápio, clientes, campanhas e configurações, de uma loja ou da rede inteira.</p>
      </section>
      <main className="entrar__caixa" aria-labelledby="titulo-entrar">
        {modo === 'entrar' && (
          <form onSubmit={entrar} noValidate className="formulario">
            <h1 id="titulo-entrar" ref={titulo} tabIndex={-1}>Entrar no painel</h1>
            <p className="entrar__sub">O mesmo acesso para uma loja ou para a rede inteira.</p>
            {erro && (
              <p className="entrar__erro" role="alert">
                <AlertTriangle size={18} aria-hidden /> {erro}
              </p>
            )}
            <Campo rotulo="E-mail" erro={erros.email}>
              {(p) => <input {...p} type="email" autoComplete="username" className="campo__entrada campo__entrada--alto" value={email} onChange={(e) => setEmail(e.target.value)} />}
            </Campo>
            <Campo rotulo="Senha" erro={erros.senha}>
              {(p) => (
                <div className="campo__com-acao">
                  <input {...p} type={mostrar ? 'text' : 'password'} autoComplete="current-password" className="campo__entrada campo__entrada--alto" value={senha} onChange={(e) => setSenha(e.target.value)} />
                  <button type="button" className="campo__acao" onClick={() => setMostrar((m) => !m)} aria-pressed={mostrar} aria-label={mostrar ? 'Ocultar senha' : 'Mostrar senha'}>
                    {mostrar ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
                  </button>
                </div>
              )}
            </Campo>
            <Botao type="submit" variante="principal" carregando={enviando} className="botao--largo botao--alto">
              {enviando ? 'Entrando…' : 'Entrar'}
            </Botao>
            <button type="button" className="link entrar__esqueci" onClick={() => trocar('recuperar')}>Esqueci minha senha</button>
          </form>
        )}
        {modo === 'recuperar' && (
          <form onSubmit={recuperar} noValidate className="formulario">
            <button type="button" className="botao botao--texto botao--voltar" onClick={() => trocar('entrar')}>
              <ArrowLeft size={18} aria-hidden /> Voltar para entrar
            </button>
            <h1 id="titulo-entrar" ref={titulo} tabIndex={-1}>Recuperar senha</h1>
            <p className="entrar__sub">Informe o e-mail de acesso. Mandamos um link para você criar uma senha nova.</p>
            <Campo rotulo="E-mail" erro={erros.email}>
              {(p) => <input {...p} type="email" autoComplete="username" className="campo__entrada campo__entrada--alto" value={email} onChange={(e) => setEmail(e.target.value)} />}
            </Campo>
            <Botao type="submit" variante="principal" carregando={enviando} className="botao--largo botao--alto">Enviar link</Botao>
          </form>
        )}
        {modo === 'enviado' && (
          <div className="formulario">
            <MailCheck size={28} aria-hidden className="entrar__icone" />
            <h1 id="titulo-entrar" ref={titulo} tabIndex={-1}>Confira seu e-mail</h1>
            <p className="entrar__sub" role="status">Se o e-mail estiver cadastrado, você recebe um link em alguns minutos. Confira também a caixa de spam.</p>
            <Botao className="botao--largo botao--alto" onClick={() => trocar('entrar')}>Voltar para entrar</Botao>
          </div>
        )}
        {modo === 'sem-acesso' && (
          <div className="formulario">
            <h1 id="titulo-entrar" ref={titulo} tabIndex={-1}>Seu acesso ainda não tem telas liberadas</h1>
            <p className="entrar__sub">Você entrou, mas o seu perfil não tem nenhuma tela do painel. Peça ao responsável pela conta para liberar.</p>
            <Botao className="botao--largo botao--alto" onClick={() => trocar('entrar')}>Entrar com outra conta</Botao>
          </div>
        )}
        <p className="entrar__dica">Protótipo: qualquer e-mail e senha entram. Senha <code>erro</code> simula credencial errada, <code>servidor</code> simula falha e <code>semacesso</code> simula perfil sem telas.</p>
      </main>
    </div>
  )
}
