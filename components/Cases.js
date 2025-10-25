export default function Cases() {
  return (
    <section className="cases-carousel">
      <h2>Casos Reais de Sucesso</h2>
      <div className="cases-list">
        <div className="case">
          <h3>📌 Caso Real: Digitação de Dados de Planilha</h3>
          <ul>
            <li>
              ⏱️ Eliminamos <strong>30 horas</strong> de digitação manual (950
              linhas digitadas em 100 minutos vs. 1900 minutos manuais)
            </li>
            <li>✅ Eliminação de erros humanos na transcrição de dados</li>
            <li>
              👥 Equipe administrativa recuperou tempo para tarefas estratégicas
            </li>
            <li>
              🔗{" "}
              <a
                href="https://www.youtube.com/watch?v=VIDEO_ID"
                target="_blank"
                style={{ color: "#1a73e8", textDecoration: "none" }}
              >
                Assista ao vídeo do caso
              </a>
            </li>
          </ul>
        </div>
        <div className="case">
          <h3>📌 Caso Real: Sistema de Inventário de Bens Patrimoniais</h3>
          <ul>
            <li>🔐 Sistema completo com login e controle de acesso seguro</li>
            <li>
              📊 Dashboard e relatórios para gestão profissional de inventário
            </li>
            <li>
              ✅ Simplificação e profissionalização do trabalho de inventário de
              bens
            </li>
            <li>
              🔗{" "}
              <a
                href="https://inventario-tiago.vercel.app"
                target="_blank"
                style={{ color: "#1a73e8", textDecoration: "none" }}
              >
                Acesse o sistema: inventario-tiago.vercel.app
              </a>
            </li>
          </ul>
        </div>
        {/* Galeria de imagens ainda não tem fotos - ocultar temporariamente
        <div className="case">
          <h3>📌 Caso Real: Salvamento de Memórias em Grupo de WhatsApp</h3>
          <ul>
            <li>
              💾 Salvamento seguro de centenas de fotos e vídeos de amigos que
              não se viam há 45 anos
            </li>
            <li>✅ Criação de galeria informatizada permanente e acessível</li>
            <li>
              👥 Grupo pode continuar compartilhando memórias sem risco de
              perdas
            </li>
            <li>
              🔗{" "}
              <a
                href="https://galeria.admtiago.com.br"
                target="_blank"
                style={{ color: "#1a73e8", textDecoration: "none" }}
              >
                Acesse a galeria: galeria.admtiago.com.br
              </a>
            </li>
          </ul>
        </div>
        */}
      </div>
    </section>
  );
}
