import { ArrowLeft, BookOpen, HeartPulse, Brain, Baby, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";
import React from "react";

export default function LearnLibrary() {
  const articles = [
    {
      title: "The Menstrual Cycle Explained",
      description: "Everything you need to know about your body's monthly rhythm, from hormones to the four distinct phases.",
      icon: <HeartPulse className="w-6 h-6 text-rose-500" />,
      href: "/learn/menstrual-cycle",
      tag: "Basics",
      color: "bg-rose-50",
      tagColor: "bg-rose-100 text-rose-600"
    },
    {
      title: "Understanding PMS Symptoms",
      description: "Why PMS happens, common emotional and physical symptoms, and actionable ways to manage them.",
      icon: <Brain className="w-6 h-6 text-purple-500" />,
      href: "/learn/pms-symptoms",
      tag: "Wellness",
      color: "bg-purple-50",
      tagColor: "bg-purple-100 text-purple-600"
    },
    {
      title: "Ovulation & Fertility Window",
      description: "How to identify your fertile window, understand ovulation signs, and time things right.",
      icon: <Baby className="w-6 h-6 text-blue-500" />,
      href: "/learn/ovulation-fertility",
      tag: "Fertility",
      color: "bg-blue-50",
      tagColor: "bg-blue-100 text-blue-600"
    }
  ];

  return (
    <div className="min-h-screen bg-[#FFFDFB] text-slate-800 font-sans">
      {/* Navigation */}
      <nav className="border-b border-rose-100 bg-white sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/home" className="flex items-center text-rose-600 hover:text-rose-700 transition-colors font-medium">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          <div className="text-sm font-semibold text-slate-500 tracking-wider uppercase">
            MenoMap Library
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-12 md:py-20">
        <header className="mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 leading-tight mb-4 tracking-tight flex items-center">
            <BookOpen className="w-10 h-10 mr-4 text-rose-500" />
            Health Library
          </h1>
          <p className="text-xl text-slate-600 leading-relaxed max-w-2xl">
            Explore our collection of science-backed, easy-to-read articles designed to help you understand your body better.
          </p>
        </header>

        <div className="w-full h-px bg-gradient-to-r from-rose-200 via-transparent to-transparent mb-12"></div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article, idx) => (
            <Link key={idx} href={article.href} className="group block h-full">
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all duration-300 h-full flex flex-col hover:-translate-y-1">
                <div className={`w-12 h-12 rounded-2xl ${article.color} flex items-center justify-center mb-6`}>
                  {article.icon}
                </div>
                
                <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${article.tagColor} mb-4 w-max`}>
                  {article.tag}
                </div>
                
                <h2 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-rose-600 transition-colors">
                  {article.title}
                </h2>
                
                <p className="text-slate-600 mb-6 flex-grow">
                  {article.description}
                </p>
                
                <div className="flex items-center text-sm font-bold text-slate-400 group-hover:text-rose-500 transition-colors mt-auto">
                  Read Article <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Feature Promo */}
        <div className="mt-16 bg-gradient-to-br from-rose-500 to-pink-600 rounded-3xl p-8 md:p-12 text-white shadow-lg relative overflow-hidden flex flex-col md:flex-row items-center justify-between">
          <Sparkles className="absolute top-4 right-4 w-32 h-32 text-white opacity-10" />
          <div className="md:w-2/3 z-10 relative">
            <h3 className="text-2xl md:text-3xl font-bold mt-0 mb-4 text-white">Track what you learn</h3>
            <p className="text-rose-50 text-lg mb-6 md:mb-0">
              Reading about it is great, but seeing your own body's patterns is even better. Log your daily symptoms in MenoMap to personalize your experience.
            </p>
          </div>
          <div className="md:w-1/3 flex justify-end z-10 relative">
            <Link href="/tracking" className="bg-white text-rose-600 font-bold px-8 py-4 rounded-xl hover:bg-rose-50 transition-colors shadow-sm w-full text-center md:w-auto">
              Start Tracking
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
