import React from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, HeartPulse, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";

export default function MenstrualCycleBlog() {
  return (
    <div className="min-h-screen bg-[#FFFDFB] text-slate-800 font-sans">
      {/* Navigation */}
      <nav className="border-b border-rose-100 bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center text-rose-600 hover:text-rose-700 transition-colors font-medium">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to MenoMap
          </Link>
          <div className="text-sm font-semibold text-slate-500 tracking-wider uppercase">
            Health Library
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12 md:py-20">
        {/* Title Section */}
        <header className="mb-12 text-center">
          <div className="inline-flex items-center justify-center px-3 py-1 mb-6 text-sm font-medium text-rose-600 bg-rose-100 rounded-full">
            <BookOpen className="w-4 h-4 mr-2" />
            Basics
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 leading-tight mb-6 tracking-tight">
            The Menstrual Cycle Explained
          </h1>
          <p className="text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Everything you need to know about your body's monthly rhythm, from hormones to the four distinct phases.
          </p>
        </header>

        <div className="w-full h-px bg-gradient-to-r from-transparent via-rose-200 to-transparent mb-12"></div>

        {/* Content Body */}
        <article className="prose prose-lg prose-rose prose-headings:font-bold prose-headings:text-slate-900 max-w-none">
          
          {/* Introduction */}
          <p className="lead text-xl text-slate-700 font-medium">
            The menstrual cycle is a lot more than just having a period. It's a complex, beautifully orchestrated series of events happening inside your body.
          </p>
          <p>
            Understanding your cycle can feel like finally getting the instruction manual for your body. It helps you make sense of why your energy levels shift, why your mood changes, and when you might need extra rest. 
          </p>
          <p>
            Think of your cycle as a vital sign. Just like your heart rate or blood pressure, your menstrual cycle gives you important clues about your overall health.
          </p>

          {/* Main Sections */}
          <h2 className="text-3xl mt-12 mb-6 flex items-center">
            <HeartPulse className="w-8 h-8 mr-3 text-rose-500" />
            What is the Menstrual Cycle?
          </h2>
          <p>
            The menstrual cycle is your body’s way of preparing for a possible pregnancy each month. It involves changes in your hormones, your ovaries, and your uterus.
          </p>
          <p>
            A full cycle starts on the first day of your period and ends the day before your next period begins. While 28 days is the average, a healthy cycle can be anywhere from 21 to 35 days long.
          </p>

          <h2 className="text-3xl mt-12 mb-6">The Four Phases of Your Cycle</h2>
          <p>
            Your cycle doesn't just have one phase—it has four. Each phase brings different hormonal shifts.
          </p>

          <div className="grid gap-6 my-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-rose-100 border-l-4 border-l-red-500">
              <h3 className="text-xl font-bold mt-0 mb-2">1. Menstruation (Days 1–5)</h3>
              <p className="mb-0 text-slate-600">Your period. Estrogen and progesterone levels drop, causing the lining of your uterus to shed. Energy is often lowest here.</p>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-rose-100 border-l-4 border-l-pink-400">
              <h3 className="text-xl font-bold mt-0 mb-2">2. Follicular Phase (Days 1–13)</h3>
              <p className="mb-0 text-slate-600">Overlaps with your period. Estrogen slowly rises to thicken the uterine lining and prepare an egg. You may feel more energetic and focused.</p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-rose-100 border-l-4 border-l-yellow-400">
              <h3 className="text-xl font-bold mt-0 mb-2">3. Ovulation (Around Day 14)</h3>
              <p className="mb-0 text-slate-600">An egg is released from the ovary. Estrogen and testosterone peak. You might feel highly social, confident, and energetic.</p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-rose-100 border-l-4 border-l-purple-400">
              <h3 className="text-xl font-bold mt-0 mb-2">4. Luteal Phase (Days 15–28)</h3>
              <p className="mb-0 text-slate-600">Progesterone rises. If pregnancy doesn't occur, hormones drop sharply, which can trigger PMS. You might crave comfort and quiet time.</p>
            </div>
          </div>

          <h2 className="text-3xl mt-12 mb-6">How It Affects Your Body</h2>
          <p>
            Hormonal shifts do more than manage reproduction. They impact your brain chemistry, metabolism, and immune system.
          </p>
          <p>
            You might notice changes in your skin, hair texture, sleep patterns, and digestion throughout the month. This is completely normal and entirely driven by the ebb and flow of estrogen and progesterone.
          </p>

          {/* Bullet Sections */}
          <div className="bg-rose-50 p-8 rounded-3xl my-10">
            <h3 className="text-2xl font-bold mt-0 mb-6 text-rose-950">Common Signs of Cycle Changes</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-bold text-rose-900 mb-3 flex items-center">
                  <span className="w-2 h-2 rounded-full bg-rose-500 mr-2"></span>
                  Physical Symptoms
                </h4>
                <ul className="list-none pl-0 space-y-2 mt-0">
                  <li className="flex items-start"><CheckCircle2 className="w-5 h-5 text-rose-400 mr-2 shrink-0 mt-0.5"/> Breast tenderness</li>
                  <li className="flex items-start"><CheckCircle2 className="w-5 h-5 text-rose-400 mr-2 shrink-0 mt-0.5"/> Mild cramps or backache</li>
                  <li className="flex items-start"><CheckCircle2 className="w-5 h-5 text-rose-400 mr-2 shrink-0 mt-0.5"/> Changes in vaginal discharge</li>
                  <li className="flex items-start"><CheckCircle2 className="w-5 h-5 text-rose-400 mr-2 shrink-0 mt-0.5"/> Bloating or digestion changes</li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-rose-900 mb-3 flex items-center">
                  <span className="w-2 h-2 rounded-full bg-rose-500 mr-2"></span>
                  Emotional Changes
                </h4>
                <ul className="list-none pl-0 space-y-2 mt-0">
                  <li className="flex items-start"><CheckCircle2 className="w-5 h-5 text-rose-400 mr-2 shrink-0 mt-0.5"/> Shifts in energy levels</li>
                  <li className="flex items-start"><CheckCircle2 className="w-5 h-5 text-rose-400 mr-2 shrink-0 mt-0.5"/> Increased focus before ovulation</li>
                  <li className="flex items-start"><CheckCircle2 className="w-5 h-5 text-rose-400 mr-2 shrink-0 mt-0.5"/> Need for extra rest pre-period</li>
                  <li className="flex items-start"><CheckCircle2 className="w-5 h-5 text-rose-400 mr-2 shrink-0 mt-0.5"/> Mild mood swings</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Myths vs Facts */}
          <h2 className="text-3xl mt-12 mb-6">Myths vs. Facts</h2>
          
          <div className="space-y-6 my-8">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="md:w-1/2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 block">The Myth</span>
                  <p className="font-medium text-slate-700 m-0">"Your cycle should always be exactly 28 days."</p>
                </div>
                <div className="hidden md:block w-px bg-slate-200"></div>
                <div className="md:w-1/2">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-500 mb-1 block">The Fact</span>
                  <p className="font-medium text-rose-900 m-0">Normal cycles vary between 21 and 35 days, and can fluctuate slightly month to month.</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="md:w-1/2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 block">The Myth</span>
                  <p className="font-medium text-slate-700 m-0">"You can't get pregnant while on your period."</p>
                </div>
                <div className="hidden md:block w-px bg-slate-200"></div>
                <div className="md:w-1/2">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-500 mb-1 block">The Fact</span>
                  <p className="font-medium text-rose-900 m-0">It's unlikely, but sperm can live up to 5 days. If you have a short cycle, it's possible.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Practical Advice */}
          <h2 className="text-3xl mt-12 mb-6">Supporting Your Body</h2>
          <p>
            You can't control your hormones, but you can work with them instead of fighting against them.
          </p>
          <ul className="space-y-3">
            <li><strong>Track your cycle:</strong> Knowledge is power. Logging your periods helps you predict future dates and spot irregularities.</li>
            <li><strong>Adjust your workouts:</strong> Try gentle yoga during menstruation and save high-intensity workouts for ovulation.</li>
            <li><strong>Prioritize sleep:</strong> During the late luteal phase (just before your period), your body temperature drops slightly and sleep can be disrupted. Aim for extra rest.</li>
          </ul>

          {/* When to seek help */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 my-10 flex items-start">
            <AlertCircle className="w-6 h-6 text-amber-600 mr-4 shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-bold text-amber-900 mt-0 mb-2">When to seek medical help</h3>
              <p className="text-amber-800 text-sm mb-0">
                Talk to a healthcare provider if your periods suddenly stop for more than 90 days, become extremely irregular, or if your bleeding is so heavy that you soak through a pad or tampon every hour. Severe pain that interrupts your daily life is not normal and should be checked.
              </p>
            </div>
          </div>

          {/* Conclusion */}
          <h2 className="text-3xl mt-12 mb-6">The Bottom Line</h2>
          <p>
            Your menstrual cycle is a natural, healthy process. By understanding the four phases, you can give yourself grace when your energy drops and harness your productivity when your hormones peak. 
          </p>
          <p>
            Listen to your body. It usually tells you exactly what it needs.
          </p>

          <hr className="my-12 border-rose-100" />

          {/* Bonus MenoMap Section */}
          <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
            <Sparkles className="absolute top-4 right-4 w-24 h-24 text-white opacity-10" />
            <h3 className="text-2xl font-bold mt-0 mb-4 text-white">How to track this in MenoMap</h3>
            <p className="text-rose-50 mb-6 font-medium">
              Ready to understand your unique rhythm? MenoMap makes it incredibly simple to turn this knowledge into actionable insights.
            </p>
            <ul className="list-none pl-0 space-y-4 text-white/90">
              <li className="flex items-center">
                <div className="bg-white/20 rounded-full w-8 h-8 flex items-center justify-center mr-3 font-bold text-sm shrink-0">1</div>
                Log your period start date to accurately predict your next phase.
              </li>
              <li className="flex items-center">
                <div className="bg-white/20 rounded-full w-8 h-8 flex items-center justify-center mr-3 font-bold text-sm shrink-0">2</div>
                Track daily symptoms like mood and cramps to see personal patterns over time.
              </li>
              <li className="flex items-center">
                <div className="bg-white/20 rounded-full w-8 h-8 flex items-center justify-center mr-3 font-bold text-sm shrink-0">3</div>
                Check your personalized dashboard to know exactly which phase you are in right now.
              </li>
            </ul>
            <div className="mt-8">
              <Link href="/tracking" className="inline-block bg-white text-rose-600 font-bold px-6 py-3 rounded-xl hover:bg-rose-50 transition-colors shadow-sm">
                Start Tracking Today
              </Link>
            </div>
          </div>

        </article>
      </main>
    </div>
  );
}
