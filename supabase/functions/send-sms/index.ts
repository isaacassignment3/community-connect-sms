import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendSMSRequest {
  message: string;
  recipients: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    console.log('Fetching Hubtel settings from database...');

    // Get Hubtel settings from database
    const { data: settings, error: settingsError } = await supabaseClient
      .from('settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (settingsError) {
      console.error('Settings query error:', settingsError);
      return new Response(
        JSON.stringify({ error: 'Failed to retrieve settings', details: settingsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!settings) {
      console.error('No settings found in database');
      return new Response(
        JSON.stringify({ error: 'Hubtel API credentials not configured. Please add credentials in Settings.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { sender_id, client_id, client_secret } = settings;

    if (!sender_id || !client_id || !client_secret) {
      console.error('Incomplete credentials');
      return new Response(
        JSON.stringify({ 
          error: 'Incomplete Hubtel API credentials. All fields (Sender ID, Client ID, Client Secret) are required.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { message, recipients }: SendSMSRequest = await req.json();

    if (!message || !recipients || recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Message and recipients array are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Sending SMS to ${recipients.length} recipient(s)`);

    // Send SMS via Hubtel API
    const basicAuth = btoa(`${client_id}:${client_secret}`);
    
    const hubtelBody = {
      From: sender_id,
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
