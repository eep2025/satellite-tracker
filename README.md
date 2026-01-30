# satellite-tracker <!-- omit in toc -->
Satellite Tracker Project for EEP 2025

Please do not steal our code - it is very inefficient and will cause you problems.
90% gpt

## Table of Contents
- [Table of Contents](#table-of-contents)
- [Setup](#setup)
  - [Installing Python](#installing-python)
  - [Setting up a virtual environment](#setting-up-a-virtual-environment)
  - [Getting and exporting dependencies](#getting-and-exporting-dependencies)
  - [Adding your Cesium token](#adding-your-cesium-token)
- [Project Structure](#project-structure)

## Setup
> Refer to the [tech setup](docs/tech_setup.md) for more on setting up your development environment, GitHub, and importing/exporting dependencies.

### Installing Python
Go to https://www.python.org/downloads/ and install the latest version. Make sure "Add Python to PATH" is checked.

To verify python is installed, open a terminal and run `python --version` - you should see something like Python 3.14.1

### Setting up a virtual environment
Create a virtual environment within your project folder using `python -m venv .venv`

To enter the virtual environment use `.venv/Scripts/activate` (you should now see (.venv) at the start of your prompt)

When you want to come out of your virtual environment use `deactivate`

### Getting and exporting dependencies
*To make it easier for users to install dependencies required for the project, we use a `requirements.txt` file and list any packages/libraries used in the codebase there.*

Install all dependencies currently used by using `pip install -r requirements.txt`

Export your installed modules using `pip freeze > requirements.txt`

### Adding your Cesium token
Create a file named `.env` in the main project directory.

Add the following to the file, replacing `<YOUR_TOKEN_HERE>` with your token. **Don't put the token in quotes**, just leave it as raw text:
```ini
CESIUM_TOKEN=<YOUR_TOKEN_HERE>
```

## Project Structure
```
satellite-tracker
├─ LICENSE
├─ README.md
├─ app
│  ├─ app.py
│  ├─ low-volume.py
│  ├─ static
│  │  ├─ css
│  │  │  └─ styles.css
│  │  └─ js
│  │     ├─ demos
│  │     │  ├─ moving-satellite-trajectory.js
│  │     │  ├─ moving-satellite.js
│  │     │  └─ stationary-satellite.js
│  │     ├─ handlers.js
│  │     ├─ main.js
│  │     ├─ old
│  │     │  └─ satellite-display.js
│  │     ├─ satManager.js
│  │     ├─ state.js
│  │     └─ utils.js
│  ├─ templates
│  │  └─ index.html
│  └─ utils
│     └─ get_all_tles.py
├─ docs
│  ├─ brief.md
│  └─ tech_setup.md
├─ pyproject.toml
└─ requirements.txt

```