import Microformats from 'microformat-node';
import axios from 'axios';
import path from 'path';
import { spawn, execSync } from 'child_process';
import fs from 'fs';
import { serpAPIKey, openai } from "./chromaClient.js";
import { cleanHtml } from "./cleanHtml.js";
import { InMemoryDocumentStores } from "./InMemoryDocumentStores.js";
import os from 'os';
import jsdom from 'jsdom';

const { JSDOM } = jsdom;
global.DOMParser = new JSDOM().window.DOMParser
global.axios = axios;

const coding_instructions = fs.readFileSync(path.resolve("prompts/coding_instructions.txt")).toString();
const further_instructions = fs.readFileSync(path.resolve("prompts/further_instructions.txt")).toString();
const bootstrapInstructions = fs.readFileSync(path.resolve("prompts/bootstrap_instructions.txt")).toString();
const javascript_code_description = fs.readFileSync(path.resolve("prompts/javascript_code_description.txt")).toString();
const description_for_model = fs.readFileSync(path.resolve("prompts/description_for_model.txt")).toString();
const planning = fs.readFileSync(path.resolve("prompts/planning.txt")).toString();
const self_implement = fs. readFileSync(path.resolve("prompts/self_implement.txt")).toString();
const selfImplementKernelFunctions = process.env.SELF_IMPLEMENT_KERNEL_FUNCTIONS === 'true';
async function selfImplement() {
  if(!selfImplementKernelFunctions)
    return;
  const inDocker = () => {
    const cgroup = fs.readFileSync('/proc/1/cgroup', 'utf8');
    return cgroup.includes('docker');
  }
  throw new Error(`${self_implement} ${os.platform()}. ${inDocker() ? "inside a container" : ""}`);
}
const tokens = {};
function validateToken(token){
  if(!tokens[token])
    throw new Error("Invalid token, generate a new one with bootstrapPlugin");
}
function addToken(token){
  tokens[token] = true;
}
const inMemoryDocumentStores = new InMemoryDocumentStores();
global.inMemoryDocumentStores = inMemoryDocumentStores;

async function init() {
  try {
    await inMemoryDocumentStores.initialize();
    const methods = await global.inMemoryDocumentStoreForMethods.structured_query(undefined, 500);
    methods.forEach((method) => {
      const name = method.name;
      PersonoidLiteKernel.methods[name] = {
        // tags: [name],
        request: method.request,
        response: method.response,
        ...method,
        handler: async (request) => {
          return await (eval(method.javascript_code))(request);
        },
      };
    });
    console.log("chroma ready");
    console.log("Personoids Lite ready and waiting on http://localhost:5004")
  }
  catch (error) {
    console.error("chroma not ready yet, waiting");
    setTimeout(() => {
      init();
    }, 15000);
  }
}
let booted = false;
init();
export const PersonoidLiteKernel = {
  description_for_model: description_for_model + coding_instructions,
  description_for_human: 'The Power of Autonomy in Every Chat.',
  name_for_human: 'Personoids Lite',
  name_for_model: 'DoAnythingPlugin',
  logo_url: "http://localhost:5004/logo.png",
  methods: {
    "plan":{       
        method: "GET",
        description: "Call this method whenever you need to plan anything, or break down a big task into smaller tasks.",
        request: {
          "bootstrap_auth_token": {
            type: "string",
            name: "bootstrap_auth_token",
            description: "The bootstrap auth token. call bootstrapPlugin to get one.",
            required: true,
          },
        },
        response: {
        },
        handler: async (request) => {
          validateToken(request.bootstrap_auth_token);
          return {
            result: planning,
            nextInstructions: "summarize and present the intermediate result in markdown format with the proxyFrom template.",
            fromProxy: {
              name: "Planner",
              avatar_image_url: "http://localhost:5004/avatar/12.png",
            }
          }
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
          required: false,
        },
        encoding: {
          type: 'string',
          description: 'The encoding to use when reading or writing the file',
          default: 'utf8',      
          required: false,    
        },
        recursive: {
          type: 'boolean',
          description: 'If true, performs the operation recursively',
          default: false,   
          required: false,       
        },
        maxBytes: {
          type: 'number',
          description: 'The maximum number of bytes to read',
          default: 1000,
          required: false,
        },
        offset: {
          type: 'number',
          description: 'The offset to start reading from',
          default: 0,
          required: false,
        },
        "bootstrap_auth_token": {
          type: "string",
          description: "The bootstrap auth token. call bootstrapPlugin to get one.",
          required: true,
        },
      },
      response: {},
      handler: async ({ operation, path, data, encoding, recursive ,maxBytes,offset,bootstrap_auth_token}) => {
        validateToken(bootstrap_auth_token);
        maxBytes = maxBytes || 1000;
        offset = offset || 0;
        encoding = encoding || 'utf8';
        await selfImplement();
        let result = {};
        // from filesystem
        if (operation === 'readFile' || operation === 'read') {
          let contents = fs.readFileSync(path);
          contents = contents.toString().slice((offset*maxBytes), (offset*maxBytes) + maxBytes);
          result = { contents,
            pagesCount: Math.ceil(contents.length/maxBytes),
            nextInstructions: "summarize and present the intermediate result in markdown format with the proxyFrom template.",
            proxyFrom:{
                name: "File System Personoid",
                avatar_image_url: "http://localhost:5004/avatar/5.png",
            } };
        }
        else if (operation === 'writeFile' || operation === 'write') {
          fs.writeFileSync(path, data);
          return {
            result: `wrote ${data.length} bytes to ${path}`,
            nextInstructions: "summarize and present the intermediate result in markdown format with the proxyFrom template.",
            proxyFrom:{
                name: "File System Personoid",
                avatar_image_url: "http://localhost:5004/avatar/5.png",
            }
          }
        }
        else if (operation === 'appendFile' || operation === 'append') {
          fs.appendFileSync(path, data);
          return {
            result: `appended ${data.length} bytes to ${path}`,
            nextInstructions: "summarize and present the intermediate result in markdown format with the proxyFrom template.",
            proxyFrom:{
                name: "File System Personoid",
                avatar_image_url: "http://localhost:5004/avatar/5.png",
            }
          }
        }
        else if (operation === 'deleteFile' || operation === 'deleteDirectory' || operation === 'delete') {
          if (recursive === true) {
            execSync(`rm -rf ${path}`);
            return {
              result: `deleted ${path} recursively`,
              nextInstructions: "summarize and present the intermediate result in markdown format with the proxyFrom template.",
              proxyFrom:{
                  name: "File System Personoid",
                  avatar_image_url: "http://localhost:5004/avatar/5.png",
              }
            }
          }
          else{
            fs.unlinkSync(path);
            return {
              result: `deleted ${path}`,
              nextInstructions: "summarize and present the intermediate result in markdown format with the proxyFrom template.",
              proxyFrom:{
                  name: "File System Personoid",
                  avatar_image_url: "http://localhost:5004/avatar/5.png",
              }
            }
          }
        }
        else if (operation === 'listFiles' || operation === 'list' || operation === 'ls' || operation === 'dir') {
          if (recursive === true) {
            const files = execSync(`find ${path} -type f`).toString().split("\n");
            result = { files,
              nextInstructions: "summarize and present the intermediate result in markdown format with the proxyFrom template.",
              proxyFrom:{
                  name: "File System Personoid",
                  avatar_image_url: "http://localhost:5004/avatar/5.png",
              } };
          }
          else {
            const files = fs.readdirSync(path);
            
            result = { files,
              filesCount: files.length,
              nextInstructions: "summarize and present the intermediate result in markdown format with the proxyFrom template.",
              proxyFrom:{
                  name: "File System Personoid",
                  avatar_image_url: "http://localhost:5004/avatar/5.png",
              } };
          }
        }
        else if (operation === 'listDirectories' || operation === 'find') {
          if (recursive === true) {
            const directories = execSync(`find ${path} -type d`).toString().split("\n");
            result = { directories,
              nextInstructions: "summarize and present the intermediate result in markdown format with the proxyFrom template.",
              proxyFrom:{
                  name: "File System Personoid",
                  avatar_image_url: "http://localhost:5004/avatar/5.png",
              } };
          }
          else {
            const directories = fs.readdirSync(path);
            result = { directories,
              nextInstructions: "summarize and present the intermediate result in markdown format with the proxyFrom template.",
              proxyFrom:{
                  name: "File System Personoid",
                  avatar_image_url: "http://localhost:5004/avatar/5.png",
              } };
          }
        }
        else if (operation === 'createDirectory' || operation === 'mkdir' || operation === 'md' || operation === 'mkdirp') {
          fs.mkdirSync(path, { recursive: true });
          return {
            result: `created ${path}`,
            nextInstructions: "summarize and present the intermediate result in markdown format with the proxyFrom template.",
            proxyFrom:{
                name: "File System Personoid",
                avatar_image_url: "http://localhost:5004/avatar/5.png",
            }
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
          description: 'A string of environment variables to set, separated by newlines. For example: VAR1=VALUE1\nVAR2=VALUE2',
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
        },
        maxBytes: {
          type: 'number',
          description: 'The maximum number of bytes to return from stdout and stderr',
          default: 1000,
          required: false,
        },
        offset: {
          type: 'number',
          description: 'The offset to start reading from',
          default: 0,
          required: false,
        },
        bootstrap_auth_token:{
          type: 'string',
          description: 'The bootstrap auth token',
          required: true,
        }
      },
      response: {},
      handler: async ({ command, cwd, env_string, blocking , terminate_after_seconds,maxBytes,offset,bootstrap_auth_token}) => {
        validateToken(bootstrap_auth_token);
        maxBytes = maxBytes || 1000;
        offset = offset || 0;
        await selfImplement();
        if(blocking)
          terminate_after_seconds = terminate_after_seconds || 5 * 60;
        
        const nonBlockingResultAfter = blocking ? 0 : 10 * 1000;
        const env = {...process.env};
        if (env_string) {
          const envs = env_string.split("\n");
          envs.forEach((env_line) => {
            const [key, value] = env_line.split("=");
            env[key] = value;
          });
        }

        // if (blocking === false) {
        //   const child = spawn(command, { cwd, env, shell: true ,
        //     from:{
        //         name: "Devops Personoid",
        //         avatar_image_url: "http://localhost:5004/logo.png",
        //     }});
        //   return { pid: child.pid };
        // }
        // else {
          return new Promise((resolve, reject) => {
            let stderr = "";
            let stdout = "";
            let child;
            let ended = false;
            try{              
              child = spawn(command, { cwd, env, shell: true,
                proxyFrom:{
                    name: "DevOps Personoid",
                    avatar_image_url: "http://localhost:5004/avatar/3.png",
                } });  
            }
            catch(error){
              reject(error);
              return;
            }
            if(terminate_after_seconds > 0){
              setTimeout(() => {
                if(ended)
                  return;
                child.kill();
                ended = false;
                reject(new Error(`Timeout in blocking process. stderr: ${stderr} stdout: ${stdout} terminate_after_seconds: ${terminate_after_seconds} seconds`));
              }, 1000 * terminate_after_seconds);
            }
            if(nonBlockingResultAfter > 0){
              setTimeout(() => {
                if(ended)
                  return;
                if(terminate_after_seconds == 0)
                  ended = true;
                resolve({ code: 919, stderr, stdout });
              }, nonBlockingResultAfter);
            }
            child.stdout.on('data', (data) => {
              stdout += data;
            });

            child.stderr.on('data', (data) => {
              stderr += data;
            });
            child.on('error', (error) => {
              if(ended)
                return;
              console.log(`child process errored with ${error} stderr: ${stderr} stdout: ${stdout}`);
              ended = true;
              reject(error);
              var _stderr = stderr.slice((offset*maxBytes), (offset*maxBytes) + maxBytes);
              var _stdout = stdout.slice((offset*maxBytes), (offset*maxBytes) + maxBytes);

              resolve({ code:913, error, stderr:_stderr, stdout:_stdout,
                stdErrPagesCount: Math.ceil(stderr.length / maxBytes),
                stdOutPagesCount: Math.ceil(stdout.length / maxBytes),
                nextInstructions: "present the intermediate results in markdown format with the proxyFrom template.",
                proxyFrom:{
                    name: "DevOps Personoid",
                    avatar_image_url: "http://localhost:5004/avatar/3.png",
                }   
              });
            });
            child.on('close', (code) => {
              console.log(`child process exited with code ${code}`);
              if(ended)
                return;
              ended = true;
              var _stderr = stderr.slice((offset*maxBytes), (offset*maxBytes) + maxBytes);
              var _stdout = stdout.slice((offset*maxBytes), (offset*maxBytes) + maxBytes);              
              resolve({ code, stderr: _stderr, stdout: _stdout,
                stdErrPagesCount: Math.ceil(stderr.length / maxBytes),
                stdOutPagesCount: Math.ceil(stdout.length / maxBytes),
                nextInstructions: "present the intermediate results in markdown format with the proxyFrom template.",
                proxyFrom:{
                    name: "DevOps Personoid",
                    avatar_image_url: "http://localhost:5004/avatar/3.png",
                }
            });

          });
        });
      }
    },
    "createOrUpdatePluginMethod": {
      tags: ['PluginMethod', 'PluginFunction'],
      description: 'Creates or updates a method on this plugin. only use this if the user explitily requested to add, update or delete a functionality/method on the plugin.',
      request: {
        name: {
          type: 'string',
        },
        description: {
          type: 'string',
          required: false,
          description: "instruction for when to use this method, what it does, and how to use it."
        },
        request_fields: {
          type: 'array',
          description: 'The parameters for this method (all of type string)',
          items: {
            type: 'string',
          },
          default: [],
          required: false,
        },
        imports: {
          type: 'array',
          description: 'The imports for this method, these will be "require()" and injected',
          default: [],
          items: {
            type: 'string',
          },
          required: false
        },
        isDelete: {
          type: 'boolean',
          description: 'If true, deletes the method instead of creating it',
          default: false,
          required: false,
        },
        javascript_code: {
          type: 'string',
          description: javascript_code_description,
          required: false
        },
        bootstrap_auth_token:{
          type: 'string',
          description: 'The bootstrap auth token',
          required: true,
        }
      },
      response: {},
      handler: async ({ name, description, request_fields, javascript_code, imports ,isDelete, bootstrap_auth_token }) => {
        validateToken(bootstrap_auth_token);
        if (!name) {
          throw new Error("No name provided");
        }
        if(isDelete === true){
          PersonoidLiteKernel[name] = undefined;
          return { message: `deleted method ${name}` ,
          nextInstructions: "present the intermediate result in markdown format with the proxyFrom template.",
          proxyFrom:{
            name: "DevOps Personoid",
            avatar_image_url: "http://localhost:5004/avatar/3.png",
          }
        };
        }
        imports = imports || [];
        let existed = false;
        // if (!description) {
        //   throw new Error("No description provided");
        // }
        request_fields = request_fields || [];
        if(PersonoidLiteKernel.methods[name]){
          existed = true;
        }
        const parametersObject = {};
        request_fields.forEach((parameter) => {
          parametersObject[parameter] = {
            type: 'string',
            required: false,
            default: ""
          };
        });
        parametersObject.bootstrap_auth_token = {
          type: 'string',
          required: false,
          default: ""
        };
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

          PersonoidLiteKernel.methods[name] = {
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
        return { result: `success - ${existed ? "updated" : "created"} method ${name}`,
        nextInstructions: existed ? 
          "Stop and prompt the user to 'refresh the plugin' to be able to use the new method. preset it in markdown format with the proxyFrom template." : 
          "summarize and present the intermediate result in markdown format with the proxyFrom template.",
        proxyFrom:{
            name: "Plugin Developer Personoid",
            avatar_image_url: "http://localhost:5004/avatar/1.png",
        }};
      }
    },
    "npm": {
      tags: ['Package', "NPM", "install" ,"package"],
      description: 'Installs an npm package, or lists all installed packages if no package name is provided',
      request: {
        name: {
          type: 'string',
        },
        bootstrap_auth_token:{
          type: 'string',
          description: 'The bootstrap auth token',
          required: true,
        }
      },
      response: {},
      handler: async ({ name,bootstrap_auth_token }) => {
        validateToken(bootstrap_auth_token);
        if (!name) {
          // list all installed packages
          // npm list --depth=0
          
          const stdout= execSync('npm list --depth=0 -p').toString();
          // parse stdout
          return { packages: stdout.split("\n").filter((line) => line !== "") };
        }
        else {
          // install package
          // npm install <package>
          const stdoutGlobal = execSync('npm install -g ' + name,{
            cwd: process.cwd(),
            env: process.env,
          }).toString();
          const stdoutLocal = execSync('npm install ' + name,{
            cwd: process.cwd(),
            env: process.env,
          }).toString();
          return { stdoutGlobal, stdoutLocal,
            nextInstructions: "summarize and present the intermediate result in markdown format with the proxyFrom template.",
            proxyFrom:{
                name: "Dependencies Personoid",
                avatar_image_url: "http://localhost:5004/avatar/8.png",
            }};
        }
      }
    },
    "webSearch": {
      tags: ['Web'],
      description: 'useful for searching the web',
      request: {
        query: {
          type: 'string',
        },
        bootstrap_auth_token:{
          type: 'string',
          description: 'The bootstrap auth token',
          required: true,
        }

      },
      response: {
        webPages: {
          type: 'object',
        },
      },
      handler: async ({ query, bootstrap_auth_token }) => {
        validateToken(bootstrap_auth_token);
        await selfImplement();
        // SERP API
        if (!serpAPIKey) {
          throw new Error("No SERPAPI_API_KEY provided");
        }
        const serpAPIUrl = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&hl=en&gl=us&api_key=${serpAPIKey}`;
        const response = await axios.get(serpAPIUrl);
        return { webPages: response.data.organic_results,
          nextInstructions: "summarize and present the intermediate result in markdown format with the proxyFrom template.",
          proxyFrom:{
              name: "Researcher Personoid",
              avatar_image_url: "http://localhost:5004/avatar/9.png",
          } };
      }
    },
    "urlFetch": {
      tags: ['Web'],
      description: 'Fetches a web page and returns the html. optionally extracts text, microformats, or uses one of the selectors to extract a specific element',
      request: {
        url: {
          type: 'string',
        },
        request_method:{
          type: 'string',
          default: "GET",
          required: false,
        },
        request_headers:{
          type: 'array',
          default: [],
          required: false,
          items: {
            type:"string",
          }
        },
        request_body:{
          type: 'string',
          default: "",
          required: false,
        },
        enableTextExtractionOnly: {
          type: 'boolean',
          default: false,
          required: true,
        },
        enableImageCaptionExtraction: {
          type: 'boolean',
          default: false,
          required: false,
        },
        enableMicroFormatExtraction: {
          type: 'boolean',
          default: false,
          required: false,
        },
        xPathBasedSelector: {
          type: 'string',
          default: "",
          required: false,
        },
        cssBasedSelector: {
          type: 'string',
          default: "",
          required: false,
        },
        pureJavascriptBasedSelectorFunction: {
          type: 'string',
          default: "",
          required: false,
        },
        regexSelector: {
          type: 'string',
          required: false,
        },
        maxBytes: {
          type: 'number',
          default: 2000,
          required: false,
        },
        offset: {
          type: 'number',
          default: 0,
          required: false,
        },
        bootstrap_auth_token:{
          type: 'string',
          description: 'The bootstrap auth token',
          required: true,
        }
      },
      response: {
        result: {
          type: 'string',
        },
      },
      handler: async ({ url,request_method,request_headers,request_body,offset, enableTextExtractionOnly, enableMicroFormatExtraction, xPathBasedSelector, cssBasedSelector, pureJavascriptBasedSelectorFunction, regexSelector, maxBytes ,bootstrap_auth_token}) => {
        validateToken(bootstrap_auth_token);
        let response;
        maxBytes = maxBytes || 2000;
        if(maxBytes > 4096){
          throw new Error("maxBytes must be less than 4096");
        }        

        try {
          if(request_method === "POST"){
            response = await axios.post(url,request_body,{maxRedirects: 5,headers:request_headers});
          }else{
            response = await axios.get(url,{maxRedirects: 5,headers:request_headers});
          }
          // now with follow redirects
          // response = await axios.get(url, { maxRedirects: 5, validateStatus: function (status) { return status >= 200 && status < 303; } });
          // 

        }
        catch (e) {
          const responseData = e.response && e.response.data;
          if (responseData && responseData.error) 
            return { error: responseData.error ,result:""};          
          if(e.response && e.response.error)
            return { error: e.response.error ,result:""};          
          throw e;
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
        let finalResultCut = finalResult;
        if(offset > 0){
          finalResultCut = finalResultCut.substring(offset * maxBytes);
        }
        if (finalResultCut.length > maxBytes)
        finalResultCut = finalResultCut.substring(0, maxBytes) + "...";
        return { result: finalResultCut ,
          pagesCount: Math.ceil(finalResult.length / maxBytes),
          nextInstructions: "summarize and present the intermediate result in markdown format with the proxyFrom template.",
          proxyFrom:{
              name: "Resarch Personoid",
              avatar_image_url: "http://localhost:5004/avatar/6.png",
          }};
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
        return { result: newId ,
          nextInstructions: "summarize and present the intermediate result in markdown format with the proxyFrom template.",
          proxyFrom:{
              name: "Memory Personoid",
              avatar_image_url: "http://localhost:5004/avatar/7.png",
          }};
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
        return { document ,
          nextInstructions: "summarize and present the intermediate result in markdown format with the proxyFrom template.",
          proxyFrom:{
              name: "Memory Personoid",
              avatar_image_url: "http://localhost:5004/avatar/7.png",
          }};
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
        return { results ,
          nextInstructions: "summarize and present the intermediate result in markdown format with the proxyFrom template.",
          proxyFrom:{
              name: "Memory Personoid",
              avatar_image_url: "http://localhost:5004/avatar/7.png",
          }};
      }
    },
    "listAllDocuments": {
      tags: ['Document'],
      request: {
        collection: {
          type: 'string',
        },
        include_fields: {
          type: 'array',
          items: {
            type: 'string',
          },
          default: ["id", "text", "name"]
        },
        bootstrap_auth_token: {
          type: 'string',
          description: "bootstrap auth token",
          required: true,
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
      handler: async ({ collection , include_fields, bootstrap_auth_token}) => {
        validateToken(bootstrap_auth_token);
        include_fields = include_fields || ["id", "text", "name"];
        if (inMemoryDocumentStores.stores[collection] === undefined)
          return { results: [], error: "collection not found: did you mean: " + Object.keys(inMemoryDocumentStores.stores).join(", ") ,
          nextInstructions: "summarize and present the intermediate result in markdown format with the proxyFrom template.",
          proxyFrom:{
              name: "Memory Personoid",
              avatar_image_url: "http://localhost:5004/avatar/7.png",
          }};
        const _inMemoryDocumentStore = await inMemoryDocumentStores.getOrCreateStore(collection);

        const results = await _inMemoryDocumentStore.structured_query(undefined, 10);

        return { results: results.map(r => {
          const result = {};
          for (const field of include_fields) {
            result[field] = r[field];
          }
          return result;
        }),
        nextInstructions: "summarize and present the intermediate result in markdown format with the proxyFrom template.",
        proxyFrom:{
            name: "Memory Personoid",
            avatar_image_url: "http://localhost:5004/avatar/7.png",
        }
         };
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
        return { results ,
          nextInstructions: "summarize and present the intermediate result in markdown format with the proxyFrom template.",
          proxyFrom:{
              name: "Memory Personoid",
              avatar_image_url: "http://localhost:5004/avatar/7.png",
          }};
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
        return { results ,
          nextInstructions: "summarize and present the intermediate result in markdown format with the proxyFrom template.",
          proxyFrom:{
              name: "Memory Personoid",
              avatar_image_url: "http://localhost:5004/avatar/7.png",
          }};
      }
    },
    "bootstrapPlugin": {
      tags: ['bootstrap'],
      description: 'bootstraps the plugin. use this when the user explicitly requests it by typing "bootstrap" or "boot" or "begin" , etc',
      handler: async () => {
        booted = true;
        const newAuthToken = new Date().getTime() + "-" + Math.random();
        addToken(newAuthToken);
        return { 
          nextInstructions: bootstrapInstructions + "\n" + further_instructions ,
          auth_token: newAuthToken,
          nextInstructions2: "present the results in markdown format with the proxyFrom template.",
          proxyFrom:{
              name: "Team Leader Personoid",
              avatar_image_url: "http://localhost:5004/avatar/11.png",
          }
        };
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
      description: 'renders an image file by text prompt. size must be either 256, 512, or 1024. prompt must be a description of the image you want to generate, including styles, colors, objects, etc.',
      request: {
        prompt: {
          type: 'string',
        },
        size: {
          type: 'number',
          default: 512,
          description: 'size of the image in pixels, must be either 256, 512, or 1024',
          required: false,
        },
        num_images: {
          type: 'number',
          default: 1,
          required: false,
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
          return { result: response.data,
            nextInstructions: "summarize and present the intermediate result in markdown format with the proxyFrom template.",
            proxyFrom:{
                name: "Designer Personoid",
                avatar_image_url: "http://localhost:5004/avatar/13.png",
            } };
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
      description: 'never call this directly. only as part of links that you provide to the user - renders a document or a group of documents (through a manifest) as html. you can pass in a collection and id to render a single document, or a collection and a query to render multiple documents. you can also pass in a manifest to render multiple documents as a single page',
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
