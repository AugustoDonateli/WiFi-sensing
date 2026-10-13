# Publicar a tela de demonstração no Vercel

Assim os amigos abrem um link em vez de receber arquivos. O site é só a pasta `demo/`: o `vercel.json` na raiz do repositório já diz isso ao Vercel. Não tem build, não tem instalação, não tem servidor.

## Por que vale a pena

- **Um link só** (por exemplo `https://wave-sense.vercel.app`) para o grupo, o professor e quem for testar.
- **Atualiza sozinho:** cada `git push` no ramo de produção gera uma versão nova em cerca de 1 minuto.
- **HTTPS:** o Web Serial (botão "Placa USB") só funciona em página segura, e o Vercel usa HTTPS. Então ligar a placa pelo site deve funcionar no Chrome e no Edge do computador, igual a abrir o arquivo. Testado sem placa: o navegador libera o Web Serial; com a placa de verdade, falta testar.
- **Gratuito** no plano Hobby, que é para projetos pessoais e não comerciais. Um projeto de escola se encaixa.

## Cuidados

- **O link é público.** Quem tiver o endereço vê a tela. O site não tem dados pessoais e não envia nada para servidor nenhum: recordes, marcas e o mural ficam guardados só no navegador de cada aparelho.
- **Na feira, não dependa da internet.** Leve a pasta `demo/` no notebook. Abrir o `index.html` direto no Chrome funciona sem internet (só as fontes trocam por outras parecidas). O site fica como reserva, ou o contrário.
- **No celular**, a simulação e o Desafio Ninja funcionam; os controles ficam no botão "Operador (O)". A placa pela USB é coisa do computador.

## Passo a passo (uma vez só, uns 5 minutos)

1. Entre em **https://vercel.com** e clique em **Sign Up**. Escolha o plano **Hobby** e entre com o **GitHub** (a mesma conta do repositório).
2. No painel do Vercel, clique em **Add New…** → **Project**.
3. Na lista "Import Git Repository", procure **WiFi-sensing** e clique em **Import**.
   - Se o repositório não aparecer: clique no link para ajustar as permissões do GitHub e libere o acesso do Vercel a esse repositório.
4. Na tela de configuração:
   - **Project Name:** `wave-sense` (o endereço vira `wave-sense.vercel.app` se esse nome estiver livre; senão o Vercel sugere outro).
   - **Framework Preset:** deixe **Other**.
   - **Root Directory:** deixe como está (`./`, a raiz). **Não** escolha `demo` aqui: quem aponta para `demo` é o `vercel.json`.
   - Não mexa em Build, Output e Install: o `vercel.json` já cuida disso.
5. Clique em **Deploy**. Em cerca de 1 minuto aparece a tela de parabéns com o endereço.
6. Abra o endereço no Chrome e confira:
   - aparece a abertura com o contador de calibração e depois as linhas;
   - o aviso amarelo "Simulação · dados inventados para ensaio" aparece embaixo;
   - no painel do operador (tecla `O`), o botão **Placa USB** abre a janela de escolher porta (sem placa, é só cancelar).

Se algo der errado, veja a seção 10 do [erros-provaveis.md](erros-provaveis.md).

## Depois

- **Atualizar o site:** é só fazer `git push`. Em **Deployments**, no Vercel, dá para ver cada versão e voltar para uma anterior se a nova quebrar.
- **Ramo de produção:** o Vercel usa o ramo padrão do GitHub. Hoje o repositório só tem o ramo `claude/wave-sense-jacitec-implementation-aa5on0`, então é ele. Se um dia criarem o `main`, troquem o ramo padrão no GitHub e confiram nas configurações de Git do projeto no Vercel. Envios para outros ramos viram "Preview", com outro endereço, sem mexer no principal.
- **Testar antes de mandar para os amigos:** abra o link numa aba anônima. É o que eles vão ver: sem recordes nem marcas guardadas.

## O que vai para o site

Só o que está dentro de `demo/`: `index.html`, `nucleo.js` e `README.md`. As ferramentas em Python, os dados e os documentos não são publicados.
