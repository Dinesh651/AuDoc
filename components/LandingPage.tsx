
import React from 'react';

interface LandingPageProps {
  onLogin: () => void;
}

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({ icon, title, description }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
    <div className="w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center mb-4 text-indigo-600">
      {icon}
    </div>
    <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
    <p className="text-slate-600 text-sm leading-relaxed">{description}</p>
  </div>
);

const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Navbar */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-1.5 rounded-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <span className="text-2xl font-bold text-slate-800 tracking-tight">AuDoc</span>
        </div>
        <button 
            onClick={onLogin}
            className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors"
        >
            Sign In
        </button>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 leading-[1.1]">
              Audit Documentation, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                Simplified.
              </span>
            </h1>
            <p className="text-lg text-slate-600 max-w-lg leading-relaxed">
              A secure, cloud-based platform to manage audit engagements from planning to reporting. Compliant with Nepal Standards on Auditing (NSAs).
            </p>
            
            <button
              onClick={onLogin}
              className="group flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-full font-semibold hover:bg-slate-800 transition-all transform hover:-translate-y-1 hover:shadow-xl"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Get Started with Google
            </button>
            
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white"></div>
                <div className="w-8 h-8 rounded-full bg-slate-300 border-2 border-white"></div>
                <div className="w-8 h-8 rounded-full bg-slate-400 border-2 border-white"></div>
              </div>
              <p>Join hundreds of auditors streamlining their workflow.</p>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-100 to-purple-100 rounded-2xl transform rotate-3 scale-105 -z-10 opacity-50"></div>
            <div className="bg-white rounded-2xl shadow-2xl p-8 border border-slate-100">
               <div className="space-y-6">
                   <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                       <div className="flex items-center gap-3">
                           <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold">ABC</div>
                           <div>
                               <h4 className="font-bold text-slate-800">ABC Pvt Ltd</h4>
                               <p className="text-xs text-slate-500">FY 2080/81</p>
                           </div>
                       </div>
                       <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">In Progress</span>
                   </div>
                   
                   <div className="space-y-3">
                       <div className="h-2 bg-slate-100 rounded-full w-full overflow-hidden">
                           <div className="h-full bg-indigo-500 w-2/3 rounded-full"></div>
                       </div>
                       <div className="flex justify-between text-xs text-slate-500">
                           <span>Planning</span>
                           <span>Execution</span>
                           <span>Reporting</span>
                       </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                       <div className="p-3 bg-slate-50 rounded-lg">
                           <p className="text-xs text-slate-500">Materiality</p>
                           <p className="font-bold text-slate-800">NPR 1.2M</p>
                       </div>
                       <div className="p-3 bg-slate-50 rounded-lg">
                           <p className="text-xs text-slate-500">Risk Level</p>
                           <p className="font-bold text-orange-600">Moderate</p>
                       </div>
                   </div>
               </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-24 grid md:grid-cols-3 gap-8">
          <FeatureCard 
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
            title="Standardized Workflows"
            description="Pre-built templates and checklists aligned with NSA 200-700 series to ensure full compliance."
          />
          <FeatureCard 
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
            title="Collaborative Evidence"
            description="Upload documents, perform calculations, and track audit evidence in a unified workspace."
          />
          <FeatureCard 
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
            title="Automated Reporting"
            description="Generate professional Independent Auditor's Reports (Word/PDF) with a single click."
          />
        </div>
      </main>
      
      <footer className="border-t border-slate-200 py-8 mt-12 text-center text-slate-500 text-sm">
        &copy; {new Date().getFullYear()} AuDoc. All rights reserved.
      </footer>
    </div>
  );
};

export default LandingPage;
