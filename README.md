# satellite-tracker <!-- omit in toc -->
Satellite Tracker Project for EEP 2025

Please do not steal our code - it is very inefficient and will cause you problems.
90% gpt

# Table of Contents
- [Table of Contents](#table-of-contents)
- [Setup](#setup)
  - [Setting up your development environment](#setting-up-your-development-environment)
  - [Adding your Cesium token](#adding-your-cesium-token)
- [Project Structure](#project-structure)

# Setup
## Setting up your development environment
Refer to the [tech setup](docs/tech_setup.md) for setting up your development environment.

This includes installing Python, VS Code, and Git (for GitHub). It also includes setting up a virtual environment and installing packages.

## Adding your Cesium token
Create a file named `.env` in the main project directory.

Add the following to the file, replacing `<YOUR_TOKEN_HERE>` with your token. **Don't put the token in quotes**, just leave it as raw text:
```ini
CESIUM_TOKEN=<YOUR_TOKEN_HERE>
```

# Project Structure
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