import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey"
};

function isValidGhanaNumber(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.startsWith('233')) {
    if (cleaned.length !== 12) return false;
    const operatorCode = cleaned.substring(3, 5);
    const validCodes = ['20', '23', '24', '25', '26', '27', '28', '29', '50', '54', '55', '56', '57', '59'];
    return validCodes.includes(operatorCode);
  }

  if (cleaned.startsWith('0')) {
    if (cleaned.length !== 10) return false;
    const operatorCode = cleaned.substring(1, 3);
    const validCodes = ['20', '23', '24', '25', '26', '27', '28', '29', '50', '54', '55', '56', '57', '59'];
    return validCodes.includes(operatorCode);
  }

  if (cleaned.length === 9) {
    const operatorCode = cleaned.substring(0, 2);
    const validCodes = ['20', '23', '24', '25', '26', '27', '28', '29', '50', '54', '55', '56', '57', '59'];
    return validCodes.includes(operatorCode);
  }

  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    const senderId = Deno.env.get('HUBTEL_SENDER_ID');
    const clientId = Deno.env.get('HUBTEL_CLIENT_ID');
    const clientSecret = Deno.env.get('HUBTEL_CLIENT_SECRET');

    console.log('Checking Hubtel credentials...');
    console.log('HUBTEL_SENDER_ID present:', !!senderId);
    console.log('HUBTEL_CLIENT_ID present:', !!clientId);
    console.log('HUBTEL_CLIENT_SECRET present:', !!clientSecret);

    if (!senderId || !clientId || !clientSecret) {
      console.error('Missing Hubtel credentials in environment variables');
      const missingVars = [];
      if (!senderId) missingVars.push('HUBTEL_SENDER_ID');
      if (!clientId) missingVars.push('HUBTEL_CLIENT_ID');
      if (!clientSecret) missingVars.push('HUBTEL_CLIENT_SECRET');
      return new Response(JSON.stringify({
        error: `Missing environment variables: ${missingVars.join(', ')}. Please check edge function secrets configuration.`,
        missingVars
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    const { message, recipients } = await req.json();

    if (!message || !recipients || recipients.length === 0) {
      return new Response(JSON.stringify({
        error: 'Message and recipients array are required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    console.log(`Processing ${recipients.length} recipient(s)`);

    const validNumbers = [];
    const invalidNumbers = [];

    for (const phone of recipients) {
      if (isValidGhanaNumber(phone)) {
        let cleaned = phone.replace(/\D/g, '');
        if (!cleaned.startsWith('233')) {
          cleaned = '233' + cleaned.replace(/^0/, '');
        }
        validNumbers.push(cleaned);
      } else {
        invalidNumbers.push(phone);
      }
    }

    console.log(`Valid numbers: ${validNumbers.length}`);
    console.log(`Invalid numbers: ${invalidNumbers.length}`);
    if (invalidNumbers.length > 0) {
      console.log('Invalid numbers list:', invalidNumbers);
    }

    if (validNumbers.length === 0) {
      return new Response(JSON.stringify({
        error: 'No valid Ghana phone numbers found',
        invalidNumbers
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    console.log('Sending to valid numbers:', validNumbers.join(','));

    const hubtelUrl = `https://sms.hubtel.com/v1/messages/send?clientsecret=${encodeURIComponent(clientSecret)}&clientid=${encodeURIComponent(clientId)}&from=${encodeURIComponent(senderId)}&to=${encodeURIComponent(validNumbers.join(','))}&content=${encodeURIComponent(message)}`;

    const hubtelResponse = await fetch(hubtelUrl, {
      method: 'GET'
    });

    const responseData = await hubtelResponse.json();
    console.log(`Hubtel API response status: ${hubtelResponse.status}`);

    if (!hubtelResponse.ok) {
      console.error('Hubtel API error:', responseData);
      return new Response(JSON.stringify({
        error: 'Failed to send SMS via Hubtel API',
        details: responseData,
        status: hubtelResponse.status,
        validNumbersAttempted: validNumbers.length,
        invalidNumbersRejected: invalidNumbers.length,
        invalidNumbers
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    console.log('SMS sent successfully');

    return new Response(JSON.stringify({
      success: true,
      messageId: responseData.MessageId || responseData.message_id,
      validNumbersCount: validNumbers.length,
      invalidNumbersCount: invalidNumbers.length,
      invalidNumbers: invalidNumbers.length > 0 ? invalidNumbers : undefined,
      response: responseData
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Error in send-sms function:', error.message);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
