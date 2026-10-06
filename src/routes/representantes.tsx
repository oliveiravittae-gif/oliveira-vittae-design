import { createFileRoute } from "@tanstack/react-router";
import { CarlaPortal } from "@/components/carla/portal";
export const Route = createFileRoute("/representantes")({
  head: () => ({
    meta: [
      { title: "Área de Representantes | CARLA" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => <CarlaPortal />,
});
