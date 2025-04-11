const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const { username, password, captchaToken, placeOfConsumption } = req.body;
  if (!username || !password || !captchaToken || !placeOfConsumption) {
    return res.status(400).json({ error: "Missing credentials, captchaToken, or place of consumption" });
  }

  try {
    const form = new URLSearchParams();
    form.append("username", username);
    form.append("password", password);
    form.append("g-recaptcha-response", captchaToken);

    const loginRes = await fetch("https://gwss.engie.ro/myservices/v1/login", {
      method: "POST",
      headers: { 
        "source": "desktop",
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: form
    });

    const loginData = await loginRes.json();
    console.log('Login response:', loginData);
    
    if (!loginRes.ok || loginData.error) {
      return res.status(401).json({ error: "Login failed", details: loginData, status: loginRes.status });
    }

    const token = loginData.data?.token;
    if (!token) {
      return res.status(400).json({ error: "No token in login response", details: loginData });
    }

    // Get contracts to find POC number for the given alias
    const contractsRes = await fetch("https://gwss.engie.ro/myservices/v1/contracts", {
      method: "GET",
      headers: { 
        "Authorization": `Bearer ${token}`,
        "source": "desktop",
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Origin": "https://my.engie.ro",
        "Referer": "https://my.engie.ro/"
      },
      redirect: 'follow'
    });

    const contractsData = await contractsRes.json();
    console.log('Contracts response:', contractsData);

    if (!contractsRes.ok || contractsData.error) {
      return res.status(contractsRes.status || 500).json({ 
        error: "Failed to fetch contracts", 
        details: contractsData,
        status: contractsRes.status 
      });
    }

    // Find the contract with matching alias
    const contract = contractsData.data?.find(c => c.alias === placeOfConsumption);
    if (!contract) {
      return res.status(400).json({ 
        error: "Place of consumption not found", 
        details: `No contract found with alias: ${placeOfConsumption}`
      });
    }

    const pa = contract.pa;
    const poc = contract.poc_number;

    if (!pa || !poc) {
      return res.status(400).json({ 
        error: "Missing required data from contract", 
        data: { hasPa: !!pa, hasPoc: !!poc },
        details: contract
      });
    }

    // Calculate date range: last 12 months
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);
    
    const invoiceRes = await fetch(`https://gwss.engie.ro/myservices/v1/invoices/history-only/${poc}?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}&pa=${pa}`, {
      method: "GET",
      headers: { 
        "Authorization": `Bearer ${token}`,
        "source": "desktop",
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Origin": "https://my.engie.ro",
        "Referer": "https://my.engie.ro/"
      },
      redirect: 'follow'
    });

    const invoiceData = await invoiceRes.json();
    console.log('Invoice response:', invoiceData);

    if (!invoiceRes.ok || invoiceData.error) {
      return res.status(invoiceRes.status || 500).json({ 
        error: "Failed to fetch invoices", 
        details: invoiceData,
        status: invoiceRes.status 
      });
    }

    // Pass through the invoice data and token
    const formattedData = [{
      invoices: invoiceData.data || [],
      token: token // Include the token from login
    }];
    console.log('Sending invoice data and token:', formattedData);
    res.status(200).json({ error: false, data: formattedData });
  } catch (e) {
    console.error('API Error:', e);
    console.error('Error stack:', e.stack);
    console.error('Error details:', {
      name: e.name,
      message: e.message,
      code: e.code,
      response: e.response
    });
    res.status(500).json({ 
      error: "Unexpected error", 
      message: e.message,
      details: e.stack
    });
  }
}
