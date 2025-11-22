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

    if (!senderId || !clientId || !clientSecret) {
      console.error('Missing Hubtel credentials in environment variables');
      return new Response(
        JSON.stringify({
          error: 'Hubtel API credentials not configured. Please configure HUBTEL_SENDER_ID, HUBTEL_CLIENT_ID, and HUBTEL_CLIENT_SECRET in edge function secrets.'
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

    const basicAuth = btoa(`${clientId}:${clientSecret}`);

    const hubtelBody = {
      From: senderId,
      To: recipients.join(','),
      Content: message,
    };

    const hubtelResponse = await fetch('https://sms.hubtel.com/v1/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(hubtelBody),
    });

    const responseData = await hubtelResponse.json();

    console.log(`Hubtel API response status: ${hubtelResponse.status}`);

    if (!hubtelResponse.ok) {
      console.error('Hubtel API error:', responseData);
      return new Response(
        JSON.stringify({
          error: 'Failed to send SMS via Hubtel API',
          details: responseData,
          status: hubtelResponse.status
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('SMS sent successfully');

    return new Response(
      JSON.stringify({
        success: true,
        messageId: responseData.MessageId || responseData.message_id,
        recipientCount: recipients.length,
        response: responseData
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