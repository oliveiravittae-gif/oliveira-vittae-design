import { createFileRoute } from "@tanstack/react-router";
import { VerifyCard } from "@/components/carla/verify-card";
export const Route = createFileRoute("/verificar")({
  head: () => ({
    meta: [
      { title: "Verificação da Carteira | CARLA" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: VerifyCard,
});
