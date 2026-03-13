import React from 'react';
import { useStore } from '../store';

interface RegisterPropertyPageProps {
  onNavigate: (page: string) => void;
}

export const RegisterPropertyPage: React.FC<RegisterPropertyPageProps> = ({ onNavigate }) => {
  const { currentUser } = useStore();

  // If user is authority, redirect them to authority dashboard
  if (currentUser?.role === 'AUTHORITY') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Authority Access</h2>
          <p className="text-gray-600 mb-6">
            As an authority, you can register properties directly from the Authority Dashboard.
          </p>
          <button
            onClick={() => onNavigate('dashboard')}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
          >
            Go to Authority Dashboard
          </button>
        </div>
      </div>
    );
  }

  // For citizens, show that they cannot register properties
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Property Registration</h2>
          <p className="text-gray-600 mb-6">
            Property registration can only be done by a <strong>Land Registry Authority</strong>.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
          <h3 className="font-semibold text-blue-900 mb-3">How to Register Your Property</h3>
          <ol className="space-y-3 text-sm text-blue-800">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">1</span>
              <span>Visit your nearest Land Registry Office with original property documents</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">2</span>
              <span>Carry your Aadhaar card for identity verification</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">3</span>
              <span>Provide the original sale deed, survey map, and property certificate</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">4</span>
              <span>The authority will verify documents and register your property on the blockchain</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">5</span>
              <span>You will receive a unique Property ID and all details will be viewable in your dashboard</span>
            </li>
          </ol>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <h3 className="font-semibold text-green-900 mb-3">Required Documents</h3>
          <ul className="space-y-2 text-sm text-green-800">
            <li className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Original Sale Deed</span>
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Survey Map with Boundary Coordinates</span>
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Property Tax Receipts</span>
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Encumbrance Certificate</span>
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Aadhaar Card for Identity Verification</span>
            </li>
          </ul>
        </div>

        <div className="mt-6 flex gap-4">
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            Back to Dashboard
          </button>
          <button
            onClick={() => onNavigate('verify')}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Verify Existing Property
          </button>
        </div>
      </div>
    </div>
  );
};
