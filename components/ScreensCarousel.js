import { useState } from "react";

export default function ScreensCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const totalItems = 2;

  const moveSlide = (direction) => {
    setCurrentIndex((prevIndex) => {
      let newIndex = prevIndex + direction;
      if (newIndex < 0) newIndex = totalItems - 1;
      if (newIndex >= totalItems) newIndex = 0;
      return newIndex;
    });
  };

  return (
    <section className="carousel">
      <div
        className="carousel-inner"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        <div className="carousel-item">
          <img
            src="https://via.placeholder.com/400"
            alt="Sistema de Gestão Escolar"
          />
        </div>
        {/* Temporariamente oculto - Controle de Processos Internos
        <div className="carousel-item">
          <img src="https://via.placeholder.com/400" alt="Controle de Processos Internos" />
        </div>
        */}
        <div className="carousel-item">
          <img
            src="https://via.placeholder.com/400"
            alt="Plataforma de Atendimento Público"
          />
        </div>
      </div>
      <button className="carousel-btn prev" onClick={() => moveSlide(-1)}>
        ‹
      </button>
      <button className="carousel-btn next" onClick={() => moveSlide(1)}>
        ›
      </button>
    </section>
  );
}
