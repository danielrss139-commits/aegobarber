/* =====================================================================
   EXEMPLO / DEMONSTRAÇÃO — "Barbearia Modelo"
   ---------------------------------------------------------------------
   Configuração fictícia para mostrar o sistema a clientes (prospects).
   demo: true -> não usa Firebase; agendamentos ficam só no aparelho de quem abre.
   Painel da demo: demo@barbearia.app · senha demo1234
   Para montar o site de demonstração:  sh ferramentas/gerar_demo.sh   (cria a pasta demo-site/)
   ===================================================================== */
window.LOJA = {
  nomeLoja: 'Sua Barbearia',
  nomeCurto: 'Sua Barbearia',
  slogan: 'Marque seu horário em um minuto.',
  logo: '',                     // sem logo: usa o monograma "BM"
  monograma: '',
  corDestaque: '#d9b77e',
  fundo: { imagem: '', escurecer: 0.55 },
  whatsapp: '5511900000000',    // número fictício
  instagram: 'barbeariamodelo',
  email: '',
  endereco: 'Rua das Navalhas, 100 · Centro',
  bairroCidade: 'Centro · Sua cidade',
  mapa: '',
  avaliacao: { nota: '4,9', total: '128', fonte: 'Google' },
  servicos: [
    { nome: 'Corte',          preco: 40, minutos: 40, icone: 'tesoura',     descricao: 'Tesoura e máquina, acabamento na navalha' },
    { nome: 'Barba',          preco: 30, minutos: 30, icone: 'barba',       descricao: 'Toalha quente, navalha e contorno alinhado' },
    { nome: 'Corte + Barba',  preco: 60, minutos: 60, icone: 'combo',       descricao: 'O combo completo, com calma' },
    { nome: 'Degradê',        preco: 45, minutos: 45, icone: 'maquina',     descricao: 'Transição suave na máquina e na navalha' },
    { nome: 'Sobrancelha',    preco: 15, minutos: 15, icone: 'sobrancelha', descricao: 'Desenho limpo, sem exagero' },
    { nome: 'Corte infantil', preco: 35, minutos: 30, icone: 'infantil',    descricao: 'Paciência e capricho para os pequenos' }
  ],
  horario: {
    seg: ['09:00', '19:00'], ter: ['09:00', '19:00'], qua: ['09:00', '19:00'], qui: ['09:00', '19:00'],
    sex: ['09:00', '19:00'], sab: ['09:00', '17:00'], dom: null
  },
  almoco: ['12:00', '13:00'],
  intervaloMinutos: 15,
  diasAntecedencia: 60,
  galeria: [],
  demo: true
};
