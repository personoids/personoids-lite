from transformers import HfAgent, AutoTokenizer, AutoModel
from flask import Flask, request, jsonify
from huggingface_hub import login
# png
from PIL import Image
import PIL
import os
import tempfile
import os
import shutil
import json
import uuid
import os

login(os.environ['HUGGINGFACE_TOKEN'])
agent = HfAgent("https://api-inference.huggingface.co/models/bigcode/starcoder")

app = Flask(__name__)

@app.route('/hf_agent', methods=['POST'])
def hf_agent():
    data = request.json
    command = data.get('command')
    result = agent.run(command, remote=True)
    
    # the result is usually an image (or another type of file)
    # we need to save it to a file and return the local path of the file

    # create a temporary directory
    temp_dir = tempfile.mkdtemp()
    # save the result to a file
    file_path = os.path.join(temp_dir, str(uuid.uuid4()) + '.png')
    if(type(result) == PIL.PngImagePlugin.PngImageFile):
        result.save(file_path)
    else:
        raise Exception("Unknown result type")
    return jsonify(result=f'http://localhost:5001/serveFile?file_path={file_path}')

@app.route('/serveFile', methods=['GET'])
def serveFile():
    file_path = request.args.get('file_path')
    # binary image
    # read the file
    with open(file_path, 'rb') as f:
        file_content = f.read()
    # return the file content
    
    headers = {'Content-Type': 'image/png'}
    return file_content, 200, headers

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)