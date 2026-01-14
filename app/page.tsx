import { Navbar } from "./components/navbar";
import { SearchMapSection } from "./components/sections/search-map";
import { Services } from "./components/sections/services";
import { HowItWorks } from "./components/sections/how-it-works";
import { Testimonials } from "./components/sections/testimonials";
import { Stats } from "./components/sections/stats";
import { FAQ } from "./components/sections/faq";
import { CTA } from "./components/sections/cta";
import { Footer } from "./components/footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <SearchMapSection />
        <Services />
        <HowItWorks />
        <Testimonials />
        <Stats />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
