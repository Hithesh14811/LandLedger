import {
  Shield, Lock, FileCheck, Map, Users, Blocks, ArrowRight,
  CheckCircle, Globe, Key, Fingerprint, Building, Scale, Landmark
} from 'lucide-react';
import { useStore } from '../store';

interface HomePageProps {
  onNavigate: (page: string) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  const { properties, ledger, users } = useStore();

  const stats = [
    { label: 'Registered Properties', value: properties.filter(p => p.status === 'active').length, icon: Map },
    { label: 'Ledger Blocks', value: ledger.length, icon: Blocks },
    { label: 'Verified Users', value: users.filter(u => u.verified).length, icon: Users },
    { label: 'Documents Secured', value: properties.length * 2, icon: FileCheck },
  ];

  const features = [
    {
      icon: Lock,
      title: 'Cryptographic Security',
      description: 'Every transaction is signed with digital signatures and stored in an immutable hash-linked ledger.'
    },
    {
      icon: Fingerprint,
      title: 'Passkey Authentication',
      description: 'WebAuthn passkeys provide phishing-resistant, passwordless authentication for all users.'
    },
    {
      icon: Key,
      title: 'Wallet-Based Identity',
      description: 'Each user has a cryptographic wallet that proves ownership and authorizes transactions.'
    },
    {
      icon: FileCheck,
      title: 'Document Integrity',
      description: 'All documents are hashed and stored on IPFS with tamper-evident verification.'
    },
    {
      icon: Globe,
      title: 'Geospatial Verification',
      description: 'GIS-powered boundary verification prevents encroachment and overlap disputes.'
    },
    {
      icon: Shield,
      title: 'Authority Governance',
      description: 'Multi-signature approval from authorized government officials for all transactions.'
    },
  ];

  const problems = [
    'Forged land ownership documents',
    'Manual land registry corruption',
    'Double selling of property',
    'Tampering with ownership records',
    'Lack of transparent ownership history',
    'Slow property verification for buyers',
    'Boundary encroachment and disputes'
  ];

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-slate-50 rounded-3xl" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0wIDBoNDB2NDBIMHoiLz48cGF0aCBkPSJNMjAgMjBhMSAxIDAgMSAxIDAgMiAxIDEgMCAwIDEgMC0yeiIgZmlsbD0iIzk0YTNiOCIgZmlsbC1vcGFjaXR5PSIuMiIvPjwvZz48L3N2Zz4=')] opacity-50" />
        
        <div className="relative px-8 py-16 md:py-24">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium mb-8">
              <Landmark className="w-4 h-4" />
              Government of India Initiative
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-slate-900 mb-6 tracking-tight">
              LandLedger
              <span className="block text-indigo-600 mt-2">Platform</span>
            </h1>
            
            <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              A secure, transparent, and tamper-proof system for managing property ownership 
              records using blockchain technology and cryptographic verification.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => onNavigate('verify')}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-indigo-200 hover:shadow-indigo-300"
              >
                Verify a Property
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => onNavigate('ledger')}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-white hover:bg-slate-50 text-slate-700 rounded-xl font-semibold transition-all border border-slate-200 shadow-sm"
              >
                <Blocks className="w-5 h-5" />
                Explore Ledger
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-4">
                <Icon className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="text-3xl font-bold text-slate-900">{stat.value}</div>
              <div className="text-sm text-slate-500 font-medium">{stat.label}</div>
            </div>
          );
        })}
      </div>

      {/* Problems We Solve */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <Scale className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Problems We Solve</h2>
              <p className="text-sm text-slate-500">Addressing critical challenges in property registration</p>
            </div>
          </div>
        </div>
        <div className="p-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {problems.map((problem, index) => (
              <div key={index} className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span className="text-slate-700 font-medium">{problem}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div>
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-slate-900 mb-3">Platform Features</h2>
          <p className="text-slate-500 max-w-2xl mx-auto">
            Built with enterprise-grade security and designed for government-scale operations
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl flex items-center justify-center mb-5 group-hover:from-indigo-100 group-hover:to-indigo-200 transition-colors">
                  <Icon className="w-7 h-7 text-indigo-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 md:p-12 text-white">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">How It Works</h2>
          <p className="text-slate-400">Simple, secure, and transparent process</p>
        </div>
        <div className="grid md:grid-cols-4 gap-8">
          {[
            { step: 1, title: 'Authority Registration', desc: 'Land Registry Office registers citizens via Aadhaar verification' },
            { step: 2, title: 'Property Submission', desc: 'Authority uploads documents and defines property boundaries' },
            { step: 3, title: 'Verification', desc: 'System validates coordinates and checks for duplicates' },
            { step: 4, title: 'Ledger Record', desc: 'Transaction permanently recorded in blockchain ledger' },
          ].map((item, idx) => (
            <div key={item.step} className="relative text-center">
              <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-xl font-bold mx-auto mb-5 shadow-lg shadow-indigo-500/30">
                {item.step}
              </div>
              <h3 className="text-white font-bold mb-2 text-lg">{item.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
              {idx < 3 && (
                <div className="hidden md:block absolute top-7 left-[60%] w-[80%] h-px bg-gradient-to-r from-indigo-500 to-transparent" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-gradient-to-br from-indigo-50 to-white rounded-3xl p-12 text-center border border-indigo-100">
        <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-200">
          <Building className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-slate-900 mb-4">Ready to Get Started?</h2>
        <p className="text-slate-500 mb-8 max-w-lg mx-auto">
          Visit your nearest Land Registry Office to register and start managing your property records securely.
        </p>
        <button
          onClick={() => onNavigate('login')}
          className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-indigo-200"
        >
          <Shield className="w-5 h-5" />
          Sign In to Your Account
        </button>
      </div>
    </div>
  );
}
