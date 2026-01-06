from flask import Flask, request

app = Flask(__name__)

@app.route("/args")
def args_test():
    id = request.args.get("id")

    return id or "Error getting ID, check args_test() in args.py"

if __name__ == "__main__":
    app.run(debug=True)