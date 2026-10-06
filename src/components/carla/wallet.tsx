import type { Profile } from "@/lib/carla";

export function CarlaWallet({
  profile,
  photo,
  qr,
}: {
  profile: Profile;
  photo: string;
  qr: string;
}) {
  const cpf = profile.document.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  return (
    <div
      className="carla-wallet"
      aria-label="Carteira CARLA: frente e verso, 8,5 por 5 centímetros cada"
    >
      <article className="carla-card carla-card-front" aria-label="Frente da carteira">
        <header className="carla-card-heading">
          <span>
            IDENTIFICAÇÃO COMERCIAL
            <br />
            <strong>REPRESENTANTE CARLA</strong>
          </span>
          <img
            className="carla-card-logo"
            src="/images/oliveira-vittae-carteira.png"
            alt="Oliveira Vittae Designer & IA"
          />
        </header>
        <div className="carla-card-front-body">
          <dl>
            <div>
              <dt>NOME</dt>
              <dd className="carla-card-name">{profile.name}</dd>
            </div>
            <div>
              <dt>CPF</dt>
              <dd>{cpf}</dd>
            </div>
            <div>
              <dt>MATRÍCULA</dt>
              <dd>{profile.registration}</dd>
            </div>
            <div>
              <dt>ATUAÇÃO</dt>
              <dd>Representante Comercial CARLA</dd>
            </div>
          </dl>
          {photo && <img className="carla-photo" src={photo} alt={`Foto de ${profile.name}`} />}
        </div>
      </article>
      <article className="carla-card carla-card-back" aria-label="Verso da carteira">
        <header className="carla-card-back-heading">
          <img className="carla-card-logo" src="/images/oliveira-vittae-carteira.png" alt="" />
          <strong>
            OLIVEIRA VITTAE
            <br />
            <span>DESIGNER & IA</span>
          </strong>
        </header>
        <div className="carla-card-back-body">
          <div>
            <strong>VERIFICAÇÃO DO VÍNCULO</strong>
            <p>Leia o QR para consultar a situação atual do representante.</p>
            <p>Identificação comercial. Não confere poderes para assinar pela empresa.</p>
            <span className="carla-card-site">oliveiravittae.ia.br</span>
          </div>
          {qr && <img className="carla-qr" src={qr} alt="QR de verificação da situação atual" />}
        </div>
      </article>
    </div>
  );
}
