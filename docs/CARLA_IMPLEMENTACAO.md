# Área de Representantes CARLA

Estado em 06/10/2026: implementação no repositório `oliveiravittae-gif/oliveira-vittae-design`, raiz `D:\0001 - Projetos\0001 - OLIVEIRA VITTAE TECNOLOGIA & IA`. Supabase confirmado pelo arquivo local `acessos.md`: projeto `zhfputohhpvwcdozamtm`, região São Paulo, PostgreSQL 17.11. Migrações aplicadas e integração remota básica validada. Rotas publicadas em `https://oliveiravittae.ia.br`; envio de e-mail para representantes ainda depende de SMTP próprio. Credenciais locais estão ignoradas pelo Git.

## Preservação do site

`src/routes/index.tsx`, `src/styles.css`, `src/routes/__root.tsx` e os assets institucionais foram preservados. As novas rotas `/representantes`, `/admin` e `/verificar` têm estilos próprios e são prerenderizadas para acesso direto no GitHub Pages. O caminho normal de build Lovable/TanStack continua disponível.

## Fontes conferidas

Os PDFs foram extraídos integralmente para revisão fora do repositório. Não copiar o contrato individual, dados de Lucila, pacientes ou cadastros da demonstração para o portal público.

| Fonte                                      | Local                                                                                                                   | SHA256                                                             |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Manual Comercial CARLA V1.09 (12 páginas)  | `D:\0001 - Projetos\0001 - Fluxos N8N\Clinica\06_DOCUMENTOS\Enviar\Lucila - 05-10\004_MANUAL_COMERCIAL_CARLA_V1.09.pdf` | `D768E4CB482A5BFC807D70FD7D997F1DCBAFDA6BCE276B28AA804156E1401947` |
| Contrato CARLA V1.10 integral (23 páginas) | mesma pasta, `003_CONTRATO_CARLA_LUCILA_NEREA_MAGALLANES_V1.10_INTEGRAL.pdf`                                            | `1F8BE8DF5B85433CBA36ADF08E86EFC5241F098C6AC2DC57D70C74BD09106277` |
| Manual de Funcionalidades V4               | `D:\0001 - Projetos\0001 - Fluxos N8N\Clinica\06_DOCUMENTOS\Enviar\CARLA_MANUAL_FUNCIONALIDADES_V4.pdf`                 | `ED0CEBD7EB0313A1E84A20EB6E5B9D898D46290EF82BC880170278DF4C964697` |

O V1.10 é uma versão individual para conferência; não há prova de assinatura. As regras comuns da política foram aproveitadas, sem cadastrar a pessoa ou presumir coordenação de equipe. O V4 descreve ambiente de demonstração homologado, inclusive limitações; não foi apresentado como prova de operação em produção de todos os clientes.

## Fluxo operacional

1. Representante solicita cadastro com nome, CPF válido, endereço, telefone, email e senha. Supabase Auth cria o usuário e um trigger cria perfil pendente. Não se usa metadata para decidir permissões.
2. Após confirmar email e entrar, envia foto obrigatória de até 5 MB (JPEG, PNG ou WebP). O fluxo separado permite concluir o upload com sessão autenticada quando a confirmação de email está habilitada.
3. Administração confere foto, identidade, matrícula e vínculo formalizado; aprova com motivo. Contas suspensas e encerradas não acessam os módulos comerciais. A carteira só é exibida para perfil ativo.
4. Representante registra oportunidade e abordagem demonstrada. Administração confere duplicidade e atribuição, confirma proteção de 90 dias e valida interações substanciais que renovam o prazo.
5. Administração formaliza cliente com referência contratual, aceite e ativação real. A ativação inicia o primeiro ciclo de retenção de 30 dias.
6. Representante registra contato, satisfação, risco, resultado, encaminhamento, destinatário, próximo passo e evidência. Duas tentativas sem resposta exigem dias distintos no fuso de São Paulo. Administração confere a qualidade da evidência e registra cumprimento, impedimento reconhecido ou recusa fundamentada.
7. Administração registra obrigações por competência positiva contratual. Retenção, renovação e expansão recorrente exigem análise concluída do ciclo antes da apuração. Registrar os períodos antes de transferências para preservar o titular no vencimento.
8. Recebimentos conciliados exigem identificador bancário único, data e comprovante. O banco calcula a comissão em transação, impede duplicidade e excesso e preserva a natureza da competência paga em atraso. Comissões adquiridas não são apagadas por suspensão, cancelamento ou transferência.
9. Administração confirma o pagamento com comprovante. Representante pode exportar demonstrativo e contestar; administração responde com fundamento. Correções são lançamentos separados com valor assinado, causa e prova.

## Mapa das regras

| Regra documental                                                | Implementação                                                                                                                          |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| P2: primeira venda do mês 30% / 10%; demais 35% / 15%           | Faixa congelada no primeiro crédito; mês America/Sao_Paulo; créditos em ordem; empate pelo aceite e sequência                          |
| P2: três primeiras competências positivas, mesmo atrasadas      | `competence` contratual, não quantidade de transferências ou mês do crédito                                                            |
| P3: 5% desde competência 4; protocolo, carteira e vínculo       | Aprovação do ciclo e elegibilidade registradas; base original separada; nova venda não é exigida                                       |
| P3: contato em 30 dias / duas tentativas distintas sem resposta | Contatos em janela do ciclo; conferência administrativa; próximo ciclo contado do contato válido ou fim do ciclo sem resposta          |
| P4: 20% da primeira mensalidade renovada recebida               | Evento único por cliente, prova da participação e protocolo; apuração proporcional das parcelas                                        |
| P5: 20% do incremento inicial e 5% posteriores                  | Original e incremento separados, competência ampliada própria; sem aquisição ou retenção adicional sobre o mesmo incremento            |
| P6: pagamento parcial e arredondamento acumulado                | Base cumulativa proporcional, comissão arredondada a centavos menos valor já apurado                                                   |
| P7: transferência e preservação de direitos                     | Corte atual com termo, ciclo novo, sem mover comissões históricas; competências futuras registradas bloqueiam transferência silenciosa |
| Contrato: dia 15, antecipação bancária e direitos especiais     | Data regular registrada; antecipação por feriados/expediente e vencimentos legais devem ser conferidos pela administração              |
| Contrato: contestação sem confisco automático                   | Registro e resposta; ajustes separados; nenhum estorno por inadimplência futura                                                        |

## Conectar ao projeto correto

O projeto foi conferido pela API administrativa antes das alterações: não havia usuários Auth, tabelas públicas ou objetos Storage. As migrations são aditivas com prefixo `carla_` e não foram aplicadas a projetos do Jurídico ou da clínica.

1. Aplicadas três migrations, com versões locais iguais ao histórico remoto: `20261006135433_carla_representatives.sql`, `20261006140052_carla_access_hardening.sql` e `20261006140312_carla_default_function_permissions.sql`.
2. Auth email/senha configurado, confirmação obrigatória, mínimo de 12 caracteres, domínio `https://oliveiravittae.ia.br` e redirecionamentos `/representantes` em produção e localhost:5180. SMTP próprio ainda ausente; o serviço padrão restringe destinatários e volume. Não considerar o envio de confirmação/recuperação homologado.
3. Conta administrativa `oliveiravittae@gmail.com` criada por indicação explícita do usuário; UUID inserido em `carla_private.admins`. Senha inicial aleatória não divulgada. Recuperação solicitada pela API Auth em 06/10/2026 para `/representantes`, HTTP 200. Aceitação do pedido não comprova entrega: o usuário precisa confirmar recebimento e definir sua senha. Não houve envio de convite nem mudança da senha pelo agente.
4. `.env.local` contém somente URL e chave publishable, ambas ignoradas pelo Git. As mesmas variáveis públicas foram configuradas em GitHub Actions → Repository variables. Nenhuma credencial privada pertence ao cliente ou ao repositório.
5. Finalizar SMTP próprio, confirmação e recuperação no navegador e validar recebimentos/provas remotos. `node --use-system-ca scripts/test-carla-remote.mjs` é um teste remoto explícito, usa somente contas sintéticas e remove seus arquivos e contas ao final; não executar como rotina sobre cadastros comerciais.

O bucket `carla-photos` é privado. Downloads usam URLs assinadas curtas. O QR é um UUID aleatório e consulta somente nome/matrícula de perfil ativo; não expõe CPF, foto, endereço, email ou listagem de representantes.

## Evidência e limites

Validação local concluída: 15 testes aprovados, incluindo execução de todas as migrations e simulação das permissões padrão do Supabase; TypeScript e lint dos arquivos implementados aprovados; build normal e build GitHub Pages aprovados. O build Pages gerou `/`, `/representantes`, `/admin` e `/verificar`. Os três arquivos centrais do site institucional não têm diff.

Testes locais usam PostgreSQL via PGlite com schemas Auth/Storage sintéticos. Eles executam a migration e RLS de verdade, mas não verificam email, PostgREST, arquivos reais em Supabase Storage, sessões reais ou infraestrutura remota. Testes de tela usam autenticação simulada. Build, TypeScript e testes locais não são E2E remoto.

Integração remota via APIs aprovada: sessões Auth reais; metadata sem autopromoção; isolamento de perfis; bloqueio de escrita de status; upload e URL assinada de foto privada; rejeição de pasta e leitura cruzadas; aprovação administrativa; QR público sem CPF; suspensão invalidando QR; bloqueio anônimo de funções administrativas. Três contas sintéticas e todos os seus arquivos foram removidos. Conta administrativa humana preservada. Não houve alterações em registros comerciais reais.

Supabase Advisors: sem erros; sem alertas nas funções CARLA. A tabela privada de administradores sem política é uma informação esperada: acesso direto negado, consulta somente pelas funções protegidas. Resta alerta Auth de proteção contra senhas vazadas, cuja ativação retornou HTTP 402 (recurso depende do plano). Performance sem alertas WARN; índices ainda sem uso em banco recém-criado aparecem como INFO.

Publicação autorizada pelo usuário e concluída: commit `8b7fbdf`, [GitHub Actions 37486972176](https://github.com/oliveiravittae-gif/oliveira-vittae-design/actions/runs/37486972176) com testes, TypeScript, build e deploy aprovados. Leitura HTTP HTTPS confirmou status 200 e títulos corretos em `/`, `/representantes/`, `/admin/` e `/verificar/`. Arquivos institucionais preservados.

Ainda pendentes: SMTP próprio (credenciais não constam no acessos.md), recebimento e conclusão da recuperação de e-mail, jornada completa autenticada no navegador e cenários financeiros no serviço remoto. Os cálculos financeiros foram validados localmente com SQL PostgreSQL, não com movimentações reais. Testes de API remota não são E2E de navegador/e-mail.

Casos que exigem decisão humana documentada: qualidade da prova, duplicidade, direitos legais especiais, reconstituição de crédito fora de ordem, titularidade histórica ainda não registrada antes da transferência, aditivos, expansão sucessiva complexa, alteração de regra e calendário bancário. Usar ajustes documentados, preservando os lançamentos originais; não presumir perda de direitos.

Referências técnicas consultadas: [Auth](https://supabase.com/docs/guides/auth/passwords), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Storage](https://supabase.com/docs/guides/storage/security/access-control). Changelog revisado em 06/10/2026.

## Matrícula automática — 06/10/2026

Novos cadastros recebem matrícula gerada pelo banco, começando em CLR-2026-0001005, seguida de CLR-2026-0001006. O formulário não aceita matrícula digitada. A sequência privada evita duplicidade em cadastros simultâneos; tentativas canceladas podem deixar intervalos. Matrículas existentes permanecem preservadas. A matrícula é emitida no cadastro pendente e não concede acesso comercial; a aprovação administrativa continua obrigatória. Migration 20261006155736_carla_registration_sequence.sql aplicada; 17 testes locais aprovados. A próxima emissão remota foi conferida sem consumir a sequência.
