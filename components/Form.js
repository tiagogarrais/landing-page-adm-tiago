import { useState } from "react";

export default function Form() {
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    problema: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const sendToWhatsApp = (e) => {
    e.preventDefault();
    const { nome, email, problema } = formData;
    const message = `Olá, meu nome é ${nome}.\nEmail: ${email}\nProblema: ${problema}`;
    const url = `https://wa.me/5588997230866?text=${encodeURIComponent(
      message
    )}`;
    window.location.href = url;
  };

  return (
    <section className="form-section">
      <h2>Descreva seu problema de gestão — não sua ideia de sistema.</h2>
      <form onSubmit={sendToWhatsApp}>
        <input
          type="text"
          id="nome"
          placeholder="Seu nome"
          required
          value={formData.nome}
          onChange={handleChange}
        />
        <input
          type="email"
          id="email"
          placeholder="Seu e-mail profissional"
          required
          value={formData.email}
          onChange={handleChange}
        />
        <textarea
          id="problema"
          placeholder="Ex: 'Perco 15h por semana conferindo planilhas de estoque' ou 'Meu time gasta dias gerando relatórios manuais'..."
          required
          value={formData.problema}
          onChange={handleChange}
        ></textarea>
        <button type="submit" className="btn">
          Solicitar análise
        </button>
      </form>
    </section>
  );
}
