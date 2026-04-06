/**
 * Admin Badge Assignment Component
 * 
 * Allows platform admins to manually assign badges to users or companies.
 */

import React, { useState, useEffect } from 'react';
import { 
  getBadgeTypes, 
  issueBadge, 
  type BadgeType,
  type BadgeLevel,
} from '@/services/badgeService';
import { supabase } from '@/lib/supabase';

interface AdminBadgeAssignmentProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function AdminBadgeAssignment({ onSuccess, onCancel }: AdminBadgeAssignmentProps) {
  const [badgeTypes, setBadgeTypes] = useState<BadgeType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [recipientType, setRecipientType] = useState<'user' | 'company'>('user');
  const [recipientSearch, setRecipientSearch] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState<any>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedBadgeType, setSelectedBadgeType] = useState<string>('');
  const [issuerMessage, setIssuerMessage] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [badgeLevel, setBadgeLevel] = useState<BadgeLevel | ''>('');
  const [isPublic, setIsPublic] = useState(true);

  // Load badge types
  useEffect(() => {
    loadBadgeTypes();
  }, []);

  async function loadBadgeTypes() {
    try {
      const types = await getBadgeTypes();
      setBadgeTypes(types);
    } catch (err: any) {
      setError(err.message);
    }
  }

  // Search for recipients
  useEffect(() => {
    if (recipientSearch.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      searchRecipients();
    }, 300);

    return () => clearTimeout(timer);
  }, [recipientSearch, recipientType]);

  async function searchRecipients() {
    try {
      if (recipientType === 'user') {
        const { data, error } = await supabase
          .from('users')
          .select('id, name, email, avatar')
          .or(`name.ilike.%${recipientSearch}%,email.ilike.%${recipientSearch}%`)
          .limit(10);

        if (error) throw error;
        setSearchResults(data || []);
      } else {
        const { data, error } = await supabase
          .from('market_companies')
          .select('id, name, logo_url, tagline')
          .ilike('name', `%${recipientSearch}%`)
          .limit(10);

        if (error) throw error;
        setSearchResults(data || []);
      }
    } catch (err: any) {
      console.error('Search error:', err);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!selectedRecipient || !selectedBadgeType) {
      setError('Please select a recipient and badge type');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      await issueBadge({
        badgeTypeSlug: selectedBadgeType,
        recipientType,
        recipientId: selectedRecipient.id,
        issuedByUserId: user.id,
        issuerMessage: issuerMessage || undefined,
        evidenceUrl: evidenceUrl || undefined,
        badgeLevel: badgeLevel || undefined,
        isPublic,
      });

      // Reset form
      setSelectedRecipient(null);
      setRecipientSearch('');
      setSelectedBadgeType('');
      setIssuerMessage('');
      setEvidenceUrl('');
      setBadgeLevel('');
      setIsPublic(true);

      onSuccess?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">Assign Badge</h2>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Recipient Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Recipient Type
          </label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="user"
                checked={recipientType === 'user'}
                onChange={(e) => {
                  setRecipientType('user');
                  setSelectedRecipient(null);
                  setRecipientSearch('');
                }}
                className="mr-2"
              />
              User
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="company"
                checked={recipientType === 'company'}
                onChange={(e) => {
                  setRecipientType('company');
                  setSelectedRecipient(null);
                  setRecipientSearch('');
                }}
                className="mr-2"
              />
              Company
            </label>
          </div>
        </div>

        {/* Recipient Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {recipientType === 'user' ? 'Search User' : 'Search Company'}
          </label>
          {selectedRecipient ? (
            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3">
                {recipientType === 'user' && selectedRecipient.avatar && (
                  <img 
                    src={selectedRecipient.avatar} 
                    alt="" 
                    className="w-10 h-10 rounded-full"
                  />
                )}
                {recipientType === 'company' && selectedRecipient.logo_url && (
                  <img 
                    src={selectedRecipient.logo_url} 
                    alt="" 
                    className="w-10 h-10 rounded"
                  />
                )}
                <div>
                  <div className="font-medium">
                    {selectedRecipient.name}
                  </div>
                  {recipientType === 'user' && (
                    <div className="text-sm text-gray-600">{selectedRecipient.email}</div>
                  )}
                  {recipientType === 'company' && selectedRecipient.tagline && (
                    <div className="text-sm text-gray-600">{selectedRecipient.tagline}</div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecipient(null)}
                className="text-red-600 hover:text-red-800"
              >
                Remove
              </button>
            </div>
          ) : (
            <>
              <input
                type="text"
                value={recipientSearch}
                onChange={(e) => setRecipientSearch(e.target.value)}
                placeholder={`Search for ${recipientType}...`}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchResults.length > 0 && (
                <div className="mt-2 border border-gray-200 rounded-lg divide-y max-h-60 overflow-y-auto">
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => {
                        setSelectedRecipient(result);
                        setSearchResults([]);
                        setRecipientSearch('');
                      }}
                      className="w-full p-3 hover:bg-gray-50 text-left flex items-center gap-3"
                    >
                      {recipientType === 'user' && result.avatar && (
                        <img 
                          src={result.avatar} 
                          alt="" 
                          className="w-8 h-8 rounded-full"
                        />
                      )}
                      {recipientType === 'company' && result.logo_url && (
                        <img 
                          src={result.logo_url} 
                          alt="" 
                          className="w-8 h-8 rounded"
                        />
                      )}
                      <div>
                        <div className="font-medium">
                          {result.name}
                        </div>
                        {recipientType === 'user' && (
                          <div className="text-sm text-gray-600">{result.email}</div>
                        )}
                        {recipientType === 'company' && result.tagline && (
                          <div className="text-sm text-gray-600">{result.tagline}</div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Badge Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Badge Type *
          </label>
          <select
            value={selectedBadgeType}
            onChange={(e) => setSelectedBadgeType(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select a badge...</option>
            {badgeTypes
              .filter(bt => bt.assignable_to.includes(recipientType))
              .map((badge) => (
                <option key={badge.id} value={badge.slug}>
                  {badge.name} ({badge.category})
                </option>
              ))}
          </select>
        </div>

        {/* Badge Level (optional for endorsements) */}
        {selectedBadgeType && badgeTypes.find(bt => bt.slug === selectedBadgeType)?.category === 'endorsement' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Endorsement Level
            </label>
            <select
              value={badgeLevel}
              onChange={(e) => setBadgeLevel(e.target.value as BadgeLevel | '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">None</option>
              <option value="supported">Supported</option>
              <option value="recommended">Recommended</option>
              <option value="highly_recommended">Highly Recommended</option>
            </select>
          </div>
        )}

        {/* Issuer Message */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Message (Optional)
          </label>
          <textarea
            value={issuerMessage}
            onChange={(e) => setIssuerMessage(e.target.value)}
            rows={3}
            placeholder="Add a personal message about this badge..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Evidence URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Evidence URL (Optional)
          </label>
          <input
            type="url"
            value={evidenceUrl}
            onChange={(e) => setEvidenceUrl(e.target.value)}
            placeholder="https://..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="mt-1 text-sm text-gray-500">
            Link to proof of achievement (e.g., completion certificate, project URL)
          </p>
        </div>

        {/* Public Visibility */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="isPublic"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="mr-2"
          />
          <label htmlFor="isPublic" className="text-sm text-gray-700">
            Make this badge publicly visible
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading || !selectedRecipient || !selectedBadgeType}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {loading ? 'Assigning...' : 'Assign Badge'}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
