import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';

const DEBUG_LOG_PATH = path.resolve('logs', 'llm-debug.log');

export class LLMClient {
  constructor({ baseUrl, apiBaseUrl, modelName, apiKey = 'dummy-key' }) {
    this.instanceId = uuidv4();
    const url = baseUrl || apiBaseUrl || '';
    this.baseUrl = url.replace(/\/$/, '');
    this.modelName = modelName;
    this.apiKey = apiKey;
    this.conversationHistory = [];
  }

  async sendMessage(systemPrompt, userMessage, temperature = 0.2) {
    const requestId = uuidv4();
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
    await this._appendDebugLog(requestLog);

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
      await this._appendDebugLog(responseLog);

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
      await this._appendDebugLog(errorLog);
      throw err;
    }

    return responseText;
  }

  async _appendDebugLog(entry) {
    try {
      await fs.mkdir(path.dirname(DEBUG_LOG_PATH), { recursive: true });
      await fs.appendFile(DEBUG_LOG_PATH, JSON.stringify(entry) + '\n');
    } catch {
      // Silent fail for debug logging
    }
  }
}
