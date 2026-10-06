import { useEffect, useState } from "react";
import { carlaClient } from "@/lib/carla";
import "./portal.css";
export function VerifyCard() {
  const [result, setResult] = useState<{ name: string; registration: string } | null>(null);
  const [message, setMessage] = useState("Verificando carteira…");
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("id");
    const db = carlaClient();
    if (!db || !token) {
      setMessage("Verificação indisponível ou identificador ausente.");
      return;
    }
    let live = true;
    void db.rpc("carla_verify_card", { token }).then(({ data, error }) => {
      if (!live) return;
      if (error || !data?.length) setMessage("Carteira inválida, suspensa ou não aprovada.");
      else {
        setResult(data[0]);
        setMessage("Representante ativo confirmado.");
      }
    });
    return () => {
      live = false;
    };
  }, []);
  return (
    <main className="carla-portal">
      <section className="carla-panel">
        <p className="carla-eyebrow">OLIVEIRA VITTAE DESIGNER & IA</p>
        <h1>Verificação de representante</h1>
        <p role="status">{message}</p>
        {result && (
          <>
            <h2>{result.name}</h2>
            <p>Matrícula {result.registration}</p>
            <p>Representante Comercial Autorizado CARLA</p>
          </>
        )}
        <a href="/">Site institucional</a>
      </section>
    </main>
  );
}
