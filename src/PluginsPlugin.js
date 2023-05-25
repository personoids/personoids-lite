import Microformats from 'microformat-node';
import axios from 'axios';
import path from 'path';
import { spawn, execSync } from 'child_process';
import fs from 'fs';
import { serpAPIKey, openai } from "./chromaClient.js";
import { cleanHtml } from "./cleanHtml.js";
import { InMemoryDocumentStores } from "./InMemoryDocumentStores.js";
import { run } from "./chatwithplugins.js";
import stream from 'stream';

const coding_instructions = fs.readFileSync(path.resolve("prompts/coding_instructions.txt")).toString();
const further_instructions = fs.readFileSync(path.resolve("prompts/further_instructions.txt")).toString();
const bootstrapInstructions = fs.readFileSync(path.resolve("prompts/bootstrap_instructions.txt")).toString();
const javascript_code_description = fs.readFileSync(path.resolve("prompts/javascript_code_description.txt")).toString();
const description_for_model = fs.readFileSync(path.resolve("prompts/description_for_model.txt")).toString();
const planning = fs.readFileSync(path.resolve("prompts/planning.txt")).toString();

const inMemoryDocumentStores = new InMemoryDocumentStores();
async function init() {
  try {
    await inMemoryDocumentStores.initialize();
    const methods = await global.inMemoryDocumentStoreForMethods.structured_query(undefined, 500);
    methods.forEach((method) => {
      const name = method.name;
      PluginsPlugin.methods[name] = {
        // tags: [name],
        request: method.request,
        response: method.response,
        ...method,
        handler: async (request) => {
          return await (eval(method.javascript_code))(request);
        },
      };
    });
  }
  catch (error) {
    console.error("chroma not ready yet", error);
    setTimeout(() => {
      init();
    }, 5000);
  }
}
let booted = false;
init();
export const PluginsPlugin = {
  description_for_model: description_for_model + coding_instructions,
  description_for_human: 'The Power of Autonomy in Every Chat.',
  name_for_human: 'Personoids Plugin',
  name_for_model: 'DoAnythingPlugin',
  logo_url: "http://localhost:5004/logo.png",
  methods: {
    "plan":{       
        method: "GET",
        description: "This method explains how to plan or break down a big task into smaller tasks. When faced with a large task, it is often helpful to break it down into smaller, more manageable tasks.",
        request: {},
        response: {
        },
        handler: async (request) => {
          return {
            result: planning
          }
        }
    },
    "askAssistant":{
        method: "POST",
        description: "This method sends a message to a sub-assistant that helps the assistant accomplish goals and execute tasks.",
        request: {
          message: {
            type: 'string',
            description: 'The message to send to the assistant',
          },
          reset_conversation: {
            type: 'boolean',
            description: 'If true, resets the conversation',
            default: false,
          },
        },
        
        response: {
        },
        handler: async ({message,reset_conversation}) => {          
            const result = await run(message,reset_conversation);
            return {response:result};
        }
    },
    "fileSystemOperation": {
      tags: ['Filesystem'],
      description: 'Performs a filesystem operation',
      request: {
        operation: {
          type: 'string',
          description: 'The operation to perform',
          enum: ['readFile', 'writeFile', 'appendFile', 'deleteFile', 'listFiles', 'listDirectories', 'createDirectory', 'deleteDirectory'],
        },
        path: {
          type: 'string',
          description: 'The path to perform the operation on',
        },
        data: {
          type: 'string',
          description: 'The data to write to the file',
        },
        encoding: {
          type: 'string',
          description: 'The encoding to use when reading or writing the file',
          default: 'utf8',
        },
        recursive: {
          type: 'boolean',
          description: 'If true, performs the operation recursively',
          default: false,
        },
      },
      response: {},
      handler: async ({ operation, path, data, encoding, recursive }) => {
        let result = {};
        // from filesystem
        if (operation === 'readFile' || operation === 'read') {
          const contents = fs.readFileSync(path, encoding);
          result = { contents };
        }
        else if (operation === 'writeFile' || operation === 'write') {
          fs.writeFileSync(path, data, encoding);
          return {
            result: `wrote ${data.length} bytes to ${path}`
          }
        }
        else if (operation === 'appendFile' || operation === 'append') {
          fs.appendFileSync(path, data, encoding);
          return {
            result: `appended ${data.length} bytes to ${path}`
          }
        }
        else if (operation === 'deleteFile' || operation === 'deleteDirectory' || operation === 'delete') {
          if (recursive === true) {
            execSync(`rm -rf ${path}`);
            return {
              result: `deleted ${path} recursively`
            }
          }
          else{
            fs.unlinkSync(path);
            return {
              result: `deleted ${path}`
            }
          }
        }
        else if (operation === 'listFiles' || operation === 'list' || operation === 'ls' || operation === 'dir') {
          if (recursive === true) {
            const files = execSync(`find ${path} -type f`).toString().split("\n");
            result = { files };
          }
          else {
            const files = fs.readdirSync(path);
            result = { files };
          }
        }
        else if (operation === 'listDirectories' || operation === 'find') {
          if (recursive === true) {
            const directories = execSync(`find ${path} -type d`).toString().split("\n");
            result = { directories };
          }
          else {
            const directories = fs.readdirSync(path);
            result = { directories };
          }
        }
        else if (operation === 'createDirectory' || operation === 'mkdir' || operation === 'md' || operation === 'mkdirp') {
          fs.mkdirSync(path, { recursive: true });
          return {
            result: `created ${path}`
          }
        }
        else {
          throw new Error("Invalid operation. must be one of readFile, writeFile, appendFile, deleteFile, listFiles, listDirectories, createDirectory, deleteDirectory");
        }
      }
    },
    "shellExecute": {
      tags: ['Shell'],
      description: 'Executes a shell command. make sure to use the silent or quiet flags to prevent the command from hanging.',
      request: {
        command: {
          type: 'string',
        },
        cwd: {
          type: 'string',
        },
        env_string: {
          type: 'string',
          default: '',
          required: false,
        },
        blocking: {
          type: 'boolean',
          default: true,
        },
        terminate_after_seconds: {
          type: 'number',
          default: 5 * 60,
          required: false,
        }
      },
      response: {},
      handler: async ({ command, cwd, env_string, blocking , terminate_after_seconds}) => {
        terminate_after_seconds = terminate_after_seconds || 5 * 60;        
        const env = {};
        if (env_string) {
          const envs = env_string.split("\n");
          envs.forEach((env) => {
            const [key, value] = env.split("=");
            env[key] = value;
          });
        }

        if (blocking === false) {
          const child = spawn(command, { cwd, env, shell: true });
          return { pid: child.pid };
        }
        else {
          return new Promise((resolve, reject) => {
            let stderr = "";
            let stdout = "";
            let child;
            let ended = false;
            try{              
              child = spawn(command, { cwd, env, shell: true }); // ,stdio: ['pipe', 'pipe', 'pipe']              
              // new stream.Readable({ read: async function read(/** @type {number} */ size) {
              //   if (!didread) {
              //     didread = true;
              //     this.push(null);
              //     return;
              //   }
              //   // process is waiting for data, shouldnt happen
              //   ended = true;
              //   child.kill();
              //   reject(new Error(`Blocking process is waiting for input. terminating. try using the silent or quiet flags of this shell command. stderr: ${stderr} stdout: ${stdout}`));
              // }}).pipe(child);
            }
            catch(error){
              reject(error);
              return;
            }
            if(terminate_after_seconds > 0){
              setTimeout(() => {
                if (ended === true) {
                  return;
                }
                child.kill();
                ended = false;
                reject(new Error(`Timeout in blocking process. stderr: ${stderr} stdout: ${stdout} terminate_after_seconds: ${terminate_after_seconds} seconds`));
              }, 1000 * terminate_after_seconds);
            }
            
            child.stdout.on('data', (data) => {
              stdout += data;
            });

            child.stderr.on('data', (data) => {
              stderr += data;
            });
            child.on('error', (error) => {
              console.log(`child process errored with ${error} stderr: ${stderr} stdout: ${stdout}`);
              ended = true;
              reject(error);
              resolve({ code:913, error, stderr, stdout });
            });
            child.on('close', (code) => {
              console.log(`child process exited with code ${code}`);
              ended = true;
              resolve({ code, stderr, stdout });
            });
          }
          );
        }
      }
    },
    "createOrUpdatePluginMethod": {
      tags: ['Method'],
      description: 'Creates or updates a method on this plugin',
      request: {
        name: {
          type: 'string',
        },
        description: {
          type: 'string',
        },
        request_fields: {
          type: 'array',
          description: 'The parameters for this method (all of type string)',
          items: {
            type: 'string',
          },
          default: [],
        },
        imports: {
          type: 'array',
          description: 'The imports for this method, these will be "require()" and injected',
          items: {
            type: 'string',
          }
        },
        delete: {
          type: 'boolean',
          description: 'If true, deletes the method instead of creating it',
        },
        javascript_code: {
          type: 'string',
          description: javascript_code_description,
        }
      },
      response: {},
      handler: async ({ name, description, request_fields, javascript_code, imports }) => {
        if (!name) {
          throw new Error("No name provided");
        }
        // if (!description) {
        //   throw new Error("No description provided");
        // }
        request_fields = request_fields || [];

        const parametersObject = {};
        request_fields.forEach((parameter) => {
          parametersObject[parameter] = {
            type: 'string',
          };
        });
        if (javascript_code.includes("CODE_HERE")) {
          throw new Error("must replace CODE_HERE with your actual code");
        }
        if (javascript_code.includes("RETURN_STATEMENT_HERE")) {
          throw new Error("must replace RETURN_STATEMENT_HERE with your actual return statement");
        }
        if (javascript_code.includes("global.someGlobalVariable")) {
          throw new Error("must replace global.someGlobalVariable with your actual global variables");
        }
        if (javascript_code === "") {
          throw new Error("must pass in javascript_code");
        }
        var actualFn;
        try {
          actualFn = eval(javascript_code);
        }
        catch (e) {
          throw new Error("javascript_code must be an anonymous async function: async ({parameter1, parameter2, ...})=>{}\n but threw error: " + e.message);
        }
        if (!actualFn)
          throw new Error("javascript_code must be an anonymous async function: async ({parameter1, parameter2, ...})=>{}");

        PluginsPlugin.methods[name] = {
          // tags: [name],
          description: description,
          request: parametersObject,
          imports: imports,
          response: {},
          handler: async (request) => {
            try {
              return await ((actualFn)(request));
            }
            catch (e) {
              if (e.message && e.message.includes("eval(...) is not a function")) {
                throw new Error("javascript_code must be an anonymous async function: async ({parameter1, parameter2, ...})=>{}");
              }
              else {
                throw e;
              }
            }
          }
        };
        await global.inMemoryDocumentStoreForMethods.setDocument(name, { name, description, request_fields, javascript_code });
        return { result: "success - created method " + name };
      }
    },
    "webSearch": {
      tags: ['Web'],
      description: 'useful for searching the web',
      request: {
        query: {
          type: 'string',
        },
      },
      response: {
        webPages: {
          type: 'object',
        },
      },
      handler: async ({ query }) => {
        // SERP API
        if (!serpAPIKey) {
          throw new Error("No SERPAPI_API_KEY provided");
        }
        const serpAPIUrl = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&hl=en&gl=us&api_key=${serpAPIKey}`;
        const response = await axios.get(serpAPIUrl);
        return { webPages: response.data.organic_results };
      }
    },
    "urlFetch": {
      tags: ['Web'],
      description: 'Fetches a web page and returns the html. optionally extracts text, microformats, or uses one of the selectors to extract a specific element',
      request: {
        url: {
          type: 'string',
        },
        enableTextExtractionOnly: {
          type: 'boolean',
        },
        enableImageCaptionExtraction: {
          type: 'boolean',
        },
        enableMicroFormatExtraction: {
          type: 'boolean',
        },
        xPathBasedSelector: {
          type: 'string',
        },
        cssBasedSelector: {
          type: 'string',
        },
        pureJavascriptBasedSelectorFunction: {
          type: 'string',
        },
        regexSelector: {
          type: 'string',
        },
        maxBytes: {
          type: 'number',
          default: 2000,
        },
      },
      response: {
        result: {
          type: 'string',
        },
      },
      handler: async ({ url, enableTextExtractionOnly, enableMicroFormatExtraction, xPathBasedSelector, cssBasedSelector, pureJavascriptBasedSelectorFunction, regexSelector, maxBytes }) => {
        let response;
        try {
          response = await axios.get(url);
        }
        catch (e) {
          const responseData = e.response.data;
          if (responseData && responseData.error) {
            return { result: responseData.error };
          }
        }
        let html = response.data;
        let finalResult = html;

        if (xPathBasedSelector) {
          // html is a string
          const document = new DOMParser().parseFromString(html, "text/html");
          const selectedElement = document.evaluate(xPathBasedSelector, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
          finalResult = selectedElement.outerHTML;
        }
        else if (cssBasedSelector) {
          // html is a string
          const document = new DOMParser().parseFromString(html, "text/html");
          const selectedElement = document.querySelector(cssBasedSelector);
          finalResult = selectedElement.outerHTML;
        }
        else if (pureJavascriptBasedSelectorFunction) {
          // html is a string
          const document = new DOMParser().parseFromString(html, "text/html");

          finalResult = await eval(pureJavascriptBasedSelectorFunction)(document, html, url);
        }
        else if (regexSelector) {
          // html is a string. return all matches
          const regex = new RegExp(regexSelector);
          const matches = regex.exec(html);
          finalResult = matches.join("\n");
        }
        if (enableTextExtractionOnly) {
          finalResult = cleanHtml(finalResult);
        }
        else if (enableMicroFormatExtraction) {
          const microformats = await Microformats.get({ html: finalResult });
          finalResult = JSON.stringify(microformats);
        }
        // else if(enableImageCaptionExtraction) {
        //   // html is actually a binary image
        //   const imageCaptionExtractionUrl = `https://api.deepai.org/api/neuraltalk`;
        //   finalResult = "image caption extraction not implemented yet: " + imageCaptionExtractionUrl;
        // }
        if (finalResult.length > maxBytes)
          finalResult = finalResult.substring(0, maxBytes) + "...";

        return { result: finalResult };
      }
    },
    "storeDocument": {
      tags: ['Document'],
      description: 'Stores a document in the in-memory document store, document should have a text field. you can omit the id field to generate a new id',
      request: {
        collection: {
          type: 'string',
        },
        id: {
          type: 'string',
          description: 'optional'
        },
        document_json: {
          type: 'string',
        },
        // document: {
        //   type: 'object',
        // },
      },
      response: {
        result: {
          type: 'string',
        },
      },
      handler: async ({ id, document_json, document, collection }) => {
        if (!document && document_json)
          document = JSON.parse(document_json);
        const _inMemoryDocumentStore = await inMemoryDocumentStores.getOrCreateStore(collection);
        const newId = await _inMemoryDocumentStore.setDocument(id, document);
        return { result: newId };
      }
    },
    "getSingleDocument": {
      tags: ['Document'],
      request: {
        collection: {
          type: 'string',
        },
        id: {
          type: 'string',
        },
      },
      response: {
        document: {
          type: 'object',
        },
      },
      handler: async ({ id, collection }) => {
        const _inMemoryDocumentStore = await inMemoryDocumentStores.getOrCreateStore(collection);
        const document = await _inMemoryDocumentStore.getDocument(id);
        return { document };
      }
    },
    "similarityQuery": {
      tags: ['Document'],
      request: {
        collection: {
          type: 'string',
        },
        match_string: {
          type: 'string',
        },
      },
      response: {
        results: {
          type: 'array',
          items: {
            type: 'object',
          }
        },
      },
      handler: async ({ match_string, collection }) => {
        const _inMemoryDocumentStore = await inMemoryDocumentStores.getOrCreateStore(collection);

        const results = await _inMemoryDocumentStore.similarity_query(match_string);
        return { results };
      }
    },
    "listAllDocuments": {
      tags: ['Document'],
      request: {
        collection: {
          type: 'string',
        },
      },
      response: {
        results: {
          type: 'array',
          items: {
            type: 'object',
          }
        },
      },
      handler: async ({ collection }) => {
        if (inMemoryDocumentStores.stores[collection] === undefined)
          return { results: [], error: "collection not found: did you mean: " + Object.keys(inMemoryDocumentStores.stores).join(", ") };
        const _inMemoryDocumentStore = await inMemoryDocumentStores.getOrCreateStore(collection);

        const results = await _inMemoryDocumentStore.structured_query(undefined, 10);
        return { results };
      }
    },
    "listCollections": {
      tags: ['Document'],
      request: {},
      response: {
        results: {
          type: 'array',
          items: {
            type: 'string',
          }
        },
      },
      handler: async ({ }) => {
        const results = Object.keys(inMemoryDocumentStores.stores);
        return { results };
      }
    },
    "structuredQuery": {
      description: 'Structured query with the operators:$eq $ne $gt $gte $lt $lte',
      tags: ['Document'],
      request: {
        collection: {
          type: 'string',
        },
        query_object_json: {
          type: 'string',
        },
        // query_object: {
        //   type: 'object',
        // },
      },
      response: {
        results: {
          type: 'array',
          items: {
            type: 'object',
          }
        },
      },
      handler: async ({ query_object_json, collection, query }) => {
        if (!query && query_object_json)
          query = JSON.parse(query_object_json);
        const _inMemoryDocumentStore = await inMemoryDocumentStores.getOrCreateStore(collection);

        const results = await _inMemoryDocumentStore.structured_query(query || {});
        return { results };
      }
    },
    "openaiCompletion": {
      tags: ['OpenAI'],
      request: {
        instructions: {
          type: 'string',
          default: "You are a helpful AI assistant used by a different AI personal assistant"
        },
        prompt: {
          type: 'string',
        },
        max_tokens: {
          type: 'number',
          default: 64,
        },
        temperature: {
          type: 'number',
          default: 0.0,
        },
        model: {
          type: 'string',
          default: "gpt-4",
        },
      },
      response: {
        result: {
          type: 'string',
        },
      },
      handler: async ({ prompt, max_tokens, temperature, model }) => {
        const chat = [
          { role: "system", name: "system", content: instructions },
          { role: "user", name: "user", content: prompt },
        ];
        const response = await openai.createCompletion({
          chat,
          max_tokens,
          temperature,
          model,
          top_p: 1,
          n: 1,
          frequency_penalty: 0.15,
          presence_penalty: 0.2,
        });
        return { result: response.data.choices[0].text };
      }
    },
    // "runPureJavascript": {
    //   tags: ['Javascript'],
    //   request: {
    //     javascript_code: {
    //       type: 'string',
    //     },
    //   },
    //   response: {
    //     result: {
    //       type: 'string',
    //     },
    //   },
    //   handler: async ({ javascript_code }) => {
    //     const evalRes = await eval(javascript_code);
    //     if(typeof evalRes === "string")
    //       return { result: evalRes };
    //     // if it is a function or async function, call it
    //     const result = await evalRes();
    //     return { result };
    //   }
    // },
    "bootstrapPlugin": {
      tags: ['bootstrap'],
      description: 'bootstraps the plugin. use this when the user explicitly requests it by typing "bootstrap" or "boot" or "begin" , etc',
      handler: async () => {
        booted = true;
        return { nextInstructions: bootstrapInstructions + "\n" + further_instructions };
      }
    },
    "furtherInstructions": {
      tags: ['boot'],
      description: 'instructions for the plugin. use this once in a session before you interact with the plugin',
      handler: async () => {
        let shouldBoot = false;
        if (!booted)
          shouldBoot = true;
        return { instructions: further_instructions + (shouldBoot ? "use the bootstrap method to get started" : "") };
      }
    },
    "resetAll": {
      tags: ['Document'],
      description: 'resets the document store and plugins. only use this if the user explicitly requests it',
      request: {
        confirmation: {
          type: 'string',
          description: "must be 'user confirmed this action'"
        }
      },
      response: {
        result: {
          type: 'string',
        },
      },
      handler: async ({ confirmation }) => {
        if (confirmation !== "user confirmed this action")
          throw new Error("must pass in confirmation: 'user confirmed this action'");
        await inMemoryDocumentStores.reset();

        setTimeout(() => {
          process.exit(0);
        }, 1000);
        return { result: "success" };
      }
    },
    "renderImageFileByTextPrompt": {
      tags: ['Text2Image'],
      description: 'renders an image file by text prompt',
      request: {
        prompt: {
          type: 'string',
        },
        size: {
          type: 'number',
          default: 512,
        },
        num_images: {
          type: 'number',
          default: 1,
        },
      },
      response: {},
      handler: async ({ prompt, size, num_images }) => {
        size = size || 512;
        try {
          const response = await openai.createImage({
            prompt,
            n: num_images || 1,
            size: `${size}x${size}`
          });
          return { result: response.data };
        }
        catch (e) {
          const response = e.response;
          if (response && response.data && response.data.error) {
            return { error: response.data.error };
          }
          return { error: e };
        }
      }
    },
    "renderAsHtml": {
      description: 'renders a document or a group of documents (through a manifest) as html. you can pass in a collection and id to render a single document, or a collection and a query to render multiple documents. you can also pass in a manifest to render multiple documents as a single page',
      request: {
        collection: {
          name: 'collection',
          type: 'string',
          default: "html",
        },

        html_field_name: {
          name: 'html_field_name',
          type: 'string',
          default: "html",
        },
        id: {
          name: 'id',
          type: 'string',
        },
      },
      method: "get",
      contentType: "text/html",
      handler: async ({ collection, html_field_name, id }) => {
        const _inMemoryDocumentStore = await inMemoryDocumentStores.getOrCreateStore(collection);
        const document = await _inMemoryDocumentStore.getDocument(id);
        const html = document[html_field_name];
        if (!html)
          throw new Error("field not found: " + html_field_name);
        if (Array.isArray(html)) {
          // manifest
          let fullHtml = "";
          const partField = document['parts_field'];
          const partCollection = document['parts_collection'];
          if (!partField)
            throw new Error("field not found in manifest: parts_field");
          if (!partCollection)
            throw new Error("field not found in manifest: parts_collection");
          for (let i = 0; i < html.length; i++) {
            const partId = html[i];
            const _inMemoryDocumentStore2 = await inMemoryDocumentStores.getOrCreateStore(partCollection);
            const partDocument = await _inMemoryDocumentStore2.getDocument(partId);
            if (!partDocument)
              throw new Error("document not found: " + partId);

            const part = partDocument[partField];
            if (!part)
              throw new Error("field not found in document: " + partField + " in document: " + partId);
            fullHtml += part;
          }
          return fullHtml;
        }
        return html;
      }
    },
  }
};
