# Oliveira Vittae Design

## GitHub Pages e domínio próprio

A integração com o Lovable é preservada. `npm run build:pages` gera e valida
uma versão estática em `pages-dist`. `npm run build` mantém o build do Lovable.
A automação `.github/workflows/deploy.yml` publica atualizações de `main`.
Somente os arquivos estáticos são publicados, sem o servidor.
GitHub Pages não executa backend; formulários com armazenamento, login e rotas
de servidor exigem um serviço externo antes de serem implementados.

Domínio: `oliveiravittae.ia.br`, configurado em Settings → Pages.
O caminho base é `/`, adequado ao domínio próprio.

Configure na Cloudflare com **Somente DNS**:

| Tipo  | Nome | Conteúdo                     |
| ----- | ---- | ---------------------------- |
| A     | @    | 185.199.108.153              |
| A     | @    | 185.199.109.153              |
| A     | @    | 185.199.110.153              |
| A     | @    | 185.199.111.153              |
| CNAME | www  | oliveiravittae-gif.github.io |

Configure o domínio no GitHub antes de apontar o DNS. Preserve registros de
e-mail e outros serviços. Após propagação e emissão do certificado, ative
**Enforce HTTPS** em Settings → Pages e confira o domínio.
A configuração no GitHub não comprova DNS nem HTTPS funcionando.

crie uma landing page em branco com o nome Oliveira Vittae Designer & IA em amarelo

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1ff23438-b4d0-4237-9463-bf2a91fda79c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
