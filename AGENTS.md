# Orientações para trabalhar no Wave Sense

## Direção aprovada pelo usuário em 14/10/2026

- Preservar as animações de transição entre as abas: gestos, duração, curvas e continuidade de `demo/passagem.js`.
- Preservar o motion design de `demo/historia.js`; revisões de conteúdo ficam em `demo/roteiro.js`, sem mudar IDs, ordem ou tempos das cenas.
- Preservar a memória temporal do gráfico: 48 linhas, uma leitura nova a cada 0,1 s, entrando embaixo e subindo. Não animar todas as linhas como se fossem a mesma leitura atual.
- Preservar a inversão automática preto/branco comandada pelo detector. Não substituir por um seletor de tema.
- Refinar textos, hierarquia, legibilidade e controles mantendo Instrument Serif, Geist, Geist Mono, espaço vazio e a paleta atual. A cor de aviso identifica a simulação.
- Não mudar o detector, limiares, realce do sinal, armazenamento ou regras da Travessia durante um refinamento visual, salvo pedido explícito.
- Distinguir simulação, gravação e dados das placas. O som é uma tradução das variações do sinal; as marcas não identificam pessoas. Não apresentar hipóteses como resultados medidos.

## Trabalho e validação

- O site está em `demo/`, sem build ou dependências de frontend. Pode ser servido por um servidor HTTP estático ou aberto localmente.
- Antes de propor uma revisão visual, conferir desktop e celular, temas claro/escuro, navegação entre abas e os controles alterados.
- Os testes existentes usam `python -m unittest discover -s ferramentas/testes -v` e precisam de Node.js e das dependências de `ferramentas/requirements.txt`.
- Usar uma branch de trabalho e apresentar uma pull request para revisão. O ramo de produção pode atualizar o Vercel automaticamente.
