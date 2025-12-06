
import * as emailjsLib from '@emailjs/browser';

// CONFIGURATION: Replace these string values with your actual keys from https://dashboard.emailjs.com/
// If you leave these as placeholders, the app will simulate sending and log the code to the console.

const SERVICE_ID = 'service_r0ha3h6'; 
const TEMPLATE_ID = 'template_s2k9e1q'; 
const PUBLIC_KEY = 'QcGQuhVqyjT6mxbK0'; 

export const sendVerificationEmail = async (email: string, code: string, username: string): Promise<void> => {
  console.log(`[Email Service] Sending verification code to ${email}...`);

  // Handle ESM default export quirk (common with esm.sh)
  const emailjs = (emailjsLib as any).default || emailjsLib;

  try {
    // Explicitly initialize with public key (helps with some auth edge cases)
    if (emailjs.init) {
        emailjs.init(PUBLIC_KEY);
    }

    await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      {
        to_email: email,
        to_name: username,
        verification_code: code,
        message: `Welcome to Flow! Your verification code is: ${code}`,
        reply_to: email
      },
      PUBLIC_KEY
    );
    console.log("[Email Service] Email sent successfully.");
  } catch (error) {
    // Log the FULL error object nicely so it isn't just [object Object]
    console.error("EmailJS Error Details:", JSON.stringify(error, null, 2));
    
    // Check specifically for the text property which often contains the message
    if ((error as any)?.text) {
        console.error("EmailJS Error Message:", (error as any).text);
    }

    // If the API call fails (e.g. invalid keys), we fallback to console logging
    // This ensures the User Interface continues to the Verification screen smoothly.
    console.warn("[Email Service] API call failed. Check the 'EmailJS Error Details' above for the reason. Falling back to local simulation.");
    console.info(`%c[VERIFICATION CODE]: ${code}`, "color: #4ade80; font-weight: bold; font-size: 16px; padding: 4px; border: 1px solid #4ade80; border-radius: 4px;");
    
    // We do NOT throw an error here, so the UI treats this as a "success" 
    // and moves the user to the input screen.
    return Promise.resolve();
  }
};
