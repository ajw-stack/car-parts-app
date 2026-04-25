import Header from "../components/Header";
import Footer from "../components/Footer";

export default function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F3F4F6]">
      <Header />

      <main className="flex-1 w-full bg-white">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <h1 className="text-3xl font-semibold tracking-tight text-[#1F2937]">Contact</h1>
          <p className="mt-2 text-sm text-[#374151]">Get in touch with us.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
