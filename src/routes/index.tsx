import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Oliveira Vittae Designer & IA | Sites, landing pages e WhatsApp" },
      {
        name: "description",
        content:
          "Sites, landing pages e agentes de IA para WhatsApp. Estratégia digital para empresas do Rio de Janeiro e da Baixada Fluminense. Solicite um diagnóstico gratuito.",
      },
      {
        property: "og:title",
        content: "Sua próxima venda não pode esperar. | Oliveira Vittae Designer & IA",
      },
      {
        property: "og:description",
        content:
          "Transforme sua presença digital e conecte o interesse do cliente a um atendimento ágil.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://oliveiravittae.ia.br/" },
      { property: "og:image", content: "https://oliveiravittae.ia.br/images/logo-oficial.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#1A2B44" },
    ],
    links: [{ rel: "canonical", href: "https://oliveiravittae.ia.br/" }],
  }),
  component: Index,
});
function Index() {
  useEffect(() => {
    const controller = new AbortController();
    const options = { signal: controller.signal };
    const menu = document.getElementById("menu-button");
    const nav = document.getElementById("navigation");
    const year = document.getElementById("year");
    if (year)
      year.textContent = new Intl.DateTimeFormat("pt-BR", {
        year: "numeric",
        timeZone: "America/Sao_Paulo",
      }).format(new Date());
    const closeMenu = () => {
      nav?.classList.remove("open");
      menu?.setAttribute("aria-expanded", "false");
    };
    menu?.addEventListener(
      "click",
      () => {
        const open = nav?.classList.toggle("open");
        menu.setAttribute("aria-expanded", String(Boolean(open)));
      },
      options,
    );
    nav?.addEventListener(
      "click",
      (event) => {
        if ((event.target as Element).closest("a")) closeMenu();
      },
      options,
    );
    document.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "Escape") closeMenu();
      },
      options,
    );
    for (const button of document.querySelectorAll<HTMLButtonElement>("[data-dialog]")) {
      button.addEventListener(
        "click",
        () => {
          const dialog = document.getElementById(
            button.dataset["dialog"] ?? "",
          ) as HTMLDialogElement | null;
          dialog?.showModal();
        },
        options,
      );
    }
    for (const dialog of document.querySelectorAll<HTMLDialogElement>("dialog")) {
      dialog
        .querySelector(".dialog-close")
        ?.addEventListener("click", () => dialog.close(), options);
      dialog.addEventListener(
        "click",
        (event) => {
          if (event.target === dialog) {
            const r = dialog.getBoundingClientRect();
            if (
              event.clientX < r.left ||
              event.clientX > r.right ||
              event.clientY < r.top ||
              event.clientY > r.bottom
            )
              dialog.close();
          }
        },
        options,
      );
    }
    return () => controller.abort();
  }, []);

  return (
    <>
      <a className={"skip"} href={"#conteudo"}>
        {"Ir para o conteúdo"}
      </a>

      <header className={"border-b border-white/10 sticky top-0 z-50 backdrop-blur"}>
        <div className={"wrap flex items-center justify-between gap-6 py-5"}>
          <a href={"#inicio"} className={"brand"} aria-label={"Oliveira Vittae, início"}>
            <img
              className={"official-logo"}
              src={"/images/logo-oficial.png"}
              alt={""}
              width={"1254"}
              height={"1254"}
            />
            <span>
              {"Oliveira Vittae"}
              <small>{"Designer & IA"}</small>
            </span>
          </a>
          <button
            id={"menu-button"}
            className={"menu-button"}
            aria-expanded={"false"}
            aria-controls={"navigation"}
          >
            {"Menu"}
          </button>
          <nav id={"navigation"} aria-label={"Navegação principal"} className={"navigation"}>
            <a href={"#solucoes"}>{"Soluções"}</a>
            <a href={"#metodo"}>{"Nosso método"}</a>
            <a href={"#autoridade"}>{"Autoridade"}</a>
            <a href={"#perguntas"}>{"Perguntas"}</a>
            <a href={"#diagnostico"} className={"nav-cta"}>
              {"Solicitar diagnóstico "}
              <span aria-hidden={"true"}>{"↗"}</span>
            </a>
          </nav>
        </div>
      </header>

      <main id={"conteudo"}>
        <section
          className={
            "relative overflow-hidden py-20 lg:py-28 bg-gradient-to-b from-vittaeDark via-[#132238] to-[#0f172a] border-b border-slate-800 conversion-hero"
          }
          id={"inicio"}
        >
          <div
            className={
              "max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center"
            }
          >
            <div className={"lg:col-span-7 space-y-6"}>
              <div
                className={
                  "inline-flex items-center gap-2 px-3 py-1 rounded-full bg-vittaeGold/10 border border-vittaeGold/30 text-vittaeGold text-xs font-semibold tracking-wide uppercase"
                }
              >
                <span className={"w-2 h-2 rounded-full bg-vittaeGold animate-pulse"}></span>
                {
                  "\n                        Engenharia de Conversão B2B • RJ & Baixada Fluminense\n                    "
                }
              </div>
              <h1
                className={
                  "text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight"
                }
              >
                {"\n                        Seu site trava."}
                <br />
                {"Seu WhatsApp demora."}
                <br />
                <span className={"text-vittaeGold"}>{"Seu cliente vai embora."}</span>
              </h1>
              <p className={"text-lg text-slate-300 max-w-2xl leading-relaxed"}>
                {
                  "\n                        O custo invisível de uma presença digital amadora não aparece no extrato: ele drena seus lucros todos os dias para os concorrentes que respondem mais rápido. Unimos sites de alta velocidade e agentes de IA para blindar a sua operação comercial.\n                    "
                }
              </p>
              <div className={"flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4"}>
                <a
                  href={
                    "https://wa.me/5521979703488?text=Olá!%20Quero%20garantir%20meu%20diagnóstico%20digital%20estratégico%20com%20a%20Oliveira%20Vittae."
                  }
                  target={"_blank"}
                  rel={"noopener noreferrer"}
                  className={
                    "inline-flex items-center justify-center gap-3 bg-vittaeGold hover:bg-vittaeGoldDark text-vittaeDark font-bold px-8 py-4 rounded-xl transition shadow-xl text-base text-center"
                  }
                >
                  <span>{"Garantir Diagnóstico Gratuito"}</span>
                  <span aria-hidden={"true"}>{"↗"}</span>
                </a>
                <div
                  className={
                    "text-xs text-slate-400 text-center sm:text-left flex flex-col justify-center"
                  }
                >
                  <span className={"text-amber-400 font-semibold"}>{"⚠️ Agenda Limitada:"}</span>
                  {
                    " Apenas 5 diagnósticos estratégicos abertos esta semana.\n                        "
                  }
                </div>
              </div>
              <div
                className={
                  "pt-6 flex items-center gap-6 text-xs text-slate-400 border-t border-slate-800/80"
                }
              >
                <div>
                  {"📍 Foco estratégico: "}
                  <strong className={"text-slate-200"}>{"Rio de Janeiro e Baixada"}</strong>
                </div>
                <div>{"⚡ Velocidade Core Web Vitals"}</div>
              </div>
            </div>
            <div className={"lg:col-span-5"}>
              <div
                className={
                  "bg-slate-900/90 border border-slate-700/80 rounded-2xl p-6 shadow-2xl backdrop-blur relative"
                }
              >
                <div
                  className={
                    "absolute -top-3 -right-3 bg-vittaeGold text-vittaeDark text-xs font-bold px-3 py-1 rounded-full shadow"
                  }
                >
                  {"Demonstração de atendimento 24/7"}
                </div>
                <div className={"flex items-center gap-3 pb-4 border-b border-slate-800"}>
                  <div
                    className={
                      "w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white"
                    }
                  >
                    {"IA"}
                  </div>
                  <div>
                    <h3 className={"text-sm font-bold text-white"}>
                      {"Agente Inteligente Oliveira Vittae"}
                    </h3>
                    <p className={"text-xs text-emerald-400"}>
                      {"● Online agora qualificando leads"}
                    </p>
                  </div>
                </div>
                <div className={"py-4 space-y-3 text-xs"}>
                  <div
                    className={
                      "bg-slate-800 p-3 rounded-xl rounded-tl-none text-slate-300 max-w-[85%]"
                    }
                  >
                    {
                      "\n                                Olá! Vi seu anúncio e gostaria de um orçamento para minha construtora.\n                            "
                    }
                  </div>
                  <div
                    className={
                      "bg-vittaeDark border border-vittaeGold/30 p-3 rounded-xl rounded-tr-none text-slate-100 max-w-[85%] ml-auto"
                    }
                  >
                    {
                      "\n                                Olá! Perfeito. Qual o porte do empreendimento? Já realizamos projetos de alta performance no RJ. Posso agendar um alinhamento técnico com nosso especialista?\n                            "
                    }
                  </div>
                </div>
                <div className={"pt-2 text-center"}>
                  <span className={"text-[10px] uppercase tracking-wider text-slate-500 font-bold"}>
                    {"Conversa ilustrativa — não é um atendimento em tempo real"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section
          id={"autoridade"}
          className={"py-20 bg-[#132238]/50 border-b border-slate-800 conversion-authority"}
        >
          <div className={"max-w-7xl mx-auto px-6"}>
            <div className={"text-center max-w-3xl mx-auto mb-16"}>
              <span className={"text-vittaeGold text-xs font-semibold tracking-widest uppercase"}>
                {"Autoridade Comprovada"}
              </span>
              <h2 className={"text-3xl lg:text-4xl font-extrabold text-white mt-2"}>
                {"Por que empresas líderes no Rio confiam na Oliveira Vittae"}
              </h2>
              <p className={"text-slate-300 mt-3"}>
                {
                  "Engenharia de precisão voltada para o mercado corporativo, industrial e de construção civil."
                }
              </p>
            </div>
            <div className={"grid grid-cols-1 md:grid-cols-3 gap-8"}>
              <div className={"bg-slate-900 border border-slate-800 p-8 rounded-2xl relative"}>
                <div className={"text-vittaeGold font-black text-4xl mb-4"}>{"+30%"}</div>
                <h3 className={"text-lg font-bold text-white mb-2"}>{"Retenção de Tráfego"}</h3>
                <p className={"text-sm text-slate-400"}>
                  {
                    "Eliminação drástica de rejeições através de otimização extrema de carregamento e arquitetura limpa."
                  }
                </p>
              </div>
              <div className={"bg-slate-900 border border-slate-800 p-8 rounded-2xl relative"}>
                <div className={"text-vittaeGold font-black text-4xl mb-4"}>{"24/7"}</div>
                <h3 className={"text-lg font-bold text-white mb-2"}>{"Respostas Imediatas"}</h3>
                <p className={"text-sm text-slate-400"}>
                  {
                    "Nenhum lead fica sem atendimento fora do horário comercial na Baixada Fluminense e capitais."
                  }
                </p>
              </div>
              <div className={"bg-slate-900 border border-slate-800 p-8 rounded-2xl relative"}>
                <div className={"text-vittaeGold font-black text-4xl mb-4"}>{"100%"}</div>
                <h3 className={"text-lg font-bold text-white mb-2"}>{"Foco Comercial B2B"}</h3>
                <p className={"text-sm text-slate-400"}>
                  {
                    "Estruturas desenhadas sob medida para construtoras, indústrias e comércios de alto padrão."
                  }
                </p>
              </div>
            </div>
          </div>
        </section>
        <div className={"sector-strip border-y border-white/10"}>
          <div className={"wrap"}>
            <p>{"Para empresas que precisam de uma presença à altura da sua operação"}</p>
            <div className={"flex flex-wrap gap-x-8 gap-y-3"}>
              <span>{"Construtoras e incorporadoras"}</span>
              <span>{"Indústrias"}</span>
              <span>{"Comércios"}</span>
              <span>{"Prestadores de serviços"}</span>
            </div>
          </div>
        </div>
        <section id={"oportunidades"} className={"wrap section"}>
          <div className={"section-heading"}>
            <p className={"eyebrow"}>{"O custo da desconexão"}</p>
            <h2>
              {"Você investe para atrair."}
              <br />
              {"O que acontece depois do clique?"}
            </h2>
            <p>
              {
                "Uma campanha pode trazer atenção. Uma experiência ruim pode interromper a conversa antes mesmo de ela começar."
              }
            </p>
          </div>
          <div className={"grid gap-5 md:grid-cols-3 mt-10"}>
            <article className={"card"}>
              <span className={"card-number"}>{"01 / Velocidade"}</span>
              <h3>
                {"O site carrega."}
                <br />
                {"A paciência acaba."}
              </h3>
              <p>
                {
                  "Páginas pesadas criam atrito no primeiro contato. O visitante precisa entender sua oferta sem esperar pela tecnologia."
                }
              </p>
              <div className={"consequence"}>
                {"Consequência: interesse perdido antes da conversa."}
              </div>
            </article>
            <article className={"card"}>
              <span className={"card-number"}>{"02 / Experiência"}</span>
              <h3>
                {"No computador, funciona."}
                <br />
                {"No celular, complica."}
              </h3>
              <p>
                {
                  "Texto pequeno, botões difíceis e navegação confusa transformam uma intenção de compra em esforço desnecessário."
                }
              </p>
              <div className={"consequence"}>
                {"Consequência: sua empresa transmite menos confiança."}
              </div>
            </article>
            <article className={"card"}>
              <span className={"card-number"}>{"03 / Atendimento"}</span>
              <h3>
                {"O cliente pergunta."}
                <br />
                {"A resposta fica para amanhã."}
              </h3>
              <p>
                {
                  "Seu horário comercial termina. A procura continua. Sem acolhimento e encaminhamento, uma oportunidade pode esfriar."
                }
              </p>
              <div className={"consequence"}>
                {"Consequência: o concorrente responde primeiro."}
              </div>
            </article>
          </div>
        </section>
        <section id={"solucoes"} className={"solutions-section"}>
          <div className={"wrap section"}>
            <div className={"section-heading"}>
              <p className={"eyebrow"}>{"O ecossistema Oliveira Vittae"}</p>
              <h2>
                {"Uma boa vitrine atrai."}
                <br />
                {"Uma operação conectada faz avançar."}
              </h2>
              <p>
                {
                  "Presença digital e atendimento desenhados como partes da mesma jornada comercial."
                }
              </p>
            </div>
            <div className={"grid gap-6 lg:grid-cols-2 mt-10"}>
              <article className={"solution-card"}>
                <span className={"eyebrow"}>{"01 / Presença que gera ação"}</span>
                <h3>
                  {"Sites e landing pages"}
                  <br />
                  {"de alta performance"}
                </h3>
                <p>
                  {
                    "Uma apresentação profissional, orientada à sua oferta, ao seu público e à ação que o visitante precisa tomar."
                  }
                </p>
                <ul className={"checklist"}>
                  <li>{"Design responsivo para celular, tablet e computador."}</li>
                  <li>
                    {
                      "Otimização técnica com foco nos Core Web Vitals — indicadores de velocidade, estabilidade e resposta da página."
                    }
                  </li>
                  <li>{"SEO estruturado para ajudar os buscadores a compreender seu conteúdo."}</li>
                  <li>
                    {
                      "Copy, hierarquia visual e chamadas para ação alinhadas ao processo comercial."
                    }
                  </li>
                </ul>
                <a href={"#diagnostico"} className={"text-link"}>
                  {"Quero avaliar meu site "}
                  <span aria-hidden={"true"}>{"↗"}</span>
                </a>
              </article>
              <article className={"solution-card"}>
                <span className={"eyebrow"}>{"02 / Atendimento que dá continuidade"}</span>
                <h3>
                  {"Agentes de IA"}
                  <br />
                  {"para WhatsApp"}
                </h3>
                <p>
                  {
                    "Automação para acolher a demanda, organizar informações e dar continuidade ao atendimento, inclusive fora do horário comercial."
                  }
                </p>
                <ul className={"checklist"}>
                  <li>{"Qualificação de contatos com perguntas relevantes para seu negócio."}</li>
                  <li>
                    {"Agendamento quando integrado à sua agenda e às regras de disponibilidade."}
                  </li>
                  <li>
                    {
                      "Linguagem natural, orientações claras e encaminhamento para uma pessoa quando necessário."
                    }
                  </li>
                  <li>
                    {
                      "Regras de resposta, acompanhamento de falhas e limites definidos na implantação."
                    }
                  </li>
                </ul>
                <a href={"#diagnostico"} className={"text-link"}>
                  {"Quero avaliar meu atendimento "}
                  <span aria-hidden={"true"}>{"↗"}</span>
                </a>
              </article>
            </div>
            <p className={"micro mt-6"}>
              {
                "Automação 24/7 depende da disponibilidade das plataformas e das integrações. IA pode errar; validação, monitoramento e atendimento humano fazem parte de uma implantação responsável."
              }
            </p>
          </div>
        </section>
        <section id={"metodo"} className={"wrap section"}>
          <div className={"grid gap-12 lg:grid-cols-2"}>
            <div className={"section-heading"}>
              <p className={"eyebrow"}>{"Engenharia de longevidade digital"}</p>
              <h2>
                {"Mais do que colocar"}
                <br />
                {"uma página no ar."}
              </h2>
              <p>
                {
                  "Seu negócio precisa de uma estrutura que possa evoluir. Nossa proposta combina design estratégico, decisões técnicas claras e implantação alinhada à sua operação."
                }
              </p>
              <blockquote>
                {
                  "Primeiro entendemos onde sua empresa perde oportunidades. Depois desenhamos o que precisa mudar."
                }
              </blockquote>
              <p className={"micro"}>
                {
                  "A autoridade se demonstra no método, nas entregas e nos resultados que podem ser verificados."
                }
              </p>
            </div>
            <ol className={"method-list"}>
              <li>
                <span>{"01"}</span>
                <div>
                  <h3>{"Diagnóstico antes da proposta"}</h3>
                  <p>
                    {
                      "Mapeamos a oferta, a jornada de contato e os pontos de atrito do site e do atendimento."
                    }
                  </p>
                </div>
              </li>
              <li>
                <span>{"02"}</span>
                <div>
                  <h3>{"Escopo claro, execução orientada"}</h3>
                  <p>
                    {"Definimos prioridades, integrações, responsabilidades e critérios de aceite."}
                  </p>
                </div>
              </li>
              <li>
                <span>{"03"}</span>
                <div>
                  <h3>{"Validação antes da entrega"}</h3>
                  <p>
                    {
                      "Conferimos navegação, experiência móvel e os fluxos de contato previstos no escopo."
                    }
                  </p>
                </div>
              </li>
              <li>
                <span>{"04"}</span>
                <div>
                  <h3>{"Uma base para continuar evoluindo"}</h3>
                  <p>
                    {
                      "Documentamos a entrega e definimos como acompanhar a operação conforme o serviço contratado."
                    }
                  </p>
                </div>
              </li>
            </ol>
          </div>
        </section>
        <section id={"perguntas"} className={"wrap section faq-section"}>
          <div className={"grid gap-10 lg:grid-cols-2"}>
            <div className={"section-heading"}>
              <p className={"eyebrow"}>{"Antes de começar"}</p>
              <h2>
                {"Clareza também"}
                <br />
                {"gera confiança."}
              </h2>
              <p>{"As decisões mais importantes merecem respostas diretas."}</p>
            </div>
            <div className={"faq"}>
              <details>
                <summary>{"Preciso trocar meu site atual?"}</summary>
                <p>
                  {
                    "Nem sempre. O diagnóstico ajuda a identificar se ajustes pontuais resolvem o problema ou se uma nova estrutura faz mais sentido."
                  }
                </p>
              </details>
              <details>
                <summary>{"A IA substitui minha equipe comercial?"}</summary>
                <p>
                  {
                    "A proposta é apoiar a equipe: acolher contatos, organizar informações e encaminhar oportunidades. Negociações e situações sensíveis devem ter participação humana."
                  }
                </p>
              </details>
              <details>
                <summary>{"O agendamento funciona com qualquer agenda?"}</summary>
                <p>
                  {
                    "Depende da integração disponível, das permissões e das regras de operação. Essa compatibilidade é avaliada antes de fechar o escopo."
                  }
                </p>
              </details>
              <details>
                <summary>{"Vocês garantem vendas ou posições no Google?"}</summary>
                <p>
                  {
                    "Não. Conversão e posicionamento dependem da oferta, da concorrência, do tráfego e da execução comercial. O trabalho prioriza uma base técnica e uma jornada de contato bem estruturadas."
                  }
                </p>
              </details>
              <details>
                <summary>{"Como funciona o diagnóstico gratuito?"}</summary>
                <p>
                  {
                    "Você apresenta sua empresa, seu site e o principal desafio de atendimento. A análise inicial orienta os próximos passos, sem obrigação de contratar."
                  }
                </p>
              </details>
            </div>
          </div>
        </section>
        <section id={"diagnostico"} className={"wrap section"}>
          <div className={"closing"}>
            <p className={"eyebrow"}>{"O próximo passo começa com uma conversa"}</p>
            <h2>
              {"Sua próxima oportunidade"}
              <br />
              <em>{"não precisa ficar pelo caminho."}</em>
            </h2>
            <p>
              {
                "Descubra onde sua presença digital e seu atendimento podem estar criando atrito. Solicite um diagnóstico gratuito e converse sobre as prioridades do seu negócio."
              }
            </p>
            <a
              data-whatsapp={""}
              href={
                "https://wa.me/5521979703488?text=Ol%C3%A1!%20Quero%20dominar%20meu%20mercado%20com%20sites%20de%20alta%20performance%20e%20IA.%20Gostaria%20de%20solicitar%20um%20diagn%C3%B3stico%20digital%20gratuito%20para%20minha%20empresa."
              }
              className={"button mt-8"}
              target={"_blank"}
              rel={"noopener noreferrer"}
            >
              {"Quero meu diagnóstico digital gratuito "}
              <span aria-hidden={"true"}>{"↗"}</span>
            </a>
            <p className={"micro mt-4"}>
              {"Sem compromisso. Com foco no que faz sentido para sua empresa."}
            </p>
          </div>
        </section>
      </main>

      <footer className={"border-t border-white/10"}>
        <div className={"wrap py-10"}>
          <div className={"grid gap-8 md:grid-cols-3"}>
            <div>
              <a href={"#inicio"} className={"brand"}>
                <img
                  className={"official-logo"}
                  src={"/images/logo-oficial.png"}
                  alt={""}
                  width={"1254"}
                  height={"1254"}
                />
                <span>
                  {"Oliveira Vittae"}
                  <small>{"Designer & IA"}</small>
                </span>
              </a>
              <p className={"micro mt-5"}>
                {
                  "Sites, landing pages e inteligência artificial para conectar sua empresa a novas oportunidades."
                }
              </p>
            </div>
            <div>
              <h2 className={"footer-title"}>{"Explore"}</h2>
              <nav aria-label={"Navegação do rodapé"} className={"footer-links"}>
                <a href={"#solucoes"}>{"Soluções"}</a>
                <a href={"#metodo"}>{"Nosso método"}</a>
                <a href={"#perguntas"}>{"Perguntas frequentes"}</a>
                <a href={"#diagnostico"}>{"Diagnóstico gratuito"}</a>
              </nav>
            </div>
            <div>
              <h2 className={"footer-title"}>{"Informações"}</h2>
              <p className={"micro"}>
                {"Foco regional no Rio de Janeiro e na Baixada Fluminense."}
              </p>
              <button className={"legal-button"} data-dialog={"privacy"}>
                {"Privacidade"}
              </button>
              <button className={"legal-button"} data-dialog={"terms"}>
                {"Informações e condições"}
              </button>
            </div>
          </div>
          <div className={"footer-bottom"}>
            <span>
              {"© "}
              <span id={"year"}></span>
              {" Oliveira Vittae Designer & IA."}
            </span>
            <span>{"Tecnologia com direção. Presença com propósito."}</span>
          </div>
        </div>
      </footer>

      <dialog id={"privacy"} aria-labelledby={"privacy-title"}>
        <button className={"dialog-close"} aria-label={"Fechar"}>
          {"×"}
        </button>
        <h2 id={"privacy-title"}>{"Privacidade e contato"}</h2>
        <p>
          {
            "Esta página não contém formulário de coleta nem grava dados em armazenamento local. Ao iniciar uma conversa no WhatsApp, você passa a utilizar uma plataforma externa, sujeita às suas próprias condições de privacidade."
          }
        </p>
        <p>
          {"Não envie senhas, dados de pagamento ou informações sensíveis na solicitação inicial."}
        </p>
        <p>
          {
            "Para dúvidas sobre o contato comercial ou solicitações relacionadas aos dados enviados, utilize o WhatsApp (21) 97970-3488. Novas integrações, formulários e ferramentas de análise exigem atualização deste aviso."
          }
        </p>
      </dialog>

      <dialog id={"terms"} aria-labelledby={"terms-title"}>
        <button className={"dialog-close"} aria-label={"Fechar"}>
          {"×"}
        </button>
        <h2 id={"terms-title"}>{"Informações e condições"}</h2>
        <p>
          {
            "As informações desta página apresentam os serviços propostos. Prazo, preço, integrações, suporte e entregas são definidos em proposta e contrato."
          }
        </p>
        <p>
          {
            "Não há garantia de volume de vendas, posição em buscadores ou funcionamento ininterrupto. O diagnóstico inicial é gratuito e não exige contratação."
          }
        </p>
        <p>{"A ilustração da página é conceitual e não representa resultados de clientes."}</p>
      </dialog>
    </>
  );
}
