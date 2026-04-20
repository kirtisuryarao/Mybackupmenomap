import React from "react";
import Link from "next/link";
import { ArrowLeft, Baby, CheckCircle2, Sparkles } from "lucide-react";

export default function OvulationBlog() {
  return (
    <div className="min-h-screen bg-[#FFFDFB] text-slate-800 font-sans">
      <nav className="border-b border-blue-100 bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/learn" className="flex items-center text-blue-600 hover:text-blue-700 transition-colors font-medium">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Library
          </Link>
          <div className="text-sm font-semibold text-slate-500 tracking-wider uppercase">
            Health Library
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12 md:py-20">
        <header className="mb-12 text-center">
          <div className="inline-flex items-center justify-center px-3 py-1 mb-6 text-sm font-medium text-blue-600 bg-blue-100 rounded-full">
            <Baby className="w-4 h-4 mr-2" />
            Fertility
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 leading-tight mb-6 tracking-tight">
            Ovulation & The Fertile Window
          </h1>
          <p className="text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto">
            How to identify your fertile window, understand ovulation signs, and time things right.
          </p>
        </header>

        <div className="w-full h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent mb-12"></div>

        <article className="prose prose-lg prose-blue prose-headings:font-bold prose-headings:text-slate-900 max-w-none">
          <p className="lead text-xl text-slate-700 font-medium">
            Getting pregnant (or avoiding it) is all about timing. Understanding your fertile window is the most important step.
          </p>
          <p>
            Ovulation happens when a mature egg is released from your ovary. Once released, the egg only lives for 12 to 24 hours. 
          </p>

          <h2 className="text-3xl mt-12 mb-6">What is the Fertile Window?</h2>
          <p>
            While the egg only lives for a day, sperm can survive inside the female body for up to 5 days. Because of this, your "fertile window" is actually about 6 days long: the 5 days leading up to ovulation, plus the day of ovulation itself.
          </p>

          <div className="bg-blue-50 p-8 rounded-3xl my-10">
            <h3 className="text-2xl font-bold mt-0 mb-6 text-blue-950">Signs You Might Be Ovulating</h3>
            <ul className="list-none pl-0 space-y-4 mt-0">
              <li className="flex items-start">
                <CheckCircle2 className="w-6 h-6 text-blue-500 mr-3 shrink-0 mt-0.5"/> 
                <div>
                  <strong>Changes in discharge:</strong> Cervical fluid becomes clear, stretchy, and slippery (like raw egg whites).
                </div>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="w-6 h-6 text-blue-500 mr-3 shrink-0 mt-0.5"/> 
                <div>
                  <strong>Slight pain:</strong> You might feel a mild twinge or cramp on one side of your lower abdomen (called mittelschmerz).
                </div>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="w-6 h-6 text-blue-500 mr-3 shrink-0 mt-0.5"/> 
                <div>
                  <strong>Basal Body Temperature shift:</strong> Your resting body temperature rises slightly just after ovulation.
                </div>
              </li>
            </ul>
          </div>

          <hr className="my-12 border-blue-100" />

          <div className="not-prose bg-gradient-to-br from-blue-500 to-cyan-600 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
            <Sparkles className="absolute top-4 right-4 w-24 h-24 text-white opacity-10" />
            <h3 className="text-2xl font-bold mt-0 mb-4 text-white">Find your window in MenoMap</h3>
            <p className="text-blue-50 mb-6 font-medium">
              MenoMap automatically calculates your predicted ovulation day and highlights your 6-day fertile window on your calendar.
            </p>
            <Link href="/calendar" className="inline-block bg-white text-blue-600 font-bold px-6 py-3 rounded-xl hover:bg-blue-50 transition-colors shadow-sm">
              View Calendar
            </Link>
          </div>
        </article>
      </main>
    </div>
  );
}
