import { createFileRoute } from "@tanstack/react-router";
import { CarlaPortal } from "@/components/carla/portal";
export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Administração | CARLA" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: () => <CarlaPortal admin />,
});
