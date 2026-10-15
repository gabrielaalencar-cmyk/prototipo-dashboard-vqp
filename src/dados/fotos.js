// Fotos ilustrativas dos produtos (bancos de imagem com licença livre; créditos em FOTOS).
// Produto sem tipo correspondente fica sem foto, como acontece de verdade nos cardápios.
import { FOTOS } from './fotosFontes.js'

const REGRAS = [
  [/^mini pastéis/i, 'mini-pasteis'],
  [/^pastel (de chocolate|de banana|romeu|de doce)/i, 'pastel-doce'],
  [/^(pastel|monte seu pastel)/i, 'pastel-salgado'],
  [/^coxinha/i, 'coxinha'],
  [/^batata/i, 'batata-frita'],
  [/^caldo de cana/i, 'caldo-de-cana'],
  [/^(refrigerante|guaraná|tônica|energético)/i, 'refrigerante-lata'],
  [/^água/i, 'agua-garrafa'],
  [/^suco/i, 'suco-natural'],
  [/^pizza (broto|doce)/i, 'pizza-fatia'],
  [/^pizza/i, 'pizza-inteira'],
  [/^calzone/i, 'calzone'],
  [/^esfiha/i, 'esfiha'],
  [/^(lasanha|canelone|rondele)/i, 'lasanha'],
  [/^(nhoque|espaguete|talharim|fettuccine)/i, 'massa-molho'],
  [/^pão de alho/i, 'pao-de-alho'],
  [/^bruschetta/i, 'bruschetta'],
  [/^(petit gâteau|brownie|torta)/i, 'petit-gateau'],
  [/^(pudim|panna cotta|mousse)/i, 'pudim'],
  [/^(tiramisù|cannoli)/i, 'tiramisu'],
  [/^sorvete/i, 'sorvete'],
  [/^cerveja/i, 'cerveja-garrafa'],
  [/^vinho/i, 'vinho-taca'],
]

export function fotoDoProduto(nome) {
  const regra = REGRAS.find(([r]) => r.test(nome))
  return regra ? FOTOS[regra[1]]?.url || null : null
}

export { FOTOS }
