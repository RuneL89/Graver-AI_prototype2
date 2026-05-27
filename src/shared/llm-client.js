const DEBUG_LOG = [];

export class LLMClient {
  constructor({ baseUrl, apiBaseUrl, modelName, apiKey = 'dummy-key' }) {
    this.instanceId = crypto.randomUUID();
    const url = baseUrl || apiBaseUrl || '';
    this.baseUrl = url.replace(/\/$/, '');
    this.modelName = modelName;
    this.apiKey = apiKey;
    this.conversationHistory = [];
  }

  async sendMessage(systemPrompt, userMessage, temperature = 0.2) {
    const requestId = crypto.randomUUID();
    const payload = {
      model: this.modelName,
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        ...this.conversationHistory,
        { role: 'user', content: userMessage },
      ],
      temperature,
    };

    const requestLog = {
      timestamp: new Date().toISOString(),
      instanceId: this.instanceId,
      requestId,
      type: 'REQUEST',
      payload,
    };
    DEBUG_LOG.push(requestLog);
    console.log(`[LLMClient ${this.instanceId}] REQUEST`, requestId);

    let responseText;
    try {
      const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(
          `LLM API error (${res.status} ${res.statusText}): ${errText}`
        );
      }

      const data = await res.json();
      responseText =
        data.choices?.[0]?.message?.content ?? JSON.stringify(data);

      const responseLog = {
        timestamp: new Date().toISOString(),
        instanceId: this.instanceId,
        requestId,
        type: 'RESPONSE',
        payload: data,
      };
      DEBUG_LOG.push(responseLog);
      console.log(`[LLMClient ${this.instanceId}] RESPONSE`, requestId);

      this.conversationHistory.push(
        { role: 'user', content: userMessage },
        { role: 'assistant', content: responseText }
      );
    } catch (err) {
      const errorLog = {
        timestamp: new Date().toISOString(),
        instanceId: this.instanceId,
        requestId,
        type: 'ERROR',
        error: err.message,
      };
      DEBUG_LOG.push(errorLog);
      console.error(`[LLMClient ${this.instanceId}] ERROR`, requestId, err.message);
      throw err;
    }

    return responseText;
  }
}

export function getDebugLog() {
  return DEBUG_LOG;
}
