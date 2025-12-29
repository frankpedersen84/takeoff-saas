import React, { useState } from 'react';

export default function SettingsView() {
  const [companyInfo, setCompanyInfo] = useState({
    name: '3D Technology Services',
    address: '11365 Sunrise Gold Circle, Rancho Cordova, CA 95742',
    phone: '',
    email: '',
    license: ''
  });

  return (
    <div className="pt-[90px] px-10 pb-10">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>

        {/* API Configuration */}
        <div className="bg-bg-card rounded-2xl p-7 border border-gray-700 mb-5">
          <h3 className="text-lg font-semibold mb-2">API Configuration</h3>
          <p className="text-sm text-gray-400 mb-4">
            The Anthropic API key is configured on the server for security.
          </p>
          
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2 text-emerald-400 font-medium">
              <span className="w-2 h-2 bg-emerald-400 rounded-full" />
              API Connected
            </div>
            <p className="text-sm text-gray-400 mt-1">
              Your API key is securely stored on the server.
            </p>
          </div>
        </div>

        {/* Company Information */}
        <div className="bg-bg-card rounded-2xl p-7 border border-gray-700 mb-5">
          <h3 className="text-lg font-semibold mb-2">Company Information</h3>
          <p className="text-sm text-gray-400 mb-4">
            This information will be used in generated proposals
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Company Name</label>
              <input
                type="text"
                value={companyInfo.name}
                onChange={(e) => setCompanyInfo(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-3 bg-bg-secondary border border-gray-700 rounded-lg text-white text-sm focus:border-gold transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Address</label>
              <input
                type="text"
                value={companyInfo.address}
                onChange={(e) => setCompanyInfo(prev => ({ ...prev, address: e.target.value }))}
                className="w-full px-4 py-3 bg-bg-secondary border border-gray-700 rounded-lg text-white text-sm focus:border-gold transition-colors"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Phone</label>
                <input
                  type="text"
                  value={companyInfo.phone}
                  onChange={(e) => setCompanyInfo(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(555) 123-4567"
                  className="w-full px-4 py-3 bg-bg-secondary border border-gray-700 rounded-lg text-white text-sm focus:border-gold transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Email</label>
                <input
                  type="email"
                  value={companyInfo.email}
                  onChange={(e) => setCompanyInfo(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="info@3dtsi.com"
                  className="w-full px-4 py-3 bg-bg-secondary border border-gray-700 rounded-lg text-white text-sm focus:border-gold transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Contractor License #</label>
              <input
                type="text"
                value={companyInfo.license}
                onChange={(e) => setCompanyInfo(prev => ({ ...prev, license: e.target.value }))}
                placeholder="C-7 #123456"
                className="w-full px-4 py-3 bg-bg-secondary border border-gray-700 rounded-lg text-white text-sm focus:border-gold transition-colors"
              />
            </div>
          </div>

          <button className="mt-6 px-6 py-3 gradient-teal rounded-lg text-white font-semibold hover:opacity-90 transition-opacity">
            Save Changes
          </button>
        </div>

        {/* Labor Rates */}
        <div className="bg-bg-card rounded-2xl p-7 border border-gray-700">
          <h3 className="text-lg font-semibold mb-2">Default Labor Rates</h3>
          <p className="text-sm text-gray-400 mb-4">
            Standard billing rates used for estimates
          </p>
          
          <div className="bg-bg-secondary rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Role</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-medium">Base Rate</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-medium">Sell Rate</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { role: 'Project Manager', base: '$50', sell: '$110' },
                  { role: 'CAD/Design', base: '$40', sell: '$90' },
                  { role: 'Installer', base: '$40', sell: '$95' },
                  { role: 'Technician', base: '$45', sell: '$105' },
                  { role: 'Warehouse', base: '$25', sell: '$45' },
                ].map((rate, i) => (
                  <tr key={i} className="border-b border-gray-700 last:border-0">
                    <td className="px-4 py-3">{rate.role}</td>
                    <td className="px-4 py-3 text-right text-gray-400">{rate.base}/hr</td>
                    <td className="px-4 py-3 text-right text-gold font-medium">{rate.sell}/hr</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
