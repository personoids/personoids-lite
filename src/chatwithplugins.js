import { ChatOpenAI } from "langchain/chat_models/openai";
import { initializeAgentExecutorWithOptions } from "langchain/agents";
import {
  RequestsGetTool,
  RequestsPostTool,
  AIPluginTool,
} from "langchain/tools";

let _agent = null;
export const initModel = async (force) => {
    if (_agent && !force) {
        return _agent;
    }
    const tools = [
        // await AIPluginTool.fromPluginUrl(
        //   "http://localhost:5004/.well-known/ai-plugin.json",
        // ),
        new RequestsGetTool(),
        new RequestsPostTool(),
      ];
      const model = new ChatOpenAI({ temperature: 0.8, modelName: "gpt-4" , maxTokens: 128});
      _agent = await initializeAgentExecutorWithOptions(tools, model, {
        
        agentType: "chat-zero-shot-react-description",
        verbose: true,
        maxIterations: 50,
        // agentArgs: {            
        //     systemMessage: "You are a.",
        // }
      });
      return _agent;
};

export const run = async (input, reset) => {

  const agent = await initModel(reset);
  const result = await agent.call({
    input,
  });
  return result;
};

