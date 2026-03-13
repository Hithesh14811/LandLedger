import { useState } from 'react';
import {
  Scissors, MapPin, AlertTriangle, CheckCircle, FileText,
  Plus, Trash2, Building2, ArrowLeft
} from 'lucide-react';
import { useStore } from '../store';
import type { GeoPolygon } from '../types';

interface SubdividePropertyPageProps {
  onNavigate: (page: string) => void;
}

export function SubdividePropertyPage({ onNavigate }: SubdividePropertyPageProps) {
  const { currentUser, properties, initiateSubdivision, getPropertiesForUser } = useStore();

  const [selectedProperty, setSelectedProperty] = useState('');
  const [parcels, setParcels] = useState<{ name: string; polygon: string }[]>([
    { name: 'Parcel A', polygon: '' },
    { name: 'Parcel B', polygon: '' }
  ]);
  const [surveyDocument, setSurveyDocument] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!currentUser) {
    return (
      <div className="text-center py-12">
        <Scissors className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <p className="text-slate-400 mb-4">Please login to subdivide properties</p>
        <button onClick={() => onNavigate('login')} className="text-emerald-400 hover:underline">
          Go to Login
        </button>
      </div>
    );
  }

  const userProperties = getPropertiesForUser(currentUser.walletAddress)
    .filter(p => p.status === 'active');

  const property = properties.find(p => p.propertyID === selectedProperty);

  const addParcel = () => {
    const newName = `Parcel ${String.fromCharCode(65 + parcels.length)}`;
    setParcels([...parcels, { name: newName, polygon: '' }]);
  };

  const removeParcel = (index: number) => {
    if (parcels.length > 2) {
      setParcels(parcels.filter((_, i) => i !== index));
    }
  };

  const updateParcel = (index: number, field: 'name' | 'polygon', value: string) => {
    setParcels(parcels.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const generateSampleParcelPolygon = (parentPolygon: GeoPolygon, index: number, total: number): GeoPolygon => {
    const coords = parentPolygon.coordinates[0];
    const minLng = Math.min(...coords.map(c => c[0]));
    const maxLng = Math.max(...coords.map(c => c[0]));
    const minLat = Math.min(...coords.map(c => c[1]));
    const maxLat = Math.max(...coords.map(c => c[1]));
    
    const width = (maxLng - minLng) / total;
    const startLng = minLng + (index * width);
    const endLng = startLng + width;
    
    return {
      type: 'Polygon',
      coordinates: [[
        [startLng, minLat],
        [endLng, minLat],
        [endLng, maxLat],
        [startLng, maxLat],
        [startLng, minLat]
      ]]
    };
  };

  const autoFillParcels = () => {
    if (!property) return;
    
    const newParcels = parcels.map((p, index) => ({
      ...p,
      polygon: JSON.stringify(generateSampleParcelPolygon(property.boundaryPolygon, index, parcels.length), null, 2)
    }));
    setParcels(newParcels);
  };

  const handleSubmit = async () => {
    setError('');
    
    if (!selectedProperty) {
      setError('Please select a property to subdivide');
      return;
    }

    if (parcels.some(p => !p.polygon.trim())) {
      setError('Please provide boundary polygons for all parcels');
      return;
    }

    if (!surveyDocument.trim()) {
      setError('Please provide a survey document');
      return;
    }

    setIsSubmitting(true);

    try {
      // Parse polygons
      const childPolygons: GeoPolygon[] = parcels.map(p => JSON.parse(p.polygon));

      await new Promise(resolve => setTimeout(resolve, 2000));

      const result = initiateSubdivision(selectedProperty, childPolygons, surveyDocument);

      if ('error' in result) {
        setError(result.error);
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError('Invalid polygon format. Please use valid GeoJSON.');
    }

    setIsSubmitting(false);
  };

  if (success) {
    return (
      <div className="max-w-xl mx-auto text-center py-12">
        <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-4">Subdivision Request Submitted</h2>
        <p className="text-slate-400 mb-6">
          Your subdivision request has been submitted for authority review.
          You will be notified once it's approved.
        </p>
        <div className="p-4 bg-slate-800/50 rounded-xl mb-6">
          <p className="text-sm text-slate-400">Property</p>
          <p className="text-white font-mono">{selectedProperty}</p>
          <p className="text-sm text-slate-400 mt-2">New Parcels</p>
          <p className="text-white">{parcels.length} parcels</p>
        </div>
        <button
          onClick={() => onNavigate('dashboard')}
          className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => onNavigate('dashboard')}
          className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Scissors className="w-8 h-8 text-orange-400" />
            Subdivide Property
          </h1>
          <p className="text-slate-400">Split a property into multiple parcels</p>
        </div>
      </div>

      {/* Select Property */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-blue-400" />
          Select Property
        </h2>

        {userProperties.length === 0 ? (
          <div className="text-center py-8">
            <Building2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">You have no active properties to subdivide</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {userProperties.map(prop => (
              <button
                key={prop.propertyID}
                onClick={() => setSelectedProperty(prop.propertyID)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  selectedProperty === prop.propertyID
                    ? 'border-orange-500 bg-orange-500/10'
                    : 'border-slate-700 hover:border-slate-600'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="font-medium text-white">{prop.propertyID}</span>
                  {selectedProperty === prop.propertyID && (
                    <CheckCircle className="w-5 h-5 text-orange-400" />
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
                  <MapPin className="w-4 h-4" />
                  {prop.location}
                </div>
                <div className="text-sm text-slate-500">
                  {prop.areaSquareMeters.toLocaleString()} m²
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Define Parcels */}
      {selectedProperty && (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Scissors className="w-5 h-5 text-orange-400" />
              Define New Parcels
            </h2>
            <div className="flex gap-2">
              <button
                onClick={autoFillParcels}
                className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Auto-Generate Polygons
              </button>
              <button
                onClick={addParcel}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-orange-500/20 text-orange-400 rounded-lg hover:bg-orange-500/30 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Parcel
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {parcels.map((parcel, index) => (
              <div key={index} className="p-4 bg-slate-700/30 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <input
                    type="text"
                    value={parcel.name}
                    onChange={(e) => updateParcel(index, 'name', e.target.value)}
                    className="px-3 py-1 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                  />
                  {parcels.length > 2 && (
                    <button
                      onClick={() => removeParcel(index)}
                      className="p-1.5 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <textarea
                  value={parcel.polygon}
                  onChange={(e) => updateParcel(index, 'polygon', e.target.value)}
                  placeholder='{"type": "Polygon", "coordinates": [[[lng, lat], ...]]}'
                  rows={4}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 font-mono text-sm focus:outline-none focus:border-orange-500"
                />
              </div>
            ))}
          </div>

          {/* Validation Info */}
          <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-sm text-blue-400 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5" />
              <span>
                The sum of all parcel areas must equal the parent property area.
                All parcels must be contained within the parent boundary and must not overlap.
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Survey Document */}
      {selectedProperty && (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            Survey Document
          </h2>
          
          <textarea
            value={surveyDocument}
            onChange={(e) => setSurveyDocument(e.target.value)}
            placeholder="Paste survey document content here or describe the subdivision survey..."
            rows={4}
            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
          
          <p className="mt-2 text-sm text-slate-500">
            The survey document will be hashed and stored on IPFS for verification.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <span className="text-red-400">{error}</span>
        </div>
      )}

      {/* Submit */}
      {selectedProperty && (
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl font-semibold text-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Processing Subdivision...
            </>
          ) : (
            <>
              <Scissors className="w-5 h-5" />
              Submit Subdivision Request
            </>
          )}
        </button>
      )}
    </div>
  );
}
