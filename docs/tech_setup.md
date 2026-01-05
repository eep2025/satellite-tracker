# EEP 25/26 Satellite Tracker Project - Tech set up guide <!-- omit in toc -->

## Contents Page

- [Contents Page](#contents-page)
- [Installing your Development Environment](#installing-your-development-environment)
  - [Install Python](#install-python)
  - [Install an IDE](#install-an-ide)
  - [Set up a Virtual Environment](#set-up-a-virtual-environment)
- [Version Control with Git](#version-control-with-git)
  - [Branches](#branches)
- [Structuring a Project](#structuring-a-project)
- [Next steps](#next-steps)

## Installing your Development Environment

### Install Python

- Go to: <https://www.python.org/downloads/>
- Install the latest version
- When installing, make sure "Add Python to PATH" is checked
- To verify, open a terminal and run `python --version`
- You should see something like Python 3.12.1

### Install an IDE

An Integrated Development Environment (IDE) helps you write, debug, and run code more easily.

We recommend VS Code but use whatever you're used to!

<https://code.visualstudio.com/Download>

### Set up a Virtual Environment

Virtual environments help you manage project-specific dependencies without affecting your global Python installation. You should create a personal virtual environment within your project folder:

`python -m venv .venv`

To enter the virtual environment use:

`.venv/Scripts/activate` (you should now see (.venv) at the start of your prompt)

When you want to come out of your virtual environment use:

`deactivate`

To make it easier for users to install dependencies required for your project, you can create a requirements.txt file and list any packages/libraries there. Users can then install all dependencies at once:

`pip install -r requirements.txt`

Dependencies can be exported to the requirements.txt file by using:

`pip freeze > requirements.txt`

## Version Control with Git

Version control records changes to your files over time so you can:

- Track what changed, when, and by whom
- Revert to earlier versions if something breaks
- Collaborate safely without overwriting each other's work

Git is the most widely used version control tool in software development, when we are adding a new feature or working on code, this is the typical process we follow:

- Clone the repository into our local environment (this gives us our own copy to work on)

`git clone <https://github.com/your-repo-name.git>` (copy the repo)

`cd your-repo-name` (move into the repo)

- Create a branch for our work

`git branch feature-name` (create a new branch)

`git checkout feature-name` (move to the branch you've created)

- Stage and commit changes as we progress

`git add file-name` (stage changes in a specific file)

`git commit -m "Commit message"` (commit changes with a message)

- Push our branch to GitHub

`git push origin feature-name` (publish your branch to github)

- Open a Pull Request for review
  - Request to merge your branch into main

To learn how to use git, we recommend you follow the Version Control with Git Software Carpentry Course: <https://swcarpentry.github.io/git-novice/>

If you're unfamiliar with terminal commands, there is also a Unix Shell Course: <https://swcarpentry.github.io/shell-novice/>

_Git is quite a learning curve - please ask any and all questions!_

### Branches

Typically, you should make one branch per feature. Sometimes however a feature is large, and you might want to split it into smaller sub-features. You can create a branch from another branch instead of from main, and then merge it into its parent branch before merging back into main. For example, for the backend and frontend, or pages that have smaller components.

## Structuring a Project

A consistent folder structure makes it easier for you and your teammates to navigate code and add new features. It may look something like this:
```
satellite-tracker/ (this is your repository folder)

|---- backend/

| |---- src/

| | |---- main.py

| |---- test/

| | |---- config/

| |---- requirements.txt

|---- frontend/

| |---- public/

| |---- src/

| | |---- components/

| | |---- pages/

| |---- package.json

|---- .gitignore

|---- README.md
```
Some front-end libraries and frameworks will have recommended structures - or even templates! Doing research and spending some time making considered structure decisions can save you lots of headaches in the long run - ask us if you're unsure!

## Next steps

- Download Python and an IDE
- Complete Software Carpentry Workshops
- Set up a GitHub account
- Create a repository and push it to remote - only one person needs to do this and it can be empty to start with (or just with empty .gitignore and README.md files)
- Add everyone in your group as collaborators
- Clone the repository locally to your machine and set up a virtual environment
- When you're ready to develop follow the process above starting with making a branch!