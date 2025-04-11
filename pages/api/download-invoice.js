export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Request body:', req.body);
    const { downloadUrl, token } = req.body;
    console.log('Download URL:', downloadUrl);
    console.log('Token:', token);
    if (!downloadUrl || !token) {
      console.log('Missing parameters - downloadUrl:', !!downloadUrl, 'token:', !!token);
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const response = await fetch(downloadUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'ro-RO,ro;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Host': 'gwss.engie.ro',
        'Origin': 'https://my.engie.ro',
        'Referer': 'https://my.engie.ro/',
        'sec-ch-ua': '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site',
        'source': 'desktop',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      console.error('Download failed:', response.status, response.statusText);
      try {
        const error = await response.json();
        return res.status(response.status).json(error);
      } catch {
        return res.status(response.status).json({ 
          error: 'Failed to download invoice', 
          status: response.status 
        });
      }
    }

    const contentType = response.headers.get('content-type');
    const contentDisposition = response.headers.get('content-disposition');
    
    // Forward the response headers
    res.setHeader('Content-Type', contentType);
    if (contentDisposition) {
      res.setHeader('Content-Disposition', contentDisposition);
    }

    // Stream the PDF data
    const pdfData = await response.arrayBuffer();
    res.send(Buffer.from(pdfData));
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Failed to download invoice', details: error.message });
  }
}
