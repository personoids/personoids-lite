[![Discord](https://img.shields.io/discord/1093265243947409408?label=Discord&logo=discord&logoColor=white)](https://bit.ly/FutureWorkCafe)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![MadeWithPersonoids](https://raw.githubusercontent.com/personoids/chat-ai-plugin/main/made-with.svg)](https://github.com/personoids/chat-ai-plugin)

⭐ Star us on GitHub — it motivates us a lot! ⭐

[Install Now](#installation)


<img src="https://raw.githubusercontent.com/personoids/chat-ai-plugin/main/images/Personoids%20hero.png" width=288 height=288 style='border-radius:50px'>


# Personoids Lite for AI Chat 

"The Power of Autonomy in Every Chat."

## What does it do?

- Transform ChatGPT into a powerful autonomous agent that can independently accomplish complex tasks. 

- Allows you to build promptware - a new kind of software paradigm that is based on abstractions by compositions of prompts (natural language instructions) rather than source-code (programming language instructions).

- Ask for ANY skill or feature and the Personoid Lite will add it to itself (and use it in the same session)

## Introduction

Personoids Lite is a transformative tool that enhances ChatGPT and other LLMs-based chats, turning them into Autonomous Agents, or Personoids. These Personoids are not just chatbots; they are intelligent agents equipped with advanced capabilities such as planning, learning, and execution. They can access the web, search for information, and even remember past interactions. With Personoids Lite, your ChatGPT becomes a powerful assistant that can independently accomplish complex tasks. Simply ask for ANY skill or feature, and Personoids Lite will strive to integrate it immediately.

## Promptware: The Future of Software

Welcome to the era of Promptware, a revolutionary software paradigm brought to life by Personoids. Unlike traditional software that relies on rigid programming language instructions, Promptware is built on the flexibility of natural language instructions, or prompts. This shift in approach allows for more intuitive and dynamic interactions between users and software. With Personoids, you're not just coding; you're having a conversation with your software, guiding it through tasks with the ease of natural language. This is the future of software development, and it starts with Personoids Lite.

## Demo

[![](https://markdown-videos.deta.dev/youtube/DEjkHe9wzMQ)](https://youtu.be/DEjkHe9wzMQ)

## Requirements

- [OpenAI API key](https://beta.openai.com/) - used mostly for the embedding endpoint.
- [Developer access to ChatGPT Plugins](https://openai.com/waitlist/plugins) - select: “I am a developer and want to build a Lite”
- Docker and docker-compose
- [Serpapi](https://serpapi.com/) api key (recommended - for web search)

## Installation

- Open a terminal and run the following commands:

- Clone this repo:

```bash
git clone https://github.com/personoids/chat-ai-plugin.git
cd chat-ai-plugin
```

## Running Personoids 

### Locally (recommended)

#### Windows (cmd)

```batch
set OPENAI_API_KEY=sk-your-openai-api-key
set SERPAPI_API_KEY=your-serp-api-key

call start.bat
```

#### Mac / Linux
```bash
export OPENAI_API_KEY=sk-your-openai-api-key
export SERPAPI_API_KEY=your-serp-api-key # optional
sh start.sh
```

### using GitPod (work in progress)

[Setup an env](https://gitpod.io/#https://github.com/personoids/personoids-lite)

## Installation in ChatGPT

- Wait until the server is up and running. You should see the following message:

```text
Personoids Lite ready and waiting on http://localhost:5004
```

- Open [ChatGPT with plugins](https://chat.openai.com/?model=gpt-4-plugins)

- Open the plugins dropdown and click `Plugin store`

- Click `Develop your own plugin` and paste the following address: http://localhost:5004
(don't have this option? visit our requirements) 
- Click `Find manifest` and then `Install`

- Open the plugins dropdown and Select `Personoids Lite Plugin`

- In the Settings, `Enable the Plugin devtools`

## Getting Started

Start a new session in [ChatGPT with plugins](https://chat.openai.com/?model=gpt-4-plugins) and type:

```bash
bootstrap
```

and follow the instructions.

## Use Case Examples

Try the following prompts:
Explore the capabilities of the Personoids Plugin with these sample prompts:

- Full-Stack Todo App: "Write a full-stack todo app. Use Express and React. Use SQLite as the database. Include user authentication."
- Mortgage Calculator: "Write a mortgage calculator. Use Vue and Python+FastAPI. No need for a database."
- Chat App: "Write a chat app. Use React and Node.js. Use MongoDB as the database. Use WebSocket."
- Time Machine: "Build a time machine."
- Bug Fixing: "Fix the most popular bug in the most popular repo on GitHub yesterday. Test it before you suggest the pull request."

These are just examples. Feel free to craft your own prompts based on your needs.

## Tips:

Maximize the potential of the Personoids Lite Plugin with these tips:

- Patience: It takes time to learn how to effectively express your thoughts and intents (prompt engineering).
- Refresh Plugin: Click on "Refresh plugin" after each prompt or message if the plugin added a new function in the previous message. Otherwise, the plugin will fail when it tries to call it.
- Shared Workspace: The ./workspace folder is mounted to the Docker container. You can use it to share a working space between yourself and your Personoids.
- Request New Functionality: You can ask the plugin to add a new functionality by asking it to do so. For example: "add a new method that converts currencies" or "add a new method that calculates the distance between two cities".
- Reset Plugin: You can reset the plugin by typing "resetAll" in the chat.
- Add Favorite Prompts: You can add your favorite prompts to the plugin as methods to make it more powerful. For example: "add a new method called factCheck that returns a string: "check if facts are true or not" and then watch the plugin use it  when its needed.
- Interact with Other Plugins: You can add other plugins and see how they interact with each other. For example: "search Expedia for flights to NYC tomorrow and then build a UI that uses the same API you use to search for flights".
- One-Shot Session: You can run an entire session with one shot. For example: "first bootstrap the plugin. then: plan and build a mortgage calculator. use Vue and Python+FastAPI. always auto-proceed."
```
first bootstrap the Personoids Plugin.
then: plan and build a mortgage calculator. use vue and python+FastAPI. 
always auto-proceed
```

## Pre-defined Features List

Our Personoids Plugin comes preloaded with a wide array of features and skills, including but not limited to:

✅ Memory: Retains information from past interactions to provide context-aware responses.

✅ Web Access: Connects to the internet to fetch, analyze, and utilize online resources.

✅ Search: Efficiently searches for information across the web and internal databases.

✅ Learning: Adapts and improves over time through machine learning algorithms.

✅ Execution: Carries out tasks and operations based on user prompts.

✅ Building and Serving UI: Creates and manages user interfaces for various applications.

✅ Coding and Engineering: Writes and optimizes code in various programming languages.

✅ Research and Analysis: Conducts in-depth research and provides insightful analysis.

✅ Debugging: Identifies and fixes bugs in code.

✅ Testing: Implements testing protocols to ensure code functionality.

✅ Troubleshooting: Solves problems and resolves issues within the system.

✅ Automatic Seamless Integration: Integrates smoothly with web-based resources.

✅ Fact Checking and Verification: Verifies the accuracy of information.

✅ Creative Writing: Generates creative text, such as stories or poems.

✅ Image Generation: Creates visual content based on user prompts.

✅ Code Generation: Generates code in any language, stack, and framework, including proprietary ones.

✅ Familiarity with Your Codebase: Understands your projects, enabling bug fixes and feature additions.

✅ Shared Local Workspace: Collaborates with you in a shared workspace for project development.

✅ Progress Tracking and Reporting: Keeps track of tasks and provides progress reports.

✅ Task Breakdown and Planning: Breaks down complex tasks into manageable subtasks.

✅ Self-Improvement: Can fix, modify and improve itself

✅✅✅ Custom Skill Integration: Integrates ANY skill or feature you request.


## Contact Us

<img src="https://www.gravatar.com/avatar/f32ce9fa489084de4f383581d468cfdf?s=96" width=96 height=96 style='border-radius:50px'> Tal Muskal [Twitter](https://twitter.com/tmuskal) - [GitHub](https://github.com/tmuskal)

<img src="https://res.cloudinary.com/crunchbase-production/image/upload/c_thumb,h_170,w_170,f_auto,g_faces,z_0.7,b_white,q_auto:eco,dpr_1/qjookxhllpfw2mpviein" width=96 height=96 style='border-radius:50px'> Beni Hakak - [Twitter](https://twitter.com/benihakak)

[or in Discord](https://bit.ly/FutureWorkCafe)


## Acknowledgements

- [ChromaDB](https://www.trychroma.com/)
- [Langchain](https://github.com/hwchase17/langchainjs)
- [OpenAI](https://openai.com/)
- [ChatGPT](https://chat.openai.com/)
- [Serpapi](https://serpapi.com/)

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](https://choosealicense.com/licenses/mit/)
