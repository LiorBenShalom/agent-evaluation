export class AgentEvalConfig {
  static readonly port = parseInt(process.env.AGENT_EVAL_PORT || '4500', 10);
  static readonly mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/agent-eval';
  static readonly mongoEnabled = !!process.env.MONGO_URL;
}
