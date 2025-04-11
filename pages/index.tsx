import { useState } from 'react';

interface Invoice {
  invoice_number: string | number;
  invoiced_at: string;
  due_date: string;
  total: string | number;
  division: string;
  unpaid?: string | number;
  download_url?: string;
  energy_consumption: string | number;
  quantity?: number;
}

export default function Home() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [placeOfConsumption, setPlaceOfConsumption] = useState('E Belvedere 11a 53');
  const [log, setLog] = useState('');
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [authToken, setAuthToken] = useState('');

  const solveCaptcha = async () => {
    const response = await fetch('/api/solve-captcha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sitekey: '6LeqYkkgAAAAAGa5Jl5qmTHK_Nl4_40-YfU4NN71',
        pageurl: 'https://my.engie.ro/autentificare'
      })
    });
    const data = await response.json();
    return data.token;
  };

  const handleLogin = async () => {
    try {
      setLoading(true);
      setLog('🔐 Solving CAPTCHA...');
      const token = await solveCaptcha();
      setLog('🔓 Logging in...');

      const res = await fetch('/api/login-engie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, captchaToken: token, placeOfConsumption })
      });

      const data = await res.json();
      console.log('API Response:', data);
      if (data.error) throw new Error(data.error);
      console.log('Full login response:', data);
      if (data.data?.[0]?.invoices?.[0]?.invoices) {
        console.log('Invoices:', data.data[0].invoices[0].invoices);
        // The token should be in the authorization header of the response
        const token = data.data?.[0]?.token;
        console.log('Auth token:', token);
        setInvoices(data.data[0].invoices[0].invoices);
        setAuthToken(token);
        setLog('✅ Login successful');
      } else {
        console.log('No invoices found in response:', data);
        throw new Error('No invoice data available');
      }
    } catch (err: any) {
      setLog('❌ Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-6xl mx-auto mt-10 p-4 space-y-6">
      <div className="max-w-xl mx-auto space-y-4">
        <h1 className="text-xl font-bold">Login ENGIE</h1>
        <input className="border p-2 w-full rounded" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
        <input className="border p-2 w-full rounded" placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
        <input className="border p-2 w-full rounded" placeholder="Place of Consumption" value={placeOfConsumption} onChange={e => setPlaceOfConsumption(e.target.value)} />
        <button disabled={loading} className="bg-blue-600 text-white p-2 rounded w-full hover:bg-blue-700 transition-colors" onClick={handleLogin}>
          {loading ? 'Loading...' : 'Login & Fetch'}
        </button>
        {log && <div className="bg-gray-100 p-4 rounded text-sm">{log}</div>}
      </div>

      {invoices.length > 0 && (
        <div className="overflow-x-auto rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Număr factură</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data facturării</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data scadentă</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Suma totală</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tip</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Consum</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acțiuni</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.map((invoice, index) => (
                <tr key={`${invoice.invoice_number}-${index}`} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{String(invoice.invoice_number)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {invoice.invoiced_at}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {invoice.due_date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{String(invoice.total)} RON</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.division === 'elec' ? 'Electricitate' : 'Gaz'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{String(invoice.energy_consumption)} {invoice.division === 'elec' ? 'kWh' : 'm³'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${parseFloat(String(invoice.unpaid)) === 0 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {parseFloat(String(invoice.unpaid)) === 0 ? 'Plătită' : 'Neachitată'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {invoice.download_url && (
                      <button 
                        onClick={async () => {
                          try {
                            setLog('📄 Downloading invoice...');
                            console.log('Downloading with token:', authToken);
                            const res = await fetch('/api/download-invoice', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ 
                                downloadUrl: invoice.download_url,
                                token: authToken
                              })
                            });
                            console.log('Download response:', await res.clone().text());
                            
                            if (!res.ok) {
                              const errorData = await res.json();
                              throw new Error(errorData.error || 'Failed to download invoice');
                            }

                            // Check if we got a PDF
                            const contentType = res.headers.get('content-type');
                            if (!contentType || !contentType.includes('application/pdf')) {
                              throw new Error('Invalid response format');
                            }

                            const blob = await res.blob();
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `invoice-${invoice.invoice_number}.pdf`;
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                            document.body.removeChild(a);
                            setLog('✅ Invoice downloaded successfully');
                          } catch (err) {
                            console.error('Download error:', err);
                            setLog('❌ Error downloading invoice');
                          }
                        }}
                        className="text-blue-600 hover:text-blue-900 cursor-pointer"
                      >
                        Descarcă
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
