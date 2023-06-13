import { defineAIPluginManifest } from 'chatgpt-plugin';
import { execSync } from 'child_process';
import { Router } from 'express';
import { createPaths } from 'express-openapi-middleware';
import fs from 'fs';


var  browseMode = process.env.BROWSE_MODE || false;
function apiOperation(operation) {
    const middleware = function (req, res, next) {
        req.apiOperation = operation;

        next();

    };
    middleware.apiOperation = operation;
    return middleware;
}
function jsonToTable(json) {
    if(typeof json !== 'object') {
        return json;
    }

    // as html formatted table
    const keys = Object.keys(json);
    const values = Object.values(json);
    const table = `<table>
    <tr>
    <th>key</th>
    <th>value</th>
    </tr>
    ${keys.map((key, i) => `<tr><td>${key}</td><td>${jsonToTable(values[i])}</td></tr>`).join('\n')}
    </table>`;
    return table;
}
        
async function createRouter(
    {
        contact_email = '', description_for_model = '', description_for_human = '', auth = '', name_for_human = '', name_for_model = '', logo_url = '', legal_info_url = '', has_user_authentication = false, title = '', version = '1.0', plugin_host = '', methods = {}
    }) {
    let router = new Router();




    router.get('/.well-known/ai-plugin.json', (req, res, next) => {
        // from express 
        const host = plugin_host || req.headers['host'];
        const pluginManifest = defineAIPluginManifest({
            schema_version: 'v1',
            name_for_model,
            name_for_human,
            description_for_model,
            description_for_human,
            auth: (auth || {
                type: 'none'
            }),
            api: {
                type: 'openapi',
                url: `${req && req.url && req.url.startsWith('https') ? 'https' : 'http'}://${host}/openapi.json`,
                has_user_authentication
            },
            logo_url,
            contact_email,
            legal_info_url
        });

        const resString = JSON.stringify(pluginManifest, null, 2);
        // if(browseMode) {
        //     const html = '<html><body><pre>' + resString + '</pre></body></html>';
        //     res.setHeader('Content-Type', 'text/html;charset=UTF-8');
        //     res.send(html);
        //     return;
        // }
        res.setHeader('Content-Type', 'application/json;charset=UTF-8');
        res.send(resString);
    });
    router.get('/openapi.json',  (req, res, next) => {
        // from express 
        const host = plugin_host || req.headers['host'];
        const paths = createPaths(router);
        const openapi = {
            openapi: '3.0.0',
            info: {
                title,
                version
            },
            servers: [
                {
                    url: `${req && req.url && req.url.startsWith('https') ? 'https' : 'http'}://${host}`
                }
            ],
            paths
        };
        // if(browseMode) {
        //     const html = '<html><body><pre>' + JSON.stringify(openapi, null, 2) + '</pre></body></html>';
        //     res.setHeader('Content-Type', 'text/html;charset=UTF-8');
        //     res.send(html);
        //     return;
        // }


        res.setHeader('Content-Type', 'application/json;charset=UTF-8');
        res.send(JSON.stringify(openapi, null, 2));
    });


    for (var mi = 0; mi < Object.keys(methods).length; mi++) {
        const method_name = Object.keys(methods)[mi];
        const method = methods[method_name];
        let { contentType, method: http_method, tags, summary, request, response, handler, imports } = method;
        imports = imports || [];
        http_method = http_method || 'post';
        http_method = http_method.toLowerCase();
        if(browseMode) {
            http_method = 'get';
        }
        tags = tags || [];
        summary = summary || '';
        request = request || {};
        response = response;
        contentType = contentType || 'application/json';

        handler = handler || (async () => { return {}; });

        const contentFor200 = {
            [contentType]: {
                schema: {
                    type: contentType === 'application/json' ? 'object' : 'string',
                    format: contentType === 'application/json' ? undefined : 'binary',
                    properties: response
                }
            }
        };
        let params = [];
        if (http_method === 'post') {

            params = Object.keys(request).map((paramName) => {
                const param = request[paramName];
                return {
                    in: 'body',
                    name: paramName,
                    description: param.description,
                    required: (param.required === undefined) ? true : param.required,
                    schema: {
                        type: param.type || 'string',
                        items: param.items,
                        default: param.default
                    }
                }
            });
        }
        else {
            params = Object.keys(request).map((paramName) => {
                const param = request[paramName];
                return {
                    in: 'query',
                    name: param.name || paramName,
                    description: param.description,
                    required: (param.required === undefined) ? true : param.required,
                    schema: {
                        type: 'string',
                        default: param.default ? param.default.toString() : undefined
                    }
                }
            });
        }
        router[http_method](`/${method_name}`, apiOperation({
            tags,
            summary,
            operationId: method_name,
            parameters: params,
            responses: {
                200: {
                    description: "Successful Response",
                    content: contentFor200
                },
                400: {
                    description: 'Bad Request',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    error: {
                                        type: 'string'
                                    }
                                }
                            }
                        }
                    }
                },
                500: {
                    description: 'Internal Server Error',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    error: {
                                        type: 'string'
                                    }
                                }
                            }
                        }
                    }
                },
            }
        }), async (req, res, next) => {
            try {
                const importsObject = {};
                for (var i = 0; i < imports.length; i++) {
                    const importName = imports[i];
                    try{
                        importsObject[importName] = await import(importName);
                    }
                    catch(e){
                        // try installing it and retry
                        try{
                            await execSync(`npm install -g ${importName}`,{
                                cwd: "/app"
                            });
                            await execSync(`npm install ${importName}`,{
                                cwd: "/app"
                            });
                            try{
                                importsObject[importName] = await import(importName);
                            }
                            catch(e){
                                try{
                                    importsObject[importName] = await import(importName + "/index.js");
                                }
                                catch(e){
                                    // read the package.json and try to find the main file
                                    const packageJson = fs.readFileSync(`node_modules/${importName}/package.json`);
                                    const packageJsonObj = JSON.parse(packageJson);
                                    const mainFile = packageJsonObj.main;
                                    if(mainFile){
                                        importsObject[importName] = await import(importName + "/" + mainFile);
                                    }
                                    else{
                                        throw new Error(`package ${importName} does not have a main file`);
                                    }
                                }    
                            }
                        }
                        catch(e){
                            console.log(`failed to install ${importName}`,e);
                            throw new Error(`${importName} is failing to import, even after 'npm install ${importName}' : ${e.message}`);
                        }                        
                    }
                    if(importsObject[importName].default){
                        importsObject[importName] = importsObject[importName].default;
                    }
                }
                // handle arrays and objects
                if(http_method === 'get'){
                    for (var i = 0; i < params .length; i++) {
                        Object.keys(request).map((paramName) => {
                            const param = request[paramName];
                            if(param.type === 'array'){
                                const value = req.query[paramName];
                                if(value && typeof value === 'string'){
                                    req.query[paramName] = value.split(',');
                                }
                            }
                            else if(param.type === 'object'){
                                const value = req.query[paramName];
                                if(value && typeof value === 'string'){
                                    req.query[paramName] = JSON.parse(value);
                                }
                            } else if (param.type === 'number') {
                                const value = req.query[paramName];
                                if (value && typeof value === 'string') {
                                    req.query[paramName] = Number(value);
                                }
                            }
                        });

                                    
                    }
                }
                let arg = http_method === 'get' ? req.query : req.body;
                if (http_method === 'post' && req.body && req.body.request) {
                    arg = req.body.request;
                }
                arg.importsObject = importsObject;
                const result = await handler(arg);
                if(!result){
                    throw new Error(`handler for ${method_name} did not return anything, modify the function to return a response`);
                }
                if (contentType === 'application/json') {
                    const resString = JSON.stringify(result, null, 2);
                    if(resString.length > 16000){
                        throw new Error(`response is too long, ${resString.length} bytes, please modify the function to support pagination using maxBytes and offset`);
                    }
                    if(browseMode){
                        res.setHeader('Content-Type', 'text/html;charset=UTF-8');
                        const jsonAsTable = jsonToTable(result);
                        res.send(`<html><body>${jsonAsTable}</body></html>`);
                    }
                    else
                        return res.status(200).json(result);
                }
                else {                    
                    if(result.length > 16000 && !method.noLimit){
                        throw new Error(`response is too long, ${result.length} bytes, please modify the function to support pagination using maxBytes and offset`);
                    }   
                    if(browseMode){                        
                        res.setHeader('Content-Type', 'text/html;charset=UTF-8');
                        res.send(`<html><body><pre>${result}</pre></body></html>`);
                    }
                    else
                        return res.status(200).send(result);
                }
            }
            catch (error) {
                return res.status(200).json({ error: error.message });
            }
        });
    }
    return router;
}

export { createRouter };