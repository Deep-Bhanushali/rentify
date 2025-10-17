'use client';

import { useState } from 'react';
import type { DamageAssessment, CreateDamageAssessmentRequest, UpdateDamageAssessmentRequest, DamagePhoto, CreateDamagePhotoRequest } from '@/types/models';

interface DamageAssessmentProps {
  productReturnId: string;
  damageAssessment?: DamageAssessment;
  onSave: (assessment: CreateDamageAssessmentRequest | UpdateDamageAssessmentRequest) => void;
  onAddPhoto: (photo: CreateDamagePhotoRequest) => void;
  onRemovePhoto: (photoId: string) => void;
  editable?: boolean;
}

const damageTypes = [
  { id: 'scratches', name: 'Scratches', description: 'Surface scratches on the product' },
  { id: 'dents', name: 'Dents', description: 'Dents or deformations in the product' },
  { id: 'functional_issues', name: 'Functional Issues', description: 'Problems with product functionality' },
  { id: 'missing_parts', name: 'Missing Parts', description: 'Components or accessories that are missing' },
  { id: 'cosmetic_damage', name: 'Cosmetic Damage', description: 'Damage affecting appearance only' },
  { id: 'water_damage', name: 'Water Damage', description: 'Damage caused by water or moisture' },
  { id: 'screen_damage', name: 'Screen Damage', description: 'Cracks or issues with displays' },
  { id: 'battery_issues', name: 'Battery Issues', description: 'Problems with battery performance' },
  { id: 'other', name: 'Other', description: 'Any other type of damage' },
];

const severityLevels = [
  { id: 'minor', name: 'Minor', description: 'Minimal damage, easy to fix' },
  { id: 'moderate', name: 'Moderate', description: 'Noticeable damage, requires repair' },
  { id: 'major', name: 'Major', description: 'Significant damage, may affect functionality' },
];

const damageCostRates = {
  minor: 0.1,  // 10% of rental price
  moderate: 0.25,  // 25% of rental price
  major: 0.5,  // 50% of rental price
};

export default function DamageAssessment({
  productReturnId,
  damageAssessment,
  onSave,
  onAddPhoto,
  onRemovePhoto,
  editable = true,
}: DamageAssessmentProps) {
  const [damageType, setDamageType] = useState(damageAssessment?.damage_type || '');
  const [severity, setSeverity] = useState<'minor' | 'moderate' | 'major'>(
    damageAssessment?.severity || 'minor'
  );
  const [description, setDescription] = useState(damageAssessment?.description || '');
  const [estimatedCost, setEstimatedCost] = useState(damageAssessment?.estimated_cost || 0);
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoDescription, setPhotoDescription] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveAssessment = async () => {
    if (!damageType || !description) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSaving(true);

    let assessmentData: CreateDamageAssessmentRequest | UpdateDamageAssessmentRequest;

    // Always auto-approve assessments now
    if (damageAssessment) {
      assessmentData = {
        damage_type: damageType,
        severity,
        description,
        estimated_cost: estimatedCost,
        approved: true // Auto-approve on save
      };
    } else {
      assessmentData = {
        damage_type: damageType,
        severity,
        description,
        estimated_cost: estimatedCost,
        // Note: product_return_id and assessed_by will be set in the API
      };
    }

    try {
      await onSave(assessmentData);
    } catch (error) {
      console.error('Error saving assessment:', error);
      alert('Failed to save assessment. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddPhoto = () => {
    if (!photoUrl) {
      alert('Please provide a photo URL');
      return;
    }

    const photoData: CreateDamagePhotoRequest = {
      damage_assessment_id: damageAssessment?.id || '',
      photo_url: photoUrl,
      description: photoDescription,
    };

    onAddPhoto(photoData);
    setPhotoUrl('');
    setPhotoDescription('');
  };

  const calculateDamageCost = (rentalPrice: number) => {
    setIsCalculating(true);
    const cost = rentalPrice * damageCostRates[severity];
    setEstimatedCost(cost);
    setIsCalculating(false);
  };

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Damage Assessment</h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Assess any damage to the product and calculate associated charges
        </p>
      </div>
      <div className="border-t border-gray-200">
        <div className="px-4 py-5 sm:p-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="damage-type" className="block text-sm font-medium text-gray-700">
                Damage Type *
              </label>
              <select
                id="damage-type"
                name="damage-type"
                value={damageType}
                onChange={(e) => setDamageType(e.target.value)}
                disabled={!editable}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="">Select a damage type</option>
                {damageTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
              {damageType && (
                <p className="mt-1 text-sm text-gray-500">
                  {damageTypes.find(t => t.id === damageType)?.description}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="severity" className="block text-sm font-medium text-gray-700">
                Severity *
              </label>
              <select
                id="severity"
                name="severity"
                value={severity}
                onChange={(e) => setSeverity(e.target.value as 'minor' | 'moderate' | 'major')}
                disabled={!editable}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                {severityLevels.map((level) => (
                  <option key={level.id} value={level.id}>
                    {level.name}
                  </option>
                ))}
              </select>
              {severity && (
                <p className="mt-1 text-sm text-gray-500">
                  {severityLevels.find(l => l.id === severity)?.description}
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description *
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={!editable}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 mt-1 block w-full sm:text-sm border border-gray-300 rounded-md"
                placeholder="Describe the damage in detail..."
              />
            </div>

            <div>
              <label htmlFor="estimated-cost" className="block text-sm font-medium text-gray-700">
                Estimated Cost ($)
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  name="estimated-cost"
                  id="estimated-cost"
                  value={estimatedCost}
                  onChange={(e) => setEstimatedCost(parseFloat(e.target.value) || 0)}
                  disabled={!editable}
                  className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                  placeholder="0.00"
                />
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Based on severity: {severity} ({(damageCostRates[severity] * 100).toFixed(0)}% of rental price)
              </p>
            </div>

            {editable && (
              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={handleSaveAssessment}
                  disabled={isSaving}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {isSaving ? 'Saving Assessment...' : (damageAssessment ? 'Update Assessment' : 'Save Assessment & Send Invoice')}
                </button>
              </div>
            )}
          </div>
        </div>

        {damageAssessment && (
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <h4 className="text-md font-medium text-gray-900 mb-4">Damage Photos</h4>
            
            {editable && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-6">
                <div>
                  <label htmlFor="photo-url" className="block text-sm font-medium text-gray-700">
                    Photo URL
                  </label>
                  <input
                    type="text"
                    name="photo-url"
                    id="photo-url"
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 mt-1 block w-full sm:text-sm border border-gray-300 rounded-md"
                    placeholder="https://example.com/photo.jpg"
                  />
                </div>
                <div>
                  <label htmlFor="photo-description" className="block text-sm font-medium text-gray-700">
                    Photo Description
                  </label>
                  <input
                    type="text"
                    name="photo-description"
                    id="photo-description"
                    value={photoDescription}
                    onChange={(e) => setPhotoDescription(e.target.value)}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 mt-1 block w-full sm:text-sm border border-gray-300 rounded-md"
                    placeholder="Brief description of the photo"
                  />
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={handleAddPhoto}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Add Photo
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {damageAssessment.damagePhotos?.map((photo) => (
                <div key={photo.id} className="relative">
                  <div className="aspect-w-1 aspect-h-1 rounded-lg overflow-hidden bg-gray-200">
                    <img
                      src={photo.photo_url}
                      alt={photo.description || 'Damage photo'}
                      className="w-full h-full object-center object-cover"
                    />
                  </div>
                  <div className="mt-2 flex justify-between">
                    <p className="text-sm text-gray-500 truncate">{photo.description || 'No description'}</p>
                    {editable && (
                      <button
                        type="button"
                        onClick={() => onRemovePhoto(photo.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
              
              {(!damageAssessment.damagePhotos || damageAssessment.damagePhotos.length === 0) && (
                <div className="col-span-3 text-center py-4">
                  <p className="text-sm text-gray-500">No photos uploaded yet</p>
                </div>
              )}
            </div>
          </div>
        )}

        {damageAssessment && (
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-md font-medium text-gray-900">Assessment Status</h4>
                <p className="text-sm text-gray-500">
                  Assessed on {new Date(damageAssessment.assessment_date).toLocaleDateString()}
                </p>
              </div>
              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                damageAssessment.approved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {damageAssessment.approved ? 'Approved' : 'Auto-Approved'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
