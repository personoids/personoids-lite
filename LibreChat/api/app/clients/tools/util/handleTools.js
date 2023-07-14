const { getUserPluginAuthValue } = require('../../../../server/services/PluginService');
const { OpenAIEmbeddings } = require('langchain/embeddings/openai');
const { ZapierToolKit } = require('langchain/agents');
const {
  SerpAPI,
  ZapierNLAWrapper,
  Tool,
  JsonSpec,
  JsonObject

} = require('langchain/tools');
const { ChatOpenAI } = require('langchain/chat_models/openai');
const { Calculator } = require('langchain/tools/calculator');
const { WebBrowser } = require('langchain/tools/webbrowser');
const {
  availableTools,
  AIPluginTool,
  GoogleSearchAPI,
  WolframAlphaAPI,
  StructuredWolfram,
  HttpRequestTool,
  OpenAICreateImage,
  StableDiffusionAPI,
  StructuredSD,
} = require('../');
const {
  RequestsGetTool,
  RequestsPostTool,
} = require("langchain/tools");
const {createOpenAPIChain} = require("langchain/chains");
const { createOpenApiAgent, OpenApiToolkit } = require("langchain/agents");

const validateTools = async (user, tools = []) => {
  try {
    const validToolsSet = new Set(tools);
    const availableToolsToValidate = availableTools.filter((tool) =>
      validToolsSet.has(tool.pluginKey)
    );

    const validateCredentials = async (authField, toolName) => {
      const adminAuth = process.env[authField];
      if (adminAuth && adminAuth.length > 0) {
        return;
      }

      const userAuth = await getUserPluginAuthValue(user, authField);
      if (userAuth && userAuth.length > 0) {
        return;
      }
      validToolsSet.delete(toolName);
    };

    for (const tool of availableToolsToValidate) {
      if (!tool.authConfig || tool.authConfig.length === 0) {
        continue;
      }

      for (const auth of tool.authConfig) {
        await validateCredentials(auth.authField, tool.pluginKey);
      }
    }

    return Array.from(validToolsSet.values());
  } catch (err) {
    console.log('There was a problem validating tools', err);
    throw new Error(err);
  }
};

const loadToolWithAuth = async (user, authFields, ToolConstructor, options = {}) => {
  return async function () {
    let authValues = {};

    for (const authField of authFields) {
      let authValue = process.env[authField];
      if (!authValue) {
        authValue = await getUserPluginAuthValue(user, authField);
      }
      authValues[authField] = authValue;
    }

    return new ToolConstructor({ ...options, ...authValues });
  };
};

const loadTools = async ({ user, model, functions = null, tools = [], options = {} }) => {
  const toolConstructors = {
    calculator: Calculator,
    google: GoogleSearchAPI,
    wolfram: functions ? StructuredWolfram : WolframAlphaAPI,
    'dall-e': OpenAICreateImage,
    'stable-diffusion': functions ? StructuredSD : StableDiffusionAPI
  };

  const customConstructors = {
    browser: async () => {
      let openAIApiKey = options.openAIApiKey ?? process.env.OPENAI_API_KEY;
      openAIApiKey = openAIApiKey === 'user_provided' ? null : openAIApiKey;
      openAIApiKey = openAIApiKey || await getUserPluginAuthValue(user, 'OPENAI_API_KEY');
      return new WebBrowser({ model, embeddings: new OpenAIEmbeddings({ openAIApiKey }) });
    },
    serpapi: async () => {
      let apiKey = process.env.SERPAPI_API_KEY;
      if (!apiKey) {
        apiKey = await getUserPluginAuthValue(user, 'SERPAPI_API_KEY');
      }
      return new SerpAPI(apiKey, {
        location: 'Austin,Texas,United States',
        hl: 'en',
        gl: 'us'
      });
    },
    zapier: async () => {
      let apiKey = process.env.ZAPIER_NLA_API_KEY;
      if (!apiKey) {
        apiKey = await getUserPluginAuthValue(user, 'ZAPIER_NLA_API_KEY');
      }
      const zapier = new ZapierNLAWrapper({ apiKey });
      return ZapierToolKit.fromZapierNLAWrapper(zapier);
    },
    plugins: async () => {
      // request to http://host.docker.internal:5004/.well-known/ai-plugin.json
      const url = process.env.AI_PLUGIN_URL || "http://host.docker.internal:5004/.well-known/ai-plugin.json";
      // const response = await fetch(url);
      // const data = await response.json();
      // // get manifest
      // const manifestUrl = data.api.url;
      // const manifestResponse = await fetch(manifestUrl);
      // const manifestData = await manifestResponse.json();
      // const description_for_model = data.description_for_model;
      // const name_for_model = data.name_for_model;           
      // const headers = {
      //   // "Content-Type": "application/json",
      //   // Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      // };
      // const toolkit = new OpenApiToolkit(new JsonSpec(manifestData), model, headers);
      // const executor = createOpenApiAgent(model, toolkit);

      // class tl extends Tool{

      //   constructor(){
      //     super();
      //     this.executor = executor;
      //     this.name = name_for_model;
      //     this.description = description_for_model;
      //   }
      //   async call(...args){
      //     return await this.executor.call(...args);
      //   }
      // }
      const tool = await AIPluginTool.fromPluginUrl(url, model);
      return [tool,new HttpRequestTool()];
    },
  };

  const requestedTools = {};

  const toolOptions = {
    serpapi: { location: 'Austin,Texas,United States', hl: 'en', gl: 'us' }
  };

  const toolAuthFields = {};

  availableTools.forEach((tool) => {
    if (customConstructors[tool.pluginKey]) {
      return;
    }

    toolAuthFields[tool.pluginKey] = tool.authConfig.map((auth) => auth.authField);
  });

  for (const tool of tools) {
    if (customConstructors[tool]) {
      requestedTools[tool] = customConstructors[tool];
      continue;
    }

    if (toolConstructors[tool]) {
      const options = toolOptions[tool] || {};
      const toolInstance = await loadToolWithAuth(
        user,
        toolAuthFields[tool],
        toolConstructors[tool],
        options
      );
      requestedTools[tool] = toolInstance;
    }
  }

  return requestedTools;
};

module.exports = {
  validateTools,
  loadTools
};
