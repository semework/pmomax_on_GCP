const IAM_URL = 'https://iam.cloud.ibm.com/identity/token';
const DEFAULT_REGION = 'us-south';

export function getWatsonxConfigError(env = process.env) {
  const missing = [];
  if (!env.IBM_WX_APIKEY) missing.push('IBM_WX_APIKEY');
  if (!env.IBM_WX_PROJECT_ID) missing.push('IBM_WX_PROJECT_ID');
  if (!env.IBM_WX_MODEL_ID) missing.push('IBM_WX_MODEL_ID');
  if (missing.length) {
    return `Missing IBM watsonx configuration: ${missing.join(', ')}.`;
  }
  return null;
}

async function getIamToken(apiKey) {
  const params = new URLSearchParams();
  params.set('grant_type', 'urn:ibm:params:oauth:grant-type:apikey');
  params.set('apikey', apiKey);

  const res = await fetch(IAM_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`IBM IAM token request failed: ${res.status} ${text}`);
  }

  const json = await res.json();
  if (!json?.access_token) throw new Error('IBM IAM token missing access_token.');
  return json.access_token;
}

export async function generateWatsonxText({ prompt, modelId, projectId, region }) {
  if (!prompt) throw new Error('Missing prompt for watsonx.');
  const apiKey = process.env.IBM_WX_APIKEY;
  const token = await getIamToken(apiKey);
  const wxRegion = region || process.env.IBM_WX_REGION || DEFAULT_REGION;
  const wxModel = modelId || process.env.IBM_WX_MODEL_ID;
  const wxProject = projectId || process.env.IBM_WX_PROJECT_ID;

  if (!wxModel) throw new Error('IBM_WX_MODEL_ID not set.');
  if (!wxProject) throw new Error('IBM_WX_PROJECT_ID not set.');

  const url = `https://${wxRegion}.ml.cloud.ibm.com/ml/v1/text/generation?version=2024-05-01`;
  const body = {
    model_id: wxModel,
    input: prompt,
    project_id: wxProject,
    parameters: {
      decoding_method: 'greedy',
      max_new_tokens: 2048,
      min_new_tokens: 0,
      temperature: 0.2,
      top_p: 1,
      top_k: 50,
      repetition_penalty: 1.0,
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`IBM watsonx request failed: ${res.status} ${text}`);
  }

  const json = await res.json();
  const out = json?.results?.[0]?.generated_text || json?.results?.[0]?.text || '';
  if (!out) throw new Error('IBM watsonx returned empty output.');
  return out;
}
