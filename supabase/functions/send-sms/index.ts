import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SendSMSRequest {
  message: string;
  recipients: string[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
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

      return new Response(
        JSON.stringify({
          error: `Missing environment variables: ${missingVars.join(', ')}. Please check edge function secrets configuration.`,
          missingVars
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { message, recipients }: SendSMSRequest = await req.json();

    if (!message || !recipients || recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Message and recipients array are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Sending SMS to ${recipients.length} recipient(s)`);
    console.log('Raw recipients:', recipients);

    const formattedRecipients = recipients.map(phone => {
      let cleaned = phone.replace(/\D/g, '');

      if (cleaned.startsWith('233')) {
        return cleaned;
      } else if (cleaned.startsWith('0')) {
        return '233' + cleaned.substring(1);
      } else {
        return '233' + cleaned;
      }
    });

    console.log('Formatted recipients:', formattedRecipients);
    console.log('Formatted recipients length check:', formattedRecipients.map(r => `${r} (${r.length} digits)`));

    const basicAuth = btoa(`${clientId}:${clientSecret}`);

    const results = [];
    const errors = [];

    for (const recipient of formattedRecipients) {
      console.log(`Sending to individual recipient: ${recipient}`);

      const hubtelBody = {
        From: senderId,
        To: recipient,
        Content: message,
      };

      console.log('Hubtel request body:', JSON.stringify(hubtelBody));

      const hubtelResponse = await fetch('https://sms.hubtel.com/v1/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(hubtelBody),
      });

      const responseData = await hubtelResponse.json();
      console.log(`Hubtel API response for ${recipient}:`, JSON.stringify(responseData));

      if (hubtelResponse.ok) {
        results.push({
          recipient,
          success: true,
          messageId: responseData.MessageId || responseData.message_id,
          response: responseData
        });
      } else {
        errors.push({
          recipient,
          success: false,
          error: responseData
        });
      }
    }

    console.log(`Successfully sent: ${results.length}, Failed: ${errors.length}`);

    if (errors.length > 0 && results.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'All SMS sends failed',
          results: errors
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalRecipients: recipients.length,
        successCount: results.length,
        failureCount: errors.length,
        results,
        errors: errors.length > 0 ? errors : undefined
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in send-sms function:', error.message);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
