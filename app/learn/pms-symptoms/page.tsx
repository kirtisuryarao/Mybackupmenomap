import { ArrowLeft, Brain, CheckCircle2, Sparkles } from "lucide-react";
import Link from "next/link";
import React from "react";

export default function PMSBlog() {
  return (
    <div className="min-h-screen bg-[#FFFDFB] text-slate-800 font-sans">
      <nav className="border-b border-rose-100 bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/learn" className="flex items-center text-purple-600 hover:text-purple-700 transition-colors font-medium">
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
          <div className="inline-flex items-center justify-center px-3 py-1 mb-6 text-sm font-medium text-purple-600 bg-purple-100 rounded-full">
            <Brain className="w-4 h-4 mr-2" />
            Wellness
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 leading-tight mb-6 tracking-tight">
            Understanding PMS Symptoms
          </h1>
          <p className="text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Why PMS happens, common emotional and physical symptoms, and actionable ways to manage them.
          </p>
        </header>

        <div className="w-full h-px bg-gradient-to-r from-transparent via-purple-200 to-transparent mb-12"></div>

        <article className="prose prose-lg prose-purple prose-headings:font-bold prose-headings:text-slate-900 max-w-none">
          <p className="lead text-xl text-slate-700 font-medium">
            Premenstrual Syndrome (PMS) is incredibly common, but that doesn't mean you just have to "deal with it." 
          </p>
          <p>
            Up to 80% of menstruating individuals experience some form of PMS. The symptoms typically show up 5 to 11 days before your period starts and magically vanish once bleeding begins.
          </p>

          <h2 className="text-3xl mt-12 mb-6">Why does PMS happen?</h2>
          <p>
            Researchers believe PMS is caused by the dramatic drop in estrogen and progesterone levels that happens after ovulation if you don't get pregnant. 
          </p>
          <p>
            These hormonal changes can influence serotonin levels in your brain (the "happy" chemical), leading to mood swings, irritability, and food cravings.
          </p>

          <div className="bg-purple-50 p-8 rounded-3xl my-10">
            <h3 className="text-2xl font-bold mt-0 mb-6 text-purple-950">Top Ways to Manage PMS</h3>
            <ul className="list-none pl-0 space-y-4 mt-0">
              <li className="flex items-start">
                <CheckCircle2 className="w-6 h-6 text-purple-500 mr-3 shrink-0 mt-0.5"/> 
                <div>
                  <strong>Boost your magnesium:</strong> Dark chocolate, spinach, and nuts can help reduce cramps and breast tenderness.
                </div>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="w-6 h-6 text-purple-500 mr-3 shrink-0 mt-0.5"/> 
                <div>
                  <strong>Keep moving:</strong> Light exercise like walking or cycling releases endorphins that act as natural painkillers.
                </div>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="w-6 h-6 text-purple-500 mr-3 shrink-0 mt-0.5"/> 
                <div>
                  <strong>Reduce salt and caffeine:</strong> This can significantly reduce bloating and breast pain.
                </div>
              </li>
            </ul>
          </div>

          <hr className="my-12 border-purple-100" />

          <div className="not-prose bg-gradient-to-br from-purple-500 to-indigo-600 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
            <Sparkles className="absolute top-4 right-4 w-24 h-24 text-white opacity-10" />
            <h3 className="text-2xl font-bold mt-0 mb-4 text-white">Track PMS in MenoMap</h3>
            <p className="text-purple-50 mb-6 font-medium">
              Start logging your mood and physical symptoms daily. MenoMap will soon be able to predict your PMS days before they happen, so you can plan self-care in advance!
            </p>
            <Link href="/tracking" className="inline-block bg-white text-purple-600 font-bold px-6 py-3 rounded-xl hover:bg-purple-50 transition-colors shadow-sm">
              Log Symptoms Now
            </Link>
          </div>
        </article>
      </main>
    </div>
  );
}
