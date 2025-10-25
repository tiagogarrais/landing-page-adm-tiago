import Head from "next/head";
import Header from "../components/Header";
import Hero from "../components/Hero";
import Cases from "../components/Cases";
import ScreensCarousel from "../components/ScreensCarousel";
import Form from "../components/Form";
import Footer from "../components/Footer";

export default function Home() {
  return (
    <>
      <Head>
        <title>Problemas de Gestão? Eu Resolvo com Tecnologia</title>
        <meta
          name="description"
          content="Administrador com 10+ anos de experiência que resolve problemas de gestão com sistemas web customizados. Automatize processos, elimine retrabalho e recupere horas da sua equipe."
        />
        <meta
          property="og:title"
          content="Problemas de gestão? Eu resolvo com tecnologia — sem ser técnico."
        />
        <meta
          property="og:description"
          content="Sou Administrador e programador. Uso código como ferramenta para eliminar gargalos operacionais na sua empresa ou órgão público."
        />
        <meta property="og:type" content="website" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <div className="container">
        <Header />
        <main>
          <Hero />
          <Cases />
          {/* Carrossel de telas oculto temporariamente - implementar depois
          <ScreensCarousel />
          */}
          <Form />
        </main>
        <Footer />
      </div>
    </>
  );
}
