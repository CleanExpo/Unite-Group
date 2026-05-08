'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Session } from '@supabase/supabase-js';
import { supabaseClient } from '@/lib/supabase/client';
import { CookiePreferencesButton } from '../../../../components/compliance/CookieConsentProvider';
import { 
  UserPrivacySettings, 
  DataExportRequest, 
  DataDeletionRequest,
  ExportFormat,
  RequestStatus,
  DataCategory
} from '@/lib/compliance/types';

interface PrivacyState {
  loading: boolean;
  privacySettings: UserPrivacySettings | null;
  exportRequests: DataExportRequest[];
  deletionRequests: DataDeletionRequest[];
  submitting: boolean;
  error: string | null;
  success: string | null;
}

export default function PrivacyPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [state, setState] = useState<PrivacyState>({
    loading: true,
    privacySettings: null,
    exportRequests: [],
    deletionRequests: [],
    submitting: false,
    error: null,
    success: null
  });

  // Fetch user session and privacy settings
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Get the current session
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        if (!session) {
          router.push('/login');
          return;
        }
        
        setSession(session);
        
        // Fetch privacy settings
        const privacySettingsResponse = await fetch('/api/compliance/privacy-settings');
        const exportRequestsResponse = await fetch('/api/compliance/data-export');
        const deletionRequestsResponse = await fetch('/api/compliance/data-deletion');
        
        if (!privacySettingsResponse.ok || !exportRequestsResponse.ok || !deletionRequestsResponse.ok) {
          throw new Error('Failed to fetch privacy data');
        }
        
        const privacySettings = await privacySettingsResponse.json();
        const exportRequests = await exportRequestsResponse.json();
        const deletionRequests = await deletionRequestsResponse.json();
        
        setState(prevState => ({
          ...prevState,
          loading: false,
          privacySettings: privacySettings.settings,
          exportRequests: exportRequests.requests || [],
          deletionRequests: deletionRequests.requests || []
        }));
      } catch (error: any) {
        console.error('Failed to fetch user data:', error);
        setState(prevState => ({
          ...prevState,
          loading: false,
          error: 'Failed to load privacy settings. Please try again.'
        }));
      }
    };
    
    fetchUserData();
  }, [router]);

  // Handle communication preferences update
  const handleCommunicationPreferenceChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    key: 'marketingEmails' | 'productUpdates' | 'newsletter'
  ) => {
    if (!state.privacySettings) return;
    
    setState(prevState => ({
      ...prevState,
      privacySettings: {
        ...prevState.privacySettings!,
        communicationPreferences: {
          ...prevState.privacySettings!.communicationPreferences,
          [key]: event.target.checked
        }
      }
    }));
  };

  // Handle data processing preferences update
  const handleDataProcessingPreferenceChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    key: 'analytics' | 'profiling' | 'thirdPartySharing'
  ) => {
    if (!state.privacySettings) return;
    
    setState(prevState => ({
      ...prevState,
      privacySettings: {
        ...prevState.privacySettings!,
        dataProcessingPreferences: {
          ...prevState.privacySettings!.dataProcessingPreferences,
          [key]: event.target.checked
        }
      }
    }));
  };

  // Save privacy settings
  const handleSaveSettings = async () => {
    if (!state.privacySettings) return;
    
    setState(prevState => ({ ...prevState, submitting: true, error: null, success: null }));
    
    try {
      const response = await fetch('/api/compliance/privacy-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          communicationPreferences: state.privacySettings.communicationPreferences,
          dataProcessingPreferences: state.privacySettings.dataProcessingPreferences
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update privacy settings');
      }
      
      setState(prevState => ({
        ...prevState,
        submitting: false,
        success: 'Privacy settings updated successfully'
      }));
      
      // Clear success message after a few seconds
      setTimeout(() => {
        setState(prevState => ({ ...prevState, success: null }));
      }, 5000);
    } catch (error: any) {
      console.error('Failed to update privacy settings:', error);
      setState(prevState => ({
        ...prevState,
        submitting: false,
        error: error.message || 'Failed to update privacy settings'
      }));
    }
  };

  // Request data export
  const handleRequestDataExport = async (format: ExportFormat) => {
    setState(prevState => ({ ...prevState, submitting: true, error: null, success: null }));
    
    try {
      const response = await fetch('/api/compliance/data-export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          exportFormat: format,
          dataCategories: [DataCategory.ALL]
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to request data export');
      }
      
      const data = await response.json();
      
      setState(prevState => ({
        ...prevState,
        submitting: false,
        exportRequests: [data.request, ...prevState.exportRequests],
        success: 'Data export request submitted successfully'
      }));
      
      // Clear success message after a few seconds
      setTimeout(() => {
        setState(prevState => ({ ...prevState, success: null }));
      }, 5000);
    } catch (error: any) {
      console.error('Failed to request data export:', error);
      setState(prevState => ({
        ...prevState,
        submitting: false,
        error: error.message || 'Failed to request data export'
      }));
    }
  };

  // Request data deletion
  const handleRequestDataDeletion = async (type: 'partial' | 'full', categories?: DataCategory[]) => {
    setState(prevState => ({ ...prevState, submitting: true, error: null, success: null }));
    
    try {
      const response = await fetch('/api/compliance/data-deletion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requestType: type,
          dataCategories: type === 'partial' ? categories : [DataCategory.ALL]
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to request data deletion');
      }
      
      const data = await response.json();
      
      setState(prevState => ({
        ...prevState,
        submitting: false,
        deletionRequests: [data.request, ...prevState.deletionRequests],
        success: 'Data deletion request submitted successfully'
      }));
      
      // Clear success message after a few seconds
      setTimeout(() => {
        setState(prevState => ({ ...prevState, success: null }));
      }, 5000);
    } catch (error: any) {
      console.error('Failed to request data deletion:', error);
      setState(prevState => ({
        ...prevState,
        submitting: false,
        error: error.message || 'Failed to request data deletion'
      }));
    }
  };

  if (state.loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#09090b", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#475569", fontSize: 14 }}>Loading privacy settings&hellip;</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#09090b", color: "#f8fafc" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 24px 80px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "#f8fafc", letterSpacing: "-0.03em", marginBottom: 24 }}>Privacy Settings</h1>

      {state.error && (
        <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 10, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.25)" }}>
          <span style={{ fontSize: 13, color: "#f87171" }}>{state.error}</span>
        </div>
      )}

      {state.success && (
        <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 10, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.25)" }}>
          <span style={{ fontSize: 13, color: "#16a34a" }}>{state.success}</span>
        </div>
      )}

      <div style={{ background: "#111113", border: "1px solid #27272a", borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <h2 className="text-xl font-semibold mb-4">Communication Preferences</h2>
        <p className="mb-4">
          Control what types of communications you receive from us. You can change these settings at any time.
        </p>
        
        <div className="space-y-4 mb-6">
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="marketingEmails"
                name="marketingEmails"
                type="checkbox"
                checked={state.privacySettings?.communicationPreferences.marketingEmails || false}
                onChange={(e) => handleCommunicationPreferenceChange(e, 'marketingEmails')}
                className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="marketingEmails" className="font-medium text-gray-700 dark:text-gray-300">
                Marketing Emails
              </label>
              <p className="text-gray-500 dark:text-gray-400">
                Receive emails about promotions, new features, and special offers.
              </p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="productUpdates"
                name="productUpdates"
                type="checkbox"
                checked={state.privacySettings?.communicationPreferences.productUpdates || false}
                onChange={(e) => handleCommunicationPreferenceChange(e, 'productUpdates')}
                className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="productUpdates" className="font-medium text-gray-700 dark:text-gray-300">
                Product Updates
              </label>
              <p className="text-gray-500 dark:text-gray-400">
                Receive emails about product updates, new features, and improvements.
              </p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="newsletter"
                name="newsletter"
                type="checkbox"
                checked={state.privacySettings?.communicationPreferences.newsletter || false}
                onChange={(e) => handleCommunicationPreferenceChange(e, 'newsletter')}
                className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="newsletter" className="font-medium text-gray-700 dark:text-gray-300">
                Newsletter
              </label>
              <p className="text-gray-500 dark:text-gray-400">
                Receive our regular newsletter with industry insights and tips.
              </p>
            </div>
          </div>
        </div>
        
        <h2 className="text-xl font-semibold mb-4">Data Processing Preferences</h2>
        <p className="mb-4">
          Control how we process and use your data to improve our services.
        </p>
        
        <div className="space-y-4 mb-6">
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="analytics"
                name="analytics"
                type="checkbox"
                checked={state.privacySettings?.dataProcessingPreferences.analytics || false}
                onChange={(e) => handleDataProcessingPreferenceChange(e, 'analytics')}
                className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="analytics" className="font-medium text-gray-700 dark:text-gray-300">
                Analytics
              </label>
              <p className="text-gray-500 dark:text-gray-400">
                Allow us to collect anonymous usage data to improve our services.
              </p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="profiling"
                name="profiling"
                type="checkbox"
                checked={state.privacySettings?.dataProcessingPreferences.profiling || false}
                onChange={(e) => handleDataProcessingPreferenceChange(e, 'profiling')}
                className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="profiling" className="font-medium text-gray-700 dark:text-gray-300">
                Profiling
              </label>
              <p className="text-gray-500 dark:text-gray-400">
                Allow us to analyze your usage patterns to personalize your experience.
              </p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="thirdPartySharing"
                name="thirdPartySharing"
                type="checkbox"
                checked={state.privacySettings?.dataProcessingPreferences.thirdPartySharing || false}
                onChange={(e) => handleDataProcessingPreferenceChange(e, 'thirdPartySharing')}
                className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="thirdPartySharing" className="font-medium text-gray-700 dark:text-gray-300">
                Third-Party Sharing
              </label>
              <p className="text-gray-500 dark:text-gray-400">
                Allow us to share anonymous usage data with trusted third parties.
              </p>
            </div>
          </div>
        </div>
        
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={state.submitting}
            style={{ padding: "8px 16px", background: "#1d4ed8", color: "#fff", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, cursor: state.submitting ? "not-allowed" : "pointer", opacity: state.submitting ? 0.6 : 1 }}
          >
            {state.submitting ? 'Saving…' : 'Save Preferences'}
          </button>
        </div>
      </div>

      <div style={{ background: "#111113", border: "1px solid #27272a", borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: "#f8fafc", marginBottom: 8 }}>Cookie Preferences</h2>
        <p style={{ fontSize: 14, color: "#64748b", marginBottom: 16 }}>
          Manage your cookie preferences to control what information is collected when you visit our website.
        </p>
        <div>
          <CookiePreferencesButton className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500" />
        </div>
      </div>

      <div style={{ background: "#111113", border: "1px solid #27272a", borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <h2 className="text-xl font-semibold mb-4">Data Export</h2>
        <p className="mb-4">
          You can request a copy of your personal data at any time. We will process your request and provide a download link.
        </p>
        
        <div className="flex flex-wrap gap-4 mb-6">
          <button
            type="button"
            onClick={() => handleRequestDataExport(ExportFormat.JSON)}
            disabled={state.submitting}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Export as JSON
          </button>
          
          <button
            type="button"
            onClick={() => handleRequestDataExport(ExportFormat.CSV)}
            disabled={state.submitting}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Export as CSV
          </button>
        </div>
        
        {state.exportRequests.length > 0 && (
          <div>
            <h3 className="text-lg font-medium mb-2">Recent Export Requests</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Format
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Download
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {state.exportRequests.map((request) => (
                    <tr key={request.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {request.exportFormat}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          request.status === RequestStatus.COMPLETED
                            ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                            : request.status === RequestStatus.PENDING
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
                            : request.status === RequestStatus.PROCESSING
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100'
                            : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                        }`}>
                          {request.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {request.status === RequestStatus.COMPLETED && request.downloadUrl ? (
                          <a
                            href={request.downloadUrl}
                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-200"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Download
                          </a>
                        ) : (
                          'Not available'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      
      <div style={{ background: "#111113", border: "1px solid #27272a", borderRadius: 12, padding: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: "#f8fafc", marginBottom: 8 }}>Data Deletion</h2>
        <p className="mb-4">
          You can request the deletion of your personal data. This process cannot be undone.
        </p>
        
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">Delete Account Data</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Request deletion of your account and personal data. This action is irreversible.
          </p>
          
          <button
            type="button"
            onClick={() => handleRequestDataDeletion('full')}
            disabled={state.submitting}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Request Account Deletion
          </button>
        </div>
        
        {state.deletionRequests.length > 0 && (
          <div>
            <h3 className="text-lg font-medium mb-2">Recent Deletion Requests</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {state.deletionRequests.map((request) => (
                    <tr key={request.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {request.requestType === 'full' ? 'Full Account Deletion' : 'Partial Data Deletion'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          request.status === RequestStatus.COMPLETED
                            ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                            : request.status === RequestStatus.PENDING
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
                            : request.status === RequestStatus.PROCESSING
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100'
                            : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                        }`}>
                          {request.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
