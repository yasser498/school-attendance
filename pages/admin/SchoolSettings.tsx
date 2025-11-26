import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { SchoolSettings } from '../../types';

const SchoolSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('school_settings')
        .select('*')
        .single();
      
      if (data) setSettings(data);
      if (error && error.code !== 'PGRST116') console.error(error);
    } catch (err) {
      console.error('Error loading settings:', err);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      const { error } = await supabase
        .from('school_settings')
        .upsert({
          ...settings,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
      setMessage('✅ تم حفظ الإعدادات بنجاح!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Error saving:', err);
      setMessage('❌ حدث خطأ أثناء الحفظ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">⚙️ إعدادات هوية المدرسة</h1>
        
        {message && (
          <div className={`p-4 mb-4 rounded ${message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {message}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">اسم المدرسة</label>
            <input
              type="text"
              value={settings?.school_name || ''}
              onChange={(e) => setSettings({ ...settings!, school_name: e.target.value })}
              className="w-full border rounded px-3 py-2"
              placeholder="متوسطة عماد الدين زنكي"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">رابط شعار المدرسة</label>
            <input
              type="text"
              value={settings?.school_logo_url || ''}
              onChange={(e) => setSettings({ ...settings!, school_logo_url: e.target.value })}
              className="w-full border rounded px-3 py-2"
              placeholder="https://www.raed.net/img?id=1473202"
            />
            {settings?.school_logo_url && (
              <img 
                src={settings.school_logo_url} 
                alt="شعار المدرسة"
                className="mt-2 h-24 object-contain border rounded p-2"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">اسم المدير</label>
            <input
              type="text"
              value={settings?.principal_name || ''}
              onChange={(e) => setSettings({ ...settings!, principal_name: e.target.value })}
              className="w-full border rounded px-3 py-
