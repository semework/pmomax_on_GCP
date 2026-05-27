const fetch = require('node-fetch');

const ENDPOINT = 'https://pmo-architect-zxofcfyioq-ue.a.run.app/api/ai/assistant';

const mainQuestions = [
  'What are the top risks for this project?',
  'How can we mitigate compliance gaps?',
  'Summarize the PID for an executive.',
  'Draft objectives for the next phase.',
  'What is the current project status?',
  'How do I use create mode?',
  'Check compliance gaps.',
  'What are the key milestones?',
  'How do I update the risks section?',
  'What is the budget breakdown?',
  'How do I improve the PID?',
  'What are the main deliverables?',
  'How do I request help?',
  'What is the summary of compliance findings?',
  'How do I fill missing PID fields?',
  'What is the executive summary?',
  'How do I check for security gaps?',
  'What are the project dependencies?',
  'How do I export the PID?',
  'What is the timeline for completion?',
  'How do I review audit logs?',
  'What are the privacy concerns?',
  'How do I update compliance notes?',
  'What is the risk mitigation plan?',
  'How do I summarize project status?'
];

const createQuestions = [
  'Create a PID for a customer service platform pilot that unifies chat, SMS, and voice for North America support.',
  'Draft a PID for a new mobile app launch.',
  'Improve the objectives section for a healthcare project.',
  'Fill missing fields in the PID.',
  'Summarize the PID for an executive.',
  'Identify compliance gaps in the PID.',
  'Propose risk mitigation strategies for a software rollout.',
  'Draft a budget breakdown for a marketing campaign.',
  'Update the deliverables section for a cloud migration.',
  'Complete the timeline for a product launch.',
  'Review audit logs for a security project.',
  'Draft objectives for a customer support initiative.',
  'Summarize compliance findings for a finance project.',
  'Fill in missing compliance notes.',
  'Draft a risk mitigation plan for a new feature rollout.',
  'Summarize project status for a board meeting.',
  'Draft a PID for a data privacy initiative.',
  'Improve the PID for a logistics project.',
  'Draft a PID for a remote work transition.',
  'Update the PID for a software upgrade.',
  'Draft a PID for a sustainability project.',
  'Summarize risks for a compliance audit.',
  'Draft a PID for a new product development.',
  'Fill in missing budget details.',
  'Draft a PID for a digital transformation project.'
];

async function submitQuestion(question, mode = 'main') {
  const body = {
    messages: [{ role: 'user', content: question }],
    pidData: {},
    model: undefined,
    appState: { mode: mode === 'main' ? 'default' : 'create' }
  };
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) return { error: `HTTP ${res.status}` };
  const data = await res.json();
  return data.reply || data;
}

async function validatePanel(questions, mode) {
  const results = [];
  for (const q of questions) {
    const answer = await submitQuestion(q, mode);
    results.push({ question: q, answer });
  }
  return results;
}

(async () => {
  console.log('Validating Main AI Assistant...');
  const mainResults = await validatePanel(mainQuestions, 'main');
  console.log('Validating Create AI Assistant...');
  const createResults = await validatePanel(createQuestions, 'create');
  const report = { mainResults, createResults };
  require('fs').writeFileSync('ai_assistant_validation_report.json', JSON.stringify(report, null, 2));
  console.log('Validation complete. Report saved to ai_assistant_validation_report.json');
})();
