import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';

export default function ProfileView({ onToast }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('api');
  const logoInputRef = useRef(null);

  // API Key state
  const [apiKeyStatus, setApiKeyStatus] = useState({ configured: false, preview: null });
  const [newApiKey, setNewApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingKey, setTestingKey] = useState(false);
  const [savingKey, setSavingKey] = useState(false);

  useEffect(() => {
    loadProfile();
    loadApiKeyStatus();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await api.getProfile();
      setProfile(response.profile);
    } catch (error) {
      console.error('Failed to load profile:', error);
      onToast?.('Failed to load profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadApiKeyStatus = async () => {
    try {
      const response = await api.getApiKeyStatus();
      setApiKeyStatus(response);
    } catch (error) {
      console.error('Failed to load API key status:', error);
    }
  };

  const handleSaveApiKey = async () => {
    if (!newApiKey.trim()) {
      onToast?.('Please enter an API key', 'warning');
      return;
    }

    setSavingKey(true);
    try {
      const response = await api.setApiKey(newApiKey.trim());
      setApiKeyStatus({ configured: true, preview: response.preview });
      setNewApiKey('');
      setShowApiKey(false);
      onToast?.('API key saved successfully!', 'success');
    } catch (error) {
      console.error('Failed to save API key:', error);
      onToast?.(error.message || 'Failed to save API key', 'error');
    } finally {
      setSavingKey(false);
    }
  };

  const handleTestApiKey = async () => {
    const keyToTest = newApiKey.trim() || null;

    setTestingKey(true);
    try {
      await api.testApiKey(keyToTest);
      onToast?.('API key is valid and working!', 'success');
    } catch (error) {
      console.error('API key test failed:', error);
      onToast?.(error.message || 'API key test failed', 'error');
    } finally {
      setTestingKey(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await api.updateProfile(profile);
      setProfile(response.profile);
      onToast?.('Profile saved successfully', 'success');
    } catch (error) {
      console.error('Failed to save profile:', error);
      onToast?.('Failed to save profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const response = await api.uploadLogo(file);
      setProfile(response.profile);
      onToast?.('Logo uploaded successfully', 'success');
    } catch (error) {
      console.error('Failed to upload logo:', error);
      onToast?.('Failed to upload logo', 'error');
    }
  };

  const handleDeleteLogo = async () => {
    try {
      const response = await api.deleteLogo();
      setProfile(response.profile);
      onToast?.('Logo removed', 'success');
    } catch (error) {
      console.error('Failed to delete logo:', error);
      onToast?.('Failed to delete logo', 'error');
    }
  };

  const updateField = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const updateNestedField = (parent, field, value) => {
    setProfile(prev => ({
      ...prev,
      [parent]: { ...prev[parent], [field]: value }
    }));
  };

  const tabs = [
    { id: 'api', label: 'API Settings', icon: '🔑' },
    { id: 'company', label: 'Company Info', icon: '🏢' },
    { id: 'contact', label: 'Contact', icon: '👤' },
    { id: 'branding', label: 'Branding', icon: '🎨' },
    { id: 'rates', label: 'Labor Rates', icon: '💰' },
    { id: 'margins', label: 'Margins', icon: '📊' },
    { id: 'defaults', label: 'Defaults', icon: '⚙️' }
  ];

  if (loading) {
    return (
      <div className="pt-[70px] min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-[70px] min-h-screen">
      <div className="max-w-6xl mx-auto px-8 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Company Profile</h1>
            <p className="text-gray-400">Configure your company information for proposals and outputs</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 gradient-gold rounded-xl text-black font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            {saving ? 'Saving...' : '💾 Save Changes'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 rounded-xl font-medium whitespace-nowrap transition-all ${activeTab === tab.id
                  ? 'bg-gold text-black'
                  : 'bg-level-2 border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'
                }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-level-2 rounded-2xl border border-gray-700 p-8">
          {/* API Settings Tab */}
          {activeTab === 'api' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-semibold mb-2">API Configuration</h2>
                <p className="text-gray-400 text-sm">Configure your Anthropic API key to enable AI features</p>
              </div>

              {/* Current Status */}
              <div className={`p-5 rounded-xl border ${apiKeyStatus.configured
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-yellow-500/10 border-yellow-500/30'
                }`}>
                <div className="flex items-center gap-3 mb-2">
                  <span className={`w-3 h-3 rounded-full ${apiKeyStatus.configured ? 'bg-emerald-400' : 'bg-yellow-400'
                    }`} />
                  <span className={`font-semibold ${apiKeyStatus.configured ? 'text-emerald-400' : 'text-yellow-400'
                    }`}>
                    {apiKeyStatus.configured ? 'API Key Configured' : 'API Key Not Configured'}
                  </span>
                </div>
                {apiKeyStatus.configured && apiKeyStatus.preview && (
                  <p className="text-sm text-gray-400 ml-6">
                    Current key: <code className="bg-level-1 px-2 py-0.5 rounded">{apiKeyStatus.preview}</code>
                  </p>
                )}
              </div>

              {/* API Key Input */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  {apiKeyStatus.configured ? 'Update API Key' : 'Enter API Key'}
                </label>
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={newApiKey}
                      onChange={(e) => setNewApiKey(e.target.value)}
                      placeholder="sk-ant-api03-..."
                      className="w-full px-4 py-3 bg-level-1 border border-gray-700 rounded-xl text-white font-mono text-sm focus:border-gold transition-colors pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    >
                      {showApiKey ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Get your API key from{' '}
                  <a
                    href="https://console.anthropic.com/settings/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gold hover:underline"
                  >
                    console.anthropic.com
                  </a>
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleTestApiKey}
                  disabled={testingKey}
                  className="px-5 py-3 bg-level-1 border border-gray-600 rounded-xl font-medium hover:border-gold transition-colors disabled:opacity-50"
                >
                  {testingKey ? '⏳ Testing...' : '🧪 Test Connection'}
                </button>
                <button
                  onClick={handleSaveApiKey}
                  disabled={savingKey || !newApiKey.trim()}
                  className="px-6 py-3 gradient-gold rounded-xl text-black font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity"
                >
                  {savingKey ? 'Saving...' : '💾 Save API Key'}
                </button>
              </div>

              {/* Info Box */}
              <div className="p-5 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                <h4 className="font-semibold text-blue-400 mb-2">ℹ️ About API Keys</h4>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• Your API key is stored securely on this server only</li>
                  <li>• The key is never exposed to the browser</li>
                  <li>• It persists across server restarts</li>
                  <li>• You can update it anytime from this page</li>
                </ul>
              </div>
            </div>
          )}

          {/* Company Info Tab */}
          {activeTab === 'company' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold mb-6">Company Information</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-400 mb-2">Company Name</label>
                  <input
                    type="text"
                    value={profile?.companyName || ''}
                    onChange={(e) => updateField('companyName', e.target.value)}
                    placeholder="3D Technology Services"
                    className="w-full px-4 py-3 bg-level-1 border border-gray-700 rounded-xl text-white focus:border-gold transition-colors"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-400 mb-2">Street Address</label>
                  <input
                    type="text"
                    value={profile?.address || ''}
                    onChange={(e) => updateField('address', e.target.value)}
                    placeholder="123 Technology Drive"
                    className="w-full px-4 py-3 bg-level-1 border border-gray-700 rounded-xl text-white focus:border-gold transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">City</label>
                  <input
                    type="text"
                    value={profile?.city || ''}
                    onChange={(e) => updateField('city', e.target.value)}
                    placeholder="San Francisco"
                    className="w-full px-4 py-3 bg-level-1 border border-gray-700 rounded-xl text-white focus:border-gold transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">State</label>
                    <input
                      type="text"
                      value={profile?.state || ''}
                      onChange={(e) => updateField('state', e.target.value)}
                      placeholder="CA"
                      className="w-full px-4 py-3 bg-level-1 border border-gray-700 rounded-xl text-white focus:border-gold transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">ZIP</label>
                    <input
                      type="text"
                      value={profile?.zip || ''}
                      onChange={(e) => updateField('zip', e.target.value)}
                      placeholder="94105"
                      className="w-full px-4 py-3 bg-level-1 border border-gray-700 rounded-xl text-white focus:border-gold transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={profile?.phone || ''}
                    onChange={(e) => updateField('phone', e.target.value)}
                    placeholder="(555) 123-4567"
                    className="w-full px-4 py-3 bg-level-1 border border-gray-700 rounded-xl text-white focus:border-gold transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Email</label>
                  <input
                    type="email"
                    value={profile?.email || ''}
                    onChange={(e) => updateField('email', e.target.value)}
                    placeholder="info@3dtsi.com"
                    className="w-full px-4 py-3 bg-level-1 border border-gray-700 rounded-xl text-white focus:border-gold transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Website</label>
                  <input
                    type="url"
                    value={profile?.website || ''}
                    onChange={(e) => updateField('website', e.target.value)}
                    placeholder="https://www.3dtsi.com"
                    className="w-full px-4 py-3 bg-level-1 border border-gray-700 rounded-xl text-white focus:border-gold transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Contractor License #</label>
                  <input
                    type="text"
                    value={profile?.license || ''}
                    onChange={(e) => updateField('license', e.target.value)}
                    placeholder="C-7 #123456"
                    className="w-full px-4 py-3 bg-level-1 border border-gray-700 rounded-xl text-white focus:border-gold transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Contact Tab */}
          {activeTab === 'contact' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold mb-6">Primary Contact</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Contact Name</label>
                  <input
                    type="text"
                    value={profile?.contactName || ''}
                    onChange={(e) => updateField('contactName', e.target.value)}
                    placeholder="John Smith"
                    className="w-full px-4 py-3 bg-level-1 border border-gray-700 rounded-xl text-white focus:border-gold transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Title</label>
                  <input
                    type="text"
                    value={profile?.contactTitle || ''}
                    onChange={(e) => updateField('contactTitle', e.target.value)}
                    placeholder="Senior Estimator"
                    className="w-full px-4 py-3 bg-level-1 border border-gray-700 rounded-xl text-white focus:border-gold transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Direct Phone</label>
                  <input
                    type="tel"
                    value={profile?.contactPhone || ''}
                    onChange={(e) => updateField('contactPhone', e.target.value)}
                    placeholder="(555) 123-4568"
                    className="w-full px-4 py-3 bg-level-1 border border-gray-700 rounded-xl text-white focus:border-gold transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Direct Email</label>
                  <input
                    type="email"
                    value={profile?.contactEmail || ''}
                    onChange={(e) => updateField('contactEmail', e.target.value)}
                    placeholder="jsmith@3dtsi.com"
                    className="w-full px-4 py-3 bg-level-1 border border-gray-700 rounded-xl text-white focus:border-gold transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Branding Tab */}
          {activeTab === 'branding' && (
            <div className="space-y-8">
              <h2 className="text-xl font-semibold mb-6">Branding & Logo</h2>

              {/* Logo Upload */}
              <div>
                <label className="block text-sm text-gray-400 mb-4">Company Logo</label>
                <div className="flex items-start gap-6">
                  <div className="w-48 h-32 bg-level-1 border-2 border-dashed border-gray-600 rounded-xl flex items-center justify-center overflow-hidden">
                    {profile?.logoUrl ? (
                      <img
                        src={profile.logoUrl}
                        alt="Company Logo"
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <div className="text-center text-gray-500">
                        <div className="text-3xl mb-2">🖼️</div>
                        <p className="text-xs">No logo uploaded</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-3">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => logoInputRef.current?.click()}
                      className="px-5 py-2.5 bg-level-1 border border-gray-600 rounded-lg text-sm hover:border-gold transition-colors"
                    >
                      📤 Upload Logo
                    </button>
                    {profile?.logoUrl && (
                      <button
                        onClick={handleDeleteLogo}
                        className="px-5 py-2.5 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400 hover:bg-red-500/20 transition-colors"
                      >
                        🗑️ Remove Logo
                      </button>
                    )}
                    <p className="text-xs text-gray-500 max-w-[200px]">
                      PNG, JPG, SVG, or WebP. Max 5MB. Recommended: 400x200px
                    </p>
                  </div>
                </div>
              </div>

              {/* Brand Colors */}
              <div>
                <label className="block text-sm text-gray-400 mb-4">Brand Colors</label>
                <div className="flex gap-6">
                  <div>
                    <label className="block text-xs text-gray-500 mb-2">Primary Color</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={profile?.primaryColor || '#FFB81C'}
                        onChange={(e) => updateField('primaryColor', e.target.value)}
                        className="w-12 h-12 rounded-lg cursor-pointer border-0"
                      />
                      <input
                        type="text"
                        value={profile?.primaryColor || '#FFB81C'}
                        onChange={(e) => updateField('primaryColor', e.target.value)}
                        className="w-28 px-3 py-2 bg-level-1 border border-gray-700 rounded-lg text-sm font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-2">Secondary Color</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={profile?.secondaryColor || '#17B2B2'}
                        onChange={(e) => updateField('secondaryColor', e.target.value)}
                        className="w-12 h-12 rounded-lg cursor-pointer border-0"
                      />
                      <input
                        type="text"
                        value={profile?.secondaryColor || '#17B2B2'}
                        onChange={(e) => updateField('secondaryColor', e.target.value)}
                        className="w-28 px-3 py-2 bg-level-1 border border-gray-700 rounded-lg text-sm font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Labor Rates Tab */}
          {activeTab === 'rates' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Labor Rates</h2>
                <div className="text-sm text-gray-400">
                  Burden Rate:
                  <input
                    type="number"
                    value={profile?.burdenRate || 55}
                    onChange={(e) => updateField('burdenRate', parseFloat(e.target.value))}
                    className="w-16 ml-2 px-2 py-1 bg-level-1 border border-gray-700 rounded text-center"
                  />
                  %
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-gray-400 border-b border-gray-700">
                      <th className="pb-3 font-medium">Role</th>
                      <th className="pb-3 font-medium text-center">Base Rate ($/hr)</th>
                      <th className="pb-3 font-medium text-center">Sell Rate ($/hr)</th>
                      <th className="pb-3 font-medium text-center">Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(profile?.laborRates || {}).map(([role, rates]) => {
                      const margin = rates.sell > 0 ? ((rates.sell - rates.base * (1 + (profile?.burdenRate || 55) / 100)) / rates.sell * 100).toFixed(1) : 0;
                      return (
                        <tr key={role} className="border-b border-gray-800">
                          <td className="py-4 capitalize">{role.replace(/([A-Z])/g, ' $1').trim()}</td>
                          <td className="py-4">
                            <input
                              type="number"
                              value={rates.base}
                              onChange={(e) => updateNestedField('laborRates', role, { ...rates, base: parseFloat(e.target.value) })}
                              className="w-24 mx-auto block px-3 py-2 bg-level-1 border border-gray-700 rounded-lg text-center"
                            />
                          </td>
                          <td className="py-4">
                            <input
                              type="number"
                              value={rates.sell}
                              onChange={(e) => updateNestedField('laborRates', role, { ...rates, sell: parseFloat(e.target.value) })}
                              className="w-24 mx-auto block px-3 py-2 bg-level-1 border border-gray-700 rounded-lg text-center"
                            />
                          </td>
                          <td className="py-4 text-center">
                            <span className={`px-3 py-1 rounded-full text-sm ${margin > 30 ? 'bg-emerald-500/20 text-emerald-400' : margin > 20 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                              {margin}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Margins Tab */}
          {activeTab === 'margins' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold mb-6">Default Margins by System</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(profile?.margins || {}).map(([system, margin]) => (
                  <div key={system} className="bg-level-1 rounded-xl p-4 border border-gray-700">
                    <label className="block text-sm text-gray-400 mb-2 capitalize">
                      {system.replace(/([A-Z])/g, ' $1').trim()}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="60"
                        value={margin}
                        onChange={(e) => updateNestedField('margins', system, parseInt(e.target.value))}
                        className="flex-1 accent-gold"
                      />
                      <span className="w-12 text-right font-semibold">{margin}%</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                <p className="text-sm text-blue-400">
                  💡 These margins are applied to material costs when generating estimates. Adjust based on project complexity and competition.
                </p>
              </div>
            </div>
          )}

          {/* Defaults Tab */}
          {activeTab === 'defaults' && (
            <div className="space-y-8">
              <h2 className="text-xl font-semibold mb-6">Default Settings</h2>

              {/* Terms */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Payment Terms</label>
                  <input
                    type="text"
                    value={profile?.paymentTerms || ''}
                    onChange={(e) => updateField('paymentTerms', e.target.value)}
                    placeholder="Net 30"
                    className="w-full px-4 py-3 bg-level-1 border border-gray-700 rounded-xl text-white focus:border-gold transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Proposal Validity</label>
                  <input
                    type="text"
                    value={profile?.proposalValidity || ''}
                    onChange={(e) => updateField('proposalValidity', e.target.value)}
                    placeholder="30 days"
                    className="w-full px-4 py-3 bg-level-1 border border-gray-700 rounded-xl text-white focus:border-gold transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Warranty Period</label>
                  <input
                    type="text"
                    value={profile?.warrantyPeriod || ''}
                    onChange={(e) => updateField('warrantyPeriod', e.target.value)}
                    placeholder="1 year parts and labor"
                    className="w-full px-4 py-3 bg-level-1 border border-gray-700 rounded-xl text-white focus:border-gold transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Tax Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={profile?.taxRate || 8.25}
                    onChange={(e) => updateField('taxRate', parseFloat(e.target.value))}
                    className="w-full px-4 py-3 bg-level-1 border border-gray-700 rounded-xl text-white focus:border-gold transition-colors"
                  />
                </div>
              </div>

              {/* Standard Exclusions */}
              <div>
                <label className="block text-sm text-gray-400 mb-4">Standard Exclusions</label>
                <div className="space-y-2">
                  {(profile?.standardExclusions || []).map((exclusion, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <input
                        type="text"
                        value={exclusion}
                        onChange={(e) => {
                          const newExclusions = [...profile.standardExclusions];
                          newExclusions[i] = e.target.value;
                          updateField('standardExclusions', newExclusions);
                        }}
                        className="flex-1 px-4 py-2 bg-level-1 border border-gray-700 rounded-lg text-sm focus:border-gold transition-colors"
                      />
                      <button
                        onClick={() => {
                          const newExclusions = profile.standardExclusions.filter((_, idx) => idx !== i);
                          updateField('standardExclusions', newExclusions);
                        }}
                        className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => updateField('standardExclusions', [...(profile?.standardExclusions || []), ''])}
                    className="mt-3 px-4 py-2 bg-level-1 border border-dashed border-gray-600 rounded-lg text-sm text-gray-400 hover:border-gold hover:text-gold transition-colors"
                  >
                    + Add Exclusion
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
