import type { APIRoute } from 'astro';
import Groq from 'groq-sdk';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const { description } = await request.json();

    if (!description) {
      return new Response(JSON.stringify({ error: 'Description is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const groqApiKey = import.meta.env.GROQ_API_KEY || process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return new Response(JSON.stringify({ error: 'Groq API Key is not configured on the server.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const groq = new Groq({ apiKey: groqApiKey });

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are an expert movie identifier. You must respond ONLY with a raw JSON object and absolutely no other text, markdown formatting, or code blocks. Do not wrap the JSON in backticks. The JSON must have these exact keys: "title", "year", "description" (a 1-sentence summary), "director", and "genre". If you cannot identify the movie, return {"error": "Could not identify the movie."}.'
        },
        {
          role: 'user',
          content: description
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    const resultString = completion.choices[0]?.message?.content || '{}';
    let resultJson;
    try {
      resultJson = JSON.parse(resultString);
    } catch (e) {
      // Fallback if the model somehow returned markdown
      const cleanedString = resultString.replace(/```json/g, '').replace(/```/g, '').trim();
      resultJson = JSON.parse(cleanedString);
    }

    return new Response(JSON.stringify(resultJson), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error finding movie:', error);
    return new Response(JSON.stringify({ error: 'An error occurred while finding the movie.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
