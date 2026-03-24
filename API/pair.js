const { Client, LocalAuth } = require('whatsapp-web.js');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action } = req.query;
  const sessions = new Map();

  if (action === 'generate') {
    const { phoneNumber, sessionId } = req.body;
    
    if (!phoneNumber || !sessionId) {
      return res.status(400).json({ error: 'Phone number and session ID required' });
    }

    try {
      const client = new Client({
        authStrategy: new LocalAuth({
          dataPath: `/tmp/sessions/${sessionId}`
        }),
        puppeteer: { args: ['--no-sandbox'] }
      });

      let pairingCode = null;

      await client.initialize();

      setTimeout(async () => {
        try {
          pairingCode = await client.requestPairingCode(phoneNumber);
          sessions.set(sessionId, { pairingCode });
        } catch (err) {
          console.error('Pairing error:', err);
        }
      }, 2000);

      // Wait for code
      let attempts = 0;
      while (!pairingCode && attempts < 15) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const session = sessions.get(sessionId);
        if (session?.pairingCode) {
          pairingCode = session.pairingCode;
          break;
        }
        attempts++;
      }

      if (pairingCode) {
        res.json({ success: true, pairingCode, sessionId });
      } else {
        res.json({ success: false, message: 'Could not generate code. Try again.' });
      }

    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(404).json({ error: 'Invalid action' });
  }
};
