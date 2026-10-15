// Logo da VocêQpad redesenhado a partir do site institucional (losango azul com "check" amarelo
// e o nome em traço fino). Provisório: trocar pelo arquivo oficial quando a marca enviar.
export function SimboloVoceQpad({ tamanho = 24 }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 32 32" aria-hidden focusable="false" className="simbolo-vqp">
      <rect x="8.2" y="8.2" width="15.6" height="15.6" rx="2.6" transform="rotate(45 16 16)" fill="none" stroke="#268DF3" strokeWidth="3.2" />
      <path d="M6.6 19.4 L10.4 23.4 L16.6 15.6" fill="none" stroke="#F2CF3E" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function LogoVoceQpad({ tamanho = 24, sobreEscuro = true, soSimbolo }) {
  return (
    <span className={`logo-vqp ${sobreEscuro ? 'logo-vqp--escuro' : 'logo-vqp--claro'}`} style={{ fontSize: tamanho * 0.92 }}>
      <SimboloVoceQpad tamanho={tamanho} />
      {soSimbolo ? <span className="visualmente-oculto">VocêQpad</span> : <span className="logo-vqp__nome">VocêQpad</span>}
    </span>
  )
}
