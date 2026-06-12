from flask import Flask, request, jsonify

# 初始化Flask应用
app = Flask(__name__)

# 抖音Webhook接收接口
@app.route('/webhook', methods=['POST'])
def douyin_webhook():
    # 获取抖音发送的请求数据
    data = request.get_json()
    if not data:
        return "参数错误", 400

    # 处理Webhook验证（抖音必填）
    if data.get("event") == "verify_webhook":
        challenge = data.get("content", {}).get("challenge")
        # 必须原样返回challenge，验证才能通过
        return jsonify({"challenge": challenge})

    # 其他抖音事件（后续可自己加逻辑）
    print("收到抖音事件：", data)
    return "success", 200

# 启动服务
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)