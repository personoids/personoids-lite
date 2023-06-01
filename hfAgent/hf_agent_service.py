from transformers import HfAgent, AutoTokenizer, AutoModel
from flask import Flask, request, jsonify
from huggingface_hub import login

import os

login(os.environ['HUGGINGFACE_TOKEN'])
agent = HfAgent("https://api-inference.huggingface.co/models/bigcode/starcoder")

app = Flask(__name__)

@app.route('/hf_agent', methods=['POST'])
def hf_agent():
    data = request.json
    command = data.get('command')
    image = data.get('image')
    text = data.get('text')
    if image and text:
        result = agent.run(command, {image: image, text: text}, remote=True)
    elif image:
        result = agent.run(command, {image: image}, remote=True)
    elif text:
        result = agent.run(command, {text: text}, remote=True)
    else:
        result = agent.run(command, remote=True)
    return jsonify(result=result)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=6001)